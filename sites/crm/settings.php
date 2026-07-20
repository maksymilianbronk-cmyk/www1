<?php
/**
 * LeadFlow CRM — ustawienia super admina: integracja Meta, zmiana hasła.
 */

require_once __DIR__ . '/ui.php';

$admin = require_admin();
$pdo   = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $action = (string)($_POST['action'] ?? '');

    if ($action === 'fb') {
        $verify = trim((string)($_POST['fb_verify_token'] ?? ''));
        setting_set('fb_verify_token', $verify !== '' ? $verify : random_token(12));
        setting_set('fb_app_secret', trim((string)($_POST['fb_app_secret'] ?? '')));
        flash('ok', 'Ustawienia Facebooka zapisane.');
    }

    if ($action === 'password') {
        $current = (string)($_POST['current'] ?? '');
        $new     = (string)($_POST['new'] ?? '');
        if (!password_verify($current, $admin['password_hash'])) {
            flash('error', 'Obecne hasło jest nieprawidłowe.');
        } elseif (mb_strlen($new) < 8) {
            flash('error', 'Nowe hasło musi mieć min. 8 znaków.');
        } else {
            $pdo->prepare('UPDATE admins SET password_hash = ? WHERE id = ?')
                ->execute([password_hash($new, PASSWORD_DEFAULT), $admin['id']]);
            flash('ok', 'Hasło zmienione.');
        }
    }

    redirect('settings.php');
}

if (setting_get('fb_verify_token') === '') {
    setting_set('fb_verify_token', random_token(12));
}
$verifyToken = setting_get('fb_verify_token');
$appSecret   = setting_get('fb_app_secret');
$fbUrl       = base_url() . '/fb-webhook.php';

ui_header('Ustawienia', 'admin', $admin['name'], 'settings.php');
ui_flash();
?>
<div class="page-head"><h1>⚙️ Ustawienia</h1></div>

<section class="card">
  <h2>📘 Bezpośredni webhook Meta (Facebook Lead Ads)</h2>
  <p class="muted">
    Leady z Facebooka możesz odbierać na dwa sposoby: <strong>(A)</strong> przez Make/Zapier —
    moduł HTTP wysyła POST na webhook klienta z <code>?source=facebook</code> (zero konfiguracji tutaj),
    albo <strong>(B)</strong> bezpośrednio z Meta — skonfiguruj poniższe dane w aplikacji na
    <a href="https://developers.facebook.com" target="_blank" rel="noopener">developers.facebook.com</a>
    (Webhooks → obiekt <code>page</code> → pole <code>leadgen</code>), a przy każdym kliencie uzupełnij
    <em>ID strony na Facebooku</em> i <em>Page Access Token</em> w zakładce Klienci.
  </p>
  <div class="webhook-box">
    <div class="webhook-row">
      <span class="webhook-label">Callback URL:</span>
      <code class="webhook-url" data-copy><?= e($fbUrl) ?></code>
    </div>
    <div class="webhook-row">
      <span class="webhook-label">Verify token:</span>
      <code class="webhook-url" data-copy><?= e($verifyToken) ?></code>
    </div>
  </div>
  <form method="post" class="grid-form">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="fb">
    <label>Verify token (możesz wpisać własny)
      <input type="text" name="fb_verify_token" value="<?= e($verifyToken) ?>" maxlength="100">
    </label>
    <label>App Secret (opcjonalnie — weryfikacja podpisu X-Hub-Signature-256)
      <input type="text" name="fb_app_secret" value="<?= e($appSecret) ?>" maxlength="100" placeholder="zalecane w produkcji">
    </label>
    <div class="form-actions"><button type="submit" class="btn">💾 Zapisz</button></div>
  </form>
</section>

<section class="card">
  <h2>🔑 Zmiana hasła super admina</h2>
  <form method="post" class="grid-form">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="password">
    <label>Obecne hasło<input type="password" name="current" required></label>
    <label>Nowe hasło (min. 8 znaków)<input type="password" name="new" required minlength="8"></label>
    <div class="form-actions"><button type="submit" class="btn">Zmień hasło</button></div>
  </form>
</section>

<section class="card">
  <h2>ℹ️ Informacje</h2>
  <dl class="info-list">
    <dt>Wersja</dt><dd>LeadFlow CRM v<?= CRM_VERSION ?></dd>
    <dt>Baza danych</dt><dd>SQLite — <code>data/crm.sqlite</code> (rób kopie zapasowe tego pliku)</dd>
    <dt>Dokumentacja</dt><dd>Pełna instrukcja wdrożenia i integracji: plik <code>README.md</code> w folderze CRM</dd>
  </dl>
</section>

<?php ui_footer(); ?>
