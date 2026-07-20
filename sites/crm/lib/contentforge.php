<?php
/**
 * REAKTOR ContentForge — autorski generator miesięcznych planów postów.
 *
 * Unikalna technika: posty nie są losowym tekstem — generator łączy trzy źródła:
 *   1. DANE Z CRM KLIENTA — prawdziwa liczba leadów, wygrane, nazwy kampanii
 *      trafiają do treści (social proof, którego nie wymyśli szablon),
 *   2. KALENDARZ MARKETINGOWY PL — święta i dni nietypowe danego miesiąca,
 *   3. BANK ARCHETYPÓW — sprawdzone typy postów (edukacja, promocja, kulisy,
 *      social proof, FAQ, CTA leadowe) × rotowane hooki i wezwania do akcji.
 *
 * Deterministyczny PRNG (mulberry32) siany kluczem klient+miesiąc+próba:
 * ta sama próba daje ten sam plan (odtwarzalność), kolejna — świeży zestaw.
 * Harmonogram: złote godziny publikacji, równomierny rozkład dni.
 *
 * Publikacja: fb_publish_post() → Graph API /{page_id}/feed tokenem strony.
 */

declare(strict_types=1);

/* ── PRNG mulberry32 — deterministyczny, przenośny ── */
final class ForgeRand
{
    private int $state;

    public function __construct(int $seed)
    {
        $this->state = $seed & 0xFFFFFFFF;
    }

