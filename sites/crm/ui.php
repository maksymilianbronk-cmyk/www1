<?php
/**
 * LeadFlow CRM — wspólne elementy interfejsu (layout, tabela leadów, statystyki).
 */

require_once __DIR__ . '/config.php';

function ui_header(string $title, string $role = '', string $userName = '', string $active = ''): void
{
    $nav = '';
    if ($role === 'admin') {
        $items = [
            'admin.php'    => ['📋', 'Leady'],
            'clients.php'  => ['👥', 'Klienci'],
            'settings.php' => ['⚙️', 'Ustawienia'],
        ];
        foreach ($items as $href => [$icon, $label]) {
            $cls = $active === $href ? ' class="active"' : '';
            $nav .= "<a href=\"$href\"$cls>$icon $label</a>";
        }
    } elseif ($role === 'client') {
        $nav = '<a href="panel.php" class="active">📋 Moje leady</a>';
    }

    $userBox = $userName !== ''
        ? '<div class="user-box"><span class="user-name">' . e($userName) . '</span>'
          . ($role === 'admin' ? '<span class="user-role">super admin</span>' : '<span class="user-role">klient</span>')
          . '<a class="logout" href="logout.php">Wyloguj</a></div>'
        : '';

    echo '<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>' . e($title) . ' — LeadFlow CRM</title>
<link rel="stylesheet" href="crm.css">
</head>
<body>
<header class="topbar">
  <div class="brand"><span class="brand-logo">⚡</span> LeadFlow <span class="brand-sub">CRM</span></div>
  <nav class="mainnav">' . $nav . '</nav>
  ' . $userBox . '
</header>
<main class="wrap">';
}

function ui_footer(): void
{
    echo '</main>
<footer class="foot">LeadFlow CRM v' . CRM_VERSION . ' · agencja Meta Ads</footer>
<script src="crm.js"></script>
</body>
</html>';
}

function ui_flash(): void
{
    crm_session_start();
    if (!empty($_SESSION['flash'])) {
        [$type, $msg] = $_SESSION['flash'];
        unset($_SESSION['flash']);
        echo '<div class="flash flash-' . e($type) . '">' . e($msg) . '</div>';
    }
}

function flash(string $type, string $msg): void
{
    crm_session_start();
    $_SESSION['flash'] = [$type, $msg];
}

/** Kafelki statystyk nad listą leadów. */
function ui_stats(array $where, array $params): void
{
    $sqlWhere = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
    $pdo = db();

    $st = $pdo->prepare("SELECT COUNT(*) FROM leads $sqlWhere");
    $st->execute($params);
    $total = (int)$st->fetchColumn();

    $todayWhere = array_merge($where, ["date(created_at) = date('now','localtime')"]);
    $st = $pdo->prepare('SELECT COUNT(*) FROM leads WHERE ' . implode(' AND ', $todayWhere));
    $st->execute($params);
    $today = (int)$st->fetchColumn();

    $weekWhere = array_merge($where, ["created_at >= datetime('now','localtime','-7 days')"]);
    $st = $pdo->prepare('SELECT COUNT(*) FROM leads WHERE ' . implode(' AND ', $weekWhere));
    $st->execute($params);
    $week = (int)$st->fetchColumn();

    $newWhere = array_merge($where, ["status = 'nowy'"]);
    $st = $pdo->prepare('SELECT COUNT(*) FROM leads WHERE ' . implode(' AND ', $newWhere));
    $st->execute($params);
    $new = (int)$st->fetchColumn();

    $wonWhere = array_merge($where, ["status = 'wygrany'"]);
    $st = $pdo->prepare('SELECT COUNT(*) FROM leads WHERE ' . implode(' AND ', $wonWhere));
    $st->execute($params);
    $won = (int)$st->fetchColumn();

    echo '<div class="stats">
      <div class="stat"><div class="stat-num">' . $total . '</div><div class="stat-label">Wszystkie leady</div></div>
      <div class="stat"><div class="stat-num">' . $today . '</div><div class="stat-label">Dzisiaj</div></div>
      <div class="stat"><div class="stat-num">' . $week . '</div><div class="stat-label">Ostatnie 7 dni</div></div>
      <div class="stat stat-new"><div class="stat-num">' . $new . '</div><div class="stat-label">Nowe (do obsłużenia)</div></div>
      <div class="stat stat-won"><div class="stat-num">' . $won . '</div><div class="stat-label">Wygrane</div></div>
    </div>';
}

function ui_status_badge(string $status): string
{
    $label = CRM_STATUSES[$status] ?? $status;
    return '<span class="badge badge-' . e($status) . '">' . e($label) . '</span>';
}

function ui_source(string $source): string
{
    [$label, $icon] = CRM_SOURCES[$source] ?? [$source, '📥'];
    return '<span class="src" title="' . e($label) . '">' . $icon . ' <span class="src-label">' . e($label) . '</span></span>';
}

