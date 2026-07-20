<?php
/**
 * callback.php — powrót z autoryzacji OAuth Allegro (redirect URI).
 * Ten adres należy wpisać jako "Redirect URI" w aplikacji na
 * https://apps.developer.allegro.pl (produkcja) lub
 * https://apps.developer.allegro.pl.allegrosandbox.pl (sandbox).
 */
require_once __DIR__ . '/lib/bootstrap.php';

function back(string $query)
{
    header('Location: index.php?' . $query);
    exit;
}

if (!is_logged_in()) {
    back('oauth=error&reason=' . urlencode('Sesja panelu wygasła — zaloguj się i spróbuj ponownie.'));
}

if (isset($_GET['error'])) {
    store()->log('error', 'Allegro OAuth odrzucone', ['error' => $_GET['error']]);
    back('oauth=error&reason=' . urlencode($_GET['error_description'] ?? $_GET['error']));
}

$code  = (string)($_GET['code'] ?? '');
$state = (string)($_GET['state'] ?? '');
if ($code === '' || $state === '' || empty($_SESSION['oauth_state']) || !hash_equals($_SESSION['oauth_state'], $state)) {
    back('oauth=error&reason=' . urlencode('Nieprawidłowy stan autoryzacji (state). Spróbuj ponownie.'));
}
unset($_SESSION['oauth_state']);

$client = allegro_client();
$resp = $client->exchangeCode($code);
if (empty($resp['access_token'])) {
    store()->log('error', 'Wymiana kodu OAuth nieudana', ['resp' => $resp]);
    back('oauth=error&reason=' . urlencode($resp['error_description'] ?? $resp['error'] ?? 'Nieznany błąd'));
}

save_tokens($resp);
allegro_fetch_me($client, $resp['access_token']);
store()->log('info', 'Połączono konto Allegro (OAuth authorization code).');
back('oauth=ok');
