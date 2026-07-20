<?php
/**
 * cron.php — automatyczny import hurtowni i synchronizacja ofert.
 *
 * Wywołanie (token znajdziesz w panelu → Ustawienia → Automatyzacja):
 *   https://twojadomena.pl/.../panel/cron.php?token=XXXX
 *
 * Przykładowy wpis crona na hostingu (co godzinę):
 *   0 * * * * curl -s "https://twojadomena.pl/.../panel/cron.php?token=XXXX" > /dev/null
 *
 * Co robi:
 *   1. pobiera i importuje XML każdej hurtowni,
 *   2. aktualizuje ceny i stany wszystkich ofert wystawionych przez panel
 *      (produkt zniknął z feedu → stan 0),
 *   3. zwraca podsumowanie JSON i zapisuje wynik w logach panelu.
 */
require_once __DIR__ . '/lib/bootstrap.php';

set_time_limit(1800);
ignore_user_abort(true);
session_write_close();

$cfg = config();
$token = (string)($_GET['token'] ?? '');
if (empty($cfg['cron_token']) || $token === '' || !hash_equals($cfg['cron_token'], $token)) {
    json_fail('Nieprawidłowy token crona.', 403);
}

$summary = ['ok' => true, 'started_at' => date('Y-m-d H:i:s'), 'suppliers' => [], 'sync' => null];

// 1. import wszystkich hurtowni
$suppliers = db()->pdo->query('SELECT * FROM suppliers ORDER BY name')->fetchAll();
foreach ($suppliers as $s) {
    $res = run_supplier_fetch($s);
    $summary['suppliers'][] = [
        'name'  => $s['name'],
        'ok'    => $res['ok'],
        'count' => $res['count'] ?? null,
        'error' => $res['error'] ?? null,
    ];
}

// 2. synchronizacja ofert (tylko gdy konto połączone)
$accessToken = allegro_access_token();
if ($accessToken !== null) {
    $summary['sync'] = run_offers_sync(allegro_client(), $accessToken, 500);
} else {
    $summary['sync'] = ['skipped' => 'Konto Allegro niepołączone — pominięto synchronizację.'];
}

$summary['finished_at'] = date('Y-m-d H:i:s');
db()->log('info', 'Cron zakończony', [
    'hurtownie' => count($summary['suppliers']),
    'sync'      => is_array($summary['sync']) && isset($summary['sync']['updated'])
        ? $summary['sync']['updated'] . ' zaktualizowanych' : 'pominięto',
]);
json_out($summary);
