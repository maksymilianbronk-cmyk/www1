<?php
/**
 * XmlImporter — pobieranie i parsowanie plików XML polskich hurtowni.
 *
 * Obsługiwane formaty (auto-wykrywanie):
 *  - IOF / IOF 3.0 (Internet Offer Format — standard wielu polskich hurtowni),
 *  - format Ceneo (<offers><o ...>),
 *  - dowolny XML z powtarzalnym węzłem produktu (heurystyka nazw pól,
 *    PL i EN: nazwa/name, ean/kod_kreskowy, cena/price, stan/stock itd.),
 *  - własne mapowanie pól zdefiniowane przez użytkownika (JSON w panelu).
 *
 * Parsowanie odbywa się strumieniowo (XMLReader), więc pliki po 100+ MB
 * nie zapychają pamięci na hostingu współdzielonym.
 */
class XmlImporter
{
    const MAX_PRODUCTS = 20000;   // twardy limit bezpieczeństwa
    const SCAN_LIMIT   = 8000;    // ile elementów przejrzeć przy wykrywaniu węzła produktu

    /** Typowe nazwy węzła produktu w feedach hurtowni. */
    private static $productNodeNames = [
        'product', 'produkt', 'item', 'towar', 'artykul', 'article', 'o', 'entry', 'row', 'oferta',
    ];

    /** Kandydaci nazw pól: pole znormalizowane => lista nazw węzłów/atrybutów (lowercase). */
    private static $fieldCandidates = [
        'name'        => ['name', 'nazwa', 'title', 'tytul', 'product_name', 'nazwa_produktu', 'n'],
        'ean'         => ['ean', 'ean13', 'gtin', 'barcode', 'kod_kreskowy', 'kodkreskowy', 'kod_ean', 'eancode'],
        'sku'         => ['sku', 'symbol', 'kod', 'code', 'kod_produktu', 'index', 'indeks', 'id', 'catalog_number', 'nr_katalogowy'],
        'price_gross' => ['price_gross', 'cena_brutto', 'cenabrutto', 'gross', 'brutto', 'price', 'cena', 'cena_sprzedazy', 'retail_price', 'cena_detaliczna', 'srp', 'suggested_price'],
        'price_net'   => ['price_net', 'cena_netto', 'cenanetto', 'net', 'netto', 'wholesale_price', 'cena_hurtowa'],
        'vat'         => ['vat', 'stawka_vat', 'tax', 'podatek'],
        'stock'       => ['stock', 'quantity', 'qty', 'ilosc', 'stan', 'stan_magazynowy', 'magazyn', 'dostepnosc', 'avail', 'availability', 'amount'],
        'category'    => ['category', 'kategoria', 'cat', 'category_path', 'sciezka_kategorii', 'categories'],
        'producer'    => ['producer', 'producent', 'brand', 'marka', 'manufacturer', 'vendor'],
        'description' => ['description', 'opis', 'desc', 'long_desc', 'opis_dlugi', 'longdescription'],
        'unit'        => ['unit', 'jednostka', 'jm'],
        'weight'      => ['weight', 'waga'],
        'url'         => ['url', 'link', 'product_url'],
    ];

    /** Nazwy węzłów/atrybutów wskazujące na zdjęcia. */
    private static $imageNodeNames = [
        'img', 'imgs', 'image', 'images', 'photo', 'photos', 'foto', 'zdjecie', 'zdjecia', 'picture',
        'main', 'large', 'gallery', 'grafika', 'image_url', 'imageurl', 'zdjecie_url',
    ];

    /**
     * Pobiera plik XML z hurtowni na dysk (obsługa Basic Auth i gzip).
     * Zwraca ['ok'=>bool, 'file'=>path|null, 'error'=>string|null, 'bytes'=>int]
     */
    public static function download(string $url, string $login, string $password, string $destFile): array
    {
        $fp = fopen($destFile, 'w');
        if ($fp === false) {
            return ['ok' => false, 'error' => 'Nie można utworzyć pliku tymczasowego.'];
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_FILE           => $fp,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 5,
            CURLOPT_TIMEOUT        => 300,
            CURLOPT_CONNECTTIMEOUT => 20,
            CURLOPT_ENCODING       => '',                  // akceptuj gzip/deflate
            CURLOPT_USERAGENT      => 'AllegroManager/1.0 (+import XML hurtowni)',
        ]);
        if ($login !== '') {
            curl_setopt($ch, CURLOPT_USERPWD, $login . ':' . $password);
        }
        $ok   = curl_exec($ch);
        $err  = curl_error($ch);
        $http = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        fclose($fp);

