<?php
/**
 * LeadFlow CRM — wspólne elementy interfejsu (layout, tabela leadów, statystyki).
 */

require_once __DIR__ . '/config.php';

/**
 * Biblioteka ikon SVG (24×24, styl liniowy) — jedno źródło prawdy.
 * PHP renderuje przez svg_icon(); aplikacja REAKTOR dostaje ten sam zestaw
 * przez window.RK_ICONS (wstrzykiwany w ui_app_shell).
 */
const CRM_ICONS = [
    'bolt'     => '<path d="M13 2 4.8 13.2H11L9.5 22l9.7-12.2H13L15 2z"/>',
    'inbox'    => '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    'megaphone'=> '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    'chart'    => '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>',
    'note'     => '<path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/>',
    'users'    => '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'gear'     => '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    'logout'   => '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    'bell'     => '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    'bell-off' => '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><line x1="2" x2="22" y1="2" y2="22"/>',
    'search'   => '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'download' => '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    'plus'     => '<path d="M5 12h14"/><path d="M12 5v14"/>',
    'pin'      => '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"/>',
    'trash'    => '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
    'pencil'   => '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
    'check'    => '<path d="M20 6 9 17l-5-5"/>',
    'x'        => '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'send'     => '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    'globe'    => '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    'facebook' => '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    'box'      => '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    'clock'    => '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    'calendar' => '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    'sparkles' => '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
    'mail'     => '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    'key'      => '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3-3.5 3.5"/>',
    'shield'   => '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    'refresh'  => '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    'info'     => '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    'palette'  => '<path d="M12 22a10 10 0 1 1 10-10c0 1.7-1.3 3-3 3h-2.3a2 2 0 0 0-1.5 3.3c.3.4.5.8.5 1.2a2.5 2.5 0 0 1-2.5 2.5Z"/><circle cx="13.5" cy="6.5" r=".8"/><circle cx="17.5" cy="10.5" r=".8"/><circle cx="8.5" cy="7.5" r=".8"/><circle cx="6.5" cy="12.5" r=".8"/>',
    'activity' => '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
    'target'   => '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    'compass'  => '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2 6.3-6.4 2.1 2-6.3z"/>',
    'rocket'   => '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
];

/** Renderuje ikonę SVG (styl liniowy; 'bolt' i 'facebook' są wypełnione). */
function svg_icon(string $name, int $size = 18, string $cls = ''): string
{
    $body = CRM_ICONS[$name] ?? CRM_ICONS['info'];
    $attrs = in_array($name, ['bolt', 'facebook'], true)
        ? 'fill="currentColor" stroke="none"'
        : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    return '<svg class="ico' . ($cls !== '' ? ' ' . $cls : '') . '" width="' . $size . '" height="' . $size
         . '" viewBox="0 0 24 24" ' . $attrs . ' aria-hidden="true">' . $body . '</svg>';
}

/**
 * Powłoka aplikacji REAKTOR — jednorazowo renderowany szkielet;
 * widoki i dane obsługuje przeglądarka (reaktor.js + views.js).
 */
function ui_app_shell(string $role, string $userName, int $uid = 0): void
{
    $isAdmin = $role === 'admin';
    $nav = '<a href="#/leady" data-route="leady">' . svg_icon('inbox') . ' Leady</a>'
         . '<a href="#/reklamy" data-route="reklamy">' . svg_icon('megaphone') . ' Reklamy</a>'
         . '<a href="#/posty" data-route="posty">' . svg_icon('calendar') . ' Posty</a>'
         . '<a href="#/stats" data-route="stats">' . svg_icon('chart') . ' Statystyki</a>'
         . '<a href="#/notatki" data-route="notatki">' . svg_icon('note') . ' Notatki</a>';
    if ($isAdmin) {
        $nav .= '<span class="nav-sep"></span>'
              . '<a href="clients.php">' . svg_icon('users') . ' Klienci</a>'
              . '<a href="settings.php">' . svg_icon('gear') . ' Ustawienia</a>';
    }
    $boot = json_encode(['role' => $role, 'uid' => $uid, 'ver' => CRM_VERSION, 'csrf' => csrf_token()], JSON_HEX_TAG | JSON_HEX_APOS);
    $icons = json_encode(['paths' => CRM_ICONS, 'filled' => ['bolt', 'facebook']], JSON_HEX_TAG | JSON_HEX_APOS);
    echo '<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>LeadFlow CRM</title>
<link rel="icon" href="data:image/svg+xml,' . rawurlencode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#f5b942" d="M13 2 4.8 13.2H11L9.5 22l9.7-12.2H13L15 2z"/></svg>') . '">
<link rel="stylesheet" href="crm.css?v=' . CRM_VERSION . '">
</head>
<body>
<header class="topbar">
  <div class="brand"><span class="brand-logo">' . svg_icon('bolt', 20) . '</span> LeadFlow <span class="brand-sub">CRM</span>
    <span id="live-dot" class="live-dot" title="Połączono — dane na żywo"></span></div>
  <nav class="mainnav">' . $nav . '</nav>
  <div class="user-box">
    <button class="sound-btn" title="Dźwięk nowego leada" onclick="R.toggleSound(this)"></button>
    <span class="user-name">' . e($userName) . '</span>
    <span class="user-role">' . ($isAdmin ? 'super admin' : 'klient') . '</span>
    <a class="logout" href="logout.php" title="Wyloguj">' . svg_icon('logout', 16) . '<span> Wyloguj</span></a>
  </div>
</header>
<main class="wrap" id="app"></main>
<footer class="foot">LeadFlow CRM v' . CRM_VERSION . ' · silnik REAKTOR — React bez Node&#39;a</footer>
<script>window.REAKTOR = ' . $boot . ';window.RK_ICONS = ' . $icons . ';</script>
<script src="reaktor.js?v=' . CRM_VERSION . '"></script>
<script src="views.js?v=' . CRM_VERSION . '"></script>
</body>
</html>';
}

function ui_header(string $title, string $role = '', string $userName = '', string $active = ''): void
{
    $nav = '';
    if ($role === 'admin') {
        $items = [
            'admin.php'    => ['bolt', 'Panel'],
            'clients.php'  => ['users', 'Klienci'],
            'settings.php' => ['gear', 'Ustawienia'],
        ];
        foreach ($items as $href => [$icon, $label]) {
            $cls = $active === $href ? ' class="active"' : '';
            $nav .= "<a href=\"$href\"$cls>" . svg_icon($icon, 16) . " $label</a>";
        }
    } elseif ($role === 'client') {
        $nav = '<a href="panel.php" class="active">' . svg_icon('inbox', 16) . ' Moje leady</a>';
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
  <div class="brand"><span class="brand-logo">' . svg_icon('bolt', 20) . '</span> LeadFlow <span class="brand-sub">CRM</span></div>
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





/**
 * Tabela leadów z rozwijanymi szczegółami i zmianą statusu.
 * $leads — wiersze (z kolumną client_name/client_color gdy $showClient).
 */

