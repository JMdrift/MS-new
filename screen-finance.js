/* ==========================================================
   FINANCE
   ========================================================== */
const FinanceScreen = (function(){
  function render(container){
    let typeState = { income:true, expense:true };
    let activeStage = 'all';

    container.innerHTML = `
      <div class="topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <h1>Finance</h1>
        <div class="icon-btn" id="addBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>
      </div>
      <div class="screen-scroll">
        <div id="summary" style="display:flex;gap:7px;margin-bottom:12px"></div>
        <div class="pie-card" id="pieCard" style="border:1px solid var(--line);border-radius:var(--radius);padding:12px;display:flex;gap:14px;align-items:center;margin-bottom:10px">
          <div style="width:110px;height:110px;flex:0 0 auto;position:relative">
            <svg viewBox="0 0 120 120" style="width:100%;height:100%">
              <defs><filter id="pglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
              <g id="pieSegs" filter="url(#pglow)"></g>
            </svg>
            <div id="pieHole" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center"></div>
          </div>
          <div id="legend" style="flex:1;min-width:0;display:flex;flex-direction:column;gap:5px"></div>
        </div>
        <button class="btn-ghost" id="legendToggle" style="display:none;margin-bottom:10px;font-size:11px">Zobrazit všech <span id="legendToggleCount"></span> etap</button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px" id="typeChecks">
          <button data-t="income" style="height:36px;border:1px solid var(--line);background:transparent;color:#fff;font-weight:800;font-size:12px;cursor:pointer">✓ Vklady</button>
          <button data-t="expense" style="height:36px;border:1px solid var(--line);background:transparent;color:#fff;font-weight:800;font-size:12px;cursor:pointer">✓ Výdaje</button>
        </div>
        <div class="dropdown" id="stageDropdown" style="margin-bottom:10px">
          <button class="dd-btn" id="ddBtn"><span class="left"><i id="ddDot"></i><span id="ddLabel">Vše</span><span id="ddCount"></span></span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg></button>
          <div class="dd-panel" id="ddPanel"></div>
        </div>
        <p class="section-label">Transakce</p>
        <div id="txList"></div>
        <button class="btn-ghost" id="moreBtn" style="margin-top:8px;color:#25b7ff;border-color:var(--line)">Zobrazit více →</button>
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());
    const financeAddBtn = container.querySelector('#addBtn');
    if(typeof msCanAddSection === 'function' && !msCanAddSection('finance')){ financeAddBtn.style.display = 'none'; }
    else financeAddBtn.addEventListener('click', ()=> Router.go('expense-add'));

    container.querySelectorAll('#typeChecks button').forEach(btn=>{
      const t = btn.dataset.t;
      btn.style.borderColor = typeState[t] ? (t==='income'?'var(--money-pos)':'var(--accent)') : 'var(--line)';
      btn.addEventListener('click', ()=>{
        const willBeActive = !typeState[t];
        if(!willBeActive && ((t==='income' && !typeState.expense) || (t==='expense' && !typeState.income))) return;
        typeState[t] = willBeActive;
        btn.textContent = (willBeActive?'✓ ':'') + (t==='income'?'Vklady':'Výdaje');
        btn.style.borderColor = willBeActive ? (t==='income'?'var(--money-pos)':'var(--accent)') : 'var(--line)';
        render_();
      });
    });

    const ddBtn = container.querySelector('#ddBtn');
    const ddPanel = container.querySelector('#ddPanel');
    function buildDropdown(){
      ddPanel.innerHTML = '';
      const allItem = document.createElement('div');
      allItem.className = 'dd-item' + (activeStage==='all' ? ' is-active' : '');
      allItem.innerHTML = '<i style="background:#fff;display:inline-block;width:8px;height:8px;margin-right:7px"></i>Vše'
        + `<span class="dd-n">${msCountForStage(msExpenses(), 'all')}</span>`;
      allItem.addEventListener('click', ()=>{ activeStage='all'; ddLabelUpdate(); buildDropdown(); ddPanel.classList.remove('open'); render_(); });
      ddPanel.appendChild(allItem);
      msSelectedStages().forEach(s=>{
        const it = document.createElement('div');
        it.className = 'dd-item' + (activeStage===s.key ? ' is-active' : '');
        it.style.color = s.color;
        it.innerHTML = `<i style="background:${s.color};display:inline-block;width:8px;height:8px;margin-right:7px"></i>${msEsc(s.name)}`
          + `<span class="dd-n">${msCountForStage(msExpenses(), s.key)}</span>`;
        it.addEventListener('click', ()=>{ activeStage=s.key; ddLabelUpdate(); buildDropdown(); ddPanel.classList.remove('open'); render_(); });
        ddPanel.appendChild(it);
      });
    }
    function ddLabelUpdate(){
      const st = msStageByKey(activeStage);
      container.querySelector('#ddLabel').textContent = st ? st.name : 'Vše';
      const n = msExpenses().filter(t=> activeStage==='all' || t.stage===activeStage).length;
      container.querySelector('#ddCount').textContent =
        n === 0 ? 'žádné položky' : (n === 1 ? '1 položka' : (n < 5 ? n+' položky' : n+' položek'));
    }
    ddBtn.addEventListener('click', ()=> ddPanel.classList.toggle('open'));
    buildDropdown(); ddLabelUpdate();

    let legendExpanded = false;
    const TOP_N = 5;
    // mezera mezi vysecemi v "jednotkach" obvodu kruznice - hranice etap
    // pak jde poznat i kdyz jsou dva sousedni odstiny blizko sebe
    const SEG_GAP = 2.4;
    function renderPie(){
      const STAGES = msSelectedStages().map(s => ({...s, spent: msSumExpensesByStage(s.key)}));
      const total = STAGES.reduce((a,s)=>a+s.spent,0);
      const withSpend = STAGES.filter(s=>s.spent>0).sort((a,b)=>b.spent-a.spent);

      const seg = container.querySelector('#pieSegs');
      seg.innerHTML = '';
      const r = 50, cx = 60, cy = 60, circ = 2*Math.PI*r;
      let acc = 0;
      if(total===0){
        const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
        circle.setAttribute('cx', cx); circle.setAttribute('cy', cy); circle.setAttribute('r', r);
        circle.setAttribute('fill','none'); circle.setAttribute('stroke','var(--line)'); circle.setAttribute('stroke-width','15');
        seg.appendChild(circle);
      }
      const theme = document.documentElement.dataset.theme;
      const themed = false;   // svetly motiv uz appka nema
      // OPRAVA v2: odstiny jedne barvy (cerna->cihlova->bila) maji strop,
      // kolik kroku z nich jde rozeznat - u 5+ etap uz splyvaly. Misto toho
      // tlumena "pastelkova" paleta ruznych odstinu (ne jen jasu), co porad
      // ladi s papirovym motivem, ale kazda etapa je opravdu jina barva.
      const PALETTE = ['#a8503c','#3f5d47','#8a6a34','#39586b','#6b3d4f','#6b6339','#7a5648','#4a4a63'];
      function shade(idx){ return PALETTE[idx % PALETTE.length]; }

      withSpend.forEach((s,idx)=>{
        const frac = s.spent/total;
        const len = frac*circ;
        const drawLen = Math.max(len - SEG_GAP, Math.min(len, 1));
        const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
        circle.setAttribute('cx', cx); circle.setAttribute('cy', cy); circle.setAttribute('r', r);
        const segColor = themed ? shade(idx) : s.color;
        circle.setAttribute('fill','none'); circle.setAttribute('stroke', segColor); circle.setAttribute('stroke-width','15');
        circle.setAttribute('stroke-linecap', withSpend.length>1 ? 'round' : 'butt');
        circle.setAttribute('stroke-dasharray', `${drawLen} ${circ-drawLen}`);
        circle.setAttribute('stroke-dashoffset', -acc);
        circle.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
        if(themed) circle.style.stroke = segColor;
        seg.appendChild(circle);
        acc += len;
      });

      const showAll = legendExpanded || withSpend.length <= TOP_N + 1;
      let legendData;
      if(showAll){ legendData = withSpend; }
      else {
        const top = withSpend.slice(0, TOP_N);
        const restSum = withSpend.slice(TOP_N).reduce((a,s)=>a+s.spent,0);
        legendData = [...top, {name:'Ostatní etapy', color:'#5c6584', spent:restSum, isOther:true}];
      }
      const legend = container.querySelector('#legend');
      legend.innerHTML = '';
      if(legendData.length===0){
        legend.innerHTML = '<span style="font-size:10.5px;color:var(--muted)">Zatím žádné výdaje podle etap.</span>';
      }
      legendData.forEach((s,idx)=>{
        const pct = total ? Math.round(s.spent/total*100) : 0;
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:10px' + (s.isOther?';cursor:pointer':'');
        const swatchColor = themed && !s.isOther ? shade(idx) : s.color;
        row.innerHTML = `<i style="width:8px;height:8px;border-radius:var(--radius);background:${swatchColor};flex:0 0 auto"></i><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#dfe4f5">${msEsc(s.name)}</span><b style="color:#fff">${s.spent.toLocaleString('cs-CZ')} Kč</b><span style="color:var(--muted);width:28px;text-align:right">${pct}%</span>`;
        if(s.isOther) row.addEventListener('click', (e)=>{ e.stopPropagation(); legendExpanded = true; renderPie(); });
        legend.appendChild(row);
      });
      container.querySelector('#pieHole').innerHTML = `<b style="font-size:15px">${total.toLocaleString('cs-CZ')}</b><span style="font-size:7.5px;color:var(--muted);text-transform:uppercase">Kč celkem</span>`;

      const toggle = container.querySelector('#legendToggle');
      if(withSpend.length > TOP_N + 1 && !legendExpanded){
        toggle.style.display = 'block';
        container.querySelector('#legendToggleCount').textContent = withSpend.length;
      } else {
        toggle.style.display = 'none';
      }
    }
    container.querySelector('#legendToggle').addEventListener('click', ()=>{ legendExpanded = true; renderPie(); });

    function render_(){
      renderPie();
      const balBox = `<div style="flex:0 1 150px;border:1px solid var(--line);padding:9px"><span style="display:block;font-size:9px;color:var(--muted);text-transform:uppercase">Zůstatek</span><b style="font-size:14px;color:var(--money-pos)">${msBalance().toLocaleString('cs-CZ')} Kč</b></div>`;
      const expBox = typeState.expense ? `<div style="flex:1;border:1px solid var(--line);padding:9px"><span style="display:block;font-size:9px;color:var(--muted);text-transform:uppercase">Výdaje</span><b style="font-size:14px;color:var(--accent)">${msTotalExpenses().toLocaleString('cs-CZ')} Kč</b></div>` : '';
      const incBox = typeState.income ? `<div style="flex:1;border:1px solid var(--line);padding:9px"><span style="display:block;font-size:9px;color:var(--muted);text-transform:uppercase">Vklady</span><b style="font-size:14px;color:var(--money-pos)">${msTotalIncome().toLocaleString('cs-CZ')} Kč</b></div>` : '';
      const plannedTotal = msTotalPlanned();
      const plannedBox = plannedTotal>0 ? `<div id="plannedBox" style="flex:0 1 150px;border:1px solid #ff9b32;padding:9px;cursor:pointer"><span style="display:block;font-size:9px;color:#ff9b32;text-transform:uppercase">Plánováno · po zaplacení ${msBalanceAfterPlanned().toLocaleString('cs-CZ')} Kč</span><b style="font-size:14px;color:#ff9b32">${plannedTotal.toLocaleString('cs-CZ')} Kč</b></div>` : '';
      container.querySelector('#summary').innerHTML = balBox + expBox + incBox + plannedBox;
      const plannedBoxEl = container.querySelector('#plannedBox');
      if(plannedBoxEl) plannedBoxEl.addEventListener('click', ()=> Router.go('transactions', {expense:0, income:0, planned:1}));

      const filtered = msExpenses().filter(t=>
        ((t.type==='income'&&typeState.income)||(t.type==='expense'&&typeState.expense)) &&
        (activeStage==='all'||t.stage===activeStage)
      ).sort((a,b)=>(b.date||'').localeCompare(a.date||'') || (b.id||'').localeCompare(a.id||''));

      const listEl = container.querySelector('#txList');
      if(filtered.length===0){ listEl.innerHTML = msEmptyState({kind:'filter', title:'Nic neodpovídá filtru',
        text:'Zkus vybrat jinou etapu nebo přepnout na Vše.'}); container.querySelector('#moreBtn').style.display='none'; return; }
      listEl.innerHTML = filtered.slice(0,5).map(t=>{
        const s = msStageByKey(t.stage);
        // stejna znacka etapy jako v uplnem seznamu transakci
        const stageMark = `<span class="tx-stage${s?'':' is-none'}" title="${s?s.name:'Bez etapy'}" style="--sc:${s?s.color:'var(--muted)'}">${msStageIconSvg(s?s.key:null, 18)}</span>`;
        return `<div class="fin-tx" data-id="${t.id}" style="display:flex;align-items:center;gap:10px;border-top:1px solid var(--line);padding:10px 0;cursor:pointer">
          ${stageMark}
          <div style="flex:1;min-width:0"><b style="display:flex;align-items:center;gap:6px;font-size:12.5px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(t.title)}</span>${t.hasReceipt ? msReceiptBadge(12) : ''}</b><span style="font-size:10px;color:var(--muted)">${s?s.name+' · ':''}${t.date}</span>${t.author && t.author !== 'Stavebník' ? `<span style="display:block;margin-top:3px;border:1px solid #25b7ff;color:#25b7ff;padding:1px 6px;font-size:9px;font-weight:700;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box">👤 ${(t.author||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span>` : ''}</div>
          <div style="font-size:12.5px;font-weight:800;color:${t.type==='income'?'var(--money-pos)':'var(--accent)'}">${t.type==='income'?'+':'-'}${Number(t.amount).toLocaleString('cs-CZ')} Kč</div>
          <div class="tx-edit" data-id="${t.id}" style="width:26px;height:26px;border:1px solid var(--line);display:grid;place-items:center;cursor:pointer;color:var(--muted)">✎</div>
        </div>`;
      }).join('');
      listEl.querySelectorAll('.tx-edit').forEach(el=>{
        el.addEventListener('click', ()=> Router.go('expense-add', {edit: el.dataset.id, back:'finance'}));
      });

      container.querySelectorAll('.fin-tx').forEach(el=>{
        el.addEventListener('click', ()=>{
          const t = filtered.find(x=> x.id === el.dataset.id);
          if(t) msTxDetail(t, { onEdit: tx => Router.go('expense-add', {edit:tx.id, back:'finance'}) });
        });
      });

      const moreBtn = container.querySelector('#moreBtn');
      moreBtn.style.display = 'block';
      moreBtn.onclick = ()=>{
        Router.go('transactions', {
          income: typeState.income?1:0, expense: typeState.expense?1:0,
          ...(activeStage!=='all' ? {stage:activeStage} : {})
        });
      };
    }
    render_();

    return { activeTab:'finance' };
  }
  return { render };
})();
Router.register('finance', FinanceScreen);