        if ($ok === false) {
            @unlink($destFile);
            return ['ok' => false, 'error' => 'Błąd pobierania: ' . $err];
        }
        if ($http >= 400) {
            @unlink($destFile);
            return ['ok' => false, 'error' => 'Serwer hurtowni zwrócił HTTP ' . $http . ' (sprawdź adres i dane logowania).'];
        }
        $bytes = filesize($destFile);
        if ($bytes < 20) {
            @unlink($destFile);
            return ['ok' => false, 'error' => 'Pobrany plik jest pusty.'];
        }
        return ['ok' => true, 'file' => $destFile, 'bytes' => $bytes];
    }

    /**
     * Parsuje plik XML do znormalizowanej listy produktów.
     * $mapping — opcjonalne własne mapowanie:
     *   { "product_node": "produkt", "fields": { "name": "opis/nazwa", "price_gross": "@cena", ... } }
     * Zwraca ['ok'=>bool, 'format'=>string, 'products'=>[], 'warnings'=>[], 'error'=>?]
     */
    public static function parse(string $file, array $mapping = null): array
    {
        $productNode = $mapping['product_node'] ?? null;
        if (!$productNode) {
            $productNode = self::detectProductNode($file);
        }
        if (!$productNode) {
            return ['ok' => false, 'error' => 'Nie udało się wykryć węzła produktu w XML. Ustaw go ręcznie w mapowaniu (pole "product_node").'];
        }

        $reader = new XMLReader();
        if (!$reader->open($file, null, LIBXML_NOENT | LIBXML_NONET | LIBXML_COMPACT)) {
            return ['ok' => false, 'error' => 'Nie można otworzyć pliku XML.'];
        }

        $products = [];
        $warnings = [];
        $format   = self::detectFormatLabel($file, $productNode);
        $noPrice  = 0;
        $doc      = new DOMDocument('1.0', 'UTF-8');

        while ($reader->read()) {
            if ($reader->nodeType !== XMLReader::ELEMENT) {
                continue;
            }
            if (strcasecmp($reader->localName, $productNode) !== 0) {
                continue;
            }
            // expand() do wspólnego DOMDocument — inaczej simplexml_import_dom
            // odrzuca węzeł bez przypisanego dokumentu
            $dom = $reader->expand($doc);
            if ($dom === false) {
                continue;
            }
            $sx = simplexml_import_dom($dom);
            if ($sx === false) {
                continue;
            }
            $p = self::extractProduct($sx, $mapping);
            if ($p !== null) {
                if ($p['price_gross'] === null) {
                    $noPrice++;
                }
                $products[] = $p;
            }
            if (count($products) >= self::MAX_PRODUCTS) {
                $warnings[] = 'Osiągnięto limit ' . self::MAX_PRODUCTS . ' produktów — reszta pliku pominięta.';
                break;
            }
            // nie wchodź w głąb rozwiniętego węzła
            $reader->next();
        }
        $reader->close();

        if (!$products) {
            return ['ok' => false, 'error' => 'Nie znaleziono produktów w węzłach <' . $productNode . '>.'];
        }
        if ($noPrice > 0) {
            $warnings[] = $noPrice . ' produktów bez rozpoznanej ceny.';
        }
        $withEan = count(array_filter($products, function ($p) { return $p['ean'] !== ''; }));
        $warnings[] = 'Produkty z kodem EAN: ' . $withEan . ' / ' . count($products)
            . ' (tylko produkty z EAN można automatycznie dopasować do katalogu Allegro).';

        return ['ok' => true, 'format' => $format, 'products' => $products, 'warnings' => $warnings, 'product_node' => $productNode];
    }

    // ------------------------------------------------------------ detekcja

    /** Skanuje początek pliku i wybiera najczęstszy powtarzalny element produktu. */
    private static function detectProductNode(string $file)
    {
        $reader = new XMLReader();
        if (!$reader->open($file, null, LIBXML_NONET)) {
            return null;
        }
        $counts = [];
        $depths = [];
        $seen   = 0;
        while ($reader->read() && $seen < self::SCAN_LIMIT) {
            if ($reader->nodeType !== XMLReader::ELEMENT) {
                continue;
            }
            $seen++;
            $name = strtolower($reader->localName);
            if ($reader->depth >= 1 && $reader->depth <= 4) {
                $counts[$name] = ($counts[$name] ?? 0) + 1;
                if (!isset($depths[$name])) {
                    $depths[$name] = $reader->depth;
                }
            }
        }
        $reader->close();

        // 1. znana nazwa węzła produktu z >= 1 wystąpieniem
        $best = null;
        foreach (self::$productNodeNames as $known) {
            if (!empty($counts[$known])) {
                if ($best === null || $counts[$known] > $counts[$best]) {
                    $best = $known;
                }
            }
        }
        if ($best !== null) {
            return $best;
        }
        // 2. najczęstszy element na płytkiej głębokości (min. 3 wystąpienia)
        arsort($counts);
        foreach ($counts as $name => $cnt) {
            if ($cnt >= 3 && $depths[$name] <= 3) {
                return $name;
            }
        }
        return null;
    }

    private static function detectFormatLabel(string $file, string $productNode): string
    {
        $head = strtolower((string)file_get_contents($file, false, null, 0, 4096));
        if (strpos($head, '<offer') !== false && $productNode === 'product') {
            return 'IOF (Internet Offer Format)';
        }
        if ($productNode === 'o' && strpos($head, '<offers') !== false) {
            return 'Ceneo XML';
        }
        return 'XML (węzeł <' . $productNode . '>)';
    }

    // ----------------------------------------------------------- ekstrakcja

    /** Spłaszcza węzeł produktu do mapy: nazwa (lowercase) => wartość tekstowa. */
    private static function flatten(SimpleXMLElement $el, string $prefix, array &$out, int $depth = 0)
    {
        if ($depth > 4) {
            return;
        }
        foreach ($el->attributes() as $aName => $aVal) {
            $key = strtolower($prefix !== '' ? $prefix . '@' . $aName : '@' . $aName);
            // nie nadpisuj — kolejne wystąpienia (np. następne zdjęcia) pod kluczem z sufiksem
            if (isset($out[$key])) {
                $n = 2;
                while (isset($out[$key . '#' . $n])) { $n++; }
                $key .= '#' . $n;
            }
            $out[$key] = (string)$aVal;
            $short = '@' . strtolower($aName);
            if (!isset($out[$short])) {
                $out[$short] = (string)$aVal;
            }
        }
        $hasChildren = false;
        foreach ($el->children() as $cName => $child) {
            $hasChildren = true;
            $key = strtolower($prefix !== '' ? $prefix . '/' . $cName : $cName);
            self::flatten($child, $key, $out, $depth + 1);
            // skrócona nazwa (ostatni segment) — najczęściej po niej szukamy
            $short = strtolower($cName);
            $text  = trim((string)$child);
            if ($text !== '' && !isset($out[$short])) {
                $out[$short] = $text;
            }
        }
        if (!$hasChildren) {
            $text = trim((string)$el);
            if ($text !== '' && $prefix !== '') {
                if (!isset($out[strtolower($prefix)])) {
                    $out[strtolower($prefix)] = $text;
                }
            }
        }
    }

    /** Zwraca pierwszą wartość spośród kandydatów nazw pól. */
    private static function pick(array $flat, array $candidates)
    {
        foreach ($candidates as $c) {
            // kolejność: <cena>x</cena>, atrybut cena="x", <producer name="x"/>, <card url="x"/>
            foreach ([$c, '@' . $c, $c . '@name', $c . '@url'] as $key) {
                if (isset($flat[$key]) && trim($flat[$key]) !== '') {
                    return trim($flat[$key]);
                }
            }
        }
        return null;
    }

    /** Rozwiązuje ścieżkę własnego mapowania, np. "opis/nazwa", "@cena", "sizes/size@code". */
    private static function resolveMapped(SimpleXMLElement $el, string $path)
    {
        $attr = null;
        if (strpos($path, '@') !== false) {
            list($path, $attr) = explode('@', $path, 2);
        }
        $node = $el;
        if ($path !== '') {
            foreach (explode('/', trim($path, '/')) as $seg) {
                if ($seg === '') {
                    continue;
                }
                $node = $node->{$seg};
                if ($node === null || $node->count() === 0 && trim((string)$node) === '' && $attr === null) {
                    // węzeł może istnieć mimo count()==0 — sprawdzamy dalej na string
                }
                if ($node === null) {
                    return null;
                }
            }
        }
        if ($attr !== null) {
            $attrs = $node->attributes();
            return isset($attrs[$attr]) ? trim((string)$attrs[$attr]) : null;
        }
        $v = trim((string)$node);
        return $v !== '' ? $v : null;
    }

    private static function toNumber($val)
    {
        if ($val === null) {
            return null;
        }
        $v = str_replace([' ', "\xc2\xa0"], '', (string)$val);
        $v = str_replace(',', '.', $v);
        if (!preg_match('/-?\d+(\.\d+)?/', $v, $m)) {
            return null;
        }
        return (float)$m[0];
    }

    private static function extractProduct(SimpleXMLElement $sx, array $mapping = null)
    {
        $flat = [];
        self::flatten($sx, '', $flat);

        // pary <a name="EAN">wartość</a> / <attr name="Producent">…</attr>
        // (format Ceneo i podobne) — dokładamy do mapy pod nazwą z atrybutu
        foreach (($sx->xpath('.//*[@name]') ?: []) as $n) {
            $k = strtolower(str_replace(' ', '_', trim((string)$n['name'])));
            if ($k === '') {
                continue;
            }
            $v = trim((string)$n);
            if ($v === '') {
                foreach ($n->children() as $c) {
                    $v = trim((string)$c);
                    if ($v !== '') {
                        break;
                    }
                }
            }
            if ($v !== '' && !isset($flat[$k])) {
                $flat[$k] = $v;
            }
        }

        $fieldsMap = $mapping['fields'] ?? [];
        $get = function (string $field) use ($sx, $flat, $fieldsMap) {
            if (!empty($fieldsMap[$field])) {
                return self::resolveMapped($sx, $fieldsMap[$field]);
            }
            return self::pick($flat, self::$fieldCandidates[$field] ?? []);
        };

        $name = $get('name');
        if ($name === null || $name === '') {
            return null;
        }

        $priceGross = self::toNumber($get('price_gross'));
        $priceNet   = self::toNumber($get('price_net'));
        $vat        = self::toNumber($get('vat'));
        if ($priceGross === null && $priceNet !== null) {
            $rate = ($vat !== null && $vat > 1) ? $vat / 100 : ($vat !== null ? $vat : 0.23);
            $priceGross = round($priceNet * (1 + $rate), 2);
        }

        $stock = self::toNumber($get('stock'));
        $ean   = (string)($get('ean') ?? '');
        $ean   = preg_replace('/[^0-9]/', '', $ean);
        if (strlen($ean) < 8 || strlen($ean) > 14) {
            $ean = '';
        }

        $desc = (string)($get('description') ?? '');
        if (mb_strlen($desc) > 4000) {
            $desc = mb_substr($desc, 0, 4000) . '…';
        }

        return [
            'name'        => mb_substr(trim($name), 0, 300),
            'ean'         => $ean,
            'sku'         => (string)($get('sku') ?? ''),
            'price_gross' => $priceGross,
            'price_net'   => $priceNet,
            'vat'         => $vat,
            'stock'       => $stock !== null ? (int)$stock : null,
            'category'    => (string)($get('category') ?? ''),
            'producer'    => (string)($get('producer') ?? ''),
            'description' => $desc,
            'unit'        => (string)($get('unit') ?? ''),
            'url'         => (string)($get('url') ?? ''),
            'images'      => self::extractImages($flat),
        ];
    }

    /** Zbiera adresy URL zdjęć z węzłów/atrybutów o typowych nazwach. */
    private static function extractImages(array $flat): array
    {
        $images = [];
        foreach ($flat as $key => $val) {
            if (!is_string($val) || stripos($val, 'http') !== 0) {
                continue;
            }
            $isImageKey = false;
            foreach (self::$imageNodeNames as $imgName) {
                if (strpos($key, $imgName) !== false) {
                    $isImageKey = true;
                    break;
                }
            }
            $looksLikeImage = preg_match('/\.(jpe?g|png|webp|gif)(\?|$)/i', $val);
            if ($isImageKey || $looksLikeImage) {
                $images[$val] = true;
            }
            if (count($images) >= 16) {
                break;
            }
        }
        return array_keys($images);
    }
}
