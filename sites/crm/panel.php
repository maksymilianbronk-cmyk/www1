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
ui_chart(['client_id = ?'], [(int)$client['id']]);
ui_filter_form();
ui_leads_table($leads, false, $backUrl);
ui_pagination($page, $pages, $query);
?>
<details class="dev-box">
  <summary>🔌 Dla webmastera — jak podpiąć formularz Twojej strony</summary>
  <div class="dev-box-body">
    <p>Wyślij żądanie <code>POST</code> (JSON lub pola formularza) na adres:</p>
    <code class="webhook-url" data-copy><?= e(base_url() . '/webhook.php?token=' . $client['token']) ?></code>
    <p class="muted" style="margin-top:8px">
      Rozpoznawane pola: <code>name</code>/<code>imie</code>, <code>email</code>,
      <code>phone</code>/<code>telefon</code>, <code>message</code>/<code>wiadomosc</code> —
      pozostałe pola trafią do szczegółów leada. Gotowe przykłady kodu znajdziesz
      w dokumentacji systemu (README).
    </p>
  </div>
</details>
<?php
ui_footer();
