<?php
/**
 * api.php — backend panelu Allegro Manager (JSON API).
 *
 * Akcje: autoryzacja panelu, konfiguracja aplikacji Allegro, OAuth
 * (authorization code + device flow), hurtownie XML, produkty,
 * dopasowanie EAN i wystawianie ofert na Allegro.
 */
require_once __DIR__ . '/lib/bootstrap.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    // setup i login nie mają jeszcze sesji z tokenem — CSRF sprawdzamy po zalogowaniu
    if (!in_array($action, ['setup', 'login'], true)) {
        require_csrf();
    }
}

switch ($action) {

    // ================================================================ PANEL

    case 'status': {
        $cfg = config();
        $tokens = store()->read('tokens');
        json_out([
            'ok'             => true,
            'setup_required' => empty($cfg['admin_pass_hash']),
            'logged_in'      => is_logged_in(),
            'csrf'           => is_logged_in() ? csrf_token() : null,
            'allegro'        => [
                'configured' => !empty($cfg['allegro_client_id']) && !empty($cfg['allegro_client_secret']),
                'connected'  => !empty($tokens['access_token']),
                'env'        => $cfg['allegro_env'] ?? 'sandbox',
                'user'       => $cfg['allegro_user'] ?? null,
            ],
        ]);
    }

    case 'setup': {
        $cfg = config();
        if (!empty($cfg['admin_pass_hash'])) {
            json_fail('Panel jest już skonfigurowany.');
        }
        $pass = (string)(body()['password'] ?? '');
        if (strlen($pass) < 8) {
            json_fail('Hasło musi mieć co najmniej 8 znaków.');
        }
        $cfg['admin_pass_hash'] = password_hash($pass, PASSWORD_DEFAULT);
        $cfg['allegro_env'] = $cfg['allegro_env'] ?? 'sandbox';
        save_config($cfg);
        $_SESSION['logged_in'] = true;
        session_regenerate_id(true);
        store()->log('info', 'Utworzono hasło administratora, panel gotowy.');
        json_out(['ok' => true, 'csrf' => csrf_token()]);
    }

    case 'login': {
        $cfg = config();
        if (empty($cfg['admin_pass_hash'])) {
            json_fail('Panel nie jest jeszcze skonfigurowany.', 409);
        }
        // prosty rate-limit: max 10 prób / 10 minut
        $attempts = array_filter(store()->read('login_attempts', []), function ($t) { return $t > time() - 600; });
        if (count($attempts) >= 10) {
            json_fail('Zbyt wiele prób logowania. Spróbuj za 10 minut.', 429);
        }
        $pass = (string)(body()['password'] ?? '');
        if (!password_verify($pass, $cfg['admin_pass_hash'])) {
            $attempts[] = time();
            store()->write('login_attempts', array_values($attempts));
            json_fail('Nieprawidłowe hasło.', 401);
        }
        store()->write('login_attempts', []);
        $_SESSION['logged_in'] = true;
        session_regenerate_id(true);
        json_out(['ok' => true, 'csrf' => csrf_token()]);
    }

    case 'logout': {
        require_auth();
        session_destroy();
        json_out(['ok' => true]);
    }

    case 'password_change': {
        require_auth();
        $b = body();
        $cfg = config();
        if (!password_verify((string)($b['current'] ?? ''), $cfg['admin_pass_hash'])) {
            json_fail('Obecne hasło jest nieprawidłowe.');
        }
        if (strlen((string)($b['new'] ?? '')) < 8) {
            json_fail('Nowe hasło musi mieć co najmniej 8 znaków.');
        }
        $cfg['admin_pass_hash'] = password_hash($b['new'], PASSWORD_DEFAULT);
        save_config($cfg);
        json_out(['ok' => true]);
    }

    // ============================================================ USTAWIENIA

    case 'settings': {
        require_auth();
        $cfg = config();
        json_out(['ok' => true, 'settings' => [
            'allegro_client_id'   => $cfg['allegro_client_id'] ?? '',
            'allegro_secret_set'  => !empty($cfg['allegro_client_secret']),
            'allegro_env'         => $cfg['allegro_env'] ?? 'sandbox',
            'redirect_uri'        => oauth_redirect_uri(),
            'markup_default'      => $cfg['markup_default'] ?? 20,
            'offer_defaults'      => $cfg['offer_defaults'] ?? [
                'publication'         => 'INACTIVE',
                'shipping_rate_id'    => '',
                'return_policy_id'    => '',
                'warranty_id'         => '',
                'implied_warranty_id' => '',
            ],
        ]]);
    }

    case 'settings_save': {
        require_auth();
        $b = body();
        $cfg = config();
        $envBefore = $cfg['allegro_env'] ?? 'sandbox';
        $idBefore  = $cfg['allegro_client_id'] ?? '';

        $cfg['allegro_client_id'] = trim((string)($b['allegro_client_id'] ?? $cfg['allegro_client_id'] ?? ''));
        if (!empty($b['allegro_client_secret'])) {
            $cfg['allegro_client_secret'] = trim((string)$b['allegro_client_secret']);
        }
        $cfg['allegro_env']    = in_array($b['allegro_env'] ?? '', ['sandbox', 'production'], true)
            ? $b['allegro_env'] : ($cfg['allegro_env'] ?? 'sandbox');
        $cfg['markup_default'] = max(0, (float)($b['markup_default'] ?? $cfg['markup_default'] ?? 20));
        if (isset($b['offer_defaults']) && is_array($b['offer_defaults'])) {
            $cfg['offer_defaults'] = [
                'publication'         => ($b['offer_defaults']['publication'] ?? 'INACTIVE') === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
                'shipping_rate_id'    => (string)($b['offer_defaults']['shipping_rate_id'] ?? ''),
                'return_policy_id'    => (string)($b['offer_defaults']['return_policy_id'] ?? ''),
                'warranty_id'         => (string)($b['offer_defaults']['warranty_id'] ?? ''),
                'implied_warranty_id' => (string)($b['offer_defaults']['implied_warranty_id'] ?? ''),
            ];
        }
        // zmiana aplikacji lub środowiska unieważnia tokeny
        if ($cfg['allegro_env'] !== $envBefore || $cfg['allegro_client_id'] !== $idBefore) {
            store()->delete('tokens');
            unset($cfg['allegro_user']);
        }
        save_config($cfg);
        store()->log('info', 'Zapisano ustawienia.', ['env' => $cfg['allegro_env']]);
        json_out(['ok' => true]);
    }

    // ========================================================= OAUTH ALLEGRO

    case 'allegro_connect': {
        require_auth();
        $client = allegro_client();
        $state  = bin2hex(random_bytes(16));
        $_SESSION['oauth_state'] = $state;
        json_out(['ok' => true, 'url' => $client->authorizeUrl($state)]);
    }

    case 'allegro_device_start': {
        require_auth();
        $client = allegro_client();
        $resp = $client->deviceStart();
        if (empty($resp['device_code'])) {
            json_fail('Błąd Device Flow: ' . ($resp['error_description'] ?? $resp['error'] ?? 'HTTP ' . $resp['http']));
        }
        json_out(['ok' => true,
            'device_code'               => $resp['device_code'],
            'user_code'                 => $resp['user_code'],
            'verification_uri_complete' => $resp['verification_uri_complete'] ?? '',
            'interval'                  => $resp['interval'] ?? 5,
        ]);
    }

    case 'allegro_device_poll': {
        require_auth();
        $client = allegro_client();
        $resp = $client->devicePoll((string)(body()['device_code'] ?? ''));
        if (!empty($resp['access_token'])) {
            save_tokens($resp);
            allegro_fetch_me($client, $resp['access_token']);
            store()->log('info', 'Połączono konto Allegro (Device Flow).');
            json_out(['ok' => true, 'status' => 'connected']);
        }
        $err = $resp['error'] ?? 'unknown';
        if (in_array($err, ['authorization_pending', 'slow_down'], true)) {
            json_out(['ok' => true, 'status' => 'pending']);
        }
        json_fail('Autoryzacja nieudana: ' . ($resp['error_description'] ?? $err));
    }

    case 'allegro_disconnect': {
        require_auth();
        store()->delete('tokens');
        $cfg = config();
        unset($cfg['allegro_user']);
        save_config($cfg);
        store()->log('info', 'Odłączono konto Allegro.');
        json_out(['ok' => true]);
    }

    case 'allegro_me': {
        require_auth();
        $token = require_allegro_token();
        $client = allegro_client();
        $resp = $client->request('GET', '/me', $token);
        if ($resp['http'] !== 200) {
            json_fail('Błąd /me: ' . AllegroClient::apiError($resp));
        }
        json_out(['ok' => true, 'me' => $resp['data']]);
    }

    /** Listy do ustawień ofert: cenniki dostawy, polityki zwrotów, gwarancje, reklamacje. */
    case 'allegro_offer_dictionaries': {
        require_auth();
        $token  = require_allegro_token();
        $client = allegro_client();
        $out = [];
        $endpoints = [
            'shipping_rates'     => '/sale/shipping-rates',
            'return_policies'    => '/after-sales-service-conditions/return-policies',
            'implied_warranties' => '/after-sales-service-conditions/implied-warranties',
            'warranties'         => '/after-sales-service-conditions/warranties',
        ];
        foreach ($endpoints as $key => $path) {
            $resp = $client->request('GET', $path, $token);
            $data = $resp['data'] ?? [];
            $list = $data['shippingRates'] ?? $data[$key] ?? null;
            if ($list === null) {
                // API zwraca różne klucze: returnPolicies / impliedWarranties / warranties
                foreach (['returnPolicies', 'impliedWarranties', 'warranties'] as $k) {
                    if (isset($data[$k])) { $list = $data[$k]; break; }
                }
            }
            $out[$key] = array_map(function ($item) {
                return ['id' => $item['id'] ?? '', 'name' => $item['name'] ?? ($item['id'] ?? '?')];
            }, is_array($list) ? $list : []);
        }
        json_out(['ok' => true] + $out);
    }

    // ============================================================= HURTOWNIE

    case 'suppliers': {
        require_auth();
        $suppliers = store()->read('suppliers', []);
        foreach ($suppliers as &$s) {
            $s['has_password'] = !empty($s['password']);
            unset($s['password']);
        }
        unset($s);
        json_out(['ok' => true, 'suppliers' => array_values($suppliers)]);
    }

    case 'supplier_save': {
        require_auth();
        $b = body();
        $name = trim((string)($b['name'] ?? ''));
        $url  = trim((string)($b['url'] ?? ''));
        if ($name === '') {
            json_fail('Podaj nazwę hurtowni.');
        }
        if (!preg_match('#^https?://#i', $url)) {
            json_fail('Adres XML musi zaczynać się od http:// lub https://');
        }
        $mapping = null;
        if (!empty($b['mapping'])) {
            $mapping = is_array($b['mapping']) ? $b['mapping'] : json_decode((string)$b['mapping'], true);
            if ($mapping === null) {
                json_fail('Mapowanie pól musi być poprawnym JSON-em.');
            }
        }
        $suppliers = store()->read('suppliers', []);
        $id = (string)($b['id'] ?? '');
        if ($id === '' || !isset($suppliers[$id])) {
            $id = 'h' . substr(bin2hex(random_bytes(6)), 0, 8);
            $suppliers[$id] = ['id' => $id, 'created_at' => date('Y-m-d H:i:s')];
        }
        $suppliers[$id] = array_merge($suppliers[$id], [
            'name'    => $name,
            'url'     => $url,
            'login'   => trim((string)($b['login'] ?? '')),
            'markup'  => max(0, (float)($b['markup'] ?? config()['markup_default'] ?? 20)),
            'mapping' => $mapping,
        ]);
        if (!empty($b['password'])) {
            $suppliers[$id]['password'] = (string)$b['password'];
        }
        store()->write('suppliers', $suppliers);
        store()->log('info', 'Zapisano hurtownię: ' . $name, ['id' => $id]);
        json_out(['ok' => true, 'id' => $id]);
    }

    case 'supplier_delete': {
        require_auth();
        $id = (string)(body()['id'] ?? '');
        $suppliers = store()->read('suppliers', []);
        if (!isset($suppliers[$id])) {
            json_fail('Nie znaleziono hurtowni.');
        }
        $name = $suppliers[$id]['name'];
        unset($suppliers[$id]);
        store()->write('suppliers', $suppliers);
        store()->delete('products_' . $id);
        store()->log('info', 'Usunięto hurtownię: ' . $name);
        json_out(['ok' => true]);
    }

    /** Pobranie i sparsowanie XML hurtowni. */
    case 'supplier_fetch': {
        require_auth();
        set_time_limit(600);
        session_write_close(); // nie blokuj innych żądań na czas długiego pobierania
        $id = (string)(body()['id'] ?? '');
        $suppliers = store()->read('suppliers', []);
        if (!isset($suppliers[$id])) {
            json_fail('Nie znaleziono hurtowni.');
        }
        $s = $suppliers[$id];
        $tmp = store()->tmpFile('feed_' . $id);
        $dl = XmlImporter::download($s['url'], $s['login'] ?? '', $s['password'] ?? '', $tmp);
        if (!$dl['ok']) {
            store()->log('error', 'Pobieranie XML nieudane: ' . $s['name'], ['error' => $dl['error']]);
            json_fail($dl['error']);
        }
        $parsed = XmlImporter::parse($tmp, $s['mapping'] ?? null);
        @unlink($tmp);
        if (!$parsed['ok']) {
            store()->log('error', 'Parsowanie XML nieudane: ' . $s['name'], ['error' => $parsed['error']]);
            json_fail($parsed['error']);
        }
        store()->write('products_' . $id, [
            'fetched_at' => date('Y-m-d H:i:s'),
            'format'     => $parsed['format'],
            'products'   => $parsed['products'],
        ]);
        $suppliers[$id]['last_fetch']    = date('Y-m-d H:i:s');
        $suppliers[$id]['last_count']    = count($parsed['products']);
        $suppliers[$id]['last_format']   = $parsed['format'];
        $suppliers[$id]['product_node']  = $parsed['product_node'];
        store()->write('suppliers', $suppliers);
        store()->log('info', 'Zaimportowano XML: ' . $s['name'], [
            'produkty' => count($parsed['products']), 'format' => $parsed['format'], 'bajty' => $dl['bytes'],
        ]);
        json_out(['ok' => true,
            'count'    => count($parsed['products']),
            'format'   => $parsed['format'],
            'warnings' => $parsed['warnings'],
        ]);
    }

    // ============================================================== PRODUKTY

    case 'products': {
        require_auth();
        $sid  = (string)($_GET['supplier'] ?? '');
        $q    = mb_strtolower(trim((string)($_GET['q'] ?? '')));
        $page = max(1, (int)($_GET['page'] ?? 1));
        $per  = 50;
        $data = store()->read('products_' . $sid);
        if (!$data) {
            json_out(['ok' => true, 'products' => [], 'total' => 0, 'page' => 1, 'pages' => 0, 'fetched_at' => null]);
        }
        $products = $data['products'];
        // klucz produktu = pozycja na liście (stała między pobraniami tego samego pliku)
        foreach ($products as $i => &$p) {
            $p['key'] = $i;
        }
        unset($p);
        if ($q !== '') {
            $products = array_values(array_filter($products, function ($p) use ($q) {
                return mb_strpos(mb_strtolower($p['name']), $q) !== false
                    || strpos($p['ean'], $q) !== false
                    || mb_strpos(mb_strtolower($p['sku']), $q) !== false;
            }));
        }
        if (!empty($_GET['only_ean'])) {
            $products = array_values(array_filter($products, function ($p) { return $p['ean'] !== ''; }));
        }
        $total = count($products);
        $pages = (int)ceil($total / $per);
        $slice = array_slice($products, ($page - 1) * $per, $per);
        json_out(['ok' => true,
            'products'   => $slice,
            'total'      => $total,
            'page'       => $page,
            'pages'      => $pages,
            'fetched_at' => $data['fetched_at'],
            'format'     => $data['format'],
        ]);
    }

    // ==================================================== DOPASOWANIE / OFERTY

    /** Dopasowanie produktów do katalogu Allegro po EAN (GTIN). */
    case 'allegro_match': {
        require_auth();
        $token  = require_allegro_token();
        $client = allegro_client();
        $eans = array_slice(array_values(array_unique(array_filter(
            array_map('strval', (array)(body()['eans'] ?? []))
        ))), 0, 30);
        $results = [];
        foreach ($eans as $ean) {
            $resp = $client->request('GET', '/sale/products?' . http_build_query([
                'phrase' => $ean, 'mode' => 'GTIN', 'language' => 'pl-PL',
            ]), $token);
            if ($resp['http'] !== 200) {
                $results[$ean] = ['found' => false, 'error' => AllegroClient::apiError($resp)];
                continue;
            }
            $items = $resp['data']['products'] ?? [];
            if (!$items) {
                $results[$ean] = ['found' => false];
                continue;
            }
            $first = $items[0];
            $results[$ean] = [
                'found'      => true,
                'product_id' => $first['id'],
                'name'       => $first['name'] ?? '',
                'category'   => $first['category']['id'] ?? null,
                'image'      => $first['images'][0]['url'] ?? null,
                'count'      => count($items),
            ];
        }
        json_out(['ok' => true, 'matches' => $results]);
    }

    /**
     * Wystawienie ofert na Allegro (POST /sale/product-offers).
     * items: [{supplier_id, key, price, qty, ean}]
     */
    case 'allegro_list_offers': {
        require_auth();
        set_time_limit(600);
        session_write_close();
        $token  = require_allegro_token();
        $client = allegro_client();
        $cfg    = config();
        $b      = body();
        $defaults    = $cfg['offer_defaults'] ?? [];
        $publication = ($b['publication'] ?? $defaults['publication'] ?? 'INACTIVE') === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
        $items  = array_slice((array)($b['items'] ?? []), 0, 50);
        if (!$items) {
            json_fail('Brak produktów do wystawienia.');
        }

        $results = [];
        foreach ($items as $item) {
            $sid = (string)($item['supplier_id'] ?? '');
            $key = (int)($item['key'] ?? -1);
            $data = store()->read('products_' . $sid);
            $product = $data['products'][$key] ?? null;
            if (!$product) {
                $results[] = ['key' => $key, 'ok' => false, 'error' => 'Nie znaleziono produktu w imporcie.'];
                continue;
            }
            $label = mb_substr($product['name'], 0, 60);
            if ($product['ean'] === '') {
                $results[] = ['key' => $key, 'name' => $label, 'ok' => false,
                    'error' => 'Brak kodu EAN — produkt trzeba wystawić ręcznie w Allegro.'];
                continue;
            }

            // świeże dopasowanie EAN → ID produktu w katalogu Allegro
            $match = $client->request('GET', '/sale/products?' . http_build_query([
                'phrase' => $product['ean'], 'mode' => 'GTIN', 'language' => 'pl-PL',
            ]), $token);
            $matched = $match['data']['products'][0]['id'] ?? null;
            if ($match['http'] !== 200 || $matched === null) {
                $results[] = ['key' => $key, 'name' => $label, 'ok' => false,
                    'error' => $match['http'] !== 200
                        ? 'Błąd wyszukiwania produktu: ' . AllegroClient::apiError($match)
                        : 'Brak produktu o EAN ' . $product['ean'] . ' w katalogu Allegro.'];
                continue;
            }

            $price = (float)($item['price'] ?? 0);
            $qty   = max(1, (int)($item['qty'] ?? 1));
            if ($price <= 0) {
                $results[] = ['key' => $key, 'name' => $label, 'ok' => false, 'error' => 'Nieprawidłowa cena.'];
                continue;
            }

            $payload = [
                'productSet'  => [['product' => ['id' => $matched]]],
                'sellingMode' => ['format' => 'BUY_NOW',
                    'price' => ['amount' => number_format($price, 2, '.', ''), 'currency' => 'PLN']],
                'stock'       => ['available' => $qty, 'unit' => 'UNIT'],
                'publication' => ['status' => $publication],
                'language'    => 'pl-PL',
            ];
            if (!empty($product['sku'])) {
                $payload['external'] = ['id' => mb_substr($product['sku'], 0, 100)];
            }
            if (!empty($defaults['shipping_rate_id'])) {
                $payload['delivery'] = ['shippingRates' => ['id' => $defaults['shipping_rate_id']]];
            }
            $afterSales = [];
            if (!empty($defaults['return_policy_id'])) {
                $afterSales['returnPolicy'] = ['id' => $defaults['return_policy_id']];
            }
            if (!empty($defaults['implied_warranty_id'])) {
                $afterSales['impliedWarranty'] = ['id' => $defaults['implied_warranty_id']];
            }
            if (!empty($defaults['warranty_id'])) {
                $afterSales['warranties'] = [['id' => $defaults['warranty_id']]];
            }
            if ($afterSales) {
                $payload['afterSalesServices'] = $afterSales;
            }

            $resp = $client->request('POST', '/sale/product-offers', $token, $payload);
            if (in_array($resp['http'], [200, 201, 202], true)) {
                $offerId = $resp['data']['id'] ?? null;
                $results[] = ['key' => $key, 'name' => $label, 'ok' => true,
                    'offer_id' => $offerId, 'status' => $publication,
                    'pending'  => $resp['http'] === 202];
                store()->log('info', 'Wystawiono ofertę: ' . $label, ['offer_id' => $offerId, 'status' => $publication]);
            } else {
                $err = AllegroClient::apiError($resp);
                $results[] = ['key' => $key, 'name' => $label, 'ok' => false, 'error' => $err];
                store()->log('error', 'Błąd wystawiania: ' . $label, ['error' => $err, 'http' => $resp['http']]);
            }
        }
        json_out(['ok' => true, 'results' => $results]);
    }

    /** Lista ofert sprzedawcy na Allegro. */
    case 'allegro_offers': {
        require_auth();
        $token  = require_allegro_token();
        $client = allegro_client();
        $page   = max(1, (int)($_GET['page'] ?? 1));
        $limit  = 20;
        $resp = $client->request('GET', '/sale/offers?' . http_build_query([
            'limit' => $limit, 'offset' => ($page - 1) * $limit,
        ]), $token);
        if ($resp['http'] !== 200) {
            json_fail('Błąd pobierania ofert: ' . AllegroClient::apiError($resp));
        }
        $d = $resp['data'];
        json_out(['ok' => true,
            'offers'     => $d['offers'] ?? [],
            'totalCount' => $d['totalCount'] ?? 0,
            'page'       => $page,
            'pages'      => (int)ceil(($d['totalCount'] ?? 0) / $limit),
            'env'        => (config()['allegro_env'] ?? 'sandbox'),
        ]);
    }

    // ================================================================== LOGI

    case 'logs': {
        require_auth();
        json_out(['ok' => true, 'logs' => array_reverse(store()->read('logs', []))]);
    }

    default:
        json_fail('Nieznana akcja: ' . $action, 404);
}
