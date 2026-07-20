<?php
/**
 * bootstrap.php — wspólna inicjalizacja panelu: sesja, magazyn danych, helpery.
 */
error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
ini_set('display_errors', '0');

require_once __DIR__ . '/Store.php';
require_once __DIR__ . '/AllegroClient.php';
require_once __DIR__ . '/XmlImporter.php';

session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax',
    'path'     => '/',
]);
session_name('ALLEGROMGR');
session_start();

$GLOBALS['store'] = new Store(__DIR__ . '/../data');

function store(): Store
{
    return $GLOBALS['store'];
}

function json_out($data, int $code = 200)
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_fail(string $message, int $code = 400)
{
    json_out(['ok' => false, 'error' => $message], $code);
}

function config(): array
{
    return store()->read('config', []);
}

function save_config(array $cfg)
{
    store()->write('config', $cfg);
}

function is_logged_in(): bool
{
    return !empty($_SESSION['logged_in']);
}

function require_auth()
{
    if (!is_logged_in()) {
        json_fail('Brak autoryzacji — zaloguj się ponownie.', 401);
    }
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
    }
    return $_SESSION['csrf'];
}

function require_csrf()
{
    $sent = $_SERVER['HTTP_X_CSRF'] ?? '';
    if ($sent === '' || empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $sent)) {
        json_fail('Nieprawidłowy token CSRF — odśwież stronę.', 403);
    }
}

/** Treść żądania POST jako tablica (JSON). */
function body(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/** Bazowy adres panelu (do budowy redirect URI OAuth). */
function panel_base_url(): string
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    $scheme = $https ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $dir  = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/\\');
    return $scheme . '://' . $host . $dir;
}

function oauth_redirect_uri(): string
{
    return panel_base_url() . '/callback.php';
}

// ------------------------------------------------------------ tokeny Allegro

function allegro_client(): AllegroClient
{
    $cfg = config();
    if (empty($cfg['allegro_client_id']) || empty($cfg['allegro_client_secret'])) {
        json_fail('Najpierw zapisz Client ID i Client Secret aplikacji Allegro w Ustawieniach.', 409);
    }
    return new AllegroClient(
        $cfg['allegro_client_id'],
        $cfg['allegro_client_secret'],
        ($cfg['allegro_env'] ?? 'sandbox') === 'sandbox',
        oauth_redirect_uri()
    );
}

function save_tokens(array $tokenResponse)
{
    store()->write('tokens', [
        'access_token'  => $tokenResponse['access_token'],
        'refresh_token' => $tokenResponse['refresh_token'] ?? null,
        'expires_at'    => time() + (int)($tokenResponse['expires_in'] ?? 3600),
    ]);
}

/**
 * Zwraca ważny access token (odświeża automatycznie) albo null,
 * gdy konto Allegro nie jest połączone.
 */
function allegro_access_token()
{
    $tokens = store()->read('tokens');
    if (!$tokens || empty($tokens['access_token'])) {
        return null;
    }
    if (($tokens['expires_at'] ?? 0) - 120 > time()) {
        return $tokens['access_token'];
    }
    if (empty($tokens['refresh_token'])) {
        return null;
    }
    $resp = allegro_client()->refreshToken($tokens['refresh_token']);
    if (empty($resp['access_token'])) {
        store()->log('error', 'Odświeżenie tokenu Allegro nie powiodło się', ['resp' => $resp]);
        store()->delete('tokens');
        return null;
    }
    save_tokens($resp);
    return $resp['access_token'];
}

function require_allegro_token(): string
{
    $token = allegro_access_token();
    if ($token === null) {
        json_fail('Konto Allegro nie jest połączone (lub token wygasł). Przejdź do Ustawień i połącz konto.', 409);
    }
    return $token;
}

/** Pobiera i zapamiętuje login zalogowanego konta Allegro. */
function allegro_fetch_me(AllegroClient $client, string $token)
{
    $resp = $client->request('GET', '/me', $token);
    if ($resp['http'] === 200 && is_array($resp['data'])) {
        $cfg = config();
        $cfg['allegro_user'] = $resp['data']['login'] ?? ($resp['data']['email'] ?? null);
        save_config($cfg);
    }
}
