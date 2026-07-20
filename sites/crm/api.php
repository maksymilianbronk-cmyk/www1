<?php
/**
 * REAKTOR API — warstwa danych aplikacji (JSON).
 *
 * GET  api.php?a=bootstrap          → pełny stan dla roli (admin/klient)
 * GET  api.php?a=delta&since=TS     → wiersze zmienione od znacznika czasu
 * POST api.php?a=lead   {id,status,note}   → aktualizacja leada (optymistyczna po stronie UI)
 * POST api.php?a=note   {client_id?,body}  → nowa wspólna notatka
 *
 * Mutacje wymagają nagłówka X-CSRF zgodnego z tokenem sesji.
 */

require_once __DIR__ . '/config.php';

crm_session_start();
$admin  = current_admin();
$client = current_client();
if (!$admin && !$client) {
    json_out(['ok' => false, 'error' => 'auth'], 401);
}
$isAdmin  = (bool)$admin;
$clientId = $client ? (int)$client['id'] : null;

$action = (string)($_GET['a'] ?? '');
$pdo    = db();

/* ── Mutacje (POST + CSRF) ── */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = (string)($_SERVER['HTTP_X_CSRF'] ?? '');
    if ($csrf === '' || !hash_equals(csrf_token(), $csrf)) {
        json_out(['ok' => false, 'error' => 'csrf'], 400);
    }
    $in = json_decode(file_get_contents('php://input') ?: '[]', true) ?: [];

    if ($action === 'lead') {
        $id = (int)($in['id'] ?? 0);
        $st = $pdo->prepare('SELECT * FROM leads WHERE id = ?');
        $st->execute([$id]);
        $lead = $st->fetch();
        if (!$lead || (!$isAdmin && (int)$lead['client_id'] !== $clientId)) {
            json_out(['ok' => false, 'error' => 'not-found'], 404);
        }
        // aktualizacja częściowa — tylko przysłane pola (bez ras status/notatka)
        $status = array_key_exists('status', $in) ? (string)$in['status'] : (string)$lead['status'];
        $note   = array_key_exists('note', $in) ? mb_substr(trim((string)$in['note']), 0, 2000) : (string)$lead['note'];
        if (!isset(CRM_STATUSES[$status])) {
            json_out(['ok' => false, 'error' => 'status'], 400);
        }
        $pdo->prepare("UPDATE leads SET status = ?, note = ?, updated_at = datetime('now','localtime') WHERE id = ?")
            ->execute([$status, $note, $id]);
        bump_rev();
        json_out(['ok' => true, 'rev' => state_rev()]);
    }

    if ($action === 'note') {
        $body  = mb_substr(trim((string)($in['body'] ?? '')), 0, 4000);
        $color = (string)($in['color'] ?? '');
        $cid   = $isAdmin ? (int)($in['client_id'] ?? 0) : $clientId;
        if ($body === '' || !$cid) {
            json_out(['ok' => false, 'error' => 'empty'], 400);
        }
        $st = $pdo->prepare('SELECT id FROM clients WHERE id = ?');
        $st->execute([$cid]);
        if (!$st->fetch()) {
            json_out(['ok' => false, 'error' => 'client'], 404);
        }
        $pdo->prepare("INSERT INTO notes (client_id, author_type, author_name, body, color, updated_at)
                       VALUES (?,?,?,?,?, datetime('now','localtime'))")
            ->execute([
                $cid,
                $isAdmin ? 'admin' : 'client',
                $isAdmin ? (string)$admin['name'] : (string)$client['name'],
                $body,
                mb_substr($color, 0, 20),
            ]);
        $noteId = (int)$pdo->lastInsertId();
        bump_rev();
        json_out(['ok' => true, 'id' => $noteId, 'rev' => state_rev()]);
    }

    // edycja / kolor / przypięcie / usunięcie notatki
    if ($action === 'note-update' || $action === 'note-delete') {
        $id = (int)($in['id'] ?? 0);
        $st = $pdo->prepare('SELECT * FROM notes WHERE id = ?');
        $st->execute([$id]);
        $note = $st->fetch();
        if (!$note) {
            json_out(['ok' => false, 'error' => 'not-found'], 404);
        }
        // klient działa tylko we własnym wątku; edytować/usuwać może własne notatki,
        // admin — wszystkie
        $inThread = $isAdmin || (int)$note['client_id'] === $clientId;
        $isAuthor = $isAdmin || $note['author_type'] === 'client';
        if (!$inThread || (!$isAdmin && !$isAuthor)) {
            json_out(['ok' => false, 'error' => 'forbidden'], 403);
        }

        if ($action === 'note-delete') {
            $pdo->prepare('DELETE FROM notes WHERE id = ?')->execute([$id]);
            bump_rev();
            json_out(['ok' => true, 'rev' => state_rev()]);
        }

        $body   = array_key_exists('body', $in) ? mb_substr(trim((string)$in['body']), 0, 4000) : (string)$note['body'];
        $color  = array_key_exists('color', $in) ? mb_substr((string)$in['color'], 0, 20) : (string)$note['color'];
        $pinned = array_key_exists('pinned', $in) ? (int)!!$in['pinned'] : (int)$note['pinned'];
        if ($body === '') {
            json_out(['ok' => false, 'error' => 'empty'], 400);
        }
        $pdo->prepare("UPDATE notes SET body = ?, color = ?, pinned = ?, updated_at = datetime('now','localtime') WHERE id = ?")
            ->execute([$body, $color, $pinned, $id]);
        bump_rev();
        json_out(['ok' => true, 'rev' => state_rev()]);
    }

    json_out(['ok' => false, 'error' => 'action'], 400);
}

