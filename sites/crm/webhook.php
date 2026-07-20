<?php
/**
 * LeadFlow CRM — uniwersalny webhook przyjmujący leady.
 *
 * Adres:  POST /webhook.php?token=<token-klienta>[&source=www|facebook|inne]
 * Token można też przekazać w nagłówku X-Api-Token albo w polu "token" danych.
 *
 * Akceptuje:
 *   - application/json                 → {"name":"…","email":"…","phone":"…","message":"…"}
 *   - application/x-www-form-urlencoded / multipart (zwykłe formularze HTML)
 * Rozpoznaje aliasy pól PL/EN (imie, telefon, wiadomosc, your-name itd.) —
 * wszystkie pozostałe pola trafiają do szczegółów leada (kolumna raw).
 *
 * Odpowiedź: JSON {"ok":true,"lead_id":N}
 */

require_once __DIR__ . '/config.php';

// CORS — formularze klientów wysyłają z innych domen (fetch/XHR)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Api-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out([
        'ok'    => false,
        'error' => 'Użyj metody POST.',
        'usage' => 'POST ' . base_url() . '/webhook.php?token=TOKEN_KLIENTA (JSON lub pola formularza)',
    ], 405);
}

/* ── Dane wejściowe ── */
$rawBody = file_get_contents('php://input') ?: '';
if (strlen($rawBody) > 256 * 1024) {
    json_out(['ok' => false, 'error' => 'Zbyt duże żądanie.'], 413);
}

$data = [];
$contentType = (string)($_SERVER['CONTENT_TYPE'] ?? '');
if (stripos($contentType, 'application/json') !== false) {
    $data = json_decode($rawBody, true);
    if (!is_array($data)) {
        json_out(['ok' => false, 'error' => 'Nieprawidłowy JSON.'], 400);
    }
} elseif ($_POST) {
    $data = $_POST;
} elseif ($rawBody !== '') {
    // fallback: body bez nagłówka JSON albo query-string
    $data = json_decode($rawBody, true);
    if (!is_array($data)) {
        parse_str($rawBody, $data);
    }
}

if (!$data) {
    json_out(['ok' => false, 'error' => 'Brak danych leada.'], 400);
}

/* ── Autoryzacja tokenem klienta ── */
$token = (string)($_GET['token'] ?? $_SERVER['HTTP_X_API_TOKEN'] ?? $data['token'] ?? '');
unset($data['token']);

if ($token === '') {
    json_out(['ok' => false, 'error' => 'Brak tokena. Dodaj ?token=… do adresu webhooka.'], 401);
}

$st = db()->prepare('SELECT * FROM clients WHERE token = ? AND active = 1');
$st->execute([$token]);
$clientRow = $st->fetch();

if (!$clientRow || !hash_equals($clientRow['token'], $token)) {
    json_out(['ok' => false, 'error' => 'Nieprawidłowy token.'], 403);
}

/* ── Zapis leada ── */
// honeypot antyspamowy: ukryte pole wypełniają tylko boty —
// odpowiadamy sukcesem, ale zgłoszenia nie zapisujemy
foreach (['_gotcha', '_honey', '_honeypot'] as $trap) {
    if (!empty($data[$trap])) {
        json_out(['ok' => true, 'lead_id' => 0]);
    }
    unset($data[$trap]);
}

$source = (string)($_GET['source'] ?? $data['source'] ?? 'www');
if (!isset(CRM_SOURCES[$source])) {
    $source = 'inne';
}
unset($data['source']);

$formName = (string)($data['form_name'] ?? $data['form'] ?? $data['formularz'] ?? '');
$campaign = (string)($data['campaign'] ?? $data['campaign_name'] ?? $data['kampania'] ?? $data['ad_name'] ?? '');
unset($data['form_name'], $data['form'], $data['formularz']);

$fields = map_lead_fields($data);

// do raw trafiają pola, których nie zmapowaliśmy na dedykowane kolumny
$mapped = array_filter($fields);
$extra  = [];
foreach ($data as $k => $v) {
    $vs = is_array($v) ? implode(', ', array_map('strval', $v)) : trim((string)$v);
    if ($vs === '' || in_array($vs, $mapped, true)) {
        continue;
    }
    $extra[(string)$k] = $vs;
}

if (!array_filter($fields) && !$extra) {
    json_out(['ok' => false, 'error' => 'Puste zgłoszenie — brak rozpoznawalnych pól.'], 400);
}

// podwójne wysłanie tego samego formularza w ciągu minuty → zwracamy istniejący lead
$dupId = find_recent_duplicate((int)$clientRow['id'], $fields, $extra);
if ($dupId !== null) {
    json_out(['ok' => true, 'lead_id' => $dupId, 'duplicate' => true]);
}

$leadId = insert_lead((int)$clientRow['id'], $source, $fields, $extra, $formName, $campaign);
crm_notify_new_lead($clientRow, $fields, $source, $leadId);

json_out(['ok' => true, 'lead_id' => $leadId]);
