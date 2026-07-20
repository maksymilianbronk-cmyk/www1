<?php
/**
 * REAKTOR Landing Kreator — API do tworzenia landingów przez MCP.
 * Autoryzacja: klucz wdrożeniowy (X-Deploy-Key — ten sam co deploy.php).
 *
 *   GET  landing-api.php?key=…                  → lista landingów
 *   GET  landing-api.php?key=…&slug=…           → spec landinga
 *   POST landing-api.php  (JSON spec)           → utworzenie / aktualizacja
 *   POST landing-api.php?action=delete&slug=…   → usunięcie
 *
 * Spec JSON: { slug, title, description?, client_token?, theme{}, sections[] }
 * Po upsercie landing od razu żyje pod adresem lp.php?s=<slug>.
 */

require_once __DIR__ . '/config.php';

$key = (string)($_SERVER['HTTP_X_DEPLOY_KEY'] ?? $_GET['key'] ?? '');
$expected = setting_get('deploy_key');
if ($expected === '' || !hash_equals($expected, $key)) {
    json_out(['ok' => false, 'error' => 'Nieprawidłowy klucz wdrożeniowy.'], 403);
}
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!empty($_GET['slug'])) {
        $st = $pdo->prepare('SELECT * FROM landings WHERE slug = ?');
        $st->execute([(string)$_GET['slug']]);
        $row = $st->fetch();
        if (!$row) {
            json_out(['ok' => false, 'error' => 'not-found'], 404);
        }
        json_out(['ok' => true, 'landing' => [
            'slug' => $row['slug'], 'title' => $row['title'], 'published' => (int)$row['published'],
            'url' => base_url() . '/lp.php?s=' . rawurlencode($row['slug']),
            'updated_at' => $row['updated_at'], 'spec' => json_decode((string)$row['spec'], true),
        ]]);
    }
    $rows = $pdo->query('SELECT slug, title, published, updated_at FROM landings ORDER BY updated_at DESC')->fetchAll();
    foreach ($rows as &$r) {
        $r['url'] = base_url() . '/lp.php?s=' . rawurlencode($r['slug']);
        $r['published'] = (int)$r['published'];
    }
    json_out(['ok' => true, 'landings' => $rows]);
}

if (($_GET['action'] ?? '') === 'delete') {
    $slug = (string)($_GET['slug'] ?? '');
    $pdo->prepare('DELETE FROM landings WHERE slug = ?')->execute([$slug]);
    json_out(['ok' => true, 'deleted' => $slug]);
}

/* ── Upsert speca ── */
$spec = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($spec)) {
    json_out(['ok' => false, 'error' => 'Body musi być JSON-em ze specyfikacją landinga.'], 400);
}
$slug = strtolower(trim((string)($spec['slug'] ?? '')));
if (!preg_match('/^[a-z0-9][a-z0-9-]{1,80}$/', $slug)) {
    json_out(['ok' => false, 'error' => 'Pole slug: małe litery, cyfry, myślniki (2-80 znaków).'], 400);
}
if (trim((string)($spec['title'] ?? '')) === '' || empty($spec['sections']) || !is_array($spec['sections'])) {
    json_out(['ok' => false, 'error' => 'Wymagane: title oraz niepusta tablica sections.'], 400);
}
if (strlen((string)json_encode($spec)) > 256 * 1024) {
    json_out(['ok' => false, 'error' => 'Spec zbyt duży (limit 256 KB).'], 413);
}
// walidacja tokena formularza: musi należeć do aktywnego klienta
if (!empty($spec['client_token'])) {
    $st = $pdo->prepare('SELECT id FROM clients WHERE token = ? AND active = 1');
    $st->execute([(string)$spec['client_token']]);
    if (!$st->fetch()) {
        json_out(['ok' => false, 'error' => 'client_token nie pasuje do żadnego aktywnego klienta.'], 400);
    }
}

$pdo->prepare("INSERT INTO landings (slug, title, spec, published, updated_at)
               VALUES (?,?,?,1, datetime('now','localtime'))
               ON CONFLICT(slug) DO UPDATE SET
                 title = excluded.title, spec = excluded.spec,
                 published = 1, updated_at = excluded.updated_at")
    ->execute([$slug, trim((string)$spec['title']), json_encode($spec, JSON_UNESCAPED_UNICODE)]);

json_out([
    'ok'   => true,
    'slug' => $slug,
    'url'  => base_url() . '/lp.php?s=' . rawurlencode($slug),
    'hint' => 'Aktualizacja = ponowny POST tego samego sluga. Podgląd speca: GET ?slug=' . $slug,
]);
