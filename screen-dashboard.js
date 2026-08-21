/* ==========================================================
   DASHBOARD (Domu)
   ========================================================== */
const DashboardScreen = (function(){

  // Dashboard to mel spravne uz driv; ted je to na jednom miste v
  // data.js (msTodayIso) a pouziva to cela appka.
  function todayISO(){ return msTodayIso(); }

  /* Vyska dvojice "Sdílení + Galerie" (11.8.2026).
     Je to MINIMALNI vyska, ne pevna: dve rady ctvercovych nahledu plus
     nadpis daji dohromady vic nez 168 px a pri pevne vysce fotky z
     dlazdice pretekaly. Obe karty v rade maji height:100%, takze se
     srovnaji na vysku te vyssi z nich.

     OPRAVA (13.8.2026): tahle konstanta byla puvodne uvnitr render(),
     ale AZ ZA mistem, kde se vykreslovaci funkce volaji. JavaScript
     takovou promennou pred jejim radkem povazuje za nedostupnou, takze
     renderShareCard i renderTiles spadly hned na prvnim pouziti - na
     dashboardu pak chybela karta Tymu stavby, Galerie i Kalendar.
     Na urovni modulu uz na poradi nezalezi. */
  const VYSKA_SDILENI_GALERIE = 118;
  function formatToday(){
    const days = ['Neděle','Pondělí','Úterý','Středa','Čtvrtek','Pátek','Sobota'];
    const months = ['ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince'];
    const d = new Date();
    return days[d.getDay()] + ', ' + d.getDate() + '. ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }
  function formatDateCz(iso){
    const d = new Date(iso+'T00:00:00');
    return d.getDate()+'. '+(d.getMonth()+1)+'. '+d.getFullYear();
  }
  function dayCount(startISO){ return msDayCount(startISO); }
  function monthsBetween(startISO, todayD){
    const s = new Date(startISO+'T00:00:00');
    return (todayD.getFullYear()-s.getFullYear())*12 + (todayD.getMonth()-s.getMonth());
  }
  function jubileeLabel(months){
    if(months<=0) return null;
    if(months % 12 === 0) return (months/12) + (months/12===1 ? ' rok' : (months/12<5 ? ' roky' : ' let'));
    return months + (months===1?' měsíc':(months<5?' měsíce':' měsíců'));
  }

  function render(container){
    const projects = msLoadProjects();
    const activeId = msGetActiveProjectId();
    let p = projects.find(x=>x.id===activeId) || projects[0];

    container.innerHTML = `
      <!-- ZNACKA (7.8.2026): jen na Dashboardu. Ostatni obrazovky uz maji
           v liste svuj vlastni nazev (Denik, Finance, Etapy...) a znacka
           by tam jen zabirala nejcennejsi radek a opakovala neco, co
           uzivatel davno vi. Tady je to prvni, co po otevreni uvidi. -->
      <div class="ms-brand">
        <img src="logo-mark.png" alt="" width="18" height="18"/>
        <span>Moje Stavba</span>
      </div>
      <div class="topbar">
        <div class="dropdown" id="projDropdown" style="flex:1">
          <button class="dd-btn" id="projBtn" style="border:0;background:none;padding:0;justify-content:flex-start;gap:6px;align-items:center">
            <span style="text-align:left">
              <b style="display:block;font-size:16px">${p ? p.name : 'Projekt'}</b>
              <span style="display:block;font-size:10.5px;color:var(--muted);font-weight:600">${p ? p.location : ''}</span>
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <div class="dd-panel" id="projPanel" data-sheet-title="Vybrat projekt"></div>
        </div>
        <div id="planBadgeWrap"></div>
        <div class="top-actions">
          <div class="icon-btn" id="shareBtn" title="Sdílet stavbu"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9"/></svg></div>
          <div class="icon-btn" id="searchBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></div>
          <div class="icon-btn" id="settingsBtn"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09c0 .68.39 1.28 1 1.51.66.26 1.42.12 1.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06c-.45.4-.59 1.16-.33 1.82.23.61.83 1 1.51 1H21a2 2 0 010 4h-.09c-.68 0-1.28.39-1.51 1z"/></svg></div>
        </div>
      </div>

      <div id="searchWrap"></div>

      <div style="text-align:center;font-size:9px;color:var(--muted);opacity:.55;margin:0">Verze ${typeof MS_BUILD_VERSION !== 'undefined' ? MS_BUILD_VERSION : '?'}</div>

      <div class="screen-scroll" style="padding-top:0;font-size:13px">
        <div class="house-shot" style="margin:0 -16px 4px">
          <img id="heroImgNeon" src="house.jpg" alt="Rodinný dům" class="house-neon" style="display:block" onerror="this.onerror=null;this.src='house.jpg'"/>
          <img id="heroImgDark" src="house-dark.jpg" alt="Rodinný dům" class="house-dark" style="display:none" onerror="this.onerror=null;this.src='house-dark.jpg'"/>
          <div class="hero-gradient" style="position:absolute;inset:0;background:linear-gradient(rgba(2,4,10,.55),rgba(2,4,10,0) 60%)"></div>
          <div id="heroText" style="position:absolute;left:0;top:0;padding:9px 16px 0"></div>
        </div>

        <div id="dailyReminderWrap"></div>
        <div id="diaryReminderWrap"></div>

        <!-- ZMENA (7.8.2026): poradi dlazdic podle Martinova zadani -
             etapa+aktuality / kalendar+ukoly / sdileni+galerie / penize
             pres celou sirku. Kazda rada je vlastni grid, aby se pripadne
             schovana dlazdice dala roztahnout jen ve sve rade. -->
        <div id="startCardWrap"></div>
        <div id="stageCardWrap" style="margin-top:8px"></div>
        <div id="newsTileWrap" style="margin-top:8px"></div>
        <div class="tiles-row" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin-top:8px">
          <div id="eventTileWrap"></div>
          <div id="taskTileWrap"></div>
        </div>
        <div class="tiles-row" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin-top:8px">
          <div id="shareCardWrap"></div>
          <div id="galleryTileWrap"></div>
        </div>
        <div id="moneyCardWrap"></div>
      </div>
    `;

    if(!p){
      // bez projektu appka neni k cemu - poslat na onboarding
      Router.go('onboarding-project');
      return { activeTab:'dashboard', showNav:false };
    }

    renderHero(p);
    renderHeroImage();
    renderStartCard();
    renderStageCard();
    renderDailyReminder();
    renderDiaryReminder(p);
    renderMoneyCard();
    renderShareCard(p);
    renderNewsTile();
    renderTaskTile();
    renderTiles();
    renderProjectSwitcher(p, projects, activeId);
    wireTopActions(p);
    checkJubilee(p);

    return { activeTab:'dashboard', showNav:true };

    // ---------- podfunkce ----------

    function renderDiaryReminder(p){
      const wrap = container.querySelector('#diaryReminderWrap');
      // denik pocitame az od zahajeni stavby - pred tim hlaska nedava smysl
      if(!p.started || !p.startDate){ wrap.innerHTML = ''; return; }
      const last = msLastDiaryEntryDate();
      const sinceISO = last || p.startDate;
      const daysSince = Math.floor((new Date(todayISO()+'T00:00:00') - new Date(sinceISO+'T00:00:00')) / 86400000);
      const queue = msDiaryQueueResolved();
      if(daysSince < 7 || queue.length === 0){ wrap.innerHTML = ''; return; }
      const shown = queue.slice(0,6);
      const extra = queue.length - shown.length;
      wrap.innerHTML = `
        <div id="diaryReminderCard" style="border:1px solid var(--accent);background:var(--card-bg-2);padding:10px 12px;margin-top:8px;cursor:pointer">
          <b style="font-size:11.5px;display:block;margin-bottom:7px">Už ${daysSince} dní jsme nezapsali do deníku – máme připravený tento materiál</b>
          <div style="display:flex;gap:5px;align-items:center">
            ${shown.map(it=> it.preview
              ? `<div style="width:26px;height:26px;border-radius:50%;background-image:url(${it.preview});background-size:cover;border:1px solid var(--accent);flex:0 0 auto"></div>`
              : `<div style="width:26px;height:26px;border-radius:50%;background:var(--card-bg);border:1px solid var(--accent);flex:0 0 auto;display:grid;place-items:center;color:var(--accent);font-size:10px">•</div>`
            ).join('')}
            ${extra>0 ? `<span style="font-size:10.5px;color:var(--muted);font-weight:800">+${extra}</span>` : ''}
          </div>
        </div>`;
      wrap.querySelector('#diaryReminderCard').addEventListener('click', ()=> Router.go('diary-add'));
    }

    function persistProject(patch){
      // OPRAVA (14.8.2026): tahle funkce si ukladala data VLASTNI cestou
      // (msSaveProjects primo), mimo msUpdateProject - a prave
      // msUpdateProject je misto, ktere spousti tichy upload snimku pro
      // Premium/vlastni stavbu. Zahajeni a zkolaudovani stavby se tak
      // NIKDY nepropsalo sdilenym lidem - u nich by "Den stavby" nikdy
      // nezacal pocitat, presne ta chyba, co uz appka jednou opravovala
      // (viz komentar u refreshSharedProject), jen z jineho mista.
      const saved = (typeof msUpdateProject === 'function') ? msUpdateProject(p.id, patch) : null;
      if(saved) p = saved;
      else{
        const list = msLoadProjects();
        const idx = list.findIndex(x=>x.id===p.id);
        if(idx!==-1){ list[idx] = Object.assign({}, list[idx], patch); msSaveProjects(list); p = list[idx]; }
      }
    }

    function renderHero(p){
      const wrap = container.querySelector('#heroText');
      const sh = 'text-shadow:var(--hero-text-shadow)';
      if(p.finished){
        wrap.innerHTML = `<p style="margin:0;color:var(--hero-text);font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;${sh}">Stavba dokončena</p><strong style="display:block;font-size:28px;color:var(--hero-text-strong);${sh}">${dayCount(p.startDate)}</strong><small style="color:var(--hero-text);${sh}">zkolaudováno ${formatDateCz(p.finishDate)}</small>`;
      } else if(p.started){
        // OPRAVA (1.8.2026): zahajeni/zkolaudovani stavby je vec vlastnika,
        // ne pozvaneho - na sdilenem projektu appka ukaze jen stav (den
        // stavby), bez klikaciho tlacitka, co by menilo cizi projekt.
        const finishBtnHtml = p.isShared ? '' : `<button id="finishLink" class="finish-btn" style="margin-top:5px;font-size:10px;font-weight:800;color:#4dffab;background:var(--card-bg-2);border:1px solid #4dffab;padding:4px 9px;border-radius:var(--radius);cursor:pointer;${sh}">Zkolaudovat stavbu</button>`;
        // (14.8.2026) Vedle "Zkolaudovat" pribyl tichy odkaz na vraceni
        // zahajeni zpet - pro pripad, ze clovek klikl omylem nebo si to
        // rozmyslel. Zamerne nenapadny (male pismo, tlumena barva), at
        // nepusobil jako rovnocenna akce s hlavnim tlacitkem.
        const undoStartHtml = p.isShared ? '' : `<span id="undoStartLink" style="display:block;margin-top:4px;font-size:9px;color:var(--hero-text);opacity:.6;text-decoration:underline;text-underline-offset:2px;cursor:pointer;${sh}">Vzít zahájení zpět</span>`;
        wrap.innerHTML = `<p style="margin:0;color:var(--hero-text);font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;${sh}">Den stavby</p><strong style="display:block;font-size:28px;color:var(--hero-text-strong);${sh}">${dayCount(p.startDate)}</strong>
          <span style="display:block;color:var(--hero-text);font-size:10.5px;margin-top:1px;${sh}">${formatToday()}</span>
          ${finishBtnHtml}${undoStartHtml}`;
        if(!p.isShared){
          wrap.querySelector('#finishLink').addEventListener('click', async ()=>{
            if(!await Layout.confirmDialog('Zkolaudovat stavbu? Den stavby se zastaví na dnešním dni.', 'Zkolaudovat')) return;
            persistProject({ finished:true, finishDate: todayISO() });
            Router.go('celebration', { type:'done', title:'Stavba zkolaudována!', photos: msPhotos().length, money: msTotalExpenses() });
          });
          const undoEl = wrap.querySelector('#undoStartLink');
          if(undoEl) undoEl.addEventListener('click', async ()=>{
            const ok = await Layout.confirmDialog(
              'Vzít zahájení stavby zpět? "Den stavby" přestane počítat a appka se vrátí do stavu před zahájením. Zápisy v deníku, fotky ani finance se nijak nezmění - jde jen o tohle datum.',
              'Vzít zpět', 'Nechat být');
            if(!ok) return;
            persistProject({ started:false, startDate:null });
            renderHero(p);
          });
        }
      } else if(p.isShared){
        wrap.innerHTML = `<p style="margin:0;color:var(--hero-text);font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;${sh}">${formatToday()}</p><p style="margin:7px 0 0;color:var(--hero-text);font-size:11px;${sh}">Stavba ještě nebyla zahájena</p>`;
      } else {
        wrap.innerHTML = `<p style="margin:0;color:var(--hero-text);font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;${sh}">${formatToday()}</p><button class="btn-primary" id="startBtn" style="margin-top:7px;width:auto;padding:9px 16px;display:inline-block;font-size:12px">Zahájit stavbu</button>`;
        wrap.querySelector('#startBtn').addEventListener('click', ()=> openStartBuildSheet());
      }
    }

    /* (14.8.2026) Datum zahajeni slo drive jen "dnes" - kdo appku
       zacal pouzivat az par tydnu po skutecnem zacatku stavby, mel
       "Den stavby" navzdy posunuty. Sheet nabidne dnesek jako
       vychozi, ale jde ho zmenit zpetne (ne do budoucna - to by
       "Den stavby" poslalo do zapornych cisel). */
    function openStartBuildSheet(){
      const overlay = document.createElement('div');
      overlay.className = 'ms-overlay ms-sheet-backdrop';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:85;display:flex;align-items:flex-end;justify-content:center';
      const dnes = todayISO();
      overlay.innerHTML = `
        <div class="ms-sheet" style="width:100%;max-width:460px">
          <div style="background:var(--card-bg-2);border:1px solid var(--line);border-left:3px solid var(--accent);padding:18px 20px 20px">
            <b style="display:block;font-size:14px;font-family:var(--font-head);margin-bottom:4px">Zahájit stavbu</b>
            <p style="margin:0 0 14px;font-size:11.5px;color:var(--muted);line-height:1.5">Od tohoto data appka počítá "Den stavby". Klidně vyber i den v minulosti, pokud jsi appku začal používat později, než jsi skutečně vykopal základy.</p>
            <p class="f-label" style="margin-bottom:6px">Datum zahájení</p>
            <input class="f-input" id="startDateInput" type="date" value="${dnes}" max="${dnes}" style="margin-bottom:16px"/>
            <button id="startConfirmBtn" class="btn-primary">Zahájit stavbu →</button>
            <button id="startCancelBtn" style="width:100%;text-align:center;background:none;border:none;color:var(--muted);font-size:12px;padding:12px 0 0;cursor:pointer;font-family:inherit">Zrušit</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const close = ()=>{ try{ document.body.removeChild(overlay); }catch(_){} };
      overlay.addEventListener('click', (e)=>{ if(e.target === overlay) close(); });
      overlay.querySelector('#startCancelBtn').addEventListener('click', close);
      overlay.querySelector('#startConfirmBtn').addEventListener('click', ()=>{
        const zadane = overlay.querySelector('#startDateInput').value;
        // Prazdne/budouci datum nedava smysl - radeji tise spadnout na
        // dnesek, nez appku nechat s nesmyslnou hodnotou.
        const datum = (zadane && zadane <= dnes) ? zadane : dnes;
        close();
        persistProject({ started:true, startDate: datum, finished:false });
        renderHero(p);
      });
    }

    function renderHeroImage(){
      const cur = msStageByKey(msGetCurrentStage());
      const key = cur ? cur.key : null;
      const neonImg = container.querySelector('#heroImgNeon');
      const darkImg = container.querySelector('#heroImgDark');
      // Konvence nazvu souboru: stage-{key}.jpg (Skica), stage-{key}-neon.jpg (Neon),
      // stage-{key}-dark.jpg (nocni Skica - zatim se nikde neaktivuje, viz app.css).
      // Pokud soubor pro danou etapu jeste neexistuje, onerror na <img> spadne
      // zpet na vychozi house.jpg / house-dark.jpg - takze je
      // bezpecne pridavat obrazky postupne, jeden po druhem, bez rizika rozbiti dashboardu.
      // OPRAVA (2.8.2026, konecne nalezena prava pricina): appka pro
      // Skicu ma vsech 26 obrazku, takze se ta "zachranna" onerror
      // cesta u ni nikdy nemusela pouzit. Pro tmavy motiv teď mame ale
      // JEN univerzalni house.jpg (per-etapove obrazky jsou docasne
      // vyrazene, viz dnesni debugovani) - appka se PRESTO porad
      // nejdriv snazila natahnout `stage-{key}-neon.jpg`, ktery vubec
      // neexistuje, a teprve pak se mela tise prepnout na house.jpg
      // pres onerror - ale tahle zachranna cesta se ukazala nespolehliva.
      // Reseni: appka uz se o neexistujici soubor vubec nepokousi.
      neonImg.src = 'house.jpg';
      // OPRAVA (2.8.2026): vsech 26 obrazku pro sketch-dark uz existuje
      // (spravne pojmenovane, spravne obarvene), takze se appka muze
      // bezpecne vratit k tomu zkusit nejdriv obrazek konkretni etapy -
      // presne stejny, uz osvedceny vzor jako u Skicy.
      darkImg.src = key ? `stage-${key}-dark.jpg` : 'house-dark.jpg';
    }

    /* ============================================================
       KARTA "ZAČÍNÁME" (14.8.2026) - kombinace dvou navrzenych smeru:
       misto peti roztrousenych "nic tu neni" dlazdic jedna karta se
       sesti konkretnimi kroky (zapis, vydaj, fotka, soubor Projektu,
       ukol, udalost). Kazdy krok se odskrtne sam, jakmile prislusny
       obsah v appce existuje - zadne rucni potvrzovani.
       Schovava se, kdyz: clovek si ji rucne zavre (dismiss ulozeny
       lokalne), MA VSECHNY kroky hotove, nebo uz ma v deniku aspon 5
       zaznamu (proxy pro "appku uz bezne pouziva" - nechceme, aby
       karta visela navzdy jen kvuli tomu, ze nekdo nikdy nepouzije
       Udalosti). */
    function renderStartCard(){
      const wrap = container.querySelector('#startCardWrap');
      if(!wrap || !p) return;
      const DISMISS_KEY = msProjectKey('ms_start_card_dismissed_v1');
      let dismissed = false;
      try{ dismissed = localStorage.getItem(DISMISS_KEY) === '1'; }catch(e){}

      const kroky = [
        { id:'zapis', label:'První zápis', done: msDiary().length>0, route:'diary-add' },
        { id:'vydaj', label:'První výdaj', done: msExpenses().length>0, route:'expense-add' },
        { id:'foto', label:'První fotka', done: msPhotos().length>0, route:'photo-add' },
        { id:'soubor', label:'Soubor do Projektu', done: (typeof msLoadProjectItems==='function' && msLoadProjectItems().length>0), route:'project', params:{scope:'projekt'} },
        { id:'ukol', label:'První úkol', done: msTasks().length>0, route:'task-add' },
        { id:'udalost', label:'První událost', done: msEvents().length>0, route:'event-add' },
      ];
      const hotovo = kroky.filter(k=>k.done).length;

      if(dismissed || hotovo === kroky.length || msDiary().length >= 5){
        wrap.innerHTML = '';
        return;
      }

      // ZMENA (14.8.2026): puvodni verze (6 radku na celou sirku, kazdy
      // s podnadpisem a sipkou) zabirala skoro celou obrazovku - hlavni
      // obsah appky byl uplne dole mimo dohled. Ted jsou to male
      // "chipy" vedle sebe (jen kolecko + kratky nazev, bez podnadpisu a
      // sipky), ktere se zalamuji do radku podle sirky - stejne kroky,
      // ale na zlomek vysky.
      wrap.innerHTML = `
        <div id="startCard" style="border:1px solid var(--accent);background:color-mix(in srgb, var(--accent) 8%, var(--card-bg));padding:11px 13px;margin-top:8px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px">
            <span style="font-size:11px;color:var(--muted)">Začínáme u ${msEsc(p.name || 'stavby')} · <b style="color:var(--text-main)">${hotovo}/${kroky.length}</b></span>
            <span id="startCardDismiss" style="flex:0 0 auto;color:var(--muted);font-size:10px;text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:2px">Skrýt</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${kroky.map((k,i)=>`
              <div class="startCardRow" data-i="${i}" style="display:flex;align-items:center;gap:5px;padding:5px 9px 5px 5px;border:1px solid ${k.done?'var(--line)':'var(--accent)'};background:var(--card-bg);cursor:pointer">
                <span style="width:15px;height:15px;flex:0 0 15px;border-radius:50%;border:1.5px solid ${k.done?'var(--money-pos,#4ec9a0)':'var(--accent)'};background:${k.done?'var(--money-pos,#4ec9a0)':'transparent'};display:grid;place-items:center;color:${k.done?'#04070f':'var(--accent)'};font-size:8.5px;font-weight:800">
                  ${k.done ? '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>' : (i+1)}
                </span>
                <span style="font-size:11px;color:${k.done?'var(--muted)':'var(--text-main)'};text-decoration:${k.done?'line-through':'none'};white-space:nowrap">${msEsc(k.label)}</span>
              </div>`).join('')}
          </div>
        </div>`;

      wrap.querySelectorAll('.startCardRow').forEach(el=>{
        el.addEventListener('click', ()=>{
          const k = kroky[Number(el.dataset.i)];
          Router.go(k.route, k.params || {});
        });
      });
      const dismissEl = wrap.querySelector('#startCardDismiss');
      if(dismissEl) dismissEl.addEventListener('click', (e)=>{
        e.stopPropagation();
        try{ localStorage.setItem(DISMISS_KEY, '1'); }catch(err){}
        wrap.innerHTML = '';
      });
    }

    function renderStageCard(){
      const wrap = container.querySelector('#stageCardWrap');
      const cur = msStageByKey(msGetCurrentStage());
      const color = cur ? cur.color : '#94a0bc';
      const canOpenStage = (typeof msCanViewSection !== 'function') || msCanViewSection('etapy');
      // ZMENA (7.8.2026): z vysoke dlazdice je jeden nizky radek pres celou
      // sirku - ikona, nazev a tlacitko vedle sebe. Tlacitko pod textem
      // delalo kartu zbytecne vysokou a pritom v ni bylo prazdno.
      wrap.innerHTML = `
        <div class="stage-card" id="stageCard" style="--stage-color:${color};border:1px solid color-mix(in srgb, ${color} 55%, transparent);
          background:var(--card-bg);border-radius:var(--radius);padding:9px 10px;cursor:pointer;box-sizing:border-box;
          display:flex;align-items:center;gap:10px;overflow:hidden;
          box-shadow:0 0 14px color-mix(in srgb, ${color} 18%, transparent)">
          <div style="width:36px;height:36px;border-radius:var(--radius);flex:0 0 36px;display:grid;place-items:center;color:${color};
            background:color-mix(in srgb, ${color} 8%, transparent);border:1px solid color-mix(in srgb, ${color} 55%, transparent)">
            ${msStageIconSvg(cur ? cur.key : null, 21)}
          </div>
          <div style="flex:1;min-width:0">
            <p style="margin:0 0 1px;color:#aeb7d6;text-transform:uppercase;letter-spacing:.1em;font-size:8px;font-weight:800">Aktuální etapa</p>
            <h2 style="margin:0;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cur ? cur.name : 'Zatím žádná etapa'}</h2>
            <p class="stage-status-line" style="display:flex;align-items:center;gap:5px;font-size:9.5px;color:#d8b8ff;margin:1px 0 0"><i style="width:5px;height:5px;border-radius:50%;background:${color};display:inline-block;box-shadow:0 0 6px ${color}"></i>${cur ? msStageStatusLabel(cur.key) : 'Nevybráno'}</p>
          </div>
          <button id="openStageBtn" style="flex:0 0 auto;border:1px solid color-mix(in srgb, ${color} 55%, transparent);
            background:rgba(255,255,255,.02);color:#fff;font-weight:800;font-size:11px;padding:8px 11px;cursor:pointer;border-radius:var(--radius);white-space:nowrap">${canOpenStage ? 'Otevřít →' : (typeof msLockIconSvg==='function'?msLockIconSvg(13):'')+' Zamčeno'}</button>
        </div>`;
      wrap.querySelector('#stageCard').addEventListener('click', (e)=>{
        if(e.target.closest('#openStageBtn')) return;
        if(!canOpenStage){ msShowAccessDenied(); return; }
        Router.go(cur ? 'stage-detail' : 'stages', cur ? {key:cur.key} : {});
      });
      wrap.querySelector('#openStageBtn').addEventListener('click', ()=>{
        if(!canOpenStage){ msShowAccessDenied(); return; }
        Router.go(cur ? 'stage-detail' : 'stages', cur ? {key:cur.key} : {});
      });
    }

    // VYLEPSENI (1.8.2026): karta ted rozlisuje, jestli uz appka s nekym
    // sdili - pokud ano, misto "Sdílet stavbu" ukaze "Spravovat sdílení"
    // (jde primo na seznam lidi, ne na "pridat dalsiho od znovu").
    async function renderShareCard(p){
      const wrap = container.querySelector('#shareCardWrap');
      if(!wrap) return;
      const rowMate = container.querySelector('#galleryTileWrap');
      const isOwn = p && !p.isShared;
      const hasPremium = typeof msIsPremiumMock === 'function' && msIsPremiumMock();
      const isOwnPremium = isOwn && hasPremium;

      // Ve sdilenem projektu (jsem host) nema karta co delat - sdileni
      // ridi vlastnik. Etapa v tom pripade zabere celou sirku.
      if(!isOwn){
        wrap.innerHTML = '';
        wrap.style.display = 'none';
        if(rowMate){
          rowMate.style.gridColumn = '1 / -1';
          // (11.8.2026) U hosta zabira galerie celou sirku - mrizka
          // nahledu se podle toho prizpusobi (viz renderTiles), jinak by
          // ctyri fotky byly obri a pod nimi prazdno.
          rowMate.dataset.wide = '1';
        }
        return;
      }

      // ZMENA (7.8.2026): vlastnik BEZ Premia driv nevidel nic - karta se
      // proste schovala a o moznosti sdilet se nedozvedel. Ted na miste
      // zustava lakadlo: rekne, co by sdileni umelo, a otevre nabidku
      // Premia. Zamerne to neni "Spravovat" - neni co spravovat.
      if(!isOwnPremium){
        wrap.style.display = '';
        if(rowMate){ rowMate.style.gridColumn = ''; delete rowMate.dataset.wide; }
        wrap.innerHTML = `
          <div id="shareTeaser" style="border:1px dashed color-mix(in srgb, #25b7ff 45%, transparent);
            background:color-mix(in srgb, #25b7ff 4%, transparent);border-radius:var(--radius);padding:10px;cursor:pointer;min-height:${VYSKA_SDILENI_GALERIE}px;height:100%;box-sizing:border-box;
            display:flex;flex-direction:column;justify-content:space-between;overflow:hidden">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:44px;height:44px;border-radius:var(--radius);flex:0 0 44px;display:grid;place-items:center;color:#25b7ff;
                background:color-mix(in srgb, #25b7ff 8%, transparent);border:1px dashed color-mix(in srgb, #25b7ff 45%, transparent)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9"/></svg>
              </div>
              <div style="flex:1;min-width:0">
                <p style="margin:0 0 2px;color:#aeb7d6;text-transform:uppercase;letter-spacing:.1em;font-size:8.5px;font-weight:800">Sdílení</p>
                <h2 style="margin:0;font-size:13.5px;color:#25b7ff;line-height:1.25">Ať vidí stavbu i ostatní</h2>
              </div>
            </div>
            <button id="shareTeaserBtn" style="width:100%;margin-top:8px;border:1px solid color-mix(in srgb, #25b7ff 45%, transparent);
              background:rgba(255,255,255,.02);color:#25b7ff;font-weight:800;font-size:11.5px;padding:7px;cursor:pointer;border-radius:var(--radius)">Co to umí →</button>
          </div>`;
        // Lakadlo vede na obrazovku Sdileni - at je videt, co to umi
        // (role, opravneni), a teprve tam je tlacitko "Aktivovat Premium".
        wrap.querySelector('#shareTeaser').addEventListener('click', ()=> Router.go('sdilet-stavbu'));
        return;
      }
      wrap.style.display = '';
      if(rowMate) rowMate.style.gridColumn = '';

      // ZMENA (7.8.2026): s aktivnim Premiem uz karta nelaka ke sdileni -
      // sdilet se da, takze je z ni sprava. Nazev je proto porad stejny
      // a meni se jen podradek s poctem lidi a tlacitko. Driv se karta
      // prepnula na "Spravovat" az ve chvili, kdy nekdo prijal pozvanku,
      // takze po zakoupeni Premia vypadala uplne stejne jako bez nej.
      /* ZMENA (13.8.2026): karta nesla jen dva radky textu a pod nimi
         zela velka prazdna plocha. Ted ukazuje to, co slibuje nazvem -
         kdo v tymu je. Data uz appka mela, jen se nikde nezobrazovala.
         Kdyz jeste nikdo pozvany neni, misto prazdna nabidne role, ktere
         jdou pozvat (klepnuti vede rovnou na pozvanku s prednastavenymi
         pravy). */
      let lide = [];
      if(typeof MSCloud !== 'undefined' && MSCloud.listPeople){
        try{
          const { people } = await MSCloud.listPeople();
          lide = people || [];
        }catch(e){ console.error('renderShareCard listPeople selhalo', e); }
      }
      const peopleCount = lide.length;
      const hasPeople = peopleCount > 0;

      const POPIS_ROLE = { rodina:'Rodina', dozor:'Stavební dozor', projektant:'Projektant', vlastni:'Vlastní' };
      const BARVA_ROLE = { rodina:'#c8562f', dozor:'#5a7fb0', projektant:'#25b7ff' };

      // Iniciály ze jména; u e-mailu vezmeme prvni pismeno pred zavinacem.
      function iniciály(jmeno){
        const t = String(jmeno || '').trim();
        if(!t) return '?';
        const cistý = t.includes('@') ? t.split('@')[0] : t;
        const slova = cistý.split(/[\s._-]+/).filter(Boolean);
        if(slova.length >= 2) return (slova[0][0] + slova[1][0]).toUpperCase();
        return cistý.slice(0, 2).toUpperCase();
      }

      /* Pozvany se do databaze zapisuje pod e-mailem, dokud mu vlastnik
         nedá jmeno. Cely e-mail se na uzkou kartu nevejde a vypada
         spatne, tak z nej vezmeme jen cast pred zavinacem. */
      function zobrazJmeno(jmeno){
        const t = String(jmeno || '').trim();
        if(!t) return 'Bez jména';
        if(!t.includes('@')) return t;
        return t.split('@')[0].replace(/[._-]+/g, ' ');
      }

      /* ZMENA (13.8.2026): jmenny seznam pod sebou dlazdici protahl - a
         vyssi dlazdice se neosvedcily. Ted je z toho jedna rada iniciál,
         ktera se vejde do puvodni vysky. Kdo je kdo, se poznava podle
         barvy role; cela jmena jsou po klepnuti ve sprave. */
      const KOLIK_UKAZAT = 5;
      const koleckoCloveka = (p)=>{
        const barva = BARVA_ROLE[p.role] || '#25b7ff';
        if(p.isPending){
          return `<span title="Čeká na přijetí" style="width:27px;height:27px;flex:0 0 27px;display:grid;place-items:center;
            font-size:11px;font-weight:800;border:1px dashed color-mix(in srgb, #ffd35c 60%, transparent);color:#ffd35c">?</span>`;
        }
        return `<span title="${msEsc(zobrazJmeno(p.name))}" style="width:27px;height:27px;flex:0 0 27px;display:grid;place-items:center;
          font-size:10px;font-weight:800;background:${barva};color:#04070f">${msEsc(iniciály(p.name))}</span>`;
      };

      /* Pozvany se do databaze zapisuje pod e-mailem, dokud mu vlastnik
         neda jmeno. Z e-mailu bereme jen cast pred zavinacem. */
      function zobrazJmeno(jmeno){
        const t = String(jmeno || '').trim();
        if(!t) return 'Bez jména';
        if(!t.includes('@')) return t;
        return t.split('@')[0].replace(/[._-]+/g, ' ');
      }

      const zbyva = peopleCount - KOLIK_UKAZAT;
      const seznamLidi = hasPeople
        ? `<div style="margin-top:10px;display:flex;align-items:center;gap:5px;flex-wrap:wrap">
            ${lide.slice(0, KOLIK_UKAZAT).map(koleckoCloveka).join('')}
            ${zbyva > 0 ? `<span style="font-size:10px;color:var(--muted)">+${zbyva}</span>` : ''}
          </div>`
        : '';

      // Prazdny tym: nabidka roli misto prazdne plochy.
      const stitekRole = (klic, popis, barva, ikona)=>
        `<span class="teamRoleChip" data-tpl="${klic}" style="display:flex;align-items:center;gap:5px;border:1px solid var(--line);
          padding:5px 8px;font-size:10px;color:var(--muted);cursor:pointer;background:rgba(255,255,255,.02)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${barva}" stroke-width="1.8">${ikona}</svg>${popis}
        </span>`;
      const nabidkaRoli = hasPeople ? '' : `
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:11px">
          ${stitekRole('rodina','Rodina','#c8562f','<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/>')}
          ${stitekRole('dozor','Dozor','#5a7fb0','<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>')}
          ${stitekRole('projektant','Projektant','#25b7ff','<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M8 9h8M8 13h5"/>')}
        </div>`;

      // Pocet uz je v nadpisu, tak se pod nim neopakuje.
      const label = hasPeople
        ? (peopleCount === 1 ? '1 člověk má přístup'
          : (peopleCount < 5 ? peopleCount + ' lidé mají přístup' : peopleCount + ' lidí má přístup'))
        : 'Zatím sám';
      const sub = '';

      wrap.innerHTML = `
        <div id="shareCard" style="border:1px solid color-mix(in srgb, #25b7ff 55%, transparent);
          background:color-mix(in srgb, #25b7ff 6%, transparent);border-radius:var(--radius);padding:10px;cursor:pointer;min-height:${VYSKA_SDILENI_GALERIE}px;height:100%;box-sizing:border-box;
          box-shadow:0 0 14px color-mix(in srgb, #25b7ff 18%, transparent);display:flex;flex-direction:column;justify-content:space-between;overflow:hidden">
          <div>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:44px;height:44px;border-radius:var(--radius);flex:0 0 44px;display:grid;place-items:center;color:#25b7ff;
              background:color-mix(in srgb, #25b7ff 8%, transparent);border:1px solid color-mix(in srgb, #25b7ff 55%, transparent)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9"/></svg>
            </div>
            <div style="flex:1;min-width:0">
              <p style="margin:0 0 2px;color:#aeb7d6;text-transform:uppercase;letter-spacing:.1em;font-size:8.5px;font-weight:800">Tým stavby</p>
              <h2 style="margin:0;font-size:13.5px;color:#25b7ff">${label}</h2>
              ${sub ? `<span style="font-size:10px;color:var(--muted)">${sub}</span>` : ''}
            </div>
          </div>
          ${seznamLidi}${nabidkaRoli}
          </div>
          <button id="shareCardBtn" style="width:100%;margin-top:8px;border:1px solid color-mix(in srgb, #25b7ff 55%, transparent);
            background:rgba(255,255,255,.02);color:#fff;font-weight:800;font-size:11.5px;padding:7px;cursor:pointer;border-radius:var(--radius)">${hasPeople ? 'Spravovat →' : 'Pozvat člověka →'}</button>
        </div>`;
      wrap.querySelector('#shareCard').addEventListener('click', ()=> Router.go('sdilet-stavbu'));
      // Stitek role vede rovnou na pozvanku s prednastavenymi pravy.
      wrap.querySelectorAll('.teamRoleChip').forEach(chip=>{
        chip.addEventListener('click', (e)=>{
          e.stopPropagation();
          Router.go('sdilet-stavbu', { tpl: chip.dataset.tpl });
        });
      });
    }

    function lockedTileHtml(title, minHeight){
      return `<div style="border:1px solid var(--line);background:var(--card-bg);border-radius:var(--radius);padding:12px;cursor:pointer;${minHeight?`min-height:${minHeight}px;`:''}display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;opacity:.6" class="ms-locked-tile">
        <div style="width:34px;height:34px;border:1.5px solid var(--muted);color:var(--muted);border-radius:50%;display:grid;place-items:center">${(typeof msLockIconSvg==='function')?msLockIconSvg(16):''}</div>
        <b style="font-size:11.5px;color:var(--muted);text-align:center">${title}</b>
      </div>`;
    }

    function renderMoneyCard(){
      const wrap = container.querySelector('#moneyCardWrap');
      if(typeof msCanViewSection === 'function' && !msCanViewSection('finance')){
        wrap.innerHTML = lockedTileHtml('Finance', 74);
        wrap.querySelector('.ms-locked-tile').addEventListener('click', ()=> msShowAccessDenied());
        return;
      }
      const now = new Date();
      const ym = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
      const monthExp = msExpenses().filter(e=>e.type==='expense' && (e.date||'').startsWith(ym)).reduce((s,e)=>s+Number(e.amount||0),0);
      const planned = msTotalPlanned();
      wrap.innerHTML = `
        <div style="border:1px solid var(--line);background:var(--card-bg);border-radius:var(--radius);padding:10px;margin-top:8px;cursor:pointer" id="moneyCard">
          <div style="display:flex;align-items:center;gap:5px;color:#4dffab;text-transform:uppercase;font-size:8.5px;font-weight:800;letter-spacing:.09em">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/></svg>
            Zůstatek účtu
          </div>
          <div style="font-size:22px;font-weight:800;color:#4dffab;margin:3px 0 6px">${msBalance().toLocaleString('cs-CZ')} Kč</div>
          <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted)"><span>Výdaje celkem</span><b style="color:#dfe4f5">${msTotalExpenses().toLocaleString('cs-CZ')} Kč</b></div>
          <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted);margin-top:2px"><span>Tento měsíc</span><b style="color:#dfe4f5">${monthExp.toLocaleString('cs-CZ')} Kč</b></div>
          ${planned>0 ? `<div style="display:flex;justify-content:space-between;font-size:10.5px;color:#ff9b32;margin-top:2px;border-top:1px solid var(--line);padding-top:5px"><span>Po budoucích výdajích (${planned.toLocaleString('cs-CZ')} Kč)</span><b>${msBalanceAfterPlanned().toLocaleString('cs-CZ')} Kč</b></div>` : ''}
        </div>`;
      wrap.querySelector('#moneyCard').addEventListener('click', ()=> Router.go('finance'));
    }

    function renderTiles(){
      const gWrap = container.querySelector('#galleryTileWrap');
      const canSeeFotky = typeof msCanViewSection !== 'function' || msCanViewSection('fotky');
      if(!canSeeFotky){
        gWrap.innerHTML = lockedTileHtml('Galerie', VYSKA_SDILENI_GALERIE);
        gWrap.querySelector('.ms-locked-tile').addEventListener('click', ()=> msShowAccessDenied());
      }
      else {
      // ZMENA (11.8.2026): drive se ukazovaly DVE fotky pres `flex:1`, tedy
      // kazda pres pul dlazdice pri vysce 44 px - z fotek byly siroke
      // pruhy, ve kterych nebylo nic poznat. Ted ctyri ctvercove nahledy
      // v mrizce. Kdyz jsou fotky jen dve, zustanou ctvercove a mrizka
      // se nedopocitava - to je porad lepsi nez roztazeny pruh.
      // U hosta je dlazdice pres celou sirku (karta sdileni se schova),
      // takze se vejde vic nahledu vedle sebe.
      // ZMENA (11.8.2026): nahledy jsou ve DVOU RADACH - na jedne radu
      // by ctyri (natoz osm) fotky vysly na par milimetru a nebylo by v
      // nich nic videt. Dve rady po dvou (vlastnik) / po ctyrech (host)
      // drzi ctvercovy tvar a rozumnou velikost. Dlazdice je proto o kus
      // vyssi - viz VYSKA_DLAZDICE nize.
      // ZMENA (13.8.2026): zpatky na JEDNU radu nahledu. Dve rady sice
      // daly vetsi fotky, ale dlazdice kvuli tomu narostla o polovinu a
      // cely dashboard pusobil tezkopadne. Ctvercovy tvar zustava - to
      // byla puvodni chyba (fotky roztazene do sirokych pruhu).
      const jeSiroka = gWrap.dataset.wide === '1';
      const sloupcu = jeSiroka ? 4 : 2;
      const kolikNahledu = sloupcu;
      const lastPhotos = [...msPhotos()].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0, kolikNahledu);
      const thumbsHtml = lastPhotos.length
        ? `<div style="display:grid;grid-template-columns:repeat(${sloupcu},1fr);gap:4px;margin-top:6px">${lastPhotos.map(p=>{
            const bg = p.thumb ? `background-image:url(${p.thumb});background-size:cover;background-position:center` : `background:rgba(179,76,255,.12)`;
            return `<div style="aspect-ratio:1;border-radius:var(--radius);border:1px solid var(--line);${bg}"></div>`;
          }).join('')}</div>`
        : `<div style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;color:var(--accent)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="9" cy="11" r="2"/><path d="M14 15l3-3 4 4"/></svg><span style="font-size:10.5px">Přidej první fotku</span></div>`;
      gWrap.innerHTML = `
        <div style="border:1px solid var(--line);background:var(--card-bg);border-radius:var(--radius);padding:12px;cursor:pointer;height:100%;min-height:${VYSKA_SDILENI_GALERIE}px;display:flex;flex-direction:column" id="galleryTile">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div style="display:flex;align-items:baseline;gap:6px;min-width:0">
              <b style="font-size:13px;color:#fff">Galerie</b>
              <!-- (11.8.2026) Pocet fotek byl pod nahledy, kde jen zabiral
                   radek navic. Vedle nazvu je videt hned a dlazdice tim
                   zaroven zkratla. -->
              <span style="font-size:10px;color:var(--muted);white-space:nowrap">${msPhotos().length} fotek</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color:var(--muted);flex:0 0 16px"><rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="9" cy="11" r="2"/></svg>
          </div>
          ${thumbsHtml}
        </div>`;
      gWrap.querySelector('#galleryTile').addEventListener('click', ()=> Router.go('gallery'));
      }

      const eWrap = container.querySelector('#eventTileWrap');
      const canSeeKalendar = typeof msCanViewSection !== 'function' || msCanViewSection('kalendar');
      if(!canSeeKalendar){
        eWrap.innerHTML = lockedTileHtml('Kalendář', 118);
        eWrap.querySelector('.ms-locked-tile').addEventListener('click', ()=> msShowAccessDenied());
        return;
      }
      const events = msEvents();
      const today = todayISO();
      const next = events.filter(e=>e.date>=today).sort((a,b)=>a.date.localeCompare(b.date))[0];
      const evDateLabel = next ? formatDateCz(next.date) + (next.time ? ' · '+next.time : ' · celý den') : '';
      eWrap.innerHTML = `
        <div style="border:1px solid var(--line);background:var(--card-bg);border-radius:var(--radius);padding:12px;cursor:pointer;height:100%;min-height:118px;display:flex;flex-direction:column" id="eventTile">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <b style="font-size:13px;color:#fff">Kalendář</b>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color:var(--muted)"><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:3px">
            ${next ? `
              <p style="margin:0 0 2px;font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:800">Nejbližší událost</p>
              <div style="display:flex;align-items:center;gap:6px">
                <div style="width:24px;height:24px;border-radius:var(--radius);background:rgba(37,183,255,.12);border:1px solid #25b7ff;color:#25b7ff;display:grid;place-items:center;flex:0 0 auto">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>
                </div>
                <p style="margin:0;font-size:11px;color:#fff;font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(next.title)}</p>
              </div>
              <span style="font-size:9.5px;color:#c9a3ff">${evDateLabel}</span>
            ` : `<p style="margin:0;font-size:11px;color:var(--muted)">Žádná událost</p>`}
          </div>
        </div>`;
      eWrap.querySelector('#eventTile').addEventListener('click', ()=> Router.go('calendar'));
    }

    /* ==========================================================
       AKTUALITY (7.8.2026)
       Dlazdice "co se v poslednich dnech na stavbe delo". Neni to
       novy druh dat - jen slouceni toho, co uz appka ma (denik,
       fotky, vydaje, udalosti), serazene od nejnovejsiho.
       ========================================================== */
    function renderNewsTile(){
      const wrap = container.querySelector('#newsTileWrap');
      if(!wrap) return;
      const last = msRecentActivity(3);
      const rows = last.length
        ? last.map(i=>`
            <div style="display:flex;align-items:center;gap:7px;padding:5px 0;border-top:1px solid var(--line)">
              <i style="width:5px;height:5px;border-radius:50%;background:${i.color};display:inline-block;flex:0 0 5px"></i>
              <span style="font-size:11.5px;color:#fff;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(i.text)}</span>
              <span style="font-size:9.5px;color:var(--muted);flex:0 0 auto">${i.date?formatDateCz(i.date):''}</span>
            </div>`).join('')
        : `<p style="margin:7px 0 0;font-size:11px;color:var(--muted);display:flex;align-items:center;gap:6px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" style="flex:0 0 13px"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            Tady se objeví, co uděláš první</p>`;

      wrap.innerHTML = `
        <div id="newsTile" style="border:1px solid var(--line);background:var(--card-bg);border-radius:var(--radius);padding:10px;cursor:pointer;box-sizing:border-box;overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
            <b style="font-size:13px;color:#fff">Aktuality</b>
            <span style="display:flex;align-items:center;gap:6px;font-size:10.5px;color:var(--muted)">Vše
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
            </span>
          </div>
          ${rows}
        </div>`;
      wrap.querySelector('#newsTile').addEventListener('click', ()=> Router.go('news'));
    }

    /* ==========================================================
       UKOLY (7.8.2026)
       Ukazuje pocet otevrenych a nejblizsi termin. Po kliknuti vede
       na samostatnou obrazovku Ukoly.
       ========================================================== */
    function renderTaskTile(){
      const wrap = container.querySelector('#taskTileWrap');
      if(!wrap) return;
      const canSee = (typeof msCanViewSection !== 'function') || msCanViewSection('kalendar');
      if(!canSee){
        wrap.innerHTML = lockedTileHtml('Úkoly', 118);
        wrap.querySelector('.ms-locked-tile').addEventListener('click', ()=> msShowAccessDenied());
        return;
      }
      // Poradi je dane prioritou: po terminu > dnes > budouci > bez terminu.
      // Stejne razeni pouziva i obrazovka Ukoly, at si to nikde neodporuje.
      const open = msTasksByPriority().filter(t=>!t.done);
      const top = open.slice(0,3);
      const t = todayISO();

      const rows = top.map(x=>{
        const overdue = x.date && x.dateMode!=='none' && x.date < t;
        const today   = x.date && x.dateMode!=='none' && x.date === t;
        const col = overdue ? '#ff7a86' : (today ? '#ff9b32' : 'var(--muted)');
        const when = !x.date || x.dateMode==='none' ? 'bez termínu'
                   : (overdue ? 'po termínu' : (today ? 'dnes' : formatDateCz(x.date)));
        return `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-top:1px solid var(--line)">
          <i style="width:5px;height:5px;border-radius:50%;background:${col};display:inline-block;flex:0 0 5px"></i>
          <span style="font-size:11px;color:#fff;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(x.title)}</span>
          <span style="font-size:9px;color:${col};flex:0 0 auto">${when}</span>
        </div>`;
      }).join('');

      wrap.innerHTML = `
        <div id="taskTile" style="border:1px solid var(--line);background:var(--card-bg);border-radius:var(--radius);padding:10px;cursor:pointer;height:118px;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <b style="font-size:13px;color:#fff">Úkoly</b>
            <span style="font-size:10.5px;color:${open.length?'#ff9b32':'var(--muted)'};font-weight:800">${open.length}</span>
          </div>
          ${open.length ? rows : `<p style="margin:7px 0 0;font-size:11px;color:var(--muted);display:flex;align-items:center;gap:6px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" style="flex:0 0 13px"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            ${msTasks().length?'Všechno hotovo':'Žádný úkol tě netlačí'}</p>`}
        </div>`;
      wrap.querySelector('#taskTile').addEventListener('click', ()=> Router.go('tasks'));
    }

    function renderProjectSwitcher(activeP, list, activeId){
      const panel = container.querySelector('#projPanel');
      panel.innerHTML = list.map(pr=>`
        <div class="dd-item ${pr.id===activeId?'is-active':''}" data-id="${pr.id}">
          <span>${msEsc(pr.name)} <small style="color:var(--muted)">· ${msEsc(pr.location || '')}</small></span>
        </div>`).join('') + `<div class="dd-item" id="projAddItem" style="color:#b34cff;font-weight:800">+ Přidat projekt</div>`;
      panel.querySelectorAll('.dd-item[data-id]').forEach(el=>{
        el.addEventListener('click', ()=>{
          msSetActiveProjectId(el.dataset.id);
          Router.go('dashboard');
        });
      });
      panel.querySelector('#projAddItem').addEventListener('click', ()=> Router.go('onboarding-project'));
      container.querySelector('#projBtn').addEventListener('click', ()=> panel.classList.toggle('open'));
      /* OPRAVA (11.8.2026): tenhle posluchac se pridaval na document pri
         KAZDEM vykresleni dashboardu a nikdy se neodpojil. Pri prechazeni
         mezi obrazovkami se jich nahromadily desitky - kazdy drzel v
         pameti uz zahozenou kopii obrazovky a pri kazdem kliknuti kdekoliv
         v appce se vsechny zbytecne prochazely. Ted se posluchac pri
         prvnim kliknuti po zahozeni obrazovky odpoji sam. */
      document.addEventListener('click', function outside(e){
        if(!container.isConnected){ document.removeEventListener('click', outside); return; }
        if(!container.contains(e.target)){ return; }
        if(!e.target.closest('#projDropdown')) panel.classList.remove('open');
      });
    }

    function wireTopActions(p){
      container.querySelector('#settingsBtn').addEventListener('click', ()=> Router.go('settings'));
      const shareBtnEl = container.querySelector('#shareBtn');
      if(p && p.isShared){
        shareBtnEl.style.display = 'none'; // sdileni dalsim lidem je vec vlastnika, ne pozvaneho
      } else {
        shareBtnEl.addEventListener('click', ()=> Router.go('sdilet-stavbu'));
      }

    function renderPlanBadge(){
      const wrap = container.querySelector('#planBadgeWrap');
      if(!wrap) return;
      // OPRAVA (1.8.2026): sdileny projekt neni muj - Premium/sdileni
      // spravuje vylucne vlastnik na SVEM zarizeni. Zobrazit tady "Free"
      // a nechat to jeste klikatelne na koupi Premium bylo matouci a
      // nemelo by to ani smysl (kdyby to appka pustila, zalozila by
      // omylem uplne jiny, spatny cloudovy zaznam).
      if(p && p.isShared){
        wrap.innerHTML = `<div id="planBadge" style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;padding:4px 9px;border:1.3px solid #25b7ff;color:#25b7ff;flex:0 0 auto">Sdíleno</div>`;
        return;
      }
      const isPremium = msIsPremiumMock();
      const planType = msGetPremiumPlanType();
      if(!isPremium){
        wrap.innerHTML = `<div id="planBadge" style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;padding:4px 9px;border:1.3px solid var(--line);color:var(--muted);cursor:pointer;flex:0 0 auto">Free</div>`;
        wrap.querySelector('#planBadge').addEventListener('click', ()=>{
          PremiumLogin.open(renderPlanBadge);
        });
        return;
      }
      const isLifetime = planType === 'lifetime';
      wrap.innerHTML = `<div id="planBadge" style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;padding:4px 9px;border:1.3px solid ${isLifetime?'var(--accent)':'var(--money-pos)'};color:${isLifetime?'var(--accent)':'var(--money-pos)'};cursor:pointer;flex:0 0 auto">Premium${isLifetime?' ∞':''}</div>`;
      wrap.querySelector('#planBadge').addEventListener('click', ()=> openPlanStatusSheet(planType));
    }

    function openPlanStatusSheet(planType){
      const overlay = document.createElement('div');
      overlay.className = 'ms-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(29,30,28,.55);z-index:92;display:flex;align-items:flex-end;justify-content:center';
      document.body.appendChild(overlay);
      const isLifetime = planType === 'lifetime';
      const planLabel = isLifetime ? 'Natrvalo' : (planType === 'yearly' ? 'Ročně' : 'Měsíčně');
      overlay.innerHTML = `
        <div style="width:100%;max-width:480px;background:var(--card-bg-2);border-top:1.5px solid var(--line);padding:20px 20px calc(22px + min(env(safe-area-inset-bottom),34px));text-align:center">
          <div style="display:flex"><button id="psClose" style="width:26px;height:26px;border:1.5px solid var(--line);display:grid;place-items:center;color:var(--muted);margin-left:auto;cursor:pointer;background:transparent"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
          <div style="width:46px;height:46px;border:1.5px solid var(--money-pos);color:var(--money-pos);display:grid;place-items:center;margin:4px auto 14px"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>
          <h2 style="font-family:var(--font-head);font-size:19px;margin:0 0 6px">Premium je aktivní</h2>
          <p style="font-size:12.5px;color:var(--muted);margin:0 0 18px;line-height:1.5">${esc(p ? p.name : 'Tahle stavba')} má cloudovou zálohu a jde ji sdílet.</p>
          <div style="border:1.5px solid var(--line);background:var(--card-bg);padding:14px;text-align:left;margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12.5px"><b>Plán</b><span style="color:var(--muted)">${planLabel}</span></div>
            <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12.5px"><b>${isLifetime?'Platnost':'Obnoví se'}</b><span style="color:var(--muted)">${isLifetime?'Navždy':'(datum zjistí appka z Google Play)'}</span></div>
          </div>
          ${isLifetime ? '' : `<button id="psGplay" style="width:100%;border:1.5px solid var(--line);background:var(--card-bg);color:var(--text-main);font-weight:700;font-size:13px;padding:12px;cursor:pointer;font-family:inherit">Spravovat v Google Play</button>`}
        </div>
      `;
      overlay.querySelector('#psClose').addEventListener('click', ()=> overlay.remove());
      const gplayBtn = overlay.querySelector('#psGplay');
      if(gplayBtn) gplayBtn.addEventListener('click', ()=> alert('(náhled) appka by otevřela nativní správu předplatných v Google Play'));
    }
    function esc(s){ return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    renderPlanBadge();
      container.querySelector('#searchBtn').addEventListener('click', ()=> toggleSearch());

    }

    function toggleSearch(){
      const wrap = container.querySelector('#searchWrap');
      const isOpen = wrap.dataset.open === '1';
      if(isOpen){ wrap.innerHTML=''; wrap.dataset.open='0'; return; }
      wrap.dataset.open = '1';
      wrap.innerHTML = `
        <div style="padding:0 16px 8px">
          <input id="searchInput" class="f-input" placeholder="Hledat cokoliv - výdaj, zápis, etapu…" autofocus/>
          <div id="searchResults" style="margin-top:6px"></div>
        </div>
      `;
      const fmtDate = (iso)=>{ if(!iso) return ''; const d=new Date(iso+'T00:00:00'); return isNaN(d)?iso:`${d.getDate()}.${d.getMonth()+1}.`; };
      const index = [
        ...msSelectedStages().map(s=>({label:s.name, sub:'Etapa', color:s.color, route:'stage-detail', params:{key:s.key}})),
        {label:'Finance', sub:'Sekce', color:'#4dffab', route:'finance'},
        {label:'Galerie', sub:'Sekce', color:'#25b7ff', route:'gallery'},
        {label:'Deník', sub:'Sekce', color:'#ffd35c', route:'diary'},
        {label:'Projekt', sub:'Sekce', color:'#c9a3ff', route:'project'},
        {label:'Kalendář', sub:'Sekce', color:'#25b7ff', route:'calendar'},
        {label:'Nastavení', sub:'Sekce', color:'#94a0bc', route:'settings'},
        ...msExpenses().map(t=>({
          label: t.title || (t.type==='expense'?'Bez popisu':'Vklad na účet'),
          sub: `${t.type==='expense'?'Výdaj':'Vklad'} · ${Number(t.amount||0).toLocaleString('cs-CZ')} Kč · ${fmtDate(t.date)}`,
          color:'#4dffab', route:'expense-add', params:{edit:t.id},
        })),
        ...msDiary().map(e=>({
          label: e.text || (e.title||'Zápis do deníku'),
          sub: `Deník · ${(msStageByKey(e.stage)||{}).name||''} · ${fmtDate(e.date)}`,
          color:'#ffd35c', route:'diary', params:{stage:e.stage},
        })),
        ...msDocuments().map(d=>({
          label: d.name,
          sub: `Dokument · ${(msStageByKey(d.stage)||{}).name||''}`,
          color:'#25b7ff', route:'project', params:{stage:d.stage},
        })),
        ...msPhotos().filter(p=>p.caption).map(p=>({
          label: p.caption,
          sub: `Fotka · ${(msStageByKey(p.stage)||{}).name||''} · ${fmtDate(p.date)}`,
          color:'#b34cff', route:'gallery', params:{stage:p.stage},
        })),
        ...msEvents().map(e=>({
          label: e.title,
          sub: `Událost · ${fmtDate(e.date)}`,
          color:'#25b7ff', route:'calendar',
        })),
        ...msTasks().map(t=>({
          label: t.title,
          sub: `Úkol${t.done?' · hotovo':''} · ${t.dateMode==='none'?'bez termínu':fmtDate(t.date)}`,
          color:'#ff9b32', route:'calendar',
        })),
      ];
      const input = wrap.querySelector('#searchInput');
      const results = wrap.querySelector('#searchResults');
      input.addEventListener('input', ()=>{
        const q = input.value.trim().toLowerCase();
        if(!q){ results.innerHTML=''; return; }
        const matches = index.filter(i=>(i.label||'').toLowerCase().includes(q));
        results.innerHTML = matches.length
          ? matches.map((m,i)=>`<div class="sr-item" data-i="${i}" style="display:flex;align-items:center;gap:8px;padding:9px 0;border-top:1px solid var(--line);cursor:pointer">
              <i style="width:7px;height:7px;border-radius:50%;background:${m.color};display:inline-block;flex:0 0 auto"></i>
              <div style="min-width:0"><span style="display:block;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(m.label)}</span>${m.sub?`<span style="display:block;font-size:9.5px;color:var(--muted)">${msEsc(m.sub)}</span>`:''}</div>
            </div>`).join('')
          : '<p style="font-size:11px;color:var(--muted);padding:8px 0">Nic nenalezeno.</p>';
        results.querySelectorAll('.sr-item').forEach(el=>{
          el.addEventListener('click', ()=>{
            const m = matches[Number(el.dataset.i)];
            Router.go(m.route, m.params||{});
          });
        });
      });
    }

    function checkJubilee(p){
      if(!p.started) return;
      const months = monthsBetween(p.startDate, new Date());
      const label = jubileeLabel(months);
      if(!label) return;
      const lastDone = p.lastMilestoneMonths || 0;
      if(months > lastDone && months > 0 && months % 1 === 0 && (months===1 || months%1===0) && label){
        // jednoduchy jubilejni banner jen jednou za dany pocet mesicu
      }
    }

    function renderDailyReminder(){
      const wrap = container.querySelector('#dailyReminderWrap');
      const t = todayISO();
      const alreadyShownToday = msLoad('ms_daily_reminder_shown_v1', ()=>null) === t;

      const addDays = (iso, n)=>{ const d = new Date(iso+'T00:00:00'); d.setDate(d.getDate()+n); return msDateToIso(d); };
      const tomorrow = addDays(t, 1), weekAhead = addDays(t, 7);

      const events = msEvents();
      const tasks = msTasks();
      // pouziva stejnou logiku jako Kalendar (msTaskVisibleOn), takze sem
      // spravne spadnou i "bez terminu" ukoly (kazdy den, dokud nejsou
      // splnene) a propadle terminy, co se "vlecou" pod dneskem
      const todayTaskVis = tasks.map(x=>({ x, vis: msTaskVisibleOn(x, t, t) })).filter(r=>r.vis.visible && !r.x.done);
      const todayItems = [
        ...events.filter(e=>e.date===t).map(e=>e.title),
        ...todayTaskVis.map(r=> r.vis.highlighted ? r.x.title+' (po termínu)' : r.x.title),
      ];
      const tomorrowItems = tasks.filter(x=>x.dateMode==='deadline' && x.date===tomorrow && !x.done).map(x=>x.title);
      const weekItems = tasks.filter(x=>x.dateMode==='deadline' && x.date===weekAhead && !x.done).map(x=>x.title);
      const hasAnything = todayItems.length || tomorrowItems.length || weekItems.length;

      if(!alreadyShownToday && hasAnything){
        const rows = [];
        if(todayItems.length) rows.push(`<b style="color:var(--accent)">Dnes</b> ${todayItems.join(', ')}`);
        if(tomorrowItems.length) rows.push(`<b style="color:var(--accent)">Zítra</b> ${tomorrowItems.join(', ')}`);
        if(weekItems.length) rows.push(`<b style="color:var(--accent)">Za týden</b> ${weekItems.join(', ')}`);
        wrap.innerHTML = `
          <div id="dailyReminderCard" style="border:1px solid var(--accent);background:var(--card-bg-2);padding:10px 12px;margin-top:8px;position:relative;cursor:pointer">
            <span id="dailyReminderClose" style="position:absolute;top:6px;right:8px;cursor:pointer;color:var(--muted);font-size:12px">✕</span>
            <div style="font-size:10.5px;line-height:1.7;padding-right:16px">${rows.join('<br/>')}</div>
          </div>`;
        wrap.querySelector('#dailyReminderClose').addEventListener('click', (e)=>{ e.stopPropagation(); wrap.innerHTML = ''; });
        wrap.querySelector('#dailyReminderCard').addEventListener('click', ()=> Router.go('calendar'));
        msSave('ms_daily_reminder_shown_v1', t);
      } else {
        wrap.innerHTML = '';
      }

      // volitelna OS notifikace navrch (jen kdyz uzivatel notifikace povolil) -
      // pouziva stejne "uz dnes zobrazeno" hlidani jako banner vyse
      if(hasAnything && localStorage.getItem('ms_notifications_enabled_v1')==='1'
         && typeof Notification!=='undefined' && Notification.permission==='granted' && !alreadyShownToday){
        const parts = [];
        if(todayItems.length) parts.push('Dnes: '+todayItems.join(', '));
        if(tomorrowItems.length) parts.push('Zítra: '+tomorrowItems.join(', '));
        if(weekItems.length) parts.push('Za týden: '+weekItems.join(', '));
        new Notification('Moje Stavba', { body: parts.join(' · ') });
      }
    }
  }

  return { render };
})();

Router.register('dashboard', DashboardScreen);
