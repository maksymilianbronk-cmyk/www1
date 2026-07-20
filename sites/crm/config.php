<?php
/**
 * LeadFlow CRM — rdzeń aplikacji.
 * Konfiguracja, połączenie z bazą SQLite, schemat, helpery sesji/CSRF.
 */

declare(strict_types=1);

const CRM_VERSION  = '2.0.0';
const CRM_DB_PATH  = __DIR__ . '/data/crm.sqlite';
const CRM_PER_PAGE = 25;

/** Statusy leada: klucz => etykieta PL */
const CRM_STATUSES = [
    'nowy'      => 'Nowy',
    'kontakt'   => 'W kontakcie',
    'umowiony'  => 'Umówiony',
    'wygrany'   => 'Wygrany',
    'przegrany' => 'Przegrany',
];

/** Źródła leada: klucz => [etykieta, emoji] */
const CRM_SOURCES = [
    'www'      => ['Strona www', '🌐'],
    'facebook' => ['Facebook Lead Ads', '📘'],
    'inne'     => ['Inne', '📥'],
];

date_default_timezone_set('Europe/Warsaw');

/* ── Sesja ── */
function crm_session_start(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_name('leadflow_sess');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => is_https(),
    ]);
    session_start();
}

/* ── Baza danych ── */
require_once __DIR__ . '/lib/db.php';

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        // warstwa przenośna: SQLite domyślnie, MySQL po utworzeniu
        // data/config.local.php (szczegóły: lib/db.php)
        $pdo = ReaktorPDO::open(CRM_DB_PATH);
        crm_migrate($pdo);
    }
    return $pdo;
}

