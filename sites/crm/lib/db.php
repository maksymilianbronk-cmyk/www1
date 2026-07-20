<?php
/**
 * REAKTOR DB — przenośna warstwa bazy danych (biblioteka frameworku).
 *
 * Domyślnie: SQLite (zero konfiguracji, plik data/crm.sqlite).
 * Przejście na MySQL = utworzenie pliku data/config.local.php:
 *
 *   <?php
 *   return [
 *     'driver'   => 'mysql',
 *     'host'     => 'localhost',
 *     'database' => 'leadflow',
 *     'username' => 'uzytkownik',
 *     'password' => 'haslo',
 *     'charset'  => 'utf8mb4',
 *   ];
 *
 * Aplikacja pisze SQL w dialekcie SQLite; klasa ReaktorPDO tłumaczy go
 * w locie na MySQL (funkcje czasu, AUTOINCREMENT, UPSERT). Dzięki temu
 * kod aplikacji pozostaje jeden, a silnik baz danych jest wymienny.
 * Sterownik MySQL: status BETA — testuj przed produkcyjną migracją.
 */

declare(strict_types=1);

final class ReaktorPDO extends PDO
{
    private bool $mysql = false;

    public static function open(string $sqlitePath): self
    {
        $cfgFile = dirname($sqlitePath) . '/config.local.php';
        $cfg = is_file($cfgFile) ? (require $cfgFile) : [];
        $driver = is_array($cfg) ? ($cfg['driver'] ?? 'sqlite') : 'sqlite';

        if ($driver === 'mysql') {
            $dsn = sprintf(
                'mysql:host=%s;dbname=%s;charset=%s',
                $cfg['host'] ?? 'localhost',
                $cfg['database'] ?? 'leadflow',
                $cfg['charset'] ?? 'utf8mb4'
            );
            $pdo = new self($dsn, (string)($cfg['username'] ?? ''), (string)($cfg['password'] ?? ''), [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            $pdo->mysql = true;
            return $pdo;
        }

        $dir = dirname($sqlitePath);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $pdo = new self('sqlite:' . $sqlitePath, null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec('PRAGMA journal_mode = WAL');
        $pdo->exec('PRAGMA foreign_keys = ON');
        return $pdo;
    }

    public function isMysql(): bool
    {
        return $this->mysql;
    }

    /** Tłumaczy dialekt SQLite aplikacji na MySQL. */
    public function translate(string $sql): string
    {
        if (!$this->mysql) {
            return $sql;
        }
        $unit = fn(string $u): string => strtoupper(rtrim($u, 's'));

        // PRAGMA nie istnieje w MySQL
        if (str_starts_with(ltrim($sql), 'PRAGMA')) {
            return 'SELECT 1';
        }

        // datetime('now','localtime'[,'-N jednostek'])
        $sql = preg_replace_callback(
            "/datetime\\('now','localtime'(?:,'(-?\\d+) (seconds|minutes|hours|days|months)'(?:,'start of day')?)?\\)/i",
            fn($m) => isset($m[1])
                ? 'DATE_ADD(NOW(), INTERVAL ' . (int)$m[1] . ' ' . $unit($m[2]) . ')'
                : 'NOW()',
            $sql
        );
        // datetime(?, '-N jednostek')
        $sql = preg_replace_callback(
            "/datetime\\((\\?|[\\w.]+),\\s*'(-?\\d+) (seconds|minutes|hours|days|months)'\\)/i",
            fn($m) => 'DATE_ADD(' . $m[1] . ', INTERVAL ' . (int)$m[2] . ' ' . $unit($m[3]) . ')',
            $sql
        );
        // date('now','localtime') / date(kolumna)
        $sql = preg_replace("/date\\('now','localtime'\\)/i", 'CURDATE()', $sql);
        // strftime('%Y-%m', 'now', 'localtime'[, '-N months'])
        $sql = preg_replace_callback(
            "/strftime\\('([^']+)',\\s*'now',\\s*'localtime'(?:,\\s*'(-?\\d+) (months|days)')?\\)/i",
            fn($m) => isset($m[2])
                ? "DATE_FORMAT(DATE_ADD(NOW(), INTERVAL " . (int)$m[2] . ' ' . $unit($m[3]) . "), '" . $m[1] . "')"
                : "DATE_FORMAT(NOW(), '" . $m[1] . "')",
            $sql
        );
        // strftime('%Y-%m', kolumna)
        $sql = preg_replace_callback(
            "/strftime\\('([^']+)',\\s*([\\w.]+)\\)/i",
            fn($m) => "DATE_FORMAT(" . $m[2] . ", '" . $m[1] . "')",
            $sql
        );
        // DDL
        $sql = str_ireplace('INTEGER PRIMARY KEY AUTOINCREMENT', 'INT AUTO_INCREMENT PRIMARY KEY', $sql);
        $sql = preg_replace('/\bTEXT NOT NULL UNIQUE\b/i', 'VARCHAR(255) NOT NULL UNIQUE', $sql);
        $sql = preg_replace("/DEFAULT \\(datetime\\('now','localtime'\\)\\)/i", 'DEFAULT CURRENT_TIMESTAMP', $sql);
        // UPSERT: ON CONFLICT(...) DO UPDATE SET a = excluded.a → ON DUPLICATE KEY UPDATE a = VALUES(a)
        $sql = preg_replace_callback(
            '/ON CONFLICT\\([^)]*\\) DO UPDATE SET (.+)$/is',
            function ($m) {
                $set = preg_replace('/excluded\\.(\\w+)/i', 'VALUES($1)', $m[1]);
                $set = preg_replace('/CAST\\(value AS INTEGER\\)/i', 'CAST(value AS SIGNED)', $set);
                return 'ON DUPLICATE KEY UPDATE ' . $set;
            },
            $sql
        );
        return $sql;
    }

    public function exec(string $statement): int|false
    {
        return parent::exec($this->translate($statement));
    }

    public function prepare(string $query, array $options = []): PDOStatement|false
    {
        return parent::prepare($this->translate($query), $options);
    }

    public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false
    {
        return parent::query($this->translate($query), $fetchMode, ...$fetchModeArgs);
    }
}
