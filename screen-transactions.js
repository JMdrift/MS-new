/* ==========================================================
   VSECHNY TRANSAKCE - seznam + sbalitelny kalendarni filtr podle dne
   ========================================================== */
const TransactionsScreen = (function(){
  const MONTHS = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];

  function render(container, params){
    let showExpense = params.expense !== '0';
    let showIncome = params.income === '1';
    let showPlanned = params.planned === '1';
    const stageFilter = params.stage || null;
    let selectedDate = null;
    const today = new Date();
    let viewYear = today.getFullYear(), viewMonth = today.getMonth();

    let labelParts = [];
    if(showExpense) labelParts.push('výdaje');
    if(showIncome) labelParts.push('vklady');
    if(stageFilter){ const s = msStageByKey(stageFilter); if(s) labelParts.push(s.name); }

    container.innerHTML = `
      <div class="topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <h1>Transakce <span style="font-size:10.5px;color:var(--muted)">${labelParts.length?'· '+labelParts.join(' + '):''}</span></h1>
        <div class="icon-btn" id="calToggleBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M8 3v4M16 3v4M3 10h18"/></svg></div>
      </div>
      <div class="screen-scroll">
        <div id="typeFilterRow" style="display:flex;gap:6px;margin-bottom:10px">
          <span class="tf-chip" data-t="expense" style="border:1px solid var(--line);padding:6px 10px;font-size:10.5px;cursor:pointer">Výdaje</span>
          <span class="tf-chip" data-t="income" style="border:1px solid var(--line);padding:6px 10px;font-size:10.5px;cursor:pointer">Vklady</span>
          <span class="tf-chip" data-t="planned" style="border:1px solid var(--line);padding:6px 10px;font-size:10.5px;cursor:pointer">Plánované</span>
        </div>
        <div id="miniCalWrap" style="max-height:0;overflow:hidden;transition:max-height .2s ease">
          <div style="border:1px solid var(--line);background:var(--card-bg-2);border-radius:var(--radius);padding:10px;margin-bottom:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <b id="calMonthLabel" style="font-size:12px"></b>
              <div style="display:flex;gap:6px">
                <button id="calPrev" style="width:24px;height:24px;border:1px solid var(--line);background:transparent;color:#fff;cursor:pointer">‹</button>
                <button id="calNext" style="width:24px;height:24px;border:1px solid var(--line);background:transparent;color:#fff;cursor:pointer">›</button>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:4px">
              ${['Po','Út','St','Čt','Pá','So','Ne'].map(d=>`<span style="text-align:center;font-size:8.5px;color:var(--muted);font-weight:800">${d}</span>`).join('')}
            </div>
            <div id="calGrid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px"></div>
            <p id="clearDay" style="display:none;text-align:center;font-size:10.5px;color:var(--accent);margin:8px 0 0;cursor:pointer">Zrušit výběr dne ✕</p>
          </div>
        </div>
        <div id="txList"></div>
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());

    const miniCalWrap = container.querySelector('#miniCalWrap');
    container.querySelector('#calToggleBtn').addEventListener('click', ()=>{
      const isOpen = miniCalWrap.style.maxHeight !== '0px' && miniCalWrap.style.maxHeight !== '';
      miniCalWrap.style.maxHeight = isOpen ? '0' : '320px';
      if(!isOpen) renderCalendar();
    });

    function getFilteredTx(){
      return msExpenses().filter(t=>{
        if(stageFilter && t.stage!==stageFilter) return false;
        if(t.type==='expense') return showExpense;
        if(t.type==='income') return showIncome;
        if(t.type==='planned') return showPlanned;
        return false;
      });
    }
    function txOnDay(iso){ return getFilteredTx().filter(t=>t.date===iso); }

    function refreshChips(){
      container.querySelectorAll('.tf-chip').forEach(chip=>{
        const t = chip.dataset.t;
        const active = (t==='expense'&&showExpense) || (t==='income'&&showIncome) || (t==='planned'&&showPlanned);
        const color = t==='expense'?'#ff7a86':(t==='income'?'#4dffab':'#ff9b32');
        chip.style.borderColor = active ? color : 'var(--line)';
        chip.style.color = active ? color : 'var(--muted)';
        chip.style.background = active ? `color-mix(in srgb, ${color} 10%, transparent)` : 'transparent';
      });
    }
    container.querySelectorAll('.tf-chip').forEach(chip=>{
      chip.addEventListener('click', ()=>{
        const t = chip.dataset.t;
        if(t==='expense') showExpense = !showExpense;
        else if(t==='income') showIncome = !showIncome;
        else showPlanned = !showPlanned;
        refreshChips(); renderCalendar(); renderList();
      });
    });
    refreshChips();

    function renderCalendar(){
      container.querySelector('#calMonthLabel').textContent = MONTHS[viewMonth] + ' ' + viewYear;
      const grid = container.querySelector('#calGrid');
      grid.innerHTML = '';
      const firstDay = new Date(viewYear, viewMonth, 1);
      let startWeekday = firstDay.getDay(); startWeekday = startWeekday===0?6:startWeekday-1;
      const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
      for(let i=0;i<startWeekday;i++) grid.appendChild(document.createElement('div'));
      for(let d=1; d<=daysInMonth; d++){
        const iso = viewYear+'-'+String(viewMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
        const has = txOnDay(iso).length>0;
        const cell = document.createElement('div');
        cell.style.cssText = `height:26px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;border-radius:var(--radius);
          cursor:${has?'pointer':'default'};background:${iso===selectedDate?'#b34cff':'transparent'};color:${iso===selectedDate?'#fff':(has?'#c7cee6':'#5c6584')}`;
        cell.innerHTML = d + (has?'<i style="width:3px;height:3px;background:currentColor;border-radius:50%;display:block;margin-top:1px"></i>':'');
        if(has){ cell.addEventListener('click', ()=>{ selectedDate = (selectedDate===iso)?null:iso; renderCalendar(); renderList(); }); }
        grid.appendChild(cell);
      }
      container.querySelector('#clearDay').style.display = selectedDate ? 'block' : 'none';
    }
    container.querySelector('#calPrev').addEventListener('click', ()=>{ viewMonth--; if(viewMonth<0){viewMonth=11;viewYear--;} renderCalendar(); });
    container.querySelector('#calNext').addEventListener('click', ()=>{ viewMonth++; if(viewMonth>11){viewMonth=0;viewYear++;} renderCalendar(); });
    container.querySelector('#clearDay').addEventListener('click', ()=>{ selectedDate=null; renderCalendar(); renderList(); });

    function renderList(){
      const wrap = container.querySelector('#txList');
      const list = getFilteredTx().filter(t=> !selectedDate || t.date===selectedDate).sort((a,b)=>(b.date||'').localeCompare(a.date||'') || (b.id||'').localeCompare(a.id||''));
      if(list.length===0){ wrap.innerHTML = msEmptyState({kind:'filter', title:'Nic neodpovídá filtru',
        text:'Zkus vybrat jinou etapu nebo přepnout na Vše.'}); return; }
      wrap.innerHTML = list.map(t=>{
        const s = msStageByKey(t.stage);
        const isPlanned = t.type==='planned';
        // Znacka etapy - ikona v barve etapy, at je z rady hned videt,
        // kam vydaj patri (drive slo poznat jen z drobneho radku pod nazvem).
        const stageMark = `<span class="tx-stage${s?'':' is-none'}" title="${s?s.name:'Bez etapy'}" style="--sc:${s?s.color:'var(--muted)'};margin-right:9px">${msStageIconSvg(s?s.key:null, 18)}</span>`;
        return `<div class="tx-row" data-id="${t.id}" style="border:1px solid ${isPlanned?'#ff9b32':'var(--line)'};padding:10px;margin-bottom:7px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;${isPlanned?'background:color-mix(in srgb, #ff9b32 5%, transparent)':''}">
          ${stageMark}
          <div style="flex:1;min-width:0"><b style="display:flex;align-items:center;gap:6px;font-size:12.5px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(t.title)}</span>${t.hasReceipt ? msReceiptBadge(12) : ''}</b><span style="font-size:10px;color:${isPlanned?'#ff9b32':'var(--muted)'}">${isPlanned?'Plánováno · ':''}${s?s.name+' · ':''}${t.date}</span>${t.author && t.author !== 'Stavebník' ? `<span style="display:block;margin-top:3px;border:1px solid #25b7ff;color:#25b7ff;padding:1px 6px;font-size:9px;font-weight:700;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box">👤 ${(t.author||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span>` : ''}</div>
          <b style="font-size:13px;color:${t.type==='income'?'var(--money-pos)':(isPlanned?'#ff9b32':'var(--accent)')}">${t.type==='income'?'+':'-'}${Number(t.amount).toLocaleString('cs-CZ')} Kč</b>
          ${(isPlanned && msCanModifyContent())?`<span class="mark-paid" data-id="${t.id}" style="border:1px solid #ff9b32;color:#ff9b32;padding:5px 8px;font-size:10px;cursor:pointer;margin-left:8px;white-space:nowrap">Zaplaceno</span>`:''}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="margin-left:8px;flex:0 0 auto"><path d="M9 6l6 6-6 6"/></svg>
        </div>`;
      }).join('');
      wrap.querySelectorAll('.tx-row').forEach(el=>{
        el.addEventListener('click', (e)=>{
          if(e.target.closest('.mark-paid')) return;   // ma vlastni obsluhu
          const t = list.find(x=> x.id === el.dataset.id);
          if(!t) return;
          msTxDetail(t, {
            onEdit: tx => Router.go('expense-add', {edit:tx.id, back:'transactions'}),
            onPaid: tx => openPayDialog(tx)
          });
        });
      });
      wrap.querySelectorAll('.mark-paid').forEach(el=>{
        el.addEventListener('click', ()=>{
          const t = list.find(x=>x.id===el.dataset.id);
          if(t) openPayDialog(t);
        });
      });
    }
    renderList();

    function openPayDialog(t){
      const overlay = document.createElement('div');
      overlay.className = 'ms-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:80;display:flex;align-items:flex-end;justify-content:center';
      overlay.innerHTML = `
        <div style="width:100%;max-width:480px;background:var(--card-bg-2);border-top:1px solid var(--line);padding:16px 16px calc(16px + env(safe-area-inset-bottom))">
          <p style="font-size:13px;font-weight:800;margin:0 0 3px">Kolik jsi zaplatil?</p>
          <p style="font-size:10.5px;color:var(--muted);margin:0 0 12px">${msEsc(t.title)} · naplánováno ${Number(t.amount).toLocaleString('cs-CZ')} Kč</p>
          <div style="display:flex;align-items:baseline;gap:8px;border:1px solid #ff9b32;padding:9px 12px;margin-bottom:6px">
            <input id="paidAmountInput" value="${t.amount}" inputmode="numeric" style="border:0;background:transparent;color:#ff9b32;font-size:20px;font-weight:800;width:100%;font:inherit;outline:none"/><span style="color:#ff9b32;font-weight:800">Kč</span>
          </div>
          <p id="payHint" style="font-size:10px;color:var(--muted);margin:0 0 14px">Zaplatíš celou částku - přesune se rovnou mezi skutečné výdaje.</p>
          <button id="confirmPaidBtn" class="btn-primary" style="border-color:#ff9b32;color:#fff">Potvrdit platbu</button>
          <button id="cancelPaidBtn" style="width:100%;background:transparent;border:0;color:var(--muted);padding:10px;margin-top:4px;font-size:11.5px;cursor:pointer">Zrušit</button>
        </div>`;
      document.body.appendChild(overlay);
      const input = overlay.querySelector('#paidAmountInput');
      const hint = overlay.querySelector('#payHint');
      input.addEventListener('input', ()=>{
        const paid = Number((input.value||'').replace(/\s/g,'')) || 0;
        if(paid<=0) hint.textContent = 'Zadej částku větší než 0.';
        else if(paid>=t.amount) hint.textContent = 'Zaplatíš celou částku - přesune se rovnou mezi skutečné výdaje.';
        else hint.textContent = `Zbytek (${(t.amount-paid).toLocaleString('cs-CZ')} Kč) zůstane jako plánovaný výdaj.`;
      });
      overlay.querySelector('#cancelPaidBtn').addEventListener('click', ()=> document.body.removeChild(overlay));
      overlay.querySelector('#confirmPaidBtn').addEventListener('click', ()=>{
        const paid = Number((input.value||'').replace(/\s/g,'')) || 0;
        if(paid<=0){ alert('Zadej částku větší než 0.'); return; }
        document.body.removeChild(overlay);
        msPayPlanned(t.id, paid);
        renderList();
      });
    }

    return { activeTab:'finance' };
  }
  return { render };
})();
Router.register('transactions', TransactionsScreen);
