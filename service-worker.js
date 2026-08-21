// Moje Stavba — jednoduchy service worker
// Cachuje navstivene stranky, aby appka fungovala i bez pripojeni,
// a aby ji slo nainstalovat na plochu (vyzaduje ho vetsina prohlizecu).
const CACHE_NAME = 'moje-stavba-v5-nocache';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      let fresh;
      try {
        // OPRAVA (1.8.2026): { cache: 'no-store' } prikaze prohlizeci
        // obejit i JEHO VLASTNI (ne jen service workeru) HTTP cache pro
        // tenhle pozadavek - bez tohohle appka mohla dostat starou verzi
        // souboru primo z prohlizece, driv nez se vubec dostala k tomuto
        // "network-first" fetchi. Tohle byl pravdepodobny zdroj opakovane
        // se vracejiciho problemu "appka na telefonu bezi na starem kodu
        // i po novem nahrani na GitHub" behem celeho dnesniho ladeni.
        fresh = await fetch(event.request, { cache: 'no-store' });
      } catch (err) {
        // Sit/fetch fakt selhal (napr. appka je offline) - teprve TADY
        // dava smysl zkusit stary zaznam z mezipameti jako zalohu.
        const cached = await cache.match(event.request);
        if (cached) return cached;
        return Promise.reject(err);
      }
      // OPRAVA (2.8.2026, kriticka): samotne STAZENI se povedlo (mame
      // "fresh"), ale ULOZENI DO MEZIPAMETI appky pridane na plochu ma
      // vlastni, oddelene a dost omezene ulozne misto - po mnoha dnesnich
      // verzich/testech uz mohlo byt zaplnene. Kdyz cache.put() selze
      // (napr. prekrocenim limitu), NESMI appka kvuli tomu zahodit i
      // uspesne stazenou odpoved - to byl presny duvod, proc se nove,
      // velke soubory (obrazky etap) v appce na plose nezobrazovaly,
      // presto ze primy odkaz ve svem prohlizeci fungoval bez problemu.
      try { await cache.put(event.request, fresh.clone()); } catch (e) {}
      return fresh;
    })
  );
});
