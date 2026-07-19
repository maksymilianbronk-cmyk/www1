# Audyt funkcji: LiveKid → KidBloom

> Porównanie funkcji systemu **LiveKid** (na podstawie materiałów publicznych:
> livekid.com/pl/dla-rodzica, /dla-nauczyciela, /dla-dyrektora, /dla-wlasciciela,
> /dla-samorzadu, /zarzadzanie, /dziennik-elektroniczny, /features, /pl/faq/rozliczenia,
> /pl/materialy, group-management, staff) z naszą implementacją **KidBloom**.
>
> Legenda: ✅ zaimplementowane · 🟡 częściowo · ⬜ do zrobienia

## 1. Komunikacja
| Funkcja LiveKid | Status | Gdzie w KidBloom |
|---|---|---|
| Czaty indywidualne i grupowe | ✅ | Wiadomości (rodzic, nauczyciel, specjalista) |
| Ogłoszenia / wirtualna tablica | ✅ | Ogłoszenia (kategorie, przypinanie) |
| Powiadomienia (push) | ✅ | Dzwonek powiadomień w topbarze |
| Zdjęcia i filmy z zajęć | ✅ | Galeria (albumy grupy) |
| Aktualności | ✅ | Ogłoszenia + pulpit |

## 2. Dziennik i dokumentacja pedagogiczna
| Funkcja LiveKid | Status | Gdzie |
|---|---|---|
| Dziennik elektroniczny (zgodny z MEN) | ✅ | Dziennik elektroniczny |
| Dziennik specjalisty | ✅ | Rola Specjalista → Dziennik sesji |
| Ewidencja obecności i godzin | ✅ | Obecność (przyjście/wyjście) |
| Raporty dzienne | ✅ | Raporty dzienne (nastrój, sen, posiłki) |
| Realizacja podstawy programowej | ✅ | Wpisy dziennika (obszar podstawy) |
| Diagnoza przedszkolna (wykres realizacji) | ✅ | Nauczyciel → Diagnoza (donut obszarów I–IV) |
| Obserwacje / arkusze obserwacji | ✅ | Obserwacje + arkusz w Materiałach |
| Plan dnia | ✅ | Plan dnia (timeline) |
| Plan zajęć (grupowych/indywidualnych) | 🟡 | Harmonogram specjalisty; zajęcia dodatkowe |

## 3. Rozliczenia i płatności
| Funkcja LiveKid | Status | Gdzie |
|---|---|---|
| Automatyczne faktury z obecności | ✅ | Rozliczenia → „Przelicz z obecności" |
| Płatności online (bramka) | ✅ | Płatności (demo Przelewy24) |
| Faktura rozbita na elementy (czesne/wyżywienie/zajęcia) | ✅ | Faktury — pozycje składowe + zajęcia dodatkowe |
| Zajęcia dodatkowe doliczane do rachunku | ✅ | Zapis na zajęcia → pozycja w fakturze |
| Saldo konta: nadpłaty / niedopłaty | ✅ | Płatności → karta „Saldo" |
| Odsetki / opłaty za zwłokę | ✅ | Faktury po terminie → naliczone odsetki |
| Zamawianie posiłków (catering) | ✅ | Posiłki i jadłospis |
| Eksport zestawień (CSV) | ✅ | Rozliczenia, Raporty |

## 4. Zarządzanie placówką
| Funkcja LiveKid | Status | Gdzie |
|---|---|---|
| Grupy, przypisanie dzieci, sale | ✅ | Grupy (sala, wychowawca) |
| Karty dzieci | ✅ | Profil dziecka / drill-down |
| Kadry: obecność, urlopy, grafik | ✅ | Kadry (zakładki: grafik, nieobecności) |
| Kalendarz / wydarzenia (wycieczki, występy) | ✅ | Kalendarz |
| Ustawienia placówki | ✅ | Ustawienia i dane |
| Import/eksport danych | ✅ | Ustawienia → JSON |

## 5. Rekrutacja i dokumenty
| Funkcja LiveKid | Status | Gdzie |
|---|---|---|
| Rekrutacja (formularz → akceptacja → dane) | ✅ | Rekrutacja (etapy, przyjęcie tworzy umowę) |
| Umowy elektroniczne + e-podpis | ✅ | Rekrutacja/Dokumenty → status podpisu |
| Upoważnienia do odbioru dziecka | ✅ | Rodzic → Dokumenty → Upoważnienia |
| Zgody elektroniczne (RODO, wizerunek) | ✅ | Dokumenty i zgody |
| Ewidencja dokumentów | ✅ | Dyrektor → Dokumenty |

## 6. Właściciel / samorząd (wiele placówek)
| Funkcja LiveKid | Status | Gdzie |
|---|---|---|
| Nadzór nad wieloma placówkami | ✅ | Rola Samorząd (pulpit zbiorczy, placówki) |
| Raporty zbiorcze | ✅ | Samorząd → Raporty zbiorcze |
| Rozliczanie dotacji | ✅ | Samorząd → Dotacje |

## 7. Materiały i aplikacja
| Funkcja LiveKid | Status | Gdzie |
|---|---|---|
| Biblioteka materiałów (scenariusze, karty, arkusze…) | ✅ | Materiały (8 kategorii, druk) |
| Aplikacja mobilna | ✅ | Responsywny interfejs (RWD) |
| Wsparcie AI (opisy, ogłoszenia) | ✅ | Generatory AI w formularzach |
| Tryb ciemny | ✅ | Przełącznik w stopce |
| RODO / bezpieczeństwo danych | ✅ | Zgody, dane lokalne |
| Wielojęzyczność (11 krajów) | ⬜ | tylko PL (poza zakresem prototypu) |

## Podsumowanie
Po tej iteracji odwzorowane są **wszystkie kluczowe moduły LiveKid**. Poza zakresem
prototypu pozostaje pełna wielojęzyczność oraz realne integracje płatnicze/API
(w wersji demo zastąpione symulacją). Rozróżnienie „Właściciel sieci" vs „Samorząd"
pełni u nas jedna rola nadzorcza (Samorząd).
</content>
