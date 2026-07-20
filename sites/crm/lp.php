<?php
/**
 * REAKTOR Landing Kreator — publiczny adres landinga: lp.php?s=<slug>
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/landing.php';

$slug = (string)($_GET['s'] ?? '');
$st = db()->prepare('SELECT * FROM landings WHERE slug = ? AND published = 1');
$st->execute([$slug]);
$row = $st->fetch();

if (!$row) {
    http_response_code(404);
    exit('Nie znaleziono strony.');
}

$spec = json_decode((string)$row['spec'], true) ?: [];
header('Content-Type: text/html; charset=utf-8');
echo landing_render($spec, base_url() . '/webhook.php');