function crm_migrate(PDO $pdo): void
{
    $pdo->exec(<<<'SQL'
    CREATE TABLE IF NOT EXISTS admins (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
    SQL);

    $pdo->exec(<<<'SQL'
    CREATE TABLE IF NOT EXISTS clients (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        company       TEXT NOT NULL DEFAULT '',
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        token         TEXT NOT NULL UNIQUE,
        fb_page_id    TEXT NOT NULL DEFAULT '',
        fb_page_token TEXT NOT NULL DEFAULT '',
        color         TEXT NOT NULL DEFAULT '#4f7cff',
        active        INTEGER NOT NULL DEFAULT 1,
        created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
    SQL);

    $pdo->exec(<<<'SQL'
    CREATE TABLE IF NOT EXISTS leads (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        source     TEXT NOT NULL DEFAULT 'www',
        name       TEXT NOT NULL DEFAULT '',
        email      TEXT NOT NULL DEFAULT '',
        phone      TEXT NOT NULL DEFAULT '',
        message    TEXT NOT NULL DEFAULT '',
        form_name  TEXT NOT NULL DEFAULT '',
        campaign   TEXT NOT NULL DEFAULT '',
        raw        TEXT NOT NULL DEFAULT '{}',
        status     TEXT NOT NULL DEFAULT 'nowy',
        note       TEXT NOT NULL DEFAULT '',
        ip         TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
    SQL);
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_leads_client  ON leads(client_id)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at)');

    $pdo->exec(<<<'SQL'
    CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL DEFAULT ''
    )
    SQL);

    $pdo->exec(<<<'SQL'
    CREATE TABLE IF NOT EXISTS login_attempts (
        ip           TEXT NOT NULL,
        attempted_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
    SQL);
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_attempts_ip ON login_attempts(ip)');

    $pdo->exec(<<<'SQL'
    CREATE TABLE IF NOT EXISTS notes (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        author_type TEXT NOT NULL DEFAULT 'admin',
        author_name TEXT NOT NULL DEFAULT '',
        body        TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
    SQL);
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_notes_client ON notes(client_id)');

    $pdo->exec(<<<'SQL'
    CREATE TABLE IF NOT EXISTS campaigns (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id      INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        fb_campaign_id TEXT NOT NULL DEFAULT '',
        name           TEXT NOT NULL DEFAULT '',
        status         TEXT NOT NULL DEFAULT '',
        objective      TEXT NOT NULL DEFAULT '',
        month          TEXT NOT NULL DEFAULT '',
        spend          REAL NOT NULL DEFAULT 0,
        impressions    INTEGER NOT NULL DEFAULT 0,
        clicks         INTEGER NOT NULL DEFAULT 0,
        leads_count    INTEGER NOT NULL DEFAULT 0,
        currency       TEXT NOT NULL DEFAULT '',
        fetched_at     TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        UNIQUE(client_id, fb_campaign_id, month)
    )
    SQL);

    // migracje — dodawane kolumny (błąd "duplicate column" ignorujemy)
    foreach ([
        "ALTER TABLE clients ADD COLUMN notify_email TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE clients ADD COLUMN fb_ad_account_id TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE clients ADD COLUMN fb_ads_token TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE notes ADD COLUMN color TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE notes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE notes ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE clients ADD COLUMN slug TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE clients ADD COLUMN outbound_url TEXT NOT NULL DEFAULT ''",
    ] as $sql) {
        try {
            $pdo->exec($sql);
        } catch (PDOException) {
        }
    }

    // uzupełnij slugi istniejących klientów (adres ich panelu logowania)
    foreach ($pdo->query("SELECT id, name FROM clients WHERE slug = ''") as $row) {
        $pdo->prepare('UPDATE clients SET slug = ? WHERE id = ?')
            ->execute([client_slug((string)$row['name'], (int)$row['id']), (int)$row['id']]);
    }
}

/** Slug klienta do adresu jego panelu logowania (login.php?panel=slug). */
function client_slug(string $name, int $id): string
{
    $map  = ['ą'=>'a','ć'=>'c','ę'=>'e','ł'=>'l','ń'=>'n','ó'=>'o','ś'=>'s','ź'=>'z','ż'=>'z'];
    $slug = strtr(mb_strtolower(trim($name)), $map);
    $slug = trim(preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '', '-');
    return ($slug !== '' ? $slug : 'klient') . '-' . $id;
}

/**
 * Wychodzący webhook (ApixDrive / Make / Zapier / dowolny catch-hook):
 * po zapisaniu leada wysyła jego dane POST-em na adres skonfigurowany
 * u klienta (outbound_url). Krótki timeout — nie blokuje odpowiedzi.
 */
function crm_forward_lead(array $client, int $leadId, string $source, array $fields, array $extra): void
{
    $url = trim((string)($client['outbound_url'] ?? ''));
    if ($url === '' || !preg_match('~^https?://~i', $url)) {
        return;
    }
    $payload = json_encode([
        'event'     => 'lead.created',
        'lead_id'   => $leadId,
        'client'    => $client['name'],
        'source'    => $source,
        'name'      => $fields['name'] ?? '',
        'email'     => $fields['email'] ?? '',
        'phone'     => $fields['phone'] ?? '',
        'message'   => $fields['message'] ?? '',
        'extra'     => $extra,
        'created_at'=> date('c'),
    ], JSON_UNESCAPED_UNICODE);

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 5,
            CURLOPT_CONNECTTIMEOUT => 3,
        ]);
        curl_exec($ch);
        curl_close($ch);
    } else {
        @file_get_contents($url, false, stream_context_create(['http' => [
            'method' => 'POST', 'header' => "Content-Type: application/json\r\n",
            'content' => $payload, 'timeout' => 5,
        ]]));
    }
}

/* ── REAKTOR: globalny licznik rewizji stanu ── */
function state_rev(): int
{
    return (int)setting_get('state_rev', '0');
}

