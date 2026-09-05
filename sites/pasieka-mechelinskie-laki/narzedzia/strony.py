# -*- coding: utf-8 -*-
"""Treść sześciu podstron Pasieki Mechelińskie Łąki.
Teksty i dane pochodzą od właściciela pasieki; miejsca wymagające potwierdzenia
zostały oznaczone komentarzami UZUPEŁNIĆ / SPRAWDZIĆ."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sztuka
from build import (BASE, FB, GOOGLE, MAPY, TEL, TEL_LINK, faq, ld_faq,
                   ld_okruszki, okruszki, strona)

ikona = sztuka.ikona
plaster = sztuka.plaster
kropla = sztuka.kropla_sep

# ---------------------------------------------------------------- dane miodów
MIODY = [
    {"nazwa": "Wielokwiatowy", "barwa": "#E2A93F", "sezon": "maj – lipiec", "od": 1, "do": 3,
     "opis": "Zapach łąki tuż po wschodzie słońca. Łagodny, uniwersalny — do herbaty, "
             "na pieczywo, dla dzieci.",
     "nuty": [("Aromat", "kwiatowy, świeży"), ("Smak", "łagodny, zrównoważony"),
              ("Krystalizacja", "po 2–4 miesiącach, drobna"), ("Podanie", "pieczywo, herbata")]},
    {"nazwa": "Rzepakowy", "barwa": "#F1DCA0", "sezon": "kwiecień – maj", "od": 0, "do": 1,
     "opis": "Jasny i szybko krystalizujący na kremową masę. Najlepiej smakuje wprost "
             "z łyżeczki.",
     "nuty": [("Aromat", "delikatny, lekko waniliowy"), ("Smak", "słodki, miękki"),
              ("Krystalizacja", "bardzo szybka, kremowa"), ("Podanie", "do smarowania")]},
    {"nazwa": "Lipowy", "barwa": "#E7C56A", "sezon": "lipiec", "od": 3, "do": 3,
     "opis": "Mocno aromatyczny, z lekką goryczką. Klasyczny wybór na jesienne wieczory "
             "z herbatą.",
     "nuty": [("Aromat", "kwiat lipy, chłodny"), ("Smak", "wyrazisty, z goryczką"),
              ("Krystalizacja", "po 2–3 miesiącach"), ("Podanie", "herbata, mleko")]},
    {"nazwa": "Gryczany", "barwa": "#6B3A17", "sezon": "lipiec – sierpień", "od": 3, "do": 4,
     "opis": "Ciemny, korzenny, o wyraźnym karmelowym posmaku. Miód dla tych, którzy lubią "
             "mocne smaki.",
     "nuty": [("Aromat", "kwiat gryki, słodowy"), ("Smak", "ostry, karmelowy finisz"),
              ("Krystalizacja", "szybka, ciemna masa"), ("Podanie", "pierniki, sosy")]},
    {"nazwa": "Spadziowy", "barwa": "#8A4416", "sezon": "lipiec – sierpień", "od": 3, "do": 4,
     "opis": "Ciemny, gęsty, żywiczny. Mało słodki, o smaku, który zostaje na długo.",
     "nuty": [("Aromat", "żywiczny, leśny"), ("Smak", "mało słodki, długi"),
              ("Krystalizacja", "powolna, kilka miesięcy"), ("Podanie", "sery, solo")]},
    {"nazwa": "Nawłociowy", "barwa": "#C98A2A", "sezon": "sierpień – wrzesień", "od": 4, "do": 5,
     "opis": "Ostatni miód sezonu, zbierany z sierpniowych nieużytków. Wyraźny, lekko kwaśny "
             "finisz.",
     "nuty": [("Aromat", "ziołowy, cierpki"), ("Smak", "wyrazisty, kwaskowy finisz"),
              ("Krystalizacja", "szybka, jasna masa"), ("Podanie", "jogurt, herbata")]},
]

FAKTY = [
    ("pin", "Bukszpanowa 4, Mosty", 'miodomat stoi przy posesji, gmina Kosakowo'),
    ("blik", "BLIK na %s" % TEL, "przelew na telefon, bez prowizji i terminala"),
    ("kropla", "Miód nierozgrzewany", "prosto po odwirowaniu i odstaniu do słoika"),
    ("tarcza", "Nr WNI 22114725", "sprzedaż bezpośrednia zarejestrowana u weterynarii"),
]


def pasek_faktow():
    pozycje = "".join(
        '<div class="fakt">%s<div><b>%s</b><span>%s</span></div></div>' % (ikona(i, "ico"), tytul, opis)
        for i, tytul, opis in FAKTY)
    return ('<section class="fakty" aria-label="Najważniejsze informacje o pasiece">'
            '%s<div class="wrap"><div class="fakty-siatka kaskada" data-anim data-krok="0.1">%s</div></div>'
            '</section>' % (plaster(), pozycje))


def karta_miodu(m):
    nuty = "".join('<li><b>%s</b><span>%s</span></li>' % (k, v) for k, v in m["nuty"])
    return ('<article class="miod-karta" style="--barwa:%s">'
            '<div class="miod-glowa"><span class="miod-kropla"></span>'
            '<div><h3>%s</h3><span class="miod-sezon">%s</span></div></div>'
            '<p>%s</p><ul class="miod-nuty">%s</ul></article>'
            % (m["barwa"], m["nazwa"], m["sezon"], m["opis"], nuty))


# ============================================================== strona główna
def index():
    kafle = [
        ("01", "miody.html", "sloiki-okno.webp", "Trzy słoiki jasnego miodu pod światło", "Miody",
         "Od jasnego rzepakowego po ciemną grykę. Odmiany zmieniają się w rytm kwitnienia.",
         "Zobacz odmiany"),
        ("02", "miodomat.html", "miodomat.webp",
         "Miodomat Pasieki Mechelińskie Łąki przy ulicy Bukszpanowej", "Miodomat",
         "Automat z miodem przy Bukszpanowej 4 w Mostach. Bierzesz słoik, płacisz BLIK-iem.",
         "Jak to działa"),
        ("03", "wosk-i-swiece.html", "swiece.webp", "Świece z wosku pszczelego w kształcie szyszek",
         "Wosk i świece",
         "Szyszki, świece rolowane z węzy i wosk w bloku dla rękodzielników.", "Zobacz wyroby"),
    ]
    kafle_html = "".join(
        '<a class="kafel" href="%s"><div class="kafel-foto"><span class="kafel-numer">%s</span>'
        '<img loading="lazy" src="img/%s" alt="%s" width="800" height="620"></div>'
        '<div class="kafel-tresc"><h3>%s</h3><p>%s</p>'
        '<span class="strzalka">%s %s</span></div></a>'
        % (link, nr, foto, alt, tytul, opis, tekst, ikona("strzalka", "ico"))
        for nr, link, foto, alt, tytul, opis, tekst in kafle)

    liczby = [("113 ha", "rezerwatu tuż przy pasiece"), ("6", "odmian w rytm kwitnienia"),
              ("40 °C", "granica, której nie przekraczam"), ("1 minuta", "tyle trwa zakup z automatu")]
    liczby_html = "".join('<div class="liczba"><b>%s</b><span>%s</span></div>' % (a, b) for a, b in liczby)

    return f"""
