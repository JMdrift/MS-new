/* ==========================================================
   FORMULARE (cile rychleho pridani + editace)
   ========================================================== */

/* ---------- Vydaj / Vklad ---------- */
const ExpenseAddScreen = (function(){
  function render(container, params){
    const editingTx = params.edit ? msTransactionById(params.edit) : null;
    let txType = editingTx ? editingTx.type : 'expense';
    // OPRAVA (2.8.2026): pri pridavani primo z detailu konkretni etapy se
    // formular drive vzdy predvyplnil GLOBALNE aktualni etapou, ne tou, ze
    // ktere uzivatel skutecne prisel - zaznam tak "nepripsal" ke spravne
    // etape, pokud se lisila od te aktualni. Ted ma prednost stage z params
    // (odkud appka na formular prisla), pak teprve globalne aktualni.
    let stageKey = (editingTx && editingTx.stage) || params.stage || msGetCurrentStage();
    let dateVal = editingTx ? editingTx.date : msTodayIso();

    container.innerHTML = `
      <div class="topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <h1 id="formTitle">Nový výdaj</h1>
      </div>
      <div class="screen-scroll">
        <div id="typeToggle" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px">
          <button data-t="expense" style="height:38px;border:1px solid #ff7a86;color:#ff9aa3;background:rgba(255,122,134,.08);font-weight:800;cursor:pointer;font-size:11.5px">Výdaj</button>
          <button data-t="income" style="height:38px;border:1px solid var(--line);color:var(--muted);background:transparent;font-weight:800;cursor:pointer;font-size:11.5px">Vklad</button>
          <button data-t="planned" style="height:38px;border:1px solid var(--line);color:var(--muted);background:transparent;font-weight:800;cursor:pointer;font-size:11.5px">Plánovaný</button>
        </div>
        <p class="f-label">Částka</p>
        <div style="display:flex;align-items:baseline;gap:8px;border:1px solid #ff7a86;padding:9px 12px;margin-bottom:12px" id="amountBox">
          <input id="fAmount" value="${editingTx?editingTx.amount:''}" inputmode="numeric" placeholder="0" style="border:0;background:transparent;color:#ff9aa3;font-size:22px;font-weight:800;width:100%;font:inherit;outline:none"/><span style="color:#ff9aa3;font-weight:800">Kč</span>
        </div>
        <p class="f-label">Popis</p>
        <input class="f-input" id="fTitle" value="${editingTx?editingTx.title:''}" placeholder="Např. Beton C20/25" style="margin-bottom:12px"/>
        <div id="stageBlock">
          <p class="f-label">Etapa</p>
          <div class="dropdown" id="stageDropdown" style="margin-bottom:12px">
            <button class="dd-btn" id="stageDdBtn"><span class="left"><i id="stageDdDot"></i><span id="stageDdLabel">—</span></span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>
            <div class="dd-panel" id="stageDdPanel" data-sheet-title="Zařadit do etapy"></div>
          </div>
        </div>
        <p class="f-label">Datum</p>
        <div style="display:flex;gap:8px;margin-bottom:0">
          <input class="f-input" id="fDate" value="" style="flex:1"/>
          <div class="icon-btn" id="calToggleBtn" style="flex:0 0 auto"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M8 3v4M16 3v4M3 10h18"/></svg></div>
        </div>
        <div id="miniCal" style="max-height:0;overflow:hidden;transition:max-height .2s ease">
          <div style="border:1px solid var(--line);background:var(--card-bg-2);border-radius:var(--radius);padding:10px;margin-top:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
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
          </div>
        </div>
        <div id="receiptBlock" style="margin-top:12px">
          <p class="f-label">Účtenka</p>
          <div id="receiptArea"></div>
          <input type="file" accept="image/*" id="receiptInput" style="display:none"/>
        </div>
      </div>
      <div style="padding:12px 16px calc(20px + env(safe-area-inset-bottom));border-top:1px solid var(--line)">
        <button class="btn-primary" id="saveBtn" style="border-color:#ff7a86;color:#fff">${editingTx?'Uložit změny':'Uložit výdaj'}</button>
        ${(editingTx && (typeof msCanModifyContent !== 'function' || msCanModifyContent()))?'<button class="btn-ghost" id="deleteBtn" style="margin-top:8px;color:#ff7a86">Smazat</button>':''}
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.go(params.back||'dashboard'));

    // --- uctenka: jedna fotka pripojena k tomuto konkretnimu vydaji ---
    let receiptDataUrl = (editingTx && editingTx.receipt) || null;
    let receiptChanged = false;
    function renderReceiptArea(){
      const area = container.querySelector('#receiptArea');
      if(receiptDataUrl){
        area.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px">
            <div id="receiptThumb" style="width:52px;height:52px;border:1px solid var(--line);border-radius:var(--radius);background-image:url(${receiptDataUrl});background-size:cover;background-position:center;cursor:pointer;flex:0 0 auto"></div>
            <div style="flex:1;font-size:11px;color:var(--muted)">Účtenka přiložena</div>
            <span id="receiptRemove" style="color:#ff7a86;cursor:pointer;font-size:11px">Odebrat</span>
          </div>`;
        area.querySelector('#receiptThumb').addEventListener('click', ()=>{
          // OPRAVA (11.8.2026): uctenka sla jen zobrazit, ne priblizit -
          // pritom prave na uctence je drobny tisk, ktery clovek potrebuje
          // precist (polozky, DPH, datum). Prohlizec se stipnutim uz appka
          // ma, jen se tu nepouzival.
          msPhotoLightbox([receiptDataUrl], 0);
        });
        area.querySelector('#receiptRemove').addEventListener('click', ()=>{
          receiptDataUrl = null; receiptChanged = true; renderReceiptArea();
        });
      } else {
        area.innerHTML = `<div id="receiptAddBtn" style="border:1px dashed var(--line);padding:11px;text-align:center;font-size:11.5px;color:var(--muted);cursor:pointer">+ Přiložit účtenku</div>`;
        area.querySelector('#receiptAddBtn').addEventListener('click', ()=> container.querySelector('#receiptInput').click());
      }
    }
    container.querySelector('#receiptInput').addEventListener('change', async (e)=>{
      const file = e.target.files[0];
      if(!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = ()=>{ receiptDataUrl = reader.result; receiptChanged = true; renderReceiptArea(); };
      reader.readAsDataURL(file);
      e.target.value = '';
    });
    renderReceiptArea();

    function applyType(){
      const isExpense = txType==='expense';
      const isPlanned = txType==='planned';
      const showStageEtc = isExpense || isPlanned;
      container.querySelector('#stageBlock').style.display = showStageEtc?'block':'none';
      container.querySelector('#receiptBlock').style.display = isExpense?'block':'none'; // uctenka dava smysl az kdyz je fakt zaplaceno
      const typeLabel = isExpense?'výdaj':(isPlanned?'plánovaný výdaj':'vklad');
      container.querySelector('#formTitle').textContent = editingTx ? `Upravit ${typeLabel}` : `Nový ${typeLabel}`;
      container.querySelector('#saveBtn').textContent = editingTx ? 'Uložit změny' : `Uložit ${typeLabel}`;
      const color = isExpense ? '#ff7a86' : (isPlanned ? '#ff9b32' : '#4dffab');
      const textColor = isExpense ? '#ff9aa3' : color;
      container.querySelector('#amountBox').style.borderColor = color;
      container.querySelectorAll('#amountBox input,#amountBox span').forEach(el=>el.style.color = textColor);
      container.querySelector('#saveBtn').style.borderColor = color;
      container.querySelectorAll('#typeToggle button').forEach(b=>{
        const active = b.dataset.t===txType;
        const bColor = b.dataset.t==='expense' ? '#ff7a86' : (b.dataset.t==='planned' ? '#ff9b32' : '#4dffab');
        b.style.borderColor = active ? bColor : 'var(--line)';
        b.style.color = active ? (b.dataset.t==='expense'?'#ff9aa3':bColor) : 'var(--muted)';
        b.style.background = active ? `color-mix(in srgb, ${bColor} 8%, transparent)` : 'transparent';
      });
    }
    container.querySelector('#typeToggle').addEventListener('click', (e)=>{
      const btn = e.target.closest('button'); if(!btn) return;
      txType = btn.dataset.t; applyType();
    });
    applyType();


    // --- datum: primy prepis nebo mini kalendar (misto jen type=date) ---
    const MONTHS = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];
    function formatDateCz(d){ return `${d.getDate()}. ${d.getMonth()+1}. ${d.getFullYear()}`; }
    let selectedDate = editingTx ? new Date(editingTx.date+'T00:00:00') : new Date();
    container.querySelector('#fDate').value = formatDateCz(selectedDate);
    const miniCal = container.querySelector('#miniCal');
    let mcYear = selectedDate.getFullYear(), mcMonth = selectedDate.getMonth();
    function renderMiniCal(){
      container.querySelector('#mcLabel').textContent = MONTHS[mcMonth] + ' ' + mcYear;
      const grid = container.querySelector('#mcGrid');
      grid.innerHTML = '';
      const firstDay = new Date(mcYear, mcMonth, 1);
      let startWeekday = firstDay.getDay(); startWeekday = startWeekday===0?6:startWeekday-1;
      const daysInMonth = new Date(mcYear, mcMonth+1, 0).getDate();
      for(let i=0;i<startWeekday;i++) grid.appendChild(document.createElement('div'));
      for(let d=1; d<=daysInMonth; d++){
        const isSel = selectedDate.getFullYear()===mcYear && selectedDate.getMonth()===mcMonth && selectedDate.getDate()===d;
        const cell = document.createElement('div');
        cell.style.cssText = `height:26px;display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer;border-radius:var(--radius);background:${isSel?'#b34cff':'transparent'};color:${isSel?'#fff':'#c7cee6'}`;
        cell.textContent = d;
        cell.addEventListener('click', ()=>{
          selectedDate = new Date(mcYear, mcMonth, d);
          container.querySelector('#fDate').value = formatDateCz(selectedDate);
          renderMiniCal();
          miniCal.style.maxHeight = '0';
        });
        grid.appendChild(cell);
      }
    }
    container.querySelector('#mcPrev').addEventListener('click', ()=>{ mcMonth--; if(mcMonth<0){mcMonth=11;mcYear--;} renderMiniCal(); });
    container.querySelector('#mcNext').addEventListener('click', ()=>{ mcMonth++; if(mcMonth>11){mcMonth=0;mcYear++;} renderMiniCal(); });
    container.querySelector('#calToggleBtn').addEventListener('click', ()=>{
      const isOpen = miniCal.style.maxHeight !== '0px' && miniCal.style.maxHeight !== '';
      miniCal.style.maxHeight = isOpen ? '0' : '280px';
      if(!isOpen) renderMiniCal();
    });
    container.querySelector('#fDate').addEventListener('change', (e)=>{
      const m = e.target.value.trim().match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
      if(m){ selectedDate = new Date(Number(m[3]), Number(m[2])-1, Number(m[1])); mcYear=selectedDate.getFullYear(); mcMonth=selectedDate.getMonth(); renderMiniCal(); }
    });

    const stageDdBtn = container.querySelector('#stageDdBtn');
    const stageDdPanel = container.querySelector('#stageDdPanel');
    const selectedStages = msSelectedStages();
    selectedStages.forEach(s=>{
      const it = document.createElement('div');
      it.className = 'dd-item';
      it.innerHTML = `<i style="background:${s.color};display:inline-block;width:7px;height:7px;margin-right:8px"></i>${msEsc(s.name)}`;
      it.addEventListener('click', ()=>{
        stageKey = s.key;
        container.querySelector('#stageDdLabel').textContent = s.name;
        container.querySelector('#stageDdDot').style.background = s.color;
        stageDdPanel.classList.remove('open');
      });
      stageDdPanel.appendChild(it);
    });
    stageDdBtn.addEventListener('click', ()=> stageDdPanel.classList.toggle('open'));
    const initS = msStageByKey(stageKey) || selectedStages[0];
    if(initS){ stageKey = initS.key; container.querySelector('#stageDdLabel').textContent = initS.name; container.querySelector('#stageDdDot').style.background = initS.color; }

    container.querySelector('#saveBtn').addEventListener('click', async ()=>{
      /* OPRAVA (11.8.2026): pole je textove (kvuli numericke klavesnici),
         takze do nej jde napsat "1200,50" - a Number() na carku vrati NaN,
         coz spadlo na 0 a appka hlasila "Zadej částku", i kdyz ji clovek
         zadal. Ceska klavesnice nabizi carku, ne tecku, takze to nebyl
         okrajovy pripad. Ted se carka bere jako desetinna tecka a
         oddelovace tisicu (mezery, nezlomne mezery, tecky v "1.200")
         se zahodi. */
      const amount = msParseCastka(container.querySelector('#fAmount').value);
      if(!(amount > 0)){ alert('Zadej částku.'); return; }
      const title = container.querySelector('#fTitle').value.trim() || (txType==='expense'?'Bez popisu':'Vklad na účet');
      const date = selectedDate.getFullYear()+'-'+String(selectedDate.getMonth()+1).padStart(2,'0')+'-'+String(selectedDate.getDate()).padStart(2,'0');
      const tx = { type:txType, title, amount, date };
      if(txType==='expense' || txType==='planned'){ tx.stage=stageKey; tx.category = null; } else { tx.stage=null; tx.category=null; }
      const saveBtn = container.querySelector('#saveBtn');
      const originalLabel = saveBtn.textContent;
      saveBtn.textContent = 'Ukládám…'; saveBtn.disabled = true;
      const saved = editingTx ? msUpdateTransaction(params.edit, tx) : msAddTransaction(tx);
      if(txType==='expense' && receiptChanged){
        if(receiptDataUrl) await msSetTransactionReceipt(saved.id, receiptDataUrl);
        else msRemoveTransactionReceipt(saved.id);
      }
      Layout.showSuccess(editingTx ? 'Změny uloženy' : (txType==='income' ? 'Vklad uložen' : 'Výdaj uložen'));
      Router.go(params.back || 'dashboard');
    });
    // (11.8.2026) Tlacitko se pozvanemu nekresli, takze se na nej nesmi
    // ani vesat obsluha - jinak by to spadlo na null.
    if(editingTx && container.querySelector('#deleteBtn')){
      container.querySelector('#deleteBtn').addEventListener('click', async ()=>{
        if(!await Layout.confirmDialog('Opravdu smazat tuhle transakci? Nedá se to vrátit zpět.', 'Smazat')) return;
        msDeleteTransaction(params.edit);
        Router.go(params.back || 'dashboard');
      });
    }
    return { activeTab:'dashboard' };
  }
  return { render };
})();
Router.register('expense-add', ExpenseAddScreen);