/* ── Odczyt: sesja tylko do odczytu — nie blokujemy innych żądań ── */
session_write_close();

const LEADS_LIMIT = 1000;

function rows_leads(PDO $pdo, bool $isAdmin, ?int $clientId, string $since = ''): array
{
    $sql = 'SELECT leads.id, leads.client_id, leads.source, leads.name, leads.email, leads.phone,
                   leads.message, leads.form_name, leads.campaign, leads.raw, leads.status,
                   leads.note, leads.created_at, leads.updated_at
            FROM leads';
    $where  = [];
    $params = [];
    if (!$isAdmin) {
        $where[]  = 'client_id = ?';
        $params[] = $clientId;
    }
    if ($since !== '') {
        $where[]  = "updated_at >= datetime(?, '-5 seconds')";
        $params[] = $since;
    }
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY id DESC LIMIT ' . LEADS_LIMIT;
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll();
    foreach ($rows as &$r) {
        $r['id']        = (int)$r['id'];
        $r['client_id'] = (int)$r['client_id'];
        $r['raw']       = json_decode($r['raw'] ?: '{}', true) ?: new stdClass();
    }
    return $rows;
}

/* Notatki zawsze w komplecie (limit 500) — dzięki temu edycje, zmiany kolorów,
 * przypięcia i USUNIĘCIA synchronizują się bezstratnie po każdej zmianie rewizji. */
function rows_notes(PDO $pdo, bool $isAdmin, ?int $clientId): array
{
    $sql    = 'SELECT id, client_id, author_type, author_name, body, color, pinned, created_at, updated_at FROM notes';
    $params = [];
    if (!$isAdmin) {
        $sql     .= ' WHERE client_id = ?';
        $params[] = $clientId;
    }
    $sql .= ' ORDER BY pinned DESC, id DESC LIMIT 500';
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll();
    foreach ($rows as &$r) {
        $r['id']        = (int)$r['id'];
        $r['client_id'] = (int)$r['client_id'];
        $r['pinned']    = (int)$r['pinned'];
    }
    return $rows;
}

function rows_campaigns(PDO $pdo, bool $isAdmin, ?int $clientId): array
{
    $sql    = "SELECT id, client_id, fb_campaign_id, name, status, objective, month,
                      spend, impressions, clicks, leads_count, currency, fetched_at
               FROM campaigns WHERE month >= strftime('%Y-%m', 'now', 'localtime', '-2 months')";
    $params = [];
    if (!$isAdmin) {
        $sql     .= ' AND client_id = ?';
        $params[] = $clientId;
    }
    $sql .= ' ORDER BY month DESC, spend DESC';
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll();
    foreach ($rows as &$r) {
        $r['id']          = (int)$r['id'];
        $r['client_id']   = (int)$r['client_id'];
        $r['spend']       = (float)$r['spend'];
        $r['impressions'] = (int)$r['impressions'];
        $r['clicks']      = (int)$r['clicks'];
        $r['leads_count'] = (int)$r['leads_count'];
    }
    return $rows;
}

