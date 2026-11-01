// @ts-check
/* =========================================================
   Virtuelna galerija — jezik i tekstovi
   Ista skripta služi crnogorsku (korijen), englesku (en/) i
   italijansku stranicu (it/); jezik se čita iz <html lang>.
   Ovdje su SVI tekstovi koje skripta sama upisuje u stranicu
   (natpisi, najave za čitače ekrana, poruke), na sva tri jezika.
   Tekstovi koji stoje u HTML-u prevode se u en/ i it/ stranicama,
   a nazivi, opisi i tehnike djela dolaze iz data/radovi.json
   (polja `en` i `it`).
   ========================================================= */

(function () {
'use strict';

/** @type {Galerija} */
const G = /** @type {any} */ (window).__galerija;

/* Jezik stranice, iz <html lang> */
const EN = document.documentElement.lang === 'en';
const IT = document.documentElement.lang === 'it';

/* Tekstovi koje skripta sama upisuje. Crnogorski je izvor. */
const TEKST = IT ? {
  izbliza: 'Da vicino: ', djelo: 'opera', zatvori: 'Chiudi',
  savjetPuna: 'Trascinate o usate le frecce per muovervi sul dipinto · clic o Invio mostra l’opera intera',
  savjetCijela: 'Fate clic sul dipinto o premete Invio per vederlo a grandezza piena',
  slikaIzbliza: function (n) { return n + ' — Invio passa alla grandezza piena, le frecce si muovono sul dipinto'; },
  platnoIme: 'Sala espositiva virtuale',
  salaNazad: 'Torna alla prima sala', salaDruga: 'Alla seconda sala',
  platno: 'Sala espositiva virtuale con le opere di Marko Dumnić. Fate clic su un dipinto per portarvi davanti la telecamera; ' +
    'le frecce sinistra e destra passano all’opera precedente e a quella successiva, Esc torna alla panoramica della sala. ' +
    'Davanti a un’opera: A e D girano intorno al dipinto, W e S cambiano l’altezza dello sguardo, ' +
    'le frecce su e giù avvicinano e allontanano, L accende la luce radente.',
  tura: 'Visita la mostra', nastavi: 'Riprendi la visita', pauza: 'Pausa',
  obilazak: function (k, n) { return 'Visita: ' + k + ' di ' + n; },
  redni: function (k, n) { return k + ' di ' + n; },
  nastavlja: 'La visita prosegue',
  pocetak: function (n) { return 'Visita alla mostra · ' + n + ' opere'; },
  pauzirano: 'Visita in pausa · «Riprendi la visita» la fa ripartire',
  kraj: 'Fine del percorso · grazie per la visita',
  mapa: 'Mappa', tlocrt: 'Pianta delle sale con le opere',
  sala1: 'SALA 1', sala2: 'SALA 2',
  djeloBr: function (i) { return 'Opera ' + i; },
  idiDo: 'Vai all’opera: ',
  sakrijMapu: 'Nascondi la pianta', prikaziMapu: 'Mostra la pianta',
  crtez: 'Disegno', ulje: 'Dipinto a olio',
  karticaVise: 'Mostra i dati dell’opera', karticaManje: 'Nascondi i dati dell’opera',
  opcije: 'Opzioni', iliDodir: 'o toccate un dipinto', oDjelu: 'Sull’opera',
  cistoSavjet: 'Toccate il dipinto per nascondere i pulsanti', cistoNazad: 'Toccate di nuovo il dipinto per riavere i pulsanti'
} : EN ? {
  izbliza: 'Close-up: ', djelo: 'artwork', zatvori: 'Close',
  savjetPuna: 'Drag or use the arrow keys to move around the painting · click or Enter shows the whole work',
  savjetCijela: 'Click the painting or press Enter to view it at full size',
  slikaIzbliza: function (n) { return n + ' — Enter switches to full size, the arrow keys move around the painting'; },
  platnoIme: 'Virtual exhibition room',
  salaNazad: 'Back to room one', salaDruga: 'To room two',
  platno: 'Virtual exhibition room with works by Marko Dumnić. Click a painting to bring the camera in front of it; ' +
    'the left and right arrow keys go to the previous and next work, and Escape returns to the overview of the room. ' +
    'In front of a work: A and D circle around the painting, W and S change the viewing height, ' +
    'the up and down arrow keys move closer and further away, and L turns on the side light.',
  tura: 'Tour the exhibition', nastavi: 'Resume tour', pauza: 'Pause',
  obilazak: function (k, n) { return 'Tour ' + k + ' of ' + n; },
  redni: function (k, n) { return k + ' of ' + n; },
  nastavlja: 'The tour continues',
  pocetak: function (n) { return 'Exhibition tour · ' + n + ' works'; },
  pauzirano: 'Tour paused · “Resume tour” picks it up again',
  kraj: 'End of the tour · thank you for visiting',
  mapa: 'Map', tlocrt: 'Floor plan of the rooms and the works',
  sala1: 'ROOM 1', sala2: 'ROOM 2',
  djeloBr: function (i) { return 'Work ' + i; },
  idiDo: 'Go to the work: ',
  sakrijMapu: 'Hide the floor plan', prikaziMapu: 'Show the floor plan',
  crtez: 'Drawing', ulje: 'Oil painting',
  karticaVise: 'Show the details of the work', karticaManje: 'Hide the details of the work',
  opcije: 'Options', iliDodir: 'or tap a painting', oDjelu: 'About the work',
  cistoSavjet: 'Tap the painting to hide the buttons', cistoNazad: 'Tap the painting again for the buttons'
} : {
  izbliza: 'Izbliza: ', djelo: 'djelo', zatvori: 'Zatvori',
  savjetPuna: 'Prevucite ili koristite strelice za kretanje po slici · klik ili Enter vraća cijelu sliku',
  savjetCijela: 'Klik na sliku ili Enter za punu veličinu',
  slikaIzbliza: function (n) { return n + ' — Enter prebacuje na punu veličinu, strelice pomjeraju po slici'; },
  platnoIme: 'Virtuelna sala',
  salaNazad: 'Nazad u prvu salu', salaDruga: 'U drugu salu',
  platno: 'Virtuelna sala sa djelima Marka Dumnića. Klik na sliku vodi kameru pred nju, ' +
    'strelice lijevo i desno idu na prethodno i sljedeće djelo, Escape vraća na pregled sobe. ' +
    'Pred djelom: A i D kruže oko slike, W i S mijenjaju visinu pogleda, ' +
    'strelice gore i dolje približavaju, L pali bočno svjetlo.',
  tura: 'Obiđi izložbu', nastavi: 'Nastavi obilazak', pauza: 'Pauza',
  obilazak: function (k, n) { return 'Obilazak ' + k + ' od ' + n; },
  redni: function (k, n) { return k + ' od ' + n; },
  nastavlja: 'Obilazak se nastavlja',
  pocetak: function (n) { return 'Obilazak izložbe · ' + n + ' djela'; },
  pauzirano: 'Obilazak je pauziran · „Nastavi“ ga vraća',
  kraj: 'Kraj obilaska · hvala na posjeti',
  mapa: 'Mapa', tlocrt: 'Tlocrt sala sa djelima',
  sala1: 'SALA 1', sala2: 'SALA 2',
  djeloBr: function (i) { return 'Djelo ' + i; },
  idiDo: 'Idi do djela: ',
  sakrijMapu: 'Sakrij mapu sale', prikaziMapu: 'Prikaži mapu sale',
  crtez: 'Crtež', ulje: 'Ulje',
  karticaVise: 'Prikaži podatke o djelu', karticaManje: 'Sakrij podatke o djelu',
  opcije: 'Opcije', iliDodir: 'ili dodirnite sliku', oDjelu: 'O djelu',
  cistoSavjet: 'Dodir na sliku sakriva dugmad', cistoNazad: 'Dodirnite sliku da vratite dugmad'
};

/* Poruke kad se izgubi i vrati WebGL kontekst (vidi kontekstIzgubljen
   u unos.js) */
const PORUKA_GRAFIKE = IT ? {
  izgubljena: 'La grafica si è fermata per un momento: la sala tornerà da sola. Se non torna, ricaricate la pagina.',
  vracena: 'La sala è di nuovo qui'
} : EN ? {
  izgubljena: 'The graphics paused for a moment: the gallery will come back by itself. If it doesn’t, please reload the page.',
  vracena: 'The gallery is back'
} : {
  izgubljena: 'Grafika je na trenutak zastala: sala će se sama vratiti. Ako se ne vrati, osvježite stranicu.',
  vracena: 'Sala je ponovo tu'
};

Object.assign(G, {
  EN, IT, TEKST, PORUKA_GRAFIKE
});
G.dijelovi.push('tekstovi');

})();
