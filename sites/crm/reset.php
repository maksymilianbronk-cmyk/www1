<?php
/**
 * LeadFlow CRM — reset hasła („nie pamiętam hasła”).
 *
 * Przepływ: e-mail → jednorazowy link ważny 30 minut (wysyłka funkcją mail()
 * hostingu) → nowe hasło. Token przechowywany jako hash w tabeli settings
 * (reset_<sha256>), unieważniany po użyciu. Odpowiedź celowo nie zdradza,
 * czy konto istnieje (ochrona przed enumeracją adresów).
 */

require_once __DIR__ . '/ui.php';
crm_session_start();

$pdo  = db();
$info = '';
$error = '';
$token = (string)($_GET['t'] ?? $_POST['t'] ?? '');
$valid = null;

if ($token !== '') {
    $raw = setting_get('reset_' . hash('sha256', $token));
    $data = $raw !== '' ? json_decode($raw, true) : null;
    if (is_array($data) && strtotime((string)$data['exp']) > time()) {
        $valid = $data; // ['type' => admin|client, 'id' => N, 'exp' => …]
    }
}

/* ── Krok 2: ustawienie nowego hasła ── */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'set') {
    csrf_check();
    if ($valid === null) {
        $error = 'Link wygasł lub jest nieprawidłowy. Poproś o nowy.';
    } else {
        $pass = (string)($_POST['password'] ?? '');
        if (mb_strlen($pass) < 8) {
            $error = 'Hasło musi mieć min. 8 znaków.';
        } else {
            $table = $valid['type'] === 'admin' ? 'admins' : 'clients';
            $pdo->prepare("UPDATE $table SET password_hash = ? WHERE id = ?")
                ->execute([password_hash($pass, PASSWORD_DEFAULT), (int)$valid['id']]);
            $pdo->prepare('DELETE FROM settings WHERE key = ?')
                ->execute(['reset_' . hash('sha256', $token)]);
            $info = 'Hasło zmienione — możesz się zalogować.';
            $valid = null;
            $token = '';
        }
    }
}

/* ── Krok 1: prośba o link ── */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'request') {
    csrf_check();
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    if (login_blocked($ip)) {
        $error = 'Zbyt wiele prób. Spróbuj ponownie za 15 minut.';
    } else {
        login_fail($ip); // limitujemy też prośby o reset
        $email = trim(mb_strtolower((string)($_POST['email'] ?? '')));
        $account = null;
        $st = $pdo->prepare('SELECT id, name FROM admins WHERE email = ?');
        $st->execute([$email]);
        if ($row = $st->fetch()) {
            $account = ['type' => 'admin', 'id' => (int)$row['id']];
        } else {
            $st = $pdo->prepare('SELECT id, name FROM clients WHERE email = ? AND active = 1');
            $st->execute([$email]);
            if ($row = $st->fetch()) {
                $account = ['type' => 'client', 'id' => (int)$row['id']];
            }
        }
        if ($account !== null) {
            $t = random_token(24);
            setting_set('reset_' . hash('sha256', $t), json_encode(
                $account + ['exp' => date('Y-m-d H:i:s', time() + 1800)]
            ));
            crm_send_mail($email, 'Reset hasła — LeadFlow CRM',
                "Otrzymaliśmy prośbę o reset hasła.\n\n"
                . 'Ustaw nowe hasło (link ważny 30 minut): ' . base_url() . '/reset.php?t=' . $t . "\n\n"
                . 'Jeśli to nie Ty — zignoruj tę wiadomość.');
        }
        $info = 'Jeśli konto istnieje, link do resetu został wysłany na podany adres.';
    }
}

ob_start();
?>
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Reset hasła — LeadFlow CRM</title>
<link rel="stylesheet" href="crm.css">
</head>
<body class="auth-body">
<div class="auth-card">
  <div class="auth-logo"><?= svg_icon('key', 38) ?></div>
  <h1 class="auth-title">Reset hasła</h1>
  <p class="auth-sub">LeadFlow CRM</p>
  <?php if ($error): ?><div class="flash flash-error"><?= e($error) ?></div><?php endif; ?>
  <?php if ($info): ?><div class="flash flash-ok"><?= e($info) ?></div><?php endif; ?>

  <?php if ($valid !== null): ?>
    <form method="post" class="auth-form">
      <?= csrf_field() ?>
      <input type="hidden" name="action" value="set">
      <input type="hidden" name="t" value="<?= e($token) ?>">
      <label>Nowe hasło (min. 8 znaków)
        <input type="password" name="password" required minlength="8" autofocus>
      </label>
      <button type="submit" class="btn btn-full">Ustaw nowe hasło</button>
    </form>
  <?php elseif ($info === '' || $error !== ''): ?>
    <form method="post" class="auth-form">
      <?= csrf_field() ?>
      <input type="hidden" name="action" value="request">
      <label>E-mail konta
        <input type="email" name="email" required maxlength="200" autofocus>
      </label>
      <button type="submit" class="btn btn-full">Wyślij link do resetu</button>
    </form>
  <?php endif; ?>
  <p class="auth-hint"><a href="login.php">← Wróć do logowania</a></p>
</div>
</body>
</html>
<?php
echo ob_get_clean();