/**
 * Tabela leadów z rozwijanymi szczegółami i zmianą statusu.
 * $leads — wiersze (z kolumną client_name/client_color gdy $showClient).
 */
function ui_leads_table(array $leads, bool $showClient, string $backUrl): void
{
    if (!$leads) {
        echo '<div class="empty-state">
            <div class="empty-icon">📭</div>
            <p>Brak leadów spełniających kryteria.</p>
            <p class="empty-hint">Leady pojawią się tu automatycznie, gdy webhook odbierze zgłoszenie.</p>
        </div>';
        return;
    }

    echo '<div class="table-scroll"><table class="leads">
      <thead><tr>
        <th>Data</th>'
        . ($showClient ? '<th>Klient</th>' : '')
        . '<th>Źródło</th><th>Imię i nazwisko</th><th>Telefon</th><th>E-mail</th><th>Status</th><th></th>
      </tr></thead><tbody>';

    foreach ($leads as $l) {
        $id = (int)$l['id'];
        echo '<tr class="lead-row' . ($l['status'] === 'nowy' ? ' is-new' : '') . '" data-target="det-' . $id . '">';
        echo '<td class="td-date">' . e(date('d.m.Y H:i', strtotime($l['created_at']))) . '</td>';
        if ($showClient) {
            echo '<td><span class="client-chip" style="--chip:' . e($l['client_color'] ?? '#4f7cff') . '">'
               . e($l['client_name'] ?? '?') . '</span></td>';
        }
        echo '<td>' . ui_source($l['source']) . '</td>';
        echo '<td class="td-name">' . (trim($l['name']) !== '' ? e($l['name']) : '<span class="muted">—</span>') . '</td>';
        echo '<td>' . ($l['phone'] !== '' ? '<a href="tel:' . e($l['phone']) . '" onclick="event.stopPropagation()">' . e($l['phone']) . '</a>' : '<span class="muted">—</span>') . '</td>';
        echo '<td>' . ($l['email'] !== '' ? '<a href="mailto:' . e($l['email']) . '" onclick="event.stopPropagation()">' . e($l['email']) . '</a>' : '<span class="muted">—</span>') . '</td>';
        echo '<td>' . ui_status_badge($l['status']) . '</td>';
        echo '<td class="td-chev">▾</td>';
        echo '</tr>';

        // wiersz szczegółów
        $raw = json_decode($l['raw'] ?: '{}', true) ?: [];
        echo '<tr class="lead-detail" id="det-' . $id . '"><td colspan="' . ($showClient ? 8 : 7) . '">
          <div class="detail-grid">
            <div class="detail-col">
              <h4>Szczegóły zgłoszenia</h4>
              <dl>';
        if ($l['message'] !== '') {
            echo '<dt>Wiadomość</dt><dd>' . nl2br(e($l['message'])) . '</dd>';
        }
        if ($l['form_name'] !== '') {
            echo '<dt>Formularz</dt><dd>' . e($l['form_name']) . '</dd>';
        }
        if ($l['campaign'] !== '') {
            echo '<dt>Kampania</dt><dd>' . e($l['campaign']) . '</dd>';
        }
        foreach ($raw as $k => $v) {
            if (is_array($v)) {
                $v = json_encode($v, JSON_UNESCAPED_UNICODE);
            }
            echo '<dt>' . e((string)$k) . '</dt><dd>' . e((string)$v) . '</dd>';
        }
        echo '</dl>
            </div>
            <div class="detail-col">
              <h4>Obsługa leada</h4>
              <form method="post" action="lead-action.php" class="lead-form">'
                . csrf_field() .
                '<input type="hidden" name="id" value="' . $id . '">
                <input type="hidden" name="back" value="' . e($backUrl) . '">
                <label>Status
                  <select name="status">';
        foreach (CRM_STATUSES as $key => $label) {
            $sel = $l['status'] === $key ? ' selected' : '';
            echo '<option value="' . e($key) . '"' . $sel . '>' . e($label) . '</option>';
        }
        echo '</select>
                </label>
                <label>Notatka
                  <textarea name="note" rows="3" placeholder="np. umówiony na czwartek 12:00">' . e($l['note']) . '</textarea>
                </label>
                <button type="submit" class="btn">💾 Zapisz</button>
              </form>
            </div>
          </div>
        </td></tr>';
    }
    echo '</tbody></table></div>';
}

/** Paginacja. */
function ui_pagination(int $page, int $pages, string $baseQuery): void
{
    if ($pages <= 1) {
        return;
    }
    echo '<div class="pager">';
    for ($p = 1; $p <= $pages; $p++) {
        $cls = $p === $page ? ' class="cur"' : '';
        echo '<a' . $cls . ' href="?' . e($baseQuery) . 'page=' . $p . '">' . $p . '</a>';
    }
    echo '</div>';
}
