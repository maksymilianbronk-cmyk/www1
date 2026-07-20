<?php
/**
 * LeadFlow CRM — zmiana statusu / notatki leada.
 * Dostęp: super admin (każdy lead) lub klient (tylko własne leady).
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('index.php');
}
csrf_check();

$admin  = current_admin();
$client = current_client();
if (!$admin && !$client) {
    redirect('login.php');
}

$id     = (int)($_POST['id'] ?? 0);
$status = (string)($_POST['status'] ?? '');
$note   = trim((string)($_POST['note'] ?? ''));

// dozwolone strony powrotu — tylko wewnętrzne panele
$back = (string)($_POST['back'] ?? '');
if (!preg_match('~^(admin|panel)\.php(\?[\w=&%.\-]*)?$~', $back)) {
    $back = $admin ? 'admin.php' : 'panel.php';
}

if (!isset(CRM_STATUSES[$status])) {
    redirect($back);
}

$st = db()->prepare('SELECT id, client_id FROM leads WHERE id = ?');
$st->execute([$id]);
$lead = $st->fetch();

if (!$lead || ($client && (int)$lead['client_id'] !== (int)$client['id'])) {
    redirect($back);
}

db()->prepare("UPDATE leads SET status = ?, note = ?, updated_at = datetime('now','localtime') WHERE id = ?")
    ->execute([$status, mb_substr($note, 0, 2000), $id]);

redirect($back);
