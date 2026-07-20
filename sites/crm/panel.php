<?php
/**
 * LeadFlow CRM — panel klienta: wyłącznie własne leady.
 */

require_once __DIR__ . '/ui.php';
require_once __DIR__ . '/filters.php';

$client = require_client();
$pdo    = db();

[$where, $params, $query] = build_lead_filters((int)$client['id']);
$sqlWhere = 'WHERE ' . implode(' AND ', $where);

$st = $pdo->prepare("SELECT COUNT(*) FROM leads $sqlWhere");
$st->execute($params);
$total = (int)$st->fetchColumn();

$pages = max(1, (int)ceil($total / CRM_PER_PAGE));
$page  = min($pages, max(1, (int)($_GET['page'] ?? 1)));
$offset = ($page - 1) * CRM_PER_PAGE;

$st = $pdo->prepare("SELECT * FROM leads
                     $sqlWhere
                     ORDER BY created_at DESC, id DESC
                     LIMIT " . CRM_PER_PAGE . " OFFSET $offset");
$st->execute($params);
$leads = $st->fetchAll();

$backUrl = 'panel.php?' . $query . 'page=' . $page;

ui_header('Moje leady', 'client', $client['name'], 'panel.php');
ui_flash();
?>
<div class="page-head">
  <h1>📋 Moje leady<?= $client['company'] !== '' ? ' — ' . e($client['company']) : '' ?></h1>
  <div class="page-actions">
    <a class="btn btn-ghost" href="export.php?<?= e($query) ?>">⬇ Eksport CSV</a>
  </div>
</div>
<?php
ui_stats($where, $params);
ui_filter_form();
ui_leads_table($leads, false, $backUrl);
ui_pagination($page, $pages, $query);
ui_footer();
