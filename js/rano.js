/* =========================================================
   Rano — jedini skript u <head> stranice galerije (sinhron, sićušan).

   Postavlja <html data-js> PRIJE nego što se iscrta tijelo stranice,
   pa css/galerija.css može da sakrije 2D mrežu dok js/galerija.js ne
   postavi data-stanje. Bez ovoga se skrivena-pa-otkrivena mreža iscrta
   i njene lijene slike krenu da se preuzimaju (1.9–3.3 MB) za
   posjetioca koji ih nikad ne vidi.

   Bez JavaScripta atributa nema i mreža se vidi kao i do sada. Ako
   galerija.js iz bilo kog razloga ne stigne (404, blokiran), atribut se
   na `load` skida i mreža se ipak pokaže.
   ========================================================= */
(function () {
  'use strict';
  var d = document.documentElement;
  d.setAttribute('data-js', '');
  window.addEventListener('load', function () {
    var g = document.getElementById('galerija');
    if (g && !g.hasAttribute('data-stanje')) { d.removeAttribute('data-js'); }
  });
})();
