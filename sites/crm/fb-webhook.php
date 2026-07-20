<?php
/**
 * LeadFlow CRM — bezpośredni webhook Meta (Facebook Lead Ads), bez pośredników.
 *
 * Konfiguracja w aplikacji Meta for Developers → Webhooks → obiekt "page",
 * pole "leadgen":
 *   Callback URL:  https://twojadomena.pl/sites/crm/fb-webhook.php
 *   Verify token:  wartość z Ustawień CRM (Ustawienia → Facebook)
 *
 * Działanie:
 *   GET  — weryfikacja subskrypcji (hub.challenge)
 *   POST — zdarzenie leadgen: odczytujemy leadgen_id + page_id, dopasowujemy
 *          klienta po ID strony (klienci → ID strony na Facebooku), pobieramy
 *          pełne dane leada z Graph API tokenem strony i zapisujemy do CRM.
 *          Bez tokena strony zapisywany jest lead z samymi identyfikatorami.
 */

require_once __DIR__ . '/config.php';

/* ── GET: weryfikacja webhooka przez Meta ── */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $mode      = (string)($_GET['hub_mode'] ?? $_GET['hub.mode'] ?? '');
    $token     = (string)($_GET['hub_verify_token'] ?? $_GET['hub.verify_token'] ?? '');
    $challenge = (string)($_GET['hub_challenge'] ?? $_GET['hub.challenge'] ?? '');
    $expected  = setting_get('fb_verify_token');

    if ($mode === 'subscribe' && $expected !== '' && hash_equals($expected, $token)) {
        header('Content-Type: text/plain; charset=utf-8');
        echo $challenge;
        exit;
    }
    http_response_code(403);
    exit('Weryfikacja nie powiodła się.');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$body = file_get_contents('php://input') ?: '';

/* ── Opcjonalna weryfikacja podpisu (App Secret) ── */
$appSecret = setting_get('fb_app_secret');
if ($appSecret !== '') {
    $sig = (string)($_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '');
    $expected = 'sha256=' . hash_hmac('sha256', $body, $appSecret);
    if ($sig === '' || !hash_equals($expected, $sig)) {
        http_response_code(403);
        exit('Nieprawidłowy podpis.');
    }
}

$payload = json_decode($body, true);
if (!is_array($payload)) {
    http_response_code(400);
    exit;
}

/* Meta wymaga szybkiej odpowiedzi 200 — przetwarzamy i zawsze kończymy 200,
   żeby platforma nie wyłączyła subskrypcji przy pojedynczym błędzie. */
$saved = 0;

foreach (($payload['entry'] ?? []) as $entry) {
    foreach (($entry['changes'] ?? []) as $change) {
        if (($change['field'] ?? '') !== 'leadgen') {
            continue;
        }
        $value     = $change['value'] ?? [];
        $leadgenId = (string)($value['leadgen_id'] ?? '');
        $pageId    = (string)($value['page_id'] ?? ($entry['id'] ?? ''));
        $formId    = (string)($value['form_id'] ?? '');
        if ($leadgenId === '' || $pageId === '') {
            continue;
        }

        $st = db()->prepare('SELECT * FROM clients WHERE fb_page_id = ? AND active = 1');
        $st->execute([$pageId]);
        $clientRow = $st->fetch();
        if (!$clientRow) {
            continue; // strona niepodpięta pod żadnego klienta
        }

        // deduplikacja — Meta potrafi wysłać to samo zdarzenie kilka razy
        $st = db()->prepare("SELECT COUNT(*) FROM leads WHERE client_id = ? AND raw LIKE ?");
        $st->execute([(int)$clientRow['id'], '%"leadgen_id":"' . $leadgenId . '"%']);
        if ((int)$st->fetchColumn() > 0) {
            continue;
        }

        $fields = ['name' => '', 'email' => '', 'phone' => '', 'message' => ''];
        $extra  = ['leadgen_id' => $leadgenId, 'page_id' => $pageId];
        if ($formId !== '') {
            $extra['form_id'] = $formId;
        }
        $formName = '';
        $campaign = '';

        // pełne dane leada z Graph API (wymaga Page Access Token)
        if ($clientRow['fb_page_token'] !== '') {
            $leadData = fb_graph_get($leadgenId, $clientRow['fb_page_token']);
            if ($leadData !== null) {
                $flat = [];
                foreach (($leadData['field_data'] ?? []) as $fd) {
                    $key = (string)($fd['name'] ?? '');
                    $val = implode(', ', array_map('strval', $fd['values'] ?? []));
                    if ($key !== '') {
                        $flat[$key] = $val;
                    }
                }
                $fields   = map_lead_fields($flat);
                $campaign = (string)($leadData['campaign_name'] ?? ($leadData['ad_name'] ?? ''));
                foreach ($flat as $k => $v) {
                    if (!in_array($v, array_filter($fields), true)) {
                        $extra[$k] = $v;
                    }
                }
            } else {
                $extra['_info'] = 'Nie udało się pobrać danych z Graph API — sprawdź Page Access Token.';
            }
        } else {
            $extra['_info'] = 'Brak Page Access Token klienta — zapisano tylko identyfikatory leada.';
        }

        $newId = insert_lead((int)$clientRow['id'], 'facebook', $fields, $extra, $formName, $campaign);
        crm_notify_new_lead($clientRow, $fields, 'facebook', $newId);
        crm_forward_lead($clientRow, $newId, 'facebook', $fields, $extra);
        $saved++;
    }
}

json_out(['ok' => true, 'saved' => $saved]);

/** Pobiera obiekt leada z Graph API (curl z fallbackiem na file_get_contents). */
function fb_graph_get(string $leadgenId, string $pageToken): ?array
{
    $url = 'https://graph.facebook.com/v21.0/' . rawurlencode($leadgenId)
         . '?fields=field_data,created_time,campaign_name,ad_name,form_id'
         . '&access_token=' . rawurlencode($pageToken);

    $response = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $response = curl_exec($ch);
        curl_close($ch);
    }
    if ($response === false) {
        $ctx = stream_context_create(['http' => ['timeout' => 15, 'ignore_errors' => true]]);
        $response = @file_get_contents($url, false, $ctx);
    }
    if ($response === false || $response === null) {
        return null;
    }
    $json = json_decode($response, true);
    return (is_array($json) && !isset($json['error'])) ? $json : null;
}
