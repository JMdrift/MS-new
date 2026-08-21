/* ==========================================================
   ETAPY - kolo (karusel)
   ========================================================== */
const StagesWheelScreen = (function(){
  function render(container){
    const stages = msSelectedStages();
    const N = stages.length;
    let pos = Math.max(0, stages.findIndex(s=>s.key===msGetCurrentStage()));

    // ve Skice (denni i nocni) nemaji etapy vlastni barvy - ale plocha jedna
    // akcentni barva pro vsechny karty v kole splyva ("nesplyva" byl
    // pozadavek). Misto toho rozlozime karty po prechodu tmava -> cihlova
    // (accent) -> svetla, coz dava vetsi rozpeti nez pouhe odstiny jedne
    // barvy a porad to pusobi jako jedna sourodá paleta, ne pestrobarevny
    // neon. Nocni motiv (sketch-dark) je zatim skryty - viz app.css.
    const themeName = document.documentElement.dataset.theme;
    const themed = themeName === 'sketch' || themeName === 'sketch-dark';
    function hexToRgb(hex){ const n=parseInt(hex.replace('#',''),16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
    function mixRgb(c1,c2,t){ return `rgb(${Math.round(c1.r+(c2.r-c1.r)*t)},${Math.round(c1.g+(c2.g-c1.g)*t)},${Math.round(c1.b+(c2.b-c1.b)*t)})`; }
    // svetla Skica konci v bile, nocni Skica konci v teple jantarove -
    // bila by na tmavem pozadi pusobila jako cizi, studeny prvek
    const GRAD_STOPS = (themeName === 'sketch-dark'
      ? ['#1d1a17', '#c8562f', '#e0a05a']
      : ['#1d1e1c', '#a8503c', '#ffffff']
    ).map(hexToRgb);
    function themedStageColor(idx){
      if(N<=1) return `rgb(${GRAD_STOPS[1].r},${GRAD_STOPS[1].g},${GRAD_STOPS[1].b})`;
      const t = idx/(N-1);
      return t<0.5 ? mixRgb(GRAD_STOPS[0], GRAD_STOPS[1], t*2) : mixRgb(GRAD_STOPS[1], GRAD_STOPS[2], (t-0.5)*2);
    }
    function displayColor(idx, fallback){ return themed ? themedStageColor(idx) : fallback; }

    container.innerHTML = `
      <div class="topbar">
        <div>
          <b style="display:block;font-size:18px" id="hProjName">Projekt</b>
          <span style="display:block;font-size:11.5px;color:var(--muted)" id="hProjLoc"></span>
        </div>
        <div style="flex:1"></div>
        <div class="icon-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></div>
        <div class="icon-btn" onclick="Router.go('settings')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09c0 .68.39 1.28 1 1.51.66.26 1.42.12 1.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06c-.45.4-.59 1.16-.33 1.82.23.61.83 1 1.51 1H21a2 2 0 010 4h-.09c-.68 0-1.28.39-1.51 1z"/></svg></div>
      </div>
      <div class="screen-scroll">
        <h1 style="font-size:26px;margin:4px 0 14px">Etapy</h1>
        <div id="wheelArea"></div>
        <div id="emptyWheel" style="display:none;margin:20px 0;padding:26px 20px;text-align:center;border:1px dashed var(--line);cursor:pointer">
          <div style="width:44px;height:44px;border:1px solid var(--accent);color:var(--accent);margin:0 auto 12px;display:grid;place-items:center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </div>
          <b style="display:block;font-size:15px;margin-bottom:6px">Přidat etapu</b>
          <span style="font-size:11.5px;color:var(--muted);line-height:1.5">Zatím nemáš vybranou žádnou etapu - přidej první, se kterou chceš začít.</span>
        </div>
        <div id="centerCardWrap"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">
          <div class="btn-ghost stage-icon-colored" style="cursor:pointer;text-align:left;padding:12px;color:var(--accent) !important" id="listBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            <b style="display:block;margin-top:6px;color:#fff;font-size:13px">Přehled etap</b><span style="font-size:10.5px">Všechny etapy přehledně</span>
          </div>
          <div class="btn-ghost stage-icon-colored" style="cursor:pointer;text-align:left;padding:12px;color:var(--accent) !important" id="newStageBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            <b style="display:block;margin-top:6px;color:#fff;font-size:13px">Nová etapa</b><span style="font-size:10.5px">Vytvořit novou etapu</span>
          </div>
        </div>
      </div>
    `;

    const projects = msLoadProjects();
    const active = projects.find(p=>p.id===msGetActiveProjectId()) || projects[0];
    if(active){
      container.querySelector('#hProjName').textContent = active.name;
      container.querySelector('#hProjLoc').textContent = active.location||'';
    }

    // OPRAVA (2.8.2026): zalozeni nove etapy je (stejne jako jeji
    // mazani) vyhrazene jen vlastnikovi - bez ohledu na jakakoli prava
    // pozvaneho v sekci "etapy". Misto aby appka pozvaneho poslala na
    // formular, ktery by mu stejne k nicemu nebyl, ukaze zamek rovnou na
    // tlacitku s konkretnim vysvetlenim.
    const stageAddLocked = !!(active && active.isShared);
    const newStageBtn = container.querySelector('#newStageBtn');
    if(stageAddLocked){
      newStageBtn.style.opacity = '.5';
      newStageBtn.style.position = 'relative';
      const lockSpan = document.createElement('span');
      lockSpan.style.cssText = 'position:absolute;top:8px;right:8px;color:currentColor';
      lockSpan.innerHTML = (typeof msLockIconSvg==='function') ? msLockIconSvg(14) : '';
      newStageBtn.appendChild(lockSpan);
      newStageBtn.querySelector('span:not([style*="position:absolute"])').textContent = 'Jen vlastník stavby';
    }
    container.querySelector('#listBtn').addEventListener('click', ()=> Router.go('stages-list'));
    newStageBtn.addEventListener('click', ()=>{
      if(stageAddLocked){ alert('Novou etapu může založit jen vlastník stavby - appka ji pak automaticky ukáže i tobě.'); return; }
      Router.go('new-stage');
    });

    if(N===0){
      const emptyWheel = container.querySelector('#emptyWheel');
      emptyWheel.style.display = 'block';
      if(stageAddLocked){
        emptyWheel.style.opacity = '.7';
        emptyWheel.querySelector('b').textContent = 'Zatím žádná etapa';
        emptyWheel.querySelector('span').textContent = 'Vlastník stavby zatím nevybral žádnou etapu ke sledování.';
        emptyWheel.addEventListener('click', ()=> alert('Novou etapu může založit jen vlastník stavby - appka ji pak automaticky ukáže i tobě.'));
      } else {
        emptyWheel.addEventListener('click', ()=> Router.go('new-stage'));
      }
      return { activeTab:'stages' };
    }

    renderWheelArea();
    renderCenterCard();

    function renderWheelArea(){
      const wrap = container.querySelector('#wheelArea');
      const CARD_W = 96;
      wrap.innerHTML = `
        <div style="position:relative">
          <div id="wheelSpotlight" style="position:absolute;top:0;bottom:0;left:50%;width:${CARD_W+16}px;margin-left:${-(CARD_W+16)/2}px;
            background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.01));border-left:1px solid var(--line);border-right:1px solid var(--line);
            pointer-events:none;z-index:0;border-radius:var(--radius)"></div>
          <div style="display:flex;gap:8px;overflow-x:auto;padding:6px calc(50% - ${CARD_W/2}px) 16px;scroll-snap-type:x mandatory;position:relative;z-index:1" id="wheelScroll"></div>
        </div>
      `;
      const scroll = wrap.querySelector('#wheelScroll');
      const noEtapyAccess = typeof msCanViewSection === 'function' && !msCanViewSection('etapy');
      stages.forEach((s,i)=>{
        const card = document.createElement('div');
        card.dataset.i = i;
        const isCurrentStage = msGetCurrentStage() === s.key;
        const dc = displayColor(i, s.color);
        card.className = 'stage-icon-colored';
        card.style.cssText = `flex:0 0 auto;width:${CARD_W}px;height:130px;border:1px solid color-mix(in srgb, ${dc} 45%, var(--line));
          background:color-mix(in srgb, ${dc} 7%, var(--card-bg-2));display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;
          cursor:pointer;color:${dc} !important;scroll-snap-align:center;transition:box-shadow .2s ease, border-color .2s ease;position:relative;${noEtapyAccess?'opacity:.5':''}`;
        card.innerHTML = `${isCurrentStage?'<span style="position:absolute;top:8px;left:50%;transform:translateX(-50%);font-size:7.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;border:1px solid currentColor;padding:2px 6px;white-space:nowrap">Aktuální</span>':''}${noEtapyAccess?`<span style="position:absolute;top:8px;right:8px;color:currentColor">${(typeof msLockIconSvg==='function')?msLockIconSvg(14):''}</span>`:''}${msStageIconSvg(s.key, 30)}<b style="font-size:11px;color:#e7e9fb;text-align:center;padding:0 5px">${msEsc(s.name)}</b>`;
        card.addEventListener('click', ()=>{
          if(i===pos){ if(noEtapyAccess){ msShowAccessDenied(); return; } Router.go('stage-detail', {key:s.key}); }
          else { pos = i; scrollToCard(i, true); renderCenterCard(); applyHighlight(i); }
        });
        scroll.appendChild(card);
      });

      const CARD_STEP = CARD_W + 8; // 8 = gap mezi kartami
      // Cachovano jednou (ne pri kazdem snimku behem svihu) - obojí se
      // behem otevrene obrazovky nemeni (seznam karet je pevny, sirka
      // viewportu se meni jen pri otoceni telefonu, coz si appka i tak
      // resi cerstvym vykreslenim cele obrazovky).
      const wheelCards = [...scroll.children];
      const halfViewport = scroll.clientWidth/2;

      function applyDepthEffect(){
        // OPRAVA (2.8.2026, treti a skutecna pricina): getBoundingClientRect()
        // se volalo pro VSECH 26 karet na kazdem snimku behem svihu - to je
        // vynuceny SYNCHRONNI prepocet layoutu, nejdrazsi operace, jakou JS
        // muze udelat. Pri primem tazeni prstem appka dostava MNOHEM vic
        // scroll udalosti (a tedy snimku k prepocitani) nez pri kratke
        // naprogramovane animaci po kliknuti na kartu - to presne vysvetluje,
        // proc klikani bylo v poradku (par snimku) a svih ne (desitky
        // snimku), i kdyz oboji bezi uplne stejny kod.
        //
        // Reseni: appka uz vubec nemusi cist polohu karet z DOM. Karty maji
        // pevnou sirku a mezeru (CARD_STEP), takze jejich poloha jde
        // spocitat cistě matematicky ze scroll.scrollLeft - zadny
        // getBoundingClientRect, zadny vynuceny layout, jen aritmetika.
        const sLeft = scroll.scrollLeft;
        wheelCards.forEach((card,i)=>{
          const dist = Math.abs(sLeft - i*CARD_STEP);
          const norm = Math.min(1, dist/halfViewport);
          const scale = 1 - norm*0.16;
          const opacity = 1 - norm*0.55;
          card.style.transform = `scale(${scale.toFixed(3)})`;
          card.style.opacity = opacity.toFixed(2);
        });
      }
      // Prebarveni glow/okraje - drahe na prekresleni, takze se dela jen
      // pro DVE karty (predchozi zvyraznenou a novou), ne pro vsech 26,
      // a jen JEDNOU pri zastaveni (viz volani nize), ne pri kazdem
      // snimku behem svihu.
      let highlightedIndex = -1;
      function applyHighlight(newIndex){
        if(newIndex === highlightedIndex) return;
        [highlightedIndex, newIndex].forEach(idx=>{
          const card = wheelCards[idx];
          if(!card) return;
          const cardDc = displayColor(idx, stages[idx].color);
          const isCentered = idx === newIndex;
          card.style.boxShadow = isCentered ? `0 0 16px color-mix(in srgb, ${cardDc} 35%, transparent)` : 'none';
          card.style.borderColor = isCentered ? 'var(--accent)' : `color-mix(in srgb, ${cardDc} 45%, var(--line))`;
        });
        highlightedIndex = newIndex;
      }
      let scrollTimeout;
      let depthTicking = false;
      function requestDepthEffect(){
        if(depthTicking) return;
        depthTicking = true;
        requestAnimationFrame(()=>{ applyDepthEffect(); depthTicking = false; });
      }
      scroll.addEventListener('scroll', ()=>{
        requestDepthEffect();
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(()=>{
          // po doscrollovani zjisti, ktera karta je nejblize stredu - stejna
          // matematika jako applyDepthEffect, zadne cteni z DOM.
          const closest = Math.max(0, Math.min(N-1, Math.round(scroll.scrollLeft/CARD_STEP)));
          if(closest !== pos){ pos = closest; renderCenterCard(); }
          applyHighlight(closest);
        }, 120);
      }, {passive:true});

      function scrollToCard(i, smooth){
        const card = scroll.children[i];
        if(!card) return;
        const target = card.offsetLeft - (scroll.clientWidth - card.clientWidth)/2;
        scroll.scrollTo({ left: target, behavior: smooth ? 'smooth' : 'auto' });
      }
      requestAnimationFrame(()=>{ scrollToCard(pos, false); applyDepthEffect(); applyHighlight(pos); });
    }

    function renderCenterCard(){
      const s = stages[pos];
      const stats = msStageStats(s.key);
      const isCur = msGetCurrentStage() === s.key;
      const isClosed = msIsStageClosed(s.key);
      const wrap = container.querySelector('#centerCardWrap');
      const dc = displayColor(pos, s.color);
      wrap.innerHTML = `
        <div id="ccBox" class="stage-icon-colored" style="position:relative;border-radius:var(--radius);border:1px solid ${dc};background:color-mix(in srgb, ${dc} 6%, var(--card-bg));padding:14px;color:${dc} !important;
          box-shadow:0 0 18px color-mix(in srgb, ${dc} 30%, transparent);transition:box-shadow .5s ease">
          <div id="cornerCur" style="position:absolute;top:9px;left:9px;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;${isCur?'color:var(--accent) !important':'color:var(--muted)'}">
            <div style="width:20px;height:20px;border-radius:var(--radius);border:1px solid currentColor;display:grid;place-items:center;${isCur?'background:rgba(255,255,255,.06)':''}">
              ${isCur?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>':''}
            </div>
            <span style="font-size:7.5px;font-weight:800;text-transform:uppercase">Aktuální</span>
          </div>
          <div id="cornerClosed" style="position:absolute;top:9px;right:9px;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;${isClosed?'color:var(--accent) !important':'color:var(--muted)'}">
            <div style="width:20px;height:20px;border-radius:var(--radius);border:1px solid currentColor;display:grid;place-items:center;${isClosed?'background:rgba(255,255,255,.06)':''}">
              ${isClosed?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>':''}
            </div>
            <span style="font-size:7.5px;font-weight:800;text-transform:uppercase">${isClosed?'Ukončeno':'Ukončit'}</span>
          </div>
          <div style="text-align:center;padding-top:10px">
            <div style="width:46px;height:46px;border-radius:var(--radius);background:color-mix(in srgb, ${dc} 10%, transparent);border:1px solid currentColor;display:grid;place-items:center;margin:0 auto 6px;filter:drop-shadow(0 0 6px currentColor)">
              ${msStageIconSvg(s.key, 26)}
            </div>
            <h2 style="margin:0;font-size:16px;color:#fff">${msEsc(s.name)}</h2>
            <p style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;margin:2px 0 0"><i style="width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block;box-shadow:0 0 6px currentColor"></i>${msStageStatusLabel(s.key)}</p>
          </div>
          ${(typeof msCanViewSection !== 'function' || msCanViewSection('finance')) ? `<div style="display:flex;justify-content:space-between;margin-top:8px;padding:7px 10px;border-radius:var(--radius);border:1px solid var(--line);background:var(--card-bg)">
            <span style="font-size:10.5px;color:var(--muted);font-weight:700">Utraceno v etapě</span><b style="font-size:14px;color:currentColor">${stats.spent.toLocaleString('cs-CZ')} Kč</b>
          </div>` : ''}
          <div style="display:grid;grid-template-columns:repeat(${s.key==='naradi'?3:4},1fr);gap:6px;margin:8px 0">
            ${[['photos','foto','gallery','fotky'],['documents','dok.','project','etapy'],['diary','zápisů','diary','denik'],['expensesCount','výdajů','stage-expenses','finance']]
              .filter(([k])=> !(k==='diary' && s.key==='naradi'))
              .filter(([k,,,sec])=> typeof msCanViewSection !== 'function' || msCanViewSection(sec))
              .map(([k,label,route])=>{
                // ZMENA (14.8.2026): vsechny ctverecky vypadaly stejne, at
                // uvnitr byla 0 nebo 50 - clovek tak z kolotoce nepoznal,
                // ktera etapa uz ma co obsahu, bez otevirani kazde zvlast.
                // Nenulove cislo je ted zvyraznene barvou etapy a jemnym
                // rámečkem, nulove zůstává tlumené jako drív.
                const ma = Number(stats[k]) > 0;
                return `<div class="statBox" data-route="${route}" style="border-radius:var(--radius);border:1px solid ${ma?'currentColor':'var(--line)'};background:${ma?'color-mix(in srgb, currentColor 10%, var(--card-bg))':'var(--card-bg)'};padding:6px;text-align:center;cursor:pointer"><b style="display:block;font-size:12px;color:${ma?'currentColor':'#fff'}">${stats[k]}</b><span style="font-size:8px;color:${ma?'currentColor':'var(--muted)'}">${label}</span></div>`;
              }).join('')}
          </div>
          <button id="openBtn" style="width:100%;border-radius:var(--radius);border:1px solid var(--accent);background:rgba(255,255,255,.03);color:var(--accent) !important;font-weight:800;font-size:12.5px;padding:9px;cursor:pointer;filter:drop-shadow(0 0 5px var(--accent))">${(typeof msCanViewSection!=='function'||msCanViewSection('etapy')) ? 'Otevřít etapu →' : ((typeof msLockIconSvg==='function'?msLockIconSvg(13):'')+' Zamčeno')}</button>
          <div id="deleteLink" style="text-align:center;margin-top:7px;font-size:10px;color:var(--muted);cursor:pointer;text-decoration:underline">Odstranit etapu</div>
        </div>
      `;
      wrap.querySelector('#openBtn').addEventListener('click', ()=>{
        if(typeof msCanViewSection === 'function' && !msCanViewSection('etapy')){ msShowAccessDenied(); return; }
        Router.go('stage-detail', {key:s.key});
      });
      wrap.querySelectorAll('.statBox').forEach(el=>{
        el.addEventListener('click', ()=> Router.go(el.dataset.route, {stage: s.key}));
      });
      // pulz pri kazde zmene vyberu - kratke zvyrazneni ramecku
      const ccBox = wrap.querySelector('#ccBox');
      requestAnimationFrame(()=>{
        ccBox.style.boxShadow = `0 0 0 1px ${dc}, 0 0 30px color-mix(in srgb, ${dc} 70%, transparent)`;
        setTimeout(()=>{ ccBox.style.boxShadow = `0 0 18px color-mix(in srgb, ${dc} 30%, transparent)`; }, 320);
      });
      wrap.querySelector('#cornerCur').addEventListener('click', async ()=>{
        if(msGetCurrentStage()===s.key) return;
        if(!await Layout.confirmDialog(`Nastavit "${s.name}" jako aktuální etapu?`, 'Nastavit')) return;
        msSetCurrentStage(s.key);
        renderCenterCard();
      });
      wrap.querySelector('#cornerClosed').addEventListener('click', async ()=>{
        const closed = msIsStageClosed(s.key);
        const msg = closed ? `Znovu otevřít etapu "${s.name}"?` : `Uzavřít etapu "${s.name}"? Bude označená jako dokončená, dál se do ní dá cokoliv přidávat. Jde to kdykoliv vzít zpět.`;
        if(!await Layout.confirmDialog(msg, closed?'Otevřít':'Uzavřít')) return;
        msSetStageClosed(s.key, !closed);
        renderCenterCard();
      });
      wrap.querySelector('#deleteLink').addEventListener('click', async ()=>{
        const hasData = msStageHasData(s.key);
        const msg = hasData
          ? `Etapa "${s.name}" už má připojené výdaje, fotky, dokumenty nebo zápisy v deníku. Ty zůstanou uložené, ale nikde se k nim nedostaneš, dokud etapu znovu nezaložíš. Opravdu odstranit?`
          : `Odstranit etapu "${s.name}"? Etapa zatím nemá nic připojeného.`;
        if(!await Layout.confirmDialog(msg, 'Odstranit')) return;
        msDeleteStage(s.key);
        Router.go('stages');
      });
    }

    return { activeTab:'stages' };
  }
  return { render };
})();
Router.register('stages', StagesWheelScreen);
