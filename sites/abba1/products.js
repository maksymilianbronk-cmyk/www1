/* ABBA1 — wspólny katalog produktów (sklep + panel). Ceny orientacyjne brutto (symulacja). */
window.ABBA1_PRODUCTS = [
  { id: "novitus-next", brand: "Novitus", name: "NOVITUS NEXT ONLINE", cat: "kasa", art: "kasa", tag: "bestseller", price: 2899, desc: "Dotykowa kasa online z Androidem — flagowiec do handlu i usług." },
  { id: "novitus-one", brand: "Novitus", name: "NOVITUS ONE ONLINE", cat: "kasa", art: "kasa", price: 1699, desc: "Kompaktowa kasa online z szybkim drukiem i Wi-Fi." },
  { id: "posnet-ergo", brand: "Posnet", name: "POSNET ERGO ONLINE", cat: "kasa", art: "kasa", price: 1549, desc: "Niezawodna kasa dla małego sklepu i punktu usług." },
  { id: "posnet-fawag", brand: "Posnet", name: "POSNET FAWAG LITE ONLINE", cat: "kasa", art: "mobilna", price: 1299, desc: "Lekka kasa mobilna — handel obwoźny i gastronomia na wynos." },
  { id: "elzab-k10", brand: "Elzab", name: "ELZAB K10 ONLINE", cat: "kasa", art: "mobilna", tag: "promo", price: 1399, desc: "Poręczna kasa z baterią na cały dzień pracy." },
  { id: "novitus-bono", brand: "Novitus", name: "NOVITUS BONO ONLINE", cat: "drukarka", art: "drukarka", price: 3065.16, desc: "Popularna drukarka fiskalna online do POS — szybka i cicha." },
  { id: "novitus-deon", brand: "Novitus", name: "NOVITUS DEON ONLINE", cat: "drukarka", art: "mobilna", price: 2599, desc: "Mobilna drukarka fiskalna online z akumulatorem." },
  { id: "posnet-trio", brand: "Posnet", name: "POSNET TRIO ONLINE", cat: "drukarka", art: "drukarka", price: 2999, desc: "Drukarka fiskalna online z wyświetlaczem klienta." },
  { id: "posnet-temo", brand: "Posnet", name: "POSNET TEMO ONLINE", cat: "drukarka", art: "mobilna", price: 2889.27, desc: "Kieszonkowa drukarka online do pracy w terenie." },
  { id: "elzab-mera", brand: "Elzab", name: "ELZAB MERA ONLINE BT/WIFI", cat: "drukarka", art: "drukarka", price: 3800.7, desc: "Wydajna drukarka online z obcinaczem — duży sklep i gastronomia." },
  { id: "elzab-zeta", brand: "Elzab", name: "ELZAB ZETA ONLINE", cat: "drukarka", art: "drukarka", price: 3199, desc: "Nowoczesna, kompaktowa drukarka fiskalna online." },
  { id: "pax-a920", brand: "PAX", name: "Terminal płatniczy PAX A920 Pro", cat: "terminal", art: "terminal", tag: "0 zł*", price: 899, desc: "Karta, BLIK, zbliżeniowo. *Możliwe 0 zł w programie Polska Bezgotówkowa." },
  { id: "pospay", brand: "Posnet", name: "POSPAY ONLINE", cat: "kasoterminal", art: "kasoterminal", tag: "2w1", price: 3499, desc: "Kasa online i terminal płatniczy w jednym urządzeniu." },
  { id: "dot-latwo", brand: "Dotykačka", name: "Zestaw Dotykačka ŁATWO", cat: "dotykacka", art: "tablet", price: 2499, desc: "Tablet POS 10″ z licencją — start dla małej gastronomii." },
  { id: "dot-uniwersalna", brand: "Dotykačka", name: "Zestaw Dotykačka UNIWERSALNA", cat: "dotykacka", art: "tablet", tag: "bestseller", price: 4299, desc: "Terminal dotykowy 14″ + drukarka bonów — restauracja i kawiarnia." },
  { id: "dot-kompletna", brand: "Dotykačka", name: "Zestaw Dotykačka KOMPLETNA + szuflada", cat: "dotykacka", art: "tablet", price: 5999, desc: "Terminal 14″, drukarka fiskalna i szuflada — komplet na klucz." },
  { id: "szuflada", brand: "Akcesoria", name: "Szuflada kasowa", cat: "akcesoria", art: "szuflada", price: 249, desc: "Solidna szuflada z wkładem na bilon i banknoty." },
  { id: "czytnik-2d", brand: "Akcesoria", name: "Czytnik kodów 2D", cat: "akcesoria", art: "czytnik", price: 349, desc: "Szybki skaner kodów 1D/2D — paragony bez kolejek." },
  { id: "drukarka-kuchenna", brand: "Akcesoria", name: "Drukarka kuchenna (bonowa)", cat: "akcesoria", art: "bonowa", price: 899, desc: "Bony na kuchnię i bar — głośny sygnał, odporna na tłuszcz." },
  { id: "rolki-eko", brand: "Akcesoria", name: "Rolki termiczne EKO 57 mm × 10", cat: "akcesoria", art: "rolki", tag: "eko", price: 29, desc: "Papier bez BPA, z certyfikowanych źródeł. Zielony wybór." }
];

/* wspólne narzędzia magazynu (sklep + panel) */
window.abbaStock = {
  KEY: "abba1-stock-v1",
  read: function () {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch (e) { return {}; }
  },
  isOut: function (id) { return this.read()[id] === false; },
  set: function (id, available) {
    var s = this.read();
    if (available) delete s[id]; else s[id] = false;
    localStorage.setItem(this.KEY, JSON.stringify(s));
  }
};
