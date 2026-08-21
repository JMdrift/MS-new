/* ==========================================================
   ONBOARDING - zalozeni projektu (prvniho i dalsiho).
   Stary staticky uvitaci carousel (slidy + zadost o oznameni) byl
   nahrazen novym interaktivnim pruvodcem primo v appce - viz tour.js
   (TourWelcomeScreen + Tour engine) a screen-appLock.js.

   PREPSANO (14.8.2026) - zjednoduseni cele identity/prihlasovaci
   architektury na zadost. Puvodni model mel TRI nezavisle cesty
   (tichy anonymni ucet pro Free, vyslovne prihlaseni pro Premium,
   prijeti pozvanky pres odkaz s tokenem v URL) - kazda se svym
   vlastnim zpusobem, jak selhat, a prave ten odkaz s tokenem
   prezivajici presmerovani pres tri domeny byl mechanismus, ktery
   se rozpadal na iOS (appka na plose ma oddelene uloziste od
   Safari, viz komentare u checkAuthResume v screen-premiumLogin.js).

   NOVY MODEL: pri zalozeni PRVNIHO projektu appka VZDY vyzada
   skutecne prihlaseni (Google nebo e-mail), bez ohledu na to, jestli
   clovek bude nekdy chtit Premium. Free na tomhle uctu jednoduse nic
   neuklada do cloudu - a podle Supabase cenika (overeno 14.8.2026)
   samotne prihlaseni bez ulozenych dat nic nestoji (50 000 aktivnich
   uzivatelu mesicne zdarma, ulozene radky/soubory se pocitaji zvlast).
   Dusledky:
   - Zadny tichy anonymni ucet. Identita = skutecny ucet od prvni
     vteriny.
   - Novy telefon / preinstalace = prihlasis se stejnym uctem, appka
     rovnou vidi, co pod nim existuje - neni to samostatny "obnovovaci"
     krok, je to TENTYZ prihlasovaci krok jako pri prvnim zalozeni.
   - Pozvanka uz neobsahuje zadny odkaz na konkretni stavbu - jen
     obecny odkaz ke stazeni appky a 6mistny kod (viz showInviteDialog
     v screen-shareStavba.js). Pozvany appku stahne, prihlasi se, zada
     kod - stejnou cestou, jako by zakladal vlastni projekt.
   - Pridani DALSIHO projektu k uz prihlasenemu uctu uz zadne dalsi
     prihlasovani nevyzaduje - branou uz jednou prosel.
   ========================================================== */