<section class="hero">
  {plaster()}
  <div class="lsnienie" aria-hidden="true"></div>
  <div class="pylek" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
  {sztuka.strumien()}
  {sztuka.krople_hero()}
  {sztuka.pszczola(1)}{sztuka.pszczola(2)}
  {sztuka.fala()}
  <div class="wrap hero-uklad">
    <div>
      <p class="oko wjazd" style="--op:.05s">Mosty · gmina Kosakowo · powiat pucki</p>
      <h1><span class="wjazd" style="--op:.15s">Miód z łąk</span><em class="wjazd" style="--op:.3s">nad samą zatoką</em></h1>
      <p class="lead wjazd" style="--op:.45s">Pasieka stoi tam, gdzie Pradolina Kaszubska kończy się plażą — przy rezerwacie
      Mechelińskie Łąki nad Zatoką Pucką. Pszczoły zbierają nektar ze słonawych łąk, trzcinowisk
      i przydomowych ogrodów. Stąd ten smak.</p>
      <div class="przyciski wjazd" style="--op:.6s">
        <a class="btn btn-miod" href="miodomat.html">{ikona("sloik", "ico")} Kup w miodomacie</a>
        <a class="btn btn-obrys" href="miody.html">Zobacz miody</a>
      </div>
      <p class="hero-podpis wjazd" style="--op:.75s">poleca Marek Kunc</p>
    </div>
    <figure class="hero-foto wjazd" style="--op:.35s">
      <span class="hero-odznaka">Sprzedaż bezpośrednia</span>
      <img src="img/pszczelarz.webp" alt="Marek Kunc przy stoisku z miodami Pasieki Mechelińskie Łąki"
           width="1500" height="1125" fetchpriority="high">
      <img class="pieczec" src="img/logo.webp" alt="Etykieta Pasieki Mechelińskie Łąki" width="132" height="132">
      <figcaption>Marek Kunc przy swoim stoisku — obok krąg wosku pszczelego z tegorocznej przetopki.</figcaption>
    </figure>
  </div>
</section>

{pasek_faktow()}

<section class="sec-papier2">
  <div class="wrap">
    <div class="szapo szapo--rozstrzelony" data-anim>
      <div class="rozdzial"><b>01</b>
        <div>
          <p class="oko">Co znajdziesz w pasiece</p>
          <h2>Miód, wosk i świece<br>z jednej pasieki</h2>
        </div>
      </div>
      <p class="lead">Wszystko z jednego miejsca, wszystko podpisane nazwiskiem. Odmiany zmieniają
      się w rytm kwitnienia, więc lista bywa krótsza pod koniec sezonu.</p>
    </div>
    <div class="kafle kaskada" data-anim>{kafle_html}</div>
  </div>
</section>

<section class="pas-foto">
  <img loading="lazy" src="img/sloiki-lada.webp" alt="Słoiki miodu ustawione na drewnianej ladzie" width="1500" height="1125">
  <div class="wrap">
    <p class="oko" data-anim>Prosto z odwirowania</p>
    <h2 data-anim>Nie pasteryzuję<br>i nie filtruję pod ciśnieniem</h2>
    <p data-anim>Miód wybieram dopiero wtedy, gdy pszczoły zasklepią go woskiem. Po odwirowaniu
    odstaje w odstojniku i trafia prosto do słoika — z ręcznie dopisaną odmianą na etykiecie.</p>
  </div>
</section>

