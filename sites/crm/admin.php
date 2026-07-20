<?php
/**
 * LeadFlow CRM — panel super admina: leady wszystkich klientów.
 */

require_once __DIR__ . '/ui.php';
require_once __DIR__ . '/filters.php';

$admin = require_admin();
$pdo   = db();

$clients = $pdo->query('SELECT id, name FROM clients ORDER BY name')->fetchAll();

[$where, $params, $query] = build_lead_filters();
$sqlWhere = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

$st = $pdo->prepare("SELECT COUNT(*) FROM leads $sqlWhere");
$st->execute($params);
$total = (int)$st->fetchColumn();

$pages = max(1, (int)ceil($total / CRM_PER_PAGE));
$page  = min($pages, max(1, (int)($_GET['page'] ?? 1)));
$offset = ($page - 1) * CRM_PER_PAGE;

$st = $pdo->prepare("SELECT leads.*, clients.name AS client_name, clients.color AS client_color
                     FROM leads JOIN clients ON clients.id = leads.client_id
                     $sqlWhere
                     ORDER BY leads.created_at DESC, leads.id DESC
                     LIMIT " . CRM_PER_PAGE . " OFFSET $offset");
$st->execute($params);
$leads = $st->fetchAll();

$backUrl = 'admin.php?' . $query . 'page=' . $page;

ui_header('Wszystkie leady', 'admin', $admin['name'], 'admin.php');
ui_flash();
?>
<div class="page-head">
  <h1>📋 Leady wszystkich klientów</h1>
  <div class="page-actions">
    <a class="btn btn-ghost" href="export.php?<?= e($query) ?>">⬇ Eksport CSV</a>
  </div>
</div>
<?php
ui_stats($where, $params);
ui_filter_form($clients);
ui_leads_table($leads, true, $backUrl);
ui_pagination($page, $pages, $query);

if (!$clients) {
    echo '<div class="flash flash-info" style="margin-top:16px">
      Nie masz jeszcze żadnych klientów — <a href="clients.php">dodaj pierwszego klienta</a>,
      aby otrzymać jego adres webhooka i zacząć zbierać leady.
    </div>';
}

ui_footer();
