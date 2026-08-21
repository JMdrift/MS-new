/* ==========================================================
   AKTUALITY (7.8.2026)
   Samostatna obrazovka se seznamem poslednich ukonu na stavbe.
   Zdrojem je msRecentActivity() z data.js - tentyz vypocet, jaky
   pouziva dlazdice na Dashboardu, aby si to nemohlo odporovat.
   Zaznamy se nikde neukladaji, skladaji se z toho, co uz appka ma.
   ========================================================== */
const NewsScreen = (function(){

  const FILTERS = [
    { key:'vse',      label:'Vše' },
    { key:'Deník',    label:'Deník' },
    { key:'Galerie',  label:'Fotky' },
    { key:'penize',   label:'Peníze' },
    { key:'Kalendář', label:'Kalendář' },
    { key:'Úkol',     label:'Úkoly' },
  ];
  let activeFilter = 'vse';

  function dayLabel(iso){
    if(!iso) return 'Bez data';
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(iso+'T00:00:00');
    const diff = Math.round((today - d) / 86400000);
    if(diff === 0) return 'Dnes';
    if(diff === 1) return 'Včera';
    if(diff > 1 && diff < 7) return 'Před ' + diff + ' dny';
    return d.getDate()+'. '+(d.getMonth()+1)+'. '+d.getFullYear();
  }

  function render(container){
    container.innerHTML = `
      <div class="topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <h1>Aktuality</h1>
        <div style="width:30px"></div>
      </div>
      <div class="screen-scroll">
        <div id="newsFilters" class="dd-chips" style="display:flex;gap:6px;overflow-x:auto;padding-bottom:8px"></div>
        <div id="newsList"></div>
      </div>
    `;

    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());
    drawFilters();
    draw();

    function drawFilters(){
      const bar = container.querySelector('#newsFilters');
      bar.innerHTML = FILTERS.map(f=>`
        <button class="news-filter" data-key="${f.key}" style="flex:0 0 auto;padding:7px 11px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer;
          background:transparent;border:1px solid ${activeFilter===f.key?'var(--accent)':'var(--line)'};
          color:${activeFilter===f.key?'var(--accent)':'var(--muted)'};border-radius:var(--radius)">${f.label}</button>`).join('');
      bar.querySelectorAll('.news-filter').forEach(b=>{
        b.addEventListener('click', ()=>{ activeFilter = b.dataset.key; drawFilters(); draw(); });
      });
    }

    function draw(){
      const list = container.querySelector('#newsList');
      let items = msRecentActivity();

      if(activeFilter === 'penize'){
        items = items.filter(i => i.kind === 'Výdaj' || i.kind === 'Vklad');
      } else if(activeFilter !== 'vse'){
        items = items.filter(i => i.kind === activeFilter);
      }

      if(!items.length){
        list.innerHTML = (activeFilter === 'vse'
        ? msEmptyState({icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h13v14H4z"/><path d="M17 9h3v8a2 2 0 0 1-3 1.7"/><path d="M7 9h7M7 13h7"/></svg>`, color:'var(--add-color)',
            title:'Zatím se nic nestalo',
            text:'Jakmile něco zapíšeš - výdaj, fotku, zápis v deníku - objeví se to tady.',
            hints:['Poslední zápisy z deníku','Přidané fotky','Výdaje a vklady']})
        : msEmptyState({kind:'filter', title:'V téhle kategorii nic není',
            text:'Zkus přepnout na jiný filtr nebo na Vše.'}));
        return;
      }

      // seskupeni po dnech, at je videt rytmus stavby
      let html = '', lastDay = null;
      items.forEach(i=>{
        const day = i.date || '';
        if(day !== lastDay){
          lastDay = day;
          html += `<p class="section-label" style="margin-top:14px">${dayLabel(day)}</p>`;
        }
        html += `
          <div class="news-row" data-route="${i.route}" style="display:flex;align-items:center;gap:10px;border:1px solid var(--line);
            background:var(--card-bg);border-radius:var(--radius);padding:10px;margin-bottom:6px;cursor:pointer">
            <i style="width:7px;height:7px;border-radius:50%;background:${i.color};display:inline-block;flex:0 0 7px"></i>
            <div style="flex:1;min-width:0">
              <b style="display:block;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(i.text)}</b>
              <span style="font-size:10px;color:var(--muted)">${i.kind}</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
          </div>`;
      });
      list.innerHTML = html;

      list.querySelectorAll('.news-row').forEach(el=>{
        el.addEventListener('click', ()=> Router.go(el.dataset.route));
      });
    }

    return { activeTab:'', showNav:true };
  }

  return { render };
})();

Router.register('news', NewsScreen);