<section class="pasmo">
  {plaster(10, 5, 58)}
  <div class="wrap">
    <div class="duo duo--7-5">
      <div data-anim>
        <div class="rozdzial"><b>02</b>
          <div>
            <p class="oko">Miodomat</p>
            <h2>Miód dostępny<br>bez umawiania się</h2>
          </div>
        </div>
        <p class="lead" style="margin-top:1.2rem">Przy posesji stoi miodomat — automat z chłodzoną
        szufladą, w którym zawsze czeka kilka słoików. Nie trzeba dzwonić ani czekać, aż wrócę z pasieki.</p>
        <ul class="dane">
          <li><b>Adres</b><span>Bukszpanowa 4, 81-198 Mosty</span></li>
          <li><b>Płatność</b><span>BLIK na numer <a href="{TEL_LINK}">{TEL}</a></span></li>
          <li><b>Pytania</b><span>Zadzwoń — chętnie doradzę odmianę</span></li>
        </ul>
        <div class="przyciski">
          <a class="btn btn-miod" href="miodomat.html">Więcej o miodomacie</a>
          <a class="btn btn-obrys" href="{MAPY}" target="_blank" rel="noopener">{ikona("pin", "ico")} Dojazd</a>
        </div>
      </div>
      <figure class="foto foto--pion" data-anim>
        <img loading="lazy" src="img/sloiki-samochod.webp"
             alt="Słoiki miodu ustawione na półkach w samochodzie pszczelarza" width="1050" height="1400">
        <figcaption>Zapas na wyjazd na jarmark — te same słoiki trafiają do miodomatu.</figcaption>
      </figure>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="duo duo--5-7">
      <div class="mapa-kadr" data-anim>{sztuka.mapa()}</div>
      <div data-anim>
        <div class="rozdzial"><b>03</b>
          <div>
            <p class="oko">Terroir</p>
            <h2>Pasieka nad<br>Zatoką Pucką</h2>
          </div>
        </div>
        <p class="lead" style="margin-top:1.2rem">Rezerwat Mechelińskie Łąki to 113 hektarów słonawych
        łąk, szuwarów i muraw na piasku, tuż przy brzegu zatoki. Rośnie tam roślinność, której nie
        znajdziesz w głębi kraju.</p>
        <p>Moje ule stoją w sąsiedztwie tych łąk, między ogrodami a pasem nadmorskim. Dlatego nawet
        wielokwiat z jednego roku nie smakuje dokładnie tak samo jak z poprzedniego.</p>
        <div class="przyciski"><a class="btn btn-linia" href="o-pasiece.html">Poznaj pasiekę</a></div>
      </div>
    </div>
    {kropla()}
    <div class="liczby kaskada" data-anim>{liczby_html}</div>
  </div>
</section>

<section class="pasmo ciasna">
  {plaster(9, 4, 64)}
  <div class="wrap">
    <div class="szapo szapo--rozstrzelony" style="margin-bottom:0;align-items:center">
      <div data-anim>
        <h2>Chcesz konkretną odmianę?</h2>
        <p class="lead" style="margin-top:.9rem">Zadzwoń przed przyjazdem — powiem, co akurat jest
        w słoikach i odłożę, jeśli trzeba.</p>
      </div>
      <div class="przyciski" style="margin:0" data-anim>
        <a class="btn btn-miod" href="{TEL_LINK}">{ikona("telefon", "ico")} {TEL}</a>
        <a class="btn btn-obrys" href="kontakt.html">Dane kontaktowe</a>
      </div>
    </div>
  </div>
</section>
"""


# ==================================================================== miody
def miody():
    karty = "".join(karta_miodu(m) for m in MIODY)
    kal = sztuka.kalendarz([(m["nazwa"], m["od"], m["do"], m["barwa"]) for m in MIODY])
    legenda = "".join('<span><i style="background:%s"></i>%s</span>' % (m["barwa"], m["nazwa"]) for m in MIODY)
    return f"""
<section class="hero-strona">
  {plaster(9, 4, 60)}
  <div class="wrap hero-strona-uklad">
    <div>
      {okruszki("Miody tego sezonu")}
      <h1>Miody tego sezonu</h1>
      <p class="lead">Każdy słoik podpisuję ręcznie, więc wiadomo, z którego miodobrania pochodzi.
      Odmiany zmieniają się w rytm kwitnienia — pod koniec sezonu lista bywa krótsza.</p>
    </div>
    <div class="przyciski" style="margin:0">
      <a class="btn btn-miod" href="miodomat.html">{ikona("sloik", "ico")} Kup w miodomacie</a>
    </div>
  </div>
</section>

<section class="ciasna">
  <div class="wrap">
    <div class="duo duo--5-7">
      <figure class="wyroznik" data-anim>
        <img src="img/gryka.webp" alt="Słoik miodu gryczanego z pasieki Mechelińskie Łąki"
             width="900" height="900" fetchpriority="high">
        <figcaption>Gryczany<small>ciemny, korzenny, o wyraźnym karmelowym posmaku</small></figcaption>
      </figure>
      <div data-anim>
        <div class="rozdzial"><b>01</b>
          <div>
            <p class="oko">Karta degustacyjna</p>
            <h2>Sześć odmian,<br>sześć różnych sezonów</h2>
          </div>
        </div>
        <p class="lead" style="margin-top:1.2rem">Miód odmianowy smakuje tym, co kwitło w promieniu
        lotu pszczoły. Poniżej opisuję, czego się spodziewać po każdej odmianie: aromatu, smaku,
        tempa krystalizacji i tego, do czego pasuje najlepiej.</p>
        <ul class="dane">
          <li><b>Słoiki</b><span>350 g, 900 g i 1,2 kg</span></li>
          <li><b>Etykieta</b><span>odmiana dopisana ręcznie przy każdym słoiku</span></li>
          <li><b>Dostępność</b><span>bieżący zapas stoi w miodomacie</span></li>
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- UZUPEŁNIĆ: potwierdzić odmiany i gramatury; ze zdjęć pewna jest tylko gryka -->
<section class="sec-papier2">
  <div class="wrap">
    <div class="miody-siatka kaskada" data-anim>{karty}</div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="szapo" data-anim>
      <div class="rozdzial"><b>02</b>
        <div>
          <p class="oko">Kalendarz miodobrania</p>
          <h2>Kiedy który miód</h2>
        </div>
      </div>
      <p class="lead" style="margin-top:1.1rem">Terminy przesuwa pogoda: chłodna wiosna potrafi
      opóźnić rzepak o dwa tygodnie, a susza skrócić kwitnienie lipy do kilku dni.</p>
    </div>
    <div data-anim>{kal}
      <div class="kalendarz-legenda">{legenda}</div>
    </div>
  </div>
