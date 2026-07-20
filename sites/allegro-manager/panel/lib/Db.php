<?php
/**
 * Db — magazyn danych panelu oparty o SQLite (PDO).
 *
 * Tabele:
 *   kv        — konfiguracja, tokeny OAuth, licznik prób logowania (klucz→JSON)
 *   suppliers — hurtownie XML
 *   products  — zaimportowane produkty (upsert po stabilnym UID: SKU/EAN/nazwa)
 *   offers    — rejestr ofert wystawionych na Allegro (do synchronizacji)
 *   logs      — dziennik zdarzeń
 *
 * Plik bazy: data/allegro.sqlite (katalog odcięty .htaccess).
 */
class Db
{
    /** @var PDO */
    public $pdo;
    private $dir;

    public function __construct(string $dataDir)
    {
        $this->dir = rtrim($dataDir, '/');
        if (!is_dir($this->dir)) {
            mkdir($this->dir, 0770, true);
        }
        // zapasowa blokada dostępu, gdyby .htaccess nie trafił na serwer
        $ht = $this->dir . '/.htaccess';
        if (!file_exists($ht)) {
            @file_put_contents($ht, "Require all denied\n");
        }

        $this->pdo = new PDO('sqlite:' . $this->dir . '/allegro.sqlite', null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT            => 15,
        ]);
        $this->pdo->exec('PRAGMA journal_mode = WAL');
        $this->pdo->exec('PRAGMA busy_timeout = 15000');
        $this->pdo->exec('PRAGMA foreign_keys = ON');
        $this->migrate();
        @chmod($this->dir . '/allegro.sqlite', 0660);
    }

    private function migrate(): void
    {
        $this->pdo->exec('
            CREATE TABLE IF NOT EXISTS kv (
                k TEXT PRIMARY KEY,
                v TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS suppliers (
                id           TEXT PRIMARY KEY,
                name         TEXT NOT NULL,
                url          TEXT NOT NULL,
                login        TEXT NOT NULL DEFAULT "",
                password     TEXT NOT NULL DEFAULT "",
                markup       REAL NOT NULL DEFAULT 20,
                mapping      TEXT,
                product_node TEXT,
                last_fetch   TEXT,
                last_count   INTEGER,
                last_format  TEXT,
                created_at   TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS products (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
                uid         TEXT NOT NULL,
                pos         INTEGER NOT NULL DEFAULT 0,
                name        TEXT NOT NULL,
                ean         TEXT NOT NULL DEFAULT "",
                sku         TEXT NOT NULL DEFAULT "",
                price_gross REAL,
                price_net   REAL,
                vat         REAL,
                stock       INTEGER,
                category    TEXT NOT NULL DEFAULT "",
                producer    TEXT NOT NULL DEFAULT "",
                description TEXT NOT NULL DEFAULT "",
                unit        TEXT NOT NULL DEFAULT "",
                url         TEXT NOT NULL DEFAULT "",
                images      TEXT NOT NULL DEFAULT "[]",
                stale       INTEGER NOT NULL DEFAULT 0,
                updated_at  TEXT NOT NULL,
                UNIQUE (supplier_id, uid)
            );
            CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id, pos);
            CREATE INDEX IF NOT EXISTS idx_products_ean      ON products(supplier_id, ean);
            CREATE TABLE IF NOT EXISTS offers (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                supplier_id      TEXT NOT NULL,
                product_uid      TEXT NOT NULL,
                allegro_offer_id TEXT NOT NULL UNIQUE,
                name             TEXT NOT NULL DEFAULT "",
                price            REAL,
                qty              INTEGER,
                status           TEXT NOT NULL DEFAULT "",
                created_at       TEXT NOT NULL,
                updated_at       TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_offers_product ON offers(supplier_id, product_uid);
            CREATE TABLE IF NOT EXISTS logs (
                id    INTEGER PRIMARY KEY AUTOINCREMENT,
                ts    TEXT NOT NULL,
                level TEXT NOT NULL,
                msg   TEXT NOT NULL,
                ctx   TEXT NOT NULL DEFAULT "{}"
            );
        ');
        $this->importLegacyJson();
    }

    /** Jednorazowa migracja danych z poprzedniej wersji panelu (pliki JSON). */
    private function importLegacyJson(): void
    {
        $cfgFile = $this->dir . '/config.json';
        if ($this->get('config') !== null || !file_exists($cfgFile)) {
            return;
        }
        $readJson = function (string $name) {
            $f = $this->dir . '/' . $name . '.json';
            return file_exists($f) ? json_decode((string)file_get_contents($f), true) : null;
        };
        $cfg = $readJson('config');
        if (is_array($cfg)) {
            $this->set('config', $cfg);
        }
        $tokens = $readJson('tokens');
        if (is_array($tokens)) {
            $this->set('tokens', $tokens);
        }
        $suppliers = $readJson('suppliers');
        if (is_array($suppliers)) {
            foreach ($suppliers as $s) {
                if (empty($s['id'])) {
                    continue;
                }
                $this->pdo->prepare('INSERT OR IGNORE INTO suppliers
                    (id, name, url, login, password, markup, mapping, last_fetch, last_count, last_format, created_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?)')
                    ->execute([
                        $s['id'], $s['name'] ?? '?', $s['url'] ?? '', $s['login'] ?? '', $s['password'] ?? '',
                        $s['markup'] ?? 20, isset($s['mapping']) && $s['mapping'] ? json_encode($s['mapping']) : null,
                        $s['last_fetch'] ?? null, $s['last_count'] ?? null, $s['last_format'] ?? null,
                        $s['created_at'] ?? date('Y-m-d H:i:s'),
                    ]);
            }
        }
        foreach (glob($this->dir . '/*.json') ?: [] as $f) {
            @rename($f, $f . '.migrated');
        }
        $this->log('info', 'Zmigrowano dane z wersji JSON do SQLite (produkty pobierz ponownie).');
    }

    // ------------------------------------------------------------- kv store

    public function get(string $key, $default = null)
    {
        $st = $this->pdo->prepare('SELECT v FROM kv WHERE k = ?');
        $st->execute([$key]);
        $row = $st->fetch();
        if ($row === false) {
            return $default;
        }
        $v = json_decode($row['v'], true);
        return $v === null && $row['v'] !== 'null' ? $default : $v;
    }

    public function set(string $key, $value): void
    {
        $this->pdo->prepare('INSERT INTO kv (k, v) VALUES (?, ?)
            ON CONFLICT(k) DO UPDATE SET v = excluded.v')
            ->execute([$key, json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
    }

    public function remove(string $key): void
    {
        $this->pdo->prepare('DELETE FROM kv WHERE k = ?')->execute([$key]);
    }

    // ---------------------------------------------------------------- logi

    public function log(string $level, string $msg, array $ctx = []): void
    {
        $this->pdo->prepare('INSERT INTO logs (ts, level, msg, ctx) VALUES (?,?,?,?)')
            ->execute([date('Y-m-d H:i:s'), $level, $msg,
                json_encode($ctx, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
        // utrzymuj maks. 1000 ostatnich wpisów
        $this->pdo->exec('DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY id DESC LIMIT 1000)');
    }

    // ------------------------------------------------------------- produkty

    /** Stabilny identyfikator produktu w obrębie hurtowni: SKU → EAN → hash nazwy. */
    public static function productUid(array $p): string
    {
        if (!empty($p['sku'])) {
            return 's:' . mb_substr($p['sku'], 0, 120);
        }
        if (!empty($p['ean'])) {
            return 'e:' . $p['ean'];
        }
        return 'n:' . md5($p['name']);
    }

    /**
     * Zapis pełnego importu hurtowni: upsert po UID, produkty nieobecne
     * w nowym pliku są usuwane. Zwraca liczbę zapisanych produktów.
     */
    public function replaceProducts(string $supplierId, array $products): int
    {
        $now = date('Y-m-d H:i:s');
        $this->pdo->beginTransaction();
        try {
            $this->pdo->prepare('UPDATE products SET stale = 1 WHERE supplier_id = ?')->execute([$supplierId]);
            $st = $this->pdo->prepare('INSERT INTO products
                (supplier_id, uid, pos, name, ean, sku, price_gross, price_net, vat, stock,
                 category, producer, description, unit, url, images, stale, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)
                ON CONFLICT(supplier_id, uid) DO UPDATE SET
                    pos = excluded.pos, name = excluded.name, ean = excluded.ean, sku = excluded.sku,
                    price_gross = excluded.price_gross, price_net = excluded.price_net, vat = excluded.vat,
                    stock = excluded.stock, category = excluded.category, producer = excluded.producer,
                    description = excluded.description, unit = excluded.unit, url = excluded.url,
                    images = excluded.images, stale = 0, updated_at = excluded.updated_at');
            foreach ($products as $i => $p) {
                $st->execute([
                    $supplierId, self::productUid($p), $i,
                    $p['name'], $p['ean'], $p['sku'],
                    $p['price_gross'], $p['price_net'], $p['vat'], $p['stock'],
                    $p['category'], $p['producer'], $p['description'], $p['unit'], $p['url'],
                    json_encode($p['images'], JSON_UNESCAPED_SLASHES),
                    $now,
                ]);
            }
            $this->pdo->prepare('DELETE FROM products WHERE supplier_id = ? AND stale = 1')->execute([$supplierId]);
            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
        return count($products);
    }

    public function tmpFile(string $prefix): string
    {
        return $this->dir . '/' . preg_replace('/[^a-zA-Z0-9_\-]/', '_', $prefix) . '.tmp';
    }
}
