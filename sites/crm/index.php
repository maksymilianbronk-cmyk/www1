<?php
/**
 * LeadFlow CRM — punkt wejścia: kieruje do właściwego panelu.
 */

require_once __DIR__ . '/config.php';

if (current_admin()) {
    redirect('admin.php');
}
if (current_client()) {
    redirect('panel.php');
}
redirect('login.php');
