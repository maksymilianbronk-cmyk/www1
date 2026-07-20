<?php
/**
 * LeadFlow CRM — rdzeń aplikacji.
 * Konfiguracja, połączenie z bazą SQLite, schemat, helpery sesji/CSRF.
 */

declare(strict_types=1);

const CRM_VERSION  = '1.0.0';
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
        'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    ]);
    session_start();
}

/* ── Baza danych ── */
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dir = dirname(CRM_DB_PATH);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $pdo = new PDO('sqlite:' . CRM_DB_PATH, null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec('PRAGMA journal_mode = WAL');
        $pdo->exec('PRAGMA foreign_keys = ON');
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

function base_url(): string
{
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $host  = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $dir   = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    return ($https ? 'https://' : 'http://') . $host . $dir;
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
    return (int)db()->lastInsertId();
}
