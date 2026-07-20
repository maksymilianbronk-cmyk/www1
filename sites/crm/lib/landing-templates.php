<?php
/**
 * REAKTOR Landing Kreator — gotowe szablony branżowe.
 *
 * Każda branża definiuje motyw, zdjęcia i copy; builder skleja z nich pełny
 * spec landinga, podstawiając dane klienta z CRM ({firma}, {miasto}, {oferta}).
 * Użycie przez MCP: POST landing-api.php {"template":"barber","slug":…,
 * "client_token":…, "overrides":{…}} — sekundę później strona żyje.
 */

declare(strict_types=1);

function landing_templates_list(): array
{
    return array_map(
        fn($t) => ['key' => $t['key'], 'name' => $t['name']],
        array_values(landing_templates_data())
    );
}

function landing_templates_data(): array
{
    $u = fn(string $id) => "https://images.unsplash.com/photo-$id?w=1600&q=70";
    return [
        'barber' => [
            'key' => 'barber', 'name' => 'Barber / fryzjer męski',
            'theme' => ['primary' => '#b3541e', 'accent' => '#f5b942', 'bg' => '#12100e', 'font' => 'Poppins'],
            'kicker' => 'BARBER · {miasto}', 'heading' => 'Klasyczne strzyżenie. Nowoczesny styl.',
            'sub' => '{firma} — {oferta}. Umów wizytę online w 30 sekund.', 'cta' => 'Umów wizytę',
            'hero' => $u('1585747860715-2ba37e788b70'),
            'features' => [['✂️', 'Precyzja', 'Każde cięcie dopracowane do milimetra.'],
                ['🪒', 'Rytuał brody', 'Gorący ręcznik, brzytwa, olejek — pełen serwis.'],
                ['⏱', 'Bez czekania', 'Rezerwacja terminu — przychodzisz na godzinę.']],
            'steps' => [['Rezerwujesz', 'Telefonicznie lub przez formularz — potwierdzamy od razu.'],
                ['Siadasz na fotelu', 'Konsultacja, kawa i pełne skupienie na Tobie.'],
                ['Wychodzisz odmieniony', 'Stylizacja na koniec — zawsze gratis.']],
            'stats' => [[1200, '+', 'zadowolonych klientów'], [6, '', 'lat doświadczenia'], [30, ' min', 'średni czas wizyty']],
            'pricing' => [['Strzyżenie męskie', '60 zł', 'mycie + stylizacja'], ['Broda', '40 zł', 'trymowanie + brzytwa'], ['Combo', '90 zł', 'włosy + broda']],
            'gallery' => [$u('1503951914875-452162b0f3f1'), $u('1521490878406-4b1a12decba8'), $u('1599351431202-1e0f0137899a')],
            'faq' => [['Czy mogę przyjść bez zapisu?', 'Tak, ale zapisani mają pierwszeństwo.'],
                ['Czy strzyżecie dzieci?', 'Tak — juniorzy do 12 lat mają zniżkę.']],
            'testimonials' => [['Marek', 'Najlepszy barber w okolicy, nie ma co porównywać.'], ['Tomek', 'Broda jak nowa. Polecam każdemu.']],
        ],
        'beauty' => [
            'key' => 'beauty', 'name' => 'Salon beauty / kosmetyka',
            'theme' => ['primary' => '#c2557f', 'accent' => '#f2c9d8', 'bg' => '#171114', 'font' => 'Playfair Display'],
            'kicker' => 'BEAUTY · {miasto}', 'heading' => 'Piękno zaczyna się od dobrej pielęgnacji.',
            'sub' => '{firma} — {oferta}. Zarezerwuj zabieg i poczuj różnicę.', 'cta' => 'Rezerwuję zabieg',
            'hero' => $u('1560066984-138dadb4c035'),
            'features' => [['💅', 'Stylizacja paznokci', 'Manicure hybrydowy, żel, zdobienia.'],
                ['✨', 'Pielęgnacja twarzy', 'Zabiegi dobrane do Twojej skóry.'],
                ['🌸', 'Atmosfera SPA', 'Relaks od wejścia — muzyka, aromaty, spokój.']],
            'steps' => [['Konsultacja', 'Bezpłatnie ustalamy potrzeby Twojej skóry.'],
                ['Zabieg', 'Certyfikowane kosmetyki i sprzęt premium.'],
                ['Efekt', 'Wychodzisz promienna — z planem pielęgnacji domowej.']],
            'stats' => [[2500, '+', 'wykonanych zabiegów'], [9, '', 'lat na rynku'], [5, '★', 'średnia ocen']],
            'pricing' => [['Manicure hybrydowy', '120 zł', 'ze wzmocnieniem'], ['Oczyszczanie wodorowe', '220 zł', '60 minut'], ['Laminacja brwi', '150 zł', 'z regulacją']],
            'gallery' => [$u('1522337660859-02fbefca4702'), $u('1519014816548-bf5fe059798b'), $u('1596462502278-27bfdc403348')],
            'faq' => [['Jak przygotować się do zabiegu?', 'Przyjdź bez makijażu — resztą zajmiemy się my.'],
                ['Czy zabiegi są bezpieczne w ciąży?', 'Część tak — skonsultujemy to indywidualnie.']],
            'testimonials' => [['Kasia', 'Cudowne miejsce, efekty widać od pierwszej wizyty.'], ['Monika', 'Wreszcie salon, w którym czuję się zaopiekowana.']],
        ],
        'budowlana' => [
            'key' => 'budowlana', 'name' => 'Firma budowlano-remontowa',
            'theme' => ['primary' => '#d97706', 'accent' => '#fbbf24', 'bg' => '#101418', 'font' => 'Barlow'],
            'kicker' => 'BUDOWA I REMONTY · {miasto}', 'heading' => 'Remont bez nerwów. Terminowo i pod klucz.',
            'sub' => '{firma} — {oferta}. Darmowa wycena w 24 godziny.', 'cta' => 'Darmowa wycena',
            'hero' => $u('1504307651254-35680f356dfd'),
            'features' => [['📐', 'Pod klucz', 'Od projektu po ostatnią listwę — jeden wykonawca.'],
                ['🧾', 'Umowa i gwarancja', 'Jasny kosztorys, terminy na piśmie, 36 mies. gwarancji.'],
                ['🧹', 'Porządek po robocie', 'Zostawiamy mieszkanie gotowe do życia.']],
            'steps' => [['Wycena', 'Oglądamy, mierzymy, wyceniamy — za darmo.'],
                ['Harmonogram', 'Ustalamy etapy i terminy, podpisujemy umowę.'],
                ['Realizacja', 'Codzienne raporty zdjęciowe z budowy.']],
            'stats' => [[340, '+', 'zakończonych realizacji'], [15, '', 'lat doświadczenia'], [36, ' mies.', 'gwarancji']],
            'pricing' => [['Malowanie', 'od 18 zł/m²', 'z materiałem'], ['Łazienka pod klucz', 'od 14 000 zł', 'robocizna'], ['Remont mieszkania', 'wycena', 'indywidualna']],
            'gallery' => [$u('1581858726788-75bc0f6a952d'), $u('1556911220-bff31c812dba'), $u('1523413651479-597eb2da0ad6')],
            'faq' => [['Jak szybko możecie zacząć?', 'Zwykle w ciągu 2–4 tygodni od podpisania umowy.'],
                ['Czy kupujecie materiały?', 'Tak — mamy rabaty hurtowe, które przechodzą na Ciebie.']],
            'testimonials' => [['Państwo Kowalscy', 'Remont 60 m² w 5 tygodni, zero opóźnień.'], ['Adam', 'Profesjonalizm od wyceny po odbiór.']],
        ],
        'gastronomia' => [
            'key' => 'gastronomia', 'name' => 'Restauracja / gastronomia',
            'theme' => ['primary' => '#b91c1c', 'accent' => '#fde68a', 'bg' => '#140f0d', 'font' => 'Lora'],
            'kicker' => 'KUCHNIA · {miasto}', 'heading' => 'Smak, do którego się wraca.',
            'sub' => '{firma} — {oferta}. Zarezerwuj stolik już dziś.', 'cta' => 'Rezerwuję stolik',
            'hero' => $u('1517248135467-4c7edcad34c4'),
            'features' => [['🍝', 'Świeże składniki', 'Codzienne dostawy od lokalnych dostawców.'],
                ['👨‍🍳', 'Autorska karta', 'Menu sezonowe tworzone przez szefa kuchni.'],
                ['🍷', 'Dobrane wina', 'Karta win pod każde danie.']],
            'steps' => [['Rezerwujesz', 'Online lub telefonicznie — potwierdzenie od razu.'],
                ['Zasiadasz', 'Stolik czeka, karta sezonowa na stole.'],
                ['Delektujesz się', 'Reszta należy do naszej kuchni.']],
            'stats' => [[12, '', 'lat tradycji'], [40, '+', 'pozycji w karcie'], [5, '★', 'ocena gości']],
            'pricing' => [['Lunch dnia', '39 zł', 'pn–pt 12:00–15:00'], ['Menu degustacyjne', '160 zł', '5 dań'], ['Weekendowy brunch', '69 zł', 'sob–nd']],
            'gallery' => [$u('1414235077428-338989a2e8c0'), $u('1555396273-367ea4eb4db5'), $u('1544025162-d76694265947')],
            'faq' => [['Czy macie opcje wege?', 'Tak, osobna sekcja w karcie + opcje bezglutenowe.'],
                ['Czy organizujecie przyjęcia?', 'Tak — sala do 40 osób, menu ustalane indywidualnie.']],
            'testimonials' => [['Ola', 'Najlepszy tatar w mieście. Obsługa na medal.'], ['Piotr', 'Klimat, smak, cena — wszystko się zgadza.']],
        ],
        'fitness' => [
            'key' => 'fitness', 'name' => 'Siłownia / trener personalny',
            'theme' => ['primary' => '#dc2626', 'accent' => '#a3e635', 'bg' => '#0d1117', 'font' => 'Oswald'],
            'kicker' => 'TRENING · {miasto}', 'heading' => 'Forma, którą poczujesz po pierwszym tygodniu.',
            'sub' => '{firma} — {oferta}. Pierwszy trening gratis.', 'cta' => 'Odbieram darmowy trening',
            'hero' => $u('1534438327276-14e5300c3a48'),
            'features' => [['🏋️', 'Plan pod Ciebie', 'Trening i dieta dopasowane do celu.'],
                ['📊', 'Mierzalne postępy', 'Pomiary co 2 tygodnie — widzisz efekty.'],
                ['🤝', 'Bez oceniania', 'Trenujesz w swoim tempie, my pilnujemy techniki.']],
            'steps' => [['Konsultacja', 'Cel, zdrowie, możliwości — 30 minut rozmowy.'],
                ['Plan', 'Trening + jadłospis w aplikacji.'],
                ['Progres', 'Cotygodniowe korekty i motywacja.']],
            'stats' => [[800, '+', 'podopiecznych'], [92, '%', 'osiąga cel'], [7, ' dni', 'do pierwszych efektów']],
            'pricing' => [['Trening personalny', '120 zł', '60 minut'], ['Pakiet 10 treningów', '1000 zł', 'ważny 3 mies.'], ['Prowadzenie online', '250 zł/mies.', 'plan + korekty']],
            'gallery' => [$u('1517836357463-d25dfeac3438'), $u('1571019614242-c5c5dee9f50b'), $u('1583454110551-21f2fa2afe61')],
            'faq' => [['Nigdy nie ćwiczyłem — czy to dla mnie?', 'Tak, 70% podopiecznych zaczynało od zera.'],
                ['Czy układacie dietę?', 'Tak, jadłospis wchodzi w każdy pakiet.']],
            'testimonials' => [['Bartek', '-14 kg w 4 miesiące. Bez głodówek.'], ['Ania', 'Pierwszy raz trening sprawia mi frajdę.']],
        ],
        'moto' => [
            'key' => 'moto', 'name' => 'Warsztat / detailing samochodowy',
            'theme' => ['primary' => '#2563eb', 'accent' => '#f59e0b', 'bg' => '#0b0f14', 'font' => 'Rajdhani'],
            'kicker' => 'MOTORYZACJA · {miasto}', 'heading' => 'Twoje auto w najlepszych rękach.',
            'sub' => '{firma} — {oferta}. Umów termin — oddzwaniamy w 15 minut.', 'cta' => 'Umawiam termin',
            'hero' => $u('1492144534655-ae79c964c9d7'),
            'features' => [['🔧', 'Diagnostyka komputerowa', 'Najnowsze testery, pełny raport.'],
                ['🛡', 'Gwarancja na usługi', '12 miesięcy na części i robociznę.'],
                ['🚗', 'Auto zastępcze', 'Na czas dłuższych napraw — gratis.']],
            'steps' => [['Zgłaszasz', 'Formularz lub telefon — opisujesz problem.'],
                ['Diagnozujemy', 'Wycena przed naprawą, bez niespodzianek.'],
                ['Odbierasz', 'Auto umyte, raport z naprawy na mail.']],
            'stats' => [[4500, '+', 'napraw rocznie'], [12, ' mies.', 'gwarancji'], [15, ' min', 'czas odpowiedzi']],
            'pricing' => [['Przegląd okresowy', 'od 250 zł', 'z olejem'], ['Klimatyzacja', 'od 180 zł', 'nabicie + odgrzybianie'], ['Detailing kompletny', 'od 800 zł', 'wewnątrz i na zewnątrz']],
            'gallery' => [$u('1487754180451-c456f719a1fc'), $u('1625047509168-a7026f36de04'), $u('1607860108855-64acf2078ed9')],
            'faq' => [['Czy wyceniacie przed naprawą?', 'Zawsze — akceptujesz koszt zanim zaczniemy.'],
                ['Jakie części montujecie?', 'Oryginały lub sprawdzone zamienniki — wybór należy do Ciebie.']],
            'testimonials' => [['Krzysztof', 'Rzetelna wycena i auto gotowe przed czasem.'], ['Ewa', 'Wreszcie warsztat, któremu ufam.']],
        ],
        'stomatolog' => [
            'key' => 'stomatolog', 'name' => 'Stomatolog / klinika medyczna',
            'theme' => ['primary' => '#0891b2', 'accent' => '#67e8f9', 'bg' => '#0c1220', 'font' => 'Nunito'],
            'kicker' => 'STOMATOLOGIA · {miasto}', 'heading' => 'Zdrowy uśmiech bez stresu.',
            'sub' => '{firma} — {oferta}. Umów wizytę — terminy w tym tygodniu.', 'cta' => 'Umawiam wizytę',
            'hero' => $u('1588776814546-1ffcf47267a5'),
            'features' => [['🦷', 'Bezbolesne leczenie', 'Znieczulenie komputerowe, pełen komfort.'],
                ['📷', 'Diagnostyka 3D', 'Tomografia i skaner — leczymy precyzyjnie.'],
                ['👶', 'Przyjazne dzieciom', 'Adaptacyjne wizyty dla najmłodszych.']],
            'steps' => [['Przegląd', 'Kompleksowa diagnostyka i plan leczenia.'],
                ['Plan i kosztorys', 'Wiesz z góry co, kiedy i za ile.'],
                ['Leczenie', 'Etapami, w Twoim tempie, bez bólu.']],
            'stats' => [[10000, '+', 'wyleczonych pacjentów'], [14, '', 'lat praktyki'], [0, ' zł', 'pierwsza konsultacja']],
            'pricing' => [['Przegląd + higienizacja', '350 zł', 'skaling + piaskowanie'], ['Wypełnienie', 'od 280 zł', 'światłoutwardzalne'], ['Wybielanie', '990 zł', 'nakładkowe']],
            'gallery' => [$u('1629909613654-28e377c37b09'), $u('1606811971618-4486d14f3f99'), $u('1588776814546-1ffcf47267a5')],
            'faq' => [['Boję się dentysty — co robić?', 'Zacznij od wizyty adaptacyjnej. Bez leczenia, sama rozmowa.'],
                ['Czy wystawiacie plan leczenia?', 'Tak, zawsze z kosztorysem przed rozpoczęciem.']],
            'testimonials' => [['Magda', 'Pierwszy dentysta, do którego chodzę bez strachu.'], ['Paweł', 'Profesjonalizm i cierpliwość — polecam rodzinom.']],
        ],
        'fotograf' => [
            'key' => 'fotograf', 'name' => 'Fotograf / wideofilmowanie',
            'theme' => ['primary' => '#7c3aed', 'accent' => '#fbbf24', 'bg' => '#0f0d17', 'font' => 'Cormorant Garamond'],
            'kicker' => 'FOTOGRAFIA · {miasto}', 'heading' => 'Chwile, które zostają na zawsze.',
            'sub' => '{firma} — {oferta}. Sprawdź wolne terminy na sesję.', 'cta' => 'Sprawdzam terminy',
            'hero' => $u('1554048612-b6a482bc67e5'),
            'features' => [['📸', 'Sesje ślubne', 'Reportaż + plener w cenie pakietu.'],
                ['👨‍👩‍👧', 'Sesje rodzinne', 'Naturalne kadry, bez sztywnych póz.'],
                ['🏢', 'Foto dla firm', 'Wizerunek, produkty, eventy.']],
            'steps' => [['Rozmowa', 'Poznajemy się i planujemy sesję.'],
                ['Sesja', 'Luźna atmosfera — najlepsze kadry robią się same.'],
                ['Galeria', 'Obrobione zdjęcia online w 14 dni.']],
            'stats' => [[280, '+', 'sesji rocznie'], [10, '', 'lat za obiektywem'], [14, ' dni', 'na gotową galerię']],
            'pricing' => [['Sesja rodzinna', '600 zł', '60 min, 30 ujęć'], ['Reportaż ślubny', 'od 4500 zł', 'cały dzień'], ['Sesja biznesowa', '900 zł', 'do 5 osób']],
            'gallery' => [$u('1519741497674-611481863552'), $u('1511285560929-80b456fea0bc'), $u('1502920917128-1aa500764cbd')],
            'faq' => [['Jak szybko dostanę zdjęcia?', 'Wybrane kadry w 48 h, całość do 14 dni.'],
                ['Czy dojeżdżasz na sesje?', 'Tak, w promieniu 100 km dojazd gratis.']],
            'testimonials' => [['Karolina i Michał', 'Zdjęcia ze ślubu oglądamy do dziś ze łzami.'], ['Firma Nordex', 'Sesja biznesowa na najwyższym poziomie.']],
        ],
    ];
}

