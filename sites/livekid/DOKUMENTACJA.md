# KidBloom — odwrotna inżynieria systemu LiveKid

> Dokument roboczy: analiza funkcji systemu **LiveKid** (livekid.com) i specyfikacja
> własnego, samodzielnego odpowiednika o nazwie roboczej **KidBloom**.
> Implementacja: `sites/livekid/` — w pełni działający prototyp SPA (HTML/CSS/vanilla JS)
> z lokalnym „backendem" na `localStorage` i danymi demonstracyjnymi.

## 1. Czym jest LiveKid

LiveKid to najpopularniejszy w Polsce system do zarządzania **żłobkami i przedszkolami**.
Łączy w jednym miejscu:

- **komunikację** placówki z rodzicami (czaty, ogłoszenia, powiadomienia),
- **dziennik elektroniczny** (e-dziennik) i ewidencję obecności,
- **rozliczenia** (automatyczne faktury na podstawie obecności, płatności online),
- **dokumentację** (umowy, rekrutacja, RODO),
- **aplikację mobilną dla rodzica** oraz panel dla kadry i dyrektora.

Odbiorcy (role): **Rodzic**, **Nauczyciel/Kadra**, **Dyrektor/Właściciel**, **Samorząd**.

## 2. Zmapowane funkcje (na podstawie materiałów publicznych)

### 2.1. Rodzic (aplikacja mobilna / panel)
| Funkcja | Opis |
|---|---|
| Zgłaszanie nieobecności | Jednym kliknięciem, także z wyprzedzeniem; gwarancja poprawnego rozliczenia rachunku. |
| Posiłki / jadłospis | Zamawianie i planowanie niestandardowych posiłków, podgląd jadłospisu na kolejne dni. |
| Raport dzienny | Informacja o śnie, ilości zjedzonych posiłków, nastroju i aktywności dziecka. |
| Galeria zdjęć | Podgląd zdjęć z placówki z ochroną wizerunku dziecka. |
| Wiadomości | Czaty indywidualne i grupowe z dyrektorem oraz kadrą. |
| Plan dnia | Bieżący harmonogram zajęć i wydarzeń. |
| Ogłoszenia | Komunikaty od placówki zawsze pod ręką. |
| Płatności | Rachunki, faktury i płatności online (bramka typu Przelewy24). |
| Kalendarz | Wydarzenia, dni wolne, zebrania. |

### 2.2. Nauczyciel / Kadra
| Funkcja | Opis |
|---|---|
| Ewidencja obecności | Odnotowanie obecności, godzin przyjścia i wyjścia dziecka (ewidencja godzin). |
| Dziennik elektroniczny | Temat zajęć, opis, realizacja podstawy programowej, terminowość wpisów. |
| Raporty dzienne | Uzupełnianie raportu dla każdego dziecka (posiłki, sen, nastrój, notatki, zdjęcia). |
| Wiadomości | Komunikacja z rodzicami — czaty i szybkie powiadomienia. |
| Galeria | Dodawanie zdjęć do albumów grupy. |
| Jadłospis / plan dnia | Publikacja jadłospisu i planu dnia. |
| Wsparcie AI | Generowanie opisów zajęć, opisów galerii, treści wiadomości i ogłoszeń. |

### 2.3. Dyrektor / Właściciel
| Funkcja | Opis |
|---|---|
| Rekrutacja | Formularz zgłoszeniowy → dane automatycznie trafiają do umowy; dyrektor akceptuje. |
| Rozliczenia i faktury | Automatyczne zliczanie obecności, składników faktury, generowanie faktur VAT. |
| Raporty | Obecności, zaległości, płatności; eksport do Excela wg miesiąca/grupy. |
| Kadry | Weryfikacja pracy kadry przez raporty z e-dziennika, czas pracy specjalistów. |
| Dokumentacja | Umowy, zgody, zgodność z RODO i standardami ochrony małoletnich. |
| Ogłoszenia | Publikacja komunikatów do rodziców/kadry. |
| Kalendarz | Zarządzanie wydarzeniami placówki. |

### 2.4. Samorząd
Nadzór nad wieloma placówkami, rozliczanie dotacji, raporty zbiorcze. *(poza zakresem prototypu)*

## 3. Architektura prototypu KidBloom

```
sites/livekid/
├── index.html              # powłoka SPA + ekran logowania
├── assets/
│   ├── css/app.css         # design system (motyw mięta/teal, karty, komponenty)
│   └── js/
│       ├── seed.js         # model danych + „store" na localStorage + dane demo
│       └── app.js          # router SPA, widoki dla ról, logika modułów
└── DOKUMENTACJA.md         # ten dokument
```

- **Warstwa danych:** `KB.store` — CRUD na `localStorage` (klucz `kidbloom_v1`),
  z ziarnem danych (`seed.js`) generowanym przy pierwszym uruchomieniu.
  Reset: przycisk „Reset danych demo" w stopce panelu.
- **Uwierzytelnianie:** wybór roli/konta demo (bez realnych haseł) — Rodzic,
  Nauczyciel, Dyrektor. Sesja trzymana w `localStorage`.
- **Router:** hash-based (`#/rodzic/nieobecnosci`), renderowanie po stronie klienta.
- **Brak zależności zewnętrznych** — wszystko działa offline w przeglądarce.

## 4. Konta demo

| Rola | Login | Co widzi |
|---|---|---|
| Rodzic | Anna Kowalska | dziecko Zosia (grupa Motylki): raport, nieobecności, posiłki, galeria, czat, płatności |
| Nauczyciel | Magda Nowak | grupa Motylki: obecność, raporty dzienne, dziennik, galeria, jadłospis |
| Dyrektor | Ewa Zielińska | cała placówka: KPI, dzieci/umowy, rozliczenia, raporty, kadry, rekrutacja |

## 5. Import własnych danych (docelowo)

Prototyp trzyma dane lokalnie. Aby wczytać realne dane placówki (np. eksport z
własnego konta), przewidziany jest wejściowy format JSON zgodny z modelem w
`seed.js` (dzieci, grupy, obecności, faktury…). Funkcja „Importuj dane" w panelu
dyrektora przyjmuje taki plik i podmienia zawartość store'a.

> Uwaga: prototyp odwzorowuje **funkcje i przepływy** systemu, nie kopiuje kodu ani
> zasobów graficznych LiveKid. To niezależna, czysta implementacja od zera.

## 6. Źródła (materiały publiczne)

- livekid.com — strony: /pl/dla-rodzica, /pl/dla-dyrektora, /pl/dla-samorzadu,
  /pl/zarzadzanie, /pl/dziennik-elektroniczny, /features, /pricing
- opisy zewnętrzne: babyactiv.pl, scroll.morele.net, wtelnoszkola.edu.pl
</content>
</invoke>