</section>

<section class="pasmo">
  {plaster(10, 5, 56)}
  <div class="wrap">
    <div class="duo">
      <figure class="foto foto--pion" data-anim>
        <img loading="lazy" src="img/sloiki-okno.webp"
             alt="Trzy słoiki jasnego miodu ustawione pod światło" width="1050" height="1400">
        <figcaption>Świeżo zlany miód — jeszcze płynny, po kilku tygodniach zacznie krystalizować.</figcaption>
      </figure>
      <div data-anim>
        <div class="rozdzial"><b>03</b>
          <div>
            <p class="oko">Krystalizacja</p>
            <h2>Krystalizacja<br>to dobry znak</h2>
          </div>
        </div>
        <p style="margin-top:1.2rem">Każdy naturalny miód prędzej czy później zmienia się w masę —
        jedne odmiany po kilku tygodniach, inne po kilku miesiącach. To dowód, że miód nie był
        podgrzewany ani filtrowany pod ciśnieniem.</p>
        <p>Jeśli wolisz płynny, wstaw słoik do wody o temperaturze ciała i odczekaj. Powyżej 40 °C
        miód traci to, po co się go kupuje, więc nie warto się spieszyć.</p>
        <ul class="dane">
          <li><b>Przechowywanie</b><span>zamknięty słoik, ciemne miejsce, z dala od kaloryfera</span></li>
          <li><b>Czego unikać</b><span>wilgoci, obcych zapachów i wrzątku</span></li>
          <li><b>Termin</b><span>miód nie psuje się latami</span></li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="sec-piasek ciasna">
  <div class="wrap">
    <div class="szapo szapo--rozstrzelony" style="margin-bottom:0;align-items:center">
      <div data-anim>
        <h2>Miód kupisz o każdej porze</h2>
        <p class="lead" style="margin-top:.9rem">Wszystkie odmiany, które akurat mam, trafiają
        do miodomatu przy Bukszpanowej 4 w Mostach.</p>
      </div>
      <div class="przyciski" style="margin:0" data-anim>
        <a class="btn btn-ciemny" href="miodomat.html">Zobacz miodomat</a>
        <a class="btn btn-linia" href="{TEL_LINK}">{ikona("telefon", "ico")} {TEL}</a>
      </div>
    </div>
  </div>
</section>
"""


# ================================================================= miodomat
PYTANIA = [
    ("Skąd wiem, jaki miód jest w środku?",
     "Odmiana jest dopisana ręcznie na etykiecie każdego słoika. Jeśli zależy Ci na konkretnej — "
     "zadzwoń przed przyjazdem, powiem, co akurat stoi w automacie."),
    ("Czy miód w automacie się nie zepsuje?",
     "Miód jest produktem, który nie psuje się latami — potrzebuje tylko zamkniętego słoika i braku "
     "wilgoci. W automacie stoi w cieniu i w stałej temperaturze."),
    ("Dlaczego miód w słoiku jest gęsty albo ziarnisty?",
     "Bo krystalizuje, czyli zachowuje się tak, jak powinien naturalny, niepodgrzewany miód. "
     "Wystarczy podgrzać słoik w ciepłej wodzie, nie przekraczając 40 °C."),
    ("Mogę kupić większą ilość, na prezenty albo do firmy?",
     "Tak, ale wtedy lepiej wcześniej zadzwonić — do automatu wkładam bieżący zapas, a większe "
     "zamówienie przygotuję osobno."),
    ("Czy dostanę paragon?",
     "Przy sprzedaży bezpośredniej potwierdzeniem jest przelew BLIK w Twojej aplikacji. "
     "Jeśli potrzebujesz dokumentu do firmy, napisz lub zadzwoń."),
]


def miodomat():
    kroki = [
        ("Wybierz słoik", "Zajrzyj do szuflady i sprawdź etykietę — na każdej jest ręcznie dopisana "
                          "odmiana i gramatura."),
        ("Zapłać BLIK-iem", "Przelew na telefon: %s. W tytule wpisz, co bierzesz, np. „gryka 900 g”." % TEL),
        ("Zabierz miód", "Wyjmij słoik i zamknij szufladę. Potwierdzenie przelewu zostaje "
                         "na Twoim telefonie."),
    ]
    kroki_html = "".join("<li><h3>%s</h3><p>%s</p></li>" % k for k in kroki)
    return f"""
<section class="hero-strona">
  {plaster(9, 4, 60)}
  <div class="wrap hero-strona-uklad">
    <div>
      {okruszki("Miodomat w Mostach")}
      <h1>Miodomat<br>w Mostach</h1>
      <p class="lead">Automat z miodem przy Bukszpanowej 4. Bierzesz słoik, płacisz BLIK-iem
      na {TEL} i jedziesz dalej.</p>
    </div>
    <div class="przyciski" style="margin:0">
      <a class="btn btn-miod" href="{MAPY}" target="_blank" rel="noopener">{ikona("pin", "ico")} Otwórz w mapach</a>
    </div>
  </div>
