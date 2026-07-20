<?php
/**
 * LeadFlow CRM — eksport leadów do CSV (Excel, separator ;, BOM UTF-8).
 * Admin eksportuje wg bieżących filtrów, klient — wyłącznie swoje leady.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/filters.php';

$admin  = current_admin();
$client = current_client();
if (!$admin && !$client) {
    redirect('login.php');
}

[$where, $params] = build_lead_filters($client ? (int)$client['id'] : null);
$sqlWhere = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

$st = db()->prepare("SELECT leads.*, clients.name AS client_name
                     FROM leads JOIN clients ON clients.id = leads.client_id
                     $sqlWhere ORDER BY leads.created_at DESC");
$st->execute($params);

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="leady-' . date('Y-m-d') . '.csv"');

$out = fopen('php://output', 'w');
fwrite($out, "\xEF\xBB\xBF"); // BOM — polskie znaki w Excelu

$head = ['Data', 'Klient', 'Źródło', 'Imię i nazwisko', 'E-mail', 'Telefon', 'Wiadomość', 'Formularz', 'Kampania', 'Status', 'Notatka'];
if ($client) {
    unset($head[1]);
}
fputcsv($out, array_values($head), ';', '"', '');

while ($l = $st->fetch()) {
    $row = [
        $l['created_at'],
        $l['client_name'],
        CRM_SOURCES[$l['source']][0] ?? $l['source'],
        $l['name'],
        $l['email'],
        $l['phone'],
        $l['message'],
        $l['form_name'],
        $l['campaign'],
        CRM_STATUSES[$l['status']] ?? $l['status'],
        $l['note'],
    ];
    if ($client) {
        unset($row[1]);
    }
    fputcsv($out, array_values($row), ';', '"', '');
}
fclose($out);
