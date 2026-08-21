/* ==========================================================
   PREMIUM - PRIHLASOVACI FLOW (obrazovky 1 / 1b / 1c)
   Viz Premium-sdileni-specifikace.md, bod 2 (Onboarding/prihlaseni).

   DULEZITE: tohle je zatim jen UI MOCK, bez skutecneho pripojeni
   na Google nebo Supabase. Zadna data se nikam neposilaji, zadny
   ucet se doopravdy nezaklada. Az bude appka mit realny backend
   (Supabase Auth + tabulka pro pending login pozadavky, viz bod
   2.5 specifikace), tenhle soubor se prepoji na skutecna volani -
   vizualni prubeh a chovani uz ale odpovida odsouhlasenym navrhum.

   Spousti se z Nastaveni -> Premium -> "Aktivovat Premium"
   (viz screen-settings.js).

   Vzor overlaye je stejny jako zbytek appky (trida .ms-overlay,
   appka ho sama uklidi pri kazde navigaci - viz router.js).
   ========================================================== */
const PremiumLogin = (function(){

  let overlayEl = null;
  let resendTimer = null;
  let expiryTimer = null;
  let authListenerUnsub = null;
  let onSuccessCb = null;
  let chosenPeriod = 'monthly';
  let flowMode = 'purchase'; // 'purchase' (Premium) | 'identity' (prijeti pozvanky, viz specifikace 12.4)
  let identityExtra = null; // Krok 10c: token pozvanky, kdyz flowMode === 'identity'

  const PLAN_PRICES = { monthly:'69 Kč / měsíc', yearly:'599 Kč / rok', lifetime:'1499 Kč jednou' };

  function projectName(){
    try{
      const projects = msLoadProjects();
      const id = msGetActiveProjectId();
      const p = projects.find(x=> x.id === id);
      return (p && p.name) ? p.name : 'tuhle stavbu';
    }catch(e){ return 'tuhle stavbu'; }
  }
  function esc(s){ return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // Oprava chyby "Premium tlacitka prestanou fungovat": router pri kazde
  // navigaci sam smaze .ms-overlay z DOM (viz router.js), ale nezavola
  // pritom nas close() - modul si tak dal myslel "mam otevreno", i kdyz
  // uz ve skutecnosti nic na obrazovce neni, a dalsi klik na "Aktivovat
  // Premium" pak potichu nedelal nic. Reseni: pred kazdym pouzitim
  // overlayEl overit, ze je porad skutecne pripojeny v DOM.
  function isOverlayLive(){
    return !!(overlayEl && document.body.contains(overlayEl));
  }

  function open(onSuccess){
    if(isOverlayLive()) return; // uz opravdu otevreno, neotvirat podruhe
    flowMode = 'purchase';
    onSuccessCb = (typeof onSuccess === 'function') ? onSuccess : null;
    overlayEl = document.createElement('div');
    overlayEl.className = 'ms-overlay';
    overlayEl.style.cssText = 'position:fixed;inset:0;background:rgba(29,30,28,.55);z-index:95;display:flex;align-items:flex-end;justify-content:center';
    document.body.appendChild(overlayEl);

    // Oprava: appka doted VZDY ukazovala "Prihlas se pres Google/e-mail",
    // i kdyz uz clovek byl prihlaseny z drivejska (Supabase session zustava
    // ulozena mezi otevrenimi appky). Ted se nejdriv potichu zepta, jestli
    // uz session existuje, a pokud ano, preskoci rovnou na vyber obdobi.
    sheet(`
      <div style="padding:30px 0">
        <div style="width:36px;height:36px;border:1.5px solid var(--line);display:grid;place-items:center;color:var(--muted);margin:0 auto">
          <svg class="pl-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/></svg>
        </div>
      </div>
    `);
    injectSpin();
    if(typeof MSAuth === 'undefined'){ renderStep1(); return; }
    MSAuth.getSession().then(session=>{
      if(!isOverlayLive()) return; // appka mezitim zavrena/prenavigovana
      if(session){ renderSuccess({ mergedWithGoogle:false }); }
      else { renderStep1(); }
    }).catch(()=>{ if(isOverlayLive()) renderStep1(); });
  }

  // Pro prijmuti pozvanky (bod 3.3/12.4) - stejne obrazovky 1/1b/1c, ale
  // po uspesnem prihlaseni se NEJDE do nakupu, jen se zavola onSuccess.
  // OPRAVA (14.8.2026): "extra" nesl jen token pozvanky (bud retezec,
  // nebo nic) - po navratu z presmerovani (Google) appka pak nemela
  // jak poznat, jestli jde o TICHOU kontrolu na pozadi, nebo o clovekem
  // VYSLOVNE vyzadane prihlaseni (klik na "Přihlásit se" v onboardingu).
  // U tiche appka spravne mlci, kdyz nic nenajde - ale u vyslovneho
  // kliku by to vypadalo, jako by appka po prihlaseni jen mlcky "hodila
  // cloveka zpatky" na uvodni obrazovku, beze slova vysvetleni.
  // "extra" je ted objekt { token, verbose } - retezec zustava
  // podporovany kvuli existujicimu volani z prijeti pozvanky.
  function openIdentityOnly(onSuccess, extra){
    if(isOverlayLive()) return;
    flowMode = 'identity';
    identityExtra = (typeof extra === 'string') ? { token: extra, verbose: false } : (extra || { token: null, verbose: false });
    onSuccessCb = (typeof onSuccess === 'function') ? onSuccess : null;
    overlayEl = document.createElement('div');
    overlayEl.className = 'ms-overlay';
    overlayEl.style.cssText = 'position:fixed;inset:0;background:rgba(29,30,28,.55);z-index:95;display:flex;align-items:flex-end;justify-content:center';
    document.body.appendChild(overlayEl);
    renderStep1();
  }

  function close(){
    clearResendTimer();
    clearExpiryTimer();
    stopAuthListening();
    if(overlayEl && overlayEl.parentNode){ overlayEl.parentNode.removeChild(overlayEl); }
    overlayEl = null;
    onSuccessCb = null;
    flowMode = 'purchase';
    identityExtra = null;
  }

  function stopAuthListening(){ if(authListenerUnsub){ authListenerUnsub(); authListenerUnsub = null; } }

  function sheet(inner){
    overlayEl.innerHTML = `<div style="width:100%;max-width:480px;background:var(--card-bg-2);border-top:1.5px solid var(--line);padding:18px 20px calc(22px + min(env(safe-area-inset-bottom),34px));text-align:center">${inner}</div>`;
  }

  /* ---------------------------------------------------------
     KROK 1: vyber metody prihlaseni
     --------------------------------------------------------- */
  function renderStep1(){
    clearResendTimer(); clearExpiryTimer();
    sheet(`
      <div style="display:flex;margin-bottom:6px">
        <button id="plClose" title="Zavřít" style="width:26px;height:26px;border:1.5px solid var(--line);display:grid;place-items:center;color:var(--muted);margin-left:auto;background:transparent;cursor:pointer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div style="width:44px;height:44px;border:1.5px solid var(--accent);display:grid;place-items:center;color:var(--accent);margin-bottom:14px">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <h2 style="font-family:var(--font-head);font-size:19px;line-height:1.25;margin:0 0 10px;text-align:left;color:var(--text-main)">${flowMode==='identity' ? 'Než tě appka pustí do projektu, přihlas se' : 'Než aktivujeme Premium, přihlas se'}</h2>
      <p style="font-size:13px;line-height:1.55;color:var(--text-main);margin:0 0 4px;text-align:left">${flowMode==='identity' ? 'Abychom věděli, kdo jsi, a dali ti přesně ten přístup, který ti byl nastavený.' : 'Abychom projekt mohli zálohovat do cloudu a ty jsi ho mohl kdykoli nasdílet dalším lidem, potřebujeme vědět, kdo jsi.'}</p>
      <p style="font-size:11.5px;color:var(--muted);margin:0 0 20px;line-height:1.5;text-align:left"><b style="color:var(--text-main)">Data, co už máš v appce uložená, se tím nijak nezmění</b> — zůstávají v telefonu přesně tak, jak jsou.</p>
      <button id="plGoogle" style="width:100%;display:flex;align-items:center;gap:12px;border:1.5px solid var(--line);background:var(--card-bg);padding:12px 14px;font-size:13.5px;font-weight:700;color:var(--text-main);cursor:pointer;margin-bottom:10px;font-family:inherit">
        <span style="width:20px;height:20px;display:grid;place-items:center;flex:0 0 auto">
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h11.8c-.5 2.7-2.1 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.6z"/><path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.7C7.9 41.1 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.6 27.9c-.4-1.3-.7-2.6-.7-4s.2-2.7.7-4v-5.7H4.3C2.8 17.1 2 20.4 2 24s.8 6.9 2.3 9.8z"/><path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.4 2 7.9 6.9 4.3 14.2l7.3 5.7c1.7-5.2 6.6-9.1 12.4-9.1z"/></svg>
        </span>
        Pokračovat přes Google
        <span style="margin-left:auto;color:var(--muted)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>
        </span>
      </button>
      <button id="plEmail" style="width:100%;display:flex;align-items:center;gap:12px;border:1.5px solid var(--line);background:var(--card-bg);padding:12px 14px;font-size:13.5px;font-weight:700;color:var(--text-main);cursor:pointer;margin-bottom:10px;font-family:inherit">
        <span style="width:20px;height:20px;display:grid;place-items:center;flex:0 0 auto;color:var(--accent)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16"/><path d="M2 6l10 7 10-7"/></svg>
        </span>
        Pokračovat přes e-mail
        <span style="margin-left:auto;color:var(--muted)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>
        </span>
      </button>
      <button id="plCancel" style="width:100%;text-align:center;background:none;border:none;color:var(--muted);font-size:12px;text-decoration:underline;text-underline-offset:3px;padding:10px 0 0;cursor:pointer;font-family:inherit">Zatím nechci, vrátit se zpět</button>
    `);
    overlayEl.querySelector('#plClose').addEventListener('click', close);
    overlayEl.querySelector('#plCancel').addEventListener('click', close);
    overlayEl.querySelector('#plGoogle').addEventListener('click', googleLogin);
    overlayEl.querySelector('#plEmail').addEventListener('click', renderStep1b);
  }

  /* ---------------------------------------------------------
     Google prihlaseni (Krok 9 - skutecne, viz bod 2.2)
     Presmeruje appku pryc na Google a appka se pri navratu cela
     znovu nacte - proto se pred odchodem ulozi "rezim" (nakup/
     prijeti pozvanky), viz MSAuth.setPendingFlow a checkAuthResume
     nize v tomhle souboru.
     --------------------------------------------------------- */
  function googleLogin(){
    sheet(`
      <div style="padding:30px 0 10px">
        <div style="width:44px;height:44px;border:1.5px solid var(--accent);display:grid;place-items:center;color:var(--accent);margin:0 auto 14px">
          <svg class="pl-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/></svg>
        </div>
        <p style="font-size:12.5px;color:var(--muted)">Otevírám přihlášení přes Google…</p>
      </div>
    `);
    injectSpin();
    MSAuth.signInWithGoogle(flowMode, flowMode === 'identity' ? identityExtra : null).then(({error})=>{
      // Sem se kod dostane jen pri CHYBE - uspesna cesta appku rovnou
      // presmeruje na Google, tenhle .then uz nedobehne.
      if(error){ renderAuthError(typeof error === 'string' ? error : (error.message || 'Přihlášení přes Google se nepodařilo spustit.')); }
    });
  }

  /* ---------------------------------------------------------
     STAV: chyba pri spousteni prihlaseni (Google/e-mail se
     nepodarilo spustit - napr. spatne nastaveny Supabase klic,
     vypadek pripojeni...)
     --------------------------------------------------------- */
  function renderAuthError(message){
    clearResendTimer(); clearExpiryTimer(); stopAuthListening();
    sheet(`
      <div style="width:60px;height:60px;border:1.5px solid var(--muted);display:grid;place-items:center;color:var(--muted);margin:14px auto 16px">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
      </div>
      <h2 style="font-family:var(--font-head);font-size:19px;margin:0 0 8px;color:var(--text-main)">Přihlášení se nepodařilo</h2>
      <div style="border:1.5px solid var(--line);background:var(--card-bg);padding:14px;margin-bottom:18px;text-align:left">
        <p style="margin:0;font-size:12.5px;color:var(--text-main);line-height:1.5">${esc(message)}</p>
      </div>
      <button id="plAuthErrBack" class="btn-primary">Zkusit znovu</button>
      <button id="plAuthErrCancel" style="display:block;width:100%;text-align:center;background:none;border:none;color:var(--muted);font-size:12px;text-decoration:underline;text-underline-offset:3px;padding:16px 0 0;cursor:pointer;font-family:inherit">Zrušit přihlašování</button>
    `);
    overlayEl.querySelector('#plAuthErrBack').addEventListener('click', renderStep1);
    overlayEl.querySelector('#plAuthErrCancel').addEventListener('click', close);
  }

  /* ---------------------------------------------------------
     KROK 1b: zadani e-mailu
     --------------------------------------------------------- */
  function renderStep1b(){
    clearResendTimer(); clearExpiryTimer();
    const lastEmail = msGetLastLoginEmail();
    sheet(`
      <div style="display:flex;align-items:center;margin-bottom:6px;gap:10px">
        <button id="plBack" title="Zpět na výběr metody" style="width:28px;height:28px;border:1.5px solid var(--line);display:grid;place-items:center;color:var(--accent);cursor:pointer;background:transparent;flex:0 0 auto">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span style="font:700 10px/1 var(--font-mono);color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Krok 2 ze 2 · e-mail</span>
      </div>
      <h2 style="font-family:var(--font-head);font-size:19px;line-height:1.25;margin:0 0 8px;text-align:left;color:var(--text-main)">Přihlas se e-mailem</h2>
      <p style="font-size:13px;line-height:1.55;color:var(--text-main);margin:0 0 18px;text-align:left">Pošleme ti na e-mail jednorázový odkaz k přihlášení.</p>
      <label style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:800;margin:0 0 6px;display:block;text-align:left">E-mail</label>
      <input id="plEmailInput" type="email" placeholder="tvuj@email.cz" value="${(lastEmail||'').replace(/"/g,'&quot;')}" style="width:100%;box-sizing:border-box;border:1.5px solid var(--line);background:var(--card-bg);color:var(--text-main);padding:12px 13px;font-size:15px;font-family:inherit;margin-bottom:4px">
      <div id="plEmailErr" style="display:none;gap:8px;align-items:flex-start;color:var(--accent);font-size:12px;line-height:1.5;margin:8px 0 4px;text-align:left">
        <span>Zkontroluj prosím formát e-mailu, tenhle nevypadá platně.</span>
      </div>
      <button id="plSubmitEmail" class="btn-primary" style="margin-top:16px" disabled>Poslat přihlašovací odkaz</button>
    `);
    const input = overlayEl.querySelector('#plEmailInput');
    const err = overlayEl.querySelector('#plEmailErr');
    const submitBtn = overlayEl.querySelector('#plSubmitEmail');

    function isValidEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
    function refresh(){
      const ok = isValidEmail(input.value.trim());
      submitBtn.disabled = !ok;
      return ok;
    }
    input.addEventListener('input', ()=>{
      err.style.display = 'none';
      input.style.borderColor = 'var(--line)';
      refresh();
    });
    refresh();

    overlayEl.querySelector('#plBack').addEventListener('click', renderStep1);
    submitBtn.addEventListener('click', ()=>{
      const email = input.value.trim();
      if(!isValidEmail(email)){
        err.style.display = 'flex';
        input.style.borderColor = 'var(--accent)';
        return;
      }
      msSetLastLoginEmail(email);
      submitBtn.disabled = true;
      submitBtn.textContent = 'Odesílám…';
      MSAuth.sendMagicLink(email, flowMode, flowMode === 'identity' ? identityExtra : null).then(({error})=>{
        if(error){
          submitBtn.disabled = false;
          submitBtn.textContent = 'Poslat přihlašovací odkaz';
          err.querySelector('span').textContent = typeof error === 'string' ? error : (error.message || 'Odkaz se nepodařilo odeslat, zkus to prosím znovu.');
          err.style.display = 'flex';
          return;
        }
        renderStep1c(email);
      });
    });
  }

  /* ---------------------------------------------------------
     KROK 1c: cekani na potvrzeni magic linku
     --------------------------------------------------------- */
  function renderStep1c(email){
    let resendSeconds = 45;
    sheet(`
      <div style="display:flex;align-items:center;margin-bottom:6px;gap:10px">
        <button id="plBackC" title="Zpět, změnit e-mail" style="width:28px;height:28px;border:1.5px solid var(--line);display:grid;place-items:center;color:var(--accent);cursor:pointer;background:transparent;flex:0 0 auto">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span style="font:700 10px/1 var(--font-mono);color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Krok 2 ze 2 · e-mail</span>
      </div>
      <div style="width:60px;height:60px;border:1.5px solid var(--accent);display:grid;place-items:center;color:var(--accent);margin:14px auto 16px">
        <svg class="pl-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/></svg>
      </div>
      <h2 style="font-family:var(--font-head);font-size:19px;margin:0 0 8px;color:var(--text-main)">Zkontroluj svou schránku</h2>
      <p style="font-size:13px;color:var(--text-main);margin:0 0 4px">Poslali jsme přihlašovací odkaz na</p>
      <p style="font-size:13px;font-weight:700;color:var(--accent);margin:0 0 22px;word-break:break-all">${email}</p>
      <button id="plResend" disabled style="background:none;border:none;font-family:inherit;font-size:12.5px;color:var(--muted);text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:6px">Poslat znovu (45 s)</button>
      <button id="plCancelC" style="display:block;width:100%;text-align:center;background:none;border:none;color:var(--muted);font-size:12px;text-decoration:underline;text-underline-offset:3px;padding:16px 0 0;cursor:pointer;font-family:inherit">Zrušit přihlašování</button>
      <p style="font-size:10.5px;color:var(--muted);line-height:1.5;margin-top:18px;border-top:1px dashed var(--line);padding-top:10px;text-align:left">Appka na pozadí čeká, dokud odkaz nepotvrdíš. Funguje i když odkaz otevřeš v jiné záložce ve stejném prohlížeči.</p>
    `);
    injectSpin();

    overlayEl.querySelector('#plBackC').addEventListener('click', ()=>{ stopAuthListening(); renderStep1b(); });
    overlayEl.querySelector('#plCancelC').addEventListener('click', ()=>{ stopAuthListening(); close(); });

    // Skutecne cekani na potvrzeni (Krok 9) - viz bod 2.2 specifikace.
    // Spolehlive funguje ve stejnem prohlizeci/zarizeni (i jina zalozka),
    // protoze Supabase session se sdili pres localStorage. Skutecne
    // MEZI-ZARIZENI cekani (odkaz otevreny na jinem telefonu/pocitaci
    // nez appka) vyzaduje samostatnou polling infrastrukturu na serveru -
    // viz bod 2.5 specifikace, zatim NEimplementovano, zapsano jako
    // dalsi prace.
    authListenerUnsub = MSAuth.onAuthChange((event, session)=>{
      if(event === 'SIGNED_IN' && session){
        stopAuthListening();
        const providers = (session.user && session.user.app_metadata && session.user.app_metadata.providers) || [];
        const mergedWithGoogle = /@gmail\.com$/i.test(email) && providers.includes('google');
        renderSuccess({ mergedWithGoogle });
      }
    });

    const resendBtn = overlayEl.querySelector('#plResend');
    function startResendCountdown(){
      resendSeconds = 45;
      resendBtn.disabled = true;
      resendBtn.style.color = 'var(--muted)';
      resendBtn.style.fontWeight = 'normal';
      resendBtn.textContent = `Poslat znovu (${resendSeconds} s)`;
      clearResendTimer();
      resendTimer = setInterval(()=>{
        resendSeconds--;
        if(resendSeconds <= 0){
          resendBtn.disabled = false;
          resendBtn.style.color = 'var(--accent)';
          resendBtn.style.fontWeight = '700';
          resendBtn.textContent = 'Poslat znovu';
          clearResendTimer();
        } else {
          resendBtn.textContent = `Poslat znovu (${resendSeconds} s)`;
        }
      }, 1000);
    }
    resendBtn.addEventListener('click', ()=>{
      if(resendBtn.disabled) return;
      resendBtn.disabled = true;
      resendBtn.textContent = 'Posílám…';
      MSAuth.sendMagicLink(email, flowMode, flowMode === 'identity' ? identityExtra : null).then(()=>{ startResendCountdown(); });
    });
    startResendCountdown();

    clearExpiryTimer();
    expiryTimer = setTimeout(()=>{ stopAuthListening(); renderExpired(); }, 30 * 60 * 1000); // 30 minut, viz bod 2.2
  }

  /* ---------------------------------------------------------
     STAV: odkaz vyprsel (30 minut)
     --------------------------------------------------------- */
  function renderExpired(){
    clearResendTimer(); clearExpiryTimer();
    sheet(`
      <div style="width:60px;height:60px;border:1.5px solid var(--muted);display:grid;place-items:center;color:var(--muted);margin:14px auto 16px">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
      </div>
      <h2 style="font-family:var(--font-head);font-size:19px;margin:0 0 8px;color:var(--text-main)">Odkaz vypršel</h2>
      <div style="border:1.5px solid var(--line);background:var(--card-bg);padding:14px;margin-bottom:18px;text-align:left">
        <p style="margin:0;font-size:12.5px;color:var(--text-main);line-height:1.5">Odkaz vypršel po 30 minutách neaktivity. Nic se neděje — stačí to zkusit znovu.</p>
      </div>
      <button id="plRestart" class="btn-primary">Poslat nový odkaz</button>
      <button id="plCancelExp" style="display:block;width:100%;text-align:center;background:none;border:none;color:var(--muted);font-size:12px;text-decoration:underline;text-underline-offset:3px;padding:16px 0 0;cursor:pointer;font-family:inherit">Zrušit přihlašování</button>
    `);
    overlayEl.querySelector('#plRestart').addEventListener('click', renderStep1b);
    overlayEl.querySelector('#plCancelExp').addEventListener('click', close);
  }

  /* ---------------------------------------------------------
     STAV: uspech
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     STAV: uspech PRIHLASENI (jeste ne nakup - ten je dalsi krok)
     --------------------------------------------------------- */
  function renderSuccess(opts){
    clearResendTimer(); clearExpiryTimer();
    sheet(`
      <div style="width:60px;height:60px;border:1.5px solid var(--money-pos);display:grid;place-items:center;color:var(--money-pos);margin:14px auto 16px">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
      <h2 style="font-family:var(--font-head);font-size:19px;margin:0 0 8px;color:var(--text-main)">Přihlášeno!</h2>
      <p style="font-size:13px;color:var(--muted)">Pokračujeme dál za okamžik…</p>
    `);
    if(opts && opts.mergedWithGoogle){
      showToast('Tenhle e-mail používá stejný účet jako tvé Google přihlášení.');
    }
    if(flowMode === 'identity'){
      // Prijeti pozvanky - zadny nakup, jen predame rizeni zpet volajicimu
      // (ten pak resi stahovani dat, viz specifikace 12.4).
      const cb = onSuccessCb;
      onSuccessCb = null;
      setTimeout(()=>{ close(); if(cb) cb(); }, 1200);
      return;
    }
    // ZMENA 29.7.2026: po prihlaseni uz appka rovnou needeluje Premium -
    // nasleduje krok nakupu (vyber obdobi), viz specifikace 11.2.
    setTimeout(renderPurchasePick, 1400);
  }

  /* ---------------------------------------------------------
     KROK NAKUPU 1: vyber obdobi (mesicne/rocne/natrvalo)
     Premium plati NA KONKRETNI STAVBU, ne na cely ucet - viz
     specifikace 11.1.
     --------------------------------------------------------- */
  function renderPurchasePick(){
    sheet(`
      <div style="display:flex;margin-bottom:4px">
        <button id="pkClose" title="Zavřít" style="width:26px;height:26px;border:1.5px solid var(--line);display:grid;place-items:center;color:var(--muted);margin-left:auto;background:transparent;cursor:pointer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <h2 style="font-family:var(--font-head);font-size:19px;margin:0 0 6px;color:var(--text-main)">Aktivuješ Premium pro<br><span style="color:var(--accent)">${esc(projectName())}</span></h2>
      <p style="font-size:12.5px;line-height:1.55;color:var(--text-main);margin:0 0 16px;text-align:left">Premium platí jen pro tuhle stavbu — dostane cloudovou zálohu a půjde ji sdílet. Ostatní tvoje stavby zůstávají, jak jsou; Premium jim aktivuješ zvlášť, jen když budeš chtít.</p>
      <div id="planOpts" style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px">
        ${planOptRow('monthly','Měsíčně','69 Kč / měsíc')}
        ${planOptRow('yearly','Ročně','599 Kč / rok (49,90 Kč/měsíc)','Ušetříš 229 Kč')}
        ${planOptRow('lifetime','Natrvalo','1499 Kč jednorázově, žádné další platby')}
      </div>
      <button class="btn-primary" id="pkBuy" style="width:100%">Koupit za ${PLAN_PRICES[chosenPeriod]}</button>
      <p style="font-size:10px;color:var(--muted);line-height:1.5;margin:14px 4px 0;text-align:left">${chosenPeriod==='lifetime' ? 'Jednorázová platba přes Google Play, žádné opakované strhávání.' : 'Platba probíhá přes Google Play. Předplatné jde kdykoli zrušit v nastavení účtu Google.'}</p>
    `);
    overlayEl.querySelector('#pkClose').addEventListener('click', close);
    overlayEl.querySelectorAll('.plan-opt-row').forEach(row=>{
      row.addEventListener('click', ()=>{ chosenPeriod = row.dataset.p; renderPurchasePick(); });
    });
    overlayEl.querySelector('#pkBuy').addEventListener('click', renderPurchaseProcessing);
  }
  function planOptRow(key, title, desc, saveTag){
    const sel = chosenPeriod === key;
    return `
      <div class="plan-opt-row" data-p="${key}" style="border:1.5px solid ${sel?'var(--accent)':'var(--line)'};background:var(--card-bg);padding:13px 14px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:12px;${sel?'box-shadow:2px 2px 0 rgba(29,30,28,.12)':''}">
        <div style="width:18px;height:18px;border-radius:50%;border:1.5px solid ${sel?'var(--accent)':'var(--line)'};flex:0 0 auto;display:grid;place-items:center">${sel?'<div style="width:9px;height:9px;border-radius:50%;background:var(--accent)"></div>':''}</div>
        <div style="flex:1"><b style="display:block;font-size:13.5px;font-family:var(--font-head)">${title}</b><span style="font-size:11px;color:var(--muted)">${desc}</span></div>
        ${saveTag ? `<span style="font-size:9px;font-weight:800;color:var(--money-pos);border:1px solid var(--money-pos);padding:2px 6px;text-transform:uppercase;flex:0 0 auto">${saveTag}</span>` : ''}
      </div>
    `;
  }

  /* ---------------------------------------------------------
     KROK NAKUPU 2: zpracovani (mock)
     --------------------------------------------------------- */
  function renderPurchaseProcessing(){
    sheet(`
      <div style="width:60px;height:60px;border:1.5px solid var(--accent);display:grid;place-items:center;color:var(--accent);margin:14px auto 16px">
        <svg class="pl-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/></svg>
      </div>
      <h2 style="font-family:var(--font-head);font-size:19px;margin:0 0 8px;color:var(--text-main)">Zpracovávám platbu…</h2>
      <p style="font-size:12.5px;color:var(--muted)">(mock) Google Play by teď ukázal vlastní potvrzovací okno.</p>
    `);
    injectSpin();
    setTimeout(renderPurchaseDone, 1000);
  }

  /* ---------------------------------------------------------
     KROK NAKUPU 3: hotovo - tady se Premium OPRAVDU aktivuje,
     pak nasleduje realny postup nahravani do cloudu (bod 4
     specifikace - zadny tichy stav bez cisla).
     --------------------------------------------------------- */
  function renderPurchaseDone(){
    msSetPremiumMock(true);
    msSetPremiumPlanType(chosenPeriod);
    // MOCK simulace obnoveni predplatneho - viz specifikace 17/18: vrati
    // pristup jen lidem, ktere odeprela appka sama kvuli vyprseni, ne tem,
    // co vlastnik odepral rucne (ti zustavaji zamceni, dokud je neodemkne sam).
    msRestoreExpiredSharedPeople();
    // Krok 10a: skutecne zalozeni radku projektu v Supabase (potreba drive,
    // nez appka umi vytvaret realne pozvanky pro tuhle stavbu). Bezi na
    // pozadi, nic neblokuje - kdyby se to nepovedlo, "Sdilet stavbu" to
    // zkusi znovu pri pristim otevreni.
    if(typeof MSCloud !== 'undefined'){
      MSCloud.ensureProject().then(({error})=>{
        if(error){ console.error('ensureProject po nakupu selhalo', error); return; }
        // Krok 11: hned jak ma projekt cloudovy zaznam, posli i prvni
        // "snimek" zakladnich udaju o stavbe - at ho pripadny pozvany
        // clovek uvidi co nejdriv po prijeti pozvanky.
        MSCloud.uploadSnapshot().then(({error:snapErr})=>{ if(snapErr) console.error('uploadSnapshot po nakupu selhalo', snapErr); });
      }).catch(e=> console.error('ensureProject po nakupu selhalo', e));
    }
    sheet(`
      <div style="width:60px;height:60px;border:1.5px solid var(--money-pos);display:grid;place-items:center;color:var(--money-pos);margin:14px auto 16px">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
      <h2 style="font-family:var(--font-head);font-size:19px;margin:0 0 8px;color:var(--text-main)">Premium aktivováno!</h2>
      <p style="font-size:13px;color:var(--muted)">Teď appka nahraje ${esc(projectName())} do cloudu…</p>
    `);
    setTimeout(renderCloudUpload, 1200);
  }

  /* ---------------------------------------------------------
     ZALOHOVANI DO CLOUDU - realny postup s cislem, ne tichy
     spinner. Pocty tahne ze skutecnych dat projektu, aby to
     pusobilo autenticky, i kdyz se realne nikam nenahrava.
     --------------------------------------------------------- */
  function renderCloudUpload(){
    const categories = [
      { label:'fotky', count: safeCount(typeof msPhotos==='function' && msPhotos()) },
      { label:'dokumenty', count: safeCount(typeof msDocuments==='function' && msDocuments()) },
      { label:'zápisy do deníku', count: safeCount(typeof msDiary==='function' && msDiary()) },
      { label:'výdaje', count: safeCount(typeof msExpenses==='function' && msExpenses()) },
    ].filter(c=> c.count > 0);

    sheet(`
      <div style="width:60px;height:60px;border:1.5px solid var(--accent);display:grid;place-items:center;color:var(--accent);margin:14px auto 16px">
        <svg class="pl-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/></svg>
      </div>
      <h2 style="font-family:var(--font-head);font-size:19px;margin:0 0 8px;color:var(--text-main)">Zálohuji do cloudu…</h2>
      <p id="cuText" style="font-size:12.5px;color:var(--text-main);margin:0 0 12px;min-height:18px">Připravuji zálohu…</p>
      <div style="height:6px;background:var(--card-bg);border:1px solid var(--line);overflow:hidden;margin-bottom:8px">
        <div id="cuBarFill" style="height:100%;background:var(--accent);width:0%;transition:width .18s"></div>
      </div>
      <p style="font-size:10.5px;color:var(--muted);line-height:1.5">Appka nahrává fotky, dokumenty i zápisy z deníku, aby šly bezpečně sdílet. U větších projektů to chvíli trvá — appka zůstává použitelná, klidně ji přepni na pozadí.</p>
    `);
    injectSpin();

    const cuText = overlayEl.querySelector('#cuText');
    const cuBar = overlayEl.querySelector('#cuBarFill');

    if(!categories.length){
      cuText.textContent = 'Připravuji nastavení projektu…';
      setTimeout(()=>{ cuBar.style.width = '100%'; setTimeout(renderCloudUploadDone, 500); }, 800);
      return;
    }

    let ci = 0;
    function stepCategory(){
      if(ci >= categories.length){
        cuBar.style.width = '100%';
        setTimeout(renderCloudUploadDone, 400);
        return;
      }
      const cat = categories[ci];
      const ticks = Math.min(cat.count, 10);
      let t = 0;
      function tick(){
        t++;
        const shown = Math.max(1, Math.min(cat.count, Math.round(cat.count * t / ticks)));
        cuText.textContent = `Nahrávám ${cat.label} ${shown} z ${cat.count}…`;
        cuBar.style.width = Math.round(((ci + t/ticks) / categories.length) * 100) + '%';
        if(t < ticks){ setTimeout(tick, 160); }
        else { ci++; setTimeout(stepCategory, 200); }
      }
      tick();
    }
    stepCategory();
  }
  function safeCount(arr){ return Array.isArray(arr) ? arr.length : 0; }

  function renderCloudUploadDone(){
    sheet(`
      <div style="width:60px;height:60px;border:1.5px solid var(--money-pos);display:grid;place-items:center;color:var(--money-pos);margin:14px auto 16px">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
      <h2 style="font-family:var(--font-head);font-size:19px;margin:0 0 8px;color:var(--text-main)">Záloha hotová</h2>
      <p style="font-size:13px;color:var(--muted)">${esc(projectName())} je v cloudu a připravená ke sdílení.</p>
    `);
    const cb = onSuccessCb;
    onSuccessCb = null;
    setTimeout(()=>{ close(); if(cb) cb(); }, 1400);
  }

  /* ---------------------------------------------------------
     TOAST (kratke ozameni dole, samo zmizi)
     --------------------------------------------------------- */
  function showToast(text){
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:99;background:#1d1e1c;color:#f2efe6;padding:12px 14px;font-size:12.5px;line-height:1.4;display:flex;gap:10px;align-items:flex-start;box-shadow:2px 2px 0 rgba(0,0,0,.2)';
    toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8562f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto;margin-top:1px"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg><span>${text}</span>`;
    document.body.appendChild(toast);
    setTimeout(()=>{ if(toast.parentNode) toast.parentNode.removeChild(toast); }, 3400);
  }

  function clearResendTimer(){ if(resendTimer){ clearInterval(resendTimer); resendTimer = null; } }
  function clearExpiryTimer(){ if(expiryTimer){ clearTimeout(expiryTimer); expiryTimer = null; } }

  function injectSpin(){
    if(document.getElementById('plSpinStyle')) return;
    const st = document.createElement('style');
    st.id = 'plSpinStyle';
    st.textContent = '.pl-spin{animation:plSpin 1.6s linear infinite;transform-origin:center}@keyframes plSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}';
    document.head.appendChild(st);
  }

  /* ---------------------------------------------------------
     OBNOVENI PO NAVRATU Z PRESMEROVANI (Krok 9)
     Google i magic-link presmeruji appku pryc a appka se pri
     navratu cela znovu nacte - proto si pred odchodem appka
     ulozila (MSAuth.setPendingFlow), ve kterem rezimu byla.
     Volano z main.js hned pri startu appky, driv nez cokoli
     jineho vykresli.
     --------------------------------------------------------- */
  /* ============================================================
     OBNOVA STAVEB PO PRIHLASENI (13.8.2026)
     Spolecne misto pro obojí: sdilene stavby (clenstvi, uz existovalo
     v restoreProjectsFromAccount) i VLASTNI stavby s Premiem, ktere
     v cloudu jsou, ale na tomhle telefonu jeste lokalne nejsou -
     typicky po preinstalaci appky nebo vymene telefonu.
     Pouziva se ze dvou mist: automaticky po prihlaseni bez cekajici
     pozvanky (checkAuthResume nize) a rucne z odkazu "Přihlásit se a
     stáhnout stavby z účtu" na uvodni obrazovce (screen-onboarding.js).
     opts.verbose: true = uzivatel na to klikl sam, at se mu i rekne,
     kdyz se nic noveho nenaslo. false = bezi tise na pozadi, mlci.
     ============================================================ */
  async function offerFullAccountRestore(opts){
    opts = opts || {};
    if(typeof MSCloud === 'undefined'){ if(opts.onDone) opts.onDone(); return; }

    let memberAdded = 0, memberFirst = null;
    try{
      const r = await MSCloud.restoreProjectsFromAccount();
      memberAdded = (r && r.added) || 0;
      memberFirst = (r && r.first) || null;
    }catch(e){ console.error('restoreProjectsFromAccount v offerFullAccountRestore', e); }

    let ownedList = [];
    try{
      const r = await MSCloud.listRestorableOwnedProjects();
      ownedList = r.projects || [];
    }catch(e){ console.error('listRestorableOwnedProjects v offerFullAccountRestore', e); }

    if(ownedList.length){
      renderRestoreBuilds(ownedList, memberAdded, memberFirst, opts.onDone);
      return;
    }

    if(memberAdded){
      if(memberFirst) msSetActiveProjectId(memberFirst.id);
      Router.go('dashboard');
      alert(memberAdded === 1
        ? 'Našli jsme tvoji stavbu a stahujeme ji na pozadí.'
        : ('Našli jsme ' + memberAdded + ' stavby a stahujeme je na pozadí.'));
    } else if(opts.verbose){
      const mamProjekty = (typeof msLoadProjects === 'function') && msLoadProjects().length;
      alert(mamProjekty
        ? 'Nic nového — všechny stavby z tohoto účtu už v appce máš.\n\nJestli čekáš cizí stavbu, zkontroluj, že ses přihlásil(a) stejným e-mailem, kterým jsi přijímal(a) pozvánku.'
        : 'K tomuhle účtu zatím žádná stavba nepatří.\n\nZkontroluj, že ses přihlásil(a) stejným e-mailem. Pokud čekáš na pozvánku, kterou jsi ještě nepřijal(a), použij tlačítko „Mám pozvánku do stavby“.');
    }
    if(opts.onDone) opts.onDone();
  }

  /* Sheet se seznamem vlastnich staveb nalezenych v cloudu, kazda s
     zaskrtavatkem. Vzhledove navazuje na ostatni kroky teto obrazovky
     (sheet(), stejne ikony a rozestupy). */
  function renderRestoreBuilds(cloudProjects, memberAdded, memberFirst, onDone){
    if(isOverlayLive()) close();
    overlayEl = document.createElement('div');
    overlayEl.className = 'ms-overlay';
    overlayEl.style.cssText = 'position:fixed;inset:0;background:rgba(29,30,28,.55);z-index:95;display:flex;align-items:flex-end;justify-content:center';
    document.body.appendChild(overlayEl);

    // DOPLNENO (14.8.2026): kdo appku hodne testoval, ma pod uctem
    // desitky zapomenutych zkusebnich staveb - "zaskrtnuto vse" by pak
    // znamenalo rucne odskrtavat tri ctvrtiny seznamu. Predvybrana je
    // proto jen NEJAKTIVNEJSI stavba (seznam uz prichazi serazeny podle
    // toho, viz listMyOwnedProjects) - zbytek jde doskrtnout, kdyz je
    // to opravdu potreba.
    const vybrano = new Set(cloudProjects.length ? [cloudProjects[0].id] : []);

    // Kratke formatovani data - tahle obrazovka nema pristup k zadnemu
    // ze sdilenych formatDateCz() (kazdy soubor ma svou vlastni kopii),
    // a datum tu navic prichazi jako cely ISO CASOVY UDAJ z databaze
    // (ne jen datum), tak stoji za to mit tu vlastni, malou variantu.
    function kratceDatum(iso){
      if(!iso) return null;
      try{
        const d = new Date(iso);
        return d.getDate()+'. '+(d.getMonth()+1)+'. '+d.getFullYear();
      }catch(e){ return null; }
    }

    function kreslit(){
      sheet(`
        <div style="width:44px;height:44px;border:1.5px solid var(--money-pos);display:grid;place-items:center;color:var(--money-pos);margin-bottom:14px">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h2 style="font-family:var(--font-head);font-size:19px;line-height:1.25;margin:0 0 6px;text-align:left;color:var(--text-main)">Našli jsme tvoje stavby</h2>
        <!-- DOPLNENO (14.8.2026): vysvetlujici text - drive tu bylo jen
             "vyber, ktere chces stahnout", coz u dlouheho seznamu
             nerika, CO ty polozky vlastne jsou ani odkud se vzaly. -->
        <p style="font-size:12.5px;color:var(--muted);margin:0 0 16px;text-align:left;line-height:1.55">Tohle jsou všechny stavby uložené pod tímhle účtem - typicky proto, že jsi je někdy zapnul(a) s Premiem. Zaškrtni tu, kterou chceš stáhnout do tohohle telefonu; zbytek zůstane bezpečně v cloudu a dá se stáhnout kdykoliv později.</p>
        <!-- OPRAVA (14.8.2026): seznam nemel zadnou max-vysku ani
             rolovani - s vice testovacimi stavbami pod uctem rostl
             klidne pres celou obrazovku a na tlacitko "Stáhnout vybrané"
             se nedalo dosahnout. Seznam je ted samostatne rolovatelny
             blok, nadpis i tlacitko zustavaji vzdy na miste. -->
        <div style="max-height:42vh;overflow-y:auto;margin-bottom:6px">
          ${cloudProjects.map(p=>{
            const on = vybrano.has(p.id);
            const datum = kratceDatum(p.lastActivity);
            return `<div class="rbRow" data-id="${p.id}" style="display:flex;align-items:center;gap:11px;padding:11px 0;border-top:1px solid var(--line);cursor:pointer">
              <span style="width:20px;height:20px;flex:0 0 20px;border:1.5px solid ${on?'var(--accent)':'var(--line)'};background:${on?'var(--accent)':'transparent'};display:grid;place-items:center">
                ${on ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#04070f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>' : ''}
              </span>
              <div style="min-width:0;flex:1">
                <b style="font-size:13px;display:block;color:var(--text-main)">${msEsc(p.name || 'Stavba')}</b>
                <span style="font-size:10.5px;color:var(--muted)">${msEsc(p.location || 'bez umístění')}</span>
              </div>
              ${datum ? `<span style="font-size:9.5px;color:var(--muted);text-align:right;flex:0 0 auto;line-height:1.4">Naposledy<br/>${datum}</span>` : ''}
            </div>`;
          }).join('')}
        </div>
        <button id="rbGo" style="width:100%;padding:13px;font-weight:800;font-size:13px;background:linear-gradient(90deg,#25e8ff,#b34cff);color:#04070f;border:0;cursor:pointer;margin-top:8px;font-family:inherit">Stáhnout vybrané →</button>
        <button id="rbSkip" style="width:100%;text-align:center;background:none;border:none;color:var(--muted);font-size:12px;text-decoration:underline;text-underline-offset:3px;padding:12px 0 0;cursor:pointer;font-family:inherit">Přeskočit, řeším později</button>
      `);
      overlayEl.querySelectorAll('.rbRow').forEach(row=>{
        row.addEventListener('click', ()=>{
          const id = row.dataset.id;
          if(vybrano.has(id)) vybrano.delete(id); else vybrano.add(id);
          kreslit();
        });
      });
      overlayEl.querySelector('#rbGo').addEventListener('click', stahnout);
      overlayEl.querySelector('#rbSkip').addEventListener('click', preskocit);
    }

    /* OPRAVA (14.8.2026, zasadni): drive se panel ZAVREL HNED po kliknuti
       (close()), driv nez stahovani vubec zacalo - clovek pak koukal na
       obrazovku pod nim (typicky porad onboarding) BEZ JAKEHOKOLIV
       vodítka, ze neco probiha, klidne i desitky vterin (stahuji se
       fotky/dokumenty). Vypadalo to presne jako "appka me vratila zpatky
       na prihlasovaci obrazovku" - a kdyz clovek mezitim zkusil neco
       jineho (napr. zalozit projekt rucne), realne stahovani na pozadi
       s tim mohlo kolidovat. Ted panel zustava viditelny a ukazuje
       viditelny stav "Stahuji…", zavre se a teprve pak prejde na
       dashboard, az je opravdu hotovo. */
    async function stahnout(){
      const vybraneProjekty = cloudProjects.filter(p=> vybrano.has(p.id));
      if(!vybraneProjekty.length){ preskocit(); return; }
      sheet(`
        <div style="width:44px;height:44px;border:1.5px solid var(--money-pos);display:grid;place-items:center;color:var(--money-pos);margin:0 auto 14px;animation:msSpin 1s linear infinite">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-3-6.7"/></svg>
        </div>
        <h2 style="font-family:var(--font-head);font-size:17px;margin:0 0 6px;color:var(--text-main)">Stahuji stavbu…</h2>
        <p style="font-size:11.5px;color:var(--muted);margin:0;line-height:1.5">Fotky a dokumenty mohou chvíli trvat. Nezavírej appku.</p>
      `);
      injectSpin();
      try{ if(typeof Layout !== 'undefined' && Layout.SyncBar) Layout.SyncBar.reset(); }catch(e){}
      const res = await MSCloud.restoreOwnedProjects(vybraneProjekty);
      const cilProjekt = (res && res.first) || memberFirst;
      if(cilProjekt) msSetActiveProjectId(cilProjekt.id);
      close();
      Router.go('dashboard');
      const celkem = (res.added || 0) + (memberAdded || 0);
      if(celkem){
        alert(celkem === 1
          ? 'Stavba je stažená.'
          : (celkem + ' stavby jsou stažené.'));
      } else {
        alert('Stahování se nepodařilo dokončit. Zkus to prosím znovu z Nastavení → Přidat stavbu.');
      }
      if(onDone) onDone();
    }

    function preskocit(){
      close();
      if(memberAdded){
        if(memberFirst) msSetActiveProjectId(memberFirst.id);
        Router.go('dashboard');
        alert(memberAdded === 1
          ? 'Našli jsme tvoji stavbu a stahujeme ji na pozadí.'
          : ('Našli jsme ' + memberAdded + ' stavby a stahujeme je na pozadí.'));
      }
      if(onDone) onDone();
    }

    kreslit();
  }

  async function checkAuthResume(){
    if(typeof MSAuth === 'undefined') return;
    // OPRAVA (14.8.2026, kriticka): "session" se ctelo HNED, driv nez
    // "pending" - a pending flow se pak vzdy smaze (i kdyz session
    // vyslo null), bez ohledu na to, jestli se skutecne pouzil. Jenze
    // po navratu z presmerovani (Google) Supabase klient teprve TEHDY
    // (pri prvnim get()) zahaji vymenu kodu z adresy za skutecnou
    // session - a ta bezi na pozadi asynchronne, muze trvat zlomek
    // vteriny (sitovy pozadavek). getSession() volany HNED PO navratu
    // tak casto vratil null jeste DRIV, nez vymena dobehla - appka pak
    // tise zahodila pending flow (uz nikdy nepujde znovu precist) a
    // clovek skoncil presne tam, kde appka po nacteni bez session
    // skonci vzdy: na uvodni obrazovce, jako by "prihlaseni nefungovalo".
    //
    // Reseni: nejdriv NEDESTRUKTIVNE zjistit, jestli je vubec na co
    // cekat (peekPendingFlow) - jen TEHDY se ceka na session nekolika
    // pokusy. Bez pending flow (naprosta vetsina bezneho spusteni
    // appky) zustava puvodni rychlost, zadne zpomaleni navic.
    const cekaNaNeco = MSAuth.peekPendingFlow ? MSAuth.peekPendingFlow() : null;
    let session = null;
    let poslediChyba = null;
    // (14.8.2026) MSAuth.getSession() chybu nikdy nevyhodi - jen ji
    // tise zaloguje do konzole a vrati null (spravne chovani pro
    // vsechna ostatni mista appky, ktera na "null = nepresihlasen"
    // spolehaji). Diagnostika potrebuje videt skutecnou chybu, tak si
    // ji tady bere primo ze Supabase klienta, mimo sdileny helper.
    async function zkusSeSkutecnouChybou(){
      try{
        const c = MSAuth.get ? MSAuth.get() : null;
        if(!c) return null;
        const { data, error } = await c.auth.getSession();
        if(error){ poslediChyba = error; return null; }
        return data ? data.session : null;
      }catch(e){ poslediChyba = e; return null; }
    }
    if(cekaNaNeco && cekaNaNeco.flow){
      for(let pokus=0; pokus<8 && !session; pokus++){
        session = await zkusSeSkutecnouChybou();
        if(!session) await new Promise(r=> setTimeout(r, 300));
      }
    } else {
      session = await zkusSeSkutecnouChybou();
    }
    const pending = MSAuth.takePendingFlow(); // { flow, extra } | null
    if(!session){
      // DIAGNOSTIKA (14.8.2026): kdyz cekajici prihlaseni BYLO a bylo
      // vyslovne (verbose), ale session ani po vsech pokusech nedorazila,
      // appka driv jen tise mlcela - clovek nevedel, jestli appka vubec
      // zkusila neco udelat, nebo jestli jeste bezi stara verze appky
      // bez teto opravy. Hlaska aspon potvrdi, ze se appka o prihlaseni
      // POKUSILA a rekne, ze se ma zkusit znovu - a kdyz ma appka
      // zachycenou konkretni chybu (napr. spatne nastaveny redirect v
      // Supabase/Google konzoli), rovnou ji ukaze - do konzole prohlizece
      // na mobilu se beztak nikdo nedostane.
      if(pending && pending.flow === 'identity' && pending.extra && typeof pending.extra === 'object' && pending.extra.verbose){
        const detail = poslediChyba ? ('\n\nTechnický detail: ' + (poslediChyba.message || String(poslediChyba))) : '';
        alert('Přihlášení se nepodařilo dokončit. Zkus to prosím znovu - pokud to nepomůže, zkontroluj připojení k internetu.' + detail);
      }
      return;
    }
    if(!pending || !pending.flow) return;

    if(pending.flow === 'purchase'){
      if(isOverlayLive()) return;
      flowMode = 'purchase';
      onSuccessCb = null;
      overlayEl = document.createElement('div');
      overlayEl.className = 'ms-overlay';
      overlayEl.style.cssText = 'position:fixed;inset:0;background:rgba(29,30,28,.55);z-index:95;display:flex;align-items:flex-end;justify-content:center';
      document.body.appendChild(overlayEl);
      renderSuccess({ mergedWithGoogle:false });
      return;
    }

    if(pending.flow === 'identity'){
      // Krok 10c: navrat z presmerovani po prijeti pozvanky - appka uz vi,
      // ze prihlaseni uspelo, a ma ulozeny token pozvanky (extra). Appka
      // uz neni na puvodni obrazovce "Byl jsi pozvan" (URL hash se pri
      // presmerovani ztratil), takze pozvanku prijmeme na pozadi a
      // vysledek ukazeme jednoduchym oznamenim.
      // (14.8.2026) "extra" muze byt bud stary format (holy retezec s
      // tokenem), nebo novy { token, verbose } - viz openIdentityOnly.
      const extra = pending.extra;
      const token = (typeof extra === 'string') ? extra : (extra && extra.token) || null;
      const verbose = !!(extra && typeof extra === 'object' && extra.verbose);
      window.dispatchEvent(new CustomEvent('ms-identity-auth-resumed', { detail: { session, token } }));
      if(typeof MSCloud === 'undefined') return;
      if(!token){
        // (11.8.2026, rozsireno 13.8.2026 a 14.8.2026) Prihlaseni bez
        // cekajici pozvanky - typicky clovek, co pozvanku prijal v
        // prohlizeci a ted si otevrel appku z plochy, NEBO vlastnik s
        // Premiem po preinstalaci/vymene telefonu, NEBO clovek, co si
        // VYSLOVNE kliknul na "Přihlásit se" v onboardingu (verbose).
        // offerFullAccountRestore zkontroluje obojí - clenstvi i vlastni
        // stavby - a ukaze vyber, kdyz je co vybirat. Kdyz nic nenajde a
        // verbose je true, appka to i rekne - driv mlcela vzdy, coz po
        // Google presmerovani vypadalo, jako by cloveka "poslala zpatky"
        // na uvodni obrazovku beze slova.
        try{ await offerFullAccountRestore({ verbose }); }
        catch(e){ console.error('obnova staveb po prihlaseni', e); }
        return;
      }
      const { error, member } = await MSCloud.redeemInvite(token);
      if(error){
        alert('Pozvánku se nepodařilo přijmout: ' + (typeof error === 'string' ? error : (error.message || 'neznámá chyba')));
        return;
      }
      const localProject = await MSCloud.materializeSharedProject(member);
      if(localProject){
        msSetActiveProjectId(localProject.id);
        Router.go('dashboard');
      }
      alert('Pozvánka přijata! Tvůj přístup je teď aktivní a appka stahuje etapy, finance, deník i fotky na pozadí.');
      return;
    }
  }

  return { open, openIdentityOnly, checkAuthResume, offerFullAccountRestore };
})();
