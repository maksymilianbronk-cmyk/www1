# 🚀 START TUTAJ — zawartość pakietu LeadFlow CRM

Kompletny pakiet Twojego systemu: aplikacja + dokumentacja + instrukcje AI.

```
leadflow-komplet/
├── START-TUTAJ.md                ← ten plik
├── system/
│   └── leadflow-crm/             ← APLIKACJA — ten folder wgrywasz na hosting
├── dokumentacja/
│   ├── PODRECZNIK-WLASCICIELA.md ← dla Ciebie: instalacja i praca krok po kroku
│   ├── INSTRUKCJA-KLIENTA.md     ← do rozesłania Twoim klientom
│   ├── DOKUMENTACJA-TECHNICZNA.md← architektura, API, baza (dla programisty/AI)
│   ├── README.md                 ← szybki start + integracje (webhooki, Meta)
│   └── CHANGELOG.md              ← historia wersji
└── dla-claude/
    ├── AI-OPERATOR.md            ← procedury operacyjne dla Claude (MCP)
    └── skille/                   ← skille Claude Code (kopiujesz do .claude/skills/)
        ├── reaktor-operator/     ← diagnostyka, checklisty, opieka nad systemem
        ├── reaktor-mcp/          ← aktualizacje systemu przez MCP
        ├── reaktor-landing/      ← landingi z szablonów przez MCP
        └── reaktor-strona/       ← strony www na silniku REAKTOR FX
```

## Od czego zacząć

1. **Instalacja** → `dokumentacja/PODRECZNIK-WLASCICIELA.md`, rozdział 2
   (15 minut: wgrywasz `system/leadflow-crm/` na hosting i klikasz kreator).
2. **Pierwszy klient** → rozdział 4 podręcznika (pełna checklista).
3. **Klientom** wysyłasz `INSTRUKCJA-KLIENTA.md` + ich adres logowania.
4. **Claude** w nowej sesji podajesz: URL instalacji + klucze z Ustawień —
   i mówisz, co ma zrobić (landing, aktualizacja, diagnostyka). Procedury
   ma w `dla-claude/` i w skillach.

Miłej pracy! ⚡ LeadFlow CRM · silnik REAKTOR — React bez Node'a