const OnboardingProjectScreen = (function(){
  // Vyber typu stavby (Rodinny dum/Chata/Byt/Rekonstrukce/Komercni objekt/Jine)
  // je docasne schovany - momentalne je vsechno "Rodinny dum". Puvodni seznam
  // necham tu jen jako poznamku, kdyby se vyber v budoucnu zase vratil:
  // const TYPES = ['Rodinný dům','Chata','Byt','Rekonstrukce','Komerční objekt','Jiné'];
  const FIXED_TYPE = 'Rodinný dům';

  function render(container, params){
    const isAdditional = msLoadProjects().length > 0;
    // MOCK/test: normalne se tenhle banner objevi sam, kdyz appce po
    // smazani sdileneho projektu vlastnikem zbyde 0 projektu (viz main.js
    // boot logika) - pro otestovani bez skutecneho druheho zarizeni jde
    // vyvolat i primo pres parametr routy, viz Premium-sdileni-specifikace.md
    // sekce 18.2.
    const removedProjectName = params && params.removedProject;

    drawLoading();
    checkSessionAndDraw();

    async function checkSessionAndDraw(){
      let session = null;
      try{ session = await MSAuth.getSession(); }catch(e){}
      // Anonymni relace se v novem modelu NEPOCITA jako "prihlasen" -
      // potrebujeme skutecnou identitu (Google/e-mail), ne tichy
      // docasny zaznam. Stary mechanismus (ensureAnonymousAccount) tu
      // zustava jen jako interni pomocnik pro RPC volani, co vyzaduji
      // JAKOUKOLIV session (napr. overeni kodu pred vlastnim
      // prihlasenim) - pro tohle rozhodnuti se ale nepocita.
      let anon = false;
      try{ anon = !!session && MSAuth.isAnonymousAccount && await MSAuth.isAnonymousAccount(); }catch(e){}
      if(session && !anon) drawChoice();
      else drawSignInGate();
    }

    function drawLoading(){
      container.innerHTML = `<div style="min-height:60vh;display:flex;align-items:center;justify-content:center"><p style="color:var(--muted);font-size:12px">Načítám…</p></div>`;
    }

    /* ---------------------------------------------------------
       BRANA: povinne prihlaseni, driv nez cokoliv jineho. Zadna
       moznost "pokracovat bez uctu" - presne podle noveho zadani.
       --------------------------------------------------------- */
    function drawSignInGate(){
      container.innerHTML = `
        <div style="padding:calc(14px + env(safe-area-inset-top)) 20px;min-height:100%;display:flex;flex-direction:column;justify-content:center;text-align:center">
          <div style="width:52px;height:52px;border:1.5px solid var(--accent);display:grid;place-items:center;color:var(--accent);margin:0 auto 18px">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="1"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <p style="font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);font-weight:800;margin:0 0 6px">${isAdditional?'Nový projekt':'Než začneme'}</p>
          <h1 style="margin:0 0 10px;font-size:22px;line-height:1.25">Přihlas se, ať víme, komu appka patří</h1>
          <p style="margin:0 auto 22px;font-size:12.5px;color:var(--muted);line-height:1.6;max-width:340px">Jedno přihlášení přes Google nebo e-mail stačí na všechno - založení vlastní stavby, přijetí pozvánky i pozdější přechod na Premium. Zůstaneš na free, dokud sám nechceš jinak - přihlášení samo o sobě nic nestojí ani nikam nic neukládá.</p>
          <button id="gateSignInBtn" style="width:100%;max-width:320px;margin:0 auto;padding:14px;cursor:pointer;background:linear-gradient(90deg,#25e8ff,#b34cff);color:#04070f;border:0;font-family:inherit;font-size:13px;font-weight:800">Přihlásit se přes Google nebo e-mail</button>
          <!-- (14.8.2026) appka pridana na plochu (iOS) ma VLASTNI
               uloziste, oddelene od Safari - viz dlouhy komentar u
               checkAuthResume v screen-premiumLogin.js. Poznamka se
               ukazuje jen kdyz appka skutecne bezi jako appka na
               plose. -->
          ${(typeof msIsBrowserTab === 'function' && !msIsBrowserTab()) ? `
          <p style="font-size:9.5px;color:var(--muted);opacity:.7;line-height:1.5;margin:14px auto 0;max-width:320px">Po přihlášení tě telefon může přehodit do Safari místo zpět sem - to je normální chování appek na ploše, appka si tvoje stavby sama najde.</p>` : ''}
          <p style="text-align:center;font-size:9px;color:var(--muted);opacity:.5;margin-top:26px">Verze ${typeof MS_BUILD_VERSION !== 'undefined' ? MS_BUILD_VERSION : '?'}</p>
        </div>
      `;
      container.querySelector('#gateSignInBtn').addEventListener('click', ()=>{
        if(typeof PremiumLogin === 'undefined' || !PremiumLogin.openIdentityOnly){
          alert('Přihlášení teď není dostupné, zkus to prosím za chvíli.');
          return;
        }
        // extra { verbose:true } zajisti, ze i po navratu z presmerovani
        // (Google, cele znovunacteni appky) appka vi, ze slo o vyslovny
        // klik, a kdyz se neco nepovede, i to rekne - viz checkAuthResume.
        PremiumLogin.openIdentityOnly(()=>{ checkSessionAndDraw(); }, { verbose: true });
      });
    }

    /* ---------------------------------------------------------
       VOLBA (uz prihlaseny): zalozit vlastni stavbu, nebo zadat
       6mistny kod pozvanky. Zadne dalsi prihlasovani - branou uz
       clovek prosel v drawSignInGate() drive.
       --------------------------------------------------------- */
    function drawChoice(){
      container.innerHTML = `
        <div style="padding:calc(14px + env(safe-area-inset-top)) 16px 6px">
          ${removedProjectName ? `
            <div style="border:1.5px solid var(--accent);background:var(--card-bg);padding:14px;margin-bottom:16px;text-align:left">
              <p style="margin:0;font-size:12.5px;color:var(--text-main);line-height:1.55"><b>Projekt "${msEsc(removedProjectName)}" byl vlastníkem odstraněn.</b> Můžeš si založit vlastní stavbu níže, nebo počkat, až dostaneš jinou pozvánku.</p>
            </div>
          ` : ''}
          <p style="font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);font-weight:800;margin:0 0 4px">${isAdditional?'Nový projekt':'Poslední krok'}</p>
          <h1 style="margin:0;font-size:21px">${isAdditional?'Přidat stavbu':'Založ svůj první projekt'}</h1>
        </div>
        <div class="screen-scroll">
          <div class="field-block"><p class="f-label">Název projektu *</p><input class="f-input" id="fName" placeholder="Např. Rodinný dům"/></div>
          <div class="field-block"><p class="f-label">Místo stavby *</p><input class="f-input" id="fLocation" placeholder="Např. Malé Březno u Mostu"/></div>
        </div>
        <div style="padding:12px 16px calc(20px + env(safe-area-inset-bottom))">
          <button class="btn-primary" id="continueBtn" style="background:linear-gradient(90deg,#25e8ff,#b34cff);color:#04070f;border:0">${isAdditional?'Vytvořit projekt':'Vytvořit projekt a spustit appku'}</button>
          <div style="display:flex;align-items:center;gap:10px;margin:16px 0 12px">
            <span style="flex:1;height:1px;background:var(--line)"></span>
            <span style="font-size:10px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;font-weight:800">nebo</span>
            <span style="flex:1;height:1px;background:var(--line)"></span>
          </div>
          <button id="inviteBtn" style="width:100%;padding:13px;cursor:pointer;background:transparent;border:1.5px solid var(--accent);color:var(--accent);font-family:inherit;font-size:12.5px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:9px">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="1"/><path d="M8 12h8M8 8h8M8 16h4"/></svg>
            Mám kód pozvánky
          </button>
          ${isAdditional?'<p style="text-align:center;font-size:11px;color:var(--muted);margin-top:8px;text-decoration:underline;cursor:pointer" id="cancelLink">Zrušit a vrátit se do nastavení</p>':''}
          <p style="text-align:center;font-size:9px;color:var(--muted);opacity:.5;margin-top:14px">Verze ${typeof MS_BUILD_VERSION !== 'undefined' ? MS_BUILD_VERSION : '?'}</p>
        </div>
      `;
      if(isAdditional){
        container.querySelector('#cancelLink').addEventListener('click', ()=> Router.go('settings'));
      }

      container.querySelector('#inviteBtn').addEventListener('click', openCodeSheet);

      container.querySelector('#continueBtn').addEventListener('click', ()=>{
        const name = container.querySelector('#fName').value.trim();
        const location_ = container.querySelector('#fLocation').value.trim();
        if(!name || !location_){
          alert('Vyplň prosím název projektu a místo.');
          return;
        }
        // Typ stavby je docasne uzamceny na "Rodinny dum" (vyber Chata/Byt/
        // Rekonstrukce/apod. je schovany, viz komentar u TYPES vyse) - az se
        // bude vyber zase chtit zapnout, staci vratit typeGrid do HTML sablony.
        msCreateProject({ name, type:FIXED_TYPE, location:location_ });
        // POZOR: drive se tu automaticky nasadila cela predvolena sada etap
        // (MS_TYPE_STAGE_PRESETS['Rodinný dům']) - nova instalace tak vypadala
        // "napulku hotova". Ted novy projekt zacina bez jedine etapy a
        // uzivatel si zaklada jen ty, co doopravdy potrebuje, pres "Nová etapa".
        msSetOnboarded();
        Router.go(isAdditional ? 'dashboard' : 'tour-welcome');
      });
    }

    /* ---------------------------------------------------------
       ZADANI 6MISTNEHO KODU (14.8.2026) - nahrazuje puvodni prompt().
       Vlastni maly overlay s ciselnym polem misto prohlizecoveho
       dialogu - konzistentni se zbytkem appky, jde na nem videt
       chybova hlaska primo v kontextu (ne dalsim alertem navic).
       Odkaz s tokenem v URL uz appka pri pozvani neposila (viz
       showInviteDialog), ale kdyby nekdo mel starsi pozvanku nebo si
       zvykl vkladat cely odkaz, appka ho pozna a pouzije rovnou.
       --------------------------------------------------------- */
    function openCodeSheet(){
      const overlay = document.createElement('div');
      overlay.className = 'ms-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:85;display:flex;align-items:flex-end;justify-content:center;padding:0 10px calc(10px + min(env(safe-area-inset-bottom),34px))';
      overlay.innerHTML = `
        <div class="ms-sheet" style="width:100%;max-width:460px">
          <div style="background:var(--card-bg-2);border:1px solid var(--line);border-left:3px solid var(--accent);padding:18px 16px">
            <b style="display:block;font-size:14px;font-family:var(--font-head);margin-bottom:4px">Zadej kód pozvánky</b>
            <p style="margin:0 0 14px;font-size:11.5px;color:var(--muted);line-height:1.5">Šest číslic, které ti poslal majitel stavby.</p>
            <input class="f-input" id="codeInput" inputmode="numeric" maxlength="7" placeholder="123 456" style="text-align:center;font-size:22px;letter-spacing:.14em;font-weight:800;margin-bottom:6px"/>
            <p id="codeErr" style="margin:0 0 12px;font-size:11px;color:#ff6b6b;min-height:14px"></p>
            <button id="codeGoBtn" style="width:100%;padding:13px;font-weight:800;font-size:13px;background:linear-gradient(90deg,#25e8ff,#b34cff);color:#04070f;border:0;cursor:pointer;font-family:inherit">Potvrdit →</button>
          </div>
          <button class="ms-sheet-cancel" id="codeCancelBtn">Zrušit</button>
        </div>`;
      document.body.appendChild(overlay);
      const close = ()=>{ try{ document.body.removeChild(overlay); }catch(_){} };
      overlay.addEventListener('click', (e)=>{ if(e.target === overlay) close(); });
      overlay.querySelector('#codeCancelBtn').addEventListener('click', close);

      const input = overlay.querySelector('#codeInput');
      const errEl = overlay.querySelector('#codeErr');
      input.addEventListener('input', ()=>{
        // Automaticke formatovani "123 456" jak se pise - jen kosmeticke,
        // odesila se ocistene na same cislice.
        const cislice = input.value.replace(/[^0-9]/g, '').slice(0,6);
        input.value = cislice.length > 3 ? cislice.slice(0,3) + ' ' + cislice.slice(3) : cislice;
      });
      setTimeout(()=> input.focus(), 50);

      async function potvrdit(){
        const text = input.value.trim();
        // Kdyby si nekdo zvykl vkladat cely odkaz ze starsi pozvanky.
        const m = text.match(/[?&]token=([^&\s]+)/);
        if(m){ close(); Router.go('prijmout-pozvanku', { token: decodeURIComponent(m[1]) }); return; }

        const cislice = text.replace(/[^0-9]/g, '');
        if(cislice.length !== 6){ errEl.textContent = 'Kód má přesně 6 číslic.'; return; }

        errEl.textContent = '';
        const btn = overlay.querySelector('#codeGoBtn');
        btn.disabled = true; btn.textContent = 'Ověřuji…';
        const res = await MSCloud.resolveInviteCode(cislice);
        if(res.error){
          btn.disabled = false; btn.textContent = 'Potvrdit →';
          errEl.textContent = res.error;
          return;
        }
        close();
        Router.go('prijmout-pozvanku', { token: res.token });
      }
      overlay.querySelector('#codeGoBtn').addEventListener('click', potvrdit);
      input.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') potvrdit(); });
    }
  }
  return { render };
})();
Router.register('onboarding-project', OnboardingProjectScreen);