/** Każda mutacja danych podbija rewizję — klienci REAKTOR-a wykrywają zmianę i dociągają delty. */
function bump_rev(): void
{
    db()->prepare("INSERT INTO settings(key,value) VALUES('state_rev','1')
                   ON CONFLICT(key) DO UPDATE SET value = CAST(value AS INTEGER) + 1")
        ->execute();
}

/* ── Ustawienia ── */
function setting_get(string $key, string $default = ''): string
{
    $st = db()->prepare('SELECT value FROM settings WHERE key = ?');
    $st->execute([$key]);
    $v = $st->fetchColumn();
    return $v === false ? $default : (string)$v;
}

function setting_set(string $key, string $value): void
{
    db()->prepare('INSERT INTO settings(key,value) VALUES(?,?)
                   ON CONFLICT(key) DO UPDATE SET value = excluded.value')
        ->execute([$key, $value]);
}

/* ── Helpery ── */
function e(?string $s): string
{
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

function random_token(int $bytes = 20): string
{
    return bin2hex(random_bytes($bytes));
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'); // za proxy/CDN
}

function base_url(): string
{
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $dir  = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    return (is_https() ? 'https://' : 'http://') . $host . $dir;
}

function redirect(string $to): never
{
    header('Location: ' . $to);
    exit;
}

function json_out(array $data, int $code = 200): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/* ── CSRF ── */
function csrf_token(): string
{
    crm_session_start();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = random_token(16);
    }
    return $_SESSION['csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
}

function csrf_check(): void
{
    crm_session_start();
    $ok = isset($_POST['csrf'], $_SESSION['csrf'])
        && hash_equals($_SESSION['csrf'], (string)$_POST['csrf']);
    if (!$ok) {
        http_response_code(400);
        exit('Błąd CSRF — odśwież stronę i spróbuj ponownie.');
    }
}

/* ── Autoryzacja ── */
function current_admin(): ?array
{
    crm_session_start();
    if (empty($_SESSION['admin_id'])) {
        return null;
    }
    $st = db()->prepare('SELECT * FROM admins WHERE id = ?');
    $st->execute([$_SESSION['admin_id']]);
    return $st->fetch() ?: null;
}

function current_client(): ?array
{
    crm_session_start();
    if (empty($_SESSION['client_id'])) {
        return null;
    }
    $st = db()->prepare('SELECT * FROM clients WHERE id = ? AND active = 1');
    $st->execute([$_SESSION['client_id']]);
    return $st->fetch() ?: null;
}

function require_admin(): array
{
    $a = current_admin();
    if (!$a) {
        redirect('login.php');
    }
    return $a;
}

function require_client(): array
{
    $c = current_client();
    if (!$c) {
        redirect('login.php');
    }
    return $c;
}

/**
 * Mapuje surowe dane webhooka na pola leada.
 * Rozpoznaje popularne aliasy pól (PL/EN, formaty Meta, Elementor, WPForms, CF7).
 */
function map_lead_fields(array $data): array
{
    $aliases = [
        'name'    => ['name', 'full_name', 'fullname', 'imie', 'imię', 'imie_nazwisko',
                      'imie i nazwisko', 'imię i nazwisko', 'first_name', 'your-name',
                      'nazwisko', 'last_name'],
        'email'   => ['email', 'e-mail', 'mail', 'adres_email', 'adres e-mail',
                      'your-email', 'email_address'],
        'phone'   => ['phone', 'phone_number', 'telefon', 'tel', 'numer_telefonu',
                      'numer telefonu', 'your-phone', 'mobile'],
        'message' => ['message', 'wiadomosc', 'wiadomość', 'tresc', 'treść', 'opis',
                      'your-message', 'comments', 'uwagi', 'pytanie'],
    ];

    // klucze danych znormalizowane do lowercase
    $norm = [];
    foreach ($data as $k => $v) {
        if (is_array($v)) {
            $v = implode(', ', array_map('strval', $v));
        }
        $norm[mb_strtolower(trim((string)$k))] = trim((string)$v);
    }

    $out = ['name' => '', 'email' => '', 'phone' => '', 'message' => ''];
    foreach ($aliases as $field => $keys) {
        foreach ($keys as $key) {
            if (isset($norm[$key]) && $norm[$key] !== '') {
                // first_name + last_name sklejamy w jedno pole name
                if ($field === 'name' && $out['name'] !== '' && !str_contains($out['name'], $norm[$key])) {
                    $out['name'] .= ' ' . $norm[$key];
                } elseif ($out[$field] === '') {
                    $out[$field] = $norm[$key];
                }
            }
        }
    }
    return $out;
}

/* ── Ochrona logowania przed brute-force ── */
function login_blocked(string $ip): bool
{
    $st = db()->prepare("SELECT COUNT(*) FROM login_attempts
                         WHERE ip = ? AND attempted_at >= datetime('now','localtime','-15 minutes')");
    $st->execute([$ip]);
    return (int)$st->fetchColumn() >= 8;
}

function login_fail(string $ip): void
{
    db()->prepare('INSERT INTO login_attempts (ip) VALUES (?)')->execute([$ip]);
    db()->exec("DELETE FROM login_attempts WHERE attempted_at < datetime('now','localtime','-1 day')");
}

function login_success(string $ip): void
{
    db()->prepare('DELETE FROM login_attempts WHERE ip = ?')->execute([$ip]);
}

/* ── Powiadomienia e-mail ── */
function crm_send_mail(string $to, string $subject, string $body): bool
{
    if (!filter_var($to, FILTER_VALIDATE_EMAIL) || !function_exists('mail')) {
        return false;
    }
    $host = (string)(parse_url(base_url(), PHP_URL_HOST) ?: 'localhost');
    $from = setting_get('mail_from');
    if (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
        $from = 'crm@' . preg_replace('/^www\./', '', $host);
    }
    $headers = 'From: LeadFlow CRM <' . $from . ">\r\n"
             . "Content-Type: text/plain; charset=UTF-8\r\n"
             . "Content-Transfer-Encoding: 8bit\r\n"
             . 'X-Mailer: LeadFlow CRM ' . CRM_VERSION;
    return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);
}

/** Wysyła powiadomienia o nowym leadzie: do klienta (notify_email) i do agencji (ustawienia). */
function crm_notify_new_lead(array $client, array $fields, string $source, int $leadId): void
{
    $srcLabel = CRM_SOURCES[$source][0] ?? $source;
    $subject  = '⚡ Nowy lead' . ($fields['name'] !== '' ? ': ' . $fields['name'] : '') . ' (' . $srcLabel . ')';

    $lines = ['Nowy lead w LeadFlow CRM', ''];
    $lines[] = 'Klient:  ' . $client['name'] . ($client['company'] !== '' ? ' — ' . $client['company'] : '');
    $lines[] = 'Źródło:  ' . $srcLabel;
    if ($fields['name'] !== '')    { $lines[] = 'Osoba:   ' . $fields['name']; }
    if ($fields['phone'] !== '')   { $lines[] = 'Telefon: ' . $fields['phone']; }
    if ($fields['email'] !== '')   { $lines[] = 'E-mail:  ' . $fields['email']; }
    if ($fields['message'] !== '') { $lines[] = ''; $lines[] = 'Wiadomość:'; $lines[] = $fields['message']; }
    $lines[] = '';
    $lines[] = 'Zaloguj się do panelu: ' . base_url() . '/login.php';
    $body = implode("\n", $lines);

    if (($client['notify_email'] ?? '') !== '') {
        crm_send_mail((string)$client['notify_email'], $subject, $body);
    }
    $agencyEmail = setting_get('notify_admin_email');
    if ($agencyEmail !== '' && $agencyEmail !== ($client['notify_email'] ?? '')) {
        crm_send_mail($agencyEmail, $subject, $body);
    }
}

/**
 * Deduplikacja zgłoszeń ze stron www: identyczne dane od tego samego klienta
 * w ciągu 60 sekund (podwójne kliknięcie "Wyślij") zwracają istniejący lead.
 */
function find_recent_duplicate(int $clientId, array $fields, array $raw): ?int
{
    $st = db()->prepare("SELECT id FROM leads
                         WHERE client_id = ? AND name = ? AND email = ? AND phone = ? AND message = ? AND raw = ?
                           AND created_at >= datetime('now','localtime','-60 seconds')
                         ORDER BY id DESC LIMIT 1");
    $st->execute([
        $clientId,
        $fields['name'] ?? '', $fields['email'] ?? '', $fields['phone'] ?? '', $fields['message'] ?? '',
        json_encode($raw, JSON_UNESCAPED_UNICODE),
    ]);
    $id = $st->fetchColumn();
    return $id === false ? null : (int)$id;
}

/** Zapisuje leada do bazy i zwraca jego ID. */
function insert_lead(int $clientId, string $source, array $fields, array $raw, string $formName = '', string $campaign = ''): int
{
    $st = db()->prepare('INSERT INTO leads (client_id, source, name, email, phone, message, form_name, campaign, raw, ip)
                         VALUES (?,?,?,?,?,?,?,?,?,?)');
    $st->execute([
        $clientId,
        $source,
        mb_substr($fields['name'] ?? '', 0, 200),
        mb_substr($fields['email'] ?? '', 0, 200),
        mb_substr($fields['phone'] ?? '', 0, 50),
        mb_substr($fields['message'] ?? '', 0, 2000),
        mb_substr($formName, 0, 200),
        mb_substr($campaign, 0, 200),
        json_encode($raw, JSON_UNESCAPED_UNICODE),
        (string)($_SERVER['REMOTE_ADDR'] ?? ''),
    ]);
    $id = (int)db()->lastInsertId();
    bump_rev();
    return $id;
}

/** Pobiera JSON z Graph API (curl z fallbackiem na file_get_contents). */
function graph_get(string $path, array $params): ?array
{
    $url = 'https://graph.facebook.com/v21.0/' . $path . '?' . http_build_query($params);
    $response = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 20,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $response = curl_exec($ch);
        curl_close($ch);
    }
    if ($response === false) {
        $ctx = stream_context_create(['http' => ['timeout' => 20, 'ignore_errors' => true]]);
        $response = @file_get_contents($url, false, $ctx);
    }
    if ($response === false || $response === null) {
        return null;
    }
    $json = json_decode($response, true);
    return is_array($json) ? $json : null;
}
