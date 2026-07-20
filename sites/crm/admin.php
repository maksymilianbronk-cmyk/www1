<?php
/**
 * LeadFlow CRM — panel super admina (aplikacja REAKTOR).
 * Widoki renderuje przeglądarka (views.js); dane płyną z api.php + sync.php.
 */

require_once __DIR__ . '/ui.php';

$admin = require_admin();
ui_app_shell('admin', (string)$admin['name'], (int)$admin['id']);
