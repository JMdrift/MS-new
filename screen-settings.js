/* ==========================================================
   NASTAVENI
   ========================================================== */
const SettingsScreen = (function(){
  function escapeHtml(s){ return msEsc(s); } // (13.8.2026) uz jen tenky preklad na sdilenou msEsc z data.js
  function render(container){
    container.innerHTML = `
      <div class="topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <h1>Nastavení</h1>
      </div>
      <div class="screen-scroll">
        <!-- Premium/sdileni: bod 2 (prihlaseni) a bod 1 (sdileni) uz jsou
             rozestavene jako UI mock, viz Premium-sdileni-specifikace.md,
             sekce 9 a 10 (log stavby). -->
        <!-- SLOUCENO (14.8.2026): puvodni "Premium" karta byla samostatny
             prodejni blok hned na uvod Nastaveni (kazdy ho videl, i kdyz
             o Premium vubec nestal) a "Účet" byl az o dost niz, jako
             pet skoro identickych radku pod sebou - pusobilo to jako
             tabulka. Ted je to jedna karta: hlavicka profilu (iniciala,
             jmeno, odznak Free/Premium/Sdíleno) nahoře, "Přejít na
             Premium" (nebo "Sdílet stavbu") jako jeden tichý radek
             uvnitr, drobnosti schovane za sipku dole. -->
        <div style="border:1px solid var(--line);margin-bottom:14px" id="accountCard"></div>

        <p class="section-label" style="margin-top:4px">Projekty</p>
        <div id="projectsCard" style="border:1px solid var(--line)"></div>

        <p class="section-label">Předvolby</p>
        <div style="border:1px solid var(--line);margin-bottom:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px">
            <div><b style="display:block;font-size:12.5px">Oznámení</b><span id="notifStatus" style="font-size:10.5px;color:var(--muted)">Posílat události přímo jako notifikaci</span></div>
            <div id="notifSwitch" style="width:38px;height:22px;border-radius:11px;border:1px solid var(--line);position:relative;cursor:pointer"><i style="position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--muted)"></i></div>
          </div>
          <div id="rowAppLock" style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-top:1px solid var(--line);cursor:pointer">
            <div><b style="display:block;font-size:12.5px">Zámek appky</b><span style="font-size:10.5px;color:var(--muted)">${msGetAppLock()==='faceid' ? 'Face ID' : 'Bez zámku'}</span></div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2.5" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>
          </div>
          <div style="padding:12px;border-top:1px solid var(--line)">
            <b style="display:block;font-size:12.5px">Velikost zobrazení</b>
            <span style="display:block;font-size:10.5px;color:var(--muted);margin-bottom:9px">Menší volba zmenší písmo i dlaždice, takže se toho na obrazovku vejde víc</span>
            <div id="uiScaleRow" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
              ${[['velke','Velké'],['stredni','Střední'],['male','Malé']].map(([k,l])=>`
                <button class="ui-scale-btn" data-scale="${k}" style="padding:9px 4px;font:inherit;font-size:11.5px;font-weight:800;cursor:pointer;
                  border:1px solid ${msGetUiScale()===k?'var(--accent)':'var(--line)'};
                  color:${msGetUiScale()===k?'var(--accent)':'var(--muted)'};background:transparent">${l}</button>`).join('')}
            </div>
          </div>
        </div>

        <!-- (13.8.2026) "Vygenerovat stavební deník" odsud zmizelo - byla
             to duplicita tlačítka, které už dávno je přímo v Deníku
             (#genBtn), a to logičtější místo: dá se tam rovnou omezit na
             aktuální etapu. Router route 'diary-export' zůstává, jen sem
             na ni nevede druhá cesta. -->
        <p class="section-label">Úložiště</p>
        <div style="border:1px solid var(--line)">
          <div style="padding:12px;border-bottom:1px solid var(--line)">
            <div id="storageBar" style="height:6px;background:var(--card-bg-2);border:1px solid var(--line);margin-bottom:8px;overflow:hidden"><div id="storageBarFill" style="height:100%;background:var(--accent);width:0%"></div></div>
            <span id="storageText" style="font-size:11px;color:var(--muted)">Počítám…</span>
          </div>
          <div class="row-item" id="rowCompress" style="padding:12px;cursor:pointer"><b style="font-size:12.5px">Zmenšit uložené fotky a dokumenty</b><span style="display:block;font-size:10.5px;color:var(--muted)">Uvolní místo, ale fotky se trvale zmenší na ${MS_SHRINK_PHOTO_DIM} px - nevratné. Použij, jen když appka hlásí plné úložiště.</span></div>
          <div class="row-item" id="rowPhotoCheck" style="padding:12px;cursor:pointer;border-top:1px solid var(--line)"><b style="font-size:12.5px">Najít prázdné fotky</b><span style="display:block;font-size:10.5px;color:var(--muted)" id="photoCheckText">Vzácně se fotka uloží bez obrázku a zůstane po ní jen prázdný čtvereček — tahle kontrola je najde</span></div>
          <div style="padding:12px;border-top:1px solid var(--line)">
            <b style="display:block;font-size:12.5px">Kvalita ukládaných fotek</b>
            <span style="display:block;font-size:10.5px;color:var(--muted);margin-bottom:9px">Platí na nově přidané fotky. Na jedno nahrání se vejde ${msFormatMb(MS_UPLOAD_LIMIT_BYTES)} - není to strop celkem, jen jedné dávky. Kolik je to fotek, záleží na kvalitě.</span>
            <div id="photoQRow" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
              ${Object.keys(MS_PHOTO_PRESETS).map(k=>{
                const pr = MS_PHOTO_PRESETS[k]; const on = msGetPhotoQuality()===k;
                return `<button class="photo-q-btn" data-q="${k}" style="padding:8px 4px;font:inherit;font-size:11px;font-weight:800;cursor:pointer;
                  border:1px solid ${on?'var(--accent)':'var(--line)'};color:${on?'var(--accent)':'var(--muted)'};background:transparent">
                  ${pr.label}<span style="display:block;font-size:9px;font-weight:600;color:var(--muted);margin-top:2px">${pr.dim} px · ~${Math.max(1, Math.floor(MS_UPLOAD_LIMIT_BYTES / Math.round(pr.dim*pr.dim*0.6*(0.055+(pr.q-0.78)*0.55)*1.34)))} fotek</span></button>`;
              }).join('')}
            </div>
          </div>
        </div>

        <p class="section-label">Zálohování dat</p>
        <div style="border:1px solid var(--line)">
          <div class="row-item" id="rowExport" style="padding:12px;cursor:pointer;border-bottom:1px solid var(--line)"><b style="font-size:12.5px">Exportovat zálohu</b><span style="display:block;font-size:10.5px;color:var(--muted)">Stáhne data appky, volitelně i s fotkami a dokumenty</span></div>
          <div class="row-item" id="rowImport" style="padding:12px;cursor:pointer"><b style="font-size:12.5px">Obnovit ze zálohy</b><span style="display:block;font-size:10.5px;color:var(--muted)">Nahraje dříve stažený soubor včetně fotek</span></div>
          <input type="file" id="importFile" accept="application/json" style="display:none"/>
        </div>

        <p class="section-label">Podpora</p>
        <div style="border:1px solid var(--line)">
          <div class="row-item" id="rowSupport" style="padding:12px;border-bottom:1px solid var(--line);cursor:pointer"><b style="font-size:12.5px">Nápověda a podpora</b><span style="display:block;font-size:10.5px;color:var(--muted)">moje-stavba-app@seznam.cz</span></div>
          <div class="row-item" id="rowDeleteAll" style="padding:12px;cursor:pointer;color:#ff7a86"><b style="font-size:12.5px">Smazat všechna data appky</b><span style="display:block;font-size:10.5px;color:var(--muted)">Nevratné</span></div>
        </div>

        <p class="section-label">O aplikaci</p>
        <div style="border:1px solid var(--line);padding:16px;text-align:center;margin-bottom:14px">
          <b style="display:block;font-size:14px">Moje Stavba</b>
          <!-- (13.8.2026) Puvodni text tvrdil "vsechna data zustavaji jen
               v tomto telefonu" - uz to neni pravda, appka od te doby
               umi sdileni s timem a Premium zalohu do cloudu. Cislo
               verze bylo napevno "1.0" a nikdy se nemenilo (na Dashboardu
               uz dlouho sviti skutecne MS_BUILD_VERSION), tak je tu ted
               to same cislo, ne druhy, ktery lhal. -->
          <span style="font-size:11px;color:var(--muted);display:block;margin:8px 0 4px;line-height:1.5">Mějte svou stavbu pod kontrolou — etapy, deník, výdaje, fotky a kalendář na jednom místě, bez složitých tabulek. Appka funguje i bez internetu; stavbu můžeš kdykoliv nasdílet rodině, dozoru nebo řemeslníkům, každému jen s tím, co má vidět.</span>
          <span style="font-size:11px;color:var(--muted)">Verze ${typeof MS_BUILD_VERSION !== 'undefined' ? MS_BUILD_VERSION : '?'}</span>
        </div>
        <div style="border:1px solid var(--line)">
          <div class="row-item" id="rowPrivacy" style="padding:12px;border-bottom:1px solid var(--line);cursor:pointer"><b style="font-size:12.5px">Zásady ochrany osobních údajů</b></div>
          <div class="row-item" id="rowTerms" style="padding:12px;cursor:pointer"><b style="font-size:12.5px">Podmínky používání</b></div>
        </div>
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());
    /* SLOUCENA KARTA UCTU (14.8.2026) - viz komentar u HTML sablony
       vyse. Nahrazuje puvodni dve oddelene funkce (renderPremiumCard +
       renderAccountCard). */
    async function renderAccountCard(){
      const card = container.querySelector('#accountCard');
      if(!card) return;
      if(typeof MSAuth === 'undefined'){ card.innerHTML = ''; return; }

      let session = null, jeAnonymni = true;
      try{ session = await MSAuth.getSession(); }catch(e){}
      try{ jeAnonymni = !session || (MSAuth.isAnonymousAccount && await MSAuth.isAnonymousAccount()); }catch(e){}

      // (14.8.2026) V novem modelu (povinne prihlaseni od prvniho
      // projektu, viz screen-onboarding.js) by se sem clovek bez
      // session dostat nemel - zustava jen jako bezpecna zaloha pro
      // pripad necekaneho stavu.
      if(!session || jeAnonymni){
        card.innerHTML = `<div class="row-item" style="padding:12px"><b style="font-size:12.5px">Účet</b><span style="display:block;font-size:10.5px;color:var(--muted)">Nepřipojen</span></div>`;
        return;
      }

      const aktivni = msLoadProjects().find(p=> p.id === msGetActiveProjectId());
      const jePremium = aktivni && typeof msIsPremiumMockForProject === 'function' && msIsPremiumMockForProject(aktivni.id);
      const jeSdilena = aktivni && aktivni.isShared;
      let jeGoogle = false;
      try{
        const provider = session.user && session.user.app_metadata && session.user.app_metadata.provider;
        jeGoogle = provider === 'google';
      }catch(e){}

      const jmeno = msGetCachedDisplayName();
      const zobrazovaneJmeno = jmeno || session.user.email || 'Uživatel';
      const iniciala = (zobrazovaneJmeno || '?').trim().charAt(0).toUpperCase() || '?';
      const projName = aktivni ? aktivni.name : 'tahle stavba';

      const badge = jeSdilena
        ? '<span style="font-size:8.5px;font-weight:800;color:#25b7ff;border:1px solid #25b7ff;padding:3px 7px;text-transform:uppercase;flex:0 0 auto">Sdíleno</span>'
        : jePremium
          ? '<span style="font-size:8.5px;font-weight:800;color:var(--money-pos);border:1px solid var(--money-pos);padding:3px 7px;text-transform:uppercase;flex:0 0 auto">Premium</span>'
          : '<span style="font-size:8.5px;font-weight:800;color:var(--muted);border:1px solid var(--line);padding:3px 7px;text-transform:uppercase;flex:0 0 auto">Free</span>';

      // Prostredni "akcni" radek se lisi podle stavu - sdilena stavba
      // (jen vysvetleni, zadne tlacitko), Premium (Sdílet stavbu),
      // Free (nabidka Premia). Vsechny tri sdileji stejny jemne
      // podbarveny ramecek, at zustava jedna vizualni "rodina".
      let akcniRadek;
      if(jeSdilena){
        akcniRadek = `<div style="padding:14px 16px;border-bottom:1px solid var(--line);background:color-mix(in srgb, var(--accent) 6%, transparent)">
          <b style="font-size:12.5px;display:block;margin-bottom:2px">Sdílená stavba</b>
          <span style="font-size:10.5px;color:var(--muted);line-height:1.5">Přístup k <b style="color:var(--text-main)">${escapeHtml(projName)}</b> ti dal vlastník. Premium a sdílení spravuje on, ne ty.</span>
        </div>`;
      } else if(jePremium){
        const planType = msGetPremiumPlanType();
        const planLabel = planType === 'lifetime' ? 'Natrvalo' : (planType === 'yearly' ? 'Ročně' : 'Měsíčně');
        akcniRadek = `<div id="rowGoShare" style="padding:14px 16px;border-bottom:1px solid var(--line);background:color-mix(in srgb, var(--money-pos) 6%, transparent);cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div><b style="font-size:12.5px;display:block">Sdílet stavbu</b><span style="font-size:10px;color:var(--muted)">Premium aktivní pro ${escapeHtml(projName)} · plán: ${planLabel}</span></div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--money-pos)" stroke-width="2.4" style="flex:0 0 auto"><path d="M9 6l6 6-6 6"/></svg>
        </div>`;
      } else {
        akcniRadek = `<div id="rowActivatePremium" style="padding:14px 16px;border-bottom:1px solid var(--line);background:color-mix(in srgb, var(--accent) 6%, transparent);cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div><b style="font-size:12.5px;display:block">Přejít na Premium</b><span style="font-size:10px;color:var(--muted)">Cloudová záloha a sdílení pro ${escapeHtml(projName)}, od 69 Kč/měsíc</span></div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.4" style="flex:0 0 auto"><path d="M9 6l6 6-6 6"/></svg>
        </div>`;
      }

      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid var(--line)">
          <div style="width:44px;height:44px;border-radius:50%;background:var(--accent);color:#04070f;display:grid;place-items:center;font-family:var(--font-head);font-size:18px;font-weight:700;flex:0 0 44px">${escapeHtml(iniciala)}</div>
          <div style="min-width:0;flex:1">
            <b style="font-family:var(--font-head);font-size:16px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(zobrazovaneJmeno)}</b>
            <span style="font-size:10.5px;color:var(--muted)">${escapeHtml(session.user.email || '—')}</span>
          </div>
          ${badge}
        </div>

        <!-- Jmeno (14.8.2026): drive rovnou viditelne pole - ted schovane
             za "Upravit", at hlavicka karty zustane klidna a nepusobi
             jako formular hned na prvni pohled. -->
        <div id="nameRow" style="padding:12px 16px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer">
          <div style="flex:1;min-width:0"><b style="font-size:12px;display:block">Jméno</b><span style="font-size:10px;color:var(--muted)">Takhle tě vidí ostatní ve sdílené stavbě</span></div>
          <span id="nameEditLink" style="font-size:11px;color:var(--accent);font-weight:700;flex:0 0 auto">Upravit</span>
        </div>
        <div id="nameEditWrap" style="display:none;padding:12px 16px;border-bottom:1px solid var(--line)">
          <div style="display:flex;gap:8px">
            <input class="f-input" id="displayNameInput" value="${escapeHtml(jmeno || '')}" placeholder="${escapeHtml(session.user.email || 'Tvoje jméno')}" style="flex:1"/>
            <button id="displayNameSaveBtn" style="flex:0 0 auto;border:1px solid var(--accent);background:transparent;color:var(--accent);padding:0 14px;cursor:pointer;font-weight:800;font-family:inherit;font-size:12px">Uložit</button>
          </div>
        </div>

        ${akcniRadek}

        <!-- Drobnosti (14.8.2026): schovane za jednu sipku, at nemaji
             stejnou vizualni vahu jako hlavni informace nahoře. -->
        <div id="moreRow" style="padding:12px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px">
          <span style="font-size:12px;color:var(--muted)">${jeGoogle ? 'Změnit účet Google' : 'Změnit e-mail'} · Odhlásit se</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2.4"><path d="M9 6l6 6-6 6"/></svg>
        </div>
        <div id="moreWrap" style="display:none">
          ${jeGoogle ? `
          <div class="row-item" style="padding:12px 16px;border-top:1px solid var(--line)">
            <b style="font-size:12.5px;display:block">Změnit účet Google</b>
            <span style="display:block;font-size:10px;color:var(--muted);line-height:1.5">Google účet se přímo v appce vyměnit nedá. Odhlas se a přihlas znovu jiným účtem - žádná data se přitom nesmažou, jen appka přestane vidět, co patří pod ten starý.</span>
          </div>` : `
          <div class="row-item" id="rowChangeEmail" style="padding:12px 16px;border-top:1px solid var(--line);cursor:pointer">
            <b style="font-size:12.5px">Změnit e-mail</b>
            <span style="display:block;font-size:10.5px;color:var(--muted)">Na novou adresu ti přijde potvrzovací odkaz</span>
          </div>`}
          <div class="row-item" id="rowSignOut" style="padding:12px 16px;border-top:1px solid var(--line);cursor:pointer"><b style="font-size:12.5px">Odhlásit se</b><span style="display:block;font-size:10.5px;color:var(--muted)">Data v telefonu zůstanou, přestane se jen dotahovat sdílené</span></div>
        </div>`;

      // Jmeno - prepinani mezi klidnym a editacnim stavem
      const nameRow = card.querySelector('#nameRow');
      const nameEditWrap = card.querySelector('#nameEditWrap');
      nameRow.addEventListener('click', ()=>{
        nameRow.style.display = 'none';
        nameEditWrap.style.display = 'block';
        card.querySelector('#displayNameInput').focus();
      });
      const nameInput = card.querySelector('#displayNameInput');
      card.querySelector('#displayNameSaveBtn').addEventListener('click', async ()=>{
        const noveJmeno = nameInput.value.trim();
        if(!noveJmeno){ alert('Zadej prosím nějaké jméno.'); return; }
        msSetCachedDisplayName(noveJmeno); // hned videt, i kdyby se cloud zpozdil
        if(typeof MSCloud !== 'undefined' && MSCloud.ensureProfile){
          const { error } = await MSCloud.ensureProfile(noveJmeno);
          if(error){ alert('Jméno se neuložilo na server, ale v appce zůstává - zkus to prosím znovu, až budeš mít internet.'); return; }
        }
        if(typeof Layout !== 'undefined' && Layout.showSuccess) Layout.showSuccess('Jméno uloženo');
        renderAccountCard();
      });

      // Drobnosti - rozbaleni
      const moreRow = card.querySelector('#moreRow');
      const moreWrap = card.querySelector('#moreWrap');
      moreRow.addEventListener('click', ()=>{
        moreRow.style.display = 'none';
        moreWrap.style.display = 'block';
      });

      const changeEmailRow = card.querySelector('#rowChangeEmail');
      if(changeEmailRow) changeEmailRow.addEventListener('click', async ()=>{
        const novy = prompt('Nová e-mailová adresa:');
        if(!novy) return;
        const c = MSAuth.get();
        if(!c){ alert('Změna e-mailu teď není dostupná.'); return; }
        try{
          const { error } = await c.auth.updateUser({ email: novy.trim() });
          if(error){ alert('Změna se nepodařila: ' + (error.message || 'neznámá chyba')); return; }
          alert('Potvrzovací odkaz jsme poslali na ' + novy.trim() + '. Dokud ho nepotvrdíš, přihlašuje tě appka pořád na starou adresu.');
        }catch(e){ alert('Změna e-mailu se nepodařila. Zkontroluj připojení k internetu.'); }
      });

      const signOutRow = card.querySelector('#rowSignOut');
      if(signOutRow) signOutRow.addEventListener('click', async ()=>{
        const ok = await Layout.confirmDialog(
          'Stavby v telefonu zůstanou přesně tak, jak jsou. Přestanou se ale dotahovat změny od lidí, se kterými sdílíš, a oni neuvidí novinky od tebe.\n\nPřihlas se znovu stejným e-mailem, jinak se sdílení nenapojí zpátky.',
          'Odhlásit se', 'Zrušit');
        if(!ok) return;
        try{ await MSAuth.signOut(); }catch(e){ console.error('odhlaseni selhalo', e); }
        renderAccountCard();
      });

      const goShareRow = card.querySelector('#rowGoShare');
      if(goShareRow) goShareRow.addEventListener('click', ()=> Router.go('sdilet-stavbu'));

      const activateRow = card.querySelector('#rowActivatePremium');
      if(activateRow) activateRow.addEventListener('click', ()=> PremiumLogin.open(()=>{ renderAccountCard(); renderProjects(); }));

      // Ticha obnova snimku a zpetne odeslani souboru - stejne chovani
      // jako drive melo jen renderPremiumCard() pro aktivni Premium.
      if(jePremium && !jeSdilena && typeof MSCloud !== 'undefined'){
        MSCloud.uploadSnapshot().catch(e=> console.error('tichy uploadSnapshot selhal', e));
        const wasActiveKey = 'ms_premium_was_active_v1__' + msGetActiveProjectId();
        if(localStorage.getItem(wasActiveKey) !== '1'){
          MSCloud.backfillAllFiles().then(({error})=>{
            if(!error) localStorage.setItem(wasActiveKey, '1');
            else console.error('backfillAllFiles selhalo, zkusi se priste znovu', error);
          }).catch(e=> console.error('backfillAllFiles selhalo', e));
        }
      }
    }
    renderAccountCard();
    container.querySelector('#rowSupport').addEventListener('click', ()=>{
      window.location.href = 'mailto:moje-stavba-app@seznam.cz?subject=' + encodeURIComponent('Moje Stavba - dotaz/podpora');
    });
    container.querySelector('#rowPrivacy').addEventListener('click', ()=> Router.go('privacy-policy'));
    container.querySelector('#rowTerms').addEventListener('click', ()=> Router.go('terms'));

    function renderProjects(){
      const wrap = container.querySelector('#projectsCard');
      const projects = msLoadProjects();
      const activeId = msGetActiveProjectId();
      wrap.innerHTML = projects.map(p=>`
        <div class="proj-row" data-id="${p.id}" style="display:flex;align-items:center;gap:10px;padding:11px 12px;border-bottom:1px solid var(--line);cursor:pointer">
          <div style="width:8px;height:8px;border-radius:50%;background:${p.currentStage?p.currentStage.color:'#94a0bc'}"></div>
          <div style="flex:1;min-width:0"><b style="display:block;font-size:13px">${msEsc(p.name)}</b><span style="font-size:10.5px;color:var(--muted)">${p.type?p.type+' · ':''}${msEsc(p.location || '')}</span></div>
          ${(p.isShared && p.accessRevoked) ? '<span style="font-size:8px;font-weight:800;color:#ff7a86;border:1px solid #ff7a86;padding:2px 5px;text-transform:uppercase">Přístup ukončen</span>' : p.isShared ? '<span style="font-size:8px;font-weight:800;color:#25b7ff;border:1px solid #25b7ff;padding:2px 5px;text-transform:uppercase">Sdíleno</span>' : (msIsPremiumMockForProject(p.id) ? '<span style="font-size:8px;font-weight:800;color:var(--money-pos);border:1px solid var(--money-pos);padding:2px 5px;text-transform:uppercase">Premium</span>' : '<span style="font-size:8px;font-weight:800;color:var(--muted);border:1px solid var(--line);padding:2px 5px;text-transform:uppercase">Free</span>')}
          ${p.id===activeId?'<span style="font-size:8.5px;font-weight:800;color:var(--accent);border:1px solid var(--accent);padding:2px 5px">Aktivní</span>':''}
          ${p.isShared ? `<span class="leave-btn" data-id="${p.id}" style="font-size:11px;color:#ff7a86;font-weight:700">Opustit</span>` : `<span class="edit-btn" data-id="${p.id}" style="font-size:11px;color:#25b7ff;font-weight:700">Upravit</span><span class="remove-btn" data-id="${p.id}" style="font-size:11px;color:#ff7a86;font-weight:700;margin-left:10px">Odebrat</span>`}
        </div>
      `).join('') + `<div id="addProjectRow" style="display:flex;align-items:center;gap:8px;padding:12px;color:#b34cff;font-size:12.5px;font-weight:800;cursor:pointer">+ Přidat projekt</div>`;

      wrap.querySelectorAll('.proj-row').forEach(row=>{
        row.addEventListener('click', (e)=>{
          if(e.target.closest('.edit-btn') || e.target.closest('.leave-btn') || e.target.closest('.remove-btn')) return;
          msSetActiveProjectId(row.dataset.id);
          renderProjects();
        });
      });
      // Zadne viditelne tlacitko "Aktualizovat" - sdilene projekty se
      // sami obcas potichu obnovi na pozadi (viz MSCloud.autoRefreshAllShared
      // v supabase-data.js, spousti se z main.js).
      wrap.querySelectorAll('.leave-btn').forEach(btn=>{
        btn.addEventListener('click', async (e)=>{
          e.stopPropagation();
          const p = projects.find(x=>x.id===btn.dataset.id);
          if(!await Layout.confirmDialog('Opravdu chceš opustit sdílenou stavbu "' + p.name + '"? Appka si o ní přestane pamatovat cokoli - budeš ji muset znovu přijmout pozvánkou, kdybys chtěl zpátky.', 'Opustit')) return;
          // OPRAVA (13.8.2026): drive se tu mazala jen mistni data - radek
          // clenstvi zustaval v cloudu navzdy aktivni, vlastnik cloveka
          // porad videl jako clena a pri dalsim prihlaseni se mu appka
          // klidne stavbu potichu stahla zpatky. Ted se nejdriv zrusi
          // clenstvi v cloudu (MSCloud.leaveProject) a az pak smazou
          // mistni data - proto "await" pred msDeleteProject.
          if(p.remoteProjectId && typeof MSCloud !== 'undefined' && MSCloud.leaveProject){
            await MSCloud.leaveProject(p.remoteProjectId);
          }
          await msDeleteProject(p.id);
          renderProjects();
        });
      });
      // OPRAVA (2.8.2026): odebrani VLASTNIHO projektu - dvoufazove
      // potvrzeni, protoze na rozdil od "Opustit" (sdileny projekt, data
      // zustavaji v cloudu u vlastnika) tady jde o TRVALE a NEVRATNE
      // smazani vsech dat projektu z tohohle zarizeni. Faze 1: vysvetleni
      // + potvrzovaci dialog. Faze 2: napsat presne slovo "odebrat", aby
      // se predeslo omylnemu kliknuti.
      wrap.querySelectorAll('.remove-btn').forEach(btn=>{
        btn.addEventListener('click', async (e)=>{
          e.stopPropagation();
          const p = projects.find(x=>x.id===btn.dataset.id);
          const ok1 = await Layout.confirmDialog(
            'Opravdu odebrat stavbu "' + p.name + '"? Appka trvale smaže tenhle projekt a všechna jeho data z tohoto zařízení - deník, fotky, výdaje, dokumenty i kalendář. Tenhle krok nejde vrátit zpět.',
            'Ano, chci odebrat', 'Zrušit'
          );
          if(!ok1) return;
          const typed = prompt('Pro potvrzení napiš slovo "odebrat":');
          if(typed === null) return;
          if(typed.trim().toLowerCase() !== 'odebrat'){
            alert('Slovo nesouhlasí, projekt nebyl odebrán.');
            return;
          }
          await msDeleteProject(p.id);
          renderProjects();
        });
      });
      wrap.querySelectorAll('.edit-btn').forEach(btn=>{
        btn.addEventListener('click', (e)=>{
          e.stopPropagation();
          const p = projects.find(x=>x.id===btn.dataset.id);
          const name = prompt('Název projektu:', p.name);
          if(name===null) return;
          const loc = prompt('Místo stavby:', p.location||'');
          if(loc===null) return;
          // (13.8.2026) Tady drive bylo jeste jedno rucni MSCloud.uploadSnapshot()
          // navrch - msUpdateProject() uz ale sam vola msTriggerCloudSnapshotSync(),
          // ktery hlida presne tuhle situaci (vlastni, ne sdileny, Premium
          // projekt) a odesle to same. Vysledkem byly dva uploady za sebou
          // pri kazdem prejmenovani - zbytecne, ne rozbite, ale zbytecne.
          msUpdateProject(p.id, {name:name.trim()||p.name, location:loc.trim()});
          renderProjects();
        });
      });
      wrap.querySelector('#addProjectRow').addEventListener('click', ()=> Router.go('onboarding-project'));
    }
    renderProjects();

    // notifikace
    const notifSwitch = container.querySelector('#notifSwitch');
    container.querySelector('#rowAppLock').addEventListener('click', ()=> Router.go('app-lock-setup'));
    const notifStatus = container.querySelector('#notifStatus');
    const NOTIF_KEY = 'ms_notifications_enabled_v1';
    function refreshNotif(){
      const enabled = localStorage.getItem(NOTIF_KEY)==='1' && (typeof Notification!=='undefined' && Notification.permission==='granted');
      notifSwitch.style.borderColor = enabled ? 'var(--accent)' : 'var(--line)';
      notifSwitch.querySelector('i').style.left = enabled ? '18px' : '2px';
      notifSwitch.querySelector('i').style.background = enabled ? 'var(--accent)' : 'var(--muted)';
      if(typeof Notification==='undefined') notifStatus.textContent = 'Tento prohlížeč oznámení nepodporuje';
      else if(Notification.permission==='denied') notifStatus.textContent = 'Zablokováno v nastavení prohlížeče';
      else if(enabled) notifStatus.textContent = 'Zapnuto';
      else notifStatus.textContent = 'Posílat události přímo jako notifikaci';
    }
    notifSwitch.addEventListener('click', async ()=>{
      if(typeof Notification==='undefined'){ alert('Prohlížeč oznámení nepodporuje.'); return; }
      if(localStorage.getItem(NOTIF_KEY)==='1'){ localStorage.setItem(NOTIF_KEY,'0'); refreshNotif(); return; }
      const perm = await Notification.requestPermission();
      if(perm==='granted'){ localStorage.setItem(NOTIF_KEY,'1'); new Notification('Moje Stavba', {body:'Oznámení jsou zapnutá.'}); }
      refreshNotif();
    });
    refreshNotif();

    // zaloha
    // uloziste - realny odhad primo z prohlizece (pokryva IndexedDB, kde
    // ted zijou fotky/dokumenty - ma mnohem vetsi strop nez drivejsi
    // localStorage, typicky stovky MB az GB podle mista v telefonu)
    async function refreshStorageBar(){
      container.querySelector('#storageText').textContent = 'Počítám…';
      let est = null;
      if(navigator.storage && navigator.storage.estimate){
        try{ est = await navigator.storage.estimate(); }catch(e){}
      }
      if(est && est.quota){
        const usedMb = (est.usage/1024/1024).toFixed(1);
        const quotaMb = (est.quota/1024/1024/1024).toFixed(1);
        const pct = Math.min(100, Math.round(est.usage/est.quota*100));
        container.querySelector('#storageBarFill').style.width = pct+'%';
        container.querySelector('#storageBarFill').style.background = pct>85 ? '#ff6a6a' : 'var(--accent)';
        container.querySelector('#storageText').textContent = `Využito ${usedMb} MB z ~${quotaMb} GB dostupných na telefonu`;
      } else {
        const used = msStorageUsageBytes();
        container.querySelector('#storageBarFill').style.width = '0%';
        container.querySelector('#storageText').textContent = `Drobná data appky: ${(used/1024).toFixed(0)} kB (fotky/dokumenty se počítají zvlášť, telefon jejich přesnou velikost nesděluje)`;
      }
    }
    refreshStorageBar();
    container.querySelector('#rowCompress').addEventListener('click', async ()=>{
      const row = container.querySelector('#rowCompress');
      // ZMENA (8.8.2026): tohle je NEVRATNE - original fotky nikde jinde
      // neni. Driv se to provedlo bez jakehokoli dotazu a popisek jeste
      // tvrdil "bez ztraty obsahu".
      const photoCount = msPhotos().length;
      const ok = await Layout.confirmDialog(
        'Všech ' + photoCount + ' fotek se trvale zmenší na ' + MS_SHRINK_PHOTO_DIM + ' px. ' +
        'Původní velikost už nebude možné vrátit - detaily na štítcích a výkresech se mohou stát nečitelnými. ' +
        'Pokud chceš mít originály uložené, udělej si nejdřív plnou zálohu.',
        'Zmenšit', 'Zruším to');
      if(!ok) return;
      const originalHtml = row.innerHTML;
      row.innerHTML = '<b style="font-size:12.5px">Zmenšuji…</b>';
      const saved = await msCompressExistingMedia((cat, i, n)=>{
        row.innerHTML = `<b style="font-size:12.5px">Zmenšuji ${cat} (${i}/${n})…</b>`;
      });
      row.innerHTML = originalHtml;
      refreshStorageBar();
      alert(saved>0
        ? `Hotovo, uvolnilo se přibližně ${msFormatMb(saved)}.`
        : 'Všechno už bylo v optimální velikosti, nebylo co zmenšit.');
    });

    /* ==========================================================
       EXPORT ZALOHY  (prepsano 7.8.2026)
       ----------------------------------------------------------
       PROC: puvodni export cetl jen localStorage. Jenze fotky,
       dokumenty, uctenky a prilohy projektu od migrace zijou
       v IndexedDB - v zaloze tedy fyzicky nebyly. Vypadala
       kompletne (zaznamy fotek v ni jsou), ale obrazky chybely
       a poznalo se to az ve chvili, kdy je clovek potreboval.

       Novy format ma dve casti:
         { "__msBackup": 2, "data": {...localStorage...},
           "blobs": {...IndexedDB...} }
       Stare zalohy (holy objekt s ms_* klici) se poznaji podle
       chybejiciho __msBackup a nacitaji se dal - viz import.

       Soubor se sklada po kouskach do pole a teprve pak z nej
       vznikne Blob. Jedno velke JSON.stringify pres stovky MB
       fotek by na telefonu spadlo na pameti.
       ========================================================== */
    /* ==========================================================
       KONTROLA FOTEK (8.8.2026)
       Fotka se uklada na dve mista: zaznam (etapa, datum, popis) do
       localStorage a samotny obrazek do IndexedDB. Kdyz selze zapis
       do IndexedDB - coz se na iOS pri vytizeni pameti stava -
       zaznam existuje, ale obrazek k nemu chybi a fotka se tvari,
       ze "nikam nedosla". Tohle to rozliší a rovnou pojmenuje.
       ========================================================== */
    container.querySelectorAll('.photo-q-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        msSetPhotoQuality(btn.dataset.q);
        container.querySelectorAll('.photo-q-btn').forEach(b=>{
          const on = b.dataset.q === btn.dataset.q;
          b.style.borderColor = on ? 'var(--accent)' : 'var(--line)';
          b.style.color = on ? 'var(--accent)' : 'var(--muted)';
        });
      });
    });

    /* ==========================================================
       DOSYNCHRONIZOVANI SOUBORU (9.8.2026)
       Zaznam o fotce a samotny obrazek jdou do cloudu zvlast. Kdyz
       se odesle zaznam a soubor ne (vypadek site, plna pamet, fotka
       pridana jeste pred zapnutim Premia), pozvany uvidi barevny
       ctverec bez obrazku. Backfill uz v appce byl, ale spoustel se
       jen sam pri aktivaci Premia - tady je rucne, at se z toho da
       vylezt bez cekani.
       ========================================================== */
    /* ==========================================================
       PROC SE FOTKY NESTAHLY (9.8.2026)
       Zaznamy o fotkach chodi pres databazove tabulky, samotne
       obrazky pres Storage - jsou to dva ruzne systemy s vlastnimi
       pravidly pristupu. Kdyz sedi jedno a druhe ne, vysledek je
       presne tenhle: zaznamy dorazi, obrazky ne, a v galerii
       zustanou barevne ctverce. Tohle zkusi jednu skutecnou fotku
       stahnout a ukaze presnou odpoved serveru.
       ========================================================== */
    /* (10.8.2026) Odsud zmizely dva ladici radky - "Dosynchronizovat
       soubory" a "Proc se fotky nestahly". Byly to nastroje na hledani
       chyby, ktera je uz opravena (soubory se u pozvanych hledaly pod
       spatnym id, viz syncSharedFiles v supabase-data.js). Same funkce
       MSCloud.backfillAllFiles() a MSCloud.downloadFile() v kodu
       zustavaji - kdyby bylo potreba, staci sem vratit dva radky. */

    /* PREPSANO (13.8.2026), aby to bylo srozumitelne pro beznyho
       uzivatele - puvodni vysledek zacinal technickym rozpisem "kolik
       fotek v ktere etape", coz nikoho nezajima jako prvni. Ted se
       vede rovnou odpovedi na otazku "je neco spatne, a co s tim mam
       delat", technicke slovo "obrazek se nezapsal do uloziste" je
       nahrazene tim, jak to clovek doopravdy vidi (prazdny ctverecek
       v Galerii), a pribyla konkretni rada, co delat dal. */
    container.querySelector('#rowPhotoCheck').addEventListener('click', async ()=>{
      const out = container.querySelector('#photoCheckText');
      out.textContent = 'Kontroluji…';
      try{
        const photos = msPhotos();
        const keys = new Set(await msIdbAllKeys());
        const chybejiciPodleEtapy = {};
        let missing = 0;
        photos.forEach(p=>{
          const hasBlob = keys.has(msBlobKey('photo', p.id)) || MS_BLOB_CACHE.has(msBlobKey('photo', p.id));
          if(hasBlob) return;
          missing++;
          const st = msStageByKey(p.stage);
          const name = st ? st.name : (p.stage ? 'neznámá etapa' : 'bez etapy');
          chybejiciPodleEtapy[name] = (chybejiciPodleEtapy[name] || 0) + 1;
        });

        let msg;
        if(!photos.length){
          msg = 'V appce zatím nemáš žádné fotky.';
        } else if(!missing){
          msg = 'Zkontrolováno ' + photos.length + ' ' + (photos.length===1?'fotka':(photos.length<5?'fotky':'fotek')) + ' — všechny mají obrázek v pořádku.';
        } else {
          const rozpis = Object.keys(chybejiciPodleEtapy).sort()
            .map(k=> '  · ' + k + ': ' + chybejiciPodleEtapy[k])
            .join('\n');
          msg = 'U ' + missing + ' ' + (missing===1?'fotky':(missing<5?'fotek':'fotek')) + ' chybí obrázek — v Galerii po nich zůstal jen prázdný barevný čtvereček:\n\n'
            + rozpis
            + '\n\nStalo se to při ukládání a appka to sama neopraví. Pokud máš originály ještě ve fotoaparátu, nejjednodušší je takovou fotku v Galerii smazat a přidat znovu.';
        }
        out.textContent = photos.length + ' fotek' + (missing ? ', ' + missing + ' bez obrázku' : ', vše v pořádku');
        alert(msg);
      }catch(err){
        console.error('kontrola fotek selhala', err);
        out.textContent = 'Kontrolu se nepodařilo dokončit.';
      }
    });

    container.querySelectorAll('.ui-scale-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        msSetUiScale(btn.dataset.scale);
        container.querySelectorAll('.ui-scale-btn').forEach(b=>{
          const on = b.dataset.scale === btn.dataset.scale;
          b.style.borderColor = on ? 'var(--accent)' : 'var(--line)';
          b.style.color = on ? 'var(--accent)' : 'var(--muted)';
        });
      });
    });

    container.querySelector('#rowExport').addEventListener('click', async ()=>{
      const row = container.querySelector('#rowExport');
      const originalHtml = row.innerHTML;

      const withMedia = await Layout.confirmDialog(
        'Chceš do zálohy zabalit i fotky a dokumenty? Záloha pak bude úplná, ale podstatně větší a bude chvíli trvat. Bez nich vznikne malý soubor, ve kterém budou jen zápisy, výdaje, úkoly a nastavení.',
        'Ano, včetně fotek', 'Jen data'
      );

      row.innerHTML = '<b style="font-size:12.5px">Připravuji zálohu…</b>';
      try{
        const parts = ['{"__msBackup":2,"exported":' + JSON.stringify(new Date().toISOString()) + ',"data":{'];

        const lsPairs = [];
        for(let i=0;i<localStorage.length;i++){
          const k = localStorage.key(i);
          if(k && k.startsWith('ms_')) lsPairs.push(JSON.stringify(k)+':'+JSON.stringify(localStorage.getItem(k)));
        }
        parts.push(lsPairs.join(','));
        parts.push('},"blobs":{');

        if(withMedia){
          const keys = await msIdbAllKeys();
          let written = 0;
          for(let i=0;i<keys.length;i++){
            if(i % 10 === 0) row.innerHTML = `<b style="font-size:12.5px">Balím fotky a dokumenty (${i}/${keys.length})…</b>`;
            let val = MS_BLOB_CACHE.get(keys[i]);
            if(val === undefined){
              try{ val = await msIdbGet(keys[i]); }catch(e){ val = null; }
            }
            if(val == null) continue;
            parts.push((written ? ',' : '') + JSON.stringify(keys[i]) + ':' + JSON.stringify(val));
            written++;
          }
        }
        parts.push('}}');

        const blob = new Blob(parts, {type:'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'moje-stavba-zaloha-' + msTodayIso() + (withMedia?'-plna':'-data') + '.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        row.innerHTML = originalHtml;
        alert('Záloha je stažená (' + (blob.size/1024/1024).toFixed(1) + ' MB).' +
              (withMedia ? '' : '\n\nPozor: fotky ani dokumenty v ní nejsou.'));
      }catch(err){
        console.error('export selhal', err);
        row.innerHTML = originalHtml;
        alert('Zálohu se nepodařilo vytvořit. Pokud máš hodně fotek, zkus to znovu bez nich.');
      }
    });
    container.querySelector('#rowImport').addEventListener('click', ()=> container.querySelector('#importFile').click());
    container.querySelector('#importFile').addEventListener('change', (e)=>{
      const file = e.target.files[0]; if(!file) return;
      e.target.value = ''; // at jde stejny soubor vybrat znovu
      const reader = new FileReader();
      reader.onload = async ()=>{
        let parsed;
        try{ parsed = JSON.parse(reader.result); }
        catch(err){ alert('Tenhle soubor se nepodařilo přečíst jako zálohu.'); return; }

        /* DOPLNENO (11.8.2026): obnova se spoustela BEZ JAKEHOKOLIV
           POTVRZENI - stacilo vybrat soubor a data se prepsala. Pritom je
           to nevratny zasah do vseho, co je v telefonu. Ted se appka
           zepta a rovnou rekne, co v zaloze je. */
        const pocetProjektu = (()=>{
          try{ return JSON.parse((parsed.__msBackup >= 2 ? (parsed.data||{}) : parsed)['ms_projects_v1'] || '[]').length; }
          catch(e){ return 0; }
        })();
        const pocetBlobu = (parsed.__msBackup >= 2 && parsed.blobs) ? Object.keys(parsed.blobs).length : 0;
        const okObnovit = await Layout.confirmDialog(
          'Obnovit ze zálohy?\n\n'
          + 'V souboru je ' + (pocetProjektu ? pocetProjektu + (pocetProjektu === 1 ? ' stavba' : (pocetProjektu < 5 ? ' stavby' : ' staveb')) : 'neznámý počet staveb')
          + (pocetBlobu ? ' a ' + pocetBlobu + ' fotek/dokumentů' : ' (bez fotek a dokumentů)') + '.\n\n'
          + 'Data v telefonu se přepíšou tím, co je v záloze. Stavby, které v záloze nejsou, ze seznamu nezmizí — zůstanou vedle.',
          'Obnovit', 'Zrušit');
        if(!okObnovit) return;

        // Zaloha verze 2 ma data a media oddelene. Starsi zalohy jsou
        // holy objekt s ms_* klici - ty nacitame presne jako dosud, aby
        // zustaly pouzitelne.
        const isV2 = parsed && parsed.__msBackup >= 2;
        const data = isV2 ? (parsed.data || {}) : parsed;
        const blobs = isV2 ? (parsed.blobs || {}) : {};
        const blobKeys = Object.keys(blobs);
        const row = container.querySelector('#rowImport');
        const rowHtml = row ? row.innerHTML : '';
        if(row) row.innerHTML = '<b style="font-size:12.5px">Obnovuji…</b>';

        // Typy dat, ktere appka drzi jako pole zaznamu s "id". Ze starsich
        // zaloh (pred rozdelenim dat na projekty) muze byt v souboru jak
        // spravny "projektovy" klic (s __<projectId> na konci), tak stary
        // OSIRELY klic bez teto pripony - ten pri obnove SLOUCIME do
        // aktualniho, misto abychom ho prepsali nebo zahodili, at se nic
        // neztrati. Porovnava se PODLE OBSAHU (ne jen podle "id") - stara
        // osirela data casto obsahuji tytez zaznamy znovu ulozene pod jinym
        // nahodnym id, takze porovnani jen podle id by je zdvojilo. U
        // fotek/dokumentu navic presuneme obrazek/prilohu do IndexedDB
        // (rovnou v localStorage by se to uz nemuselo vejit).
        const LIST_TYPES = { 'ms_photos_v1':'thumb', 'ms_documents_v1':'content', 'ms_expenses_v1':null, 'ms_diary_v1':null, 'ms_events_v1':null, 'ms_tasks_v1':null };
        const CONTENT_KEY = {
          'ms_photos_v1': x => [x.stage||'', x.date||'', (x.caption||'')].join('|'),
          'ms_documents_v1': x => [x.stage||'', (x.name||'')].join('|'),
          'ms_expenses_v1': x => [(x.title||x.name||'').trim().toLowerCase(), Number(x.amount||0), x.date||'', x.type||''].join('|'),
          'ms_diary_v1': x => [(x.title||'').trim().toLowerCase(), (x.text||x.content||'').trim().toLowerCase(), x.date||''].join('|'),
          'ms_events_v1': x => [(x.title||'').trim().toLowerCase(), x.date||'', x.time||''].join('|'),
          'ms_tasks_v1': x => [(x.title||'').trim().toLowerCase(), x.date||'', x.dateMode||''].join('|'),
        };
        const failedKeys = [];

        // 1) nejdriv vsechny "obycejne" klice (vcetne ms_active_project_v1
        // a ms_projects_v1) - na tech dalsi krok stavi
        Object.keys(data).forEach(k=>{
          if(!k.startsWith('ms_')) return;
          if(Object.keys(LIST_TYPES).some(base => k===base || k.startsWith(base+'__'))) return; // reseno v kroku 2
          if(k === 'ms_projects_v1') return; // reseno zvlast hned nize
          try{ localStorage.setItem(k, data[k]); }catch(err){ failedKeys.push(k); }
        });

        /* OPRAVA (11.8.2026): seznam staveb se ze zalohy PREPISOVAL cely.
           Kdo si po porizeni zalohy zalozil dalsi stavbu, tomu ze seznamu
           zmizela - data ji v telefonu zustala, ale uz se k nim nedalo
           dostat, protoze v seznamu nebyla. Ted se seznamy slouci: co je
           v zaloze, se pripoji k tomu, co uz v telefonu je. */
        try{
          let zalohaProjekty = [];
          try{ zalohaProjekty = JSON.parse(data['ms_projects_v1'] || '[]'); }catch(e){}
          let stavajici = [];
          try{ stavajici = JSON.parse(localStorage.getItem('ms_projects_v1') || '[]'); }catch(e){}
          const podleId = {};
          stavajici.forEach(p=>{ if(p && p.id) podleId[p.id] = p; });
          zalohaProjekty.forEach(p=>{ if(p && p.id) podleId[p.id] = p; }); // zaloha ma prednost u shodneho id
          const slouceno = Object.keys(podleId).map(k=> podleId[k]);
          if(slouceno.length) localStorage.setItem('ms_projects_v1', JSON.stringify(slouceno));
          // Aktivni projekt musi v seznamu existovat, jinak by appka
          // nastartovala "do prazdna".
          const aktivni = localStorage.getItem('ms_active_project_v1');
          if(slouceno.length && (!aktivni || !slouceno.some(p=> p.id === aktivni))){
            localStorage.setItem('ms_active_project_v1', slouceno[0].id);
          }
        }catch(err){ failedKeys.push('ms_projects_v1'); }

        // 2) seznamova data - slouceni osireleho a aktualniho podle OBSAHU
        const activeId = localStorage.getItem('ms_active_project_v1');
        const scopedSuffix = activeId ? '__'+activeId : '';
        for(const [base, blobField] of Object.entries(LIST_TYPES)){
          const scopedKey = base + scopedSuffix;
          let scopedList = [], orphanList = [];
          try{ scopedList = data[scopedKey] ? JSON.parse(data[scopedKey]) : []; }catch(e){}
          try{ orphanList = data[base] ? JSON.parse(data[base]) : []; }catch(e){}
          if(scopedList.length===0 && orphanList.length===0) continue;
          const keyFn = CONTENT_KEY[base];
          const seenKeys = new Set(scopedList.map(keyFn));
          const merged = scopedList.concat(orphanList.filter(x=>!seenKeys.has(keyFn(x))));
          for(const item of merged){
            if(blobField && item[blobField]){
              const blobKey = msBlobKey(base==='ms_photos_v1' ? 'photo' : 'doc', item.id);
              try{
                await msIdbSet(blobKey, item[blobField]);
                MS_BLOB_CACHE.set(blobKey, item[blobField]);
                delete item[blobField]; // ulozeno rychle (IndexedDB) - v localStorage uz obrazek nemusi byt
              }catch(err){
                // ulozeni do IndexedDB se nepovedlo - radeji obrazek NEZAHODIT
                // a nechat ho rovnou v zaznamu (stary/pomalejsi zpusob), nez
                // aby fotka zmizela docela
              }
            }
          }
          try{ localStorage.setItem(scopedKey, JSON.stringify(merged)); }catch(err){ failedKeys.push(scopedKey); }
        }

        // 3) fotky, dokumenty, uctenky a prilohy zpatky do IndexedDB.
        // Klice uz nesou id projektu z te zalohy, takze sedi i po
        // prenosu na jiny telefon.
        let blobsOk = 0, blobsFailed = 0;
        for(let i=0;i<blobKeys.length;i++){
          if(row && i % 10 === 0) row.innerHTML = `<b style="font-size:12.5px">Obnovuji fotky a dokumenty (${i}/${blobKeys.length})…</b>`;
          const k = blobKeys[i];
          try{
            await msIdbSet(k, blobs[k]);
            MS_BLOB_CACHE.set(k, blobs[k]);
            blobsOk++;
          }catch(err){ blobsFailed++; }
        }
        if(row) row.innerHTML = rowHtml;

        let msg = 'Záloha byla obnovena.';
        if(blobKeys.length) msg += `\n\nFotky a dokumenty: ${blobsOk} obnoveno` + (blobsFailed?`, ${blobsFailed} se nevešlo (došlo místo v telefonu)`:'') + '.';
        else if(isV2) msg += '\n\nTahle záloha byla bez fotek a dokumentů, obnovila se jen data.';
        if(failedKeys.length) msg += '\n\nTohle se nepovedlo uložit: ' + failedKeys.join(', ');
        alert(msg);
        Router.go('dashboard');
      };
      reader.readAsText(file);
    });

    // OPRAVA (2.8.2026): dvoufazove potvrzeni stejne jako u odebrani
    // projektu - tohle smaze UPLNE VSECHNO, vsechny projekty najednou,
    // bez moznosti navratu. Faze 1: vysvetleni + potvrzovaci dialog.
    // Faze 2: napsat presne slovo "smazat".
    container.querySelector('#rowDeleteAll').addEventListener('click', async ()=>{
      const ok1 = await Layout.confirmDialog(
        'Opravdu smazat úplně všechna data appky? Tohle nevratně smaže VŠECHNY stavby na tomhle zařízení - deníky, fotky, výdaje, dokumenty i nastavení. Appka nemá žádnou zálohu, tenhle krok nejde vrátit zpět.',
        'Ano, chci smazat', 'Zrušit'
      );
      if(!ok1) return;
      const typed = prompt('Pro potvrzení napiš slovo "smazat":');
      if(typed === null) return;
      if(typed.trim().toLowerCase() !== 'smazat'){
        alert('Slovo nesouhlasí, appka nic nesmazala.');
        return;
      }
      const keys = [];
      for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.startsWith('ms_')) keys.push(k); }
      keys.forEach(k=>localStorage.removeItem(k));
      Router.go('onboarding-project');
    });

    return { activeTab:'', showNav:true };
  }
  return { render };
})();
Router.register('settings', SettingsScreen);