</section>

<section class="ciasna">
  <div class="wrap">
    <div class="duo duo--5-7">
      <figure class="foto foto--pion" data-anim>
        <img src="img/miodomat.webp"
             alt="Miodomat Pasieki Mechelińskie Łąki stojący przy ogrodzeniu w Mostach"
             width="720" height="960" fetchpriority="high">
        <figcaption>Miodomat przy Bukszpanowej 4 w Mostach.</figcaption>
      </figure>
      <div data-anim>
        <div class="rozdzial"><b>01</b>
          <div>
            <p class="oko">Sprzedaż bezpośrednia</p>
            <h2>Co to jest miodomat</h2>
          </div>
        </div>
        <p style="margin-top:1.2rem">To niewielki automat sprzedający — taki, jakie stoją przy
        gospodarstwach z jajkami czy mlekiem — tyle że w środku są słoiki miodu prosto z mojej
        pasieki. Stoi przy posesji, więc nie musisz się ze mną umawiać ani czekać, aż wrócę z pola.</p>
        <p>W szufladzie leżą gotowe słoiki z etykietą i ręcznie dopisaną odmianą. Wybierasz, płacisz
        BLIK-iem na mój numer i zabierasz. Cała transakcja trwa minutę i nie wymaga kontaktu ze mną —
        choć jeśli akurat jestem w domu, chętnie porozmawiam o pszczołach.</p>
        <p>To sprzedaż bezpośrednia zarejestrowana u powiatowego lekarza weterynarii: numery WNI
        i WET z tabliczki to dokładnie ten sam wpis, który pozwala mi sprzedawać miód na jarmarkach.</p>
      </div>
    </div>
  </div>
</section>

<section class="pasmo">
  {plaster(10, 5, 58)}
  <div class="wrap">
    <div class="szapo" data-anim>
      <div class="rozdzial"><b>02</b>
        <div>
          <p class="oko">Trzy kroki</p>
          <h2>Jak kupić miód z automatu</h2>
        </div>
      </div>
      <p class="lead" style="margin-top:1.1rem">Bez aplikacji, bez rejestracji, bez czekania.</p>
    </div>
    <ol class="kroki kaskada" data-anim>{kroki_html}</ol>
    <div class="duo duo--gora odstep-gora">
      <div data-anim>
        <h3 style="font-size:1.45rem;margin-bottom:.9rem">Płatność BLIK na telefon</h3>
        <div class="blik">
          <b>{TEL}</b>
          <p>Przelew na numer telefonu w aplikacji Twojego banku. Bez prowizji, bez terminala.</p>
        </div>
        <p style="margin-top:1.3rem">Nie masz BLIK-a? Zadzwoń pod ten sam numer — dogadamy się
        na miejscu.</p>
      </div>
      <figure class="foto foto--pion" data-anim>
        <img loading="lazy" src="img/miodomat-tablica.webp"
             alt="Tabliczka miodomatu z adresem, numerami rejestrowymi i numerem do płatności BLIK"
             width="735" height="1185">
        <figcaption>Tabliczka na automacie: adres, numery rejestrowe i numer do BLIK-a.</figcaption>
      </figure>
    </div>
  </div>
</section>

<!-- UZUPEŁNIĆ: godziny dostępności automatu, aktualny asortyment i ceny -->
<section>
  <div class="wrap">
    <div class="duo">
      <div data-anim>
        <div class="rozdzial"><b>03</b>
          <div>
            <p class="oko">Adres i dane</p>
            <h2>Gdzie stoi automat</h2>
          </div>
        </div>
        <ul class="dane" style="margin-top:1.4rem">
          <li><b>Adres</b><span>Bukszpanowa 4, 81-198 Mosty (gmina Kosakowo)</span></li>
          <li><b>Sprzedawca</b><span>Marek Kunc, Pasieka „Mechelińskie Łąki”</span></li>
          <li><b>Płatność</b><span>BLIK na telefon <a href="{TEL_LINK}">{TEL}</a></span></li>
          <li><b>Nr WNI</b><span>22114725</span></li>
          <li><b>Nr WET</b><span>22115688</span></li>
        </ul>
        <div class="przyciski">
          <a class="btn btn-ciemny" href="{MAPY}" target="_blank" rel="noopener">{ikona("pin", "ico")} Otwórz w mapach</a>
          <a class="btn btn-linia" href="{TEL_LINK}">{ikona("telefon", "ico")} Zadzwoń</a>
        </div>
      </div>
      <div data-anim>
        <h2 style="margin-bottom:1.4rem">Częste pytania</h2>
        {faq(PYTANIA)}
      </div>
    </div>
  </div>