/* ---------- Novy zapis do deniku ---------- */
const DiaryAddScreen = (function(){
  function render(container, params){
    const editingEntry = params && params.edit ? msDiaryEntryById(params.edit) : null;
    let important = editingEntry ? !!editingEntry.important : false;
    // OPRAVA (2.8.2026): stejna pricina jako u Vydaju - prednost ma stage
    // z params (konkretni etapa, ze ktere uzivatel prisel), az pak globalne
    // aktualni etapa.
    let stageKey = editingEntry ? editingEntry.stage : (params.stage || msGetCurrentStage());
    let selectedDate = editingEntry ? new Date(editingEntry.date+'T00:00:00') : new Date();
    let queueItems = editingEntry ? [] : msDiaryQueueResolved(); // {type, refId, label, preview, stage, addedAt} - fronta dava smysl jen pri NOVEM zapisu
    let extraPhotos = []; // nove fotky pridane primo tady pres "+" (fotoaparat/soubor), jeste nejsou v msPhotos()
    /* OPRAVA (8.8.2026): mrizka se kreslila primo z techto 1800px kopii.
       Telefon musi kazdou rozbalit v plnem rozliseni i pro ctverecek 96 px -
       dvacet fotek je skoro 200 MB a Safari stranku zabije. Vedle plnych
       kopii proto drzime i male nahledy 220 px, ze kterych se kresli. */
    let extraPreviews = [];
    let galleryPicked = []; // fotky VYBRANE z jiz existujici Galerie appky - {id, thumb}, nemaji se znovu pridavat do msPhotos()
    function formatDateCz(d){ return `${d.getDate()}. ${d.getMonth()+1}. ${d.getFullYear()}`; }
    const MONTHS = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];

    const projects = msLoadProjects();
    const proj = projects.find(pr=>pr.id===msGetActiveProjectId()) || projects[0] || {};
    const meta = msDiaryMeta();

    // OPRAVA (2.8.2026): pokud uzivatel prisel z konkretni etapy (napr.
    // z detailu etapy - viz params.stage), tenhle odhad podle fronty ho
    // uz nesmi prebit. "Hlasovani" podle fronty se pouzije jen kdyz
    // appka zadnou vyslovnou etapu nedostala (napr. otevreni pres
    // obecne tlacitko fronty).
    if(!(params && params.stage) && !editingEntry){
      const stageVotes = {};
      queueItems.forEach(it=>{ if(it.stage) stageVotes[it.stage] = (stageVotes[it.stage]||0)+1; });
      const topStage = Object.keys(stageVotes).sort((a,b)=>stageVotes[b]-stageVotes[a])[0];
      if(topStage) stageKey = topStage;
    }
    if(stageKey==='naradi') stageKey = null;

    container.innerHTML = `
      <div class="topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <h1>${editingEntry ? 'Upravit záznam' : 'Nový záznam'}</h1>
      </div>
      <div class="screen-scroll">
        <div id="impRow" style="display:flex;align-items:center;justify-content:space-between;border:1px solid var(--line);padding:11px 12px;margin-bottom:16px">
          <div><b style="display:flex;align-items:center;gap:6px;font-size:12.5px"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/></svg>Důležitý zápis</b><span style="font-size:10px;color:var(--muted)">Bude vždy nahoře při zobrazení této etapy</span></div>
          <div id="impSwitch" style="width:38px;height:22px;border-radius:11px;border:1px solid var(--line);position:relative;cursor:pointer;flex:0 0 auto"><i style="position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--muted)"></i></div>
        </div>

        <div id="queueSection" style="display:none">
          <p class="f-label">Připraveno k zápisu</p>
          <div style="display:flex;gap:8px;overflow-x:auto;padding:2px 2px 8px;margin-bottom:2px;-webkit-overflow-scrolling:touch" id="queueGrid"></div>
          <p style="font-size:10px;color:var(--muted);margin:0 0 16px">Klepnutím dlaždici vynecháš z tohoto zápisu, zůstane na příště. Spravovat/natrvalo odebrat jde v Deníku přes <b style="color:var(--accent);cursor:pointer" id="goQueueLink">K zápisu</b>.</p>
        </div>

        <!-- (14.8.2026) Odkaz na pripojeni existujiciho obsahu (fotky z
             galerie appky, dokumenty etapy, soubory Projektu) k tomuto
             zapisu - nahrazuje zrusene "Připravit pro další zápis".
             Vybrane polozky pristanou ve stejne fronte "Připraveno k
             zápisu" vyse, at je to jedno misto, ne dva ruzne systemy.
             Jen u NOVEHO zapisu - fronta (queueItems) u editace
             existujiciho zapisu zamerne zustava prazdna, viz o par
             radku vyse. -->
        ${!editingEntry ? `<button type="button" id="attachFromAppBtn" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;border:1.5px solid var(--accent);background:color-mix(in srgb, var(--accent) 10%, transparent);color:var(--accent);padding:11px;margin-bottom:16px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:800">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95L10.13 17.1a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          Připojit z appky
        </button>` : ''}

        <p class="f-label">Přidat fotky</p>
        <div style="display:flex;gap:8px;overflow-x:auto;padding:2px 2px 8px" id="photoGrid"></div>
        ${msBudgetGaugeHtml('diaryBudget')}
        <div style="margin-bottom:16px"></div>

        <p class="section-label" style="margin-top:0">Povinné</p>
        <p class="f-label">Datum</p>
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <input class="f-input" id="fDate" value="" style="flex:1"/>
          <div class="icon-btn" id="calToggleBtn" style="flex:0 0 auto"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M8 3v4M16 3v4M3 10h18"/></svg></div>
        </div>
        <div id="miniCal" style="max-height:0;overflow:hidden;transition:max-height .2s ease;margin-bottom:0">
          <div style="border:1px solid var(--line);background:var(--card-bg-2);border-radius:var(--radius);padding:10px;margin-bottom:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
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
          </div>
        </div>
        <div id="dayCountRow" style="display:none;font-size:10.5px;color:var(--muted);margin:-6px 0 12px"></div>

        <p class="f-label">Etapa</p>
        <div class="dropdown" id="stageDropdown" style="margin-bottom:12px">
          <button class="dd-btn" id="stageDdBtn"><span class="left"><i id="stageDdDot"></i><span id="stageDdLabel">—</span></span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg></button>
          <div class="dd-panel" id="stageDdPanel" data-sheet-title="Zařadit do etapy"></div>
        </div>

        <p class="f-label">Co se dělalo <span style="color:var(--muted);font-weight:600;text-transform:none;letter-spacing:0">(nepovinné, klidně jen fotky/dokumenty výše)</span></p>
        <textarea class="f-textarea" id="fText" placeholder="Např. Založena první řada Ytongu / Zabetonován věnec / Osazena okna…" style="margin-bottom:12px;min-height:70px">${editingEntry ? (editingEntry.text||'') : ''}</textarea>
        <input type="file" accept="image/*" multiple id="photoInput" style="display:none"/>

        <div id="detailsToggle" style="display:flex;align-items:center;justify-content:space-between;border:1px solid var(--line);padding:11px 12px;cursor:pointer">
          <b style="font-size:12.5px;color:var(--muted)">+ Přidat podrobnosti</b>
          <svg id="detailsChevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="color:var(--muted);transition:transform .15s"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div id="detailsFields" style="max-height:0;overflow:hidden;transition:max-height .25s ease">
          <div style="padding-top:14px">
            <p class="f-label">Kdo pracoval</p>
            <input class="f-input" id="fWorker" value="${editingEntry ? (editingEntry.worker||'') : (meta.stavebnik||'')}" placeholder="Např. Firma Novák s.r.o. / Pepa Svoboda" style="margin-bottom:14px"/>
            <!-- (14.8.2026) Pocasi a pocet pracovniku - stavebni zakon (§166
                 zak. 283/2021 Sb.) i navazujici vyhlaska pocitaji s denimi
                 zaznamy vcetne klimatickych podminek a poctu lidi na
                 stavbe. Ikony pro rychly vyber jednou rukou na stavbe -
                 psat kazdy den "slunecno, 18°C" na klavesnici by byla
                 otrava. Teplota zustava volitelna vedle toho. -->
            <p class="f-label">Počasí</p>
            <div id="weatherPicker" style="display:flex;gap:6px;margin-bottom:14px">
              ${[
                ['slunecno','Slunečno','<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>'],
                ['zatazeno','Zataženo','<path d="M6 17a4 4 0 0 1 .5-7.97A5.5 5.5 0 0 1 17 10a3.5 3.5 0 0 1-.5 6.97"/>'],
                ['dest','Déšť','<path d="M6 15a4 4 0 0 1 .5-7.97A5.5 5.5 0 0 1 17 8a3.5 3.5 0 0 1-.5 6.97"/><path d="M8 18l-1 3M13 18l-1 3M18 18l-1 3"/>'],
                ['snih','Sníh','<path d="M6 13a4 4 0 0 1 .5-7.97A5.5 5.5 0 0 1 17 6a3.5 3.5 0 0 1-.5 6.97"/><path d="M9 17v4M9 19h.01M14 17v4M14 19h.01M19 17v4M19 19h.01"/>'],
                ['mraz','Mráz','<path d="M12 2v20M4.9 6.9l14.2 10.2M19.1 6.9L4.9 17.1"/>'],
              ].map(([key,label,svg])=>{
                const on = editingEntry && editingEntry.weather === key;
                return `<button type="button" class="weatherBtn" data-w="${key}" title="${label}" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 2px;border:1.5px solid ${on?'var(--accent)':'var(--line)'};background:${on?'color-mix(in srgb, var(--accent) 14%, var(--card-bg))':'var(--card-bg)'};cursor:pointer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${on?'var(--accent)':'var(--muted)'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${svg}</svg>
                  <span style="font-size:8px;color:${on?'var(--accent)':'var(--muted)'};font-weight:700">${label}</span>
                </button>`;
              }).join('')}
            </div>
            <div style="display:flex;gap:10px;margin-bottom:14px">
              <div style="flex:1">
                <p class="f-label">Teplota (nepovinné)</p>
                <input class="f-input" id="fTemp" type="number" inputmode="numeric" value="${editingEntry && editingEntry.temperature!=null ? editingEntry.temperature : ''}" placeholder="°C"/>
              </div>
              <div style="flex:1">
                <p class="f-label">Počet pracovníků</p>
                <input class="f-input" id="fWorkerCount" type="number" inputmode="numeric" min="0" value="${editingEntry && editingEntry.workerCount!=null ? editingEntry.workerCount : ''}" placeholder="Např. 4"/>
              </div>
            </div>
            <p class="f-label">Materiál</p>
            <input class="f-input" id="fMaterial" value="${editingEntry ? (editingEntry.material||'') : ''}" placeholder="Např. 12 ks překladů" style="margin-bottom:14px"/>
            <p class="f-label">Problém / poznámka</p>
            <textarea class="f-textarea" id="fIssue" placeholder="Cokoliv, co stojí za zaznamenání navíc…" style="margin-bottom:0;min-height:60px">${editingEntry ? (editingEntry.issue||'') : ''}</textarea>
          </div>
        </div>
      </div>
      <div style="padding:12px 16px calc(20px + env(safe-area-inset-bottom));border-top:1px solid var(--line)">
        <button class="btn-primary" id="saveBtn" style="border-color:#ffd35c">${editingEntry ? 'Uložit změny' : 'Uložit záznam'}</button>
        ${(editingEntry && (typeof msCanModifyContent !== 'function' || msCanModifyContent())) ? '<button class="btn-ghost" id="deleteBtn" style="margin-top:8px;color:#ff7a86">Smazat záznam</button>' : ''}
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());

    // --- datum ---
    container.querySelector('#fDate').value = formatDateCz(selectedDate);
    const miniCal = container.querySelector('#miniCal');
    let mcYear = selectedDate.getFullYear(), mcMonth = selectedDate.getMonth();
    function updateDayCountRow(){
      const row = container.querySelector('#dayCountRow');
      if(proj.started && proj.startDate){
        const iso = selectedDate.getFullYear()+'-'+String(selectedDate.getMonth()+1).padStart(2,'0')+'-'+String(selectedDate.getDate()).padStart(2,'0');
        row.style.display = 'block';
        row.textContent = `Den stavby ${msDayCount(proj.startDate)} · doplní se automaticky`;
      } else {
        row.style.display = 'none';
      }
    }
    updateDayCountRow();
    function renderMiniCal(){
      container.querySelector('#mcLabel').textContent = MONTHS[mcMonth] + ' ' + mcYear;
      const grid = container.querySelector('#mcGrid');
      grid.innerHTML = '';
      const firstDay = new Date(mcYear, mcMonth, 1);
      let startWeekday = firstDay.getDay(); startWeekday = startWeekday===0?6:startWeekday-1;
      const daysInMonth = new Date(mcYear, mcMonth+1, 0).getDate();
      for(let i=0;i<startWeekday;i++) grid.appendChild(document.createElement('div'));
      for(let d=1; d<=daysInMonth; d++){
        const isSel = selectedDate.getFullYear()===mcYear && selectedDate.getMonth()===mcMonth && selectedDate.getDate()===d;
        const cell = document.createElement('div');
        cell.style.cssText = `height:26px;display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer;border-radius:var(--radius);background:${isSel?'#ffd35c':'transparent'};color:${isSel?'#04070f':'#c7cee6'}`;
        cell.textContent = d;
        cell.addEventListener('click', ()=>{
          selectedDate = new Date(mcYear, mcMonth, d);
          container.querySelector('#fDate').value = formatDateCz(selectedDate);
          renderMiniCal();
          updateDayCountRow();
          miniCal.style.maxHeight = '0';
        });
        grid.appendChild(cell);
      }
    }
    container.querySelector('#mcPrev').addEventListener('click', ()=>{ mcMonth--; if(mcMonth<0){mcMonth=11;mcYear--;} renderMiniCal(); });
    container.querySelector('#mcNext').addEventListener('click', ()=>{ mcMonth++; if(mcMonth>11){mcMonth=0;mcYear++;} renderMiniCal(); });
    container.querySelector('#calToggleBtn').addEventListener('click', ()=>{
      const isOpen = miniCal.style.maxHeight !== '0px' && miniCal.style.maxHeight !== '';
      miniCal.style.maxHeight = isOpen ? '0' : '280px';
      if(!isOpen) renderMiniCal();
    });

    // --- etapa (Naradi se v deniku nenabizi - nema zapisy) ---
    const stageDdBtn = container.querySelector('#stageDdBtn');
    const stageDdPanel = container.querySelector('#stageDdPanel');
    msSelectedStages().filter(s=>s.key!=='naradi' && s.key!=='projekt_povoleni').forEach(s=>{
      const it = document.createElement('div');
      it.className = 'dd-item';
      it.innerHTML = `<i style="background:${s.color};display:inline-block;width:7px;height:7px;margin-right:8px"></i>${msEsc(s.name)}`;
      it.addEventListener('click', ()=>{
        stageKey = s.key;
        container.querySelector('#stageDdLabel').textContent = s.name;
        container.querySelector('#stageDdDot').style.background = s.color;
        stageDdPanel.classList.remove('open');
      });
      stageDdPanel.appendChild(it);
    });
    stageDdBtn.addEventListener('click', ()=> stageDdPanel.classList.toggle('open'));
    const initS = msStageByKey(stageKey);
    if(initS){ container.querySelector('#stageDdLabel').textContent = initS.name; container.querySelector('#stageDdDot').style.background = initS.color; }
    else { container.querySelector('#stageDdLabel').textContent = 'Vyber etapu'; }

    // --- rozbalovaci podrobnosti ---
    let detailsOpen = false;
    const detailsFields = container.querySelector('#detailsFields');
    container.querySelector('#detailsToggle').addEventListener('click', ()=>{
      detailsOpen = !detailsOpen;
      detailsFields.style.maxHeight = detailsOpen ? '400px' : '0';
      container.querySelector('#detailsChevron').style.transform = detailsOpen ? 'rotate(180deg)' : 'rotate(0)';
    });

    const impSwitch = container.querySelector('#impSwitch');
    if(important){
      impSwitch.style.borderColor = '#ffd35c';
      impSwitch.querySelector('i').style.left = '18px';
      impSwitch.querySelector('i').style.background = '#ffd35c';
    }
    impSwitch.addEventListener('click', ()=>{
      important = !important;
      impSwitch.style.borderColor = important ? '#ffd35c' : 'var(--line)';
      impSwitch.querySelector('i').style.left = important ? '18px' : '2px';
      impSwitch.querySelector('i').style.background = important ? '#ffd35c' : 'var(--muted)';
    });

    // --- fronta pripraveneho materialu + rychle pridani nove fotky primo sem ---
    const ICONS = {
      photo: '<rect x="3" y="6" width="18" height="14" rx="1"/><circle cx="12" cy="13" r="3.5"/>',
      document: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6"/>',
      event: '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M8 3v4M16 3v4M3 10h18"/>',
      stage_complete: '<path d="M5 13l4 4L19 7"/>',
    };
    // OPRAVA (14.8.2026): tahle funkce kreslila primo na canvas bez EXIF
    // otoceni - fotka vyfocena na vysku vysla na bok/vzhuru nohama a po
    // zvetseni nahledu byla nepouzitelna. msResizeImageFile v data.js uz
    // EXIF cte a spravne otoci; tahle zustava jen jako tenka obalka, at
    // se nemusi menit zadne volajici misto.
    function resizeImage(file, maxDim){
      const attempt = msResizeImageFile(file, maxDim);
      // OPRAVA (1.8.2026): tahle funkce dřív nemela VUBEC zadne oseteni
      // chyby (ani onerror, natoz casovy limit) - kdyz telefon obrazek
      // nezvladl zpracovat, appka na to cekala navzdy, potichu, a fotka
      // se nikam neulozila (ani do zapisu, ani do Galerie). DULEZITE: casovy
      // limit musi zavodit s PUVODNIM (jeste nedokoncenym) pokusem, ne az s
      // jeho vysledkem - jinak by "zaseknuti" vubec nezachytil.
      const withTimeout = Promise.race([
        attempt,
        new Promise((_, reject)=> setTimeout(()=> reject(new Error('časový limit vypršel')), 12000))
      ]);
      return withTimeout.catch(e=>{ console.error('resizeImage selhalo', e); return null; });
    }
    function renderQueueGrid(){
      const section = container.querySelector('#queueSection');
      const grid = container.querySelector('#queueGrid');
      if(queueItems.length===0){ section.style.display = 'none'; return; }
      section.style.display = 'block';
      grid.innerHTML = '';
      const TILE = 76;
      queueItems.forEach((it,i)=>{
        const cell = document.createElement('div');
        const dim = it.selected===false;
        cell.style.cssText = `flex:0 0 auto;width:${TILE}px;height:${TILE}px;border:1px solid ${dim?'var(--line)':'var(--accent)'};border-radius:var(--radius);position:relative;display:grid;place-items:center;overflow:hidden;cursor:pointer;opacity:${dim?0.4:1};${it.preview?`background-image:url(${it.preview});background-size:cover`:'background:var(--card-bg-2)'}`;
        if(!it.preview){
          cell.innerHTML = `<div style="text-align:center;padding:4px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[it.type]||ICONS.document}</svg><span style="display:block;font-size:7.5px;color:var(--muted);margin-top:2px;line-height:1.2;max-width:56px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(it.label)}</span></div>`;
        }
        cell.addEventListener('click', ()=>{ it.selected = dim; renderQueueGrid(); });
        grid.appendChild(cell);
      });
    }
    function renderPhotoGrid(){
      const grid = container.querySelector('#photoGrid');
      grid.innerHTML = '';
      // Zapis do Deniku si fotky drzi jako soucast zaznamu, proto tady
      // zustava mereni skutecne velikosti a limit jedne davky. Fronta
      // bloku ma smysl u samostatneho pridavani fotek, ne u jednoho
      // zapisu - ten je vzdy jen jeden.
      msDiaryBudgetUpdate(container, 'diaryBudget',
        extraPhotos.reduce((n,d)=> n + (d ? d.length : 0), 0));
      const TILE = 76;
      extraPhotos.forEach((dataUrl,i)=>{
        dataUrl = extraPreviews[i] || dataUrl;
        const cell = document.createElement('div');
        cell.style.cssText = `flex:0 0 auto;width:${TILE}px;height:${TILE}px;border:1px solid var(--accent);border-radius:var(--radius);position:relative;background-image:url(${dataUrl});background-size:cover`;
        const rm = document.createElement('span');
        rm.textContent = '✕';
        rm.style.cssText = 'position:absolute;top:-6px;right:-6px;width:16px;height:16px;background:var(--card-bg-2);border:1px solid var(--line);border-radius:50%;display:grid;place-items:center;font-size:9px;cursor:pointer';
        rm.addEventListener('click', ()=>{ extraPhotos.splice(i,1); extraPreviews.splice(i,1); renderPhotoGrid(); });
        cell.appendChild(rm);
        grid.appendChild(cell);
      });
      galleryPicked.forEach((p,i)=>{
        const cell = document.createElement('div');
        cell.style.cssText = `flex:0 0 auto;width:${TILE}px;height:${TILE}px;border:1px solid var(--accent);border-radius:var(--radius);position:relative;background-image:url(${p.thumb});background-size:cover`;
        const rm = document.createElement('span');
        rm.textContent = '✕';
        rm.style.cssText = 'position:absolute;top:-6px;right:-6px;width:16px;height:16px;background:var(--card-bg-2);border:1px solid var(--line);border-radius:50%;display:grid;place-items:center;font-size:9px;cursor:pointer';
        rm.addEventListener('click', ()=>{ galleryPicked.splice(i,1); renderPhotoGrid(); });
        cell.appendChild(rm);
        grid.appendChild(cell);
      });
      const addCell = document.createElement('div');
      addCell.style.cssText = `flex:0 0 auto;width:${TILE}px;height:${TILE}px;border:1px dashed var(--line);border-radius:var(--radius);display:grid;place-items:center;cursor:pointer;color:var(--muted)`;
      addCell.title = 'Vyfotit / nahrát ze zařízení';
      addCell.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
      addCell.addEventListener('click', ()=> container.querySelector('#photoInput').click());
      grid.appendChild(addCell);

      const pickCell = document.createElement('div');
      pickCell.style.cssText = `flex:0 0 auto;width:${TILE}px;height:${TILE}px;border:1px dashed var(--line);border-radius:var(--radius);display:grid;place-items:center;cursor:pointer;color:var(--muted)`;
      pickCell.title = 'Vybrat z galerie';
      pickCell.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 15l-5-5L5 19"/></svg>';
      pickCell.addEventListener('click', openGalleryPicker);
      grid.appendChild(pickCell);
    }

    function openGalleryPicker(){
      const already = new Set(galleryPicked.map(p=>p.id));
      const allPhotos = msPhotos().slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).filter(p=>p.thumb);
      const picked = new Set(already);
      const overlay = document.createElement('div');
      overlay.className = 'ms-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:90;display:flex;flex-direction:column';
      overlay.innerHTML = `
        <div class="topbar">
          <div class="back-btn" id="pickerCloseBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
          <h1>Vybrat z galerie</h1>
        </div>
        <div class="screen-scroll" style="padding:10px 12px">
          ${allPhotos.length===0 ? '<p class="empty-msg">Zatím tu nemáš žádné fotky.</p>' : `<div id="pickerGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px"></div>`}
        </div>
        <div style="padding:12px 16px calc(16px + env(safe-area-inset-bottom));border-top:1px solid var(--line)">
          <button class="btn-primary" id="pickerConfirmBtn">Přidat vybrané</button>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.querySelector('#pickerCloseBtn').addEventListener('click', ()=> document.body.removeChild(overlay));
      const pickerGrid = overlay.querySelector('#pickerGrid');
      if(pickerGrid){
        allPhotos.forEach(p=>{
          const cell = document.createElement('div');
          cell.style.cssText = `aspect-ratio:1;border-radius:var(--radius);border:2px solid ${picked.has(p.id)?'var(--accent)':'transparent'};background:url(${p.thumb}) center/cover;position:relative;cursor:pointer`;
          if(picked.has(p.id)){
            cell.innerHTML = '<span style="position:absolute;top:4px;right:4px;width:18px;height:18px;background:var(--accent);border-radius:50%;display:grid;place-items:center;color:#fff;font-size:11px">✓</span>';
          }
          cell.addEventListener('click', ()=>{
            if(picked.has(p.id)){ picked.delete(p.id); } else { picked.add(p.id); }
            cell.style.borderColor = picked.has(p.id) ? 'var(--accent)' : 'transparent';
            cell.innerHTML = picked.has(p.id) ? '<span style="position:absolute;top:4px;right:4px;width:18px;height:18px;background:var(--accent);border-radius:50%;display:grid;place-items:center;color:#fff;font-size:11px">✓</span>' : '';
          });
          pickerGrid.appendChild(cell);
        });
      }
      overlay.querySelector('#pickerConfirmBtn').addEventListener('click', ()=>{
        galleryPicked = allPhotos.filter(p=>picked.has(p.id)).map(p=>({id:p.id, thumb:p.thumb}));
        document.body.removeChild(overlay);
        renderPhotoGrid();
      });
    }
    container.querySelector('#photoInput').addEventListener('change', async (e)=>{
      const files = Array.from(e.target.files).filter(f=> f.type.startsWith('image/'));
      const fits = msApproxPhotosPerUpload();
      if(files.length > fits){
        const ok = await Layout.confirmDialog(
          'Vybral jsi ' + files.length + ' fotek. Na jeden zápis se vejde ' + msFormatMb(MS_UPLOAD_LIMIT_BYTES) +
          ', což je při nastavené kvalitě asi ' + fits + ' fotek. Přidám je, dokud se vejdou.',
          'Rozumím, přidat', 'Zruším to');
        if(!ok) return;
      }
      let over = 0;
      const usedNow = ()=> extraPhotos.reduce((n,d)=> n + (d ? d.length : 0), 0);
      for(const file of files){
        const r = await resizeImage(file, (typeof msPhotoMaxDim==='function'?msPhotoMaxDim():1800));
        if(!r){ alert('Jednu z fotek se nepodařilo zpracovat, zkus to prosím znovu.'); continue; }
        if(usedNow() + r.length > MS_UPLOAD_LIMIT_BYTES){ over++; continue; }
        extraPhotos.push(r);
        let prev = null;
        try{ prev = await resizeImage(file, 220); }catch(e){}
        extraPreviews.push(prev || r);
        renderPhotoGrid();
        await new Promise(res=> setTimeout(res, 0));
      }
      if(over) alert(over + ' fotek se do tohoto zápisu nevešlo (limit ' + msFormatMb(MS_UPLOAD_LIMIT_BYTES) + '). Ulož zápis a zbytek přidej dalším.');
      renderPhotoGrid();
    });
    renderQueueGrid();
    renderPhotoGrid();
    container.querySelector('#goQueueLink').addEventListener('click', ()=> Router.go('diary-queue'));

    /* ============================================================
       PICKER "Připojit z appky" (14.8.2026)
       Prochazi TRI zdroje - fotky z Galerie, dokumenty etapy, soubory
       Projektu - a vybrane pridava do STEJNE fronty jako
       "Připraveno k zápisu" (msQueueForDiary), takze nevznika druhy
       paralelni system.
       Proti chaosu: vychozi zobrazeni je OMEZENE NA AKTUALNI ETAPU
       zapisu (stageKey) - u stavby s desitkami fotek napric etapami by
       jeden spolecny seznam byl nepouzitelny. Prepinac "Všechny etapy"
       je tam pro tu mensinu pripadu, kdy je to opravdu potreba (napr.
       fotka spolecneho prostoru bez konkretni etapy). */
    const attachBtn = container.querySelector('#attachFromAppBtn');
    if(attachBtn) attachBtn.addEventListener('click', ()=> openAttachPicker());

    function openAttachPicker(){
      const overlay = document.createElement('div');
      overlay.className = 'ms-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:88;display:flex;align-items:flex-end;justify-content:center';
      let aktivniZalozka = 'foto';
      let vsechnyEtapy = false;
      const vybrano = new Set(); // klice "typ:refId"

      function jeVKontextEtapy(polStage){
        return vsechnyEtapy || !stageKey || !polStage || polStage === stageKey;
      }

      function seznamProZalozku(){
        const jizVeFronte = new Set(queueItems.map(it=> it.type+':'+it.refId));
        if(aktivniZalozka === 'foto'){
          return msPhotos().filter(p=> jeVKontextEtapy(p.stage) && !jizVeFronte.has('photo:'+p.id))
            .sort((a,b)=> (b.date||'').localeCompare(a.date||''))
            .map(p=> ({ type:'photo', refId:p.id, label: p.caption || 'Fotka', preview: p.thumb }));
        }
        if(aktivniZalozka === 'dokument'){
          return msDocuments().filter(d=> !d.isNote && jeVKontextEtapy(d.stage) && !jizVeFronte.has('document:'+d.id))
            .map(d=> ({ type:'document', refId:d.id, label: d.name, preview: null }));
        }
        // 'projekt' - soubory z Projektu nemaji vazbu na konkretni etapu,
        // takze prepinac "Všechny etapy" je tu bez efektu.
        return (typeof msLoadProjectItems === 'function' ? msLoadProjectItems() : [])
          .filter(p=> !p.isNote && !jizVeFronte.has('projectitem:'+p.id))
          .map(p=> ({ type:'projectitem', refId:p.id, label: p.name, preview: (p.mime&&p.mime.startsWith('image/')) ? MS_BLOB_CACHE.get(msBlobKey('pitem', p.id)) : null }));
      }

      function kreslit(){
        const polozky = seznamProZalozku();
        const zalozka = (id, label)=> `<button type="button" class="attTab" data-t="${id}" style="flex:1;padding:9px 4px;border:0;border-bottom:2px solid ${aktivniZalozka===id?'var(--accent)':'transparent'};background:transparent;color:${aktivniZalozka===id?'var(--accent)':'var(--muted)'};font-weight:800;font-size:11.5px;cursor:pointer;font-family:inherit">${label}</button>`;
        overlay.innerHTML = `
          <div class="ms-sheet" style="width:100%;max-width:480px;max-height:82vh;display:flex;flex-direction:column">
            <div style="background:var(--card-bg-2);border:1px solid var(--line);border-left:3px solid var(--accent);display:flex;flex-direction:column;overflow:hidden">
              <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 16px 0">
                <b style="font-size:13.5px">Připojit z appky</b>
                ${stageKey ? `<label style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--muted);cursor:pointer"><input type="checkbox" id="attVsechnyEtapy" ${vsechnyEtapy?'checked':''} style="accent-color:var(--accent)"/>Všechny etapy</label>` : ''}
              </div>
              <div style="display:flex;border-bottom:1px solid var(--line);margin-top:9px">
                ${zalozka('foto','Fotky')}${zalozka('dokument','Dokumenty')}${zalozka('projekt','Projekt')}
              </div>
              <div style="overflow:auto;padding:12px 16px;flex:1;min-height:120px">
                ${polozky.length ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
                  ${polozky.map(it=>{
                    const klic = it.type+':'+it.refId;
                    const on = vybrano.has(klic);
                    return `<div class="attItem" data-k="${klic}" style="aspect-ratio:1;border:1.5px solid ${on?'var(--accent)':'var(--line)'};position:relative;cursor:pointer;display:grid;place-items:center;overflow:hidden;${it.preview?`background-image:url(${it.preview});background-size:cover`:'background:var(--card-bg)'}">
                      ${!it.preview ? `<span style="font-size:9px;color:var(--muted);text-align:center;padding:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%">${msEsc(it.label)}</span>` : ''}
                      ${on ? `<span style="position:absolute;top:3px;right:3px;width:16px;height:16px;background:var(--accent);display:grid;place-items:center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#04070f" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span>` : ''}
                    </div>`;
                  }).join('')}
                </div>` : `<p style="text-align:center;font-size:11.5px;color:var(--muted);padding:20px 0">Nic k zobrazení${!vsechnyEtapy && stageKey ? ' v této etapě' : ''}.</p>`}
              </div>
              <div style="padding:12px 16px;border-top:1px solid var(--line)">
                <button id="attConfirm" class="btn-primary" ${vybrano.size?'':'disabled'} style="${vybrano.size?'':'opacity:.5'}">Připojit${vybrano.size?' ('+vybrano.size+')':''}</button>
              </div>
            </div>
            <button class="ms-sheet-cancel" id="attCancel">Zrušit</button>
          </div>`;
        overlay.querySelectorAll('.attTab').forEach(b=> b.addEventListener('click', ()=>{ aktivniZalozka = b.dataset.t; kreslit(); }));
        const cbVsechny = overlay.querySelector('#attVsechnyEtapy');
        if(cbVsechny) cbVsechny.addEventListener('change', ()=>{ vsechnyEtapy = cbVsechny.checked; kreslit(); });
        overlay.querySelectorAll('.attItem').forEach(el=> el.addEventListener('click', ()=>{
          const k = el.dataset.k;
          if(vybrano.has(k)) vybrano.delete(k); else vybrano.add(k);
          kreslit();
        }));
        overlay.querySelector('#attCancel').addEventListener('click', close);
        overlay.querySelector('#attConfirm').addEventListener('click', ()=>{
          vybrano.forEach(k=>{
            const [typ, refId] = k.split(':');
            msQueueForDiary(typ, refId);
          });
          close();
          queueItems = msDiaryQueueResolved();
          renderQueueGrid();
          if(vybrano.size) Layout.showSuccess(vybrano.size === 1 ? 'Připojena 1 položka' : `Připojeno ${vybrano.size} položek`);
        });
      }
      const close = ()=>{ try{ document.body.removeChild(overlay); }catch(_){} };
      overlay.addEventListener('click', (e)=>{ if(e.target === overlay) close(); });
      document.body.appendChild(overlay);
      kreslit();
    }

    // Vyber pocasi (14.8.2026) - jednoducha sada ikon, jedna aktivni
    // najednou. Zacina na hodnote z editovaneho zapisu, jinak prazdne
    // (appka neodhaduje pocasi sama - nemame k tomu zadny zdroj dat).
    let vybranePocasi = editingEntry ? (editingEntry.weather || null) : null;
    container.querySelectorAll('.weatherBtn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        vybranePocasi = (vybranePocasi === btn.dataset.w) ? null : btn.dataset.w; // druhy klik zrusi vyber
        container.querySelectorAll('.weatherBtn').forEach(b=>{
          const on = b.dataset.w === vybranePocasi;
          b.style.borderColor = on ? 'var(--accent)' : 'var(--line)';
          b.style.background = on ? 'color-mix(in srgb, var(--accent) 14%, var(--card-bg))' : 'var(--card-bg)';
          const svg = b.querySelector('svg'); const span = b.querySelector('span');
          if(svg) svg.style.stroke = on ? 'var(--accent)' : 'var(--muted)';
          if(span) span.style.color = on ? 'var(--accent)' : 'var(--muted)';
        });
      });
    });

    container.querySelector('#saveBtn').addEventListener('click', async ()=>{
      const included = queueItems.filter(it=>it.selected!==false);
      const text = container.querySelector('#fText').value.trim();
      if(!text && included.length===0 && extraPhotos.length===0 && galleryPicked.length===0 && !(editingEntry && (editingEntry.photos||[]).length)){ alert('Napiš prosím pár slov, nebo vyber aspoň jednu dlaždici.'); return; }
      if(!stageKey){ alert('Vyber prosím etapu.'); return; }
      const saveBtn = container.querySelector('#saveBtn');
      const originalLabel = saveBtn.textContent;
      saveBtn.disabled = true; saveBtn.textContent = 'Ukládám…';
      try{
        const worker = container.querySelector('#fWorker').value.trim();
        const material = container.querySelector('#fMaterial').value.trim();
        const issue = container.querySelector('#fIssue').value.trim();
        const weather = vybranePocasi;
        const tempVal = container.querySelector('#fTemp').value;
        const temperature = tempVal !== '' ? Number(tempVal) : null;
        const wcVal = container.querySelector('#fWorkerCount').value;
        const workerCount = wcVal !== '' ? Math.max(0, Math.round(Number(wcVal))) : null;
        const date = selectedDate.getFullYear()+'-'+String(selectedDate.getMonth()+1).padStart(2,'0')+'-'+String(selectedDate.getDate()).padStart(2,'0');
        // OPRAVA (1.8.2026): fotky se zpracovavaji JEDNA PO DRUHE (ne vsechny
        // najednou pres Promise.all), a appka u tlacitka ukazuje postup
        // ("Zpracovávám fotku 2 z 3…") - radeji ať appka viditelne chvíli
        // pracuje, než aby se tvářila hotovo a přitom něco potichu vynechala.
        // nove fotky pridane primo tady (+) se ulozi i do Galerie, at jsou videt i tam
        const newPhotos = [];
        // DOPLNENO (8.8.2026): stejne jako u samostatneho pridani fotek se
        // kazda po ulozeni z pole vyhodi, aby ji telefon mohl uvolnit -
        // pri vetsi davce jinak dojde pamet a zapisy tise selhavaji.
        let photoFailed = 0;
        // OPRAVA (11.8.2026): tady se kazda fotka po ulozeni z pole vyhodi
        // (extraPhotos[i] = null) kvuli pameti - jenze o par radku niz se
        // z TOHO SAMEHO pole stavely male nahledy vkladane do zapisu.
        // V tu chvili uz tam byly same null, takze zapis mel misto
        // miniatur prazdna sediva ctverecky. Po rozkliknuti bylo vse v
        // poradku, protoze detail sahá pres refId do Galerie.
        // Reseni: maly nahled se vyrobi HNED, dokud data jeste mame.
        const newPhotoPreviews = [];
        for(let i=0;i<extraPhotos.length;i++){
          saveBtn.textContent = `Ukládám fotku ${i+1} z ${extraPhotos.length}…`;
          const dataUrl = extraPhotos[i];
          extraPhotos[i] = null;
          const saved = await msAddPhoto({ stage: stageKey, thumb: dataUrl, caption: null });
          if(saved){
            newPhotos.push(saved);
            try{
              newPhotoPreviews.push(await msResizeDataUrl(dataUrl, 400, 0.6));
            }catch(err){
              console.error('nahled fotky do zapisu se nepodaril', err);
              newPhotoPreviews.push(saved.thumb || null);
            }
          }
          else{ photoFailed++; console.error('msAddPhoto vratilo null pro fotku', i); }
          await new Promise(r=> setTimeout(r, 0));
        }
        if(photoFailed>0){
          alert(`${photoFailed} fotek se nepodařilo uložit - telefonu nevystačilo místo. Zápis se uloží bez nich, fotky zkus přidat po menších dávkách.`);
        }
        saveBtn.textContent = 'Ukládám…';
        const newPhotoIds = newPhotos.filter(Boolean).map(p=>p.id);
        // fotky vybrane z JIZ EXISTUJICI galerie se znovu nepridavaji do msPhotos() -
        // jen se na ne odkazuje (referId), presne jako u polozek z fronty
        const items = included.map(it=>({type:it.type, refId:it.refId}))
          .concat(newPhotoIds.map(id=>({type:'photo', refId:id})))
          .concat(galleryPicked.map(p=>({type:'photo', refId:p.id})));
        // POZOR: extraPhotos uz je v tuhle chvili vynulovane (viz smycka
        // vyse) - nahledy novych fotek proto berem z newPhotoPreviews.
        const rawIncluded = included.filter(it=>it.type==='photo').map(it=>it.preview);
        const rawPicked = galleryPicked.map(p=>p.thumb);
        // OPRAVA: appka fotku u zapisu do deniku zobrazuje jen jako maly
        // nahled (44px v seznamu) - vkladat ji v puvodni velikosti (2000px,
        // stejne jako do Galerie) by zbytecne nafoukvalo cely "snimek" dat,
        // ktery appka posila na server kvuli sdileni, a mohlo to vest ke
        // ztrate fotky pri prenosu (prilis velky payload). Plna velikost
        // zustava zachovana v Galerii (msAddPhoto vyse), tady jde jen o
        // malou kopii pro nahled primo v zapisu.
        // Poradi musi sedet s poradim v `items` vyse: included, nove, vybrane.
        const shrink = async (arr)=> Promise.all(arr.map(async p=>{
          if(!p) return null;
          try{ return await msResizeDataUrl(p, 400, 0.6); }
          catch(err){ console.error('zmenseni nahledu selhalo', err); return p; }
        }));
        const photos = (await shrink(rawIncluded))
          .concat(newPhotoPreviews)
          .concat(await shrink(rawPicked));
        if(editingEntry){
          const mergedPhotos = (editingEntry.photos||[]).concat(photos);
          const mergedItems = (editingEntry.items||[]).concat(items);
          msUpdateDiaryEntry(editingEntry.id, { stage: stageKey, date, text, worker: worker||null, material: material||null, issue: issue||null, weather, temperature, workerCount, important, photos: mergedPhotos, items: mergedItems });
        } else {
          msAddDiaryEntry({ stage: stageKey, date, text, worker: worker||null, material: material||null, issue: issue||null, weather, temperature, workerCount, important, photos, items });
        }
        // z fronty zmizi jen to, co jsme fakt pouzili v tomhle zapisu - nevybrane
        // dlazdice (a X uz odebrane) zustavaji/jsou pryc uz z fronty samotne,
        // ne z celeho seznamu najednou
        included.forEach(it=> msUnqueueFromDiary(it.type, it.refId));
        Layout.showSuccess(editingEntry ? 'Zápis upraven' : 'Zápis uložen');
        Router.go('diary');
      }catch(e){
        // OPRAVA (31.7.2026): drive nezachycena chyba (napr. vzacne selhani
        // IndexedDB u jedne z fotek) tady potichu presekla celou funkci -
        // fotka se do Galerie mohla ulozit, ale samotny zapis do Deniku uz
        // vubec nevznikl, bez jakekoli hlasky. Ted appka aspon rekne, ze
        // se to nepovedlo, a nechá formular otevreny, at to jde zkusit znovu.
        console.error('Ulozeni zapisu do deniku selhalo', e);
        saveBtn.disabled = false; saveBtn.textContent = originalLabel;
        alert('Zápis se nepodařilo uložit. Zkus to prosím znovu.');
      }
    });
    if(editingEntry && container.querySelector('#deleteBtn')){
      container.querySelector('#deleteBtn').addEventListener('click', async ()=>{
        if(!await Layout.confirmDialog('Opravdu smazat tenhle zápis? Nedá se to vrátit zpět.', 'Smazat')) return;
        msDeleteDiaryEntry(editingEntry.id);
        Router.go('diary');
      });
    }
    return { activeTab:'diary' };
  }
  return { render };
})();
Router.register('diary-add', DiaryAddScreen);


