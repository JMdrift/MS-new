/* ==========================================================
   ZAMEK APPKY - Face ID / bez zamku.
   Skutecne biometricke overovani (system se zepta na Face ID a jako
   zalohu nabidne kod telefonu) jde spolehlive napojit az v nativne
   zabalene appce - viz diskuze o formatu appky. Zatim tahle obrazovka
   jen uklada volbu uzivatele pres msSetAppLock(), aby uz UI a tok byly
   hotove a napojeni pribylo pozdeji bez zmeny toku.

   Dve pouziti:
   - povinne na konci uvodniho pruvodce (params.fromTour=true) -> po volbe
     jde na dashboard a pruvodce se ukonci
   - kdykoli pozdeji z Nastaveni (bez parametru) -> po volbe se vrati zpet
     do Nastaveni
   ========================================================== */
const AppLockScreen = (function(){
  function render(container, params){
    const fromTour = params && params.fromTour;
    const current = msGetAppLock();

    container.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:28px 22px calc(24px + env(safe-area-inset-bottom))">
        <div style="width:72px;height:72px;border:1px solid var(--accent);color:var(--accent);display:grid;place-items:center;margin:0 auto 22px">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><rect x="3" y="4" width="18" height="17" rx="2"/></svg>
        </div>
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);font-weight:800;margin:0 0 6px;text-align:center">Zabezpečení</p>
        <h1 style="margin:0 0 8px;font-size:21px;text-align:center">Zamkni appku</h1>
        <p style="margin:0 0 26px;font-size:13px;color:var(--muted);line-height:1.5;text-align:center">Jsou tu rozpočty, faktury i osobní poznámky k projektu - doporučujeme appku zamknout. Kdykoli později jde změnit v Nastavení.</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn-primary" id="lockFaceIdBtn" style="display:flex;align-items:center;justify-content:center;gap:8px">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4"/><path d="M9 10v1a3 3 0 0 0 6 0v-1"/></svg>
            Zamknout Face ID
          </button>
          <button class="btn-ghost" id="lockNoneBtn">Bez zámku</button>
        </div>
        <p style="margin:16px 0 0;font-size:10.5px;color:var(--muted);text-align:center">Face ID selže → appka nabídne kód telefonu, stejně jako ostatní appky.</p>
      </div>
    `;

    function choose(mode){
      msSetAppLock(mode);
      if(fromTour){ Tour.finish(); Router.go('dashboard'); }
      else { Router.go('settings'); }
    }
    container.querySelector('#lockFaceIdBtn').addEventListener('click', ()=> choose('faceid'));
    container.querySelector('#lockNoneBtn').addEventListener('click', ()=> choose('none'));

    return { showNav:false };
  }
  return { render };
})();
Router.register('app-lock-setup', AppLockScreen);
