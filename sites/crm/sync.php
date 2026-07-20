<?php
/**
 * REAKTOR Sync — kanał zmian w czasie rzeczywistym na zwykłym hostingu PHP.
 *
 * GET sync.php?rev=N
 * Trzyma połączenie do SYNC_WINDOW sekund (long-poll) i sprawdza co sekundę
 * globalną rewizję stanu (settings.state_rev, podbijaną przy każdej mutacji).
 * Gdy rewizja wzrośnie ponad N → natychmiast odpowiada {changed:true} i klient
 * dociąga deltę z api.php?a=delta. Gdy nic się nie zmieni → {changed:false}
 * i klient od razu otwiera kolejne połączenie.
 *
 * Odczyt rewizji to jedno zapytanie o pojedynczy wiersz SQLite (WAL) —
 * koszt praktycznie zerowy, a leady pojawiają się w panelu w ~1 s od webhooka.
 */

require_once __DIR__ . '/config.php';

const SYNC_WINDOW = 20; // sekund; bezpiecznie poniżej typowych limitów hostingów

crm_session_start();
if (!current_admin() && !current_client()) {
    json_out(['ok' => false, 'error' => 'auth'], 401);
}
// sesja tylko sprawdzona — zwalniamy blokadę, żeby long-poll nie blokował panelu
session_write_close();

ignore_user_abort(false);
$clientRev = (int)($_GET['rev'] ?? 0);

$limit    = (int)ini_get('max_execution_time');
$window   = $limit > 0 ? min(SYNC_WINDOW, max(5, $limit - 5)) : SYNC_WINDOW;
$deadline = time() + $window;

do {
    $rev = state_rev();
    if ($rev !== $clientRev) {
        json_out(['ok' => true, 'changed' => true, 'rev' => $rev, 'ver' => CRM_VERSION]);
    }
    if (connection_aborted()) {
        exit;
    }
    usleep(1000000);
} while (time() < $deadline);

json_out(['ok' => true, 'changed' => false, 'rev' => $clientRev, 'ver' => CRM_VERSION]);
