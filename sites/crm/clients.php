<?php
/**
 * LeadFlow CRM — panel super admina: zarządzanie klientami.
 * Dodawanie kont, tokeny webhooków, mapowanie stron Facebooka, reset haseł.
 */

require_once __DIR__ . '/ui.php';

$admin = require_admin();
$pdo   = db();

$palette = ['#4f7cff', '#00b894', '#e17055', '#a29bfe', '#fdcb6e', '#e84393', '#00cec9', '#6c5ce7'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $action = (string)($_POST['action'] ?? '');

    if ($action === 'add') {
        $name    = trim((string)($_POST['name'] ?? ''));
        $company = trim((string)($_POST['company'] ?? ''));
        $email   = trim(mb_strtolower((string)($_POST['email'] ?? '')));
        $pass    = (string)($_POST['password'] ?? '');

        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($pass) < 8) {
            flash('error', 'Podaj nazwę, poprawny e-mail i hasło (min. 8 znaków).');
        } else {
            try {
                $count = (int)$pdo->query('SELECT COUNT(*) FROM clients')->fetchColumn();
                $pdo->prepare('INSERT INTO clients (name, company, email, password_hash, token, color)
                               VALUES (?,?,?,?,?,?)')
                    ->execute([
                        $name, $company, $email,
                        password_hash($pass, PASSWORD_DEFAULT),
                        random_token(),
                        $palette[$count % count($palette)],
                    ]);
                flash('ok', "Klient „{$name}” dodany. Skopiuj jego adres webhooka poniżej.");
            } catch (PDOException) {
                flash('error', 'Klient z tym adresem e-mail już istnieje.');
            }
        }
    }

    if ($action === 'update') {
        $id = (int)($_POST['id'] ?? 0);
        $pdo->prepare('UPDATE clients SET name = ?, company = ?, fb_page_id = ?, fb_page_token = ?, active = ? WHERE id = ?')
            ->execute([
                trim((string)($_POST['name'] ?? '')),
                trim((string)($_POST['company'] ?? '')),
                trim((string)($_POST['fb_page_id'] ?? '')),
                trim((string)($_POST['fb_page_token'] ?? '')),
                isset($_POST['active']) ? 1 : 0,
                $id,
            ]);
        flash('ok', 'Dane klienta zapisane.');
    }

    if ($action === 'password') {
        $id   = (int)($_POST['id'] ?? 0);
        $pass = (string)($_POST['password'] ?? '');
        if (mb_strlen($pass) < 8) {
            flash('error', 'Hasło musi mieć min. 8 znaków.');
        } else {
            $pdo->prepare('UPDATE clients SET password_hash = ? WHERE id = ?')
                ->execute([password_hash($pass, PASSWORD_DEFAULT), $id]);
            flash('ok', 'Hasło klienta zmienione.');
        }
    }

    if ($action === 'regen-token') {
        $id = (int)($_POST['id'] ?? 0);
        $pdo->prepare('UPDATE clients SET token = ? WHERE id = ?')->execute([random_token(), $id]);
        flash('ok', 'Wygenerowano nowy token — zaktualizuj webhooki tego klienta!');
    }

    if ($action === 'delete') {
        $id = (int)($_POST['id'] ?? 0);
        $pdo->prepare('DELETE FROM clients WHERE id = ?')->execute([$id]);
        flash('ok', 'Klient i jego leady zostały usunięte.');
    }

    redirect('clients.php');
}

