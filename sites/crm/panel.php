<?php
/**
 * LeadFlow CRM — panel klienta (aplikacja REAKTOR).
 * Klient widzi wyłącznie swoje dane — zakres wymusza serwer (api.php/sync.php).
 */

require_once __DIR__ . '/ui.php';

$client = require_client();
ui_app_shell('client', (string)$client['name'], (int)$client['id']);
