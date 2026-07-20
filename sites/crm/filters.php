<?php
/**
 * LeadFlow CRM — wspólna logika filtrowania listy leadów (panel admina i klienta).
 * Zwraca [where[], params[], queryString] na podstawie parametrów GET.
 */

require_once __DIR__ . '/config.php';

/**
 * @param int|null $forceClientId ograniczenie do jednego klienta (panel klienta)
 */
function build_lead_filters(?int $forceClientId = null): array
{
    $where  = [];
    $params = [];
    $query  = '';

    if ($forceClientId !== null) {
        $where[]  = 'client_id = ?';
        $params[] = $forceClientId;
    } elseif (!empty($_GET['client'])) {
        $where[]  = 'client_id = ?';
        $params[] = (int)$_GET['client'];
        $query   .= 'client=' . (int)$_GET['client'] . '&';
    }

    if (!empty($_GET['status']) && isset(CRM_STATUSES[$_GET['status']])) {
        $where[]  = 'status = ?';
        $params[] = $_GET['status'];
        $query   .= 'status=' . urlencode($_GET['status']) . '&';
    }

    if (!empty($_GET['source']) && isset(CRM_SOURCES[$_GET['source']])) {
        $where[]  = 'source = ?';
        $params[] = $_GET['source'];
        $query   .= 'source=' . urlencode($_GET['source']) . '&';
    }

    if (!empty($_GET['q'])) {
        $q = '%' . trim((string)$_GET['q']) . '%';
        $where[]  = '(name LIKE ? OR email LIKE ? OR phone LIKE ? OR message LIKE ? OR raw LIKE ?)';
        array_push($params, $q, $q, $q, $q, $q);
        $query   .= 'q=' . urlencode(trim((string)$_GET['q'])) . '&';
    }

    if (!empty($_GET['od'])) {
        $where[]  = 'date(created_at) >= ?';
        $params[] = $_GET['od'];
        $query   .= 'od=' . urlencode($_GET['od']) . '&';
    }

    if (!empty($_GET['do'])) {
        $where[]  = 'date(created_at) <= ?';
        $params[] = $_GET['do'];
        $query   .= 'do=' . urlencode($_GET['do']) . '&';
    }

    return [$where, $params, $query];
}

/** Formularz filtrów. $clients — lista klientów (tylko panel admina). */
function ui_filter_form(array $clients = []): void
{
    echo '<form method="get" class="filters">';

    if ($clients) {
        echo '<select name="client"><option value="">Wszyscy klienci</option>';
        foreach ($clients as $c) {
            $sel = (string)($_GET['client'] ?? '') === (string)$c['id'] ? ' selected' : '';
            echo '<option value="' . (int)$c['id'] . '"' . $sel . '>' . e($c['name']) . '</option>';
        }
        echo '</select>';
    }

    echo '<select name="status"><option value="">Każdy status</option>';
    foreach (CRM_STATUSES as $key => $label) {
        $sel = ($_GET['status'] ?? '') === $key ? ' selected' : '';
        echo '<option value="' . e($key) . '"' . $sel . '>' . e($label) . '</option>';
    }
    echo '</select>';

    echo '<select name="source"><option value="">Każde źródło</option>';
    foreach (CRM_SOURCES as $key => [$label]) {
        $sel = ($_GET['source'] ?? '') === $key ? ' selected' : '';
        echo '<option value="' . e($key) . '"' . $sel . '>' . e($label) . '</option>';
    }
    echo '</select>';

    echo '<input type="date" name="od" value="' . e((string)($_GET['od'] ?? '')) . '" title="Data od">';
    echo '<input type="date" name="do" value="' . e((string)($_GET['do'] ?? '')) . '" title="Data do">';
    echo '<input type="search" name="q" value="' . e((string)($_GET['q'] ?? '')) . '" placeholder="Szukaj: imię, e-mail, telefon…">';
    echo '<button type="submit" class="btn btn-sm">Filtruj</button> ';
    echo '<a class="btn btn-sm btn-ghost" href="' . e(strtok((string)$_SERVER['REQUEST_URI'], '?') ?: '?') . '">Wyczyść</a>';
    echo '</form>';
}
