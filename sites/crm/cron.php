<?php
/**
 * LeadFlow CRM — zadania cykliczne (cron hostingu).
 *
 * Wywołanie:  https://twojadomena.pl/crm/cron.php?key=KLUCZ_CRONA
 * (klucz znajdziesz w panelu: Ustawienia → Cron; zalecane co 1 h lub co 15 min)
 *
 * Zadania:
 *  1. Pobiera kampanie reklamowe klientów z Meta Marketing API
 *     (klienci z uzupełnionym ID konta reklamowego + tokenem ads_read)
 *     — bieżący i poprzedni miesiąc: status, budżet, wyświetlenia,
 *     kliknięcia, liczba leadów, wydatki.
 *  2. Kopia zapasowa bazy do data/backups/ (raz dziennie, rotacja 14 kopii).
 *  3. Sprzątanie starych wpisów blokady logowania.
 *
 * CRM działa też BEZ crona (webhooki są push) — cron dokłada dane reklamowe
 * i automatyczne kopie.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/contentforge.php';

if (PHP_SAPI !== 'cli') {
    $key = (string)($_SERVER['HTTP_X_CRON_KEY'] ?? $_GET['key'] ?? '');
    $expected = setting_get('cron_key');
    if ($expected === '' || !hash_equals($expected, $key)) {
        json_out(['ok' => false, 'error' => 'Nieprawidłowy klucz crona.'], 403);
    }
}

set_time_limit(120);
$report = ['campaigns' => 0, 'clients_synced' => 0, 'errors' => [], 'backup' => false];
$pdo = db();

/* ── 1. Kampanie z Meta Marketing API ── */
$months = [date('Y-m'), date('Y-m', strtotime('first day of last month'))];
$clients = $pdo->query("SELECT * FROM clients WHERE active = 1 AND fb_ad_account_id != ''")->fetchAll();