</section>
"""


# ============================================================ wosk i świece
def wosk():
    karty = [
        ("swiece.webp", "Świece z wosku pszczelego w kształcie szyszek", "Szyszki z wosku",
         "Odlewane w formie, palą się spokojnym, ciepłym płomieniem. Dwa rozmiary — mniejsze dobrze "
         "wyglądają w komplecie.", "10–20 zł"),
        ("swiece-krata.webp", "Świece rolowane z węzy i świeca z plastra na stoisku", "Świece z węzy",
         "Rolowane ręcznie z arkusza węzy: cienkie stożki i grubsze walce w plaster miodu. "
         "Bez domieszki parafiny.", "15–20 zł"),
        ("wosk.webp", "Krąg czystego wosku pszczelego", "Wosk w bloku",
         "Czysty, przetopiony wosk dla rękodzielników, mydlarzy i pszczelarzy. Odcinam kawałek "
         "o wadze, jakiej potrzebujesz.", "cena za kilogram — zapytaj"),
    ]
    # karta prowadzi do telefonu — asortyment i wielkości potwierdzam na miejscu
    karty_html = "".join(
        '<a class="kafel" href="%s"><div class="kafel-foto">'
        '<img loading="lazy" src="img/%s" alt="%s" width="1000" height="760"></div>'
        '<div class="kafel-tresc"><h3>%s</h3><p>%s</p>'
        '<span class="strzalka">%s %s</span></div></a>' % (TEL_LINK, foto, alt, tytul, opis, cena,
                                                           ikona("telefon", "ico"))
        for foto, alt, tytul, opis, cena in karty)
    return f"""
<section class="hero-strona">
  {plaster(9, 4, 60)}
  <div class="wrap hero-strona-uklad">
    <div>
      {okruszki("Wosk pszczeli i świece")}
      <h1>Wosk pszczeli<br>i świece</h1>
      <p class="lead">Świece rolowane z węzy, szyszki odlewane w formie i czysty wosk w bloku —
      wszystko z własnej przetopki.</p>
    </div>
    <div class="przyciski" style="margin:0">
      <a class="btn btn-miod" href="{TEL_LINK}">{ikona("telefon", "ico")} Zapytaj o dostępność</a>
    </div>
  </div>
</section>

<section class="ciasna">
  <div class="wrap">
    <div class="szapo szapo--rozstrzelony" data-anim>
      <div class="rozdzial"><b>01</b>
        <div>
          <p class="oko">Z jednego ula</p>
          <h2>Nie tylko miód</h2>
        </div>
      </div>
      <p class="lead">Wosk przetapiam sam z odsklepin i starych plastrów. Część wraca do uli jako
      węza, z reszty powstają świece, które pachną pasieką, a nie perfumami.</p>
    </div>
    <div class="kafle kaskada" data-anim>{karty_html}</div>
    <!-- UZUPEŁNIĆ: aktualne ceny świec i wosku -->
    <p class="cicho" style="margin-top:1.6rem">Ceny orientacyjne — po aktualną dostępność
      i wielkości zadzwoń: <a href="{TEL_LINK}">{TEL}</a>.</p>
  </div>
</section>

<section class="pasmo">
  {plaster(10, 5, 58)}
  <div class="wrap">
    <div class="duo duo--7-5">
      <div data-anim>
        <div class="rozdzial"><b>02</b>
          <div>
            <p class="oko">Instrukcja</p>
            <h2>Jak palić świecę<br>z wosku</h2>
          </div>
        </div>
        <p style="margin-top:1.2rem">Wosk pszczeli pali się dłużej i spokojniej niż parafina, ale
        lubi równe warunki. Przy pierwszym zapaleniu daj świecy popracować, aż roztopiona kałuża
        sięgnie brzegów — wtedy będzie wypalać się równo do końca.</p>
        <p>Knot skracaj do około pół centymetra przed każdym zapaleniem. Świecę stawiaj z dala
        od przeciągów, na niepalnej podstawce.</p>
        <p>Wosk z czasem pokrywa się białawym nalotem. To nie pleśń, tylko naturalny wykwit —
        wystarczy przetrzeć miękką ściereczką.</p>
      </div>
      <figure class="foto foto--poziom" data-anim>
        <img loading="lazy" src="img/swiece.webp"
             alt="Dwie świece w kształcie szyszek z wosku pszczelego" width="1500" height="1125">
        <figcaption>Szyszki odlewane w formie — z wosku z własnej przetopki.</figcaption>
      </figure>
    </div>
  </div>
</section>
"""


# ================================================================ o pasiece
def o_pasiece():
    kroki = [
        ("Kwitnienie", "Ule stają tam, gdzie akurat trwa pożytek: rzepak, sady, lipy, latem łąki i nawłoć."),
        ("Miodobranie", "Ramki wyjmuję dopiero wtedy, gdy pszczoły zasklepią miód woskiem. To ich znak, "
                        "że jest dojrzały."),
        ("Słoik", "Odsklepiny idą do przetopki na wosk, miód po odwirowaniu i odstaniu trafia prosto "
                  "do słoika."),
    ]
    kroki_html = "".join("<li><h3>%s</h3><p>%s</p></li>" % k for k in kroki)
    galeria = [
        ("sloiki-lada.webp", "Słoiki miodu na drewnianej ladzie"),
        ("sloiki-okno.webp", "Trzy słoiki jasnego miodu pod światło"),
        ("sloiki-samochod.webp", "Słoiki miodu na półkach w samochodzie"),
        ("stoisko.webp", "Stoisko z banerem „Tutaj kupisz naturalne miody”"),
        ("sloiki-trio.webp", "Trzy słoiki miodu w drewnianej skrzynce"),
        ("sloiki-grupa.webp", "Zestaw słoików miodu w różnych wielkościach"),
        ("swiece.webp", "Świece z wosku pszczelego w kształcie szyszek"),
        ("miodomat.webp", "Miodomat przy Bukszpanowej 4 w Mostach"),
    ]
    galeria_html = "".join(
        '<button type="button" aria-label="Powiększ: %s"><img loading="lazy" src="img/%s" alt="%s" '
        'width="900" height="900"></button>' % (alt, foto, alt) for foto, alt in galeria)
    return f"""
