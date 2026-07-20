<?php
/**
 * LeadFlow CRM — zdalna przebudowa systemu (deploy przez MCP / Claude / CI).
 *
 * Pozwala podmienić WSZYSTKIE pliki aplikacji jedną komendą, bez FTP:
 *
 *   curl -X POST -H "X-Deploy-Key: KLUCZ" \
 *        -F "package=@leadflow-crm.zip" https://twojadomena.pl/crm/deploy.php
 *
 * Gwarancje bezpieczeństwa danych:
 *   • folder data/ (baza SQLite, kopie zapasowe) jest NIETYKALNY — wpisy
 *     paczki wskazujące na data/ są pomijane, nic nie jest z niego usuwane;
 *   • deploy niczego nie kasuje — tylko nadpisuje pliki z paczki
 *     (stare pliki nieobecne w paczce zostają);
 *   • przed podmianą powstaje pełna kopia plików aplikacji w
 *     data/releases/<znacznik>/ (rotacja 5), a bazy — w data/backups/;
 *   • rollback: POST ?action=rollback przywraca ostatnią kopię plików.
 *
 * GET  deploy.php?key=…                 → status: wersja, ostatni deploy, kopie
 * POST deploy.php (pakiet ZIP)          → podmiana plików
 * POST deploy.php?action=rollback&key=… → przywrócenie ostatniej kopii
 */

require_once __DIR__ . '/config.php';

$key = (string)($_SERVER['HTTP_X_DEPLOY_KEY'] ?? $_GET['key'] ?? $_POST['key'] ?? '');
$expected = setting_get('deploy_key');
if ($expected === '' || !hash_equals($expected, $key)) {
    json_out(['ok' => false, 'error' => 'Nieprawidłowy klucz wdrożeniowy.'], 403);
}

$releasesDir = __DIR__ . '/data/releases';