/* ---------- Nova udalost ---------- */
const EventAddScreen = (function(){
  function render(container, params){
    const editing = params && params.eventId ? msEvents().find(e=>e.id===params.eventId) : null;
    container.innerHTML = `
      <div class="topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <h1>${editing ? 'Upravit událost' : 'Nová událost'}</h1>
      </div>
      <div class="screen-scroll">
        <p class="f-label">Název *</p>
        <input class="f-input" id="fTitle" value="${editing ? editing.title : ''}" placeholder="Např. Návštěva statika" style="margin-bottom:12px"/>
        <p class="f-label">Datum *</p>
        <input class="f-input" id="fDate" type="date" value="${editing ? editing.date : msTodayIso()}" style="margin-bottom:12px"/>
        <div id="timeBlock" style="display:${editing && !editing.time ? 'none' : 'block'}">
          <p class="f-label">Čas</p>
          <input class="f-input" id="fTime" type="time" value="${editing && editing.time ? editing.time : '09:00'}" style="margin-bottom:12px"/>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid var(--line);padding:11px 12px;margin-bottom:10px">
          <b style="font-size:12.5px">Celodenní událost</b>
          <div id="allDaySwitch" style="width:38px;height:22px;border-radius:11px;border:1px solid ${editing && !editing.time ? '#25b7ff' : 'var(--line)'};position:relative;cursor:pointer"><i style="position:absolute;top:2px;left:${editing && !editing.time ? '18px' : '2px'};width:16px;height:16px;border-radius:50%;background:${editing && !editing.time ? '#25b7ff' : 'var(--muted)'}"></i></div>
        </div>
        <!-- (14.8.2026) "Připravit pro další zápis" odsud zmizelo - nahrazuje
             ho obecnejsi pripojovani existujiciho obsahu primo pri psani
             zapisu (viz zapis do deniku), takze predem nic pripravovat
             netreba. -->
      </div>
      <div style="padding:12px 16px calc(20px + env(safe-area-inset-bottom));border-top:1px solid var(--line)">
        <button class="btn-primary" id="saveBtn" style="border-color:#25b7ff">${editing ? 'Uložit změny' : 'Uložit událost'}</button>
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.go(editing ? 'calendar' : 'dashboard'));
    let allDay = !!(editing && !editing.time);
    const sw = container.querySelector('#allDaySwitch');
    sw.addEventListener('click', ()=>{
      allDay = !allDay;
      sw.style.borderColor = allDay ? '#25b7ff' : 'var(--line)';
      sw.querySelector('i').style.left = allDay ? '18px' : '2px';
      sw.querySelector('i').style.background = allDay ? '#25b7ff' : 'var(--muted)';
      container.querySelector('#timeBlock').style.display = allDay ? 'none' : 'block';
    });
    container.querySelector('#saveBtn').addEventListener('click', ()=>{
      const title = container.querySelector('#fTitle').value.trim();
      const date = container.querySelector('#fDate').value;
      if(!title || !date){ alert('Vyplň název a datum.'); return; }
      const time = allDay ? null : container.querySelector('#fTime').value;
      if(editing){
        msUpdateEvent(editing.id, { title, date, time });
        Layout.showSuccess('Událost upravena');
        Router.go('calendar');
      } else {
        msAddEvent({ title, date, time });
        Layout.showSuccess('Událost přidána');
        Router.go('dashboard');
      }
    });
    return { activeTab:'dashboard' };
  }
  return { render };
})();
Router.register('event-add', EventAddScreen);

const TaskAddScreen = (function(){
  function render(container, params){
    const editing = params && params.taskId ? msTasks().find(t=>t.id===params.taskId) : null;
    let mode = editing ? (editing.dateMode || 'date') : 'date'; // 'none' | 'date' | 'deadline'
    container.innerHTML = `
      <div class="topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <h1>${editing ? 'Upravit úkol' : 'Nový úkol'}</h1>
      </div>
      <div class="screen-scroll">
        <p class="f-label">Co je potřeba udělat *</p>
        <input class="f-input" id="fTitle" value="${editing ? editing.title : ''}" placeholder="Např. Dodělat plot" style="margin-bottom:14px"/>

        <p class="f-label">Termín</p>
        <div id="modeSeg" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px">
          <button data-mode="none" style="height:40px;border:1px solid var(--line);background:transparent;color:var(--text-main);font-size:11px;font-weight:700;cursor:pointer">Bez termínu</button>
          <button data-mode="date" style="height:40px;border:1px solid var(--line);background:transparent;color:var(--text-main);font-size:11px;font-weight:700;cursor:pointer">Konkrétní den</button>
          <button data-mode="deadline" style="height:40px;border:1px solid var(--line);background:transparent;color:var(--text-main);font-size:11px;font-weight:700;cursor:pointer">Deadline</button>
        </div>

        <div id="dateBlock" style="display:none">
          <p class="f-label" id="dateLabel">Datum *</p>
          <input class="f-input" id="fDate" type="date" value="${editing && editing.date ? editing.date : msTodayIso()}" style="margin-bottom:12px"/>
        </div>
        <!-- Cas jen u konkretniho dne (11.8.2026). U deadlinu nedava smysl -
             tam jde o "stihnout do", ne o hodinu. -->
        <div id="timeBlock" style="display:none;margin-bottom:12px">
          <div id="timeToggle" style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:11px 12px;border:1px solid var(--line);background:var(--card-bg)">
            <span id="timeBox" style="width:20px;height:20px;flex:0 0 20px;border:1px solid var(--line);display:grid;place-items:center;border-radius:var(--radius)"></span>
            <div style="flex:1;min-width:0">
              <b style="display:block;font-size:12.5px">Přidat čas</b>
              <span style="font-size:10.5px;color:var(--muted)">Např. schůzka s řemeslníkem v 9:00</span>
            </div>
          </div>
          <input class="f-input" id="fTime" type="time" value="${editing && editing.time ? editing.time : '09:00'}" style="display:none;margin-top:8px"/>
        </div>
        <p id="noneHint" style="display:none;font-size:11px;color:var(--muted);margin:-2px 0 12px;line-height:1.5">Úkol bez termínu se bude v Kalendáři zobrazovat každý den u dneška, dokud ho nesplníš. Po splnění zůstane zaznamenaný jen v den, kdy jsi ho dokončil.</p>
      </div>
      <div style="padding:12px 16px calc(20px + env(safe-area-inset-bottom));border-top:1px solid var(--line)">
        <button class="btn-primary" id="saveBtn" style="border-color:#ff9b32">${editing ? 'Uložit změny' : 'Uložit úkol'}</button>
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.go(editing ? 'calendar' : 'dashboard'));

    const modeBtns = container.querySelectorAll('#modeSeg button');
    function refreshMode(){
      modeBtns.forEach(b=>{
        const active = b.dataset.mode === mode;
        b.style.borderColor = active ? '#ff9b32' : 'var(--line)';
        b.style.color = active ? '#ff9b32' : 'var(--text-main)';
        b.style.background = active ? 'color-mix(in srgb, #ff9b32 10%, transparent)' : 'transparent';
      });
      container.querySelector('#dateBlock').style.display = mode==='none' ? 'none' : 'block';
      container.querySelector('#dateLabel').textContent = mode==='deadline' ? 'Dokončit do *' : 'Datum *';
      container.querySelector('#noneHint').style.display = mode==='none' ? 'block' : 'none';
      // Cas patri jen ke konkretnimu dni.
      container.querySelector('#timeBlock').style.display = mode==='date' ? 'block' : 'none';
      if(mode !== 'date' && useTime){ useTime = false; refreshTime(); }
    }

    let useTime = !!(editing && editing.time);
    function refreshTime(){
      const box = container.querySelector('#timeBox');
      const inp = container.querySelector('#fTime');
      box.style.background = useTime ? '#ff9b32' : 'transparent';
      box.style.borderColor = useTime ? '#ff9b32' : 'var(--line)';
      box.innerHTML = useTime ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#04070f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>' : '';
      inp.style.display = useTime ? 'block' : 'none';
    }
    container.querySelector('#timeToggle').addEventListener('click', ()=>{ useTime = !useTime; refreshTime(); });
    refreshTime();
    modeBtns.forEach(b=> b.addEventListener('click', ()=>{ mode = b.dataset.mode; refreshMode(); }));
    refreshMode();

    container.querySelector('#saveBtn').addEventListener('click', ()=>{
      const title = container.querySelector('#fTitle').value.trim();
      if(!title){ alert('Vyplň, co je potřeba udělat.'); return; }
      const date = mode==='none' ? null : container.querySelector('#fDate').value;
      if(mode!=='none' && !date){ alert('Vyplň prosím datum.'); return; }
      const time = (mode === 'date' && useTime) ? (container.querySelector('#fTime').value || null) : null;
      const patch = { title, date, dateMode: mode, time };
      if(editing){ msUpdateTask(editing.id, patch); Layout.showSuccess('Úkol upraven'); Router.go('calendar'); }
      else { msAddTask(patch); Layout.showSuccess('Úkol přidán'); Router.go('dashboard'); }
    });
    return { activeTab:'dashboard' };
  }
  return { render };
})();
Router.register('task-add', TaskAddScreen);