    public function next(): float
    {
        $this->state = ($this->state + 0x6D2B79F5) & 0xFFFFFFFF;
        $z = $this->state;
        $z = (($z ^ ($z >> 15)) * ($z | 1)) & 0xFFFFFFFF;
        $z ^= ($z + ((($z ^ ($z >> 7)) * ($z | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF;
        return (($z ^ ($z >> 14)) & 0xFFFFFFFF) / 4294967296;
    }

    public function pick(array $arr): mixed
    {
        return $arr[(int)floor($this->next() * count($arr))];
    }

    public function shuffle(array $arr): array
    {
        for ($i = count($arr) - 1; $i > 0; $i--) {
            $j = (int)floor($this->next() * ($i + 1));
            [$arr[$i], $arr[$j]] = [$arr[$j], $arr[$i]];
        }
        return $arr;
    }
}

/* ── Kalendarz marketingowy PL: miesiąc => [dzień => okazja] ── */
const FORGE_CALENDAR = [
    1  => [1 => 'Nowy Rok — czas postanowień', 21 => 'Dzień Babci', 22 => 'Dzień Dziadka'],
    2  => [9 => 'Międzynarodowy Dzień Pizzy', 14 => 'Walentynki', 17 => 'Dzień Kota'],
    3  => [8 => 'Dzień Kobiet', 20 => 'pierwszy dzień wiosny', 30 => 'Dzień Piekarza'],
    4  => [1 => 'Prima Aprilis', 7 => 'Światowy Dzień Zdrowia', 22 => 'Dzień Ziemi'],
    5  => [4 => 'Dzień Strażaka', 15 => 'Dzień Rodziny', 26 => 'Dzień Matki'],
    6  => [1 => 'Dzień Dziecka', 21 => 'pierwszy dzień lata', 23 => 'Dzień Ojca'],
    7  => [11 => 'Światowy Dzień Czekolady', 24 => 'Dzień Policjanta'],
    8  => [9 => 'Dzień Miłośników Książek', 31 => 'koniec wakacji — ostatni dzwonek'],
    9  => [1 => 'powrót do szkoły', 23 => 'pierwszy dzień jesieni', 27 => 'Światowy Dzień Turystyki'],
    10 => [4 => 'Światowy Dzień Zwierząt', 14 => 'Dzień Nauczyciela', 31 => 'Halloween'],
    11 => [11 => 'Święto Niepodległości', 25 => 'Dzień Pluszowego Misia', 29 => 'Black Friday'],
    12 => [4 => 'Barbórka', 6 => 'Mikołajki', 24 => 'Wigilia — życzenia świąteczne'],
];

/** Złote godziny publikacji na Facebooku. */
const FORGE_HOURS = ['09:30', '11:00', '13:00', '17:30', '19:00'];

/**
 * Szablony postów. Placeholdery: {firma} {miasto} {branza} {oferta}
 * {leady} {wygrane} {kampania} {okazja} {miesiac}
 * Wpis: [tytuł-typ, treść]. Sekcja "data" używana tylko, gdy CRM ma dane.
 */
function forge_templates(): array
{
    return [
        'edukacja' => [
            "Czy wiesz, że…? 🤔\n\nW branży {branza} najwięcej zapytań pojawia się właśnie w tym okresie. Jeśli planujesz skorzystać z: {oferta} — {miesiac} to dobry moment, żeby zapytać o termin.\n\nNapisz do nas — doradzimy bez zobowiązań. 📩",
            "3 rzeczy, o które klienci pytają nas najczęściej:\n\n1️⃣ Ile to kosztuje? — zawsze wyceniamy indywidualnie i za darmo.\n2️⃣ Jak szybko dostępny jest termin? — zwykle w ciągu kilku dni.\n3️⃣ Czy obsługujecie okolice {miasto}? — tak!\n\nMasz inne pytanie? Śmiało, odpowiadamy na każdą wiadomość. 💬",
        ],
        'promocja' => [
            "⭐ {miesiac} w {firma}!\n\nPrzygotowaliśmy coś specjalnego: {oferta}.\nLiczba miejsc/terminów ograniczona — kto pierwszy, ten lepszy.\n\n📩 Napisz w wiadomości „INFO”, a wyślemy szczegóły.",
            "Tylko w tym miesiącu 👇\n\n{oferta} — w najlepszym wydaniu, jakie znajdziesz w {miasto}.\nZarezerwuj swój termin, zanim grafik się zapełni.\n\n☎️ Zadzwoń lub napisz — odpowiadamy od ręki.",
        ],
        'social_proof' => [
            "Dziękujemy za zaufanie! ❤️\n\nW ostatnim miesiącu aż {leady} osób skontaktowało się z nami przez internet, a {wygrane} z nich już skorzystało z naszych usług.\n\nDołącz do zadowolonych klientów {firma} — napisz do nas już dziś. 📩",
            "Liczby mówią same za siebie 📊\n\n✅ {leady} zapytań w zeszłym miesiącu\n✅ Setki zadowolonych klientów w {miasto} i okolicach\n✅ Odpowiadamy na każdą wiadomość\n\nPrzekonaj się, dlaczego wybierają właśnie nas.",
        ],
        'kulisy' => [
            "Od kuchni w {firma} 👀\n\nKażdy dzień to dla nas nowe wyzwania i nowi klienci. Najbardziej cieszy nas moment, gdy widzimy Wasze zadowolenie z efektów.\n\nObserwuj nasz profil — pokazujemy, jak pracujemy na co dzień. 📸",
            "Kto stoi za {firma}? 💪\n\nZespół ludzi z pasją do tego, co robimy: {oferta}.\nPracujemy w {miasto} i okolicach — być może właśnie dziś mijamy się na ulicy!\n\nZostaw 👍, jeśli już nas znasz.",
        ],
        'faq' => [
            "Najczęstsze pytanie tygodnia ❓\n\n„Czy muszę umawiać się z wyprzedzeniem?”\n\nPolecamy rezerwację terminu — dzięki temu mamy dla Ciebie czas w 100%. Napisz lub zadzwoń, a znajdziemy dogodny termin jeszcze w tym tygodniu. 🗓",
            "Q&A z {firma} 💬\n\nPytacie: co dokładnie obejmuje {oferta}?\nOdpowiadamy: wszystko, czego potrzebujesz — od pierwszej konsultacji po gotowy efekt. Bez ukrytych kosztów.\n\nMasz pytania? Zadaj je w komentarzu! 👇",
        ],
        'cta_lead' => [
            "Szukasz sprawdzonej firmy w {miasto}? 🔎\n\n{firma} — {oferta}.\nWypełnij krótki formularz lub napisz wiadomość, a oddzwonimy z bezpłatną wyceną.\n\n⏱ Odpowiadamy zwykle w kilkanaście minut w godzinach pracy.",
            "Zostaw kontakt — resztą zajmiemy się my. 🤝\n\nBez spamu, bez nachalnych telefonów. Jedna rozmowa, konkretna wycena i decyzja należy do Ciebie.\n\n📩 Napisz „WYCENA” w wiadomości prywatnej.",
        ],
        'okazja' => [
            "Dziś {okazja}! 🎉\n\nZ tej okazji cały zespół {firma} życzy Wam wszystkiego, co najlepsze.\nA jeśli szukasz prezentu lub okazji dla siebie — sprawdź: {oferta}.\n\nMiłego świętowania! ✨",
            "{okazja} — czy Ty też świętujesz? 😊\n\nW {firma} lubimy takie dni. To dobry pretekst, żeby zrobić coś dla siebie: {oferta}.\n\nZajrzyj do nas w {miasto} albo napisz — mamy dziś wyjątkowo dobre humory!",
        ],
        'kampania' => [
            "Widziałeś naszą reklamę „{kampania}”? 📣\n\nTo nie przypadek — właśnie ruszyliśmy z nową ofertą: {oferta}.\nKliknij, napisz, zapytaj. Pierwsze wrażenie robi się tylko raz, a my robimy je dobrze. 😉",
        ],
    ];
}

/** Statystyki CRM klienta do personalizacji (zeszły miesiąc). */
function forge_stats(PDO $pdo, int $clientId): array
{
    $st = $pdo->prepare("SELECT COUNT(*) FROM leads WHERE client_id = ?
                         AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime', '-1 months')");
    $st->execute([$clientId]);
    $leads = (int)$st->fetchColumn();

    $st = $pdo->prepare("SELECT COUNT(*) FROM leads WHERE client_id = ? AND status = 'wygrany'");
    $st->execute([$clientId]);
    $won = (int)$st->fetchColumn();

    $st = $pdo->prepare("SELECT name FROM campaigns WHERE client_id = ? ORDER BY month DESC, spend DESC LIMIT 1");
    $st->execute([$clientId]);
    $campaign = (string)($st->fetchColumn() ?: '');
    if ($campaign === '') {
        $st = $pdo->prepare("SELECT campaign FROM leads WHERE client_id = ? AND campaign != '' ORDER BY id DESC LIMIT 1");
        $st->execute([$clientId]);
        $campaign = (string)($st->fetchColumn() ?: '');
    }
    return ['leady' => $leads, 'wygrane' => $won, 'kampania' => $campaign];
}

/**
 * Generuje plan postów na miesiąc.
 * @return array<int, array{publish_at:string, archetype:string, body:string}>
 */
function forge_generate(PDO $pdo, array $client, string $month, int $count = 12, int $attempt = 1): array
{
    $count = max(4, min(24, $count));
    $seed  = crc32($client['slug'] . '|' . $month . '|' . $attempt);
    $rand  = new ForgeRand($seed);
    $stats = forge_stats($pdo, (int)$client['id']);

    [$y, $m] = array_map('intval', explode('-', $month));
    $daysInMonth = (int)date('t', mktime(12, 0, 0, $m, 1, $y));
    $monthName   = ['', 'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec',
                    'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'][$m];

    $vars = [
        '{firma}'    => $client['company'] !== '' ? $client['company'] : $client['name'],
        '{miasto}'   => $client['city'] !== '' ? $client['city'] : 'Twojej okolicy',
        '{branza}'   => $client['industry'] !== '' ? $client['industry'] : 'usługowej',
        '{oferta}'   => $client['offer'] !== '' ? $client['offer'] : 'nasze usługi w najlepszym wydaniu',
        '{miesiac}'  => $monthName,
        '{leady}'    => (string)$stats['leady'],
        '{wygrane}'  => (string)$stats['wygrane'],
        '{kampania}' => $stats['kampania'],
    ];

    // pula archetypów: dane CRM i kampanie tylko gdy są sensowne wartości
    $templates = forge_templates();
    if ($stats['leady'] < 5) {
        unset($templates['social_proof']); // nie chwalimy się dwoma leadami
    }
    if ($stats['kampania'] === '') {
        unset($templates['kampania']);
    }

    // dni publikacji: święta miesiąca najpierw, reszta rozłożona równomiernie
    $occasions = FORGE_CALENDAR[$m] ?? [];
    $schedule  = [];
    foreach ($occasions as $day => $label) {
        if (count($schedule) >= $count) {
            break;
        }
        $schedule[$day] = $label;
    }
    $step = $daysInMonth / max(1, $count);
    $cursor = 1 + $rand->next() * max(0.0, $step - 1);
    while (count($schedule) < $count) {
        $day = min($daysInMonth, max(1, (int)round($cursor)));
        while (isset($schedule[$day]) && $day < $daysInMonth) {
            $day++;
        }
        $schedule[$day] = null;
        $cursor += $step;
        if ($cursor > $daysInMonth && count($schedule) < $count) {
            $cursor = 1 + $rand->next() * 2; // domknij plan od początku miesiąca
        }
    }
    ksort($schedule);

    // kolejka archetypów: przetasowana, bez dwóch identycznych pod rząd
    $keys = array_keys($templates);
    $queue = [];
    while (count($queue) < $count) {
        foreach ($rand->shuffle($keys) as $k) {
            if ($k !== 'okazja') {
                $queue[] = $k;
            }
        }
    }

    $posts = [];
    $qi = 0;
    foreach ($schedule as $day => $occasion) {
        $arch = $occasion !== null ? 'okazja' : $queue[$qi++];
        $tpl  = $rand->pick($templates[$arch] ?? $templates['edukacja']);
        $body = strtr($tpl, $vars + ['{okazja}' => (string)$occasion]);
        $posts[] = [
            'publish_at' => sprintf('%04d-%02d-%02d %s:00', $y, $m, $day, $rand->pick(FORGE_HOURS)),
            'archetype'  => $arch,
            'body'       => $body,
        ];
    }
    return $posts;
}

/* ── Publikacja na Facebooku (Graph API, token strony) ── */

/** POST do Graph API; bazę można nadpisać ustawieniem graph_base (testy/sandbox). */
function graph_post(string $path, array $params): ?array
{
    $base = setting_get('graph_base', 'https://graph.facebook.com/v21.0');
    $url  = rtrim($base, '/') . '/' . $path;
    $body = http_build_query($params);

    $response = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 20,
        ]);
        $response = curl_exec($ch);
        curl_close($ch);
    }
    if ($response === false) {
        $response = @file_get_contents($url, false, stream_context_create(['http' => [
            'method' => 'POST', 'content' => $body, 'timeout' => 20, 'ignore_errors' => true,
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
        ]]));
    }
    $json = $response !== false && $response !== null ? json_decode((string)$response, true) : null;
    return is_array($json) ? $json : null;
}

/**
 * Publikuje pojedynczy post; aktualizuje status/fb_post_id/error w bazie.
 * @return bool czy opublikowano
 */
function fb_publish_post(PDO $pdo, array $client, array $post): bool
{
    if ($client['fb_page_id'] === '' || $client['fb_page_token'] === '') {
        $pdo->prepare("UPDATE posts SET status = 'blad', error = ?, updated_at = datetime('now','localtime') WHERE id = ?")
            ->execute(['Brak ID strony lub tokena strony u klienta.', (int)$post['id']]);
        return false;
    }
    $resp = graph_post($client['fb_page_id'] . '/feed', [
        'message'      => $post['body'],
        'access_token' => $client['fb_page_token'],
    ]);
    if (is_array($resp) && isset($resp['id'])) {
        $pdo->prepare("UPDATE posts SET status = 'opublikowany', fb_post_id = ?, error = '', updated_at = datetime('now','localtime') WHERE id = ?")
            ->execute([(string)$resp['id'], (int)$post['id']]);
        return true;
    }
    $err = $resp['error']['message'] ?? 'Brak odpowiedzi Graph API.';
    $pdo->prepare("UPDATE posts SET status = 'blad', error = ?, updated_at = datetime('now','localtime') WHERE id = ?")
        ->execute([mb_substr((string)$err, 0, 500), (int)$post['id']]);
    return false;
}
