/* ==========================================================
   MAIN - spusti se jako posledni, az jsou zaregistrovane vsechny
   obrazovky. Rozhodne, jestli appka bude ukazovat onboarding
   (prvni spusteni / bez projektu), nebo rovnou dashboard.
   ========================================================== */
(async function(){
  // DOPLNENO (14.8.2026): vyplni cislo verze do uvodni (splash)
  // obrazovky, viz index.html - schvalne uplne na zacatku, synchronne,
  // driv nez cokoliv asynchronniho nize (registrace na Google/prihlaseni
  // atd.), at je videt hned.
  try{
    const vEl = document.getElementById('ms-splash-version');
    if(vEl) vEl.textContent = 'v' + (typeof MS_BUILD_VERSION !== 'undefined' ? MS_BUILD_VERSION : '?');
  }catch(e){}

  // Android (Capacitor) nema stejny koncept "safe area dole" jako iPhone
  // (domaci indikator) - appka na nem pak zbytecne necha prazdny pruh pod
  // spodni navigaci. Oznacime si to na <html>, at to CSS nize umi rozlisit.
  try{
    if(window.Capacitor && typeof window.Capacitor.getPlatform === 'function' && window.Capacitor.getPlatform() === 'android'){
      document.documentElement.classList.add('is-android-native');
    }
  }catch(e){}

  // Krok 9: pokud appka prave prosla Google/magic-link presmerovanim
  // (viz supabase-client.js + screen-premiumLogin.js), obnov puvodni
  // rezim (nakup Premium / prijeti pozvanky) drive, nez appka udela
  // cokoli jineho.
  try{
    if(typeof PremiumLogin !== 'undefined' && PremiumLogin.checkAuthResume){
      await PremiumLogin.checkAuthResume();
    }
  }catch(e){ console.error('checkAuthResume selhalo', e); }

  // (11.8.2026) Prubeh stahovani se ukazuje v plovoucim pruhu nad
  // navigaci - registrujeme ho jednou pro celou appku, at je videt
  // bez ohledu na to, na jake obrazovce clovek zrovna je.
  try{
    if(typeof MSCloud !== 'undefined' && MSCloud.onSyncProgress && typeof Layout !== 'undefined' && Layout.SyncBar){
      MSCloud.onSyncProgress((stav)=>{
        // Drobne stahovani (par souboru) neni potreba hlasit - pruh by
        // jen probliknul. Ukazujeme az od peti souboru vys.
        if(!stav || !stav.celkem || stav.celkem < 5) return;
        Layout.SyncBar.show(stav);
      });
    }
  }catch(e){ console.error('napojeni ukazatele stahovani selhalo', e); }

  // (10.8.2026) Doplneni profilu pro ucty z drivejsich verzi - a taky
  // pojistka, kdyby zalozeni uctu pri prvni stavbe neproslo (offline).
  // Zamerne bez await, at to nezdrzuje prvni vykresleni.
  setTimeout(()=>{
    try{
      if(typeof MSCloud !== 'undefined' && MSCloud.ensureProfileOnStart) MSCloud.ensureProfileOnStart();
      const projects = (typeof msLoadProjects === 'function') ? msLoadProjects() : [];
      if(projects.length && typeof MSCloud !== 'undefined' && MSCloud.ensureAccountForNewProject){
        MSCloud.ensureAccountForNewProject();
      }
    }catch(e){ console.error('doplneni uctu na pozadi', e); }
  }, 4000);

  msMigrateLegacyDataToProject();
  await msMigratePhotosDocsToIdb();
  // (14.8.2026) Uvodni obrazovka (viz index.html) ukazuje SKUTECNY
  // prubeh tohohle kroku - u vetsi stavby (stovky fotek) to byva
  // jedina cast startu, ktera opravdu chvili trva. Aktualizace DOM
  // se omezuji na max. jednou za ~80 ms, at se pri stovkach polozek
  // nezahlti prekreslovanim - posledni (100 %) se vzdy ukaze.
  let poslednizapis = 0;
  await msHydrateBlobCache((hotovo, celkem)=>{
    const ted = Date.now();
    const jePosledni = hotovo === celkem;
    if(!jePosledni && ted - poslednizapis < 80) return;
    poslednizapis = ted;
    if(typeof window.__msSplashProgress === 'function'){
      window.__msSplashProgress(hotovo, celkem, `Načítám fotky a dokumenty… ${hotovo}/${celkem}`);
    }
  });
  // Fotkam z drivejsich verzi se nahledy dovyrobi na pozadi, aby prvni
  // vykresleni nemuselo cekat. Zamerne az po chvili - start je nejvic
  // vytizeny okamzik.
  if(typeof msBuildMissingThumbs === 'function') setTimeout(msBuildMissingThumbs, 2500);
  Layout.applyTheme(Layout.getTheme());
  if(typeof msApplyUiScale === 'function') msApplyUiScale();
  msEnsureCurrentStageDayRecorded();

  // #app-shell je position:fixed;inset:0 + viewport-fit=cover v <meta viewport>,
  // takze appka presne kopiruje viditelnou plochu telefonu VCETNE bezpecnych
  // zon (home indicator atd.) uplne bez JS - viz komentar nahore v app.css.
  //
  // POZNAMKA K HISTORII: driv tu byla i JS logika, ktera se snazila
  // rucne kompenzovat drobny "posun" pri focusu pole pres
  // visualViewport.offsetTop a transform. Postupne ale zpusobila tri
  // ruzne regrese (menu "odlepene" od okraje, extremni vyrolovani
  // uvitaciho formulare, a nakonec cely chat s Martinem odjel mimo
  // obrazovku) - pokazde na jinem miste appky. Misto dalsiho dolad'ovani
  // je tahle logika radeji cela pryc: spolehame se jen na nativni
  // position:fixed;inset:0, ktere uz spolehlive funguje vsude jinde
  // v appce bez jakekoliv JS pomoci.

  const noRealRoute = !location.hash || location.hash === '#/dashboard' || !location.hash.startsWith('#/');

  // OPRAVA (1.8.2026): "uz proslo uvodnim nastavenim" se drive nastavovalo
  // JEN pri projiti bezneho pruvodce zalozenim prvni stavby - kdo appku
  // pouziva jen jako pozvany (prijal sdilenou stavbu, nikdy nezakladal
  // vlastni), mel tenhle priznak navzdy chybne "ne", a appka ho pri
  // kazdem cerstvem otevreni posilala na "Zalozit dalsi projekt" misto
  // na jeho sdilenou stavbu. Samoopravne: mit UZ NEJAKY projekt (jakkoli
  // ziskany) je dostatecny dukaz, ze uvodni nastaveni v praxi probehlo -
  // tohle opravi i jiz existujici appky uvizle na stare chybe, ne jen
  // nove prijate pozvanky.
  const hasAnyProject = msLoadProjects().length > 0;
  if(hasAnyProject && typeof msSetOnboarded === 'function') msSetOnboarded();

  if(!hasAnyProject){
    if(noRealRoute){
      location.hash = '#/onboarding-project';
    }
    // OPRAVA (14.8.2026, zasadni): tenhle mechanismus (prazdna appka +
    // uz prihlaseny ucet -> tise dotahnout stavby) tu byl uz od 11.8.,
    // ale kontroloval jen SDILENE stavby (restoreProjectsFromAccount).
    // VLASTNI stavbu s Premiem takhle nikdy nenasel.
    //
    // A tohle misto je navic KLICOVE z jineho duvodu: appka pridana na
    // plochu (iOS) ma VLASTNI ulozitste, oddelene od Safari. Kdyz se
    // clovek z appky na plose odhlasi k Google prihlaseni, Google ho po
    // dokonceni vrati zpet do SAFARI, ne do appky na plose - a appka na
    // plose si tak nikdy neprecte poznamku "cekam na navrat", kterou si
    // sama napsala (je totiz v JINE, uzavrene casti uloziste). Presne
    // tohle je znamy, zdokumentovany limit vsech "pridej na plochu"
    // appek na iOS, ne chyba v teto appce.
    // Reseni: NESPOLEHAT na tu poznamku. Mist toho pri KAZDEM startu
    // appky bez projektu proste zkontrolovat, jestli uz nahodou session
    // neexistuje (at uz vznikla kdekoliv) - a pokud ano, nabidnout
    // obnoveni. Funguje to bez ohledu na to, kde presne se prihlaseni
    // dokoncilo.
    setTimeout(async ()=>{
      try{
        if(typeof PremiumLogin === 'undefined' || !PremiumLogin.offerFullAccountRestore) return;
        // (14.8.2026) Stejna pojistka jako v checkAuthResume - jeden
        // pevny pokus po 1500ms muze prijit driv, nez Supabase klient
        // dokonci vymenu kodu za session (asynchronni, sitovy pozadavek).
        // Nekolik kratkych pokusu navic stoji jen zlomek vteriny navic v
        // tom vzacnem pripade, kdy je co cekat, a v beznem pripade (zadna
        // session) se stejne vsechny minou hned.
        let session = null;
        for(let pokus=0; pokus<4 && !session; pokus++){
          try{ session = await MSAuth.getSession(); }catch(e){}
          if(!session) await new Promise(r=> setTimeout(r, 350));
        }
        if(!session) return;
        await PremiumLogin.offerFullAccountRestore({ verbose: false });
      }catch(e){ console.error('tiche obnoveni staveb pri startu', e); }
    }, 1500);
  } else if(!msHasChosenAppLock() && !Tour.isActive()){
    // bezpecnostni pojistka: zamek appky je povinny i kdyz uzivatel
    // zavrel appku uprostred pruvodce driv, nez k nemu stihl dojit
    if(noRealRoute){
      location.hash = '#/app-lock-setup?fromTour=1';
    }
  }
  Router.renderCurrent();

  // Uvodni obrazovka (viz index.html) uz splnila svuj ucel - prvni
  // skutecna obrazovka je vykreslena, muze zmizet. (14.8.2026)
  if(typeof window.__msSplashDone === 'function') window.__msSplashDone();

  // Ticha automaticka obnova sdilenych projektu (nahrazuje tlacitko
  // "Aktualizovat"). Appka se sama, na pozadi, obcas zepta serveru
  // "je neco noveho?" - jednou hned pri startu, pak periodicky, a pri
  // kazdem navratu appky na popredi (zhasla obrazovka, prepnuta appka).
  if(typeof MSCloud !== 'undefined' && MSCloud.autoRefreshAllShared){
    // OPRAVA (1.8.2026, kriticka): appka drive prekreslovala AKTUALNI
    // obrazovku pri KAZDEM automatickem cyklu, uplne bez ohledu na to,
    // jestli se vubec neco zmenilo, a bez ohledu na to, jestli uzivatel
    // zrovna neco rozepsaneho vyplnuje (napr. formular na pridani fotky) -
    // takove prekresleni potichu smazalo cely rozepsany formular. Ted se
    // prekresli JEN kdyz (a) se opravdu neco sdileneho stahlo A (b)
    // uzivatel prave neni na formulari, kde by se tim rozepsana prace ztratila.
    const MS_FORM_ROUTES = ['diary-add','expense-add','event-add','task-add','photo-add'];
    // OPRAVA (1.8.2026): stejny problem jako u rozepsanych formularu se
    // muze stat i u potvrzovaciho dialogu (napr. "Zahajit stavbu?") -
    // appka mezitim na pozadi obnovila obrazovku, dialog sice zustal
    // viditelne otevreny (ma vlastni staly prvek mimo hlavni obsah), ale
    // kliknuti na "Potvrdit" pak pracovalo se ZASTARALYM/odpojenym
    // vykreslenim - data se ulozila spravne, ale zmena nebyla videt, dokud
    // uzivatel appku sam znovu neotevrel. Kontrola pred prekreslenim.
    //
    // OPRAVA (2.8.2026, dulezita): stejna trida chyby se tyka i BEZNEHO
    // dotyku obrazovky - konkretne tazeni prstem po kolecku etap pouziva
    // NATIVNI prohlizecove posouvani (scroll-snap). Kdyz tiche obnoveni
    // na pozadi mezitim prekreslilo obrazovku ZROVNA UPROSTRED tazeni
    // prstem, appka pod prstem vymenila cely element za novy - prohlizec
    // ztratil, co vlastne posouval, a gesto "trhlo/cuklo". Na sdilenem
    // zarizeni se to delo castej, protoze tam prichazi vic zmen od
    // druhe strany. Reseni: sledovat globalne, jestli se prave nekoho
    // prst dotyka obrazovky, a v tom pripade tiche prekresleni odlozit
    // na dalsi kolo (nikdy nezpusobi ztraceni dat, jen se to zkusi znovu
    // za chvíli).
    let _msTouchActive = false;
    let _msTouchEndTimer = null;
    document.addEventListener('touchstart', ()=>{
      _msTouchActive = true;
      if(_msTouchEndTimer){ clearTimeout(_msTouchEndTimer); _msTouchEndTimer = null; }
    }, { passive: true });
    // OPRAVA (2.8.2026, druhy pokus): prvni oprava hlidala jen dobu, kdy
    // se prst FYZICKY dotyka obrazovky - ale posouvani (napr. kolecko
    // etap) pokracuje jeste chvili SETRVACNOSTI i PO zvednuti prstu
    // (iOS "momentum scroll"). Kdyby tiche prekresleni prislo prave
    // behem tehle dojezdove faze, gesto porad trhne. Misto pevneho
    // odhadu appka ted sleduje SKUTECNOU aktivitu posouvani (scroll
    // event) - dokud neco jeste jede, hlidani se prodluzuje samo; az
    // se posouvani na chvili fakt zastavi, teprve pak appka povazuje
    // gesto za dokoncene.
    const TOUCH_END_GRACE_MS = 900;
    const SCROLL_QUIET_MS = 250;
    function armTouchEndGrace(){
      if(_msTouchEndTimer) clearTimeout(_msTouchEndTimer);
      _msTouchEndTimer = setTimeout(()=>{ _msTouchActive = false; _msTouchEndTimer = null; }, TOUCH_END_GRACE_MS);
    }
    document.addEventListener('touchend', armTouchEndGrace, { passive: true });
    document.addEventListener('touchcancel', armTouchEndGrace, { passive: true });
    document.addEventListener('scroll', ()=>{
      // Jakykoli scroll kdekoli v appce (vcetne setrvacneho dojezdu po
      // zvednuti prstu) prodluzuje hlidani o dalsich SCROLL_QUIET_MS -
      // pokud posouvani jeste jede, timer se porad odklada dal.
      _msTouchActive = true;
      if(_msTouchEndTimer) clearTimeout(_msTouchEndTimer);
      _msTouchEndTimer = setTimeout(()=>{ _msTouchActive = false; _msTouchEndTimer = null; }, SCROLL_QUIET_MS);
    }, { passive: true, capture: true });
    function isUserMidInteraction(){
      if(_msTouchActive) return true;
      const confirmOverlay = document.getElementById('confirm-overlay');
      if(confirmOverlay && confirmOverlay.classList.contains('open')) return true;
      if(document.querySelector('.ms-overlay')) return true;
      return false;
    }
    /* (11.8.2026) Dve pojistky navic:
       1) Kdyz appka neni videt (uzivatel prepnul jinam nebo zamkl
          telefon), nema smysl kazdych 45 s tahat data - je to jen
          spotreba baterie a mobilnich dat. Po navratu se stejne
          spousti obnova pres visibilitychange.
       2) Kdyz jedno kolo trva dele nez 45 s (velka stavba, slaba sit),
          spustilo se pres nej dalsi - dve soubezna slucovani nad
          stejnymi daty. Ted dalsi kolo pocka. */
    let _bezi = false;
    async function runAutoRefresh(){
      if(_bezi) return;
      if(document.visibilityState === 'hidden') return;
      _bezi = true;
      try{
        await runAutoRefreshInner();
      }finally{ _bezi = false; }
    }
    async function runAutoRefreshInner(){
      const changedShared = await MSCloud.autoRefreshAllShared();
      // Obousmerny Denik bezi NEZAVISLE na "je to sdileny projekt?" -
      // funguje stejne pro vlastnika (dohani, co pridali pozvani) i pro
      // pozvaneho (dohani vlastnika i ostatni pozvane).
      const changedDiary = (MSCloud.pollDiaryBothWays) ? await MSCloud.pollDiaryBothWays() : false;
      if(!changedShared && !changedDiary) return;
      if(MS_FORM_ROUTES.includes(Router.getRoute())) return; // nerusit rozepsany formular
      if(isUserMidInteraction()) return; // nerusit otevreny dialog/prekryvnou obrazovku
      Router.renderCurrent(true); // ticha obnova - bez blikani, bez zaznamu do historie
    }
    runAutoRefresh();
    setInterval(runAutoRefresh, 45000);
    document.addEventListener('visibilitychange', ()=>{
      if(document.visibilityState === 'visible') runAutoRefresh();
    });
    window.addEventListener('focus', runAutoRefresh);
  }
})().catch(function(e){
  // POJISTKA (14.8.2026): kdyby cokoliv v teto funkci spadlo drive, nez
  // stihla schovat uvodni obrazovku (napr. vypadek site pri prvnim
  // nacteni), appka by zustala navzdy za splashem - neviditelna a
  // nepouzitelna, i kdyz by zbytek fungoval. Radeji ukazat rozbitou
  // appku, kterou jde aspon zkusit pouzit, nez vecne se tocici logo.
  console.error('Spusteni appky selhalo', e);
  if(typeof window.__msSplashDone === 'function') window.__msSplashDone();
});
