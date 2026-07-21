---
name: reaktor-operator
description: Codzienna zdalna obsługa żywej instalacji LeadFlow CRM przez MCP — status, diagnostyka „coś nie działa", lead testowy, uruchomienie crona, checklisty wdrożeniowe klienta. Użyj przy prośbach typu „sprawdź czy CRM działa", „zdiagnozuj system", „przetestuj webhook klienta", „odpal cron", „checklista nowego klienta".
---

# REAKTOR Operator — obsługa żywego systemu

Wejście: `URL` instalacji + `DEPLOY_KEY` / `CRON_KEY` (panel → Ustawienia).
Pełne procedury: `sites/crm/docs/AI-OPERATOR.md`.

## Szybki przegląd zdrowia (60 sekund)

```bash
curl -s "$URL/deploy.php?key=$DEPLOY_KEY"        # wersja, db_intact, kopie
curl -s -o /dev/null -w "%{http_code}\n" "$URL/login.php"           # 200
curl -s -o /dev/null -w "%{http_code}\n" "$URL/api.php?a=bootstrap" # 401 (ochrona działa)
curl -s -H "X-Cron-Key: $CRON_KEY" "$URL/cron.php"  # czytaj errors[]
```

Interpretacja: `db_intact:false` → eskaluj natychmiast (kopie w data/backups/).
`errors[]` crona wymienia klientów z niedziałającymi tokenami Meta.

## Lead testowy (weryfikacja przepływu end-to-end)

```bash
curl -s -X POST "$URL/webhook.php?token=TOKEN_KLIENTA" \
  -d 'imie=Test Claude&telefon=000000000&wiadomosc=test techniczny'
```

Oczekiwane `{"ok":true,"lead_id":N}` — lead pojawi się w panelach na żywo
(sprawdza też powiadomienia e-mail i wychodzący webhook klienta).
Po teście przypomnij właścicielowi o usunięciu leada (Leady → szczegóły →
Usuń lead).

## Checklista wdrożenia nowego klienta

1. Panel → Klienci → dodaj konto; uzupełnij **branżę, miasto, ofertę**.
2. Skopiuj i wepnij webhook (formularze www / Make / ApixDrive z
   `&source=facebook` dla Meta).
3. Meta bezpośrednio (opcjonalnie): ID strony + Page Access Token u klienta;
   verify token w Ustawieniach.
4. Reklamy (opcjonalnie): ID konta reklamowego + token `ads_read`.
5. Lead testowy (wyżej) → widoczny w panelu.
6. Wyślij klientowi: adres jego panelu (`login.php?panel=<slug>`), dane
   logowania (osobnym kanałem!) i `docs/INSTRUKCJA-KLIENTA.md`.
7. Opcjonalnie: landing (skill `reaktor-landing`) i pierwszy plan postów
   (właściciel generuje w panelu → Posty).

## Cykliczna opieka (propozycja dla właściciela)

- co tydzień: szybki przegląd zdrowia + errors[] crona,
- co miesiąc: plan postów dla każdego klienta + przegląd kosztu leada
  w zakładce Reklamy,
- po każdej zmianie kodu: deploy wg skilla `reaktor-mcp` (nigdy edycja
  plików wprost na hostingu).