function rows_clients(PDO $pdo): array
{
    $rows = $pdo->query('SELECT id, name, company, color, active,
                           fb_ad_account_id != "" AS has_ads_api
                         FROM clients ORDER BY name')->fetchAll();
    foreach ($rows as &$r) {
        $r['id']          = (int)$r['id'];
        $r['active']      = (int)$r['active'];
        $r['has_ads_api'] = (int)$r['has_ads_api'];
    }
    return $rows;
}

function lead_totals(PDO $pdo, bool $isAdmin, ?int $clientId): array
{
    $w = $isAdmin ? '' : 'WHERE client_id = ' . (int)$clientId;
    $byStatus = [];
    foreach ($pdo->query("SELECT status, COUNT(*) c FROM leads $w GROUP BY status") as $r) {
        $byStatus[$r['status']] = (int)$r['c'];
    }
    return [
        'all'   => (int)$pdo->query("SELECT COUNT(*) FROM leads $w")->fetchColumn(),
        'month' => (int)$pdo->query("SELECT COUNT(*) FROM leads " . ($w ?: 'WHERE 1=1')
                   . " AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')")->fetchColumn(),
        'by_status' => $byStatus,
    ];
}

/** Autorytatywny zbiór id widocznych leadów — klient usuwa u siebie "duchy". */
function lead_ids(PDO $pdo, bool $isAdmin, ?int $clientId): array
{
    $sql = 'SELECT id FROM leads' . ($isAdmin ? '' : ' WHERE client_id = ' . (int)$clientId)
         . ' ORDER BY id DESC LIMIT ' . LEADS_LIMIT;
    return array_map('intval', $pdo->query($sql)->fetchAll(PDO::FETCH_COLUMN));
}

// jedno źródło zegara — to samo, którym SQLite stempluje wiersze
// (strefa PHP i strefa systemu mogą się różnić; delty muszą być spójne)
$now = (string)$pdo->query("SELECT datetime('now','localtime')")->fetchColumn();

if ($action === 'bootstrap') {
    $out = [
        'ok'        => true,
        'rev'       => state_rev(),
        'now'       => $now,
        'role'      => $isAdmin ? 'admin' : 'client',
        'user'      => $isAdmin
            ? ['name' => $admin['name']]
            : ['name' => $client['name'], 'company' => $client['company'], 'id' => $clientId,
               'has_ads_api' => $client['fb_ad_account_id'] !== ''],
        'csrf'      => csrf_token(),
        'statuses'  => CRM_STATUSES,
        'sources'   => array_map(fn($s) => $s[0], CRM_SOURCES),
        'leads'     => rows_leads($pdo, $isAdmin, $clientId),
        'notes'     => rows_notes($pdo, $isAdmin, $clientId),
        'campaigns' => rows_campaigns($pdo, $isAdmin, $clientId),
        'totals'    => lead_totals($pdo, $isAdmin, $clientId),
        'ads_last_sync' => setting_get('ads_last_sync'),
    ];
    if ($isAdmin) {
        $out['clients'] = rows_clients($pdo);
    }
    json_out($out);
}

if ($action === 'delta') {
    $since = (string)($_GET['since'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $since)) {
        json_out(['ok' => false, 'error' => 'since'], 400);
    }
    $out = [
        'ok'        => true,
        'rev'       => state_rev(),
        'now'       => $now,
        'leads'     => rows_leads($pdo, $isAdmin, $clientId, $since),
        'lead_ids'  => lead_ids($pdo, $isAdmin, $clientId),
        'notes'     => rows_notes($pdo, $isAdmin, $clientId),
        'campaigns' => rows_campaigns($pdo, $isAdmin, $clientId),
        'totals'    => lead_totals($pdo, $isAdmin, $clientId),
        'ads_last_sync' => setting_get('ads_last_sync'),
    ];
    if ($isAdmin) {
        $out['clients'] = rows_clients($pdo);
    }
    json_out($out);
}

json_out(['ok' => false, 'error' => 'action'], 400);