<section class="hero-strona">
  {plaster(9, 4, 60)}
  <div class="wrap hero-strona-uklad">
    <div>
      {okruszki("Pasieka Mechelińskie Łąki")}
      <h1>Pasieka<br>Mechelińskie Łąki</h1>
      <p class="lead">Ule nad Zatoką Pucką, przy rezerwacie, w którym rosną rośliny znoszące
      zasolenie. Prowadzi Marek Kunc.</p>
    </div>
    <div class="przyciski" style="margin:0">
      <a class="btn btn-miod" href="miody.html">Zobacz miody</a>
    </div>
  </div>
</section>

<section class="ciasna">
  <div class="wrap">
    <div class="duo duo--7-5">
      <div data-anim>
        <div class="rozdzial"><b>01</b>
          <div>
            <p class="oko">Terroir</p>
            <h2>Skąd bierze się<br>ten smak</h2>
          </div>
        </div>
        <p class="lead" style="margin-top:1.2rem">Mechelińskie Łąki to 113 hektarów rezerwatu tuż przy
        brzegu Zatoki Puckiej: słonawe łąki, szuwary trzcinowe, murawy na piasku. Rośnie tam
        roślinność, której nie znajdziesz w głębi kraju, bo znosi zasolenie wody.</p>
        <p>Moje ule stoją w sąsiedztwie tych łąk, między ogrodami a pasem nadmorskim. Pszczoły
        odwiedzają w ciągu sezonu wierzby, drzewa owocowe, lipy, rzepak, a późnym latem nawłoć
        z nieużytków. Dlatego nawet wielokwiat z jednego roku nie smakuje dokładnie tak samo
        jak z poprzedniego.</p>
        <p>Miód wybieram, gdy jest dojrzały i zasklepiony — nie wcześniej. Odwirowany trafia
        do odstojnika, a potem prosto do słoika. Nie pasteryzuję go i nie filtruję pod ciśnieniem.</p>
        <!-- SPRAWDZIĆ: dokładne brzmienie zdania z etykiety -->
        <blockquote class="cytat">Trudno powiedzieć z czego, ale na pewno wyjątkowy.
          <footer>napis z etykiety Pasieki Mechelińskie Łąki</footer></blockquote>
      </div>
      <figure class="foto foto--pion" data-anim>
        <img src="img/pszczola-etykieta.webp" alt="Pszczoła siedząca na etykiecie słoika miodu"
             width="1500" height="1125" fetchpriority="high">
        <figcaption>Zdarza się, że pszczoła siada na własnym portrecie z etykiety.</figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="pasmo">
  {plaster(10, 5, 58)}
  <div class="wrap">
    <div class="szapo" data-anim>
      <div class="rozdzial"><b>02</b>
        <div>
          <p class="oko">Sezon</p>
          <h2>Od ula do słoika</h2>
        </div>
      </div>
      <p class="lead" style="margin-top:1.1rem">Cały sezon sprowadza się do kilku momentów,
      w których nie można się spieszyć.</p>
    </div>
    <ol class="kroki kaskada" data-anim>{kroki_html}</ol>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="szapo szapo--rozstrzelony" data-anim>
      <div class="rozdzial"><b>03</b>
        <div>
          <p class="oko">Galeria</p>
          <h2>Z pasieki i ze stoiska</h2>
        </div>
      </div>
      <p class="lead">Kliknij zdjęcie, żeby je powiększyć.</p>
    </div>
    <div class="galeria kaskada" data-anim>{galeria_html}</div>
  </div>
</section>
"""


# ================================================================== kontakt
def kontakt():
    return f"""
<section class="hero-strona">
  {plaster(9, 4, 60)}
  <div class="wrap hero-strona-uklad">
    <div>
      {okruszki("Kontakt")}
      <h1>Kontakt</h1>
      <p class="lead">Marek Kunc, Bukszpanowa 4, 81-198 Mosty. Telefon i BLIK: {TEL}.</p>
    </div>
    <div class="przyciski" style="margin:0">
      <a class="btn btn-miod" href="{TEL_LINK}">{ikona("telefon", "ico")} Zadzwoń</a>
    </div>
  </div>
</section>

