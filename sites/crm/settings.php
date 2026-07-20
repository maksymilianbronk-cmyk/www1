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

    if ($action === 'notify') {
        $agencyEmail = trim(mb_strtolower((string)($_POST['notify_admin_email'] ?? '')));
        $mailFrom    = trim(mb_strtolower((string)($_POST['mail_from'] ?? '')));
        if ($agencyEmail !== '' && !filter_var($agencyEmail, FILTER_VALIDATE_EMAIL)) {
            flash('error', 'Nieprawidłowy e-mail powiadomień agencji.');
        } elseif ($mailFrom !== '' && !filter_var($mailFrom, FILTER_VALIDATE_EMAIL)) {
            flash('error', 'Nieprawidłowy adres nadawcy.');
        } else {
            setting_set('notify_admin_email', $agencyEmail);
            setting_set('mail_from', $mailFrom);
            flash('ok', 'Ustawienia powiadomień zapisane.');
        }
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
if (setting_get('cron_key') === '') {
    setting_set('cron_key', random_token(16));
}
if (setting_get('deploy_key') === '') {
    setting_set('deploy_key', random_token(20));
}
$deployUrl = base_url() . '/deploy.php';
$verifyToken = setting_get('fb_verify_token');
$appSecret   = setting_get('fb_app_secret');
$fbUrl       = base_url() . '/fb-webhook.php';
$cronUrl     = base_url() . '/cron.php?key=' . setting_get('cron_key');

ui_header('Ustawienia', 'admin', $admin['name'], 'settings.php');
ui_flash();
?>
<div class="page-head"><h1><?= svg_icon('gear', 22) ?> Ustawienia</h1></div>

<section class="card">
  <h2><?= svg_icon('facebook', 18) ?> Bezpośredni webhook Meta (Facebook Lead Ads)</h2>
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
    <div class="form-actions"><button type="submit" class="btn"><?= svg_icon('check', 14) ?> Zapisz</button></div>
  </form>
</section>

<section class="card">
  <h2><?= svg_icon('clock', 18) ?> Cron — statystyki reklam i kopie zapasowe</h2>
  <p class="muted">
    Leady wpadają na żywo bez crona. Cron dokłada: pobieranie <strong>kampanii
    reklamowych klientów z Meta Marketing API</strong> (zakładka „Reklamy” i koszt leada
    w statystykach), <strong>codzienną kopię zapasową bazy</strong> (rotacja 14 kopii
    w <code>data/backups/</code>) i sprzątanie. W panelu hostingu ustaw wywołanie
    poniższego adresu <strong>co godzinę</strong> (lub co 15 minut):
  </p>
  <div class="webhook-box">
    <div class="webhook-row">
      <span class="webhook-label">Adres crona:</span>
      <code class="webhook-url" data-copy><?= e($cronUrl) ?></code>
    </div>
    <div class="webhook-hint">
      Typowa komenda w panelu hostingu: <code>wget -q -O /dev/null "<?= e($cronUrl) ?>"</code>
      albo <code>curl -s "<?= e($cronUrl) ?>" &gt;/dev/null</code>
    </div>
  </div>
  <dl class="info-list">
    <dt>Ostatnie uruchomienie crona</dt><dd><?= e(setting_get('cron_last_run') ?: 'jeszcze nie uruchomiony') ?></dd>
    <dt>Ostatnia synchronizacja reklam</dt><dd><?= e(setting_get('ads_last_sync') ?: '— (uzupełnij ID kont reklamowych w zakładce Klienci)') ?></dd>
  </dl>
</section>

<section class="card">
  <h2><?= svg_icon('rocket', 18) ?> Przebudowa systemu przez MCP / Claude (deploy)</h2>
  <p class="muted">
    System można zdalnie przebudować — podmienić <strong>wszystkie pliki aplikacji</strong>
    jedną komendą (np. z sesji Claude przez MCP), <strong>bez utraty danych</strong>:
    folder <code>data/</code> (baza, kopie) jest nietykalny, deploy niczego nie kasuje,
    a przed podmianą powstaje kopia plików (rotacja 5) i bazy. Rollback jedną komendą.
  </p>
  <div class="webhook-box">
    <div class="webhook-row">
      <span class="webhook-label">Klucz wdrożeniowy:</span>
      <code class="webhook-url" data-copy><?= e(setting_get('deploy_key')) ?></code>
    </div>
    <div class="webhook-hint">
      Wgranie nowej wersji:<br>
      <code>curl -X POST -H "X-Deploy-Key: <?= e(setting_get('deploy_key')) ?>" -F "package=@leadflow-crm.zip" "<?= e($deployUrl) ?>"</code><br>
      Status: <code>curl "<?= e($deployUrl) ?>?key=<?= e(setting_get('deploy_key')) ?>"</code> ·
      Rollback: <code>curl -X POST "<?= e($deployUrl) ?>?action=rollback&amp;key=<?= e(setting_get('deploy_key')) ?>"</code>
    </div>
  </div>
  <dl class="info-list">
    <dt>Ostatni deploy</dt><dd><?= e(setting_get('deployed_at') ?: 'jeszcze nie wykonano') ?></dd>
  </dl>
</section>

<section class="card">
  <h2><?= svg_icon('mail', 18) ?> Powiadomienia e-mail o nowych leadach</h2>
  <p class="muted">
    Powiadomienie wysyłane jest natychmiast po odebraniu leada przez webhook —
    do agencji (adres poniżej) oraz do klienta, jeśli w zakładce Klienci
    ustawisz jego „e-mail do powiadomień”. Wysyłka przez funkcję
    <code>mail()</code> hostingu.
  </p>
  <form method="post" class="grid-form">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="notify">
    <label>E-mail agencji — powiadomienia o KAŻDYM leadzie (puste = wyłączone)
      <input type="email" name="notify_admin_email" value="<?= e(setting_get('notify_admin_email')) ?>" maxlength="200" placeholder="ty@twojaagencja.pl">
    </label>
    <label>Adres nadawcy wiadomości (puste = crm@twojadomena)
      <input type="email" name="mail_from" value="<?= e(setting_get('mail_from')) ?>" maxlength="200" placeholder="crm@twojadomena.pl">
    </label>
    <div class="form-actions"><button type="submit" class="btn"><?= svg_icon('check', 14) ?> Zapisz</button></div>
  </form>
</section>

<section class="card">
  <h2><?= svg_icon('key', 18) ?> Zmiana hasła super admina</h2>
  <form method="post" class="grid-form">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="password">
    <label>Obecne hasło<input type="password" name="current" required></label>
    <label>Nowe hasło (min. 8 znaków)<input type="password" name="new" required minlength="8"></label>
    <div class="form-actions"><button type="submit" class="btn">Zmień hasło</button></div>
  </form>
</section>

<section class="card">
  <h2><?= svg_icon('activity', 18) ?> Diagnostyka serwera</h2>
  <?php
  $checks = [
      'PHP ' . PHP_VERSION . ' (wymagane 8.1+)' => version_compare(PHP_VERSION, '8.1.0', '>='),
      'Rozszerzenie pdo_sqlite (baza danych)'   => extension_loaded('pdo_sqlite'),
      'curl lub allow_url_fopen (Graph API)'    => extension_loaded('curl') || (bool)ini_get('allow_url_fopen'),
      'Zapis w folderze data/'                  => is_writable(__DIR__ . '/data'),
      'Funkcja mail() (powiadomienia)'          => function_exists('mail'),
      'Rozszerzenie zip (deploy przez MCP)'     => class_exists('ZipArchive'),
      'Połączenie HTTPS (wymagane przez Meta)'  => is_https(),
  ];
  ?>
  <dl class="info-list">
    <?php foreach ($checks as $label => $ok): ?>
      <dt><?= $ok ? '<span class="check-ok">' . svg_icon('check', 15) . '</span>' : '<span class="check-bad">' . svg_icon('x', 15) . '</span>' ?></dt>
      <dd><?= e($label) ?></dd>
    <?php endforeach; ?>
  </dl>
</section>

<section class="card">
  <h2><?= svg_icon('info', 18) ?> Informacje</h2>
  <dl class="info-list">
    <dt>Wersja</dt><dd>LeadFlow CRM v<?= CRM_VERSION ?></dd>
    <dt>Baza danych</dt><dd>SQLite — <code>data/crm.sqlite</code> (rób kopie zapasowe tego pliku)</dd>
    <dt>Dokumentacja</dt><dd>Pełna instrukcja wdrożenia i integracji: plik <code>README.md</code> w folderze CRM</dd>
  </dl>
</section>

<?php ui_footer(); ?>
