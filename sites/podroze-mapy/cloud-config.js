/* Konfiguracja chmury aplikacji „Trasa".
 *
 * appToken — token GitHub aplikacji, dzięki któremu użytkownicy zakładają
 * konta (login+hasło) i zapisują foldery POI bez własnych tokenów.
 *
 * JAK SKONFIGUROWAĆ (robi to właściciel repozytorium):
 * 1. Utwórz DEDYKOWANY token fine-grained: github.com/settings/personal-access-tokens/new
 *    - Repository access: ONLY maksymilianbronk-cmyk/www1
 *    - Permissions → Contents: Read and write (nic więcej!)
 * 2. Wklej go poniżej i wypchnij plik do repo.
 *
 * ⚠️ OSTRZEŻENIA BEZPIECZEŃSTWA:
 * - Token w publicznym repo może odczytać każdy — może więc też pisać po
 *   gałęzi poi-db i po CAŁYM repo w zakresie Contents. Używaj wyłącznie
 *   tokena ograniczonego do tego jednego repo i traktuj bazę POI jako jawną.
 * - GitHub Secret Scanning automatycznie UNIEWAŻNIA wykryte tokeny
 *   klasyczne (ghp_…). Tokeny fine-grained (github_pat_…) zwykle przeżywają,
 *   ale Push Protection może zablokować push — wtedy zatwierdź wyjątek
 *   w komunikacie GitHuba albo wyłącz Push Protection dla tego repo.
 * - Hasła kont są haszowane (SHA-256 + sól) i sprawdzane po stronie
 *   przeglądarki — to zabezpieczenie umowne przed przypadkowym nadpisaniem,
 *   nie kryptograficzna ochrona danych. Nie przechowuj w POI nic wrażliwego.
 * - Docelowo (wersja Android / backend) token powinien mieszkać w małym
 *   serwerze pośredniczącym, nie w kliencie.
 */
window.TRASA_CLOUD = {
  appToken: "", // ← tu wklej token aplikacji (github_pat_…)
};
