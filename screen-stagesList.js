/* ==========================================================
   PREHLED ETAP (seznam) - s funkcnim tazenim pro preradit poradi
   ========================================================== */
const StagesListScreen = (function(){
  function render(container){
    container.innerHTML = `
      <div class="topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <h1>Přehled etap</h1>
      </div>
      <div class="screen-scroll">
        <p style="font-size:11.5px;color:var(--muted);text-align:center;margin:0 0 12px">Klepnutím na etapu otevřeš detail. Tažením za "⋮" přeřadíš pořadí.</p>
        <div id="list"></div>
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());

    const list = container.querySelector('#list');
    let dragState = null;

    function draw(){
      const keys = msOrderedStageKeys();
      if(keys.length===0){
        list.innerHTML = msEmptyState({icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></svg>`, color:'#b34cff',
        title:'Zatím žádné etapy',
        text:'Etapy jsou hlavní kostra appky - fotky, výdaje i zápisy se do nich řadí.',
        hints:['Základy, Hrubá stavba, Střecha…','Vlastní etapu si můžeš pojmenovat sám']});
        return;
      }
      list.innerHTML = '';
      // v motivu Skica (denni i nocni) uz etapy nemaji neonovou paletu z
      // data.js. Zkousel jsem tu stejnou tmava->cihlova->svetla paletu jako
      // na kolotoci, ale v rovnem seznamu pusobilo odstinovani do sveta na
      // konci seznamu vybledle/spatne - misto toho maji vsechny radky
      // jednotny tlumeny cihlovy ton, aktualni etapa zustava plnou akcentni
      // barvou + ramecek.
      const themeName = document.documentElement.dataset.theme;
      const themed = themeName === 'sketch' || themeName === 'sketch-dark';
      const accentCss = themed ? (getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#a8503c') : null;
      const mutedAccent = themed ? 'color-mix(in srgb, var(--accent) 55%, var(--line))' : null;
      keys.forEach((key, idx)=>{
        const s = msStageByKey(key);
        const isCur = msGetCurrentStage()===key;
        const iconColor = themed ? (isCur ? accentCss : mutedAccent) : s.color;
        const curColor = themed ? accentCss : s.color;
        const row = document.createElement('div');
        row.dataset.key = key;
        const noEtapyAccess = typeof msCanViewSection === 'function' && !msCanViewSection('etapy');
        row.style.cssText = `display:flex;align-items:center;gap:10px;border:1px solid ${isCur?curColor:'var(--line)'};background:var(--card-bg-2);padding:11px;margin-bottom:8px;cursor:pointer;position:relative;${noEtapyAccess?'opacity:.55':''}`;
        const spent = msSumExpensesByStage(key);
        row.innerHTML = `
          <div class="stage-icon-colored" style="width:34px;height:34px;border:1px solid ${iconColor};color:${iconColor} !important;display:grid;place-items:center;flex:0 0 auto">${msStageIconSvg(key, 18)}</div>
          <div style="flex:1;min-width:0">
            <b style="display:block;font-size:13.5px;color:#fff">${msEsc(s.name)}</b>
            <span class="${isCur?'stage-status-line':''}" style="font-size:11px;color:${isCur?curColor:'var(--muted)'}">${msStageStatusLabel(key)}</span>
          </div>
          ${(typeof msCanViewSection !== 'function' || msCanViewSection('finance')) ? `<span style="font-size:11.5px;color:var(--muted)">${spent?spent.toLocaleString('cs-CZ')+' Kč':'—'}</span>` : ''}
          <div class="row-menu" style="padding:6px;cursor:${noEtapyAccess?'default':'grab'};color:var(--muted);touch-action:none">${noEtapyAccess ? ((typeof msLockIconSvg==='function')?msLockIconSvg(15):'') : '⋮'}</div>
        `;
        row.addEventListener('click', (e)=>{
          if(e.target.closest('.row-menu')) return;
          if(row.dataset.wasDragged==='1'){ row.dataset.wasDragged=''; return; }
          if(typeof msCanViewSection === 'function' && !msCanViewSection('etapy')){ msShowAccessDenied(); return; }
          Router.go('stage-detail', {key});
        });

        const handle = row.querySelector('.row-menu');
        handle.addEventListener('pointerdown', (e)=>{
          e.preventDefault();
          dragState = { row, startY: e.clientY, moved:false };
          handle.setPointerCapture(e.pointerId);
        });
        handle.addEventListener('pointermove', (e)=>{
          if(!dragState || dragState.row!==row) return;
          const dy = e.clientY - dragState.startY;
          if(Math.abs(dy) > 6 && !dragState.moved){
            dragState.moved = true;
            row.style.zIndex = 50;
          }
          if(!dragState.moved) return;
          row.style.transform = `translateY(${dy}px)`;
          row.dataset.wasDragged = '1';
          const rows = [...list.children];
          const idx = rows.indexOf(row);
          const overEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-key]');
          if(overEl && overEl!==row && list.contains(overEl)){
            const overIdx = rows.indexOf(overEl);
            if(overIdx !== -1 && overIdx !== idx){
              if(overIdx < idx) list.insertBefore(row, overEl);
              else list.insertBefore(row, overEl.nextSibling);
              row.style.transform = '';
              dragState.startY = e.clientY;
            }
          }
        });
        function endDrag(){
          if(!dragState || dragState.row!==row) return;
          const wasMoved = dragState.moved;
          row.style.transform = ''; row.style.zIndex = '';
          dragState = null;
          if(wasMoved){
            const newOrder = [...list.children].map(r=>r.dataset.key).filter(k => k !== msGetCurrentStage());
            msSetStageOrder(newOrder);
            setTimeout(()=>{ row.dataset.wasDragged=''; }, 50);
          } else {
            openRowMenu(key);
          }
        }
        handle.addEventListener('pointerup', endDrag);
        handle.addEventListener('pointercancel', endDrag);

        list.appendChild(row);
      });
    }

    async function openRowMenu(key){
      const s = msStageByKey(key);
      const isCur = msGetCurrentStage()===key;
      const isClosed = msIsStageClosed(key);
      const choice = await menuChoice(isCur, isClosed);
      if(choice==='current'){
        if(await Layout.confirmDialog(`Nastavit "${s.name}" jako aktuální etapu?`, 'Nastavit')){
          msSetCurrentStage(key); draw();
        }
      } else if(choice==='closed'){
        const msg = isClosed ? `Znovu otevřít etapu "${s.name}"?` : `Uzavřít etapu "${s.name}"? Bude označená jako dokončená, dál se do ní dá cokoliv přidávat. Jde to kdykoliv vzít zpět.`;
        if(await Layout.confirmDialog(msg, isClosed?'Otevřít':'Uzavřít')){
          msSetStageClosed(key, !isClosed); draw();
        }
      } else if(choice==='delete'){
        const hasData = msStageHasData(key);
        const msg = hasData
          ? `Etapa "${s.name}" už má připojené výdaje, fotky, dokumenty nebo zápisy v deníku. Ty zůstanou uložené, ale nikde se k nim nedostaneš, dokud etapu znovu nezaložíš. Opravdu odstranit?`
          : `Odstranit etapu "${s.name}"? Etapa zatím nemá nic připojeného.`;
        if(await Layout.confirmDialog(msg, 'Odstranit')){
          msDeleteStage(key); draw();
        }
      }
    }

    function menuChoice(isCur, isClosed){
      return new Promise(resolve=>{
        const overlay = document.createElement('div');
        overlay.className = 'ms-overlay'; overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,4,10,.6);z-index:60;display:flex;align-items:flex-end;justify-content:center';
        overlay.innerHTML = `
          <div style="width:100%;max-width:480px;background:var(--card-bg-2);border-top:1px solid var(--line);padding:8px 0 calc(8px + env(safe-area-inset-bottom))">
            ${isCur?'':'<div class="mi" data-c="current" style="padding:13px 18px;font-size:13px;cursor:pointer">Nastavit jako aktuální</div>'}
            <div class="mi" data-c="closed" style="padding:13px 18px;font-size:13px;cursor:pointer;border-top:1px solid var(--line)">${isClosed?'Znovu otevřít etapu':'Uzavřít etapu'}</div>
            <div class="mi" data-c="delete" style="padding:13px 18px;font-size:13px;cursor:pointer;border-top:1px solid var(--line);color:var(--accent)">Odstranit etapu</div>
          </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e)=>{
          const mi = e.target.closest('.mi');
          document.body.removeChild(overlay);
          resolve(mi ? mi.dataset.c : null);
        });
      });
    }

    draw();
    return { activeTab:'stages' };
  }
  return { render };
})();
Router.register('stages-list', StagesListScreen);
