<?php
/**
 * bootstrap.php — wspólna inicjalizacja panelu: sesja, baza SQLite, helpery.
 */
error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
ini_set('display_errors', '0');

require_once __DIR__ . '/Db.php';
require_once __DIR__ . '/AllegroClient.php';
require_once __DIR__ . '/XmlImporter.php';

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

// wymagania środowiska — czytelny komunikat zamiast białego ekranu
foreach (['pdo_sqlite' => 'PDO SQLite', 'curl' => 'cURL', 'xmlreader' => 'XMLReader', 'simplexml' => 'SimpleXML'] as $ext => $label) {
    if (!extension_loaded($ext)) {
        json_fail("Brak rozszerzenia PHP: $label ($ext). Włącz je w konfiguracji hostingu (PHP 7.4+).", 500);
    }
}

session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax',
    'path'     => '/',
]);
session_name('ALLEGROMGR');
session_start();

try {
    $GLOBALS['db'] = new Db(__DIR__ . '/../data');
} catch (Throwable $e) {
    json_fail('Nie można otworzyć bazy danych: ' . $e->getMessage()
        . ' — sprawdź prawa zapisu do katalogu panel/data/.', 500);
}

function db(): Db
{
    return $GLOBALS['db'];
}

function config(): array
{
    return db()->get('config', []);
}

function save_config(array $cfg)
{
    db()->set('config', $cfg);
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

/** Bazowy adres panelu (do budowy redirect URI OAuth i adresu crona). */
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

/** Token crona — generowany przy pierwszym użyciu. */
function cron_token(): string
{
    $cfg = config();
    if (empty($cfg['cron_token'])) {
        $cfg['cron_token'] = bin2hex(random_bytes(20));
        save_config($cfg);
    }
    return $cfg['cron_token'];
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
    db()->set('tokens', [
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
    $tokens = db()->get('tokens');
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
        db()->log('error', 'Odświeżenie tokenu Allegro nie powiodło się', ['resp' => $resp]);
        db()->remove('tokens');
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

// ---------------------------------------------- operacje współdzielone z cronem

/**
 * Pobiera i importuje XML hurtowni do bazy.
 * Zwraca ['ok'=>bool, 'count'=>int, 'format'=>string, 'warnings'=>[], 'error'=>?]
 */
function run_supplier_fetch(array $s): array
{
    $tmp = db()->tmpFile('feed_' . $s['id']);
    $dl = XmlImporter::download($s['url'], $s['login'] ?? '', $s['password'] ?? '', $tmp);
    if (!$dl['ok']) {
        db()->log('error', 'Pobieranie XML nieudane: ' . $s['name'], ['error' => $dl['error']]);
        return ['ok' => false, 'error' => $dl['error']];
    }
    $mapping = null;
    if (!empty($s['mapping'])) {
        $mapping = is_array($s['mapping']) ? $s['mapping'] : json_decode($s['mapping'], true);
    }
    $parsed = XmlImporter::parse($tmp, $mapping);
    @unlink($tmp);
    if (!$parsed['ok']) {
        db()->log('error', 'Parsowanie XML nieudane: ' . $s['name'], ['error' => $parsed['error']]);
        return ['ok' => false, 'error' => $parsed['error']];
    }
    $count = db()->replaceProducts($s['id'], $parsed['products']);
    db()->pdo->prepare('UPDATE suppliers SET last_fetch = ?, last_count = ?, last_format = ?, product_node = ? WHERE id = ?')
        ->execute([date('Y-m-d H:i:s'), $count, $parsed['format'], $parsed['product_node'], $s['id']]);
    db()->log('info', 'Zaimportowano XML: ' . $s['name'], [
        'produkty' => $count, 'format' => $parsed['format'], 'bajty' => $dl['bytes'],
    ]);
    return ['ok' => true, 'count' => $count, 'format' => $parsed['format'], 'warnings' => $parsed['warnings']];
}

/**
 * Synchronizacja wystawionych ofert z aktualnym importem:
 * nowa cena = cena hurtowa brutto + marża hurtowni, nowy stan = stan z hurtowni
 * (produkt zniknął z feedu → stan 0). PATCH /sale/product-offers/{id}.
 * Zwraca ['checked','updated','zeroed','errors'=>[], 'skipped'].
 */
function run_offers_sync(AllegroClient $client, string $token, int $limit = 200): array
{
    $rows = db()->pdo->query('
        SELECT o.id AS oid, o.allegro_offer_id, o.name AS oname, o.price AS oprice, o.qty AS oqty,
               p.price_gross, p.stock, s.markup
        FROM offers o
        JOIN suppliers s ON s.id = o.supplier_id
        LEFT JOIN products p ON p.supplier_id = o.supplier_id AND p.uid = o.product_uid
        ORDER BY o.updated_at ASC
        LIMIT ' . (int)$limit)->fetchAll();

    $out = ['checked' => 0, 'updated' => 0, 'zeroed' => 0, 'skipped' => 0, 'errors' => []];
    $upd = db()->pdo->prepare('UPDATE offers SET price = ?, qty = ?, updated_at = ? WHERE id = ?');

    foreach ($rows as $r) {
        $out['checked']++;
        $missing  = $r['price_gross'] === null && $r['stock'] === null;
        $newQty   = $missing ? 0 : max(0, (int)($r['stock'] ?? 0));
        $newPrice = ($missing || $r['price_gross'] === null)
            ? (float)$r['oprice']
            : round((float)$r['price_gross'] * (1 + (float)$r['markup'] / 100), 2);
        if ($newPrice <= 0) {
            $newPrice = (float)$r['oprice'];
        }

        $samePrice = abs($newPrice - (float)$r['oprice']) < 0.005;
        $sameQty   = $newQty === (int)$r['oqty'];
        if ($samePrice && $sameQty) {
            $out['skipped']++;
            continue;
        }

        $payload = ['stock' => ['available' => $newQty, 'unit' => 'UNIT']];
        if (!$samePrice) {
            $payload['sellingMode'] = ['price' => ['amount' => number_format($newPrice, 2, '.', ''), 'currency' => 'PLN']];
        }
        $resp = $client->request('PATCH', '/sale/product-offers/' . rawurlencode($r['allegro_offer_id']), $token, $payload);
        if (in_array($resp['http'], [200, 202], true)) {
            $upd->execute([$newPrice, $newQty, date('Y-m-d H:i:s'), $r['oid']]);
            $out['updated']++;
            if ($missing) {
                $out['zeroed']++;
            }
        } else {
            $err = AllegroClient::apiError($resp);
            $out['errors'][] = ['offer' => $r['allegro_offer_id'], 'name' => $r['oname'], 'error' => $err];
            db()->log('error', 'Synchronizacja oferty nieudana: ' . $r['oname'], [
                'offer_id' => $r['allegro_offer_id'], 'error' => $err,
            ]);
        }
    }
    if ($out['updated'] || $out['errors']) {
        db()->log('info', 'Synchronizacja ofert zakończona', [
            'sprawdzono' => $out['checked'], 'zaktualizowano' => $out['updated'],
            'wyzerowano' => $out['zeroed'], 'błędy' => count($out['errors']),
        ]);
    }
    return $out;
}
