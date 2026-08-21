/* ==========================================================
   NOVA ETAPA
   ========================================================== */
const NewStageScreen = (function(){
  function render(container){
    // OPRAVA (2.8.2026): zalozeni nove etapy je vyhrazene jen
    // vlastnikovi - zamek uz je videt na tlacitku, kterym se sem chodi
    // (viz screen-stagesWheel.js), ale tady je jeste jednou pro jistotu
    // primo v cilove obrazovce, kdyby se sem nekdo dostal jinak (napr.
    // pres historii prohlizece).
    const activeProjForRights = (typeof msActiveProjectForRights === 'function') ? msActiveProjectForRights() : null;
    if(activeProjForRights && activeProjForRights.isShared){
      if(typeof msShowAccessDenied === 'function') msShowAccessDenied();
      Router.go('stages');
      return { activeTab:'stages' };
    }
    const selectedKeys = msSelectedStageKeys();
    const PRESETS = MS_STAGES.filter(s => !selectedKeys.includes(s.key));
    let selectedTile = null;
    let asCurrent = false;
    const CUSTOM_TILE = {key:'vlastni', name:'Vlastní', color:'#f5f7ff', isCustom:true};

    container.innerHTML = `
      <div class="topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <h1>Nová etapa</h1>
      </div>
      <div class="screen-scroll">
        <div id="customTile" style="border:1px solid var(--line);border-radius:var(--radius);padding:12px;display:flex;align-items:center;gap:10px;cursor:pointer;margin-bottom:14px;color:#f5f7ff">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          <div><b style="display:block;font-size:12.5px;color:#fff">Vlastní etapa</b><span style="font-size:10px;color:var(--muted)">Zadej úplně vlastní název</span></div>
        </div>
        <p class="f-label">Název etapy</p>
        <input class="f-input" id="nameField" placeholder="Např. Základy" style="margin-bottom:14px"/>
        <p class="f-label">Vyber typ</p>
        <div id="tileGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid var(--line);padding:11px 12px">
          <div><b style="display:block;font-size:12.5px">Nastavit jako aktuální</b><span style="font-size:10.5px;color:var(--muted)">Etapa se rovnou zobrazí jako probíhající</span></div>
          <div id="switchEl" style="width:38px;height:22px;border-radius:11px;border:1px solid var(--line);position:relative;cursor:pointer">
            <i style="position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--muted);transition:left .15s"></i>
          </div>
        </div>
      </div>
      <div style="padding:12px 16px calc(20px + env(safe-area-inset-bottom));border-top:1px solid var(--line)">
        <button class="btn-primary" id="saveBtn" disabled style="opacity:.4">Uložit etapu</button>
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());

    function selectCustomTile(){
      selectedTile = CUSTOM_TILE;
      grid.querySelectorAll('div').forEach(d=>{ d.style.borderColor='var(--line)'; d.style.background='transparent'; });
      customTileEl.style.borderColor = 'var(--accent)';
      customTileEl.style.background = 'color-mix(in srgb, var(--accent) 8%, transparent)';
      const nameField = container.querySelector('#nameField');
      nameField.value=''; nameField.placeholder='Zadej název etapy'; nameField.focus();
      validate();
    }
    const customTileEl = container.querySelector('#customTile');
    customTileEl.addEventListener('click', selectCustomTile);

    const grid = container.querySelector('#tileGrid');
    const themeNameNS = document.documentElement.dataset.theme;
    const themedNS = themeNameNS === 'sketch' || themeNameNS === 'sketch-dark';
    // Stejne jako u seznamu etap - odstinovani do bila na konci mrizky
    // pusobilo spatne, misto toho jednotny tlumeny cihlovy ton pro vsechny.
    const mutedAccentNS = themedNS ? 'color-mix(in srgb, var(--accent) 55%, var(--line))' : null;
    PRESETS.forEach((p)=>{
      const el = document.createElement('div');
      const tileColor = themedNS ? mutedAccentNS : p.color;
      el.className = 'stage-icon-colored';
      el.style.cssText = `border:1px solid var(--line);border-radius:var(--radius);padding:10px 4px;text-align:center;cursor:pointer;color:${tileColor} !important`;
      el.innerHTML = `${msStageIconSvg(p.key, 22)}<span style="display:block;font-size:9px;color:#dfe4f5;margin-top:4px;line-height:1.2">${msEsc(p.name)}</span>`;
      el.addEventListener('click', ()=>{
        selectedTile = p;
        grid.querySelectorAll('div').forEach(d=>{ d.style.borderColor='var(--line)'; d.style.background='transparent'; });
        customTileEl.style.borderColor='var(--line)'; customTileEl.style.background='transparent';
        el.style.borderColor = 'var(--accent)';
        el.style.background = `color-mix(in srgb, var(--accent) 8%, transparent)`;
        container.querySelector('#nameField').value = p.name;
        validate();
      });
      grid.appendChild(el);
    });

    const switchEl = container.querySelector('#switchEl');
    switchEl.addEventListener('click', ()=>{
      asCurrent = !asCurrent;
      switchEl.style.borderColor = asCurrent ? 'var(--accent)' : 'var(--line)';
      switchEl.querySelector('i').style.left = asCurrent ? '18px' : '2px';
      switchEl.querySelector('i').style.background = asCurrent ? 'var(--accent)' : 'var(--muted)';
    });

    const saveBtn = container.querySelector('#saveBtn');
    function validate(){
      const nameOk = container.querySelector('#nameField').value.trim().length>0;
      const ok = selectedTile && nameOk;
      saveBtn.disabled = !ok;
      saveBtn.style.opacity = ok ? '1' : '.4';
    }
    container.querySelector('#nameField').addEventListener('input', validate);

    saveBtn.addEventListener('click', ()=>{
      if(saveBtn.disabled) return;
      let key;
      if(selectedTile.isCustom){
        const name = container.querySelector('#nameField').value.trim();
        const color = MS_STAGES.length ? ['#b34cff','#25e8ff','#4dffab','#ffd35c','#ff9b32','#ff5e7b','#25b7ff'][msCustomStages().length % 7] : '#b34cff';
        const created = msAddCustomStage(name, color);
        key = created.key;
      } else {
        key = selectedTile.key;
      }
      msAddSelectedStage(key);
      if(asCurrent) msSetCurrentStage(key);
      Router.go('stages');
    });

    return { activeTab:'stages' };
  }
  return { render };
})();
Router.register('new-stage', NewStageScreen);
