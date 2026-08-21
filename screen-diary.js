/* ==========================================================
   DENIK
   ========================================================== */
const DiaryScreen = (function(){
  // Odkaz na funkci "poslat zapis" - pouziva ji ikona v seznamu i
  // tlacitko v detailu, at je ten tok napsany jen jednou.
  let shareEntryRef = null;
  const MONTHS = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];

  function render(container, params){
    let activeStage = params.stage || 'all';
    let dateMode = null; // null | 'day' | 'range'
    let selectedDay = null, rangeStart = null, rangeEnd = null;
    let mcMode = 'day', rangePickStep = 'start';
    const today = new Date();
    let mcYear = today.getFullYear(), mcMonth = today.getMonth();

    function formatDateCz(iso){
      const d = new Date(iso+'T00:00:00');
      return d.getDate()+'. '+(d.getMonth()+1)+'. '+d.getFullYear();
    }

    container.innerHTML = `
      <div class="topbar">
        <h1>Deník</h1>
        <div style="flex:1"></div>
        <div class="icon-btn" id="calBtn" title="Filtrovat podle data"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M8 3v4M16 3v4M3 10h18"/></svg></div>
        <div class="icon-btn" id="queueBtn" title="K zápisu" style="position:relative"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></svg><span id="queueBadge" style="display:none;position:absolute;top:-4px;right:-4px;background:var(--accent);color:var(--card-bg);font-size:8px;font-weight:800;min-width:14px;height:14px;border-radius:var(--radius);align-items:center;justify-content:center"></span></div>
        <div class="icon-btn" id="genBtn" title="Vygenerovat deník" style="display:flex;align-items:center;justify-content:center;width:auto;padding:0 10px;gap:5px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 3h9l3 3v15H6z"/><path d="M9 17l2-2 2 2 2-4"/></svg><span style="font-size:10.5px;font-weight:800">PDF</span></div>
        <div class="icon-btn" id="addBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>
      </div>
      <div class="screen-scroll">
        <div class="dropdown" id="stageDropdown" style="margin-bottom:10px">
          <button class="dd-btn" id="ddBtn"><span class="left"><i id="ddDot"></i><span id="ddLabel">Vše</span><span id="ddCount"></span></span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg></button>
          <div class="dd-panel" id="ddPanel"></div>
        </div>

        <div id="miniCalWrap" style="max-height:0;overflow:hidden;transition:max-height .2s ease">
          <div style="border:1px solid var(--line);background:var(--card-bg-2);border-radius:var(--radius);padding:10px;margin-bottom:8px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
              <button id="mcModeDay" style="height:30px;border:1px solid #b34cff;background:rgba(179,76,255,.1);color:#fff;font-size:11px;font-weight:800;cursor:pointer;border-radius:var(--radius)">Jeden den</button>
              <button id="mcModeRange" style="height:30px;border:1px solid var(--line);background:transparent;color:var(--muted);font-size:11px;font-weight:800;cursor:pointer;border-radius:var(--radius)">Období (od–do)</button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <b id="mcLabel" style="font-size:12px"></b>
              <div style="display:flex;gap:6px">
                <button id="mcPrev" style="width:24px;height:24px;border:1px solid var(--line);background:transparent;color:#fff;cursor:pointer">‹</button>
                <button id="mcNext" style="width:24px;height:24px;border:1px solid var(--line);background:transparent;color:#fff;cursor:pointer">›</button>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:4px">
              ${['Po','Út','St','Čt','Pá','So','Ne'].map(d=>`<span style="text-align:center;font-size:8.5px;color:var(--muted);font-weight:800">${d}</span>`).join('')}
            </div>
            <div id="mcGrid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px"></div>
            <p id="mcClear" style="text-align:center;font-size:10.5px;color:#ff7a86;margin:8px 0 0;cursor:pointer">Zrušit výběr data</p>
          </div>
        </div>
        <div id="dateChip" style="display:none;align-items:center;gap:6px;font-size:10.5px;color:#b34cff;border:1px solid #b34cff;border-radius:var(--radius);padding:4px 8px;margin-bottom:8px;width:fit-content"></div>

        <div id="entries"></div>
      </div>
    `;
    container.querySelector('#genBtn').addEventListener('click', ()=> Router.go('diary-export', {stage: activeStage}));
    const diaryAddBtn = container.querySelector('#addBtn');
    if(typeof msCanAddSection === 'function' && !msCanAddSection('denik')){ diaryAddBtn.style.display = 'none'; }
    else diaryAddBtn.addEventListener('click', ()=> Router.go('diary-add', activeStage!=='all' ? {stage: activeStage} : {}));
    container.querySelector('#queueBtn').addEventListener('click', ()=> Router.go('diary-queue'));
    const qCount = msDiaryQueue().length;
    // OPRAVA (14.8.2026): ikona "K zápisu" byla v hlavičce VŽDY, i kdyz
    // fronta byla prazdna - jen malinky odznak s cislem se schovaval.
    // Bez cisla to vypadalo jako mrtva ikona bez ucelu. Ted se schova
    // cela, kdyz neni co ukazat.
    const queueBtnEl = container.querySelector('#queueBtn');
    if(qCount>0){
      queueBtnEl.style.display = '';
      const badge = container.querySelector('#queueBadge');
      badge.style.display = 'flex';
      badge.textContent = qCount>9 ? '9+' : String(qCount);
    } else {
      queueBtnEl.style.display = 'none';
    }

    const ddBtn = container.querySelector('#ddBtn');
    const ddPanel = container.querySelector('#ddPanel');
    function buildDropdown(){
      ddPanel.innerHTML = '';
      const allItem = document.createElement('div');
      allItem.className = 'dd-item' + (activeStage==='all'?' is-active':'');
      allItem.innerHTML = '<i style="background:#fff;display:inline-block;width:8px;height:8px;margin-right:7px"></i>Vše'
        + `<span class="dd-n">${msCountForStage(msDiary(), 'all')}</span>`;
      allItem.addEventListener('click', ()=>{ activeStage='all'; ddLabelUpdate(); ddPanel.classList.remove('open'); drawEntries(); });
      ddPanel.appendChild(allItem);
      msSelectedStages().filter(s=>s.key!=='naradi').forEach(s=>{
        const it = document.createElement('div');
        it.className = 'dd-item' + (activeStage===s.key?' is-active':'');
        it.style.color = s.color;
        it.innerHTML = `<i style="background:${s.color};display:inline-block;width:8px;height:8px;margin-right:7px"></i>${msEsc(s.name)}`
          + `<span class="dd-n">${msCountForStage(msDiary(), s.key)}</span>`;
        it.addEventListener('click', ()=>{ activeStage=s.key; ddLabelUpdate(); ddPanel.classList.remove('open'); drawEntries(); });
        ddPanel.appendChild(it);
      });
    }
    function ddLabelUpdate(){
      const s = msStageByKey(activeStage);
      container.querySelector('#ddLabel').textContent = s ? s.name : 'Vše';
      // pocet je vetsinou to jedine, kvuli cemu clovek do filtru ťuka
      const n = msDiary().filter(e=> activeStage==='all' || e.stage===activeStage).length;
      container.querySelector('#ddCount').textContent =
        n === 0 ? 'žádné zápisy' : (n === 1 ? '1 zápis' : (n < 5 ? n+' zápisy' : n+' zápisů'));
    }
    ddBtn.addEventListener('click', ()=> ddPanel.classList.toggle('open'));
    buildDropdown(); ddLabelUpdate();

    // --- kalendarni filtr: jeden den / obdobi ---
    const miniCalWrap = container.querySelector('#miniCalWrap');
    const dateChip = container.querySelector('#dateChip');
    container.querySelector('#calBtn').addEventListener('click', ()=>{
      const isOpen = miniCalWrap.style.maxHeight !== '0px' && miniCalWrap.style.maxHeight !== '';
      miniCalWrap.style.maxHeight = isOpen ? '0' : '360px';
      if(!isOpen) renderMiniCal();
    });
    function updateDateChip(){
      if(dateMode==='day' && selectedDay){
        dateChip.style.display = 'flex';
        dateChip.innerHTML = `${formatDateCz(selectedDay)} <span id="chipClear" style="cursor:pointer">✕</span>`;
      } else if(dateMode==='range' && rangeStart && rangeEnd){
        dateChip.style.display = 'flex';
        dateChip.innerHTML = `${formatDateCz(rangeStart)} – ${formatDateCz(rangeEnd)} <span id="chipClear" style="cursor:pointer">✕</span>`;
      } else {
        dateChip.style.display = 'none'; dateChip.innerHTML = '';
      }
      const clr = container.querySelector('#chipClear');
      if(clr) clr.addEventListener('click', clearDateFilter);
    }
    function clearDateFilter(){
      dateMode = null; selectedDay = null; rangeStart = null; rangeEnd = null;
      updateDateChip(); renderMiniCal(); drawEntries();
    }
    container.querySelector('#mcClear').addEventListener('click', clearDateFilter);
    function renderMiniCal(){
      container.querySelector('#mcLabel').textContent = MONTHS[mcMonth] + ' ' + mcYear;
      const grid = container.querySelector('#mcGrid');
      grid.innerHTML = '';
      const firstDay = new Date(mcYear, mcMonth, 1);
      let startWeekday = firstDay.getDay(); startWeekday = startWeekday===0?6:startWeekday-1;
      const daysInMonth = new Date(mcYear, mcMonth+1, 0).getDate();
      for(let i=0;i<startWeekday;i++) grid.appendChild(document.createElement('div'));
      for(let d=1; d<=daysInMonth; d++){
        const iso = mcYear+'-'+String(mcMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
        const cell = document.createElement('div');
        let bg = 'transparent', color = '#c7cee6';
        if(mcMode==='day' && iso===selectedDay){ bg='#b34cff'; color='#fff'; }
        if(mcMode==='range' && rangeStart && rangeEnd && iso>=rangeStart && iso<=rangeEnd){ bg='rgba(179,76,255,.25)'; }
        if(mcMode==='range' && (iso===rangeStart || iso===rangeEnd)){ bg='#b34cff'; color='#fff'; }
        cell.style.cssText = `height:26px;display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer;background:${bg};color:${color};border-radius:var(--radius)`;
        cell.textContent = d;
        cell.addEventListener('click', ()=>{
          if(mcMode==='day'){
            selectedDay = iso; dateMode = 'day'; rangeStart=null; rangeEnd=null;
          } else {
            if(rangePickStep==='start' || (rangeStart && iso<rangeStart)){
              rangeStart = iso; rangeEnd = null; rangePickStep = 'end';
            } else {
              rangeEnd = iso; dateMode = 'range'; rangePickStep = 'start';
            }
          }
          renderMiniCal(); updateDateChip(); drawEntries();
        });
        grid.appendChild(cell);
      }
    }
    container.querySelector('#mcModeDay').addEventListener('click', ()=>{
      mcMode = 'day';
      const dayBtn = container.querySelector('#mcModeDay'), rangeBtn = container.querySelector('#mcModeRange');
      dayBtn.style.borderColor = '#b34cff'; dayBtn.style.background='rgba(179,76,255,.1)'; dayBtn.style.color='#fff';
      rangeBtn.style.borderColor = 'var(--line)'; rangeBtn.style.background='transparent'; rangeBtn.style.color='var(--muted)';
    });
    container.querySelector('#mcModeRange').addEventListener('click', ()=>{
      mcMode = 'range'; rangePickStep = 'start';
      const dayBtn = container.querySelector('#mcModeDay'), rangeBtn = container.querySelector('#mcModeRange');
      rangeBtn.style.borderColor = '#b34cff'; rangeBtn.style.background='rgba(179,76,255,.1)'; rangeBtn.style.color='#fff';
      dayBtn.style.borderColor = 'var(--line)'; dayBtn.style.background='transparent'; dayBtn.style.color='var(--muted)';
    });
    container.querySelector('#mcPrev').addEventListener('click', ()=>{ mcMonth--; if(mcMonth<0){mcMonth=11;mcYear--;} renderMiniCal(); });
    container.querySelector('#mcNext').addEventListener('click', ()=>{ mcMonth++; if(mcMonth>11){mcMonth=0;mcYear++;} renderMiniCal(); });

    function drawEntries(){
      const wrap = container.querySelector('#entries');
      let entries = msDiaryNumbered().filter(e => activeStage==='all' || e.stage===activeStage);
      if(dateMode==='day' && selectedDay){ entries = entries.filter(e=>e.date===selectedDay); }
      else if(dateMode==='range' && rangeStart && rangeEnd){ entries = entries.filter(e=>e.date>=rangeStart && e.date<=rangeEnd); }
      if(entries.length===0){
        // Uplne prazdny denik (zadny zapis vubec, ne jen prazdny vysledek
        // filtru) dostane vyraznejsi, pratelstejsi prazdny stav - stejny
        // vzorec, jaky uz pouziva Etapy/Projekt.
        if(msDiaryNumbered().length===0){
          wrap.innerHTML = `<div style="margin:6px 0 6px;padding:26px 20px 20px;text-align:center;border:1px dashed var(--line);cursor:pointer" id="emptyDiaryCard">
            <div style="width:44px;height:44px;border:1px solid var(--add-color);color:var(--add-color);margin:0 auto 12px;display:grid;place-items:center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <b style="display:block;font-size:15px;margin-bottom:6px">Zatím žádný zápis</b>
            <span style="font-size:11.5px;color:var(--muted);line-height:1.5">Sem si zapisuj postup, materiál, kdo na stavbě byl - přidej první zápis.</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;padding:0 6px">
            ${['Co se dnes dělalo', 'Jaký materiál dorazil', 'Kdo byl na stavbě'].map(t=>
              `<div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--muted)"><span style="width:4px;height:4px;border-radius:50%;background:var(--muted);flex:0 0 auto"></span>${t}</div>`
            ).join('')}
          </div>`;
          const card = container.querySelector('#emptyDiaryCard');
          if(card) card.addEventListener('click', ()=> Router.go('diary-add', activeStage!=='all' ? {stage: activeStage} : {}));
        } else {
          wrap.innerHTML = msEmptyState({kind:'filter', title:'Nic neodpovídá filtru',
        text:'V téhle etapě zatím žádný zápis není. Zkus přepnout na Vše.'});
        }
        return;
      }
      const important = entries.filter(e=>e.important).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
      const rest = entries.filter(e=>!e.important).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
      const ordered = [...important, ...rest];
      wrap.innerHTML = ordered.map(e=>{
        const s = msStageByKey(e.stage);
        const metaBits = [];
        // OPRAVA (14.8.2026): metaBits se vkladaly bez oseteni (msEsc) -
        // e.worker/e.material jsou uzivatelsky text, stejna trida chyby
        // jako vcerejsi XSS uklid, jen na miste, kam se tehdy nedostalo.
        if(e.worker) metaBits.push(`Kdo pracoval: ${msEsc(e.worker)}`);
        if(e.material) metaBits.push(`Materiál: ${msEsc(e.material)}`);
        if(e.workerCount != null) metaBits.push(`👷 ${e.workerCount} ${e.workerCount===1?'pracovník':(e.workerCount<5?'pracovníci':'pracovníků')}`);
        if(e.weather){
          const POCASI = { slunecno:'☀️ Slunečno', zatazeno:'☁️ Zataženo', dest:'🌧️ Déšť', snih:'❄️ Sníh', mraz:'🥶 Mráz' };
          metaBits.push((POCASI[e.weather]||e.weather) + (e.temperature!=null ? ` ${e.temperature}°C` : ''));
        }
        const docItems = (e.items||[]).filter(it=>it.type==='document').map(it=> msDocuments().find(d=>d.id===it.refId)).filter(Boolean);
        const eventItems = (e.items||[]).filter(it=>it.type==='event').map(it=> msEvents().find(ev=>ev.id===it.refId)).filter(Boolean);
        const stageCompleteItems = (e.items||[]).filter(it=>it.type==='stage_complete');
        // (14.8.2026) Soubory z Projektu pripojene pres "Připojit z appky".
        const projectItemsAttached = (e.items||[]).filter(it=>it.type==='projectitem').map(it=> (typeof msLoadProjectItems==='function' ? msLoadProjectItems().find(p=>p.id===it.refId) : null)).filter(Boolean);
        return `<div class="diary-entry" data-id="${e.id}" style="border-left:2px solid ${s?s.color:'#94a0bc'};padding:8px 0 8px 12px;margin-bottom:10px;cursor:pointer;${e.important?'background:rgba(255,211,92,.05)':''}">
          <div style="display:flex;align-items:center;gap:6px;font-size:10.5px;color:var(--muted);margin-bottom:3px">
            <span style="border:1px solid var(--line);padding:1px 5px;font-size:9px">č. ${e.number}</span>
            <b style="color:#fff">${s?s.name:''}</b>${e.important?' ⭐':''}
            <span>${e.date} ${e.time||''}</span>
            <span style="flex:1"></span>
            ${msCanExportContent() ? `<span class="shareEntry" data-id="${e.id}" title="Poslat zápis" style="color:#25b7ff;padding:4px 5px;cursor:pointer;display:inline-flex">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9"/></svg>
            </span>` : ''}
            ${msCanModifyContent() ? `<span class="editPencil" data-id="${e.id}" title="Upravit zápis" style="color:var(--accent);padding:4px;cursor:pointer">✎</span>` : ''}
          </div>
          ${e.author && e.author !== 'Stavebník' ? `<span style="display:block;margin-bottom:4px;border:1px solid #25b7ff;color:#25b7ff;padding:1px 6px;font-size:9px;font-weight:700;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box">👤 ${(e.author||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span>` : ''}
          ${e.title ? `<p style="margin:0 0 3px;font-weight:800;font-size:12.5px">${msEsc(e.title)}</p>` : ''}
          ${e.text ? `<p style="margin:0 0 4px;font-size:12px;color:#dfe4f5">${msEsc(e.text)}</p>` : ''}
          ${e.issue ? `<p style="margin:0 0 4px;font-size:11px;color:#ff9b32">Poznámka: ${msEsc(e.issue)}</p>` : ''}
          ${metaBits.length ? `<div style="display:flex;gap:10px;flex-wrap:wrap;font-size:10px;color:var(--muted);margin-top:2px">${metaBits.map(m=>`<span>${m}</span>`).join('')}</div>` : ''}
          ${(()=>{
            // OPRAVA (11.8.2026): zapisy ulozene starsi verzi maji misto
            // nahledu prazdne hodnoty (viz komentar v screen-forms.js) a
            // v seznamu z nich byly sedive ctverecky. Kde nahled chybi,
            // dotahne se ted z Galerie pres refId - stejne, jako to uz
            // dela detail zapisu. Nove zapisy uz nahledy maji rovnou.
            const refs = (e.items||[]).filter(it=>it.type==='photo').map(it=>it.refId);
            // Parovani resi msFindPhotosByRefs - u pozvaneho sedi refId
            // az pres sourceLocalId, ne pres jeho vlastni id.
            const gal = msFindPhotosByRefs(refs);
            const src = (e.photos && e.photos.length) ? e.photos : [];
            const shown = src.length ? src.map((p,i)=> p || (gal[i] && gal[i].thumb) || null)
                                     : gal.filter(Boolean).map(p=>p.thumb);
            if(!shown.length) return '';
            return `<div style="display:flex;gap:5px;margin-top:6px;flex-wrap:wrap">${shown.map(p=>`<div style="width:44px;height:44px;border-radius:var(--radius);border:1px solid var(--line);background:${p?`url(${p}) center/cover`:'rgba(255,255,255,.05)'}"></div>`).join('')}</div>`;
          })()}
          ${(docItems.length || eventItems.length || stageCompleteItems.length || projectItemsAttached.length) ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
            ${docItems.map(d=>`<span style="border:1px solid var(--line);padding:2px 7px;font-size:9.5px;color:var(--muted)">📎 ${msEsc(d.name)}</span>`).join('')}
            ${projectItemsAttached.map(p=>`<span style="border:1px solid var(--line);padding:2px 7px;font-size:9.5px;color:var(--muted)">📎 ${msEsc(p.name)}</span>`).join('')}
            ${eventItems.map(ev=>`<span style="border:1px solid var(--line);padding:2px 7px;font-size:9.5px;color:var(--muted)">${msEsc(ev.title)}</span>`).join('')}
            ${stageCompleteItems.length ? `<span style="border:1px solid var(--accent);color:var(--accent);padding:2px 7px;font-size:9.5px">Etapa dokončena</span>` : ''}
          </div>` : ''}
        </div>`;
      }).join('');
      wrap.querySelectorAll('.diary-entry').forEach(el=>{
        el.addEventListener('click', (e)=>{
          if(e.target.closest('.editPencil')) return; // resi svuj vlastni handler nize
          if(e.target.closest('.shareEntry')) return; // dtto - sdileni zapisu
          const entry = msDiaryEntryById(el.dataset.id);
          if(entry) renderEntryDetail(entry);
        });
      });
      /* ==========================================================
         POSLAT ZAPIS (8.8.2026)
         Slozi ze zapisu text a prilozi fotky, pak to preda systemovemu
         oknu "Sdilet" - odtud si uzivatel vybere Messenger, WhatsApp,
         mail, cokoliv. Kdyz prohlizec posilani souboru neumi, posle se
         aspon text a appka to rekne, at clovek necaka fotky.
         ========================================================== */
      wrap.querySelectorAll('.shareEntry').forEach(el=>{
        el.addEventListener('click', async (ev)=>{
          ev.stopPropagation();
          const entry = msDiaryEntryById(el.dataset.id);
          if(entry) await shareEntry(entry);
        });
      });

      async function shareEntry(entry){
          if(!msRequirePremium('Posílání zápisů do jiných aplikací')) return;
          const files = await msDiaryEntryFiles(entry);
          const text  = msDiaryEntryToText(entry, { mentionPhotos: files.length > 0 });

          if(files.length && msCanShareFiles(files)){
            try{
              await navigator.share({ files, text, title:'Zápis ze stavby' });
              return;
            }catch(e){
              if(e && e.name === 'AbortError') return;   // uzivatel zavrel okno
              console.error('sdileni zapisu s fotkami selhalo', e);
            }
          }

          const res = await msShareText(text, 'Zápis ze stavby');
          if(res === 'copied'){
            alert('Zápis je zkopírovaný do schránky, vlož ho do zprávy.' +
                  (files.length ? ' Fotky tenhle prohlížeč poslat neumí - najdeš je v Galerii a pošleš odtud.' : ''));
          } else if(res === 'unsupported'){
            alert('Sdílení tenhle prohlížeč neumí. Zkus appku otevřít jako aplikaci na ploše.');
          } else if(res === 'shared' && files.length){
            alert('Text odešel. Fotky se poslat nepodařilo - najdeš je v Galerii a pošleš je odtud hromadně.');
          }
      }
      shareEntryRef = shareEntry;   // aby na ni dosahl i detail zapisu

      wrap.querySelectorAll('.editPencil').forEach(el=>{
        el.addEventListener('click', (e)=>{
          e.stopPropagation();
          Router.go('diary-add', {edit: el.dataset.id});
        });
      });
    }

    // Nahled zapisu (bez editace) - klik na tuztu v seznamu jde na
    // editaci rovnou, tohle je jen ke ctení. Fotky se tu zobrazuji V
    // PLNE KVALITE ze zdroje v Galerii (ne z male komprimovane kopie
    // vlozene primo do zapisu, ktera je jen pro rychly nahled v seznamu
    // a pro spolehlivy prenos pri sdileni).
    function renderEntryDetail(entry){
      const s = msStageByKey(entry.stage);
      const overlay = document.createElement('div');
      overlay.className = 'ms-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(29,30,28,.55);z-index:70;display:flex;align-items:flex-end;justify-content:center';
      const metaBits = [];
      if(entry.worker) metaBits.push(`Kdo pracoval: ${entry.worker}`);
      if(entry.material) metaBits.push(`Materiál: ${entry.material}`);

      // Plna kvalita: podle items (refId na zaznam v Galerii) najit
      // skutecnou, nekomprimovanou fotku. Kde takovy zaznam neexistuje
      // (napr. u zapisu prijateho ze sdileneho projektu), appka spadne
      // zpet na malou kopii vlozenou primo v zapisu.
      const photoRefIds = (entry.items||[]).filter(it=>it.type==='photo').map(it=>it.refId);
      const galleryPhotos = msFindPhotosByRefs(photoRefIds).filter(Boolean);
      // OPRAVA (11.8.2026): tady se do mrizky davaly 320px NAHLEDY - na
      // dlazdici 96 px pri trojnasobne hustote displeje uz je z nich
      // kase a na fotce stavby neslo nic rozeznat. Nahled se pouzije jen
      // jako prvni, okamzite vykresleni; skutecna fotka se dotahne hned
      // vzapeti a podstrci se na jeho misto (viz swapInFullPhotos nize).
      const fullQualityPhotos = galleryPhotos.map(p=>p.thumb).filter(Boolean);
      // OPRAVA (1.8.2026): plnou kvalitu pouzit jen kdyz se OPRAVDU povedlo
      // stahnout uplne vsechny fotky (typicky u sdileneho projektu, kde
      // stahovani souboru bezi zvlast na pozadi a nemusi byt jeste hotove) -
      // jinak radeji zobrazit aspon malou vlozenou kopii, nez nic.
      const embeddedPhotos = entry.photos || [];
      const displayPhotos = (fullQualityPhotos.length > 0 && fullQualityPhotos.length >= embeddedPhotos.length)
        ? fullQualityPhotos
        : embeddedPhotos;

      overlay.innerHTML = `
        <div style="width:100%;max-width:480px;max-height:82vh;overflow-y:auto;background:var(--card-bg-2);border-top:1.5px solid var(--line);padding:20px 20px calc(20px + min(env(safe-area-inset-bottom),34px))">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <b style="color:${s?s.color:'var(--muted)'};font-size:11px;border:1px solid ${s?s.color:'var(--line)'};padding:2px 7px">${s?s.name:''}</b>
            ${entry.important ? '<span style="font-size:13px">⭐</span>' : ''}
            <span style="flex:1"></span>
            <span style="font-size:10.5px;color:var(--muted)">${entry.date} ${entry.time||''}</span>
          </div>
          ${entry.author ? `<p style="margin:0 0 10px;font-size:10.5px;color:var(--muted)">Přidal(a): ${escDiary(entry.author)}</p>` : ''}
          ${entry.title ? `<p style="margin:0 0 6px;font-weight:800;font-size:13.5px">${escDiary(entry.title)}</p>` : ''}
          ${entry.text ? `<p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:#f2f4fb;white-space:pre-wrap">${escDiary(entry.text)}</p>` : ''}
          ${entry.issue ? `<p style="margin:0 0 10px;font-size:12px;color:#ff9b32">Poznámka: ${escDiary(entry.issue)}</p>` : ''}
          ${metaBits.length ? `<p style="margin:0 0 10px;font-size:11px;color:var(--muted)">${metaBits.map(escDiary).join(' · ')}</p>` : ''}
          ${displayPhotos.length ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:14px">${displayPhotos.map((p,i)=>`<div class="entryThumb" data-i="${i}" style="aspect-ratio:1;border-radius:var(--radius);border:1px solid var(--line);cursor:pointer;background:${p?`url(${p}) center/cover`:'rgba(255,255,255,.05)'}"></div>`).join('')}</div>` : ''}
          <div style="display:flex;gap:8px;margin-top:6px">
            ${msCanExportContent() ? `<button id="detailShareBtn" style="flex:1;border:1px solid #25b7ff;background:transparent;color:#25b7ff;padding:11px 0;cursor:pointer;font-family:inherit;font-weight:800;font-size:12.5px">Poslat</button>` : ''}
            ${msCanModifyContent() ? `<button id="detailEditBtn" class="btn-primary" style="flex:1">Upravit</button>` : ''}
            <button id="detailCloseBtn" style="flex:0 0 auto;border:1px solid var(--line);background:transparent;color:var(--muted);padding:0 16px;cursor:pointer;font-family:inherit">Zavřít</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      /* (11.8.2026) Dlazdice se nejdriv vykresli z nahledu, aby bylo
         hned co ukazat, a pak se na pozadi nahradi skutecnou fotkou.
         Ctou se po jedne - u zapisu s deseti fotkami by najednou
         nacteny plny obsah zbytecne nafoukl pamet. Kdyz fotka
         chybi (pozvany, kteremu se jeste nestahla), zustane nahled. */
      (async function swapInFullPhotos(){
        if(!photoRefIds.length) return;
        const tiles = overlay.querySelectorAll('.entryThumb');
        for(let i = 0; i < photoRefIds.length && i < tiles.length; i++){
          if(!document.body.contains(overlay)) return; // uzivatel mezitim zavrel
          try{
            const nalezena = msFindPhotosByRefs([photoRefIds[i]])[0];
            const full = nalezena ? await msPhotoFull(nalezena.id) : null;
            if(full && document.body.contains(overlay)){
              tiles[i].style.background = `url(${full}) center/cover`;
            }
          }catch(err){ console.error('plna fotka do nahledu zapisu se nenacetla', err); }
          await new Promise(r=> setTimeout(r, 0));
        }
      })();

      overlay.addEventListener('click', (e)=>{ if(e.target === overlay) overlay.remove(); });
      const shareBtn = overlay.querySelector('#detailShareBtn');
      if(shareBtn) shareBtn.addEventListener('click', ()=>{ if(shareEntryRef) shareEntryRef(entry); });

      // DOPLNENO (8.8.2026): ťuknuti na zmenseninu ji rozbali na celou
      // obrazovku, mezi fotkami se prejizdi prstem. Pouziva stejny
      // prohlizec, jaky ma Galerie - at se to nikde nechova jinak.
      overlay.querySelectorAll('.entryThumb').forEach(el=>{
        el.addEventListener('click', async ()=>{
          // OPRAVA (11.8.2026): do prohlizece na celou obrazovku sly
          // stejne male nahledy jako do mrizky - roztazene pres cely
          // displej z nich nebylo nic. Ted se pro nej fotky dotahnou v
          // plne kvalite (a kde chybi, zustane nahled).
          let list = displayPhotos;
          if(photoRefIds.length){
            try{
              list = await Promise.all(photoRefIds.map(async (refId, i)=>{
                try{
                  const nalezena = msFindPhotosByRefs([refId])[0];
                  if(nalezena){ const full = await msPhotoFull(nalezena.id); if(full) return full; }
                }catch(e){}
                return displayPhotos[i] || null;
              }));
              list = list.filter(Boolean);
              if(!list.length) list = displayPhotos;
            }catch(e){ console.error('plne fotky do prohlizece se nenacetly', e); }
          }
          msPhotoLightbox(list, Number(el.dataset.i));
        });
      });
      overlay.querySelector('#detailCloseBtn').addEventListener('click', ()=> overlay.remove());
      const detailEditEl = overlay.querySelector('#detailEditBtn');
      if(detailEditEl) detailEditEl.addEventListener('click', ()=>{
        overlay.remove();
        Router.go('diary-add', {edit: entry.id});
      });
    }
    function escDiary(s){ return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    drawEntries();

    return { activeTab:'diary' };
  }
  return { render };
})();
Router.register('diary', DiaryScreen);