/* ---------- Nova fotka ---------- */
const PhotoAddScreen = (function(){
  function render(container, params){
    let queued = [];   // { file, url } - odkazy na vybrane soubory, ne obrazky v pameti
    // OPRAVA (2.8.2026): stejna pricina jako u Vydaju/Deniku - drive tahle
    // funkce params vubec neprijimala, takze etapa se vzdy predvyplnila jen
    // globalne aktualni etapou, i kdyz uzivatel prisel z konkretni etapy.
    let stageKey = (params && params.stage) || msGetCurrentStage();

    container.innerHTML = `
      <div class="topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <h1>Přidat fotku</h1>
      </div>
      <div class="screen-scroll">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
          <div id="btnCamera" style="border:1px dashed var(--line);padding:16px 8px;text-align:center;cursor:pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="14" rx="1"/><circle cx="12" cy="13" r="3.5"/></svg>
            <b style="display:block;font-size:11.5px;margin-top:6px">Vyfotit</b>
          </div>
          <div id="btnGallery" style="border:1px dashed var(--line);padding:16px 8px;text-align:center;cursor:pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="9" cy="11" r="2"/></svg>
            <b style="display:block;font-size:11.5px;margin-top:6px">Z galerie</b>
            <span style="display:block;font-size:9px;color:var(--muted);margin-top:3px">označ kolik chceš</span>
          </div>
        </div>
        <!-- ZMENA (8.8.2026): systemovy vyber fotek je okno iOS, do ktereho
             appka nemuze nic vykreslit - jakykoliv limit by uzivatel zjistil
             az po navratu. Proto zadny limit neni: appka si vybrane fotky
             rozdeli na davky po ${msFormatMb(MS_UPLOAD_LIMIT_BYTES)} sama. -->
        <p style="font-size:10px;color:var(--muted);margin:0 0 12px;line-height:1.5">Označ v galerii klidně všechny. Appka je uloží po dávkách po ${msFormatMb(MS_UPLOAD_LIMIT_BYTES)}, aby telefonu nedošla paměť - nemusíš to dělit sám.</p>
        <input type="file" accept="image/*" capture="environment" id="cameraInput" style="display:none"/>
        <input type="file" accept="image/*" multiple id="galleryInput" style="display:none"/>
        <p class="f-label">Vybráno (<span id="selCount">0</span>)</p>
        ${msBudgetGaugeHtml('photoBudget')}
        <div id="thumbGrid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px"></div>
        <p class="f-label">Etapa</p>
        <div class="dropdown" id="stageDropdown" style="margin-bottom:12px">
          <button class="dd-btn" id="stageDdBtn"><span class="left"><i id="stageDdDot"></i><span id="stageDdLabel">—</span></span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>
          <div class="dd-panel" id="stageDdPanel" data-sheet-title="Zařadit do etapy"></div>
        </div>
        <p class="f-label">Popisek (nepovinné)</p>
        <input class="f-input" id="fCaption" placeholder="Např. Betonáž základové desky" style="margin-bottom:12px"/>
      </div>
      <div style="padding:12px 16px calc(20px + env(safe-area-inset-bottom));border-top:1px solid var(--line)">
        <button class="btn-primary" id="saveBtn" style="border-color:#b34cff">Nahrát fotky</button>
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.go('dashboard'));

    // OPRAVA (14.8.2026): tahle funkce kreslila primo na canvas bez EXIF
    // otoceni - fotka vyfocena na vysku vysla na bok/vzhuru nohama a po
    // zvetseni nahledu byla nepouzitelna. msResizeImageFile v data.js uz
    // EXIF cte a spravne otoci; tahle zustava jen jako tenka obalka, at
    // se nemusi menit zadne volajici misto.
    function resizeImage(file, maxDim){
      const attempt = msResizeImageFile(file, maxDim);
      // OPRAVA (1.8.2026): tahle funkce dřív nemela VUBEC zadne oseteni
      // chyby (ani onerror, natoz casovy limit) - kdyz telefon obrazek
      // nezvladl zpracovat, appka na to cekala navzdy, potichu, a fotka
      // se nikam neulozila (ani do zapisu, ani do Galerie). DULEZITE: casovy
      // limit musi zavodit s PUVODNIM (jeste nedokoncenym) pokusem, ne az s
      // jeho vysledkem - jinak by "zaseknuti" vubec nezachytil.
      const withTimeout = Promise.race([
        attempt,
        new Promise((_, reject)=> setTimeout(()=> reject(new Error('časový limit vypršel')), 12000))
      ]);
      return withTimeout.catch(e=>{ console.error('resizeImage selhalo', e); return null; });
    }
    /* ==========================================================
       FRONTA BLOKU (8.8.2026)
       Limit 5 MB uz neni strop, ale velikost jedne davky. Appka si
       drzi jen ODKAZY na vybrane soubory (File nezabira pamet) a
       k nim maly nahled 220 px. Pri ukladani je bere po blocich: zmensi,
       ulozi, uvolni, dalsi. Pamet tim zustava pořád stejně nízká
       bez ohledu na to, jestli je fotek pet nebo sto.
       ========================================================== */
    function renderThumbs(){
      const grid = container.querySelector('#thumbGrid');
      grid.innerHTML = queued.map((q,i)=>`<div style="aspect-ratio:1;border:1px solid #b34cff;background-image:url(${q.url});background-size:cover;position:relative">
        <span data-i="${i}" class="rm" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;background:var(--card-bg-2);border:1px solid var(--line);border-radius:50%;display:grid;place-items:center;font-size:10px;cursor:pointer">✕</span>
      </div>`).join('');
      grid.querySelectorAll('.rm').forEach(el=> el.addEventListener('click', ()=>{
        const i = Number(el.dataset.i);
        queued.splice(i,1);
        renderThumbs();
      }));
      container.querySelector('#selCount').textContent = queued.length;
      msQueueInfoUpdate(container, 'photoBudget', queued.length);
    }
    /* ZMENA (8.8.2026): misto pevneho poctu fotek hlida appka ROZPOCET
       v bajtech (5 MB na jedno nahrani). Pocet fotek z nej vyplyne sam
       podle nastavene kvality - pri usporne se jich vejde nekolikrat
       vic nez pri nejvyssi. A meri se skutecna velikost uz zmensenych
       fotek, protoze odhad se u fotky oblohy a fotky vykresu lisi
       nekolikanasobne. */
    /* OPRAVA (8.8.2026): nahledy se delaly primo z vybraneho souboru pres
       URL.createObjectURL. Jenze telefon musi kazdou fotku rozbalit v plnem
       rozliseni, i kdyz ji ukazuje jako ctverecek 96 px - jedna 12Mpx fotka
       zabere v pameti 47 MB, tricet pet jich je pres 1,6 GB. Safari stranku
       zabil a po navratu z galerie se appka nacetla znovu prazdna.
       Ted se z kazde fotky nejdriv udela maly nahled (220 px, ~140 kB) a
       plny soubor se sahne az pri ukladani. Zpracovava se po jedne, aby
       spicka v pameti byla vzdy jen jedna fotka. */
    async function handleFiles(fileList){
      const files = Array.from(fileList).filter(f=> f.type.startsWith('image/'));
      if(!files.length) return;

      const btn = container.querySelector('#saveBtn');
      const label = btn ? btn.textContent : '';
      if(btn){ btn.disabled = true; }

      let broken = 0;
      for(let i = 0; i < files.length; i++){
        if(btn && files.length > 3) btn.textContent = `Připravuji náhledy ${i+1}/${files.length}…`;
        let preview = null;
        try{ preview = await resizeImage(files[i], 220); }catch(e){ preview = null; }
        if(!preview){ broken++; continue; }
        queued.push({ file: files[i], url: preview });
        renderThumbs();
        // pustit telefon k slovu, at stihne uvolnit pamet po rozbalene fotce
        await new Promise(r=> setTimeout(r, 0));
      }

      if(btn){ btn.textContent = label; btn.disabled = false; }
      renderThumbs();
      if(broken) alert(broken + ' fotek se nepodařilo načíst, zkus je prosím znovu.');
    }

    container.querySelector('#cameraInput').addEventListener('change', e=>handleFiles(e.target.files));
    container.querySelector('#galleryInput').addEventListener('change', e=>handleFiles(e.target.files));
    container.querySelector('#btnCamera').addEventListener('click', ()=> container.querySelector('#cameraInput').click());
    container.querySelector('#btnGallery').addEventListener('click', ()=> container.querySelector('#galleryInput').click());
    renderThumbs();

    const stageDdBtn = container.querySelector('#stageDdBtn');
    const stageDdPanel = container.querySelector('#stageDdPanel');
    msSelectedStages().forEach(s=>{
      const it = document.createElement('div');
      it.className = 'dd-item';
      it.innerHTML = `<i style="background:${s.color};display:inline-block;width:7px;height:7px;margin-right:8px"></i>${msEsc(s.name)}`;
      it.addEventListener('click', ()=>{ stageKey=s.key; container.querySelector('#stageDdLabel').textContent=s.name; container.querySelector('#stageDdDot').style.background=s.color; stageDdPanel.classList.remove('open'); });
      stageDdPanel.appendChild(it);
    });
    stageDdBtn.addEventListener('click', ()=> stageDdPanel.classList.toggle('open'));
    const initS = msStageByKey(stageKey);
    if(initS){ container.querySelector('#stageDdLabel').textContent = initS.name; container.querySelector('#stageDdDot').style.background = initS.color; }


    const saveBtn = container.querySelector('#saveBtn');
    saveBtn.addEventListener('click', async ()=>{
      if(queued.length===0){ alert('Nejdřív vyber nebo vyfoť aspoň jednu fotku.'); return; }
      const caption = container.querySelector('#fCaption').value.trim() || null;

      const originalLabel = saveBtn.textContent;
      saveBtn.disabled = true;

      /* Fronta bloku: fotky se berou po davkach do 5 MB. V pameti je vzdy
         jen jeden blok - zmensi se, ulozi, uvolni, jde se na dalsi. Diky
         tomu je jedno, jestli uzivatel vybral pet fotek nebo sto, a
         nemusi nic delit rucne. */
      const total = queued.length;
      let done = 0, failed = 0, noImage = 0, broken = 0, block = 0;

      while(done + failed + broken < total){
        block++;
        // 1) naplnit blok do limitu
        const batch = [];
        let bytes = 0;
        while(done + failed + broken + batch.length < total){
          const idx = done + failed + broken + batch.length;
          saveBtn.textContent = `Připravuji ${idx+1}/${total}…`;
          const r = await resizeImage(queued[idx].file, (typeof msPhotoMaxDim==='function'?msPhotoMaxDim():1800));
          if(!r){ broken++; continue; }
          if(batch.length && bytes + r.length > MS_UPLOAD_LIMIT_BYTES) { batch.unshift(r); break; }
          bytes += r.length;
          batch.push(r);
        }
        // fotka, ktera se do bloku uz nevesla, se vrati na zacatek dalsiho
        let carry = null;
        if(batch.length && bytes > MS_UPLOAD_LIMIT_BYTES && batch.length > 1){ carry = batch.shift(); }

        // 2) blok ulozit a hned uvolnit
        for(let bi = 0; bi < batch.length; bi++){
          saveBtn.textContent = `Ukládám ${done+bi+1}/${total}` + (total > batch.length ? ` (blok ${block})` : '') + '…';
          const dataUrl = batch[bi];
          batch[bi] = null;
          const saved = await msAddPhoto({ stage: stageKey, thumb: dataUrl, caption });
          if(!saved){ failed++; continue; }
          try{
            const has = await msIdbGet(msBlobKey('photo', saved.id));
            if(!has) noImage++;
          }catch(e){ noImage++; }
          done++;
          await new Promise(r=> setTimeout(r, 0));
        }
        if(carry){
          const saved = await msAddPhoto({ stage: stageKey, thumb: carry, caption });
          if(saved){ done++; }
          else failed++;
        }
      }

      queued = [];

      if(failed>0 || broken>0 || noImage>0){
        saveBtn.textContent = originalLabel; saveBtn.disabled = false;
        let m = `Uloženo ${done} z ${total} fotek.`;
        if(broken)  m += `\n${broken} se nepodařilo zpracovat.`;
        if(failed)  m += `\n${failed} se nepodařilo uložit - úložiště telefonu je pravděpodobně plné.`;
        if(noImage) m += `\n${noImage} se uložilo bez obrázku - telefon zápis odmítl. Zkus appku zavřít a otevřít znovu.`;
        alert(m);
        renderThumbs();
        return;
      }
      Layout.showSuccess(done === 1 ? 'Fotka přidána' : `Přidáno ${done} fotek`);
      Router.go('dashboard');
    });
    return { activeTab:'dashboard' };
  }
  return { render };
})();
Router.register('photo-add', PhotoAddScreen);
