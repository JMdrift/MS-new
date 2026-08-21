/* ==========================================================
   PROJEKT (spravce dokumentu) - 1.8.2026, prestavba na plochou
   strukturu se stalymi ID slozek (misto hledani podle jmena/cesty).
   Slozky zaklada/mate/mize jen VLASTNIK, soubory pridavaji OBA
   smery obousmerne. Tenhle system se ted pouziva i pro Nabidky a
   Dulezite (kazde zvlast pro kazdou etapu, viz params.scope).
   "Dokumenty etap" ma vlastni, oddeleny rezim (kdyz je stage bez
   scope) - nezmeneno, pouziva msDocuments()/msAddDocument(), kvuli
   propojeni na frontu do deniku a export PDF.
   ========================================================== */
const ProjectScreen = (function(){
  /* Ikona souboru. (13.8.2026) Byla uvnitr renderFolders, takze na ni
     dokumenty etapy nedosahly - stejna past jako u konstanty na
     Dashboardu. Ted stoji nad obema obrazovkami. */
  function fileIconSvg(mime, color){
    if(mime === 'application/pdf'){
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8"><path d="M6 3h9l3 3v15H6z"/><text x="6" y="13" font-size="5.5" fill="${color}" stroke="none" font-weight="800">PDF</text></svg>`;
    }
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8"><path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6"/></svg>`;
  }

  function render(container, params){
    const scope = (params && params.scope) || ((params && params.stage) ? 'dokumenty' : 'projekt');
    if(scope === 'dokumenty' && params.stage) return renderStageDocs(container, params);
    return renderFolders(container, params, scope);
  }

  /* -------------------- REZIM: Dokumenty konkretni etapy -------------------- */
  function renderStageDocs(container, params){
    const s = msStageByKey(params.stage);
    const activeProjectsSD = msLoadProjects();
    const activeProjectSD = activeProjectsSD.find(p=>p.id===msGetActiveProjectId());
    const isOwnerSD = !(activeProjectSD && activeProjectSD.isShared);
    const canAddHereSD = (typeof msCanAddSection === 'function') ? msCanAddSection('etapy') : true;
    // Slozky pro dokumenty etapy (14.8.2026): dokumenty samotne zustavaji
    // na msDocuments() (viz komentar nahore v souboru), ale slozky, do
    // kterych se daji zaradit, jsou ze STEJNE sdilene tabulky, jakou uz
    // pouzivaji Nabidky a Dulezite - jen s vlastnim scope 'etapa'.
    let pathStackSD = []; // {id, name} od korene dolu
    function currentFolderIdSD(){ return pathStackSD.length ? pathStackSD[pathStackSD.length-1].id : null; }
    container.innerHTML = `
      <div class="topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <h1 id="pathTitleSD">${s ? s.name : 'Dokumenty'}</h1>
        <div style="width:34px"></div>
      </div>
      <div class="screen-scroll">
        <!-- ZMENA (11.8.2026): drive byla jedna mrizka 3x pro slozky i
             soubory dohromady. Fotka v ni mela ctvercovy nahled pres
             celou sirku dlazdice, takze ROZTAHLA cely radek a vedle ni
             zustalo prazdno; dlouhe nazvy se navic v tretine sirky
             orezaly na "Souhrnná technická ...". Ted maji slozky
             vlastni mrizku (dve v radku, at se nazev vejde) a soubory
             jsou seznam s pevnou vyskou radku - fotka i PDF vypadaji
             stejne velke a na nazev je cela sirka. -->
        <div id="emptyWrap"></div>
        <div id="foldersWrap" style="margin-bottom:14px"></div>
        <div id="filesWrap" style="margin-bottom:12px"></div>
        <div id="grid" style="display:none"></div>
        ${canAddHereSD ? `<div>
          <p class="f-label">Přidat poznámku (uloží se jako soubor)</p>
          <div style="display:flex;gap:8px">
            <input class="f-input" id="noteInput" placeholder="Napiš poznámku…" style="flex:1"/>
            <button id="noteSaveBtn" style="flex:0 0 auto;border:1px solid var(--line);background:transparent;color:#fff;padding:0 14px;border-radius:var(--radius);cursor:pointer;font-weight:800">Uložit</button>
          </div>
        </div>` : ''}
      </div>
      <input type="file" id="fileInput" multiple style="display:none"/>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=>{
      if(pathStackSD.length>0){ pathStackSD.pop(); draw(); }
      else Router.back();
    });
    let clickTargets = [], deleteTargets = [], renameTargets = [], shareTargets = [], moveTargets = [];
    function tile(name, sub, mime, onClick, onDelete, author, onRename, onShare){
      const idx = clickTargets.length;
      clickTargets.push(onClick); deleteTargets.push(onDelete); renameTargets.push(onRename||null); shareTargets.push(onShare||null);
      const isPdf = mime === 'application/pdf';
      const color = isPdf ? 'var(--add-color)' : '#94a0bc';
      const borderColor = isPdf ? 'var(--add-color)' : 'color-mix(in srgb, var(--muted) 75%, transparent)';
      const authorBadge = (author && author!=='Stavebník') ? `<span style="display:block;margin-top:4px;border:1px solid #25b7ff;color:#25b7ff;padding:1px 6px;font-size:8.5px;font-weight:700;max-width:100%;margin-left:auto;margin-right:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box">👤 ${author.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span>` : '';
      return `<div class="tile-item" data-idx="${idx}" style="position:relative;border:1.5px solid ${borderColor};padding:9px 6px;text-align:center;cursor:${onClick?'pointer':'default'};min-width:0">
        ${(onDelete||onRename||onShare) ? `<span class="tile-menu" data-idx="${idx}" style="position:absolute;top:3px;right:3px;width:20px;height:20px;border:1px solid var(--line);border-radius:var(--radius);display:grid;place-items:center;color:var(--muted);cursor:pointer;background:var(--card-bg-2)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>
        </span>` : ''}
        <span class="tile-visual"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8">${isPdf ? `<path d="M6 3h9l3 3v15H6z"/><text x="6" y="13" font-size="5.5" fill="${color}" stroke="none" font-weight="800">PDF</text>` : '<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6"/>'}</svg></span>
        <b style="display:block;margin-top:5px;font-size:10.5px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(name)}</b>
        <span style="font-size:9.5px;color:var(--muted)">${msEsc(sub)}</span>
        ${authorBadge}
      </div>`;
    }
    /* ZMENA (11.8.2026): tuzka a kos primo na dlazdici zabiraly misto,
       daly se snadno trefit omylem a u malych dlazdic se do rohu spatne
       mirilo. Ted je misto nich jedna nabidka pod tremi teckami.
       Vzhled: puvodne to byl holy seznam radku s carami pres celou
       sirku - pusobil jako tabulka. Ted ma kazda volba ikonu, "Zrusit"
       stoji odsazene zvlast a v hlavicce je ikona te konkretni polozky,
       prevzata primo z dlazdice - nabidka tak navazuje na to, na co
       clovek klepnul. */
    function openTileMenu(idx, anchorName, anchorSub, visualHtml){
      const onRename = renameTargets[idx];
      const onDelete = deleteTargets[idx];
      const onShare  = (typeof shareTargets !== 'undefined') ? shareTargets[idx] : null;
      const onMove   = (typeof moveTargets !== 'undefined') ? moveTargets[idx] : null;
      const overlay = document.createElement('div');
      overlay.className = 'ms-overlay ms-sheet-backdrop';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:80;display:flex;align-items:flex-end;justify-content:center;padding:0 10px calc(10px + min(env(safe-area-inset-bottom),34px))';

      const ICON = {
        share: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 14v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/></svg>',
        ren:   '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
        del:   '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7"/><path d="M10 11v6M14 11v6"/></svg>',
        mov:   '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="1"/><path d="M3 7l2-3h6l2 3"/><path d="M12 12v5M9.5 14.5L12 12l2.5 2.5"/></svg>'
      };
      // ZMENA (11.8.2026): misto radku pod sebou (pusobilo jako seznam)
      // jsou akce vedle sebe jako tlacitka - stejny tvar a rec jako
      // dlazdice v samotnem Projektu, jen s ikonou nad popiskem.
      const btn = (id, label, cls)=>
        `<button class="ms-sheet-btn ${cls||''}" data-id="${id}">${ICON[id]||''}<span>${label}</span></button>`;

      overlay.innerHTML = `
        <div class="ms-sheet" style="width:100%;max-width:460px">
          <div style="background:var(--card-bg-2);border:1px solid var(--line);border-left:3px solid var(--accent)">
            <div style="display:flex;align-items:center;gap:11px;padding:13px 16px;border-bottom:1px solid var(--line)">
              <div class="ms-sheet-visual" style="width:38px;height:38px;flex:0 0 38px;border:1px solid var(--line);display:grid;place-items:center;overflow:hidden;background:var(--card-bg)">${visualHtml||''}</div>
              <div style="min-width:0;flex:1">
                <b style="display:block;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(anchorName || '')}</b>
                <span style="font-size:10.5px;color:var(--muted)">${msEsc(anchorSub || '')}</span>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(${[onShare,onMove,onRename,onDelete].filter(Boolean).length},minmax(0,1fr));gap:8px;padding:12px">
              ${onShare ? btn('share','Sdílet','is-share') : ''}
              ${onMove ? btn('mov','Přesunout') : ''}
              ${onRename ? btn('ren','Přejmenovat') : ''}
              ${onDelete ? btn('del','Smazat','is-del') : ''}
            </div>
          </div>
          <button class="ms-sheet-cancel" id="sheetCancel">Zrušit</button>
        </div>`;
      document.body.appendChild(overlay);
      const close = ()=>{ try{ document.body.removeChild(overlay); }catch(_){} };
      overlay.addEventListener('click', (e)=>{ if(e.target === overlay) close(); });
      overlay.querySelector('#sheetCancel').addEventListener('click', close);
      overlay.querySelectorAll('.ms-sheet-btn').forEach(r=>{
        r.addEventListener('click', async ()=>{
          const id = r.dataset.id;
          close();
          if(id === 'share' && onShare) onShare();
          else if(id === 'mov' && onMove) onMove();
          else if(id === 'ren' && onRename) onRename();
          else if(id === 'del' && onDelete){
            if(!await Layout.confirmDialog('Smazat tuhle položku? Nedá se to vrátit zpět.', 'Smazat')) return;
            onDelete();
          }
        });
      });
    }

    function bindTileClicks(){
      container.querySelectorAll('.tile-item').forEach(el=>{
        const idx = Number(el.dataset.idx);
        el.addEventListener('click', (e)=>{ if(e.target.closest('.tile-menu')) return; const fn = clickTargets[idx]; if(fn) fn(); });
      });
      container.querySelectorAll('.tile-menu').forEach(el=>{
        el.addEventListener('click', (e)=>{
          e.stopPropagation();
          const idx = Number(el.dataset.idx);
          const tileEl = el.closest('.tile-item');
          const nameEl = tileEl ? tileEl.querySelector('b') : null;
          const subEl = tileEl ? tileEl.querySelector('b + span') : null;
          const visEl = tileEl ? tileEl.querySelector('.tile-visual') : null;
          openTileMenu(idx,
            nameEl ? nameEl.textContent : '',
            subEl ? subEl.textContent : '',
            visEl ? (visEl.innerHTML || visEl.outerHTML) : '');
        });
      });
    }
    /* OPRAVA (13.8.2026): tahle obrazovka kreslila do #grid - jenze pri
       prepracovani Projektu se obsah rozdelil do #foldersWrap a
       #filesWrap a #grid dostal display:none. Dokumenty etapy tim
       zmizely uplne VCETNE tlacitka "+", takze slo pridat uz jen
       poznamku (ta ma vlastni pole mimo mrizku). Ted se kresli do
       #filesWrap a vypada stejne jako soubory v Projektu - radek s
       nahledem, nazvem a nabidkou pod teckami.
       Slozky tady zamerne nejsou: dokumenty etapy jsou ploche a pro
       jednu etapu to staci. */
    function draw(){
      clickTargets = []; deleteTargets = []; renameTargets = []; shareTargets = []; moveTargets = [];
      const foldersWrap = container.querySelector('#foldersWrap');
      const filesWrap = container.querySelector('#filesWrap');
      const emptyWrap = container.querySelector('#emptyWrap');
      const cil = currentFolderIdSD();

      // Nadpis sleduje, kde v hierarchii slozek prave jsme - stejny
      // princip jako v Projektu (pathTitle).
      const titleEl = container.querySelector('#pathTitleSD');
      if(titleEl) titleEl.textContent = pathStackSD.length ? pathStackSD[pathStackSD.length-1].name : (s ? s.name : 'Dokumenty');

      const vsechnySlozky = msLoadProjectFolders().filter(f=> f.scope==='etapa' && f.stageKey===params.stage);
      const slozky = vsechnySlozky.filter(f=> (f.parentId||null) === cil);
      const docs = msDocuments().filter(d=> d.stage===params.stage && (d.folderId||null) === cil);

      foldersWrap.innerHTML = '';
      if(slozky.length){
        let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">';
        slozky.forEach(f=>{
          const pocet = vsechnySlozky.filter(x=>x.parentId===f.id).length + msDocuments().filter(d=>d.stage===params.stage && d.folderId===f.id).length;
          html += folderTile(f, pocet);
        });
        html += '</div>';
        foldersWrap.innerHTML = html;
      }

      filesWrap.innerHTML = '';
      emptyWrap.innerHTML = '';
      if(docs.length){
        let html = '<div style="display:flex;flex-direction:column;gap:6px">';
        docs.forEach(d=>{ html += docRow(d); });
        html += '</div>';
        filesWrap.innerHTML = html;
      } else if(!slozky.length){
        emptyWrap.innerHTML = `<p style="font-size:11.5px;color:var(--muted);line-height:1.55;margin:4px 0 14px">
          Zatím tu nic není. Přidej revizi, protokol, fotku nebo poznámku k téhle etapě.</p>`;
      }

      if(canAddHereSD){
        const addIdx = clickTargets.length;
        // OPRAVA (14.8.2026): drive tu byly DVA oddelene ovladaci prvky
        // (dlazdice "Přidat soubor" + tichy textovy odkaz "+ Nová
        // složka" pod ni) - v Projektu je to jedno tlacitko s nabidkou
        // (soubor/poznamka/slozka). Sjednoceno na stejny vzor, at
        // appka vypada a chova se konzistentne na obou mistech.
        clickTargets.push(()=> onAddClickSD());
        deleteTargets.push(null); renameTargets.push(null); shareTargets.push(null); moveTargets.push(null);
        filesWrap.innerHTML += `<div class="tile-item" data-idx="${addIdx}" style="border:1.5px dashed var(--add-color);padding:12px;margin-top:8px;text-align:center;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--add-color)" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          <b style="font-size:11.5px;color:var(--add-color)">Přidat soubor nebo složku</b>
        </div>`;
      }
      bindTileClicks();
    }

    /* Sjednocena nabidka (14.8.2026) - stejny tvar jako addSheet() v
       Projektu. Poznamka tu zustava (byla tu uz drive, jen jako
       samostatne pole na obrazovce - to zustava pro rychle psani beze
       zmeny, tohle je jen DALSI cesta ke stejne akci). */
    function addSheetSD(){
      return new Promise(resolve=>{
        const overlay = document.createElement('div');
        overlay.className = 'ms-overlay'; overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,4,10,.7);z-index:60;display:flex;align-items:flex-end;justify-content:center';
        overlay.innerHTML = `
          <div style="width:100%;max-width:480px;background:var(--card-bg-2);border-top:1px solid var(--line);padding:14px 16px calc(16px + env(safe-area-inset-bottom))">
            <div class="mi" data-c="files" style="display:flex;align-items:center;gap:10px;padding:11px 4px;cursor:pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6"/></svg>
              <b style="font-size:12.5px">Nahrát soubory / fotky</b><span style="font-size:9.5px;color:var(--muted);margin-left:auto">jde vybrat víc najednou</span>
            </div>
            <div class="mi" data-c="note" style="display:flex;align-items:center;gap:10px;padding:11px 4px;border-top:1px solid var(--line);cursor:pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
              <b style="font-size:12.5px">Přidat poznámku</b>
            </div>
            ${isOwnerSD ? `<div class="mi" data-c="newFolder" style="display:flex;align-items:center;gap:10px;padding:11px 4px;border-top:1px solid var(--line);cursor:pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
              <b style="font-size:12.5px">Založit složku</b>
            </div>` : ''}
            <button id="sheetCloseSD" style="width:100%;margin-top:10px;border:1px solid var(--line);background:transparent;color:var(--muted);padding:9px;font-size:12px;font-weight:700;cursor:pointer;border-radius:var(--radius)">Zrušit</button>
          </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#sheetCloseSD').addEventListener('click', ()=>{ document.body.removeChild(overlay); resolve(null); });
        overlay.querySelectorAll('.mi').forEach(el=>{
          el.addEventListener('click', ()=>{ document.body.removeChild(overlay); resolve(el.dataset.c); });
        });
      });
    }
    async function onAddClickSD(){
      const choice = await addSheetSD();
      if(choice === 'files') container.querySelector('#fileInput').click();
      else if(choice === 'note'){
        const input = container.querySelector('#noteInput');
        if(input) input.focus();
      } else if(choice === 'newFolder'){
        const name = prompt('Název nové složky:');
        if(!name || !name.trim()) return;
        msAddProjectFolder(name.trim(), currentFolderIdSD(), 'etapa', params.stage);
        draw();
      }
    }

    /* Dlazdice slozky - stejny vzhled jako v Projektu (barevny ramecek
       se zari), jen mensi sada akci (prejmenovat/smazat, zadne sdileni -
       slozka sama o sobe nejde "sdilet"). */
    function folderTile(f, pocet){
      const idx = clickTargets.length;
      clickTargets.push(()=>{ pathStackSD.push({id:f.id, name:f.name}); draw(); });
      deleteTargets.push(isOwnerSD ? ()=>{ msDeleteProjectFolder(f.id); draw(); } : null);
      renameTargets.push(isOwnerSD ? ()=>{
        const name = prompt('Nový název složky:', f.name);
        if(!name || !name.trim()) return;
        msRenameProjectFolder(f.id, name.trim());
        draw();
      } : null);
      shareTargets.push(null); moveTargets.push(null);
      return `<div class="tile-item folder-tile" data-idx="${idx}" style="position:relative;border:1.5px solid var(--folder-color);background:var(--card-bg);box-shadow:0 0 14px -4px color-mix(in srgb, var(--folder-color) 60%, transparent);padding:9px 6px;text-align:center;cursor:pointer;min-width:0">
        <span class="tile-menu" data-idx="${idx}" style="position:absolute;top:3px;right:3px;width:20px;height:20px;border:1px solid var(--line);display:grid;place-items:center;color:var(--muted);cursor:pointer;background:var(--card-bg-2)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>
        </span>
        <div class="tile-visual" style="height:20px;display:flex;align-items:center;justify-content:center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--folder-color)" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="1"/><path d="M3 7l2-3h6l2 3"/></svg></div>
        <b style="display:block;margin-top:5px;font-size:10.5px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(f.name)}</b>
        <span style="font-size:9.5px;color:var(--muted)">${pocet} ${pocet===1?'položka':(pocet<5?'položky':'položek')}</span>
      </div>`;
    }

    /* Radek dokumentu - stejny tvar jako soubory v Projektu, aby se obe
       obrazovky chovaly a vypadaly stejne. */
    function docRow(d){
      const idx = clickTargets.length;
      clickTargets.push(d.isNote ? ()=>editNote(d) : ()=>openDocContent(d));
      deleteTargets.push(isOwnerSD ? ()=>{ msDeleteDocument(d.id); draw(); } : null);
      renameTargets.push((isOwnerSD && !d.isNote) ? ()=>renameDoc(d) : null);
      shareTargets.push((!d.isNote && msCanExportContent()) ? ()=>shareDocFromMenu(d) : null);
      // Presun do slozky (14.8.2026) - jen vlastnik, jen kdyz v etape
      // uz aspon jedna slozka existuje (jinak neni kam presouvat).
      const maSlozky = msLoadProjectFolders().some(f=> f.scope==='etapa' && f.stageKey===params.stage);
      moveTargets.push((isOwnerSD && maSlozky) ? ()=> pickFolderSheetSD(d) : null);

      const isImage = d.mime && d.mime.startsWith('image/');
      const isPdf = d.mime === 'application/pdf';
      const thumbUrl = isImage ? MS_BLOB_CACHE.get(msBlobKey('doc', d.id)) : null;
      const barva = d.isNote ? 'var(--muted)' : (isPdf ? 'var(--add-color)' : '#94a0bc');
      const vizual = thumbUrl
        ? `<div class="tile-visual" style="width:100%;height:100%;background:url(${thumbUrl}) center/cover"></div>`
        : `<div class="tile-visual" style="display:grid;place-items:center;color:${barva}">${d.isNote
            ? '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h14v16l-4-3-3 3-3-3-4 3z"/></svg>'
            : fileIconSvg(d.mime, barva)}</div>`;
      const popis = d.isNote ? 'poznámka'
        : (d.author && d.author !== 'Stavebník' ? d.author : (d.date || (isPdf ? 'PDF' : (isImage ? 'fotka' : 'soubor'))));

      return `<div class="tile-item" data-idx="${idx}" style="display:flex;align-items:center;gap:11px;border:1px solid var(--line);border-left:2px solid ${barva};background:var(--card-bg);padding:9px 10px;cursor:pointer">
        <div style="width:42px;height:42px;flex:0 0 42px;border:1px solid var(--line);overflow:hidden;background:var(--card-bg-2)">${vizual}</div>
        <div style="flex:1;min-width:0">
          <b style="display:block;font-size:12px;color:#fff;line-height:1.3;word-break:break-word">${msEsc(d.name)}</b>
          <span style="font-size:10px;color:var(--muted)">${msEsc(popis)}</span>
        </div>
        <span class="tile-menu" data-idx="${idx}" style="flex:0 0 26px;width:26px;height:26px;display:grid;place-items:center;color:var(--muted);cursor:pointer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>
        </span>
      </div>`;
    }
    /* Vyber cilove slozky pro presun dokumentu (14.8.2026). Zamerne
       plochy seznam vsech slozek v ramci teto etapy (ne strom) - u
       dokumentu jedne etapy jich bude malo, plna navigace by tu byla
       zbytecna prekazka navic. */
    function pickFolderSheetSD(d){
      const vsechnySlozky = msLoadProjectFolders().filter(f=> f.scope==='etapa' && f.stageKey===params.stage);
      const overlay = document.createElement('div');
      overlay.className = 'ms-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:82;display:flex;align-items:flex-end;justify-content:center';
      const radek = (id, name, aktivni)=> `<div class="dd-item${aktivni?' is-active':''}" data-folder="${id||''}">${msEsc(name)}</div>`;
      overlay.innerHTML = `
        <div class="ms-sheet" style="width:100%;max-width:460px;padding:0 10px calc(10px + min(env(safe-area-inset-bottom),34px))">
          <div class="dd-panel open" data-sheet-title="Přesunout do složky" style="position:static;transform:none;max-height:60vh;overflow:auto">
            ${radek(null, 'Bez složky (kořen)', !d.folderId)}
            ${vsechnySlozky.map(f=> radek(f.id, f.name, d.folderId===f.id)).join('')}
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const close = ()=>{ try{ document.body.removeChild(overlay); }catch(_){} };
      overlay.addEventListener('click', (e)=>{ if(e.target === overlay) close(); });
      overlay.querySelectorAll('.dd-item').forEach(el=>{
        el.addEventListener('click', ()=>{
          const cil = el.dataset.folder || null;
          close();
          if(msMoveDocument(d.id, cil)) draw();
        });
      });
    }

    function editNote(d){
      const text = prompt('Upravit poznámku:', d.name.replace(/^Poznámka: /,''));
      if(text===null) return;
      msUpdateDocument(d.id, { name:'Poznámka: '+text.trim() });
      draw();
    }
    function renameDoc(d){
      const name = prompt('Přejmenovat dokument:', d.name);
      if(!name || !name.trim()) return;
      msUpdateDocument(d.id, { name: name.trim() });
      draw();
    }
    async function openDocContent(d){
      const key = msBlobKey('doc', d.id);
      let dataUrl = MS_BLOB_CACHE.get(key);
      if(!dataUrl){ try{ dataUrl = await msIdbGet(key); if(dataUrl) MS_BLOB_CACHE.set(key, dataUrl); }catch(e){} }
      if(!dataUrl){ alert('Obsah souboru se nepodařilo najít - zkus appku načíst znovu.'); return; }
      if(d.mime && d.mime.startsWith('image/')){
        // Stejny duvod jako u souboru v Projektu (11.8.2026) - obrazek
        // sel jen zobrazit, ne priblizit.
        msPhotoLightbox([dataUrl], 0, msCanExportContent() ? { label: 'Sdílet', onClick: ()=>shareDocFromMenu(d) } : null);
        return;
      }
      try{
        const [meta, b64] = dataUrl.split(',');
        const mime = (meta.match(/data:(.*);base64/)||[])[1] || d.mime || 'application/octet-stream';
        const bytes = atob(b64);
        const arr = new Uint8Array(bytes.length);
        for(let i=0;i<bytes.length;i++) arr[i] = bytes.charCodeAt(i);
        const blob = new Blob([arr], {type: mime});
        window.open(URL.createObjectURL(blob), '_blank');
      }catch(e){ alert('Tenhle typ souboru appka zatím neumí otevřít přímo.'); }
    }
    // OPRAVA (14.8.2026): tahle funkce kreslila fotku primo na canvas
    // bez cteni EXIF orientace - fotka vyfocena na vysku vysla na bok
    // nebo vzhuru nohama (stejna chyba, jakou uz appka opravila u
    // pridavani fotek do zapisu deniku). msResizeImageFile v data.js uz
    // EXIF cte a otoci spravne.
    function readAsDataURL(file){
      return new Promise(resolve=>{
        if(!file.type.startsWith('image/')){
          const reader = new FileReader();
          reader.onload = ()=> resolve(reader.result);
          reader.onerror = ()=> resolve(null);
          reader.readAsDataURL(file);
          return;
        }
        msResizeImageFile(file, 1400, 0.75).then(resolve).catch(()=> resolve(null));
      });
    }
    // (14.8.2026) Puvodni jednoduche "zpet vzdy na Etapy" uz nahrazuje
    // handler s pathStackSD pridany vyse - tenhle druhy by se spoustel
    // SOUBEZNE s nim (addEventListener druhy posluchac neprepise, jen
    // prida) a pri prochazeni slozkami by "zpet" udelalo dva kroky
    // najednou (o slozku vys a hned pak i z cele obrazovky).
    container.querySelector('#fileInput').addEventListener('change', async (e)=>{
      const files = [...e.target.files];
      const items = await Promise.all(files.map(async f=> ({ name:f.name, mime:f.type||null, content: await readAsDataURL(f) })));
      const saved = await Promise.all(items.map(it=> msAddDocument({ name: it.name, stage: params.stage, content: it.content||null })));
      const savedIds = saved.filter(Boolean).map(x=>x.id);
      draw();
      e.target.value = '';
      if(savedIds.length) Layout.showSuccess(savedIds.length === 1 ? 'Dokument přidán' : `Přidáno ${savedIds.length} dokumentů`);
      // (14.8.2026) Uz se neptame, jestli soubor "nabidnout k dalsimu
      // zapisu" - dokument jde pripojit k zapisu primo pri jeho psani,
      // vyberem z existujiciho obsahu. Viz zruseni "Připravit pro další
      // zápis" ve screen-forms.js.
    });
    const noteSaveBtnSD = container.querySelector('#noteSaveBtn');
    if(noteSaveBtnSD){
      noteSaveBtnSD.addEventListener('click', ()=>{
        const input = container.querySelector('#noteInput');
        const text = input.value.trim();
        if(!text) return;
        msAddDocument({ name:'Poznámka: '+text, stage: params.stage, isNote:true });
        input.value = '';
        draw();
        Layout.showSuccess('Poznámka přidána');
      });
    }
    draw();
    return { activeTab:'project' };
  }

  /* -------------------- REZIM: Obecne slozky "Projekt" -------------------- */
  function renderFolders(container, params, scope){
    scope = scope || 'projekt';
    const stageKey = (scope !== 'projekt') ? (params.stage || null) : null;
    const stageInfo = stageKey ? msStageByKey(stageKey) : null;
    const scopeTitles = { projekt:'Projekt', nabidky:'Nabídky', dulezite:'Důležité' };
    const screenTitle = scopeTitles[scope] || 'Projekt';

    const activeProjects = msLoadProjects();
    const activeProject = activeProjects.find(p=>p.id===msGetActiveProjectId());
    const isOwner = !(activeProject && activeProject.isShared);
    // Prava (1.8.2026): "muze zakladat slozky" zustava vzdy jen vlastnik
    // (nemenime), ale "muze pridavat soubory/poznamky" uz zavisi na
    // prideleni prava pro danou sekci (Projekt/Etapy).
    const sectionForRights = scope==='projekt' ? 'projekt' : 'etapy';
    const canAddHere = (typeof msCanAddSection === 'function') ? msCanAddSection(sectionForRights) : true;

    // Jednorazovy bootstrap: vlastnik bez jedine slozky v "Projekt"
    // (scope korenu, ne pri kazde etape) dostane pripravenou uvodni
    // slozku "Projekt", at nezacina na uplne prazdno. Nabidky/Dulezite
    // pro konkretni etapu uz kontext maji (nazev etapy v nadpisu),
    // zadnou dalsi wrapper slozku navic nepotrebuji. Pozvany zadnou
    // slozku sam nezaklada - pockaji, az mu to prijde sdilenim.
    if(scope==='projekt' && isOwner && msLoadProjectFolders().filter(f=>f.scope==='projekt').length===0){
      msAddProjectFolder('Projekt', null, 'projekt', null);
    }

    let pathStack = []; // pole {id, name} od korene dolu

    container.innerHTML = `
      <div class="topbar">
        <div class="back-btn" id="backBtn" style="visibility:${scope==='projekt'?'hidden':'visible'}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <h1 id="pathTitle">${screenTitle}${stageInfo ? ' – '+stageInfo.name : ''}</h1>
        <div style="width:34px"></div>
      </div>
      <div class="screen-scroll">
        <div id="statsRow" style="display:${scope==='projekt'?'grid':'none'};grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
          <div class="proj-stat" data-field="landArea" style="border:1px solid var(--line);background:var(--card-bg);border-radius:var(--radius);padding:9px 6px;text-align:center;cursor:pointer">
            <span style="display:block;font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Pozemek</span>
            <b id="statLand" style="display:block;font-size:12.5px;color:#fff;margin-top:3px">Doplnit</b>
          </div>
          <div class="proj-stat" data-field="type" style="border:1px solid var(--line);background:var(--card-bg);border-radius:var(--radius);padding:9px 6px;text-align:center;cursor:pointer">
            <span style="display:block;font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Typ domu</span>
            <b id="statType" style="display:block;font-size:12.5px;color:#fff;margin-top:3px">Doplnit</b>
          </div>
          <div class="proj-stat" data-field="builtArea" style="border:1px solid var(--line);background:var(--card-bg);border-radius:var(--radius);padding:9px 6px;text-align:center;cursor:pointer">
            <span style="display:block;font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Užitná pl.</span>
            <b id="statBuilt" style="display:block;font-size:12.5px;color:#fff;margin-top:3px">Doplnit</b>
          </div>
        </div>
        <!-- ZMENA (11.8.2026): drive byla jedna mrizka 3x pro slozky i
             soubory dohromady. Fotka v ni mela ctvercovy nahled pres
             celou sirku dlazdice, takze ROZTAHLA cely radek a vedle ni
             zustalo prazdno; dlouhe nazvy se navic v tretine sirky
             orezaly na "Souhrnná technická ...". Ted maji slozky
             vlastni mrizku (dve v radku, at se nazev vejde) a soubory
             jsou seznam s pevnou vyskou radku - fotka i PDF vypadaji
             stejne velke a na nazev je cela sirka. -->
        <div id="emptyWrap"></div>
        <div id="foldersWrap" style="margin-bottom:14px"></div>
        <div id="filesWrap" style="margin-bottom:12px"></div>
        <div id="grid" style="display:none"></div>
      </div>
      <input type="file" id="fileInput" multiple style="display:none"/>
    `;

    const meta = msProjectMeta ? msProjectMeta() : {};
    container.querySelector('#statLand').textContent = meta.landArea ? meta.landArea+' m²' : 'Doplnit';
    container.querySelector('#statType').textContent = meta.type || 'Doplnit';
    container.querySelector('#statBuilt').textContent = meta.builtArea ? meta.builtArea+' m²' : 'Doplnit';
    container.querySelectorAll('.proj-stat').forEach(el=>{
      el.addEventListener('click', ()=>{
        const field = el.dataset.field;
        const label = field==='type' ? 'Typ domu' : (field==='landArea' ? 'Plocha pozemku (m²)' : 'Užitná plocha (m²)');
        const cur = meta[field] || '';
        const val = prompt(label+':', cur);
        if(val===null) return;
        const patch = {};
        patch[field] = field==='type' ? val.trim() : (Number(val)||null);
        msSetProjectMeta(patch);
        render(container, params);
      });
    });

    let clickTargets = [], deleteTargets = [], renameTargets = [], shareTargets = [];
    function tile(opts){
      const { name, sub, isFolder, mime, thumbUrl, onClick, onDelete, onRename, onShare, folderId } = opts;
      const idx = clickTargets.length;
      clickTargets.push(onClick); deleteTargets.push(onDelete||null); renameTargets.push(onRename||null); shareTargets.push(onShare||null);
      const color = isFolder ? 'var(--folder-color)' : '#94a0bc';
      // Silnejsi, viditelny barevny ramecek s jemnou zari - stejny
      // "vahovy" pocit jako karta aktualni etapy v Etapach (schvaleno
      // na nahledu 1.8.2026), misto puvodniho jemneho nadechu pozadi.
      const bg = 'var(--card-bg)';
      const isPdf = mime === 'application/pdf';
      const borderColor = isFolder ? 'var(--folder-color)' : (isPdf ? 'var(--add-color)' : 'color-mix(in srgb, var(--muted) 75%, transparent)');
      const glow = isFolder ? `box-shadow:0 0 14px -4px color-mix(in srgb, var(--folder-color) 60%, transparent);` : '';
      const visual = thumbUrl
        ? `<div class="tile-visual" style="width:100%;aspect-ratio:1;border-radius:var(--radius);background:url(${thumbUrl}) center/cover;margin:0 auto"></div>`
        : `<div class="tile-visual" style="height:20px;display:flex;align-items:center;justify-content:center">${isFolder ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="1"/><path d="M3 7l2-3h6l2 3"/></svg>` : fileIconSvg(mime, color)}</div>`;
      return `<div class="tile-item${isFolder?' folder-tile':''}" data-idx="${idx}"${folderId?` data-folder="${folderId}"`:''} style="position:relative;border:1.5px solid ${borderColor};background:${bg};${glow}padding:9px 6px;text-align:center;cursor:${onClick?'pointer':'default'};min-width:0">
        ${(onDelete||onRename||onShare) ? `<span class="tile-menu" data-idx="${idx}" style="position:absolute;top:3px;right:3px;width:20px;height:20px;border:1px solid var(--line);border-radius:var(--radius);display:grid;place-items:center;color:var(--muted);cursor:pointer;background:var(--card-bg-2)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>
        </span>` : ''}
        ${visual}
        <b style="display:block;margin-top:5px;font-size:10.5px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(name)}</b>
        <span style="font-size:9.5px;color:var(--muted)">${msEsc(sub)}</span>
      </div>`;
    }
    /* Radek souboru (11.8.2026). Nahled fotky je maly ctverec vlevo -
       stejne velky jako ikona PDF, takze fotka uz neroztahuje radek a
       vsechny polozky maji stejnou vysku. Na nazev je tim padem cela
       sirka obrazovky misto tretiny. */
    function fileRow(it){
      const idx = clickTargets.length;
      clickTargets.push(it.isNote ? ()=>editNote(it) : ()=>openItemContent(it));
      deleteTargets.push(isOwner ? ()=>{ msDeleteProjectItem(it.id); draw(); } : null);
      renameTargets.push(isOwner ? ()=>{
        const name = prompt('Nový název:', it.name);
        if(!name || !name.trim()) return;
        msRenameProjectItem(it.id, name.trim());
        draw();
      } : null);
      shareTargets.push((!it.isNote && msCanExportContent()) ? ()=>shareItemFromMenu(it) : null);

      const isImage = it.mime && it.mime.startsWith('image/');
      const thumbUrl = isImage ? MS_BLOB_CACHE.get(msBlobKey('pitem', it.id)) : null;
      const isPdf = it.mime === 'application/pdf';
      const barva = it.isNote ? 'var(--muted)' : (isPdf ? 'var(--add-color)' : (isImage ? '#94a0bc' : '#94a0bc'));
      const vizual = thumbUrl
        ? `<div class="tile-visual" style="width:100%;height:100%;background:url(${thumbUrl}) center/cover"></div>`
        : `<div class="tile-visual" style="display:grid;place-items:center;color:${barva}">${it.isNote
            ? '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h14v16l-4-3-3 3-3-3-4 3z"/></svg>'
            : fileIconSvg(it.mime, barva)}</div>`;
      const popis = it.isNote ? 'poznámka'
        : (it.author && it.author !== 'Stavebník' ? it.author : (isImage ? 'fotka' : (isPdf ? 'PDF' : 'soubor')));

      return `<div class="tile-item file-row" data-idx="${idx}" data-item="${it.id}" style="display:flex;align-items:center;gap:11px;border:1px solid var(--line);border-left:2px solid ${barva};background:var(--card-bg);padding:9px 10px;cursor:pointer;touch-action:pan-y">
        <div style="width:42px;height:42px;flex:0 0 42px;border:1px solid var(--line);overflow:hidden;background:var(--card-bg-2)">${vizual}</div>
        <div style="flex:1;min-width:0">
          <b style="display:block;font-size:12px;color:#fff;line-height:1.3;word-break:break-word">${msEsc(it.name)}</b>
          <span style="font-size:10px;color:var(--muted)">${msEsc(popis)}</span>
        </div>
        <span class="tile-menu" data-idx="${idx}" style="flex:0 0 26px;width:26px;height:26px;display:grid;place-items:center;color:var(--muted);cursor:pointer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>
        </span>
      </div>`;
    }

    function addTile(){
      const idx = clickTargets.length;
      clickTargets.push(onAddClick); deleteTargets.push(null); renameTargets.push(null); shareTargets.push(null);
      return `<div class="tile-item" data-idx="${idx}" style="border:1.5px dashed var(--add-color);padding:12px;margin-top:8px;text-align:center;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--add-color)" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        <b style="font-size:11.5px;color:var(--add-color)">Přidat soubor nebo složku</b>
      </div>`;
    }
    /* ZMENA (11.8.2026): tuzka a kos primo na dlazdici zabiraly misto,
       daly se snadno trefit omylem a u malych dlazdic se do rohu spatne
       mirilo. Ted je misto nich jedna nabidka pod tremi teckami.
       Vzhled: puvodne to byl holy seznam radku s carami pres celou
       sirku - pusobil jako tabulka. Ted ma kazda volba ikonu, "Zrusit"
       stoji odsazene zvlast a v hlavicce je ikona te konkretni polozky,
       prevzata primo z dlazdice - nabidka tak navazuje na to, na co
       clovek klepnul. */
    function openTileMenu(idx, anchorName, anchorSub, visualHtml){
      const onRename = renameTargets[idx];
      const onDelete = deleteTargets[idx];
      const onShare  = (typeof shareTargets !== 'undefined') ? shareTargets[idx] : null;
      const overlay = document.createElement('div');
      overlay.className = 'ms-overlay ms-sheet-backdrop';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:80;display:flex;align-items:flex-end;justify-content:center;padding:0 10px calc(10px + min(env(safe-area-inset-bottom),34px))';

      const ICON = {
        share: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 14v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/></svg>',
        ren:   '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
        del:   '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7"/><path d="M10 11v6M14 11v6"/></svg>'
      };
      // ZMENA (11.8.2026): misto radku pod sebou (pusobilo jako seznam)
      // jsou akce vedle sebe jako tlacitka - stejny tvar a rec jako
      // dlazdice v samotnem Projektu, jen s ikonou nad popiskem.
      const btn = (id, label, cls)=>
        `<button class="ms-sheet-btn ${cls||''}" data-id="${id}">${ICON[id]||''}<span>${label}</span></button>`;

      overlay.innerHTML = `
        <div class="ms-sheet" style="width:100%;max-width:460px">
          <div style="background:var(--card-bg-2);border:1px solid var(--line);border-left:3px solid var(--accent)">
            <div style="display:flex;align-items:center;gap:11px;padding:13px 16px;border-bottom:1px solid var(--line)">
              <div class="ms-sheet-visual" style="width:38px;height:38px;flex:0 0 38px;border:1px solid var(--line);display:grid;place-items:center;overflow:hidden;background:var(--card-bg)">${visualHtml||''}</div>
              <div style="min-width:0;flex:1">
                <b style="display:block;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(anchorName || '')}</b>
                <span style="font-size:10.5px;color:var(--muted)">${msEsc(anchorSub || '')}</span>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(${[onShare,onRename,onDelete].filter(Boolean).length},minmax(0,1fr));gap:8px;padding:12px">
              ${onShare ? btn('share','Sdílet','is-share') : ''}
              ${onRename ? btn('ren','Přejmenovat') : ''}
              ${onDelete ? btn('del','Smazat','is-del') : ''}
            </div>
          </div>
          <button class="ms-sheet-cancel" id="sheetCancel">Zrušit</button>
        </div>`;
      document.body.appendChild(overlay);
      const close = ()=>{ try{ document.body.removeChild(overlay); }catch(_){} };
      overlay.addEventListener('click', (e)=>{ if(e.target === overlay) close(); });
      overlay.querySelector('#sheetCancel').addEventListener('click', close);
      overlay.querySelectorAll('.ms-sheet-btn').forEach(r=>{
        r.addEventListener('click', async ()=>{
          const id = r.dataset.id;
          close();
          if(id === 'share' && onShare) onShare();
          else if(id === 'ren' && onRename) onRename();
          else if(id === 'del' && onDelete){
            if(!await Layout.confirmDialog('Smazat tuhle položku? Nedá se to vrátit zpět.', 'Smazat')) return;
            onDelete();
          }
        });
      });
    }

    function bindTileClicks(){
      container.querySelectorAll('.tile-item').forEach(el=>{
        const idx = Number(el.dataset.idx);
        el.addEventListener('click', (e)=>{ if(e.target.closest('.tile-menu')) return; const fn = clickTargets[idx]; if(fn) fn(); });
      });
      container.querySelectorAll('.tile-menu').forEach(el=>{
        el.addEventListener('click', (e)=>{
          e.stopPropagation();
          const idx = Number(el.dataset.idx);
          const tileEl = el.closest('.tile-item');
          const nameEl = tileEl ? tileEl.querySelector('b') : null;
          const subEl = tileEl ? tileEl.querySelector('b + span') : null;
          const visEl = tileEl ? tileEl.querySelector('.tile-visual') : null;
          openTileMenu(idx,
            nameEl ? nameEl.textContent : '',
            subEl ? subEl.textContent : '',
            visEl ? (visEl.innerHTML || visEl.outerHTML) : '');
        });
      });
    }

    /* PRETAHOVANI SOUBORU DO SLOZKY (13.8.2026)
       Doted slo soubor jen prejmenovat nebo smazat - kdo ho nahral do
       spatne slozky, musel ho smazat a nahrat znovu.

       Na mobilu neexistuje "drag" jako na pocitaci, takze: podrz prst
       na radku ~350 ms, radek se "zvedne" a jde s prstem. Slozky se
       pritom zvyrazni jako mozny cil. Kratke klepnuti otevre soubor
       jako driv, posunuti prstem drive nez za 350 ms normalne scrolluje
       - proto se pri prvnim vetsim pohybu drzeni rusi. */
    let dragStav = null;

    function wireDragToFolder(){
      if(!isOwner) return; // pozvany strukturu nepresouva
      container.querySelectorAll('.file-row').forEach(radek=>{
        radek.addEventListener('pointerdown', (e)=>{
          if(e.target.closest('.tile-menu')) return;
          zacniDrzet(e, radek);
        });
      });
    }

    function zacniDrzet(e, radek){
      const start = { x: e.clientX, y: e.clientY };
      const itemId = radek.dataset.item;
      let casovac = setTimeout(()=> zvednout(radek, itemId, start), 350);

      const pohyb = (ev)=>{
        if(dragStav) return; // uz taha - resi se jinde
        const dx = Math.abs(ev.clientX - start.x), dy = Math.abs(ev.clientY - start.y);
        if(dx > 8 || dy > 8){ clearTimeout(casovac); uklid(); } // scrolluje
      };
      const konec = ()=>{ clearTimeout(casovac); uklid(); };
      const uklid = ()=>{
        document.removeEventListener('pointermove', pohyb);
        document.removeEventListener('pointerup', konec);
        document.removeEventListener('pointercancel', konec);
        window.removeEventListener('hashchange', konec);
      };
      document.addEventListener('pointermove', pohyb);
      document.addEventListener('pointerup', konec);
      document.addEventListener('pointercancel', konec);
      // Stejna pojistka jako u samotneho tazeni (13.8.2026): bez ni by
      // odchod z obrazovky BEHEM cekani na 350ms mohl nechat bezet
      // casovac, ktery by pak vyrobil "ducha" uz na jine obrazovce.
      window.addEventListener('hashchange', konec, { once:true });
    }

    function zvednout(radek, itemId, start){
      if(navigator.vibrate) { try{ navigator.vibrate(15); }catch(e){} }

      const rect = radek.getBoundingClientRect();
      const duch = radek.cloneNode(true);
      duch.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;
        z-index:90;pointer-events:none;opacity:.94;transform:scale(1.03);
        box-shadow:0 10px 26px rgba(0,0,0,.5);border-color:var(--accent)`;
      document.body.appendChild(duch);
      radek.style.opacity = '.35';

      // Slozky se zvyrazni, at je videt, kam to jde pustit.
      const cile = [...container.querySelectorAll('.folder-tile[data-folder]')];
      cile.forEach(c=>{ c.style.transition = 'transform .12s, border-color .12s'; c.style.borderStyle = 'dashed'; });

      // Pruh nahore = presun o uroven vys (ven ze slozky).
      let ven = null;
      if(pathStack.length){
        ven = document.createElement('div');
        ven.id = 'dropOut';
        ven.textContent = '↑ Přesunout o úroveň výš';
        ven.style.cssText = `position:fixed;left:0;right:0;top:0;z-index:89;padding:calc(10px + env(safe-area-inset-top)) 14px 12px;
          text-align:center;font-size:12px;font-weight:800;color:var(--accent);
          background:var(--card-bg-2);border-bottom:1.5px dashed var(--accent)`;
        document.body.appendChild(ven);
      }

      dragStav = { radek, itemId, duch, cile, ven, dx: start.x - rect.left, dy: start.y - rect.top, cil: null };

      document.addEventListener('pointermove', tahni, { passive: false });
      document.addEventListener('pointerup', pust);
      document.addEventListener('pointercancel', pust);
      // Pojistka navic (13.8.2026): pointerup/pointercancel se nemusi
      // spolehlive spustit, kdyz clovek odejde jinak nez dotykem (napr.
      // gesto zpet, systemove UI behem drzeni). hashchange se spusti pri
      // KAZDE navigaci v appce (Router.go meni location.hash), takze
      // je to spolehlivejsi pojistka, ktera drag vzdy ukonci.
      window.addEventListener('hashchange', pust, { once:true });
    }

    function tahni(e){
      if(!dragStav) return;
      e.preventDefault(); // at se pod prstem neposouva obrazovka
      dragStav.duch.style.left = (e.clientX - dragStav.dx) + 'px';
      dragStav.duch.style.top = (e.clientY - dragStav.dy) + 'px';

      const pod = document.elementFromPoint(e.clientX, e.clientY);
      const slozka = pod ? pod.closest('.folder-tile[data-folder]') : null;
      const nadVen = pod && dragStav.ven && pod.id === 'dropOut';

      dragStav.cile.forEach(c=>{
        const aktivni = (c === slozka);
        c.style.transform = aktivni ? 'scale(1.06)' : '';
        c.style.borderColor = aktivni ? 'var(--accent)' : '';
        c.style.borderStyle = 'dashed';
      });
      if(dragStav.ven) dragStav.ven.style.background = nadVen ? 'var(--accent)' : 'var(--card-bg-2)';
      if(dragStav.ven) dragStav.ven.style.color = nadVen ? '#fff' : 'var(--accent)';

      dragStav.cil = slozka ? slozka.dataset.folder : (nadVen ? '__ven__' : null);
    }

    function pust(){
      if(!dragStav) return;
      const { radek, itemId, duch, cile, ven, cil } = dragStav;
      document.removeEventListener('pointermove', tahni);
      document.removeEventListener('pointerup', pust);
      document.removeEventListener('pointercancel', pust);
      window.removeEventListener('hashchange', pust);
      try{ document.body.removeChild(duch); }catch(e){}
      if(ven){ try{ document.body.removeChild(ven); }catch(e){} }
      cile.forEach(c=>{ c.style.transform = ''; c.style.borderColor = ''; c.style.borderStyle = ''; });
      radek.style.opacity = '';
      dragStav = null;

      /* OPRAVA (13.8.2026): "duch" (plovouci kopie prave tazeneho radku)
         se vklada do document.body, MIMO container teto obrazovky - je
         to schvalne, jinak by ho container.innerHTML pri prekresleni
         smazal uprostred tazeni. Jenze kdyby clovek behem drzeni odesel
         jinam (zpet, spodni navigace), Router jen prepise #app-content a
         nikoho o tom neinformuje - "duch" by tak zustal navzdy viset
         nad UPLNE JINOU obrazovkou a posluchace na document by uz
         nemely na co reagovat. Kontrola container.isConnected pozna, ze
         uz nejsme na teto obrazovce, a presun dat v tom pripade
         preskoci - uklid vyse (ghost/listenery) uz ale probehl. */
      if(!container.isConnected) return;

      if(!cil) return;
      if(cil === '__ven__'){
        // O uroven vys = do rodicovske slozky te soucasne.
        const nadrazena = pathStack.length > 1 ? pathStack[pathStack.length-2].id : null;
        if(msMoveProjectItem(itemId, nadrazena)) draw();
        return;
      }
      if(msMoveProjectItem(itemId, cil)) draw();
    }

    function currentFolderId(){ return pathStack.length ? pathStack[pathStack.length-1].id : null; }

    function draw(){
      clickTargets = []; deleteTargets = []; renameTargets = []; shareTargets = [];
      const isRoot = pathStack.length===0;
      container.querySelector('.screen-scroll').classList.toggle('no-scroll', isRoot && scope==='projekt');
      container.querySelector('#backBtn').style.visibility = (isRoot && scope==='projekt') ? 'hidden' : 'visible';
      container.querySelector('#pathTitle').textContent = isRoot ? (screenTitle + (stageInfo ? ' – '+stageInfo.name : '')) : pathStack[pathStack.length-1].name;
      container.querySelector('#statsRow').style.display = (isRoot && scope==='projekt') ? 'grid' : 'none';

      const folders = msLoadProjectFolders().filter(f=> f.parentId===currentFolderId() && f.scope===scope && (f.stageKey||null)===(stageKey||null));
      const items = msLoadProjectItems().filter(it=> it.folderId===currentFolderId() && it.scope===scope && (it.stageKey||null)===(stageKey||null));
      // Prazdny stav ma vlastni misto - #grid uz se nepouziva (zustal
      // jen skryty kvuli starsimu kodu). (13.8.2026)
      const grid = container.querySelector('#emptyWrap');
      grid.innerHTML = '';
      grid.style.display = '';

      // Prazdny stav - jen kdyz v teto slozce fakt nic neni (i uvodni
      // "Projekt" pri prvnim otevreni pusobilo prilis prazdne a strohe).
      // Navrhove "chipy" na zalozeni bezne slozky se objevi JEN v
      // korenu vlastniho "Projekt" - u Nabidek/Dulezite pro konkretni
      // etapu uz kontext dava nadpis, dalsi navrhy by byly matouci.
      if(folders.length===0 && items.length===0){
        const suggestions = scope==='projekt' ? ['Smlouvy', 'Povolení', 'Projektová dokumentace', 'Faktury'] : [];
        grid.innerHTML = `<div style="margin:6px 0 6px;padding:26px 20px 20px;text-align:center;border:1px dashed var(--line);cursor:pointer" id="emptyProjectCard">
          <div style="width:44px;height:44px;border:1px solid var(--add-color);color:var(--add-color);margin:0 auto 12px;display:grid;place-items:center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </div>
          <b style="display:block;font-size:15px;margin-bottom:6px">${canAddHere ? 'Zatím prázdno' : 'Zatím tu nic není'}</b>
          <span style="font-size:11.5px;color:var(--muted);line-height:1.5">${canAddHere ? 'Nahraj soubory, fotky, poznámky, nebo si založ další složku.' : 'Vlastník sem ještě nic nepřidal.'}</span>
        </div>
        ${isOwner ? `<div style="display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-bottom:14px">
          ${suggestions.map(name=> `<span class="folder-suggest-chip" data-name="${msEsc(name)}" style="border:1px solid var(--line);color:var(--muted);padding:6px 12px;font-size:11px;cursor:pointer;border-radius:20px">+ ${msEsc(name)}</span>`).join('')}
        </div>` : ''}`;
      }

      const foldersWrap = container.querySelector('#foldersWrap');
      const filesWrap = container.querySelector('#filesWrap');
      foldersWrap.innerHTML = ''; filesWrap.innerHTML = '';
      if(folders.length || items.length) grid.style.display = 'none';

      // --- SLOZKY: mrizka po dvou, at se nazev vejde cely ---
      if(folders.length){
        let html = `<div style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:800;margin:0 0 7px">Složky</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">`;
        folders.forEach(f=>{
          const childCount = msLoadProjectFolders().filter(x=>x.parentId===f.id).length + msLoadProjectItems().filter(x=>x.folderId===f.id).length;
          html += tile({
            name: f.name, sub: childCount + (childCount===1?' položka':(childCount<5?' položky':' položek')), isFolder: true,
            folderId: f.id,
            onClick: ()=>{ pathStack.push({id:f.id, name:f.name}); draw(); },
            onDelete: isOwner ? ()=>{ msDeleteProjectFolder(f.id); draw(); } : null,
            onRename: isOwner ? ()=>{
              const name = prompt('Nový název složky:', f.name);
              if(!name || !name.trim()) return;
              msRenameProjectFolder(f.id, name.trim());
              draw();
            } : null,
          });
        });
        html += '</div>';
        foldersWrap.innerHTML = html;
      }

      // --- SOUBORY: seznam s pevnou vyskou radku ---
      if(items.length){
        let html = `<div style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:800;margin:0 0 7px">Soubory</div>
          <div style="display:flex;flex-direction:column;gap:6px">`;
        items.forEach(it=>{
          html += fileRow(it);
        });
        html += '</div>';
        filesWrap.innerHTML = html;
      }

      if(canAddHere) filesWrap.innerHTML += addTile();
      bindTileClicks();
      wireDragToFolder();
      const emptyCard = container.querySelector('#emptyProjectCard');
      if(emptyCard && isOwner && canAddHere) emptyCard.addEventListener('click', onAddClick);
      container.querySelectorAll('.folder-suggest-chip').forEach(chip=>{
        chip.addEventListener('click', (e)=>{
          e.stopPropagation();
          msAddProjectFolder(chip.dataset.name, currentFolderId(), scope, stageKey);
          draw();
        });
      });
    }

    function editNote(it){
      if(!isOwner){ openItemContent(it); return; }
      const text = prompt('Upravit poznámku:', it.name.replace(/^Poznámka: /,''));
      if(text===null) return;
      const list = msLoadProjectItems();
      const idx = list.findIndex(x=>x.id===it.id);
      if(idx>-1){ list[idx] = Object.assign({}, list[idx], { name:'Poznámka: '+text.trim() }); msSaveProjectItems(list); }
      draw();
    }

    // Sdileni polozky z nabidky pod teckami (drive jen pres dotaz po
    // klepnuti na soubor).
    async function shareItemFromMenu(it){
      if(!msRequirePremium('Posílání souborů do jiných aplikací')) return;
      const key = msBlobKey('pitem', it.id);
      let dataUrl = MS_BLOB_CACHE.get(key);
      if(!dataUrl){ try{ dataUrl = await msIdbGet(key); if(dataUrl) MS_BLOB_CACHE.set(key, dataUrl); }catch(e){} }
      if(!dataUrl){ alert('Obsah souboru se nepodařilo najít - zkus appku načíst znovu.'); return; }
      const file = msDataUrlToFile(dataUrl, it.name || 'soubor');
      if(!file){ alert('Soubor se nepodařilo připravit k odeslání.'); return; }
      if(msCanShareFiles([file])){
        try{ await navigator.share({ files:[file], title: it.name || 'Soubor ze stavby' }); return; }
        catch(e){ if(e && e.name === 'AbortError') return; }
      }
      const res = await msSaveFilesToDevice([file], it.name || 'Soubor ze stavby');
      if(res === 'unsupported') alert('Tenhle prohlížeč neumí posílat soubory. Zkus appku otevřít jako aplikaci na ploše.');
    }

    async function shareDocFromMenu(d){
      if(!msRequirePremium('Posílání souborů do jiných aplikací')) return;
      const key = msBlobKey('doc', d.id);
      let dataUrl = MS_BLOB_CACHE.get(key);
      if(!dataUrl){ try{ dataUrl = await msIdbGet(key); if(dataUrl) MS_BLOB_CACHE.set(key, dataUrl); }catch(e){} }
      if(!dataUrl){ alert('Obsah souboru se nepodařilo najít - zkus appku načíst znovu.'); return; }
      const file = msDataUrlToFile(dataUrl, d.name || 'soubor');
      if(!file){ alert('Soubor se nepodařilo připravit k odeslání.'); return; }
      if(msCanShareFiles([file])){
        try{ await navigator.share({ files:[file], title: d.name || 'Soubor ze stavby' }); return; }
        catch(e){ if(e && e.name === 'AbortError') return; }
      }
      const res = await msSaveFilesToDevice([file], d.name || 'Soubor ze stavby');
      if(res === 'unsupported') alert('Tenhle prohlížeč neumí posílat soubory. Zkus appku otevřít jako aplikaci na ploše.');
    }

    async function openItemContent(it){
      const key = msBlobKey('pitem', it.id);
      let dataUrl = MS_BLOB_CACHE.get(key);
      if(!dataUrl){ try{ dataUrl = await msIdbGet(key); if(dataUrl) MS_BLOB_CACHE.set(key, dataUrl); }catch(e){} }
      if(!dataUrl){
        if(it.isNote){ alert(it.name); return; }
        alert('Obsah souboru se nepodařilo najít - zkus appku načíst znovu.');
        return;
      }
      // DOPLNENO (8.8.2026): i u souboru v Projektu ma byt "Sdilet" po ruce -
      // typicky vykres nebo revizni zprava, kterou clovek posila remeslnikovi.
      const shareThis = async ()=>{
        if(!msRequirePremium('Posílání souborů do jiných aplikací')) return;
        const file = msDataUrlToFile(dataUrl, it.name || 'soubor');
        if(!file){ alert('Soubor se nepodařilo připravit k odeslání.'); return; }
        if(msCanShareFiles([file])){
          try{ await navigator.share({ files:[file], title: it.name || 'Soubor ze stavby' }); return; }
          catch(e){ if(e && e.name === 'AbortError') return; }
        }
        const res = await msSaveFilesToDevice([file], it.name || 'Soubor ze stavby');
        if(res === 'unsupported') alert('Tenhle prohlížeč neumí posílat soubory. Zkus appku otevřít jako aplikaci na ploše.');
      };

      if(it.mime && it.mime.startsWith('image/')){
        // OPRAVA (11.8.2026): tady se kreslil vlastni jednoduchy nahled s
        // obycejnym <img> - obrazek proto neslo priblizit. Zrovna v
        // Projektu jsou ulozene vykresy, situace a revizni zpravy, kde je
        // priblizeni to hlavni, co clovek potrebuje. Appka pritom uz
        // prohlizec se stipnutim a posouvanim ma (msPhotoLightbox v
        // galerii), jen se tu nepouzival.
        msPhotoLightbox([dataUrl], 0, msCanExportContent() ? { label: 'Sdílet', onClick: shareThis } : null);
        return;
      }
      // ZMENA (11.8.2026): drive se tady appka ptala "Sdilet / Otevrit".
      // Klepnuti na soubor ale znamena "chci ho videt" - ptat se pokazde
      // bylo zdrzeni navic. Sdileni je ted v nabidce pod tremi teckami.
      try{
        const [meta, b64] = dataUrl.split(',');
        const mime = (meta.match(/data:(.*);base64/)||[])[1] || it.mime || 'application/octet-stream';
        const bytes = atob(b64);
        const arr = new Uint8Array(bytes.length);
        for(let i=0;i<bytes.length;i++) arr[i] = bytes.charCodeAt(i);
        const blob = new Blob([arr], {type: mime});
        window.open(URL.createObjectURL(blob), '_blank');
      }catch(e){ alert('Tenhle typ souboru appka zatím neumí otevřít přímo.'); }
    }

    // OPRAVA (14.8.2026): tahle funkce kreslila fotku primo na canvas
    // bez cteni EXIF orientace - fotka vyfocena na vysku vysla na bok
    // nebo vzhuru nohama (stejna chyba, jakou uz appka opravila u
    // pridavani fotek do zapisu deniku). msResizeImageFile v data.js uz
    // EXIF cte a otoci spravne.
    function readAsDataURL(file){
      return new Promise(resolve=>{
        if(!file.type.startsWith('image/')){
          const reader = new FileReader();
          reader.onload = ()=> resolve(reader.result);
          reader.onerror = ()=> resolve(null);
          reader.readAsDataURL(file);
          return;
        }
        msResizeImageFile(file, 1400, 0.75).then(resolve).catch(()=> resolve(null));
      });
    }

    async function onAddClick(){
      const choice = await addSheet();
      if(choice==='files') container.querySelector('#fileInput').click();
      else if(choice==='note'){
        const text = prompt('Text poznámky:');
        if(!text || !text.trim()) return;
        await msAddProjectItem({ name:'Poznámka: '+text.trim(), isNote:true, folderId: currentFolderId(), scope, stageKey });
        draw();
      }
      else if(choice==='newFolder'){
        const name = prompt('Název nové složky:');
        if(!name || !name.trim()) return;
        msAddProjectFolder(name.trim(), currentFolderId(), scope, stageKey);
        draw();
      }
    }
    function addSheet(){
      return new Promise(resolve=>{
        const overlay = document.createElement('div');
        overlay.className = 'ms-overlay'; overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,4,10,.7);z-index:60;display:flex;align-items:flex-end;justify-content:center';
        overlay.innerHTML = `
          <div style="width:100%;max-width:480px;background:var(--card-bg-2);border-top:1px solid var(--line);padding:14px 16px calc(16px + env(safe-area-inset-bottom))">
            <div class="mi" data-c="files" style="display:flex;align-items:center;gap:10px;padding:11px 4px;cursor:pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6"/></svg>
              <b style="font-size:12.5px">Nahrát soubory / fotky</b><span style="font-size:9.5px;color:var(--muted);margin-left:auto">jde vybrat víc najednou</span>
            </div>
            <div class="mi" data-c="note" style="display:flex;align-items:center;gap:10px;padding:11px 4px;border-top:1px solid var(--line);cursor:pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
              <b style="font-size:12.5px">Přidat poznámku</b>
            </div>
            ${isOwner ? `<div class="mi" data-c="newFolder" style="display:flex;align-items:center;gap:10px;padding:11px 4px;border-top:1px solid var(--line);cursor:pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
              <b style="font-size:12.5px">Založit složku</b>
            </div>` : ''}
            <button id="sheetClose" style="width:100%;margin-top:10px;border:1px solid var(--line);background:transparent;color:var(--muted);padding:9px;font-size:12px;font-weight:700;cursor:pointer;border-radius:var(--radius)">Zrušit</button>
          </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#sheetClose').addEventListener('click', ()=>{ document.body.removeChild(overlay); resolve(null); });
        overlay.querySelectorAll('.mi').forEach(el=>{
          el.addEventListener('click', ()=>{ document.body.removeChild(overlay); resolve(el.dataset.c); });
        });
      });
    }

    // OPRAVA (10.8.2026): nahravani vetsi davky trvalo desitky vterin a
    // appka po tu dobu nedavala NAJEVO VUBEC NIC (draw() az uplne na
    // konci). Realny nasledek: soubory se vybraly znovu a v Elektru
    // skoncilo 10 PDF dvakrat. Ted je videt prubeh, druhe spusteni se
    // behem nahravani ignoruje a na uz existujici nazvy se appka zepta.
    let _uploadBusy = false;
    container.querySelector('#fileInput').addEventListener('change', async (e)=>{
      if(_uploadBusy){ e.target.value = ''; return; }
      let files = [...e.target.files];
      e.target.value = '';
      if(!files.length) return;

      const folderId = currentFolderId();
      const existing = (typeof msLoadProjectItems === 'function' ? msLoadProjectItems() : [])
        .filter(it=> (it.folderId||null) === (folderId||null))
        .map(it=> it.name);
      const dupes = files.filter(f=> existing.indexOf(f.name) >= 0);
      if(dupes.length){
        const seznam = dupes.slice(0,5).map(f=> '· ' + f.name).join('\n')
          + (dupes.length > 5 ? '\n· … a další ' + (dupes.length-5) : '');
        const ok = confirm('V téhle složce už ' + (dupes.length===1 ? 'je soubor se stejným názvem' : 'jsou soubory se stejnými názvy') + ':\n\n' + seznam
          + '\n\nDát je tam podruhé?\n(„Zrušit" je přeskočí a nahraje jen zbytek.)');
        if(!ok){
          files = files.filter(f=> existing.indexOf(f.name) < 0);
          if(!files.length) return;
        }
      }

      _uploadBusy = true;
      const prog = document.createElement('div');
      prog.style.cssText = 'position:fixed;inset:0;background:rgba(2,4,10,.75);z-index:70;display:flex;align-items:center;justify-content:center;padding:24px';
      prog.innerHTML = '<div style="background:var(--card-bg-2);border:1px solid var(--line);border-left:3px solid var(--accent);padding:18px 20px;max-width:320px;width:100%">'
        + '<b id="progTitle" style="font-size:13px;display:block;margin-bottom:8px">Nahrávám…</b>'
        + '<div style="height:4px;background:var(--line);overflow:hidden"><div id="progBar" style="height:100%;width:0%;background:var(--accent);transition:width .2s"></div></div>'
        + '<div style="font-size:10.5px;color:var(--muted);margin-top:8px">Nech appku otevřenou, ať se to stihne nahrát.</div></div>';
      document.body.appendChild(prog);
      const setProg = (i, total, name)=>{
        const t = prog.querySelector('#progTitle');
        const b = prog.querySelector('#progBar');
        if(t) t.textContent = 'Nahrávám ' + i + '/' + total + ' – ' + (name.length > 28 ? name.slice(0,27) + '…' : name);
        if(b) b.style.width = Math.round((i-1)/total*100) + '%';
      };
      try{
        for(let i = 0; i < files.length; i++){
          const f = files[i];
          setProg(i+1, files.length, f.name);
          await new Promise(r=> setTimeout(r, 0)); // at se prekresli text
          const content = await readAsDataURL(f);
          await msAddProjectItem({ name: f.name, mime: f.type||null, folderId, content, scope, stageKey });
        }
        Layout.showSuccess(files.length === 1 ? 'Soubor přidán' : `Přidáno ${files.length} souborů`);
      }catch(err){
        console.error('nahrani souboru selhalo', err);
        alert('Něco se nenahrálo: ' + (err && err.message ? err.message : String(err)));
      }finally{
        try{ document.body.removeChild(prog); }catch(_){}
        _uploadBusy = false;
        draw();
      }
    });

    container.querySelector('#backBtn').addEventListener('click', ()=>{
      if(pathStack.length>0){ pathStack.pop(); draw(); }
      else { Router.back(); }
    });

    draw();
    return { activeTab:'project' };
  }

  return { render };
})();
Router.register('project', ProjectScreen);