function deploy_app_files(): array
{
    $files = [];
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator(__DIR__, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($it as $f) {
        $rel = str_replace('\\', '/', substr($f->getPathname(), strlen(__DIR__) + 1));
        if (str_starts_with($rel, 'data/')) {
            continue; // dane użytkownika — nie należą do aplikacji
        }
        $files[] = $rel;
    }
    sort($files);
    return $files;
}

/* ── Status ── */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $releases = is_dir($releasesDir) ? array_values(array_diff(scandir($releasesDir), ['.', '..', '.htaccess'])) : [];
    rsort($releases);
    json_out([
        'ok'          => true,
        'version'     => CRM_VERSION,
        'deployed_at' => setting_get('deployed_at') ?: null,
        'app_files'   => count(deploy_app_files()),
        'releases'    => $releases,
        'db_intact'   => file_exists(CRM_DB_PATH),
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['ok' => false, 'error' => 'method'], 405);
}
set_time_limit(120);

if (!is_dir($releasesDir)) {
    @mkdir($releasesDir, 0775, true);
    @file_put_contents($releasesDir . '/.htaccess', "Require all denied\n");
}

/** Kopia wszystkich plików aplikacji do data/releases/<stamp>/ (rotacja 5). */
function deploy_snapshot(string $releasesDir): string
{
    $stamp = date('Y-m-d_His');
    $dir = $releasesDir . '/' . $stamp;
    mkdir($dir, 0775, true);
    foreach (deploy_app_files() as $rel) {
        $dst = $dir . '/' . $rel;
        if (!is_dir(dirname($dst))) {
            mkdir(dirname($dst), 0775, true);
        }
        copy(__DIR__ . '/' . $rel, $dst);
    }
    $all = array_values(array_diff(scandir($releasesDir), ['.', '..', '.htaccess']));
    sort($all);
    foreach (array_slice($all, 0, max(0, count($all) - 5)) as $old) {
        deploy_rmdir($releasesDir . '/' . $old);
    }
    return $stamp;
}

function deploy_rmdir(string $dir): void
{
    if (!is_dir($dir)) {
        return;
    }
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($it as $f) {
        $f->isDir() ? rmdir($f->getPathname()) : unlink($f->getPathname());
    }
    rmdir($dir);
}

/* ── Rollback ── */
if (($_GET['action'] ?? '') === 'rollback') {
    $releases = is_dir($releasesDir) ? array_values(array_diff(scandir($releasesDir), ['.', '..', '.htaccess'])) : [];
    rsort($releases);
    if (!$releases) {
        json_out(['ok' => false, 'error' => 'Brak zapisanych wydań do przywrócenia.'], 404);
    }
    $src = $releasesDir . '/' . $releases[0];
    $restored = 0;
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($src, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($it as $f) {
        $rel = str_replace('\\', '/', substr($f->getPathname(), strlen($src) + 1));
        $dst = __DIR__ . '/' . $rel;
        if (!is_dir(dirname($dst))) {
            mkdir(dirname($dst), 0775, true);
        }
        copy($f->getPathname(), $dst);
        $restored++;
    }
    setting_set('deployed_at', date('Y-m-d H:i:s') . ' (rollback ' . $releases[0] . ')');
    bump_rev();
    json_out(['ok' => true, 'rollback' => $releases[0], 'restored' => $restored]);
}

/* ── Deploy paczki ZIP ── */
if (!class_exists('ZipArchive')) {
    json_out(['ok' => false, 'error' => 'Hosting nie ma rozszerzenia zip (ZipArchive).'], 500);
}

$tmpZip = __DIR__ . '/data/deploy-tmp.zip';
if (!empty($_FILES['package']['tmp_name'])) {
    move_uploaded_file($_FILES['package']['tmp_name'], $tmpZip);
} else {
    $raw = file_get_contents('php://input') ?: '';
    if (strlen($raw) < 100) {
        json_out(['ok' => false, 'error' => 'Prześlij paczkę: -F "package=@plik.zip" albo surowe body ZIP.'], 400);
    }
    file_put_contents($tmpZip, $raw);
}

$zip = new ZipArchive();
if ($zip->open($tmpZip) !== true) {
    @unlink($tmpZip);
    json_out(['ok' => false, 'error' => 'Nie udało się otworzyć paczki ZIP.'], 400);
}

/* wykryj wspólny folder nadrzędny (np. leadflow-crm/) i zdejmij go */
$prefix = null;
for ($i = 0; $i < $zip->numFiles; $i++) {
    $n = str_replace('\\', '/', (string)$zip->getNameIndex($i));
    if ($n === '' || str_ends_with($n, '/')) {
        continue;
    }
    $top = str_contains($n, '/') ? explode('/', $n)[0] . '/' : '';
    $prefix = $prefix === null ? $top : (str_starts_with($n, (string)$prefix) ? $prefix : '');
}
$prefix = (string)$prefix;

/* walidacja wpisów przed jakąkolwiek zmianą */
$entries = [];
for ($i = 0; $i < $zip->numFiles; $i++) {
    $name = str_replace('\\', '/', (string)$zip->getNameIndex($i));
    if ($name === '' || str_ends_with($name, '/')) {
        continue;
    }
    $rel = $prefix !== '' && str_starts_with($name, $prefix) ? substr($name, strlen($prefix)) : $name;
    if ($rel === '' ) {
        continue;
    }
    if (str_contains($rel, '..') || str_starts_with($rel, '/') || str_contains($rel, "\0")) {
        $zip->close();
        @unlink($tmpZip);
        json_out(['ok' => false, 'error' => 'Odrzucono podejrzaną ścieżkę w paczce: ' . $rel], 400);
    }
    $entries[$i] = $rel;
}
if (!$entries) {
    $zip->close();
    @unlink($tmpZip);
    json_out(['ok' => false, 'error' => 'Paczka nie zawiera plików.'], 400);
}

/* kopia bezpieczeństwa plików i bazy PRZED podmianą */
$snapshot = deploy_snapshot($releasesDir);
if (file_exists(CRM_DB_PATH)) {
    $bdir = __DIR__ . '/data/backups';
    if (!is_dir($bdir)) {
        @mkdir($bdir, 0775, true);
        @file_put_contents($bdir . '/.htaccess', "Require all denied\n");
    }
    @copy(CRM_DB_PATH, $bdir . '/przed-deployem-' . date('Y-m-d_His') . '.sqlite');
}

/* podmiana plików: data/ pomijane, nic nie jest usuwane */
$replaced = [];
$skipped  = [];
foreach ($entries as $i => $rel) {
    if (str_starts_with($rel, 'data/')) {
        $skipped[] = $rel;
        continue;
    }
    $content = $zip->getFromIndex($i);
    if ($content === false) {
        $skipped[] = $rel . ' (błąd odczytu)';
        continue;
    }
    $dst = __DIR__ . '/' . $rel;
    if (!is_dir(dirname($dst))) {
        mkdir(dirname($dst), 0775, true);
    }
    file_put_contents($dst, $content);
    $replaced[] = $rel;
}
$zip->close();
@unlink($tmpZip);

setting_set('deployed_at', date('Y-m-d H:i:s'));
bump_rev(); // otwarte panele dociągną świeży stan

json_out([
    'ok'        => true,
    'replaced'  => count($replaced),
    'files'     => $replaced,
    'skipped'   => $skipped,
    'snapshot'  => $snapshot,
    'data_safe' => true,
    'hint'      => 'Rollback: POST deploy.php?action=rollback&key=…',
]);
