<?php
/**
 * LeadFlow CRM — logowanie (super admin + klienci) oraz kreator pierwszego uruchomienia.
 */

require_once __DIR__ . '/ui.php';
crm_session_start();

$pdo = db();
$hasAdmin = (int)$pdo->query('SELECT COUNT(*) FROM admins')->fetchColumn() > 0;
$error = '';

/* ── Pierwsze uruchomienie: utworzenie konta super admina ── */
if (!$hasAdmin && $_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'setup') {
    csrf_check();
    $name  = trim((string)($_POST['name'] ?? ''));
    $email = trim(mb_strtolower((string)($_POST['email'] ?? '')));
    $pass  = (string)($_POST['password'] ?? '');

    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($pass) < 8) {
        $error = 'Podaj nazwę, poprawny e-mail i hasło (min. 8 znaków).';
    } else {
        $pdo->prepare('INSERT INTO admins (name, email, password_hash) VALUES (?,?,?)')
            ->execute([$name, $email, password_hash($pass, PASSWORD_DEFAULT)]);
        // token weryfikacyjny dla webhooka Meta generujemy od razu
        if (setting_get('fb_verify_token') === '') {
            setting_set('fb_verify_token', random_token(12));
        }
        $_SESSION['admin_id'] = (int)$pdo->lastInsertId();
        session_regenerate_id(true);
        redirect('admin.php');
    }
}

/* ── Logowanie ── */
if ($hasAdmin && $_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'login') {
    csrf_check();
    $email = trim(mb_strtolower((string)($_POST['email'] ?? '')));
    $pass  = (string)($_POST['password'] ?? '');
    $ip    = (string)($_SERVER['REMOTE_ADDR'] ?? '');

    if (login_blocked($ip)) {
        $error = 'Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za 15 minut.';
        goto render;
    }

    $st = $pdo->prepare('SELECT * FROM admins WHERE email = ?');
    $st->execute([$email]);
    $admin = $st->fetch();

    if ($admin && password_verify($pass, $admin['password_hash'])) {
        login_success($ip);
        session_regenerate_id(true);
        unset($_SESSION['client_id']);
        $_SESSION['admin_id'] = (int)$admin['id'];
        redirect('admin.php');
    }

    $st = $pdo->prepare('SELECT * FROM clients WHERE email = ? AND active = 1');
    $st->execute([$email]);
    $client = $st->fetch();

    // tryb panelu klienta: akceptuj wyłącznie konto przypisane do tego slugu
    $panelSlug = (string)($_POST['panel'] ?? '');
    if ($panelSlug !== '' && $client && ($client['slug'] ?? '') !== $panelSlug) {
        $client = null;
    }

    if ($client && password_verify($pass, $client['password_hash'])) {
        login_success($ip);
        session_regenerate_id(true);
        unset($_SESSION['admin_id']);
        $_SESSION['client_id'] = (int)$client['id'];
        redirect('panel.php');
    }

    login_fail($ip);
    usleep(300000); // spowolnienie prób brute-force
    $error = 'Nieprawidłowy e-mail lub hasło.';
}
render:

// zalogowanych przekierowujemy od razu
if (current_admin())  { redirect('admin.php'); }
if (current_client()) { redirect('panel.php'); }

/* ── Własny panel logowania klienta: login.php?panel=<slug> ── */
$panelClient = null;
if (!empty($_GET['panel'])) {
    $st = $pdo->prepare('SELECT id, name, company, color, slug FROM clients WHERE slug = ? AND active = 1');
    $st->execute([(string)$_GET['panel']]);
    $panelClient = $st->fetch() ?: null;
}
?>
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title><?= $hasAdmin ? 'Logowanie' : 'Pierwsze uruchomienie' ?> — LeadFlow CRM</title>
<link rel="stylesheet" href="crm.css">
</head>
<body class="auth-body">
<div class="auth-card" <?= $panelClient ? 'style="--accent:' . e($panelClient['color']) . ';--accent-2:' . e($panelClient['color']) . '"' : '' ?>>
  <div class="auth-logo" <?= $panelClient ? 'style="color:' . e($panelClient['color']) . '"' : '' ?>><?= svg_icon('bolt', 42) ?></div>
  <?php if ($panelClient): ?>
    <h1 class="auth-title"><?= e($panelClient['name']) ?></h1>
    <p class="auth-sub"><?= $panelClient['company'] !== '' ? e($panelClient['company']) . ' · ' : '' ?>Twój panel leadów<br>
      <span class="auth-powered">obsługiwany przez LeadFlow CRM</span></p>
  <?php else: ?>
    <h1 class="auth-title">LeadFlow <span>CRM</span></h1>
    <p class="auth-sub">Panel leadów Twojej agencji Meta Ads</p>
  <?php endif; ?>

  <?php if ($error): ?>
    <div class="flash flash-error"><?= e($error) ?></div>
  <?php endif; ?>

  <?php if (!$hasAdmin): ?>
    <div class="flash flash-info">Pierwsze uruchomienie — utwórz konto super admina.</div>
    <form method="post" class="auth-form">
      <?= csrf_field() ?>
      <input type="hidden" name="action" value="setup">
      <label>Twoja nazwa / agencja
        <input type="text" name="name" required maxlength="100" placeholder="np. Agencja MaksAds">
      </label>
      <label>E-mail
        <input type="email" name="email" required maxlength="200" placeholder="admin@twojadomena.pl">
      </label>
      <label>Hasło (min. 8 znaków)
        <input type="password" name="password" required minlength="8">
      </label>
      <button type="submit" class="btn btn-full">Utwórz konto super admina</button>
    </form>
  <?php else: ?>
    <form method="post" class="auth-form">
      <?= csrf_field() ?>
      <input type="hidden" name="action" value="login">
      <?php if ($panelClient): ?><input type="hidden" name="panel" value="<?= e($panelClient['slug']) ?>"><?php endif; ?>
      <label>E-mail
        <input type="email" name="email" required maxlength="200" autofocus>
      </label>
      <label>Hasło
        <input type="password" name="password" required>
      </label>
      <button type="submit" class="btn btn-full">Zaloguj się</button>
    </form>
    <?php if ($panelClient): ?>
      <p class="auth-hint">Logujesz się do panelu klienta „<?= e($panelClient['name']) ?>”.<br>Widzisz wyłącznie swoje leady, reklamy, statystyki i notatki.</p>
    <?php else: ?>
      <p class="auth-hint">Super admin widzi leady wszystkich klientów.<br>Klient po zalogowaniu widzi wyłącznie swoje leady.</p>
    <?php endif; ?>
  <?php endif; ?>
</div>
</body>
</html>
