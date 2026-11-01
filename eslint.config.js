/* ESLint (flat config) za skripte galerije, js/galerija/*.js, i za
   provjere u testovi/galerija/.

   Pokretanje (bez package.json u korijenu — Vercel bi pokušao build):
     npx --yes eslint@10            iz korijena sajta
   ili cijela provjera: node testovi/galerija/provjeri.js (vidi tamo).

   Sam sebi dovoljan: bez @eslint/js i globals paketa, pa pravila i
   globalna imena stoje ovdje izričito. Pravila su "recommended" iz
   ESLint-a, plus nekoliko koja čuvaju dogovor dijelova: svaki fajl je
   klasična skripta u svom omotaču sa 'use strict' (strict,
   no-implicit-globals), a svako ime mora biti ili svoje ili uzeto iz G
   (no-undef). Ostali .js na sajtu (rano.js, vendor/…) se ovdje ne
   provjeravaju. */
'use strict';

/* Pregledač: samo ono što skripte galerije stvarno koriste, plus
   najčešće, da se nova upotreba ne prijavi kao greška. */
const PREGLEDAC = Object.fromEntries([
  'window', 'document', 'navigator', 'location', 'history', 'screen', 'performance', 'console',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback',
  'fetch', 'URL', 'URLSearchParams', 'Image', 'ImageBitmap', 'createImageBitmap', 'Blob',
  'IntersectionObserver', 'ResizeObserver', 'MutationObserver', 'AbortController',
  'Event', 'CustomEvent', 'Node', 'Element', 'HTMLElement', 'getComputedStyle', 'matchMedia',
  'localStorage', 'sessionStorage', 'devicePixelRatio', 'WebGLRenderingContext', 'WebGL2RenderingContext'
].map(function (ime) { return [ime, 'readonly']; }));

const NODE = Object.fromEntries([
  'require', 'module', 'exports', 'process', '__dirname', '__filename', 'console',
  'setTimeout', 'clearTimeout', 'URL', 'Buffer'
].map(function (ime) { return [ime, 'readonly']; }));

/* "recommended" iz ESLint-a (ono što važi za skripte bez klasa i generatora
   je uključeno svejedno — ne smeta) */
const PREPORUCENO = {
  'constructor-super': 'error', 'for-direction': 'error', 'getter-return': 'error',
  'no-async-promise-executor': 'error', 'no-case-declarations': 'error', 'no-class-assign': 'error',
  'no-compare-neg-zero': 'error', 'no-cond-assign': 'error', 'no-const-assign': 'error',
  'no-constant-binary-expression': 'error', 'no-constant-condition': 'error', 'no-control-regex': 'error',
  'no-debugger': 'error', 'no-delete-var': 'error', 'no-dupe-args': 'error', 'no-dupe-class-members': 'error',
  'no-dupe-else-if': 'error', 'no-dupe-keys': 'error', 'no-duplicate-case': 'error',
  'no-empty': ['error', { allowEmptyCatch: true }], 'no-empty-character-class': 'error',
  'no-empty-pattern': 'error', 'no-empty-static-block': 'error', 'no-ex-assign': 'error',
  'no-extra-boolean-cast': 'error', 'no-fallthrough': 'error', 'no-func-assign': 'error',
  'no-global-assign': 'error', 'no-import-assign': 'error', 'no-invalid-regexp': 'error',
  'no-irregular-whitespace': 'error', 'no-loss-of-precision': 'error', 'no-misleading-character-class': 'error',
  'no-new-native-nonconstructor': 'error', 'no-nonoctal-decimal-escape': 'error', 'no-obj-calls': 'error',
  'no-octal': 'error', 'no-octal-escape': 'error', 'no-prototype-builtins': 'error', 'no-redeclare': 'error',
  'no-regex-spaces': 'error', 'no-self-assign': 'error', 'no-setter-return': 'error',
  'no-shadow-restricted-names': 'error', 'no-sparse-arrays': 'error', 'no-this-before-super': 'error',
  'no-undef': 'error', 'no-unexpected-multiline': 'error', 'no-unreachable': 'error',
  'no-unsafe-finally': 'error', 'no-unsafe-negation': 'error', 'no-unsafe-optional-chaining': 'error',
  'no-unused-labels': 'error', 'no-unused-private-class-members': 'error',
  /* catch (e) bez upotrebe je namjeran (prazan catch: "nebitno") */
  'no-unused-vars': ['error', { caughtErrors: 'none' }],
  'no-useless-backreference': 'error', 'no-useless-catch': 'error', 'no-useless-escape': 'error',
  'no-with': 'error', 'require-yield': 'error', 'use-isnan': 'error', 'valid-typeof': 'error'
};

module.exports = [
  /* Samo ovo; ostatak sajta (rano.js, vendor/, …) ima svoja pravila ili nijedno */
  { ignores: ['**/*', '!js/', '!js/galerija/', '!js/galerija/*.js', '!testovi/', '!testovi/galerija/',
    '!testovi/galerija/*.js', '!eslint.config.js', 'testovi/galerija/node_modules/'] },
  {
    files: ['js/galerija/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: PREGLEDAC },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: Object.assign({}, PREPORUCENO, {
      /* Dogovor dijelova (zaglavlje js/galerija/osnova.js) */
      'strict': ['error', 'function'],
      'no-implicit-globals': 'error',
      /* TDZ u istom opsegu (const upotrijebljen prije reda u kom nastaje).
         Funkcije i imena iz gornjih opsega su slobodni — pozivaju se kasnije. */
      'no-use-before-define': ['error', { functions: false, classes: false, variables: false }],
      'no-var': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-eval': 'error', 'no-implied-eval': 'error', 'no-new-func': 'error'
    })
  },
  {
    files: ['testovi/galerija/*.js', 'eslint.config.js'],
    /* i imena pregledača: Playwright šalje funkcije u stranicu (page.evaluate) */
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs',
      globals: Object.assign({}, PREGLEDAC, NODE, { HTMLCanvasElement: 'readonly' }) },
    rules: PREPORUCENO
  }
];