$clients = $pdo->query('SELECT clients.*,
                          (SELECT COUNT(*) FROM leads WHERE leads.client_id = clients.id) AS lead_count
                        FROM clients ORDER BY name')->fetchAll();

$webhookBase = base_url() . '/webhook.php';

ui_header('Klienci', 'admin', $admin['name'], 'clients.php');
ui_flash();
?>
<div class="page-head">
  <h1>👥 Klienci agencji</h1>
</div>

<section class="card">
  <h2>➕ Dodaj nowego klienta</h2>
  <form method="post" class="grid-form">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="add">
    <label>Nazwa klienta *<input type="text" name="name" required maxlength="100" placeholder="np. Jan Kowalski"></label>
    <label>Firma<input type="text" name="company" maxlength="150" placeholder="np. Barber Shop Brusy"></label>
    <label>E-mail (login) *<input type="email" name="email" required maxlength="200" placeholder="klient@firma.pl"></label>
    <label>Hasło (min. 8 znaków) *<input type="text" name="password" required minlength="8" placeholder="hasło dla klienta"></label>
    <div class="form-actions"><button type="submit" class="btn">Dodaj klienta</button></div>
  </form>
</section>

<?php if (!$clients): ?>
  <div class="empty-state"><div class="empty-icon">👥</div><p>Brak klientów — dodaj pierwszego powyżej.</p></div>
<?php endif; ?>

<?php foreach ($clients as $c): ?>
  <section class="card client-card<?= $c['active'] ? '' : ' inactive' ?>">
    <div class="client-head">
      <span class="client-chip client-chip-lg" style="--chip:<?= e($c['color']) ?>"><?= e($c['name']) ?></span>
      <?php if ($c['company'] !== ''): ?><span class="muted"><?= e($c['company']) ?></span><?php endif; ?>
      <span class="lead-count"><?= (int)$c['lead_count'] ?> leadów</span>
      <?php if (!$c['active']): ?><span class="badge badge-przegrany">konto wyłączone</span><?php endif; ?>
      <span class="spacer"></span>
      <a class="btn btn-sm btn-ghost" href="admin.php?client=<?= (int)$c['id'] ?>">Zobacz leady</a>
    </div>

    <div class="webhook-box">
      <div class="webhook-row">
        <span class="webhook-label">🌐 Webhook stron www (i modułu HTTP w Make/Zapier):</span>
        <code class="webhook-url" data-copy><?= e($webhookBase . '?token=' . $c['token']) ?></code>
      </div>
      <div class="webhook-hint">
        Wyślij POST (JSON lub formularz) z polami np. <code>name</code>/<code>imie</code>, <code>email</code>,
        <code>phone</code>/<code>telefon</code>, <code>message</code>. Dla leadów z Meta przez Make/Zapier dodaj
        <code>&amp;source=facebook</code>. Kliknij adres, aby skopiować.
      </div>
    </div>

    <details class="client-edit">
      <summary>⚙️ Ustawienia klienta (Facebook, hasło, edycja)</summary>
      <div class="client-edit-body">
        <form method="post" class="grid-form">
          <?= csrf_field() ?>
          <input type="hidden" name="action" value="update">
          <input type="hidden" name="id" value="<?= (int)$c['id'] ?>">
          <label>Nazwa<input type="text" name="name" value="<?= e($c['name']) ?>" required maxlength="100"></label>
          <label>Firma<input type="text" name="company" value="<?= e($c['company']) ?>" maxlength="150"></label>
          <label>ID strony na Facebooku
            <input type="text" name="fb_page_id" value="<?= e($c['fb_page_id']) ?>" maxlength="50" placeholder="np. 101234567890123">
          </label>
          <label>Token dostępu strony (Page Access Token)
            <input type="text" name="fb_page_token" value="<?= e($c['fb_page_token']) ?>" placeholder="EAAB… (do pobierania szczegółów leadów)">
          </label>
          <label class="check-label"><input type="checkbox" name="active" <?= $c['active'] ? 'checked' : '' ?>> Konto aktywne</label>
          <div class="form-actions"><button type="submit" class="btn btn-sm">💾 Zapisz</button></div>
        </form>

        <div class="inline-forms">
          <form method="post" class="inline-form">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="password">
            <input type="hidden" name="id" value="<?= (int)$c['id'] ?>">
            <input type="text" name="password" minlength="8" required placeholder="nowe hasło klienta">
            <button type="submit" class="btn btn-sm btn-ghost">🔑 Zmień hasło</button>
          </form>
          <form method="post" class="inline-form"
                onsubmit="return confirm('Nowy token unieważni obecny adres webhooka. Kontynuować?')">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="regen-token">
            <input type="hidden" name="id" value="<?= (int)$c['id'] ?>">
            <button type="submit" class="btn btn-sm btn-ghost">♻️ Nowy token webhooka</button>
          </form>
          <form method="post" class="inline-form"
                onsubmit="return confirm('Usunąć klienta „<?= e($c['name']) ?>” razem ze WSZYSTKIMI jego leadami? Tej operacji nie można cofnąć.')">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="delete">
            <input type="hidden" name="id" value="<?= (int)$c['id'] ?>">
            <button type="submit" class="btn btn-sm btn-danger">🗑 Usuń klienta</button>
          </form>
        </div>
      </div>
    </details>
  </section>
<?php endforeach; ?>

<?php ui_footer(); ?>
