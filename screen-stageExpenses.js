/* ==========================================================
   VYDAJE ETAPY (solo karta, prepinatelna etapa)
   ========================================================== */
const StageExpensesScreen = (function(){
  function render(container, params){
    let stageKey = params.stage || msGetCurrentStage();

    container.innerHTML = `
      <div class="topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <h1>Výdaje etapy</h1>
      </div>
      <div class="screen-scroll">
        <div class="dropdown" id="stageDropdown" style="margin-bottom:12px">
          <button class="dd-btn" id="ddBtn"><span class="left"><i id="ddDot"></i><span id="ddLabel">—</span></span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg></button>
          <div class="dd-panel" id="ddPanel" data-sheet-title="Vybrat etapu"></div>
        </div>
        <div style="border:1px solid var(--line);padding:14px;margin-bottom:14px">
          <div style="display:flex;justify-content:space-between"><span style="font-size:9.5px;color:var(--muted);text-transform:uppercase">Zůstatek účtu</span><b id="sumBalance" style="font-size:14px"></b></div>
          <div style="text-align:center;padding-top:8px;margin-top:8px;border-top:1px solid var(--line)">
            <span style="display:block;font-size:9.5px;color:var(--muted);text-transform:uppercase;margin-bottom:4px">Výdaje v této etapě</span>
            <b id="sumStageSpent" style="font-size:26px;color:var(--money-pos)"></b>
          </div>
        </div>
        <p class="section-label">Výdaje</p>
        <div id="txList"></div>
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());

    const ddBtn = container.querySelector('#ddBtn');
    const ddPanel = container.querySelector('#ddPanel');
    const allExpenses = msExpenses();
    MS_STAGES.forEach(s=>{
      const it = document.createElement('div');
      it.className = 'dd-item';
      it.innerHTML = `<i style="background:${s.color};display:inline-block;width:7px;height:7px;margin-right:8px"></i>${msEsc(s.name)}`
        + `<span class="dd-n">${msCountForStage(allExpenses, s.key)}</span>`;
      it.addEventListener('click', ()=>{ stageKey=s.key; updateLabel(); ddPanel.classList.remove('open'); draw(); });
      ddPanel.appendChild(it);
    });
    ddBtn.addEventListener('click', ()=> ddPanel.classList.toggle('open'));
    function updateLabel(){
      const s = msStageByKey(stageKey);
      if(s){ container.querySelector('#ddLabel').textContent = s.name; container.querySelector('#ddDot').style.background = s.color; }
    }
    updateLabel();

    function draw(){
      container.querySelector('#sumBalance').textContent = msBalance().toLocaleString('cs-CZ')+' Kč';
      const spent = msSumExpensesByStage(stageKey);
      container.querySelector('#sumStageSpent').textContent = spent.toLocaleString('cs-CZ')+' Kč';
      const list = container.querySelector('#txList');
      const txs = msExpenses().filter(t=>t.stage===stageKey && t.type==='expense').sort((a,b)=>(b.date||'').localeCompare(a.date||'') || (b.id||'').localeCompare(a.id||''));
      if(txs.length===0){ list.innerHTML = msEmptyState({icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="13" rx="1"/><path d="M2 10h20"/></svg>`, color:'#4dffab',
        title:'V téhle etapě zatím nic',
        text:'Přidané výdaje se počítají do celkového rozpočtu stavby.',
        hints:['Materiál','Práce řemeslníků','Půjčovné a doprava']}); return; }
      list.innerHTML = txs.map(t=>`
        <div class="tx-row" data-id="${t.id}" style="border:1px solid var(--line);padding:10px;margin-bottom:7px;display:flex;justify-content:space-between;align-items:center;cursor:pointer">
          <div style="flex:1;min-width:0"><b style="display:flex;align-items:center;gap:6px;font-size:12.5px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(t.title)}</span>${t.hasReceipt ? msReceiptBadge(12) : ''}</b><span style="font-size:10px;color:var(--muted)">${t.date}${t.category?' · '+t.category:''}</span>${t.author && t.author !== 'Stavebník' ? `<span style="display:block;margin-top:3px;border:1px solid #25b7ff;color:#25b7ff;padding:1px 6px;font-size:9px;font-weight:700;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box">👤 ${(t.author||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span>` : ''}</div>
          <b style="font-size:13px;color:var(--accent)">-${Number(t.amount).toLocaleString('cs-CZ')} Kč</b>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="margin-left:8px;flex:0 0 auto"><path d="M9 6l6 6-6 6"/></svg>
        </div>`).join('');
      list.querySelectorAll('.tx-row').forEach(el=>{
        el.addEventListener('click', ()=>{
          const t = txs.find(x=> x.id === el.dataset.id);
          if(t) msTxDetail(t, { onEdit: tx => Router.go('expense-add', {edit:tx.id, back:'stage-expenses'}) });
        });
      });
    }
    draw();

    return { activeTab:'stages' };
  }
  return { render };
})();
Router.register('stage-expenses', StageExpensesScreen);