/** Buduje pełny spec landinga z szablonu branżowego + danych klienta CRM. */
function landing_from_template(string $key, array $client, string $slug): ?array
{
    $all = landing_templates_data();
    if (!isset($all[$key])) {
        return null;
    }
    $t = $all[$key];
    $vars = [
        '{firma}'  => $client['company'] !== '' ? $client['company'] : $client['name'],
        '{miasto}' => $client['city'] !== '' ? $client['city'] : 'Twoja okolica',
        '{oferta}' => $client['offer'] !== '' ? $client['offer'] : 'usługi w najlepszym wydaniu',
    ];
    $tr = fn(string $x): string => strtr($x, $vars);

    return [
        'slug' => $slug,
        'title' => $vars['{firma}'],
        'description' => $tr($t['sub']),
        'client_token' => (string)$client['token'],
        'theme' => $t['theme'],
        'sections' => [
            ['type' => 'hero', 'kicker' => $tr($t['kicker']), 'heading' => $t['heading'],
             'sub' => $tr($t['sub']), 'cta' => $t['cta'], 'image' => $t['hero']],
            ['type' => 'features', 'heading' => 'Dlaczego my?',
             'items' => array_map(fn($f) => ['icon' => $f[0], 'title' => $f[1], 'text' => $f[2]], $t['features'])],
            ['type' => 'stats',
             'items' => array_map(fn($x) => ['value' => $x[0], 'suffix' => $x[1], 'label' => $x[2]], $t['stats'])],
            ['type' => 'steps', 'heading' => 'Jak to działa?',
             'items' => array_map(fn($x) => ['title' => $x[0], 'text' => $x[1]], $t['steps'])],
            ['type' => 'gallery', 'heading' => 'Zobacz nasze realizacje', 'images' => $t['gallery']],
            ['type' => 'testimonials', 'heading' => 'Opinie klientów',
             'items' => array_map(fn($x) => ['name' => $x[0], 'text' => $x[1]], $t['testimonials'])],
            ['type' => 'pricing', 'heading' => 'Cennik',
             'items' => array_map(fn($x) => ['name' => $x[0], 'price' => $x[1], 'desc' => $x[2]], $t['pricing'])],
            ['type' => 'cta', 'heading' => 'Gotowy na pierwszy krok?',
             'sub' => 'Zostaw kontakt — odezwiemy się jeszcze dziś.', 'cta' => $t['cta']],
            ['type' => 'faq', 'heading' => 'Częste pytania',
             'items' => array_map(fn($x) => ['q' => $x[0], 'a' => $x[1]], $t['faq'])],
            ['type' => 'contact', 'heading' => 'Skontaktuj się', 'form' => true, 'cta' => $t['cta']],
        ],
    ];
}