/* ==========================================================
   K ZAPISU - sprava fronty pripravenych veci mimo samotne
   vytvareni zapisu. Odsud jde neco natrvalo odebrat, aniz by
   se to muselo resit primo ve formulari na novy zapis (tam uz
   klepnuti jen prepina, jestli se to ma zahrnout DO tohoto
   zapisu, ne jestli to ma zmizet navzdy).
   ========================================================== */
const DiaryQueueScreen = (function(){
  const ICONS = {
    photo: '<rect x="3" y="6" width="18" height="14" rx="1"/><circle cx="12" cy="13" r="3.5"/>',
    document: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6"/>',
    event: '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    stage_complete: '<path d="M5 13l4 4L19 7"/>',
  };
  const TYPE_LABEL = { photo:'Fotka', document:'Dokument', event:'Událost', stage_complete:'Dokončená etapa' };

  function render(container){
    function draw(){
      const items = msDiaryQueueResolved();
      container.innerHTML = `
        <div class="topbar">
          <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
          <h1>K zápisu</h1>
        </div>
        <div class="screen-scroll">
          <p style="font-size:11px;color:var(--muted);margin:0 0 16px;line-height:1.5">Tady spravuješ, co čeká na příští zápis do deníku. Zápis samotný se dělá v Deníku – tady jen odebíráš věci, co už nechceš.</p>
          <div id="qList"></div>
        </div>
      `;
      container.querySelector('#backBtn').addEventListener('click', ()=> Router.go('diary'));
      const list = container.querySelector('#qList');
      if(items.length===0){
        list.innerHTML = '<p class="empty-msg">Zatím nic nečeká na zápis.</p>';
        return;
      }
      list.innerHTML = items.map((it,i)=>`
        <div style="display:flex;align-items:center;gap:10px;border:1px solid var(--line);padding:9px;margin-bottom:7px">
          <div style="width:38px;height:38px;flex:0 0 auto;border:1px solid var(--line);border-radius:var(--radius);display:grid;place-items:center;overflow:hidden;${it.preview?`background-image:url(${it.preview});background-size:cover`:''}">
            ${it.preview ? '' : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[it.type]||ICONS.document}</svg>`}
          </div>
          <div style="flex:1;min-width:0">
            <b style="display:block;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(it.label)}</b>
            <span style="font-size:10px;color:var(--muted)">${TYPE_LABEL[it.type]||''}${it.stage && msStageByKey(it.stage) ? ' · '+msStageByKey(it.stage).name : ''}</span>
          </div>
          <div class="q-remove" data-i="${i}" style="width:28px;height:28px;flex:0 0 auto;border:1px solid var(--line);display:grid;place-items:center;cursor:pointer;color:var(--muted)">✕</div>
        </div>
      `).join('');
      list.querySelectorAll('.q-remove').forEach(el=>{
        el.addEventListener('click', ()=>{
          const it = items[Number(el.dataset.i)];
          msUnqueueFromDiary(it.type, it.refId);
          draw();
        });
      });
    }
    draw();
    return { activeTab:'diary' };
  }
  return { render };
})();
Router.register('diary-queue', DiaryQueueScreen);