foreach ($clients as $c) {
    $token = $c['fb_ads_token'] !== '' ? $c['fb_ads_token'] : $c['fb_page_token'];
    if ($token === '') {
        $report['errors'][] = "Klient {$c['name']}: brak tokena (ads_token / page_token).";
        continue;
    }
    $account = preg_match('/^act_/', $c['fb_ad_account_id']) ? $c['fb_ad_account_id'] : 'act_' . $c['fb_ad_account_id'];
    $synced = false;

    foreach ($months as $month) {
        $sinceD = $month . '-01';
        $untilD = date('Y-m-t', strtotime($sinceD));
        $params = [
            'fields' => 'name,status,effective_status,objective,'
                      . 'insights.time_range({"since":"' . $sinceD . '","until":"' . $untilD . '"})'
                      . '{spend,impressions,clicks,actions,account_currency}',
            'limit'        => 100,
            'access_token' => $token,
        ];
        // paginacja Graph API — konta z >100 kampaniami
        $rows = [];
        for ($page = 0; $page < 10; $page++) {
            $resp = graph_get($account . '/campaigns', $params);
            if ($resp === null || isset($resp['error'])) {
                $report['errors'][] = "Klient {$c['name']} ($month): "
                    . ($resp['error']['message'] ?? 'brak odpowiedzi Graph API');
                continue 2;
            }
            $rows = array_merge($rows, $resp['data'] ?? []);
            $after = $resp['paging']['cursors']['after'] ?? null;
            if ($after === null || empty($resp['paging']['next'])) {
                break;
            }
            $params['after'] = $after;
        }
        $seenIds = [];
        foreach ($rows as $camp) {
            $ins = $camp['insights']['data'][0] ?? null;
            // kampania bez insights w danym miesiącu = nie działała w tym okresie
            if ($ins === null && $month !== date('Y-m')) {
                continue;
            }
            $leadsCnt = 0;
            foreach (($ins['actions'] ?? []) as $a) {
                if (in_array($a['action_type'] ?? '', ['lead', 'onsite_conversion.lead_grouped', 'leadgen_grouped'], true)) {
                    $leadsCnt += (int)($a['value'] ?? 0);
                }
            }
            $pdo->prepare('INSERT INTO campaigns
                    (client_id, fb_campaign_id, name, status, objective, month,
                     spend, impressions, clicks, leads_count, currency, fetched_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
                 ON CONFLICT(client_id, fb_campaign_id, month) DO UPDATE SET
                     name = excluded.name, status = excluded.status,
                     objective = excluded.objective, spend = excluded.spend,
                     impressions = excluded.impressions, clicks = excluded.clicks,
                     leads_count = excluded.leads_count, currency = excluded.currency,
                     fetched_at = excluded.fetched_at')
                ->execute([
                    (int)$c['id'],
                    (string)($camp['id'] ?? ''),
                    (string)($camp['name'] ?? ''),
                    (string)($camp['effective_status'] ?? $camp['status'] ?? ''),
                    (string)($camp['objective'] ?? ''),
                    $month,
                    (float)($ins['spend'] ?? 0),
                    (int)($ins['impressions'] ?? 0),
                    (int)($ins['clicks'] ?? 0),
                    $leadsCnt,
                    (string)($ins['account_currency'] ?? ''),
                    date('Y-m-d H:i:s'),
                ]);
            $report['campaigns']++;
            $seenIds[] = (string)($camp['id'] ?? '');
        }
        // kampanie usunięte po stronie Meta znikają też z CRM (miesiąc autorytatywny)
        $ph = implode(',', array_fill(0, count($seenIds), '?'));
        $del = $pdo->prepare('DELETE FROM campaigns WHERE client_id = ? AND month = ?'
            . ($seenIds ? " AND fb_campaign_id NOT IN ($ph)" : ''));
        $del->execute(array_merge([(int)$c['id'], $month], $seenIds));
        $synced = true;
    }
    if ($synced) {
        $report['clients_synced']++;
    }
}

if ($report['clients_synced'] > 0 || $report['campaigns'] > 0) {
    setting_set('ads_last_sync', date('Y-m-d H:i:s'));
    bump_rev();
}

/* ── 1b. Publikacja zaplanowanych postów na Facebooku ── */
$report['posts_published'] = 0;
$due = $pdo->query("SELECT posts.*, clients.id AS cid FROM posts
                    JOIN clients ON clients.id = posts.client_id AND clients.active = 1
                    WHERE posts.status = 'gotowy' AND posts.publish_at <= datetime('now','localtime')
                    ORDER BY posts.publish_at LIMIT 25")->fetchAll();
foreach ($due as $post) {
    $st = $pdo->prepare('SELECT * FROM clients WHERE id = ?');
    $st->execute([(int)$post['cid']]);
    $cRow = $st->fetch();
    if ($cRow && fb_publish_post($pdo, $cRow, $post)) {
        $report['posts_published']++;
    } else {
        $report['errors'][] = 'Post #' . $post['id'] . ': publikacja nieudana (szczegóły w panelu).';
    }
}
if ($due) {
    bump_rev();
}

/* ── 2. Kopia zapasowa bazy (raz dziennie, rotacja 14) ── */
$backupDir = __DIR__ . '/data/backups';
$today     = $backupDir . '/crm-' . date('Y-m-d') . '.sqlite';
if (!is_dir($backupDir)) {
    @mkdir($backupDir, 0775, true);
    @file_put_contents($backupDir . '/.htaccess', "Require all denied\n");
}
if (is_dir($backupDir) && !file_exists($today) && file_exists(CRM_DB_PATH)) {
    // WAL: spójna migawka przez VACUUM INTO (fallback: copy dla nie-SQLite / starych wersji)
    try {
        $pdo->exec('VACUUM INTO ' . $pdo->quote($today));
        $report['backup'] = file_exists($today);
    } catch (PDOException) {
        $report['backup'] = @copy(CRM_DB_PATH, $today);
    }
    $old = glob($backupDir . '/crm-*.sqlite') ?: [];
    sort($old);
    foreach (array_slice($old, 0, max(0, count($old) - 14)) as $f) {
        @unlink($f);
    }
}

/* ── 3. Sprzątanie ── */
$pdo->exec("DELETE FROM login_attempts WHERE attempted_at < datetime('now','localtime','-1 day')");
setting_set('cron_last_run', date('Y-m-d H:i:s'));

json_out(['ok' => true] + $report);