<section class="ciasna">
  <div class="wrap">
    <div class="duo duo--7-5">
      <div data-anim>
        <div class="rozdzial"><b>01</b>
          <div>
            <p class="oko">Napisz albo przyjedź</p>
            <h2>Najszybciej<br>złapiesz mnie telefonicznie</h2>
          </div>
        </div>
        <p class="lead" style="margin-top:1.2rem">Miód czeka w miodomacie przy posesji, a większe
        zamówienia przygotuję po wcześniejszym telefonie.</p>
        <ul class="dane">
          <li><b>Telefon</b><span><a href="{TEL_LINK}">{TEL}</a></span></li>
          <li><b>BLIK</b><span>przelew na numer {TEL}</span></li>
          <li><b>Adres</b><span>Bukszpanowa 4, 81-198 Mosty, gmina Kosakowo</span></li>
          <li><b>Sprzedawca</b><span>Marek Kunc, Pasieka „Mechelińskie Łąki”</span></li>
          <li><b>Nr WNI / WET</b><span>22114725 / 22115688</span></li>
          <li><b>W sieci</b><span><a href="{FB}" target="_blank" rel="noopener">Facebook</a> ·
            <a href="{GOOGLE}" target="_blank" rel="noopener">wizytówka Google</a></span></li>
        </ul>
        <!-- UZUPEŁNIĆ: adres e-mail, godziny odbioru osobistego, terminy jarmarków -->
        <div class="przyciski">
          <a class="btn btn-ciemny" href="{TEL_LINK}">{ikona("telefon", "ico")} Zadzwoń</a>
          <a class="btn btn-linia" href="{MAPY}" target="_blank" rel="noopener">{ikona("pin", "ico")} Dojazd</a>
        </div>
      </div>
      <figure class="foto foto--pion" data-anim>
        <img src="img/stoisko.webp"
             alt="Stoisko Pasieki Mechelińskie Łąki z banerem „Tutaj kupisz naturalne miody”"
             width="1125" height="1500" fetchpriority="high">
        <figcaption>Na jarmarkach szukaj tego banera — terminy podaję na Facebooku.</figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="pasmo ciasna">
  {plaster(9, 4, 62)}
  <div class="wrap">
    <div class="duo duo--5-7">
      <div data-anim>{sztuka.mapa()}</div>
      <div data-anim>
        <div class="rozdzial"><b>02</b>
          <div>
            <p class="oko">Dojazd</p>
            <h2>Jak trafić<br>do miodomatu</h2>
          </div>
        </div>
        <p style="margin-top:1.2rem">Mosty leżą w gminie Kosakowo, kilka minut od Rewy i rezerwatu
        Mechelińskie Łąki. Automat stoi przy posesji od strony ulicy — widać go z drogi.</p>
        <ul class="dane">
          <li><b>Nawigacja</b><span><a href="{MAPY}" target="_blank" rel="noopener">Bukszpanowa 4, 81-198 Mosty</a></span></li>
          <li><b>Płatność</b><span>BLIK na telefon {TEL}</span></li>
        </ul>
        <div class="przyciski">
          <a class="btn btn-miod" href="{MAPY}" target="_blank" rel="noopener">{ikona("pin", "ico")} Otwórz w mapach</a>
        </div>
      </div>
    </div>
  </div>
</section>
"""


# =================================================================== zapis
if __name__ == "__main__":
    print("Generuję podstrony:")
    strona("index.html",
           "Pasieka Mechelińskie Łąki — naturalny miód znad Zatoki Puckiej",
           "Naturalny miód, wosk pszczeli i świece z węzy prosto z pasieki Marka Kunca w Mostach. "
           "Miodomat czynny samoobsługowo, płatność BLIK.",
           "og.jpg", "Marek Kunc przy stoisku z miodami Pasieki Mechelińskie Łąki",
           "pszczelarz.webp", index(), jasny_naglowek=True,
           ld_extra=[{"@type": "WebSite", "@id": BASE + "#strona", "url": BASE,
                      "name": "Pasieka Mechelińskie Łąki", "inLanguage": "pl-PL",
                      "publisher": {"@id": BASE + "#pasieka"}}])
    strona("miody.html", "Miody — Pasieka Mechelińskie Łąki",
           "Odmiany miodu z pasieki nad Zatoką Pucką: gryczany, wielokwiatowy, rzepakowy, lipowy, "
           "spadziowy, nawłociowy. Karty degustacyjne i kalendarz miodobrania.",
           "og-miody.jpg", "Słoiki miodu z Pasieki Mechelińskie Łąki pod światło",
           "gryka.webp", miody(),
           ld_extra=[ld_okruszki("Miody tego sezonu", BASE + "miody.html")])
    strona("miodomat.html", "Miodomat w Mostach — miód z automatu | Mechelińskie Łąki",
           "Miodomat przy ul. Bukszpanowej 4 w Mostach. Sprzedaż bezpośrednia miodu z pasieki, "
           "płatność BLIK na numer 600 192 252.",
           "og-miodomat.jpg", "Miodomat Pasieki Mechelińskie Łąki przy Bukszpanowej 4 w Mostach",
           "miodomat.webp", miodomat(),
           ld_extra=[ld_okruszki("Miodomat w Mostach", BASE + "miodomat.html"), ld_faq(PYTANIA)])
    strona("wosk-i-swiece.html", "Wosk pszczeli i świece z węzy — Mechelińskie Łąki",
           "Świece rolowane z węzy, szyszki z wosku pszczelego i wosk w bloku z własnej przetopki "
           "pasieki znad Zatoki Puckiej.",
           "og-wosk.jpg", "Świece z wosku pszczelego w kształcie szyszek",
           "swiece.webp", wosk(),
           ld_extra=[ld_okruszki("Wosk pszczeli i świece", BASE + "wosk-i-swiece.html")])
    strona("o-pasiece.html", "O pasiece — Mechelińskie Łąki nad Zatoką Pucką",
           "Pasieka Marka Kunca przy rezerwacie Mechelińskie Łąki: 113 hektarów słonawych łąk, "
           "droga od ula do słoika i galeria zdjęć z pasieki.",
           "og-pasieka.jpg", "Pszczoła siedząca na etykiecie słoika miodu",
           "pszczola-etykieta.webp", o_pasiece(),
           ld_extra=[ld_okruszki("Pasieka Mechelińskie Łąki", BASE + "o-pasiece.html")])
    strona("kontakt.html", "Kontakt — Pasieka Mechelińskie Łąki, Mosty",
           "Marek Kunc, Pasieka Mechelińskie Łąki: Bukszpanowa 4 w Mostach, telefon i BLIK "
           "600 192 252, numery WNI i WET oraz dojazd do miodomatu.",
           "og-kontakt.jpg", "Stoisko Pasieki Mechelińskie Łąki z banerem naturalne miody",
           "stoisko.webp", kontakt(),
           ld_extra=[ld_okruszki("Kontakt", BASE + "kontakt.html")])
    print("gotowe")
