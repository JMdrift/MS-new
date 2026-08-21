/* ============================================================
   MOJE STAVBA — sdílená data (fotky, deník, dokumenty, výdaje)
   Jeden zdroj pravdy pro Detail etapy, Galerii, Deník a Finance.
   Ukládá se do localStorage, takže se dá přidávat/mazat a zůstane
   to uložené i po zavření appky (funguje ale jen přes lokální
   server, ne přes dvojklik na soubor - viz README).
   ============================================================ */

// Cislo verze zobrazene na Dashboardu (screen-dashboard.js) - pri
// KAZDEM novem zipu se rucne zvysi o 1, at je na prvni pohled videt,
// jestli appka na telefonu opravdu bezi na nejnovejsim kodu (bez
// tohohle se to poznavalo jen dohadem/cachi prohlizece).
const MS_BUILD_VERSION = 204;

// kazdy projekt ma UPLNE vlastni data (jako by to byla samostatna
// instalace appky) - klice se automaticky "orazitkuji" aktivnim
// projektem, takze vsechno co jde pres msLoad/msSave je uz z podstaty
// izolovane. ms_projects_v1/ms_active_project_v1/ms_onboarded_v1 zustavaji
// zamerne globalni (jsou to udaje O projektech, ne udaje UVNITR projektu).
/* Hustota zobrazeni - spolecne pro celou appku. Neni vazana na
   projekt (je to nastaveni zarizeni, ne stavby). */
const MS_UI_SCALES = { velke:1, stredni:0.92, male:0.85 };
function msGetUiScale(){
  let v = null;
  try{ v = localStorage.getItem('ms_ui_scale_v1'); }catch(e){}
  return (v && MS_UI_SCALES[v]) ? v : 'velke';
}
function msSetUiScale(name){
  if(!MS_UI_SCALES[name]) name = 'velke';
  try{ localStorage.setItem('ms_ui_scale_v1', name); }catch(e){}
  msApplyUiScale();
}
// Volba zaobleni byla zrusena (7.8.2026) - rohy zustavaji hranate
// podle motivu. Uklid po sobe, at v telefonu nezustava mrtvy zaznam.
try{ localStorage.removeItem('ms_ui_radius_v1'); }catch(e){}

function msApplyUiScale(){
  const val = MS_UI_SCALES[msGetUiScale()] || 1;
  document.documentElement.style.setProperty('--ui-scale', String(val));
}

/* ==========================================================
   SPOLECNE PRO AKTUALITY A UKOLY (7.8.2026)
   Obe veci potrebuje jak Dashboard, tak vlastni obrazovka. Kdyby
   si kazda pocitala poradi po svem, driv nebo pozdeji by se
   rozesly - proto to sedi na jednom miste.
   ========================================================== */

/* Slouceny prehled toho, co se na stavbe delo. Neni to novy druh
   dat - jen denik, fotky, penize a udalosti v jedne rade. */
/* Cas vzniku zaznamu. Zaznamy nemaji vlastni pole s casem, ale id se
   sklada z prefixu a Date.now() - to staci na serazeni v ramci jednoho
   dne. U zaznamu z cloudu nebo ze stare zalohy, kde to nesedi, vraci 0
   a takove skonci na konci dne. */
function msRecordTime(x){
  const m = String((x && x.id) || '').match(/(\d{13})/);
  return m ? Number(m[1]) : 0;
}

function msRecentActivity(limit){
  const can = k => (typeof msCanViewSection !== 'function') || msCanViewSection(k);
  const stageName = key => { const st = msStageByKey(key); return st ? st.name : null; };

  /* ZMENA (8.8.2026): radky rikaly jen "Přidána fotka" nebo "Výdaj", takze
     tri fotky za sebou vypadaly jako jeden zaznam trikrat. Ted kazdy radek
     rekne CO a KAM to patri - "Přidána fotka · Základy", "Výdaj Chemické
     WC · Zemní práce". Nazev etapy je za oddelovacem, aby se dal pri uzkem
     displeji uriznout drive nez to podstatne. */
  const line = (co, etapa) => etapa ? co + ' · ' + etapa : co;
  // formatDateCz zije v obrazovkach, ne v data.js - tady si vystacime
  // s kratkym tvarem "16. 8."
  const kratkeDatum = (iso)=>{
    const c = String(iso||'').split('-');
    return c.length === 3 ? (Number(c[2]) + '. ' + Number(c[1]) + '.') : '';
  };
  // orez na hranici slova - "dorazily přek" vypada jako chyba, ne jako zkraceni
  const zkrat = (t, n) => {
    t = String(t || '').replace(/\s+/g,' ').trim();
    if(t.length <= n) return t;
    const cut = t.slice(0, n);
    const sp = cut.lastIndexOf(' ');
    return (sp > n * 0.6 ? cut.slice(0, sp) : cut) + '…';
  };

  let out = [];

  if(can('denik')) out = out.concat(msDiary().map(e=>({
    date:e.date||'', t: msRecordTime(e), color:'#ffd35c', route:'diary', kind:'Deník',
    text: line('Zápis: ' + (e.title || zkrat((e.text||'').split('\n')[0], 38) || 'bez názvu'), stageName(e.stage)) })));

  if(can('fotky')){
    /* Fotky se pridavaji po davkach - dvacet radku "Přidána fotka" pod
       sebou nerekne nic. Slucuji se proto podle dne, etapy A POPISKU:
       pri hromadnem pridani dostanou vsechny fotky tentyz popisek, takze
       by jinak vzniklo dvacet stejnych radku. Rozepsane zustanou jen
       fotky, kde se popisky opravdu lisi - tam ma kazdy svou hodnotu. */
    const groups = {};
    msPhotos().forEach(p=>{
      const cap = (p.caption || '').trim();
      const k = (p.date||'') + '|' + (p.stage||'') + '|' + cap;
      if(!groups[k]) groups[k] = { n:0, t:0, cap, date:p.date||'', stage:p.stage||'' };
      groups[k].n++;
      // skupina se radi podle NEJNOVEJSI fotky v ni
      groups[k].t = Math.max(groups[k].t, msRecordTime(p));
    });
    Object.keys(groups).forEach(k=>{
      const g = groups[k];
      const pocet = g.n === 1 ? 'Přidána fotka'
                  : (g.n < 5 ? 'Přidány ' + g.n + ' fotky' : 'Přidáno ' + g.n + ' fotek');
      const co = g.cap
        ? (g.n === 1 ? 'Fotka: ' + zkrat(g.cap, 38) : pocet + ': ' + zkrat(g.cap, 30))
        : pocet;
      out.push({ date:g.date, t:g.t, color:'#b34cff', route:'gallery', kind:'Galerie',
                 text: line(co, stageName(g.stage)) });
    });
  }


  if(can('finance')){
    out = out.concat(msExpenses().filter(t=>t.type!=='planned').map(t=>{
      const je = t.type === 'income';
      // Zauctovany planovany vydaj se pozna podle paidAt - je to jiny
      // ukon nez zapsat vydaj rovnou, a stal se jindy.
      const zauctovano = !je && t.paidAt;
      const co = (je ? 'Vklad' : (zauctovano ? 'Zaúčtováno' : 'Výdaj')) + (t.title ? ': ' + t.title : '');
      return {
        date:t.date||'', t: zauctovano ? t.paidAt : msRecordTime(t),
        color: je ? '#4dffab' : '#ff9b32', route:'finance',
        kind: je ? 'Vklad' : 'Výdaj',
        text: line(co, je ? null : stageName(t.stage)),
        amount: Number(t.amount||0), income: je };
    }));

    /* CHYBELO (13.8.2026): zapsat planovany vydaj je taky ukon - clovek
       si naplanuje 40 tisic za okna a v Aktualitach o tom neni ani
       radka. Az zaplaceni se objevi (viz vyse). */
    out = out.concat(msExpenses().filter(t=>t.type==='planned').map(t=>({
      date:t.date||'', t: msRecordTime(t), color:'#8a7a4a', route:'finance', kind:'Plán',
      text: line('Plánovaný výdaj: ' + (t.title || 'bez názvu')
                 + (t.date ? ' (' + kratkeDatum(t.date) + ')' : ''), stageName(t.stage)),
      amount: Number(t.amount||0) })));
  }

  if(can('kalendar')){
    /* OPRAVA (13.8.2026): udalost se do Aktualit davala s datem, KDY SE
       MA KONAT. Schuzka za dva dny tak mela "novejsi" datum nez vsechno,
       co clovek dnes doopravdy udelal, a svitila na prvnim miste. Jenze
       Aktuality maji rikat, CO SE ZMENILO, ne co teprve bude - budouci
       veci patri do Kalendare, ktery ma vlastni dlazdici.
       Radek proto zustava, ale hlasi PRIDANI udalosti (a razeni ho bere
       podle okamziku, kdy jsi ji zapsal - viz t nize). Datum konani je
       videt v textu, at se ta informace neztrati. */
    out = out.concat(msEvents().map(e=>({
      date: e.date || '', t: msRecordTime(e), color:'#25b7ff', route:'calendar', kind:'Kalendář',
      // Datum konani zamerne kratce ("16. 8.") - v radku uz je vpravo
      // datum zapsani a dva plne datumy vedle sebe matou.
      text: line('Nová událost: ' + (e.title || 'bez názvu')
                 + (e.date ? ' (' + kratkeDatum(e.date) + ')' : ''), stageName(e.stage)) })));

    /* Ukol se v Aktualitach objevi DVAKRAT - kazde jako samostatny ukon:
       kdyz ho clovek zadal a kdyz ho odskrtl. Driv byl videt az po
       splneni, takze "dnes jsem si zapsal pet veci" se nikde neprojevilo.
       (13.8.2026) */
    out = out.concat(msTasks().map(t=>({
      date:t.date||'', t: msRecordTime(t), color:'#94a0bc', route:'tasks', kind:'Úkol',
      text: line('Nový úkol: ' + (t.title||'úkol')
                 + (t.date && t.dateMode !== 'none' ? ' (' + kratkeDatum(t.date) + ')' : ''), stageName(t.stage)) })));

    /* Splneny ukol: rozhoduje okamzik SPLNENI, ne kdy ukol vznikl.
       OPRAVA (14.8.2026): drive se pouzival odhad "konec dne" (23:59),
       protoze appka presny cas nikde neukladala. Jenze to znamenalo, ze
       splneny ukol byl v BUDOUCNOSTI oproti vsemu, co jsi udelal pozdeji
       ten samy den - zustaval navzdy nahore bez ohledu na dalsi zmeny.
       doneAt (viz screen-tasks.js/screen-calendar.js) uz nese presny
       okamzik; 23:59 zustava jen jako zaloha pro starsi zaznamy, ktere
       ho jeste nemaji. */
    out = out.concat(msTasks().filter(t=>t.done && t.doneDate).map(t=>({
      date:t.doneDate, t: t.doneAt || Date.parse(t.doneDate + 'T23:59:00') || msRecordTime(t),
      color:'#2fbf71', route:'tasks', kind:'Úkol',
      text: line('Hotovo: ' + (t.title||'úkol'), stageName(t.stage)) })));
  }

  /* CHYBELO (13.8.2026): dokumenty u etap a soubory v Projektu se v
     Aktualitach neobjevovaly vubec, prestoze pridat revizi nebo vykres
     je stejna zmena jako pridat fotku. */
  if(can('etapy') && typeof msDocuments === 'function'){
    out = out.concat(msDocuments().map(d=>({
      date: d.date || '', t: msRecordTime(d), color:'#25b7ff', route:'project', kind:'Dokument',
      text: line((d.isNote ? 'Poznámka: ' + zkrat(String(d.name||'').replace(/^Poznámka: /,''), 38)
                           : 'Dokument: ' + zkrat(d.name, 38)), stageName(d.stage)) })));
  }

  if(can('projekt') && typeof msLoadProjectItems === 'function'){
    let slozky = [];
    try{ slozky = (typeof msLoadProjectFolders === 'function') ? msLoadProjectFolders() : []; }catch(e){}
    const nazevSlozky = (id)=>{ const f = slozky.find(x=> x.id === id); return f ? f.name : null; };
    out = out.concat(msLoadProjectItems().filter(it=> it.scope !== 'dokumenty').map(it=>({
      date: it.date || '', t: msRecordTime(it), color:'#ff9b32', route:'project', kind:'Projekt',
      text: line((it.isNote ? 'Poznámka: ' + zkrat(String(it.name||'').replace(/^Poznámka: /,''), 38)
                            : 'Do projektu: ' + zkrat(it.name, 34)), nazevSlozky(it.folderId)) })));
  }

  /* OPRAVA (13.8.2026): radilo se podle DATA ZAZNAMU. U vetsiny veci to
     vychazi stejne, ale u zaznamu s budoucim datem (udalost, planovany
     vydaj) to znamenalo, ze preskocily vse ostatni - schuzka za dva dny
     svitila nad vecmi, ktere clovek zapsal pred chvili.
     Aktuality maji byt seznam ZMEN v poradi, jak nastaly, takze se radi
     podle okamziku zapsani (t, vytazeny z id zaznamu). Datum vpravo v
     radku ted taky ukazuje, KDY se to zapsalo - jinak by seznam pusobil
     nahodne serazeny. Kdyz cas zapsani neznama (stara data), pouzije se
     datum zaznamu, at zaznam nespadne uplne na konec. */
  const kdy = (z)=> z.t || Date.parse((z.date || '') + 'T12:00:00') || 0;
  out.forEach(z=>{
    z.t = kdy(z);
    if(z.t){
      const d = new Date(z.t);
      z.date = msDateToIso(d);
    }
  });
  out.sort((a,b)=> (b.t||0) - (a.t||0));
  return limit ? out.slice(0, limit) : out;
}

/* Poradi ukolu: po terminu (1) > dnes (2) > budouci (3) > bez
   terminu (4) > splnene (5). Uvnitr stejne priority podle data. */
/* ============================================================
   ZNACKA TERMINU U UKOLU (13.8.2026)
   Driv se typ terminu poznal jen z textu - "Do 20. 8." proti
   "20. 8.". Rozdil mezi "ten den to ma byt hotove" a "do te doby
   staci" je pritom podstatny a na maly displej se cetl spatne.
   Ted ma kazdy stav vlastni barvu, ikonu a slovo. U lhuty se misto
   data ukazuje ODPOCET - "Zbývá 6 dní" clovek pochopi rychleji nez
   datum, ktere si musi prepocitat.
   Vraci { druh, text, barva, ikona } - obrazovky si z toho poskladaji,
   co potrebuji, at se to nikde nerozejde.
   ============================================================ */
function msTaskZnacka(t, todayIso){
  todayIso = todayIso || msTodayIso();
  const IKONY = {
    den:   '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    lhuta: '<path d="M6 2h12M6 22h12"/><path d="M8 2v4l4 4 4-4V2M8 22v-4l4-4 4 4v4"/>',
    po:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.01"/>',
    kdy:   '<path d="M7 12a3 3 0 1 1 3 3c-2 0-3-3-6-3s-4 3-4 3"/><path d="M17 12a3 3 0 1 0-3 3c2 0 3-3 6-3"/>',
    ok:    '<path d="M5 13l4 4L19 7"/>',
  };

  if(t.done){
    return { druh:'hotovo', barva:'#2fbf71', ikona: IKONY.ok,
             text: t.doneDate ? 'Splněno ' + msDatumKratce(t.doneDate) : 'Splněno' };
  }
  if(!t.date || t.dateMode === 'none'){
    return { druh:'kdykoliv', barva:'var(--muted)', ikona: IKONY.kdy, text:'Kdykoliv', prerusovany:true };
  }

  const dnu = msDnuDo(t.date, todayIso);

  if(t.dateMode === 'deadline'){
    if(dnu < 0){
      const p = Math.abs(dnu);
      return { druh:'po-terminu', barva:'#ff7a86', ikona: IKONY.po,
               text: 'Po termínu o ' + p + ' ' + msSklonujDny(p) };
    }
    if(dnu === 0) return { druh:'lhuta', barva:'#ff9b32', ikona: IKONY.lhuta, text:'Dnes je poslední den' };
    if(dnu === 1) return { druh:'lhuta', barva:'#ff9b32', ikona: IKONY.lhuta, text:'Zítra je poslední den' };
    return { druh:'lhuta', barva:'#ffd35c', ikona: IKONY.lhuta,
             text: 'Zbývá ' + dnu + ' ' + msSklonujDny(dnu) };
  }

  // konkretni den
  const cas = t.time ? ' · ' + t.time : '';
  if(dnu < 0){
    const p = Math.abs(dnu);
    return { druh:'po-terminu', barva:'#ff7a86', ikona: IKONY.po,
             text: 'Mělo být ' + msDatumKratce(t.date) + ' (před ' + p + ' ' + msSklonujDny(p) + ')' };
  }
  if(dnu === 0) return { druh:'den', barva:'#25b7ff', ikona: IKONY.den, text:'Dnes' + cas };
  if(dnu === 1) return { druh:'den', barva:'#25b7ff', ikona: IKONY.den, text:'Zítra' + cas };
  return { druh:'den', barva:'#25b7ff', ikona: IKONY.den, text: msDatumKratce(t.date) + cas };
}

// Kolik dni zbyva do data (zaporne = uz je po nem).
function msDnuDo(iso, todayIso){
  const a = Date.parse((todayIso || msTodayIso()) + 'T00:00:00');
  const b = Date.parse(String(iso || '') + 'T00:00:00');
  if(!a || !b) return 0;
  return Math.round((b - a) / 86400000);
}
function msSklonujDny(n){ return n === 1 ? 'den' : (n < 5 ? 'dny' : 'dní'); }
function msDatumKratce(iso){
  const c = String(iso || '').split('-');
  if(c.length !== 3) return '';
  const DNY = ['Ne','Po','Út','St','Čt','Pá','So'];
  const d = new Date(Number(c[0]), Number(c[1]) - 1, Number(c[2]));
  return DNY[d.getDay()] + ' ' + Number(c[2]) + '. ' + Number(c[1]) + '.';
}

// HTML znacky - jedno misto pro Ukoly i Kalendar.
function msTaskZnackaHtml(t, todayIso){
  const z = msTaskZnacka(t, todayIso);
  const ramecek = z.prerusovany ? 'border:1px dashed var(--line);background:transparent'
    : `border:1px solid color-mix(in srgb, ${z.barva} 50%, transparent);background:color-mix(in srgb, ${z.barva} 8%, transparent)`;
  return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;
    padding:2px 6px;margin-top:3px;color:${z.barva};${ramecek}">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${z.ikona}</svg>
    ${msEsc(z.text)}
  </span>`;
}

function msTaskPriority(t, todayIso){
  if(t.done) return 5;
  if(!t.date || t.dateMode === 'none') return 4;
  if(t.date < todayIso) return 1;
  if(t.date === todayIso) return 2;
  return 3;
}
function msTasksByPriority(){
  const today = msTodayIso();
  return msTasks().slice().sort((a,b)=>{
    const pa = msTaskPriority(a, today), pb = msTaskPriority(b, today);
    if(pa !== pb) return pa - pb;
    const da = a.date || '', db = b.date || '';
    if(pa === 1) return db.localeCompare(da);   // po terminu: nejstarsi dluh nahoru
    if(da !== db) return da.localeCompare(db);
    // (11.8.2026) Stejny den: nejdriv ukoly s casem, a to podle hodiny.
    // Bez toho by rano a vecer lezelo pomichane podle poradi zadani.
    const ta = a.time || '', tb = b.time || '';
    if(ta && tb) return ta.localeCompare(tb);
    if(ta) return -1;
    if(tb) return 1;
    return 0;
  });
}

function msProjectKey(base){
  let pid = null;
  try{ pid = localStorage.getItem('ms_active_project_v1'); }catch(e){}
  return pid ? `${base}__${pid}` : base;
}

/* ============================================================
   ZOBRAZOVANE JMENO UZIVATELE (14.8.2026)
   Appka uz umela display_name ZAPSAT (MSCloud.ensureProfile), ale
   nikde ho zpatky necetla - vsude, kde se ukazuje "kdo tohle udelal"
   (tym stavby, aktuality, zaznam v cloudu), svitil jen syrovy e-mail.
   Jmeno se drzi lokalne v cache (NENI vazane na konkretni projekt -
   je to vlastnost UCTU, ne stavby), at ho appka nemusi pri kazdem
   pridani zaznamu tahat ze serveru. Cache se plni pri prihlaseni
   (MSCloud.getMyProfile) a pri ulozeni v Nastaveni.
   ============================================================ */
const MS_DISPLAY_NAME_KEY = 'ms_my_display_name_v1';
function msGetCachedDisplayName(){
  try{ return localStorage.getItem(MS_DISPLAY_NAME_KEY) || null; }catch(e){ return null; }
}
function msSetCachedDisplayName(name){
  try{
    if(name) localStorage.setItem(MS_DISPLAY_NAME_KEY, name);
    else localStorage.removeItem(MS_DISPLAY_NAME_KEY);
  }catch(e){}
}
// Co se ma pouzit jako "kdo tohle pridal" - jmeno, kdyz si ho clovek
// nastavil, jinak e-mail jako doted, jinak aspon neco.
function msMyDisplayLabel(session){
  const jmeno = msGetCachedDisplayName();
  if(jmeno) return jmeno;
  if(session && session.user && session.user.email) return session.user.email;
  return 'Uživatel';
}

// jednorazova migrace: kdo uz mel data ulozena postara (neorazitkovana)
// cestou, at mu po tehle zmene nezmizi - zkopiruje se to pod aktualni
// projekt, jen kdyz tam jeste nic vlastniho neni.
function msMigrateLegacyDataToProject(){
  try{
    const pid = localStorage.getItem('ms_active_project_v1');
    if(!pid) return;
    if(localStorage.getItem('ms_migrated_to_scoped_v1')) return;
    const LEGACY_KEYS = [
      'ms_photos_v1','ms_diary_v1','ms_documents_v1','ms_expenses_v1','ms_events_v1',
      'ms_custom_stages_v1','ms_selected_stages_v1','ms_current_stage_v1','ms_closed_stages_v1',
      'ms_stage_order_v1','ms_diary_queue_v1','ms_diary_meta_v1','ms_stage_active_days_v1',
      'ms_important_v1','ms_offers_v1','ms_project_meta_v1','ms_folder_tree_v1',
    ];
    LEGACY_KEYS.forEach(base=>{
      const legacy = localStorage.getItem(base);
      const scopedKey = `${base}__${pid}`;
      if(legacy!==null && localStorage.getItem(scopedKey)===null){
        localStorage.setItem(scopedKey, legacy);
      }
    });
    localStorage.setItem('ms_migrated_to_scoped_v1', '1');
  }catch(e){}
}

const MS_STAGES = [
  {key:'pozemek',   name:'Pozemek',          color:'#4dffab'},
  {key:'projekt_povoleni', name:'Projekt a povolení', color:'#b34cff'},
  {key:'zahrada',   name:'Zahrada',          color:'#4dffab'},
  {key:'zaklady',   name:'Základy',          color:'#b34cff'},
  {key:'zemni',     name:'Zemní práce',      color:'#25e8ff'},
  {key:'demolice',  name:'Demolice / bourací práce', color:'#ff6a6a'},
  {key:'sanace_vlhkosti', name:'Sanace vlhkosti', color:'#25e8ff'},
  {key:'hruba',     name:'Hrubá stavba',     color:'#ff5e7b'},
  {key:'strecha',   name:'Střecha',          color:'#ff9b32'},
  {key:'okna',      name:'Okna a dveře',     color:'#25b7ff'},
  {key:'elektro',   name:'Elektro',          color:'#ffd35c'},
  {key:'voda',      name:'Voda/kanalizace',  color:'#25e8ff'},
  {key:'vytapeni',  name:'Vytápění',         color:'#ff5e7b'},
  {key:'zatepleni', name:'Zateplení a fasáda', color:'#25b7ff'},
  {key:'podlahy',   name:'Podlahy',          color:'#ff9b32'},
  {key:'interier',  name:'Interiér (omítky)', color:'#ffd35c'},
  {key:'malby_natery', name:'Malby a nátěry', color:'#4dffab'},
  {key:'koupelna',  name:'Koupelna',         color:'#25e8ff'},
  {key:'kuchyne',   name:'Kuchyně',          color:'#ff9b32'},
  {key:'naradi',    name:'Nářadí',           color:'#ff5e7b'},
  {key:'chytra_domacnost', name:'Chytrá domácnost', color:'#ffd35c'},
  {key:'rekuperace', name:'Rekuperace',      color:'#4dffab'},
  {key:'garaz',     name:'Garáž',            color:'#ff9b32'},
  {key:'bazen',     name:'Bazén',            color:'#25b7ff'},
  {key:'posledni_upravy', name:'Poslední úpravy', color:'#b34cff'},
  {key:'plot',      name:'Plot',             color:'#4dffab'},
];
function msStageByKey(key){ return MS_STAGES.find(s=>s.key===key) || msCustomStages().find(s=>s.key===key); }

/* ============================================================
   PRESET ETAP PODLE TYPU STAVBY - pri zalozeni projektu se podle
   zvoleneho typu rovnou predvybere smysluplna sada etap z katalogu
   (uzivatel si pak kdykoliv muze cokoliv pridat/odebrat sam).
   "Jine" zustava zamerne prazdne - nema smysl hadat.
   ============================================================ */
const MS_TYPE_STAGE_PRESETS = {
  'Rodinný dům': ['pozemek','projekt_povoleni','zemni','zaklady','hruba','strecha','okna','elektro','voda','vytapeni','zatepleni','interier','koupelna','kuchyne','naradi','rekuperace','posledni_upravy','zahrada','plot'],
  'Chata': ['pozemek','projekt_povoleni','zemni','zaklady','hruba','strecha','okna','elektro','voda','vytapeni','interier','naradi','posledni_upravy','zahrada','plot'],
  'Byt': ['projekt_povoleni','elektro','voda','podlahy','malby_natery','interier','koupelna','kuchyne','chytra_domacnost','naradi','posledni_upravy'],
  'Rekonstrukce': ['projekt_povoleni','demolice','sanace_vlhkosti','elektro','voda','vytapeni','podlahy','malby_natery','interier','koupelna','kuchyne','naradi','posledni_upravy'],
  'Komerční objekt': ['pozemek','projekt_povoleni','zemni','zaklady','hruba','strecha','okna','elektro','voda','vytapeni','zatepleni','interier','rekuperace','naradi','posledni_upravy'],
  'Jiné': [],
};

/* ============================================================
   VLASTNÍ ETAPY (uzivatel si muze vytvorit i neco mimo katalog)
   ============================================================ */
const MS_CUSTOM_STAGES_KEY = 'ms_custom_stages_v1';
function msCustomStages(){ return msLoad(MS_CUSTOM_STAGES_KEY, ()=>[]); }
function msSaveCustomStages(list){ msSave(MS_CUSTOM_STAGES_KEY, list); msTriggerCloudSnapshotSync(); }
// katalog k vyberu v "Nova etapa" = vestavenych 9 + vlastni, ktere si uzivatel jiz vytvoril
function msStageCatalog(){ return [...MS_STAGES, ...msCustomStages()]; }
function msAddCustomStage(name, color){
  const list = msCustomStages();
  const stage = {key: msUid('custom_'), name, color, custom:true};
  list.push(stage);
  msSaveCustomStages(list);
  return stage;
}

/* ============================================================
   VYBRANÉ ETAPY (MS_STAGES je jen katalog možností; uživatel si
   vybere, které z nich se skutečně týkají jeho stavby - nulový
   stav = žádná vybraná, dokud si sám nepřidá)
   ============================================================ */
const MS_SELECTED_STAGES_KEY = 'ms_selected_stages_v1';
function msSelectedStageKeys(){ return msLoad(MS_SELECTED_STAGES_KEY, ()=>[]); }
function msSetSelectedStageKeys(keys){ msSave(MS_SELECTED_STAGES_KEY, keys); msTriggerCloudSnapshotSync(); }
function msSelectedStages(){
  const keys = msSelectedStageKeys();
  return msStageCatalog().filter(s => keys.includes(s.key));
}
function msAddSelectedStage(key){
  const keys = msSelectedStageKeys();
  if(!keys.includes(key)){
    keys.push(key);
    msSetSelectedStageKeys(keys);
  }
}
function msRemoveSelectedStage(key){
  msSetSelectedStageKeys(msSelectedStageKeys().filter(k => k !== key));
}
// kontrola, jestli k etape uz neco patri (vydaje, fotky, dokumenty, denik) -
// pouzito pri mazani etapy, at uzivatel vi, ze data zustanou "osirela"
function msStageHasData(key){
  return msSumExpensesByStage(key) > 0
    || msPhotos().some(p=>p.stage===key)
    || msDocuments().some(d=>d.stage===key)
    || msDiary().some(e=>e.stage===key);
}
// smaze etapu ze seznamu vybranych (a uklidi navazany stav) - data k ni
// (vydaje/fotky/dokumenty/denik) se NEmazou, jen ta etapa zmizi ze vyberu
// OPRAVA (bod 1, 2.8.2026): mazani etapy (stejne jako "aktualni"/"uzavrit
// etapu") je vyhrazene jen vlastnikovi - jednosmerne synchronizovane, ne
// obousmerne upravitelne pozvanym, bez ohledu na jeho prava v sekci
// "etapy". Zamek primo tady, centralne pro vsechna tri mista v appce
// (kolecko, prehled, detail), misto opakovane kontroly na kazdem z nich.
function msDeleteStage(key){
  const p = (typeof msActiveProjectForRights === 'function') ? msActiveProjectForRights() : null;
  if(p && p.isShared){
    if(typeof msShowAccessDenied === 'function') msShowAccessDenied();
    return;
  }
  msRemoveSelectedStage(key);
  msSetStageClosed(key, false);
  if(msGetCurrentStage()===key){
    try{ localStorage.removeItem(msProjectKey('ms_current_stage_v1')); }catch(e){}
  }
}

const MS_KEYS = {
  photos: 'ms_photos_v1',
  diary: 'ms_diary_v1',
  documents: 'ms_documents_v1',
  expenses: 'ms_expenses_v1',
  events: 'ms_events_v1',
};

function msEvents(){ return msLoad(MS_KEYS.events, ()=>[]); }
// Ticha synchronizace na pozadi HNED po pridani/zmene, ne az pri
// pristim otevreni Nastaveni - jen pro VLASTNI projekt s aktivnim
// Premium (u FREE/sdileneho projektu by se tim omylem zalozil
// zbytecny/spatny cloudovy zaznam). Spolecna pomocna funkce, at se
// nezapomene na nejakem dalsim miste (jako se to stalo u Kalendare).
//
// OPRAVA (1.8.2026, dulezita): NEKTERE zmeny (napr. nastaveni aktualni
// etapy) uvnitr zavolaji VIC funkci, ktere KAZDA zvlast spousti tenhle
// trigger (napr. msSetCurrentStage() -> msAddSelectedStage() ->
// msSetSelectedStageKeys() uz sama posila, a pak jeste msSetCurrentStage
// posle znovu na konci). Bez debounce by tak odletely DVA prekryvajici
// se pozadavky na server zaroven - a kdyz starsi dorazi POZDEJI nez ten
// novejsi (poradi site neni zaruceno), prepise novejsi data staršimi.
// Reseni: pockat kratkou chvili a poslat jen ten UPLNE POSLEDNI pozadavek.
let _msSnapshotSyncTimer = null;
function msTriggerCloudSnapshotSync(){
  if(typeof MSCloud === 'undefined') return;
  const active = msLoadProjects().find(p=>p.id===msGetActiveProjectId());
  if(!(active && !active.isShared && msIsPremiumMock())) return;
  if(_msSnapshotSyncTimer) clearTimeout(_msSnapshotSyncTimer);
  _msSnapshotSyncTimer = setTimeout(()=>{
    _msSnapshotSyncTimer = null;
    MSCloud.uploadSnapshot().catch(e=> console.error('tichy uploadSnapshot selhal', e));
  }, 800);
}

function msAddEvent(ev){
  const list = msEvents();
  const withId = Object.assign({id: msUid('e')}, ev);
  list.push(withId);
  msSave(MS_KEYS.events, list);
  if(typeof MSCloud !== 'undefined' && MSCloud.pushEvent){
    MSCloud.pushEvent(withId).then(({error, row})=>{
      if(error){ console.error('cloud push udalosti selhal', error); return; }
      if(row && row.id){
        const cur = msEvents();
        const idx = cur.findIndex(e=>e.id===withId.id);
        if(idx>-1){ cur[idx] = Object.assign({}, cur[idx], { cloudId: row.id }); msSave(MS_KEYS.events, cur); }
      }
    }).catch(e=> console.error('cloud push udalosti selhal', e));
  }
  return withId;
}
function msDeleteEvent(id){
  const ev = msEvents().find(e=>e.id===id);
  msSave(MS_KEYS.events, msEvents().filter(e=>e.id!==id));
  if(ev && ev.cloudId && typeof MSCloud !== 'undefined' && MSCloud.deleteEventCloud){
    MSCloud.deleteEventCloud(ev.cloudId).catch(e=> console.error('cloud delete udalosti selhalo', e));
  }
}
function msUpdateEvent(id, patch){
  const list = msEvents();
  const idx = list.findIndex(e=>e.id===id);
  if(idx===-1) return null;
  list[idx] = Object.assign({}, list[idx], patch);
  msSave(MS_KEYS.events, list);
  if(list[idx].cloudId && typeof MSCloud !== 'undefined' && MSCloud.updateEventCloud){
    MSCloud.updateEventCloud(list[idx].cloudId, { title: list[idx].title, date: list[idx].date, time: list[idx].time }).catch(e=> console.error('cloud update udalosti selhal', e));
  }
  return list[idx];
}

// ukoly - podobne jako udalosti (maji datum, zobrazuji se v Kalendari),
// ale navic jdou odskrtnout jako hotove - to udalosti nemaji
function msTasks(){ return msLoad('ms_tasks_v1', ()=>[]); }
function msAddTask(t){
  const list = msTasks();
  const withId = Object.assign({id: msUid('task'), done:false}, t);
  list.push(withId);
  msSave('ms_tasks_v1', list);
  if(typeof MSCloud !== 'undefined' && MSCloud.pushTask){
    MSCloud.pushTask(withId).then(({error, row})=>{
      if(error){ console.error('cloud push ukolu selhal', error); return; }
      if(row && row.id){
        const cur = msTasks();
        const idx = cur.findIndex(t=>t.id===withId.id);
        if(idx>-1){ cur[idx] = Object.assign({}, cur[idx], { cloudId: row.id }); msSave('ms_tasks_v1', cur); }
      }
    }).catch(e=> console.error('cloud push ukolu selhal', e));
  }
  return withId;
}
function msUpdateTask(id, patch){
  const list = msTasks();
  const idx = list.findIndex(t=>t.id===id);
  if(idx===-1) return null;
  list[idx] = Object.assign({}, list[idx], patch);
  msSave('ms_tasks_v1', list);
  if(list[idx].cloudId && typeof MSCloud !== 'undefined' && MSCloud.updateTaskCloud){
    MSCloud.updateTaskCloud(list[idx].cloudId, { title: list[idx].title, date: list[idx].date, date_mode: list[idx].dateMode, time: list[idx].time || null, done: !!list[idx].done, done_date: list[idx].doneDate || null, done_at: list[idx].doneAt ? new Date(list[idx].doneAt).toISOString() : null }).catch(e=> console.error('cloud update ukolu selhal', e));
  }
  return list[idx];
}
function msDeleteTask(id){
  const t = msTasks().find(x=>x.id===id);
  msSave('ms_tasks_v1', msTasks().filter(t=>t.id!==id));
  if(t && t.cloudId && typeof MSCloud !== 'undefined' && MSCloud.deleteTaskCloud){
    MSCloud.deleteTaskCloud(t.cloudId).catch(e=> console.error('cloud delete ukolu selhalo', e));
  }
}

// Sloucení stažených udalosti/ukolu - stejny princip jako Denik/Finance
// (cloudId/local_id pro poznani vlastniho zaznamu, obnova jmena
// pridavatele, mazani kdyz uz v cloudu neni).
/* ============================================================
   SPOLECNA KOSTRA SLUCOVANI DAT Z CLOUDU (11.8.2026)

   Kazdy typ dat (udalosti, ukoly, denik, finance, fotky, dokumenty,
   slozky, soubory) mel vlastni kopii uplne stejneho postupu:
     1) najdi zaznam podle cloudId a dopln zmeny,
     2) najdi vlastni zaznam podle local_id a dopis mu cloudId,
     3) co v cloudu je navic, pridej,
     4) co uz v cloudu neni, smaz.
   Osm kopii znamenalo, ze oprava v jedne se do ostatnich nedostala.
   Realne dusledky, na ktere se prislo az pozdeji: zarazeni do slozky
   se neaktualizovalo, uklid zaznamu ze snimku fungoval jen u nekterych
   typu, a do Deniku a Financi se omylem zkopiroval kus kodu o
   slozkach, ktery tam nema co delat.

   Kostra ted resi ty ctyri kroky na jednom miste. Kazdy typ do ni
   posle jen to, cim se skutecne lisi - jak se z radku poskladá lokalni
   zaznam a ktera pole se maji hlidat.
   ============================================================ */
function msMergeCloudList(cfg){
  const key = cfg.key;
  let list = [];
  try{ list = JSON.parse(localStorage.getItem(key) || '[]'); }catch(e){}

  const cloudIdIndex = {};
  list.forEach((z,i)=>{ if(z.cloudId) cloudIdIndex[z.cloudId] = i; });
  const localIdIndex = {};
  list.forEach((z,i)=>{ localIdIndex[z.id] = i; });

  let added = 0, patched = false;
  const novePridane = [];

  (cfg.rows||[]).forEach(row=>{
    // 1) uz ho mam - doplnit, co se v cloudu zmenilo
    if(cloudIdIndex.hasOwnProperty(row.id)){
      const idx = cloudIdIndex[row.id];
      const patch = cfg.zmeny ? (cfg.zmeny(list[idx], row) || {}) : {};
      // Jmeno pridavatele se obnovuje vzdy - vlastnik ho muze pozdeji
      // zmenit ve "Spravovat sdileni" a uz stazene zaznamy by si ho
      // jinak nikdy nedotahly.
      const newAuthor = row.added_by_label || 'Sdíleno';
      if(list[idx].author !== newAuthor) patch.author = newAuthor;
      if(Object.keys(patch).length){ list[idx] = Object.assign({}, list[idx], patch); patched = true; }
      return;
    }

    // 2) je to MUJ zaznam, jen jeste bez dopsaneho cloudId - dopsat ho,
    //    ne vyrabet duplicitu
    if(row.local_id && localIdIndex.hasOwnProperty(row.local_id)){
      const idx = localIdIndex[row.local_id];
      if(!list[idx].cloudId || list[idx].fromSnapshot){
        const upraveny = Object.assign({}, list[idx], { cloudId: row.id });
        delete upraveny.fromSnapshot; // uz je sparovany s cloudem
        list[idx] = upraveny; patched = true;
      }
      return;
    }

    // 3) uplne novy zaznam z cloudu
    const novy = cfg.novy(row);
    if(!novy) return;
    list.push(novy);
    novePridane.push(novy);
    added++;
  });

  // 4) uklid: co uz v cloudu neni, u vlastnika neexistuje
  const remoteIds = new Set((cfg.rows||[]).map(r=>r.id));
  const jePryc = (z)=> z.cloudId ? !remoteIds.has(z.cloudId) : !!z.fromSnapshot;
  const kSmazani = list.filter(jePryc);
  if(kSmazani.length){
    // Typy s binarnim obsahem (fotky, dokumenty) musi uklidit i ten.
    if(cfg.pouklidu) kSmazani.forEach(z=> cfg.pouklidu(z));
    list = list.filter(z=> !jePryc(z));
  }

  if(added || patched || kSmazani.length){
    try{ localStorage.setItem(key, JSON.stringify(list)); }
    catch(e){ console.error('msMergeCloudList', key, e); }
  }
  return { added, patched, removed: kSmazani.length, novePridane, list };
}

function msMergeCloudEvents(localProjectId, rows){
  const r = msMergeCloudList({
    key: 'ms_events_v1__' + localProjectId,
    rows,
    zmeny: (mam, row)=>{
      const p = {};
      if(mam.title !== row.title) p.title = row.title;
      if(mam.date !== row.date) p.date = row.date;
      if(mam.time !== row.time) p.time = row.time;
      return p;
    },
    novy: (row)=> ({
      id: msUid('e'), cloudId: row.id,
      title: row.title, date: row.date, time: row.time,
      author: row.added_by_label || 'Sdíleno',
    }),
  });
  return r.added + r.removed;
}
function msMergeCloudTasks(localProjectId, rows){
  const r = msMergeCloudList({
    key: 'ms_tasks_v1__' + localProjectId,
    rows,
    zmeny: (mam, row)=>{
      const p = {};
      if(mam.title !== row.title) p.title = row.title;
      if(mam.date !== row.date) p.date = row.date;
      if(mam.dateMode !== row.date_mode) p.dateMode = row.date_mode;
      if((mam.time || null) !== (row.time || null)) p.time = row.time || null;
      if(mam.done !== !!row.done) p.done = !!row.done;
      if(mam.doneDate !== (row.done_date||null)) p.doneDate = row.done_date || null;
      // doneAt (14.8.2026) - presny cas splneni, at je poradi v
      // Aktualitach spravne i u sdileneho ukolu na druhem zarizeni.
      if((mam.doneAt || null) !== (row.done_at || null)) p.doneAt = row.done_at || null;
      return p;
    },
    novy: (row)=> ({
      id: msUid('task'), cloudId: row.id,
      title: row.title, date: row.date, dateMode: row.date_mode,
      time: row.time || null, done: !!row.done, doneDate: row.done_date || null,
      doneAt: row.done_at || null,
      author: row.added_by_label || 'Sdíleno',
    }),
  });
  return r.added + r.removed;
}
function msUid(prefix){
  return prefix + Date.now() + Math.random().toString(36).slice(2, 8);
}

// Urcuje, jestli/jak se ma ukol zobrazit na dany den (iso) v kalendari.
// Pravidla (viz diskuze s uzivatelem):
// - "bez terminu" (none): dokud neni splneny, vidi se kazdy den pod DNESKEM.
//   Po splneni zmizi odevsad a objevi se jen v den, kdy byl splnen.
// - "konkretni den" (date): vidi se jen v ten den. Kdyz den mine a ukol
//   neni splneny, zacne se navic "vlecti" pod dneskem, zvyrazneny, dokud
//   se nesplni. Po splneni zakotvi jen v den splneni.
// - "deadline": vidi se kazdy den pod dneskem od zalozeni, po prekroceni
//   terminu zvyrazneny. Po splneni zakotvi jen v den splneni.
function msTaskVisibleOn(t, iso, todayIso){
  if(t.done){
    return { visible: t.doneDate === iso, highlighted:false };
  }
  if(t.dateMode === 'none'){
    /* ZMENA (13.8.2026): ukoly bez terminu se vesely na DNESEK. Zanaselo
       to dnesni den vecmi, ktere k nemu nepatri - a zitra se to opakovalo
       znovu. Do mrizky dni proto nepatri vubec; v Kalendari maji vlastni
       prouzek pod mrizkou, takze nezmizi, jen neprekazi. */
    return { visible:false, highlighted:false };
  }
  if(t.dateMode === 'date'){
    if(iso === t.date) return { visible:true, highlighted:false };
    if(iso === todayIso && todayIso > t.date) return { visible:true, highlighted:true };
    return { visible:false, highlighted:false };
  }
  if(t.dateMode === 'deadline'){
    if(iso === todayIso) return { visible:true, highlighted: todayIso > t.date };
    return { visible:false, highlighted:false };
  }
  return { visible:false, highlighted:false };
}

// gesto "zpet": tazeni prstem od leveho okraje displeje doprava (jako na iOS)
// - v HTML/webovem rozhrani to neni tak spolehlive jako v opravdove nativni
//   appce (prohlizec si to muze brat pro sve vlastni gesto), ale jako doplnek
//   k historii appky to funguje. Volá Router.back() - vlastni historie appky,
//   ne historii prohlizece (uz nejde o skutecne stranky).
(function swipeBack(){
  let startX = null, startY = null, startT = 0;
  const EDGE = 24; // px od leveho okraje, kde gesto muze zacit
  document.addEventListener('touchstart', (e)=>{
    if(e.touches.length !== 1) return;
    const t = e.touches[0];
    if(t.clientX <= EDGE){
      startX = t.clientX; startY = t.clientY; startT = Date.now();
    } else {
      startX = null;
    }
  }, {passive:true});
  document.addEventListener('touchend', (e)=>{
    if(startX === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = Math.abs(t.clientY - startY);
    const dt = Date.now() - startT;
    if(dx > 70 && dy < 60 && dt < 600 && window.Router){
      Router.back();
    }
    startX = null;
  }, {passive:true});
})();

/* ============================================================
   ULOZISTE FOTEK/DOKUMENTU (IndexedDB) - localStorage ma pevny
   strop ~5-10 MB sdileny pro celou appku, coz na fotky/dokumenty
   ve slusne kvalite nestaci. Samotny obsah (velky base64 obrazek)
   ted zije v IndexedDB (radove stovky MB az GB, podle mista v
   telefonu), localStorage drzi jen male metadata (kdo, kdy, kam).
   Zbytek appky pozna zmenu jen minimalne - .thumb/.content pole
   zustavaji stejne pojmenovana, jen se doplni z pametove keše misto
   primo z ulozeneho zaznamu.
   ============================================================ */
/* ==========================================================
   VELIKOST UKLADANYCH FOTEK (8.8.2026)
   Fotky se ukladaly v 2000 px pri kvalite 90 %, coz je jako text
   v pameti pres 1 MB na kus. Pri hromadnem pridani (15 fotek) drzela
   appka soubezne pres 20 MB retezcu - iOS ji na tom odstrihl a fotky
   se "nikam neulozily". 1600 px / 82 % je pro stavebni denik i PDF
   porad vic nez dost a je to skoro trikrat mensi.
   ========================================================== */
const MS_PHOTO_PRESETS = {
  usporna:  { dim:1400, q:0.78, label:'Úsporná'  },
  standard: { dim:1800, q:0.86, label:'Standardní' },
  nejvyssi: { dim:2400, q:0.92, label:'Nejvyšší' },
};
function msGetPhotoQuality(){
  let v = null;
  try{ v = localStorage.getItem('ms_photo_quality_v1'); }catch(e){}
  return (v && MS_PHOTO_PRESETS[v]) ? v : 'standard';
}
function msSetPhotoQuality(name){
  if(!MS_PHOTO_PRESETS[name]) name = 'standard';
  try{ localStorage.setItem('ms_photo_quality_v1', name); }catch(e){}
}
/* Bezi appka jako karta v prohlizeci, nebo jako nainstalovana appka?
   Rozdil je podstatny: kazde z toho ma VLASTNI localStorage i
   IndexedDB, takze data z jednoho se v druhem neobjevi. (11.8.2026) */
function msIsBrowserTab(){
  try{
    const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
      || window.navigator.standalone === true;
    return !standalone;
  }catch(e){ return false; }
}

/* Datum podle MISTNIHO casu, ne podle UTC (11.8.2026).
   Puvodne se skoro vsude pouzivalo new Date().toISOString().slice(0,10).
   toISOString() ale prevadi na UTC - a Cesko je v lete UTC+2. Mezi
   pulnoci a druhou hodinou rannou tak appka za "dnesek" povazovala
   VCEREJSEK: zapis do deniku porizeny v 00:30 dostal vcerejsi datum,
   ukol zadany "na dnesek" spadl do minulosti a v kalendari se
   zvyraznoval spatny den. Na stavbe se vecerni zapisy delaji bezne,
   takze to nebyl okrajovy pripad. */
/* Prevod castky napsane clovekem na cislo (11.8.2026).
   Zvlada ceske zvyklosti: desetinnou CARKU ("1200,50"), mezery i
   nezlomne mezery jako oddelovac tisicu ("1 200") a tecku jako
   oddelovac tisicu ("1.200"). Rozliseni tecky: kdyz jsou za posledni
   teckou prave tri cislice A zaroven v cisle neni carka, je to
   oddelovac tisicu; jinak je to desetinna tecka.
   Puvodne se pouzivalo jen Number(...) - pri carce to vratilo NaN a
   appka tvrdila "Zadej částku", i kdyz ji clovek zadal. */
function msParseCastka(vstup){
  if(typeof vstup === 'number') return isFinite(vstup) ? vstup : 0;
  let t = String(vstup == null ? '' : vstup).trim();
  if(!t) return 0;
  t = t.replace(/[\s\u00A0\u202F]/g, '');   // mezery vsech druhu
  t = t.replace(/(Kč|kc|CZK)/gi, '');
  const maCarku = t.indexOf(',') >= 0;
  if(maCarku){
    t = t.replace(/\./g, '');   // tecky jsou pak jiste oddelovace tisicu
    t = t.replace(',', '.');
  } else {
    const posledni = t.lastIndexOf('.');
    if(posledni >= 0 && (t.length - posledni - 1) === 3 && t.indexOf('.') !== posledni){
      t = t.replace(/\./g, '');   // "1.200.000" - same oddelovace tisicu
    } else if(posledni >= 0 && (t.length - posledni - 1) === 3 && /^\d{1,3}\.\d{3}$/.test(t)){
      t = t.replace('.', '');      // "1.200"
    }
  }
  const n = Number(t);
  return isFinite(n) ? n : 0;
}

/* Osetreni uzivatelskeho textu pred vlozenim do HTML (11.8.2026).

   Appka skoro vsude sklada obrazovky pres innerHTML a texty od uzivatele
   (nazvy etap, zapisy, popisky fotek, jmena souboru) do nich vkladala
   PRIMO. Dva dusledky:
     1) BEZPECNOST: u sdilene stavby mohl pozvany s pravem pridavat
        napsat zapis, ktery se u vlastnika spustil jako kod - a dostal by
        se tim k jeho prihlaseni ulozenemu v prohlizeci.
     2) BEZNY PROVOZ: staci etapa pojmenovana "Střecha <2. část>" nebo
        popis s "&" a obrazovka se vykresli spatne.

   Dve stejne funkce uz v appce byly (screen-settings, screen-shareStavba),
   kazda jen pro svuj soubor. Tohle je jedna pro celou appku. */
function msEsc(text){
  if(text === null || text === undefined) return '';
  return String(text).replace(/[&<>"']/g, c=> ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
}

function msTodayIso(){
  return msDateToIso(new Date());
}
function msDateToIso(d){
  if(!d) return null;
  return d.getFullYear() + '-'
    + String(d.getMonth()+1).padStart(2,'0') + '-'
    + String(d.getDate()).padStart(2,'0');
}

function msPhotoMaxDim(){ return MS_PHOTO_PRESETS[msGetPhotoQuality()].dim; }
function msPhotoQuality(){ return MS_PHOTO_PRESETS[msGetPhotoQuality()].q; }

/* ==========================================================
   ROZPOCET JEDNOHO NAHRANI (8.8.2026)
   Pevny pocet fotek (12) byl spatne merilo - pri usporne kvalite
   je to malo, pri nejvyssi porad moc. Limit je proto v bajtech a
   pocet fotek z nej vyplyne sam podle nastavene kvality.
   Meri se SKUTECNA velikost uz zmensenych fotek, ne odhad -
   odhad se u fotky oblohy a fotky vykresu lisi nekolikanasobne.
   ========================================================== */
const MS_UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024;   // 5 MB na jedno nahrani

// hruby odhad velikosti jedne fotky - slouzi JEN k tomu, aby appka
// dopredu rekla "vejde se asi X fotek". Skutecny limit hlida mereni.
function msApproxPhotoBytes(){
  const p = MS_PHOTO_PRESETS[msGetPhotoQuality()];
  const px = p.dim * p.dim * 0.6;              // bezny pomer stran
  const bytesPerPx = 0.055 + (p.q - 0.78) * 0.55;
  return Math.round(px * bytesPerPx * 1.34);   // +34 % za zapis jako text
}
function msApproxPhotosPerUpload(){
  return Math.max(1, Math.floor(MS_UPLOAD_LIMIT_BYTES / msApproxPhotoBytes()));
}
function msFormatMb(bytes){ return (bytes/1024/1024).toFixed(1).replace('.', ',') + ' MB'; }

const MS_BLOB_CACHE = new Map();
let msIdbPromise = null;
function msIdbOpen(){
  if(msIdbPromise) return msIdbPromise;
  msIdbPromise = new Promise((resolve)=>{
    if(!window.indexedDB){ resolve(null); return; }
    const req = indexedDB.open('moje-stavba-media', 1);
    req.onupgradeneeded = ()=>{ req.result.createObjectStore('blobs'); };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> resolve(null);
  });
  return msIdbPromise;
}
// OPRAVA (31.7.2026): na nekterych telefonech (hlavne iPhone/WebKit)
// IndexedDB transakce obcas "zamrzne" navzdy - nikdy nezavola ani
// oncomplete/onsuccess, ani onerror. Bez casoveho limitu by na to appka
// cekala donekonecna (a spolu s ni cokoli, co na dokonceni ulozeni ceka -
// napr. cely zapis do Deniku s prilozenou fotkou, ktery pak vypadal, ze
// se "nikdy neulozi", i kdyz fotka mezitim v Galerii byla). Po peti
// vterinach appka operaci vzda a pokracuje dal. Tohle NENI specificke
// pro sdileni/Premium - tyka se to appky uplne obecne (FREE i Premium).
function msIdbWithTimeout(promise, key, label){
  const timeout = new Promise(resolve=> setTimeout(()=>{
    console.error('msIdb' + label + ': časový limit vypršel, IndexedDB transakce zamrzla', key);
    resolve(label === 'Get' ? null : false);
  }, 12000));
  return Promise.race([promise, timeout]);
}
// OPRAVA (1.8.2026, dulezita): appka ted na sdilenem zarizeni bezi
// vic soubeznych ulozny operaci najednou (vlastni pridana fotka +
// stahovani fotek od druhe strany na pozadi) - souběžné IndexedDB
// transakce jsou na iOS znamy zdroj tichych selhani (appka si mysli,
// ze ulozila, ale neulozila). Reseni: fronta - vsechny zapisy/cteni
// do IndexedDB bezi VZDY jeden po druhem, nikdy soubezne, bez ohledu
// na to, kolik ruznych mist appky si o to zaroven rekne.
let _msIdbChain = Promise.resolve();
function msIdbEnqueue(taskFn){
  const run = () => taskFn();
  const next = _msIdbChain.then(run, run); // i po predchozim selhani fronta pokracuje dal
  _msIdbChain = next.catch(()=>{});
  return next;
}
function msIdbSet(key, value){
  return msIdbEnqueue(()=>{
    const attempt = msIdbOpen().then(db=> new Promise(resolve=>{
      if(!db){ resolve(false); return; }
      try{
        const tx = db.transaction('blobs','readwrite');
        tx.objectStore('blobs').put(value, key);
        tx.oncomplete = ()=> resolve(true);
        tx.onerror = ()=> resolve(false);
      }catch(e){ resolve(false); }
    }));
    return msIdbWithTimeout(attempt, key, 'Set');
  });
}
function msIdbGet(key){
  return msIdbEnqueue(()=>{
    const attempt = msIdbOpen().then(db=> new Promise(resolve=>{
      if(!db){ resolve(null); return; }
      try{
        const tx = db.transaction('blobs','readonly');
        const req = tx.objectStore('blobs').get(key);
        req.onsuccess = ()=> resolve(req.result || null);
        req.onerror = ()=> resolve(null);
      }catch(e){ resolve(null); }
    }));
    return msIdbWithTimeout(attempt, key, 'Get');
  });
}
function msIdbDelete(key){
  return msIdbEnqueue(()=>{
    const attempt = msIdbOpen().then(db=> new Promise(resolve=>{
      if(!db){ resolve(false); return; }
      try{
        const tx = db.transaction('blobs','readwrite');
        tx.objectStore('blobs').delete(key);
        tx.oncomplete = ()=> resolve(true);
        tx.onerror = ()=> resolve(false);
      }catch(e){ resolve(false); }
    }));
    return msIdbWithTimeout(attempt, key, 'Delete');
  });
}
function msIdbAllKeys(){
  return msIdbOpen().then(db=> new Promise(resolve=>{
    if(!db){ resolve([]); return; }
    try{
      const tx = db.transaction('blobs','readonly');
      const req = tx.objectStore('blobs').getAllKeys();
      req.onsuccess = ()=> resolve(req.result || []);
      req.onerror = ()=> resolve([]);
    }catch(e){ resolve([]); }
  }));
}
// blob klice se orazitkuji aktivnim projektem stejne jako localStorage klice
function msBlobKey(type, id){ return msProjectKey(`${type}_${id}`); }
// nacte VSECHNY fotky/dokumenty aktualniho projektu do pametove keše -
// zavola se jednou pri startu appky, pred prvnim vykreslenim
/* Dovyrobi nahledy fotkam z drivejsich verzi. Bezi po startu na
   pozadi, po jedne a s pauzou - at appce nesebere vykon zrovna ve
   chvili, kdy s ni clovek pracuje. */
async function msBuildMissingThumbs(){
  try{
    const ids = msLoad(MS_KEYS.photos, msSeedPhotos).map(p=>p.id);
    for(const id of ids){
      if(MS_BLOB_CACHE.has(msPhotoThumbKey(id))) continue;
      await msEnsureThumb(id);
      await new Promise(r=> setTimeout(r, 120));
    }
  }catch(e){ console.error('msBuildMissingThumbs', e); }
}

async function msHydrateBlobCache(onProgress){
  const photoIds = msPhotos().map(p=>p.id);
  const docIds = msDocuments().map(d=>d.id);
  const receiptIds = msLoad(MS_KEYS.expenses, msSeedExpenses).filter(t=>t.hasReceipt).map(t=>t.id);
  const projectItemIds = (typeof msLoadProjectItems === 'function') ? msLoadProjectItems().map(it=>it.id) : [];
  // (14.8.2026) Skutecny postup pro uvodni obrazovku - viz index.html.
  // Hlasi se, ne predstira: cislo odpovida tomu, kolik polozek uz je
  // opravdu hotovych.
  const celkem = photoIds.length + docIds.length + receiptIds.length + projectItemIds.length;
  let hotovo = 0;
  const posun = ()=>{ hotovo++; if(onProgress && celkem) onProgress(hotovo, celkem); };
  await Promise.all([
    // ZMENA (9.8.2026): pri startu se nacitaji jen NAHLEDY, ne plne
    // fotky - pri 120 fotkach to je rozdil mezi 3 MB a 30 MB v pameti
    // jeste pred prvnim vykreslenim. Plnou fotku si vyzada az prohlizec.
    ...photoIds.map(async id=>{
      const tk = msPhotoThumbKey(id);
      let t = null;
      try{ t = await msIdbGet(tk); }catch(e){}
      if(t) MS_BLOB_CACHE.set(tk, t);
      // fotka z drivejsi verze jeste nahled nema - vyrobi se pozdeji
      // na pozadi, viz msBuildMissingThumbs()
      posun();
    }),
    ...docIds.map(async id=>{ const v = await msIdbGet(msBlobKey('doc', id)); if(v) MS_BLOB_CACHE.set(msBlobKey('doc', id), v); posun(); }),
    ...receiptIds.map(async id=>{ const v = await msIdbGet(msBlobKey('receipt', id)); if(v) MS_BLOB_CACHE.set(msBlobKey('receipt', id), v); posun(); }),
    ...projectItemIds.map(async id=>{ const v = await msIdbGet(msBlobKey('pitem', id)); if(v) MS_BLOB_CACHE.set(msBlobKey('pitem', id), v); posun(); }),
  ]);
}
// jednorazova migrace: kdo uz mel fotky/dokumenty ulozene primo v
// localStorage (stary zpusob), presune se obsah do IndexedDB a z
// localStorage zaznamu se smaze - tim se hned uvolni misto
async function msMigratePhotosDocsToIdb(){
  try{
    if(localStorage.getItem(msProjectKey('ms_migrated_to_idb_v1'))) return;
    const photos = msPhotos();
    let changed = false;
    for(const p of photos){
      if(p.thumb){ await msIdbSet(msBlobKey('photo', p.id), p.thumb); MS_BLOB_CACHE.set(msBlobKey('photo', p.id), p.thumb); delete p.thumb; changed = true; }
    }
    if(changed) msSave(MS_KEYS.photos, photos);
    const docs = msDocuments();
    let changed2 = false;
    for(const d of docs){
      if(d.content){ await msIdbSet(msBlobKey('doc', d.id), d.content); MS_BLOB_CACHE.set(msBlobKey('doc', d.id), d.content); delete d.content; changed2 = true; }
    }
    if(changed2) msSave(MS_KEYS.documents, docs);
    localStorage.setItem(msProjectKey('ms_migrated_to_idb_v1'), '1');
  }catch(e){}
}

function msLoad(storageKey, seedFn){
  const key = msProjectKey(storageKey);
  try{
    const raw = localStorage.getItem(key);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  const seed = seedFn();
  try{ localStorage.setItem(key, JSON.stringify(seed)); }catch(e){}
  return seed;
}

/* ============================================================
   DIAGNOSTIKA A UKLID ULOZISTE - localStorage ma pevny strop
   (~5-10 MB) SDILENY pro CELOU appku napric vsemi projekty, ne
   zvlast pro kazdy. Komprese u NOVYCH fotek/dokumentu pomuze jen
   do budoucna - tohle umi zmensit i to, co uz je ulozene.
   ============================================================ */
function msStorageUsageBytes(){
  let total = 0;
  try{
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      const v = localStorage.getItem(k);
      total += (k?k.length:0) + (v?v.length:0);
    }
  }catch(e){}
  return total; // priblizne - 1 znak v JS retezci ~ 2 bajty, ale radove staci
}
/* ============================================================
   EXIF ORIENTACE PRI ZMENSOVANI FOTKY Z FOTOAPARATU (14.8.2026)
   Fotka vyfocena na vysku obcas nese jen priznak "otoc o 90°" v EXIF
   datech (kamera samotna pixely nikdy neotoci, je to rychlejsi).
   Prohlizec podle toho spravne otoci <img> na obrazovce - ale
   canvas.drawImage() EXIF priznak ignoruje a nakresli SUROVA data
   bez otoceni. Vysledkem byla fotka na bok nebo vzhuru nohama,
   pouzitelna tak akorat v malicke 76px dlazdici (kde si toho clovek
   nevsimne), ale nepouzitelna po zvetseni.
   Reseni: precist priznak orientace primo z bajtu souboru (JPEG
   EXIF), a podle nej canvas pred vykreslenim spravne otocit/preklopit.
   Kdyz cteni cehokoli selze, appka vsude tise pokracuje BEZ otoceni -
   nikdy nesmi kvuli tomuhle fotku odmitnout. */
function msCtiExifOrientaci(file){
  return new Promise(resolve=>{
    try{
      const reader = new FileReader();
      reader.onload = ()=>{
        try{
          const view = new DataView(reader.result);
          if(view.byteLength < 4 || view.getUint16(0, false) !== 0xFFD8){ resolve(1); return; }
          let offset = 2;
          while(offset < view.byteLength - 2){
            const marker = view.getUint16(offset, false);
            offset += 2;
            if(marker === 0xFFE1){ // APP1 - tady byva EXIF
              const exifLength = view.getUint16(offset, false);
              // "Exif\0\0" hned za delkou segmentu
              if(view.getUint32(offset + 2, false) !== 0x45786966){ resolve(1); return; }
              const tiffOffset = offset + 8;
              const little = view.getUint16(tiffOffset, false) === 0x4949;
              const firstIfdOffset = view.getUint32(tiffOffset + 4, little);
              const dirStart = tiffOffset + firstIfdOffset;
              const entries = view.getUint16(dirStart, little);
              for(let i = 0; i < entries; i++){
                const entryOffset = dirStart + 2 + i*12;
                if(view.getUint16(entryOffset, little) === 0x0112){ // Orientation tag
                  resolve(view.getUint16(entryOffset + 8, little));
                  return;
                }
              }
              resolve(1); return;
            } else if((marker & 0xFF00) !== 0xFF00){
              break; // uz to neni platny JPEG marker - konec hledani
            } else {
              offset += view.getUint16(offset, false);
            }
          }
          resolve(1); // zadny EXIF segment - bezna orientace
        }catch(e){ resolve(1); }
      };
      reader.onerror = ()=> resolve(1);
      // Staci prvnich ~64 kB - EXIF hlavicka je vzdy na zacatku souboru,
      // cist cely (klidne desitky MB velky) soubor by bylo zbytecne.
      reader.readAsArrayBuffer(file.slice(0, 65536));
    }catch(e){ resolve(1); }
  });
}

// Rozmery a transformace canvasu podle EXIF hodnoty 1-8. Hodnoty 5-8
// navic prohazuji sirku a vysku (fotka je pretocena o 90°).
function msExifCanvasTransform(ctx, orientace, w, h){
  switch(orientace){
    case 2: ctx.transform(-1,0,0,1,w,0); break;               // zrcadlo vodorovne
    case 3: ctx.transform(-1,0,0,-1,w,h); break;               // 180°
    case 4: ctx.transform(1,0,0,-1,0,h); break;                // zrcadlo svisle
    case 5: ctx.transform(0,1,1,0,0,0); break;                 // zrcadlo + 90°
    case 6: ctx.transform(0,1,-1,0,h,0); break;                // 90° po smeru hodin
    case 7: ctx.transform(0,-1,-1,0,h,w); break;                // zrcadlo + 270°
    case 8: ctx.transform(0,-1,1,0,0,w); break;                 // 270° po smeru hodin
    default: break;                                             // 1 - beze zmeny
  }
}

/* Sdilena nahrada za drivejsi DVE totozne kopie "resizeImage" (ve
   screen-forms.js) - obe kreslily primo na canvas bez EXIF otoceni.
   Pouziti je stejne jako drive: msResizeImageFile(file, maxDim) vrati
   Promise<dataURL>. */
function msResizeImageFile(file, maxDim, quality){
  return new Promise(async (resolve, reject)=>{
    let orientace = 1;
    try{ orientace = await msCtiExifOrientaci(file); }catch(e){}
    const reader = new FileReader();
    reader.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        let {width,height} = img;
        if(width>height && width>maxDim){ height=height*maxDim/width; width=maxDim; }
        else if(height>maxDim){ width=width*maxDim/height; height=maxDim; }
        const canvas = document.createElement('canvas');
        const otoceno = orientace >= 5 && orientace <= 8;
        canvas.width = otoceno ? height : width;
        canvas.height = otoceno ? width : height;
        const ctx = canvas.getContext('2d');
        msExifCanvasTransform(ctx, orientace, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality != null ? quality : (typeof msPhotoQuality==='function'?msPhotoQuality():0.86)));
      };
      img.onerror = ()=> reject(new Error('obrazek se nepodarilo rozkodovat'));
      img.src = reader.result;
    };
    reader.onerror = ()=> reject(new Error('soubor se nepodarilo precist'));
    reader.readAsDataURL(file);
  });
}

function msResizeDataUrl(dataUrl, maxDim, quality){
  const attempt = new Promise(resolve=>{
    if(!dataUrl || !dataUrl.startsWith('data:image')){ resolve(dataUrl); return; }
    const img = new Image();
    img.onload = ()=>{
      let {width,height} = img;
      if(Math.max(width,height) <= maxDim){ resolve(dataUrl); return; } // uz dost male, netreba prepocitavat
      if(width>height){ height = height*maxDim/width; width = maxDim; }
      else { width = width*maxDim/height; height = maxDim; }
      const canvas = document.createElement('canvas');
      canvas.width=width; canvas.height=height;
      canvas.getContext('2d').drawImage(img,0,0,width,height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = ()=> resolve(dataUrl);
    img.src = dataUrl;
  });
  // OPRAVA (31.7.2026): stejna pojistka jako u IndexedDB (msIdbWithTimeout) -
  // na nekterych telefonech se i zmensovani obrazku pres canvas muze vzacne
  // zaseknout (ani onload, ani onerror se nezavola). Bez limitu by na to
  // cekal donekonecna cely zapis do Deniku, ktery na tenhle vysledek ceka.
  // Po peti vterinach appka pouzije PUVODNI (nezmensenou) fotku misto
  // vecneho cekani - horsi nez male zmenseni, ale rozhodne lepsi nez
  // ztraceny zapis.
  const timeout = new Promise(resolve=> setTimeout(()=>{
    console.error('msResizeDataUrl: časový limit vypršel, zmenšení obrázku zamrzlo');
    resolve(dataUrl);
  }, 12000));
  return Promise.race([attempt, timeout]);
}
// projde uz ulozene fotky a dokumenty teto etapy/projektu a znovu je
// zmensi na stejny strop, jaky uz plati pro nove nahravane veci - vraci
// kolik bajtu se uvolnilo, at je to videt v Nastaveni
/* ==========================================================
   ZMENSENI JIZ ULOZENYCH MEDII (upraveno 8.8.2026)
   Fotky se zmensovaly na 480 px pri kvalite 70 %. To nebyla
   uspora, ale znicena fotka - z 1800px snimku zustal nahled, ze
   ktereho uz neslo precist stitek rozvadece ani detail vykresu.
   A protoze original nikde jinde neni, byla to nevratna ztrata,
   pritom popisek u tlacitka tvrdil "bez ztraty obsahu".
   Ted 1200 px / 80 %: usetri se rekneme polovina, ale fotka
   zustane pouzitelna na cteni i do PDF.
   ========================================================== */
const MS_SHRINK_PHOTO_DIM = 1200;
const MS_SHRINK_PHOTO_Q   = 0.80;

async function msCompressExistingMedia(onProgress){
  let savedBytes = 0;
  const photos = msPhotos();
  for(let i=0;i<photos.length;i++){
    const key = msBlobKey('photo', photos[i].id);
    const before = JSON.stringify(photos[i].thumb||'').length;
    const resized = await msResizeDataUrl(photos[i].thumb, MS_SHRINK_PHOTO_DIM, MS_SHRINK_PHOTO_Q);
    const after = JSON.stringify(resized||'').length;
    if(resized && after < before){ MS_BLOB_CACHE.set(key, resized); await msIdbSet(key, resized); savedBytes += (before-after); }
    if(onProgress) onProgress('fotky', i+1, photos.length);
  }
  const docs = msDocuments();
  for(let i=0;i<docs.length;i++){
    const key = msBlobKey('doc', docs[i].id);
    const before = JSON.stringify(docs[i].content||'').length;
    const resized = await msResizeDataUrl(docs[i].content, 1400, 0.75);
    const after = JSON.stringify(resized||'').length;
    if(resized && after < before){ MS_BLOB_CACHE.set(key, resized); await msIdbSet(key, resized); savedBytes += (before-after); }
    if(onProgress) onProgress('dokumenty', i+1, docs.length);
  }
  return savedBytes;
}
function msSave(storageKey, list){
  try{ localStorage.setItem(msProjectKey(storageKey), JSON.stringify(list)); return true; }
  catch(e){ return false; }
}

/* --- výchozí ukázková data --- */
function msSeedPhotos(){
  return [];
}
function msSeedDiary(){
  return [];
}
/* ============================================================
   FRONTA "PRIPRAVENO PRO DALSI ZAPIS" - kdyz uzivatel prida fotku,
   dokument nebo udalost (nebo dokonci etapu), muze/automaticky se to
   zarad do fronty. Pri dalsim zapisu do deniku se fronta nabidne jako
   dlaždice k vyrazeni/potvrzeni, a po ulozeni zapisu se cela vyprazdni -
   dalsi zapis pak sbira jen NOVE veci pridane od tohoto okamziku.
   ============================================================ */
const MS_DIARY_QUEUE_KEY = 'ms_diary_queue_v1';
function msDiaryQueue(){ return msLoad(MS_DIARY_QUEUE_KEY, ()=>[]); }
function msQueueForDiary(type, refId){
  const q = msDiaryQueue();
  if(q.some(it=>it.type===type && it.refId===refId)) return;
  q.push({ type, refId, addedAt: Date.now() });
  msSave(MS_DIARY_QUEUE_KEY, q);
}
function msUnqueueFromDiary(type, refId){
  msSave(MS_DIARY_QUEUE_KEY, msDiaryQueue().filter(it=>!(it.type===type && it.refId===refId)));
}
// fronta prevedena na zobrazitelne objekty (s nahledem/popiskem) - polozky,
// jejichz zdroj uz neexistuje (napr. smazana fotka), se tise vynechaji
function msDiaryQueueResolved(){
  const out = [];
  msDiaryQueue().forEach(it=>{
    if(it.type==='photo'){
      const p = msPhotos().find(x=>x.id===it.refId);
      if(p) out.push(Object.assign({}, it, {label: p.caption || 'Fotka', preview: p.thumb, stage: p.stage}));
    } else if(it.type==='document'){
      const d = msDocuments().find(x=>x.id===it.refId);
      if(d) out.push(Object.assign({}, it, {label: d.name, preview: null, stage: d.stage}));
    } else if(it.type==='event'){
      const e = msEvents().find(x=>x.id===it.refId);
      if(e) out.push(Object.assign({}, it, {label: e.title, preview: null, stage: null}));
    } else if(it.type==='stage_complete'){
      const s = msStageByKey(it.refId);
      if(s) out.push(Object.assign({}, it, {label: 'Dokončena etapa: '+s.name, preview: null, stage: it.refId}));
    } else if(it.type==='projectitem'){
      // (14.8.2026) Soubory z Projektu jdou ted taky pripojit k zapisu -
      // viz picker "Připojit z appky" ve screen-forms.js.
      const p = (typeof msLoadProjectItems === 'function') ? msLoadProjectItems().find(x=>x.id===it.refId) : null;
      if(p) out.push(Object.assign({}, it, {label: p.name, preview: (p.mime&&p.mime.startsWith('image/')) ? MS_BLOB_CACHE.get(msBlobKey('pitem', p.id)) : null, stage: null}));
    }
  });
  return out.sort((a,b)=>a.addedAt-b.addedAt);
}
// datum posledniho zapisu do deniku (pro pripominku "uz tyden nic")
function msLastDiaryEntryDate(){
  const list = msDiary();
  if(!list.length) return null;
  return list.map(e=>e.date).sort().pop();
}
function msDayCount(startISO){
  const start = new Date(startISO+'T00:00:00');
  const now = new Date();
  return Math.max(1, Math.floor((now-start)/86400000)+1);
}
function msAddDiaryEntry(entry){
  const list = msDiary();
  const withId = Object.assign({id:msUid('d'), date: msTodayISO(), time: new Date().toTimeString().slice(0,5), author:'Stavebník'}, entry);
  list.push(withId);
  msSave(MS_KEYS.diary, list);
  // Obousmerne sdileni (1.8.2026): funguje stejne pro vlastnika i pro
  // pozvaneho s pravem pridavat do deniku - MSCloud.pushDiaryEntry() si
  // sam poradi s tim, kam presne patri (vlastni projekt vs sdileny).
  if(typeof MSCloud !== 'undefined' && MSCloud.pushDiaryEntry){
    MSCloud.pushDiaryEntry(withId).then(({error, row})=>{
      if(error){ console.error('cloud push zapisu do deniku selhal', error); return; }
      if(row && row.id){
        // dopln cloudId zpetne na lokalni zaznam - bez tohohle by pozdejsi
        // slouceni (msMergeCloudDiaryEntries) nepoznalo, ze uz tenhle
        // konkretni zapis mame, a zduplikovalo by ho
        const cur = msDiary();
        const idx = cur.findIndex(e=>e.id===withId.id);
        if(idx>-1){ cur[idx] = Object.assign({}, cur[idx], { cloudId: row.id }); msSave(MS_KEYS.diary, cur); }
      }
    }).catch(e=> console.error('cloud push zapisu do deniku selhal', e));
  }
  return withId;
}
// Sloucí (ne prepise) radky stazene z project_diary_entries podle
// cloudId - pouziva se z MSCloud pri periodicke kontrole. Vraci pocet
// skutecne pridanych novych zaznamu (0 = nic noveho, appka se pak
// nemusi zbytecne prekreslovat).
//
// OPRAVA (1.8.2026, kriticka): puvodni verze poznavala "uz to mam" JEN
// podle cloudId - ale cloudId se na lokalni zaznam dopisuje AZ po
// potvrzeni ze serveru (asynchronne, s malym zpozdenim). Pokud v tomhle
// kratkem okne prosel dalsi kontrolni cyklus, appka nepoznala vlastni
// prave odeslany zapis, "stahla" ho znovu jako by byl cizi - a protoze
// se to opakovalo pri kazdem cyklu (dokud se cloudId nakonec nedopsalo,
// coz u nekterych zaznamu vubec nenastalo), vznikaly duplicity znovu a
// znovu. Reseni: poznat vlastni zaznam i podle local_id (stabilni od
// prvniho okamziku, zadne cekani na server) - kdyz cloudId chybi, appka
// ho teď rovnou dopise na spravny existujici zaznam, misto aby
// vytvorila novy.
function msMergeCloudDiaryEntries(localProjectId, rows){
  const r = msMergeCloudList({
    key: 'ms_diary_v1__' + localProjectId,
    rows,
    // U zapisu se obsah zamerne NEPREPISUJE podle cloudu krome jmena
    // pridavatele (to resi kostra) - tak to bylo i pred sloucenim.
    novy: (row)=> ({
      id: msUid('d'), cloudId: row.id,
      date: row.date, time: row.time, author: row.added_by_label || 'Sdíleno',
      stage: row.stage, text: row.content, worker: row.worker, material: row.material,
      issue: row.issue, important: row.important,
      photos: row.photos || [], items: row.items || [],
      weather: row.weather || null, temperature: row.temperature != null ? row.temperature : null,
      workerCount: row.worker_count != null ? row.worker_count : null,
      sourceLocalId: row.local_id || null,
    }),
  });
  return r.added + r.removed;
}
function msDiaryEntryById(id){ return msDiary().find(e=>e.id===id); }
function msUpdateDiaryEntry(id, patch){
  const list = msDiary();
  const idx = list.findIndex(e=>e.id===id);
  if(idx===-1) return null;
  list[idx] = Object.assign({}, list[idx], patch);
  msSave(MS_KEYS.diary, list);
  // CHYBELO (11.8.2026): uprava se propisovala jen lokalne - sdileny
  // clovek videl navzdy puvodni zneni zapisu.
  if(list[idx].cloudId && typeof MSCloud !== 'undefined' && MSCloud.updateDiaryEntryCloud){
    MSCloud.updateDiaryEntryCloud(list[idx].cloudId, {
      date: list[idx].date, time: list[idx].time || null,
      stage: list[idx].stage || null, content: list[idx].text || null,
      worker: list[idx].worker || null, material: list[idx].material || null,
      issue: list[idx].issue || null, important: !!list[idx].important,
      photos: list[idx].photos || null, items: list[idx].items || null,
      weather: list[idx].weather || null, temperature: list[idx].temperature != null ? list[idx].temperature : null,
      worker_count: list[idx].workerCount != null ? list[idx].workerCount : null,
    }).catch(e=> console.error('cloud update zapisu selhal', e));
  }
  return list[idx];
}
function msDeleteDiaryEntry(id){
  const entry = msDiary().find(e=>e.id===id);
  msSave(MS_KEYS.diary, msDiary().filter(e=>e.id!==id));
  if(entry && entry.cloudId && typeof MSCloud !== 'undefined' && MSCloud.deleteDiaryEntryCloud){
    MSCloud.deleteDiaryEntryCloud(entry.cloudId).catch(e=> console.error('cloud delete zapisu selhalo', e));
  }
}
// vsechny zapisy serazene chronologicky (od nejstarsiho) s prirazenym poradovym cislem - napric etapami, jak to ma skutecny stavebni denik
function msDiaryNumbered(){
  const sorted = msDiary().slice().sort((a,b)=>{
    const da = a.date + ' ' + (a.time||'00:00');
    const db = b.date + ' ' + (b.time||'00:00');
    return da.localeCompare(db);
  });
  return sorted.map((e,i)=> Object.assign({}, e, {number: i+1}));
}

/* ============================================================
   METADATA PRO GENEROVANI STAVEBNIHO DENIKU (titulni strana)
   ============================================================ */
function msDiaryMeta(){
  return msLoad('ms_diary_meta_v1', ()=>({
    nazev:null, misto:null, stavebnik:null, projektant:null,
    dozor:null, parcela:null, katastr:null, povoleni:null
  }));
}
function msSetDiaryMeta(patch){
  const next = Object.assign({}, msDiaryMeta(), patch);
  msSave('ms_diary_meta_v1', next);
  return next;
}
function msSeedDocuments(){
  return [];
}
function msSeedExpenses(){
  return [];
}

function msDiary(){ return msLoad(MS_KEYS.diary, msSeedDiary); }
function msDocuments(){
  const list = msLoad(MS_KEYS.documents, msSeedDocuments);
  return list.map(d=> Object.assign({}, d, { content: d.content || MS_BLOB_CACHE.get(msBlobKey('doc', d.id)) || null }));
}
async function msAddDocument(doc){
  const list = msLoad(MS_KEYS.documents, msSeedDocuments);
  const withId = Object.assign({id:msUid('doc'), date: msTodayISO()}, doc);
  const content = withId.content;
  delete withId.content;
  list.push(withId);
  const ok = msSave(MS_KEYS.documents, list);
  if(!ok) return null;
  if(content){
    MS_BLOB_CACHE.set(msBlobKey('doc', withId.id), content);
    try{
      await msIdbSet(msBlobKey('doc', withId.id), content); // pockat na dokonceni zapisu
    }catch(e){
      console.error('msAddDocument: zapis do IndexedDB selhal', e); // viz stejna oprava u msAddPhoto
    }
    // Krok 13: ticha synchronizace do cloudu na pozadi
    if(typeof MSCloud !== 'undefined'){
      MSCloud.uploadFile('documents', withId.id, content).catch(e=> console.error('cloud upload dokumentu selhal', e));
    }
  }
  // Obousmerne sdileni (1.8.2026) - "Dokumenty etap" zustavaji na svem
  // puvodnim lokalnim systemu (kvuli fronte do deniku a exportu PDF),
  // jen ted navic posilaji popisek obousmerne, stejny princip jako
  // Fotky/Projekt.
  if(typeof MSCloud !== 'undefined' && MSCloud.pushStageDocument){
    MSCloud.pushStageDocument(withId).then(({error, row})=>{
      if(error){ console.error('cloud push dokumentu etapy selhal', error); return; }
      if(row && row.id){
        const cur = msLoad(MS_KEYS.documents, msSeedDocuments);
        const idx = cur.findIndex(d=>d.id===withId.id);
        if(idx>-1){ cur[idx] = Object.assign({}, cur[idx], { cloudId: row.id }); msSave(MS_KEYS.documents, cur); }
      }
    }).catch(e=> console.error('cloud push dokumentu etapy selhal', e));
  }
  return Object.assign({}, withId, { content: content||null });
}
function msDeleteDocument(id){
  const doc = msDocuments().find(d=>d.id===id);
  msSave(MS_KEYS.documents, msDocuments().filter(d=>d.id!==id).map(d=>{ const c={...d}; delete c.content; return c; }));
  MS_BLOB_CACHE.delete(msBlobKey('doc', id));
  msIdbDelete(msBlobKey('doc', id));
  if(typeof MSCloud !== 'undefined'){
    MSCloud.deleteFile('documents', id).catch(()=>{});
    if(doc && doc.cloudId && MSCloud.deleteStageDocumentCloud){
      MSCloud.deleteStageDocumentCloud(doc.cloudId).catch(e=> console.error('cloud delete dokumentu etapy selhalo', e));
    }
  }
}
function msUpdateDocument(id, patch){
  const list = msLoad(MS_KEYS.documents, msSeedDocuments);
  const idx = list.findIndex(d=>d.id===id);
  if(idx===-1) return null;
  list[idx] = Object.assign({}, list[idx], patch);
  delete list[idx].content;
  msSave(MS_KEYS.documents, list);
  if(list[idx].cloudId && typeof MSCloud !== 'undefined' && MSCloud.updateStageDocumentCloud){
    // (14.8.2026) folder_id se posila jen kdyz se opravdu meni (presun
    // do slozky) - preklad na cloudove id slozky resi cloudFolderId nize.
    const cloudPatch = { name: list[idx].name };
    if('folderId' in patch){
      const cil = list[idx].folderId ? msLoadProjectFolders().find(f=> f.id === list[idx].folderId) : null;
      cloudPatch.folder_id = cil ? (cil.cloudId || null) : null;
    }
    MSCloud.updateStageDocumentCloud(list[idx].cloudId, cloudPatch).catch(e=> console.error('cloud update dokumentu etapy selhal', e));
  }
  return msDocuments().find(d=>d.id===id);
}
// Presun dokumentu etapy do jine slozky (14.8.2026) - stejny princip
// jako msMoveProjectItem u Projektu.
function msMoveDocument(id, cilovaSlozkaId){
  const list = msLoad(MS_KEYS.documents, msSeedDocuments);
  const idx = list.findIndex(d=> d.id === id);
  if(idx === -1) return false;
  if((list[idx].folderId || null) === (cilovaSlozkaId || null)) return false;
  msUpdateDocument(id, { folderId: cilovaSlozkaId || null });
  return true;
}
// Sloucení stažených dokumentu etap - stejny princip jako Fotky/Projekt
// (cloudId/local_id, obnova jmena/autora, mazani kdyz uz v cloudu neni).
function msMergeCloudStageDocuments(localProjectId, rows){
  const key = 'ms_documents_v1__' + localProjectId;
  let list = [];
  try{ list = JSON.parse(localStorage.getItem(key) || '[]'); }catch(e){}
  const cloudIdIndex = {};
  list.forEach((d,i)=>{ if(d.cloudId) cloudIdIndex[d.cloudId] = i; });
  const localIdIndex = {};
  list.forEach((d,i)=>{ localIdIndex[d.id] = i; });
  // Slozky (14.8.2026): row.folder_id je CLOUDOVE id slozky - potrebujeme
  // najit odpovidajici LOKALNI id, stejny princip jako uz appka dela u
  // souboru v Projektu.
  const folders = (typeof msLoadProjectFolders === 'function') ? msLoadProjectFolders() : [];
  const cloudFolderToLocal = {};
  folders.forEach(f=>{ if(f.cloudId) cloudFolderToLocal[f.cloudId] = f.id; });
  const newlyAdded = [];
  let patched = false;
  (rows||[]).forEach(row=>{
    const wantFolder = row.folder_id ? (cloudFolderToLocal[row.folder_id] || null) : null;
    if(cloudIdIndex.hasOwnProperty(row.id)){
      const idx = cloudIdIndex[row.id];
      const patch = {};
      if(list[idx].name !== row.name) patch.name = row.name;
      const newAuthor = row.added_by_label || 'Sdíleno';
      if(list[idx].author !== newAuthor) patch.author = newAuthor;
      // Rodic jeste nemusel dorazit (row.folder_id existuje, ale my ho
      // jeste nemame lokalne) - v tom pripade zarazeni nechame byt,
      // dorovna se nektere z dalsich kol.
      if(!(row.folder_id && !wantFolder) && (list[idx].folderId || null) !== wantFolder){
        patch.folderId = wantFolder;
      }
      if(Object.keys(patch).length){ list[idx] = Object.assign({}, list[idx], patch); patched = true; }
      return;
    }
    if(row.local_id && localIdIndex.hasOwnProperty(row.local_id)){
      const idx = localIdIndex[row.local_id];
      if(!list[idx].cloudId){ list[idx] = Object.assign({}, list[idx], { cloudId: row.id }); patched = true; }
      return;
    }
    const entry = {
      id: msUid('doc'), cloudId: row.id, name: row.name, stage: row.stage_key,
      mime: row.mime||null, isNote: !!row.is_note, date: (row.created_at||'').slice(0,10) || msTodayISO(),
      author: row.added_by_label || 'Sdíleno', sourceLocalId: row.local_id||null,
      folderId: wantFolder,
    };
    list.push(entry);
    newlyAdded.push(entry);
  });
  const remoteIds = new Set((rows||[]).map(r=>r.id));
  // (11.8.2026) I zaznam ze snimku bez cloudId - viz msHydrateSharedProjectData.
  const jePryc = (d)=> d.cloudId ? !remoteIds.has(d.cloudId) : !!d.fromSnapshot;
  const toRemove = list.filter(jePryc);
  if(toRemove.length){
    toRemove.forEach(d=>{
      const blobKey = msBlobKey('doc', d.id);
      MS_BLOB_CACHE.delete(blobKey);
      msIdbDelete(blobKey).catch(()=>{});
    });
    list = list.filter(d=> !jePryc(d));
  }
  if(newlyAdded.length || patched || toRemove.length){ try{ localStorage.setItem(key, JSON.stringify(list)); }catch(e){ console.error('msMergeCloudStageDocuments', e); } }
  return { newEntries: newlyAdded, removed: toRemove.length };
}
function msExpenses(){
  const list = msLoad(MS_KEYS.expenses, msSeedExpenses);
  return list.map(t=> t.hasReceipt ? Object.assign({}, t, { receipt: MS_BLOB_CACHE.get(msBlobKey('receipt', t.id)) || null }) : t);
}

/* --- pomocne funkce pro pocty a soucty podle etapy --- */
function msCountByStage(list, stageKey){ return list.filter(i=>i.stage===stageKey).length; }
function msSumExpensesByStage(stageKey){
  return msExpenses().filter(e=>e.stage===stageKey && e.type==='expense').reduce((sum,e)=>sum+Number(e.amount||0), 0);
}
function msTotalExpenses(){
  return msExpenses().filter(e=>e.type==='expense').reduce((s,e)=>s+Number(e.amount||0),0);
}
function msTotalIncome(){
  return msExpenses().filter(e=>e.type==='income').reduce((s,e)=>s+Number(e.amount||0),0);
}
function msBalance(){ return msTotalIncome() - msTotalExpenses(); }
// budouci (planovane) vydaje - nepocitaji se do skutecneho zustatku (jeste
// se nestaly), ale da se z nich spocitat, kolik by zbylo, kdyby se zaplatily
function msTotalPlanned(){
  return msExpenses().filter(e=>e.type==='planned').reduce((s,e)=>s+Number(e.amount||0),0);
}
function msBalanceAfterPlanned(){ return msBalance() - msTotalPlanned(); }
// prevede planovany vydaj na skutecny (kdyz uz je fakt zaplaceny)
function msMarkPlannedAsPaid(id, paidDateISO){
  /* paidAt (13.8.2026): zauctovani je samostatny UKON a v Aktualitach ma
     stat v okamziku, kdy se stalo. Bez teto znacky by se radilo podle
     casu, kdy vydaj VZNIKL jako planovany - tedy klidne o mesic driv. */
  return msUpdateTransaction(id, { type:'expense', date: paidDateISO || msTodayISO(), paidAt: Date.now() });
}
// zaplati planovany vydaj - cely, nebo jen cast. Pri castecne platbe se
// zaplacena cast zauctuje jako skutecny vydaj a zbytek zustane planovany
// (se snizenou castkou).
function msPayPlanned(id, paidAmount){
  const list = msExpenses();
  const idx = list.findIndex(t=>t.id===id);
  if(idx===-1) return null;
  const planned = list[idx];
  const plannedAmount = Number(planned.amount||0);
  paidAmount = Number(paidAmount||0);
  if(paidAmount<=0) return null;
  if(paidAmount>=plannedAmount) return msMarkPlannedAsPaid(id);
  msAddTransaction({
    type:'expense', title: planned.title, amount: paidAmount, paidAt: Date.now(),
    date: msTodayISO(), stage: planned.stage, category: planned.category,
  });
  return msUpdateTransaction(id, { amount: plannedAmount - paidAmount });
}
function msAddTransaction(tx){
  const list = msExpenses();
  const withId = Object.assign({id:msUid('tx'), date: msTodayISO()}, tx);
  list.push(withId);
  msSave(MS_KEYS.expenses, list);
  // Obousmerne sdileni (1.8.2026): stejny vzor jako Denik - funguje
  // pro vlastnika i pro pozvaneho s pravem pridavat do Financi.
  if(typeof MSCloud !== 'undefined' && MSCloud.pushExpense){
    MSCloud.pushExpense(withId).then(({error, row})=>{
      if(error){ console.error('cloud push vydaje selhal', error); return; }
      if(row && row.id){
        const cur = msExpenses();
        const idx = cur.findIndex(x=>x.id===withId.id);
        if(idx>-1){ cur[idx] = Object.assign({}, cur[idx], { cloudId: row.id }); msSave(MS_KEYS.expenses, cur); }
      }
    }).catch(e=> console.error('cloud push vydaje selhal', e));
  }
  return withId;
}
// Sloucí (ne prepise) radky stazene z project_expenses podle cloudId
// NEBO local_id (viz stejna oprava u Deniku - local_id pozna vlastni
// zaznam i predtim, nez se stihne dopsat cloudId, a zabrani duplicitam
// pri souběhu s pravidelnou kontrolou). Vraci pocet novych zaznamu.
function msMergeCloudExpenses(localProjectId, rows){
  const r = msMergeCloudList({
    key: 'ms_expenses_v1__' + localProjectId,
    rows,
    novy: (row)=> ({
      id: msUid('tx'), cloudId: row.id,
      type: row.type, title: row.title, amount: row.amount, date: row.date,
      stage: row.stage, category: row.category,
      author: row.added_by_label || 'Sdíleno',
      // Uctenka lezi ve Storage pod PUVODNIM local_id, ne pod nove
      // vygenerovanym id na tomhle telefonu.
      sourceLocalId: row.local_id || null,
    }),
  });
  return r.added + r.removed;
}
function msUpdateTransaction(id, patch){
  const list = msExpenses();
  const idx = list.findIndex(t=>t.id===id);
  if(idx===-1) return null;
  list[idx] = Object.assign({}, list[idx], patch);
  msSave(MS_KEYS.expenses, list);
  // CHYBELO (11.8.2026): stejny pripad jako u deniku - opravena castka
  // nebo nazev se k druhe strane nikdy nedostaly.
  if(list[idx].cloudId && typeof MSCloud !== 'undefined' && MSCloud.updateExpenseCloud){
    MSCloud.updateExpenseCloud(list[idx].cloudId, {
      type: list[idx].type, title: list[idx].title, amount: list[idx].amount,
      date: list[idx].date, stage: list[idx].stage || null, category: list[idx].category || null,
    }).catch(e=> console.error('cloud update vydaje selhal', e));
  }
  return list[idx];
}
function msDeleteTransaction(id){
  const tx = msExpenses().find(t=>t.id===id);
  msSave(MS_KEYS.expenses, msExpenses().filter(t=>t.id!==id));
  MS_BLOB_CACHE.delete(msBlobKey('receipt', id));
  msIdbDelete(msBlobKey('receipt', id));
  if(tx && tx.cloudId && typeof MSCloud !== 'undefined' && MSCloud.deleteExpenseCloud){
    MSCloud.deleteExpenseCloud(tx.cloudId).catch(e=> console.error('cloud delete vydaje selhalo', e));
  }
}
function msTransactionById(id){
  return msExpenses().find(t=>t.id===id);
}
// ucteka - jedna fotka pripojena primo k jednomu konkretnimu vydaji.
// Obsah jde do IndexedDB stejne jako fotky/dokumenty, v localStorage
// zustane jen priznak hasReceipt.
async function msSetTransactionReceipt(id, dataUrl){
  const list = msLoad(MS_KEYS.expenses, msSeedExpenses);
  const idx = list.findIndex(t=>t.id===id);
  if(idx===-1) return false;
  const resized = await msResizeDataUrl(dataUrl, 1400, 0.75);
  const key = msBlobKey('receipt', id);
  MS_BLOB_CACHE.set(key, resized);
  try{
    await msIdbSet(key, resized);
  }catch(e){
    console.error('msSetTransactionReceipt: zapis do IndexedDB selhal', e); // viz stejna oprava u msAddPhoto
  }
  // Krok 13: ticha synchronizace do cloudu na pozadi
  if(typeof MSCloud !== 'undefined'){
    MSCloud.uploadFile('receipts', id, resized).catch(e=> console.error('cloud upload uctenky selhal', e));
  }
  list[idx] = Object.assign({}, list[idx], { hasReceipt: true });
  msSave(MS_KEYS.expenses, list);
  return true;
}
function msRemoveTransactionReceipt(id){
  const list = msLoad(MS_KEYS.expenses, msSeedExpenses);
  const idx = list.findIndex(t=>t.id===id);
  if(idx===-1) return;
  list[idx] = Object.assign({}, list[idx], { hasReceipt: false });
  msSave(MS_KEYS.expenses, list);
  MS_BLOB_CACHE.delete(msBlobKey('receipt', id));
  msIdbDelete(msBlobKey('receipt', id));
  if(typeof MSCloud !== 'undefined'){ MSCloud.deleteFile('receipts', id).catch(()=>{}); }
}
function msStageStats(stageKey){
  return {
    photos: msCountByStage(msPhotos(), stageKey),
    documents: msCountByStage(msDocuments(), stageKey),
    diary: msCountByStage(msDiary(), stageKey),
    expensesCount: msExpenses().filter(e=>e.stage===stageKey && e.type==='expense').length,
    spent: msSumExpensesByStage(stageKey),
    important: msCountByStage(msImportant(), stageKey),
  };
}

/* ============================================================
   AKTUÁLNÍ ETAPA V ČASE
   - ktera etapa je prave "aktualni" (jen jedna v ramci projektu)
   - pro kazdou etapu si pamatujeme MNOZINU dnu, kdy byla aktualni
     (den se pocita, i kdyz byla aktualni treba jen minutu - proto
     mnozina dat, ne casovy rozsah)
   - "Zahajeno" = nejstarsi den v teto mnozine
   - "Den etapy" = pocet dnu v teto mnozine (ne rozdil dat!)
   ============================================================ */
const MS_CURRENT_STAGE_KEY = 'ms_current_stage_v1';
const MS_ACTIVE_DAYS_KEY = 'ms_stage_active_days_v1';

// Puvodni nazev - v appce uz existoval a byl spravne (mistni cas, ne
// UTC), jen ho pouzivala jen hrstka mist. Zbytek appky mel vlastni
// (chybnou) variantu pres toISOString. Aby nevznikaly dalsi kopie te
// same veci, je tohle uz jen jine jmeno pro msTodayIso. (11.8.2026)
function msTodayISO(){ return msTodayIso(); }

function msSeedActiveDays(){
  return {};
}
function msLoadActiveDaysMap(){
  return msLoad(MS_ACTIVE_DAYS_KEY, msSeedActiveDays);
}
function msSaveActiveDaysMap(map){ msSave(MS_ACTIVE_DAYS_KEY, map); }

function msGetCurrentStage(){
  const v = msLoad(MS_CURRENT_STAGE_KEY, ()=>null);
  if(v) return v;
  const selected = msSelectedStageKeys();
  return selected.length ? selected[0] : null;
}

// pripocita dnesni den do mnoziny aktivnich dnu dane etapy (bez ohledu na
// to, kolikrat/jak kratce se to za den stane - den se pocita jen jednou)
function msRecordActiveDay(key){
  if(!key) return;
  const map = msLoadActiveDaysMap();
  const today = msTodayISO();
  if(!map[key]) map[key] = [];
  if(!map[key].includes(today)) map[key].push(today);
  msSaveActiveDaysMap(map);
}

// nastavi etapu jako aktualni a pripocita dnesni den do jeji mnoziny aktivnich dnu
function msSetCurrentStage(key){
  msSave(MS_CURRENT_STAGE_KEY, key);
  msAddSelectedStage(key);
  msRecordActiveDay(key);
  msTriggerCloudSnapshotSync();
}

// zavola se pri kazdem startu appky: pokud uz nejaka etapa aktualni je,
// pripocita se ji dnesni den (bez tohohle by se "Den etapy" po prvnim
// oznaceni uz nikdy nehnul - viz historie: drive se den pripsal jen v
// momente kliknuti na "nastavit jako aktualni", ne kazdy dalsi den, kdy
// etapa aktualni zustavala)
function msEnsureCurrentStageDayRecorded(){
  const key = msGetCurrentStage();
  if(key) msRecordActiveDay(key);
}

function msStageActiveDays(key){
  const map = msLoadActiveDaysMap();
  return (map[key] || []).slice().sort();
}
function msStageZahajeno(key){
  const days = msStageActiveDays(key);
  return days.length ? days[0] : null;
}
function msStageDenEtapy(key){
  return msStageActiveDays(key).length;
}
// 'aktualni' | 'probiha' | 'nezahajeno'
const MS_CLOSED_STAGES_KEY = 'ms_closed_stages_v1';
function msClosedStageKeys(){ return msLoad(MS_CLOSED_STAGES_KEY, ()=>[]); }
function msIsStageClosed(key){ return msClosedStageKeys().includes(key); }
function msSetStageClosed(key, closed){
  const keys = msClosedStageKeys();
  const has = keys.includes(key);
  if(closed && !has){ keys.push(key); if(key!=='naradi') msQueueForDiary('stage_complete', key); }
  if(!closed && has) keys.splice(keys.indexOf(key), 1);
  msSave(MS_CLOSED_STAGES_KEY, keys);
  msTriggerCloudSnapshotSync();
}
// 'uzavrena' ma prednost pred vsim ostatnim - je to jen status, dal se do etapy da cokoliv pridavat
function msStageStatus(key){
  if(msIsStageClosed(key)) return 'uzavrena';
  if(msGetCurrentStage() === key) return 'aktualni';
  return msStageActiveDays(key).length > 0 ? 'probiha' : 'nezahajeno';
}
function msStageStatusLabel(key){
  const s = msStageStatus(key);
  if(s==='uzavrena') return 'Dokončeno';
  if(s==='aktualni') return 'Aktuální';
  if(s==='probiha') return 'Probíhá';
  return 'Nezahájeno';
}

/* ============================================================
   NABÍDKY A DŮLEŽITÉ (zakladni model, plna obrazovka prijde pozdeji)
   ============================================================ */
function msSeedOffers(){
  return [];
}
function msSeedImportant(){
  return [];
}
function msAddImportant(item){
  const list = msImportant();
  const withId = Object.assign({id:msUid('imp'), date: msTodayISO()}, item);
  list.push(withId);
  msSave('ms_important_v1', list);
  return withId;
}

/* ============================================================
   VLASTNÍ POŘADÍ ETAP (tažením za "..." v přehledu etap)
   - aktuální etapa se pri vykresleni vzdy da navrch zvlast,
     tohle uchovava jen poradi TĚCH OSTATNÍCH
   ============================================================ */
const MS_STAGE_ORDER_KEY = 'ms_stage_order_v1';
function msStageOrder(){ return msLoad(MS_STAGE_ORDER_KEY, ()=>MS_STAGES.map(s=>s.key)); }
function msSetStageOrder(orderKeys){ msSave(MS_STAGE_ORDER_KEY, orderKeys); msTriggerCloudSnapshotSync(); }
// vrati kompletni serazeny seznam klicu etap: aktualni prvni, pak zbytek podle ulozeneho poradi
function msOrderedStageKeys(){
  const selected = msSelectedStageKeys();
  if(selected.length===0) return [];
  const cur = msGetCurrentStage();
  const order = msStageOrder().filter(k => k !== cur && selected.includes(k));
  selected.forEach(k=>{ if(k!==cur && !order.includes(k)) order.push(k); });
  return selected.includes(cur) ? [cur, ...order] : order;
}
function msImportant(){ return msLoad('ms_important_v1', msSeedImportant); }

/* --- poslednich N zaznamu dane etapy, serazeno od nejnovejsiho --- */
function msLastN(list, stageKey, n){
  return list.filter(i=>i.stage===stageKey).sort((a,b)=> (b.date||'').localeCompare(a.date||'')).slice(0,n);
}
function msLastPhotos(key,n){ return msLastN(msPhotos(), key, n); }
function msLastDiary(key,n){ return msLastN(msDiary(), key, n); }
function msLastExpenses(key,n){ return msLastN(msExpenses(), key, n); }
function msLastDocuments(key,n){ return msLastN(msDocuments(), key, n); }
// Nabidky a Dulezite (1.8.2026) - presunuty na stejny system slozek/
// souboru jako "Projekt" (scope 'nabidky'/'dulezite' na dane etape),
// misto puvodnich samostatnych, jednodussich seznamu.
function msProjectItemsForScope(scope, stageKey){
  return msLoadProjectItems().filter(it=> it.scope===scope && (it.stageKey||null)===(stageKey||null));
}
function msProjectFoldersForScope(scope, stageKey){
  return msLoadProjectFolders().filter(f=> f.scope===scope && (f.stageKey||null)===(stageKey||null));
}
function msLastOffers(key,n){ return msProjectItemsForScope('nabidky', key).slice(-n).reverse(); }
function msLastImportant(key,n){ return msProjectItemsForScope('dulezite', key).slice(-n).reverse(); }
/* ==========================================================
   MALE NAHLEDY FOTEK (9.8.2026)
   PROBLEM: msPhotos() vracel u kazde fotky plnou verzi (1800 px) a
   galerie, dashboard i etapy z ni kreslily ctverecky. Telefon musi
   kazdou fotku rozbalit v plnem rozliseni - jedna zabere v pameti
   9 MB, dvacet dlazdic v galerii 185 MB. Odtud pomale nacitani,
   sekani a pady pri vetsim poctu fotek.
   A druhy dopad: msHydrateBlobCache pri startu natahal VSECHNY
   plne fotky do pameti - pri 120 fotkach skoro 30 MB jeste pred
   prvnim vykreslenim.

   RESENI: vedle plne fotky se uklada i nahled 320 px (~25 kB).
   Seznamy kresli z nahledu, plna verze se sahne az kdyz je opravdu
   potreba - prohlizeni, sdileni, ulozeni, odeslani do cloudu.
   ========================================================== */
const MS_THUMB_DIM = 320;
const MS_THUMB_Q   = 0.72;

function msPhotoThumbKey(id){ return msBlobKey('thumb', id); }

/* Nahled fotky pro seznamy. Kdyz jeste neexistuje (fotky pridane
   drivejsimi verzemi), vyrobi se na pozadi a ulozi - pri dalsim
   otevreni uz je po ruce. */
function msPhotoThumb(id){
  const k = msPhotoThumbKey(id);
  const cached = MS_BLOB_CACHE.get(k);
  if(cached) return cached;
  msEnsureThumb(id);
  return null;
}

const _msThumbPending = new Set();
async function msEnsureThumb(id){
  const k = msPhotoThumbKey(id);
  if(MS_BLOB_CACHE.has(k) || _msThumbPending.has(id)) return null;
  _msThumbPending.add(id);
  try{
    let t = await msIdbGet(k);
    if(!t){
      const full = await msPhotoFull(id);
      if(!full) return null;
      t = await msResizeDataUrl(full, MS_THUMB_DIM, MS_THUMB_Q);
      if(t) await msIdbSet(k, t);
    }
    if(t) MS_BLOB_CACHE.set(k, t);
    return t;
  }catch(e){ return null; }
  finally{ _msThumbPending.delete(id); }
}

/* Plna fotka - jen tam, kde je opravdu potreba. Nedrzi se v pameti
   natrvalo, aby jich tam nezustavaly desitky najednou. */
/* Dohledani fotek zapisu podle odkazu v `items` (11.8.2026).
   Zapis si drzi refId fotky. Jenze POZVANY ma kazdou fotku pod svym
   VLASTNIM lokalnim id - refId od vlastnika mu tedy neodpovida a
   fotky u zapisu zustavaly prazdne (u nas se to neprojevilo, protoze
   vlastnik ma id svoje). Pozvany si ale puvodni id vlastnika uklada do
   sourceLocalId, takze se paruje podle obou.
   Vraci pole zarovnane s refIds - kde se fotka nenajde, je null. */
function msFindPhotosByRefs(refIds){
  if(!refIds || !refIds.length) return [];
  const vsechny = (typeof msPhotos === 'function') ? msPhotos() : [];
  const podleId = {};
  vsechny.forEach(p=>{
    if(p.id) podleId[p.id] = p;
    if(p.sourceLocalId && !podleId[p.sourceLocalId]) podleId[p.sourceLocalId] = p;
    if(p.cloudId && !podleId[p.cloudId]) podleId[p.cloudId] = p;
  });
  return refIds.map(r=> podleId[r] || null);
}

async function msPhotoFull(id){
  const k = msBlobKey('photo', id);
  const cached = MS_BLOB_CACHE.get(k);
  if(cached) return cached;
  try{ return await msIdbGet(k); }catch(e){ return null; }
}

function msPhotos(){
  const list = msLoad(MS_KEYS.photos, msSeedPhotos);
  return list.map(p=> Object.assign({}, p, {
    // .thumb je NAHLED pro seznamy (320 px). Plnou fotku si vyzada
    // jen ten, kdo ji opravdu potrebuje - pres msPhotoFull(id).
    thumb: p.thumb || msPhotoThumb(p.id) || MS_BLOB_CACHE.get(msBlobKey('photo', p.id)) || null,
    hasImage: !!(p.thumb || MS_BLOB_CACHE.has(msPhotoThumbKey(p.id)) || MS_BLOB_CACHE.has(msBlobKey('photo', p.id))),
  }));
}
async function msAddPhoto(photo){
  const list = msLoad(MS_KEYS.photos, msSeedPhotos);
  const withId = Object.assign({id:msUid('ph'), date: msTodayISO()}, photo);
  const thumb = withId.thumb;
  delete withId.thumb; // obrazek samotny jde do IndexedDB, ne do localStorage
  list.push(withId);
  const ok = msSave(MS_KEYS.photos, list);
  if(!ok) return null;
  if(thumb){
    MS_BLOB_CACHE.set(msBlobKey('photo', withId.id), thumb);
    try{
      await msIdbSet(msBlobKey('photo', withId.id), thumb); // POCKAT na dokonceni zapisu, ne fire-and-forget
      // Nahled pro seznamy - vyrobit hned, at ho galerie nemusi delat
      // az pri vykresleni (a at se plna fotka nikdy nekresli do dlazdice).
      const small = await msResizeDataUrl(thumb, MS_THUMB_DIM, MS_THUMB_Q);
      if(small){
        MS_BLOB_CACHE.set(msPhotoThumbKey(withId.id), small);
        await msIdbSet(msPhotoThumbKey(withId.id), small);
      }
    }catch(e){
      // OPRAVA (31.7.2026): zapis do IndexedDB obcas selze (znamy problem
      // hlavne na iOS pri vytizeni pameti) - fotka zustava aspon v pametove
      // kesi pro tuhle relaci appky, ale hlavne tahle chyba NESMI shodit
      // cokoli, co na msAddPhoto() navazuje (napr. cely formular zapisu do
      // Deniku ceka pres Promise.all na VSECHNY fotky - jedna nepovedena
      // fotka by jinak potichu zastavila i samotne ulozeni zapisu).
      console.error('msAddPhoto: zapis do IndexedDB selhal', e);
    }
    // Krok 13: ticha synchronizace do cloudu na pozadi (nic neblokuje,
    // nikdy appku nezastavi - vypadek site na stavbe je bezny stav)
    if(typeof MSCloud !== 'undefined'){
      MSCloud.uploadFile('photos', withId.id, thumb).catch(e=> console.error('cloud upload fotky selhal', e));
    }
  }
  // Obousmerne sdileni popisku (1.8.2026) - stejny princip jako
  // Denik/Finance, funguje pro vlastnika i pro pozvaneho s pravem
  // pridavat fotky.
  if(typeof MSCloud !== 'undefined' && MSCloud.pushPhotoMeta){
    MSCloud.pushPhotoMeta(withId).then(({error, row})=>{
      if(error){ console.error('cloud push popisku fotky selhal', error); return; }
      if(row && row.id){
        const cur = msLoad(MS_KEYS.photos, msSeedPhotos);
        const idx = cur.findIndex(p=>p.id===withId.id);
        if(idx>-1){ cur[idx] = Object.assign({}, cur[idx], { cloudId: row.id }); msSave(MS_KEYS.photos, cur); }
      }
    }).catch(e=> console.error('cloud push popisku fotky selhal', e));
  }
  return Object.assign({}, withId, { thumb: thumb||null });
}
// Sloucí (ne prepise) popisky fotek stazene z project_photos_meta,
// stejny princip jako u Deniku/Financi (cloudId nebo local_id pro
// poznani vlastniho zaznamu). Vraci seznam NOVE pridanych zaznamu
// (ne jen pocet) - volajici pak podle nich vi, ktere fotky jeste
// potrebuji stahnout i se samotnym obrazkem.
/* ==========================================================
   FOTKY BEZ OBRAZKU (9.8.2026)
   Automaticke obnoveni kazdych 45 s stahovalo obrazky jen k fotkam,
   ktere v tom kole PRIBYLY (newEntries). Kdyz zaznam dorazil, ale
   soubor se nestahl - vypadek site, soubor jeste nebyl nahrany -
   uz se to nikdy nezkusilo znovu a v galerii zustal barevny ctverec
   natrvalo. Mazani se promitalo, protoze to se pocita pokazde.

   Tahle funkce najde fotky, ktere zaznam maji a obrazek ne, aby je
   slo pri kazdem obnoveni zkusit dotahnout znovu.
   ========================================================== */
function msPhotosMissingBlobs(localProjectId){
  let list = [];
  try{ list = JSON.parse(localStorage.getItem('ms_photos_v1__' + localProjectId) || '[]'); }catch(e){}
  return list.filter(p=>{
    if(!p.cloudId && !p.sourceLocalId) return false;   // nikdy neprislo z cloudu
    const key = 'photo_' + p.id + '__' + localProjectId;
    return !MS_BLOB_CACHE.has(key);
  });
}

function msMergeCloudPhotosMeta(localProjectId, rows){
  const key = 'ms_photos_v1__' + localProjectId;
  let list = [];
  try{ list = JSON.parse(localStorage.getItem(key) || '[]'); }catch(e){}
  const existingCloudIds = new Set(list.filter(p=>p.cloudId).map(p=>p.cloudId));
  const localIdIndex = {};
  list.forEach((p,i)=>{ localIdIndex[p.id] = i; });
  const newlyAdded = [];
  let patched = false;
  (rows||[]).forEach(row=>{
    if(existingCloudIds.has(row.id)) return;
    if(row.local_id && localIdIndex.hasOwnProperty(row.local_id)){
      const idx = localIdIndex[row.local_id];
      if(!list[idx].cloudId){ list[idx] = Object.assign({}, list[idx], { cloudId: row.id }); patched = true; }
      return;
    }
    const entry = {
      id: msUid('ph'), cloudId: row.id, date: row.date,
      stage: row.stage, caption: row.caption || null,
      // DULEZITE: soubor v cloudovem uloziste je ulozeny pod PUVODNIM
      // local_id (to, co uzivatel mel na svem telefonu v okamziku
      // nahrani - viz MSCloud.uploadFile), NE pod cloudId (to je jen
      // ID radku v databazi, uplne jiny identifikator). Bez tohohle
      // by appka hledala soubor na spatne "adrese" a nikdy ho nenasla.
      sourceLocalId: row.local_id || null,
    };
    list.push(entry);
    newlyAdded.push(entry);
  });
  // Mazani (1.8.2026) - viz stejny princip v msMergeCloudDiaryEntries.
  // U fotek navic uklidime i stazeny obrazek (kes + IndexedDB), at po
  // sobe appka nenechava osirele soubory.
  const remoteIds = new Set((rows||[]).map(r=>r.id));
  // (11.8.2026) I zaznam ze snimku bez cloudId - viz msHydrateSharedProjectData.
  const jePrycF = (p)=> p.cloudId ? !remoteIds.has(p.cloudId) : !!p.fromSnapshot;
  const toRemove = list.filter(jePrycF);
  if(toRemove.length){
    toRemove.forEach(p=>{
      const blobKey = 'photo_' + p.id + '__' + localProjectId;
      MS_BLOB_CACHE.delete(blobKey);
      msIdbDelete(blobKey).catch(()=>{});
    });
    list = list.filter(p=> !jePrycF(p));
  }
  if(newlyAdded.length || patched || toRemove.length){ try{ localStorage.setItem(key, JSON.stringify(list)); }catch(e){ console.error('msMergeCloudPhotosMeta', e); } }
  return { newEntries: newlyAdded, removed: toRemove.length };
}
/* ==========================================================
   SDILENI A ULOZENI DO TELEFONU (8.8.2026)
   Appka posila obsah ven systemovym oknem "Sdilet" - odtud si
   uzivatel vybere Messenger, WhatsApp, mail, AirDrop, cokoliv,
   co ma v telefonu. Appka sama zadnou z tech sluzeb nezna a
   nic nikam neposila, jen predava soubor systemu.

   DULEZITE k "ulozit do telefonu": v prohlizeci na iPhonu
   nefunguje bezne stahovani obrazku (<a download> obrazek jen
   otevre). Jedina spolehliva cesta je totez systemove okno,
   kde je "Uložit obrázek". Na Androidu a v nativnim buildu
   stahovani funguje, takze se pouzije prednostne.
   ========================================================== */
/* ==========================================================
   ZAPIS Z DENIKU JAKO ZPRAVA (8.8.2026)
   Slozi ze zapisu citelny text - datum, etapa, co se delalo, kdo,
   material, poznamka - a k nemu prilozi fotky. Formatuje se to
   pro cteni ve zprave, ne pro export: zadne odrazky, zadne
   nadpisy, jen kratke radky, protoze v Messengeru se dlouhy blok
   textu spatne cte.
   ========================================================== */
function msDiaryEntryToText(entry, opts){
  const o = opts || {};
  const st = msStageByKey(entry.stage);
  const p = msLoadProjects().find(x=> x.id === msGetActiveProjectId()) || null;
  const lines = [];

  const d = entry.date ? new Date(entry.date + 'T00:00:00') : null;
  const dateCz = d && !isNaN(d) ? d.getDate()+'. '+(d.getMonth()+1)+'. '+d.getFullYear() : (entry.date || '');
  const head = ['Stavba' + (p && p.name ? ' ' + p.name : ''), dateCz].filter(Boolean).join(' - ');
  lines.push(head);
  if(st) lines.push('Etapa: ' + st.name);
  if(entry.title) lines.push('');
  if(entry.title) lines.push(entry.title);
  if(entry.text){ lines.push(''); lines.push(entry.text); }
  if(entry.worker){ lines.push(''); lines.push('Kdo pracoval: ' + entry.worker); }
  if(entry.material) lines.push('Materiál: ' + entry.material);
  if(entry.issue){ lines.push(''); lines.push('Poznámka: ' + entry.issue); }

  const photoCount = (entry.photos || []).filter(Boolean).length;
  if(photoCount && o.mentionPhotos){
    lines.push('');
    lines.push(photoCount === 1 ? '(1 fotka v příloze)'
      : (photoCount < 5 ? '(' + photoCount + ' fotky v příloze)' : '(' + photoCount + ' fotek v příloze)'));
  }
  return lines.join('\n');
}

/* Fotky zapisu jako soubory. Zapis si drzi zmensene kopie (400 px)
   kvuli rychlemu vykresleni - do zpravy proto radeji bereme
   originaly z Galerie, kdyz se je podari dohledat podle etapy a data. */
async function msDiaryEntryFiles(entry){
  const small = (entry.photos || []).filter(Boolean);
  const gallery = msPhotos().filter(p=> p.stage === entry.stage && p.date === entry.date && p.hasImage);
  let source = small;
  if(gallery.length >= small.length && gallery.length){
    // do zpravy plne fotky, ne nahledy ze seznamu
    source = [];
    for(const g of gallery){
      const full = await msPhotoFull(g.id);
      if(full) source.push(full);
    }
    if(!source.length) source = small;
  }
  const base = 'zapis-' + (entry.date || '') + (entry.number ? '-c' + entry.number : '');
  return source.map((dataUrl, i)=> msDataUrlToFile(dataUrl, base + '-' + (i+1))).filter(Boolean);
}

/* ==========================================================
   SDILENI JE SOUCAST PREMIA (8.8.2026)
   Jedno misto, kde se to hlida - jinak by se pravidlo drive nebo
   pozdeji na nekterem z tech sedmi tlacitek rozeslo. Vraci true,
   kdyz uzivatel muze pokracovat; jinak otevre nabidku Premia a
   vrati false, takze volajici jen skonci.
   ========================================================== */
/* ==========================================================
   POCET ZAZNAMU U ETAPY V ROZBALENEM SEZNAMU (8.8.2026)
   Cislo vpravo u kazde etapy - kolik tam ceka zaznamu. Diky nemu
   je z rozbaleneho seznamu videt, kde neco je, jeste nez tam
   clovek prepne. Funguje pro libovolny druh zaznamu, proto se
   predava seznam, ne jen klic.
   ========================================================== */
function msCountForStage(list, stageKey){
  if(!Array.isArray(list)) return 0;
  return stageKey === 'all' ? list.length : list.filter(x=> x && x.stage === stageKey).length;
}

/* ==========================================================
   KDO SMI POSILAT OBSAH VEN (9.8.2026)
   Sdileni a ukladani do telefonu patri VLASTNIKOVI stavby. Pozvany
   host dostal pristup k nahlednuti, ne pravo rozesilat cizi fotky a
   zapisy dal - proto u nej tlacitka nemaji ani svitit, natoz nabizet
   Premium. Premium je navic vazane na projekt, takze bez tohohle by
   se hostovi ukazovala nabidka na zaplaceni cizi stavby.
   ========================================================== */
function msIsGuestProject(){
  const p = msActiveProjectForRights();
  return !!(p && p.isShared);
}
function msCanExportContent(){
  return !msIsGuestProject();
}

/* Pozvany host smi jen PRIDAVAT (a to jen tam, kde na to ma pravo).
   Upravovat nebo mazat cizi zaznamy nesmi - ani sve vlastni, protoze
   z pohledu stavby jsou to data vlastnika. Uprava i mazani se navic
   promitaji do cloudu, takze by hostovi umoznily zasahovat do cizi
   stavby napric vsemi zarizenimi. */
function msCanModifyContent(){
  return !msIsGuestProject();
}

function msRequirePremium(what){
  if(msIsGuestProject()){
    alert('Tohle je sdílená stavba - posílat obsah dál může jen její vlastník.');
    return false;
  }
  const ok = (typeof msIsPremiumMock === 'function') && msIsPremiumMock();
  if(ok) return true;
  const label = what || 'Posílání a ukládání obsahu';
  if(typeof PremiumLogin !== 'undefined' && PremiumLogin.open){
    alert(label + ' je součástí Premia. Ukážu ti, co Premium obsahuje.');
    PremiumLogin.open();
  } else {
    alert(label + ' je součástí Premia. Aktivovat ho můžeš v Nastavení.');
    if(typeof Router !== 'undefined') Router.go('settings');
  }
  return false;
}

function msDataUrlToFile(dataUrl, filename){
  if(!dataUrl || !dataUrl.startsWith('data:')) return null;
  try{
    const [head, b64] = dataUrl.split(',');
    const mime = (head.match(/data:([^;]+)/) || [,'application/octet-stream'])[1];
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
    const ext = mime === 'image/jpeg' ? 'jpg' : (mime.split('/')[1] || 'bin');
    const name = /\.[a-z0-9]{2,5}$/i.test(filename) ? filename : (filename + '.' + ext);
    return new File([bytes], name, { type: mime });
  }catch(e){ console.error('msDataUrlToFile selhalo', e); return null; }
}

function msCanShareFiles(files){
  return !!(navigator.canShare && files && files.length && navigator.canShare({ files }));
}

/* Vrati: 'shared' | 'downloaded' | 'unsupported' | 'cancelled' */
async function msShareFiles(files, title){
  const list = (files || []).filter(Boolean);
  if(!list.length) return 'unsupported';
  if(msCanShareFiles(list)){
    try{
      await navigator.share({ files: list, title: title || 'Moje Stavba' });
      return 'shared';
    }catch(e){
      // uzivatel okno zavrel - to neni chyba, jen to nedokoncil
      if(e && (e.name === 'AbortError' || e.name === 'NotAllowedError')) return 'cancelled';
      console.error('navigator.share selhalo', e);
    }
  }
  return 'unsupported';
}

async function msShareText(text, title){
  if(navigator.share){
    try{ await navigator.share({ text, title: title || 'Moje Stavba' }); return 'shared'; }
    catch(e){ if(e && e.name === 'AbortError') return 'cancelled'; }
  }
  try{ await navigator.clipboard.writeText(text); return 'copied'; }
  catch(e){ return 'unsupported'; }
}

/* Ulozeni do telefonu. Na iOS to musi jit pres systemove okno,
   jinde staci klasicke stazeni. */
async function msSaveFilesToDevice(files, title){
  const list = (files || []).filter(Boolean);
  if(!list.length) return 'unsupported';
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if(!isIOS){
    try{
      list.forEach(f=>{
        const url = URL.createObjectURL(f);
        const a = document.createElement('a');
        a.href = url; a.download = f.name;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(()=> URL.revokeObjectURL(url), 4000);
      });
      return 'downloaded';
    }catch(e){ console.error('stazeni selhalo', e); }
  }
  return msShareFiles(list, title);
}

function msUpdatePhoto(id, patch){
  const list = msLoad(MS_KEYS.photos, msSeedPhotos);
  const idx = list.findIndex(p=>p.id===id);
  if(idx===-1) return null;
  list[idx] = Object.assign({}, list[idx], patch);
  delete list[idx].thumb;
  msSave(MS_KEYS.photos, list);
  // CHYBELO (11.8.2026): zmena popisku nebo etapy u fotky se propsala
  // jen lokalne - stejny pripad jako denik a finance.
  if(list[idx].cloudId && typeof MSCloud !== 'undefined' && MSCloud.updatePhotoMetaCloud){
    MSCloud.updatePhotoMetaCloud(list[idx].cloudId, {
      caption: list[idx].caption || null,
      stage: list[idx].stage || null,
      date: list[idx].date || null,
    }).catch(e=> console.error('cloud update fotky selhal', e));
  }
  return msPhotos().find(p=>p.id===id);
}
function msDeletePhoto(id){
  const photo = msLoad(MS_KEYS.photos, msSeedPhotos).find(p=>p.id===id);
  msSave(MS_KEYS.photos, msLoad(MS_KEYS.photos, msSeedPhotos).filter(p=>p.id!==id));
  MS_BLOB_CACHE.delete(msBlobKey('photo', id));
  msIdbDelete(msBlobKey('photo', id));
  if(typeof MSCloud !== 'undefined'){
    MSCloud.deleteFile('photos', id).catch(()=>{});
    if(photo && photo.cloudId && MSCloud.deletePhotoMetaCloud){
      MSCloud.deletePhotoMetaCloud(photo.cloudId).catch(e=> console.error('cloud delete popisku fotky selhalo', e));
    }
  }
}

/* ============================================================
   ZAKLADNI METADATA PROJEKTU (plocha pozemku, zastavena plocha, typ)
   ============================================================ */
function msProjectMeta(){
  return msLoad('ms_project_meta_v1', ()=>({landArea:null, builtArea:null, type:null}));
}
function msSetProjectMeta(patch){
  const next = Object.assign({}, msProjectMeta(), patch);
  msSave('ms_project_meta_v1', next);
  // CHYBELO (11.8.2026): udaje o stavbe (pozemek, typ domu, uzitna
  // plocha) jsou soucasti snimku, ale jejich zmena snimek nikdy
  // nespoustela - snimek se obnovoval jen pri zmene etap. Pozvany tak
  // videl navzdy hodnoty platne v okamziku sdileni.
  msTriggerCloudSnapshotSync();
  return next;
}

/* ============================================================
   PROJEKT - SLOZKY A SOUBORY (1.8.2026, prestavba)
   Puvodni verze hledala slozky podle "cesty jmen" (napr. ["Smlouvy"]) -
   nespolehlive pri sdileni (jmena se musela presne shodovat na obou
   zarizenich). Nova verze: slozky maji STALE ID, stejne jako uz davno
   maji fotky a soubory - appka se pta "kam patri tohle ID", ne "jak se
   jmenuje ta slozka". Slozky zaklada/mate/prejmenovava JEN vlastnik
   (stejne pravidlo jako u etap - pozvany vybira z existujicich).
   Soubory uvnitr pridavaji OBA smery, obousmerne (stejny princip jako
   Denik/Finance/Fotky).
   ============================================================ */
function msLoadProjectFolders(){ return msLoad('ms_project_folders_v1', () => ([])); }
function msSaveProjectFolders(list){ msSave('ms_project_folders_v1', list); }
function msLoadProjectItems(){ return msLoad('ms_project_items_v1', () => ([])); }
function msSaveProjectItems(list){ msSave('ms_project_items_v1', list); }

function msAddProjectFolder(name, parentId, scope, stageKey){
  const list = msLoadProjectFolders();
  const withId = { id: msUid('pf'), parentId: parentId||null, name, cloudId: null, scope: scope||'projekt', stageKey: stageKey||null };
  list.push(withId);
  msSaveProjectFolders(list);
  if(typeof MSCloud !== 'undefined' && MSCloud.pushProjectFolder){
    MSCloud.pushProjectFolder(withId).then(({error, row})=>{
      if(error){ console.error('cloud push slozky selhal', error); return; }
      if(row && row.id){
        const cur = msLoadProjectFolders();
        const idx = cur.findIndex(f=>f.id===withId.id);
        if(idx>-1){ cur[idx] = Object.assign({}, cur[idx], { cloudId: row.id }); msSaveProjectFolders(cur); }
      }
    }).catch(e=> console.error('cloud push slozky selhal', e));
  }
  return withId;
}
function msRenameProjectFolder(id, name){
  const list = msLoadProjectFolders();
  const idx = list.findIndex(f=>f.id===id);
  if(idx===-1) return;
  list[idx] = Object.assign({}, list[idx], { name });
  msSaveProjectFolders(list);
  if(list[idx].cloudId && typeof MSCloud !== 'undefined' && MSCloud.updateProjectFolderCloud){
    const _parent = list[idx].parentId ? list.find(f=> f.id === list[idx].parentId) : null;
    MSCloud.updateProjectFolderCloud(list[idx].cloudId, name, _parent ? (_parent.cloudId||null) : null).catch(e=> console.error('cloud rename slozky selhalo', e));
  }
}
function msRenameProjectItem(id, name){
  const list = msLoadProjectItems();
  const idx = list.findIndex(it=>it.id===id);
  if(idx===-1) return;
  list[idx] = Object.assign({}, list[idx], { name });
  msSaveProjectItems(list);
  if(list[idx].cloudId && typeof MSCloud !== 'undefined' && MSCloud.updateProjectItemCloud){
    const _f = list[idx].folderId ? msLoadProjectFolders().find(f=> f.id === list[idx].folderId) : null;
    MSCloud.updateProjectItemCloud(list[idx].cloudId, name, _f ? (_f.cloudId||null) : null).catch(e=> console.error('cloud rename souboru selhalo', e));
  }
}

/* Presun souboru do jine slozky (11.8.2026).
   Az doted slo soubor jen prejmenovat nebo smazat - kdo ho nahral do
   spatne slozky, musel ho smazat a nahrat znovu. Zarazeni se posila i
   do cloudu, aby sdileny clovek videl stejnou strukturu. */
function msMoveProjectItem(id, cilovaSlozkaId){
  const list = msLoadProjectItems();
  const idx = list.findIndex(it=> it.id === id);
  if(idx === -1) return false;
  if((list[idx].folderId || null) === (cilovaSlozkaId || null)) return false; // uz tam je
  list[idx] = Object.assign({}, list[idx], { folderId: cilovaSlozkaId || null });
  msSaveProjectItems(list);
  if(list[idx].cloudId && typeof MSCloud !== 'undefined' && MSCloud.updateProjectItemCloud){
    const cil = cilovaSlozkaId ? msLoadProjectFolders().find(f=> f.id === cilovaSlozkaId) : null;
    MSCloud.updateProjectItemCloud(list[idx].cloudId, list[idx].name, cil ? (cil.cloudId||null) : null)
      .catch(e=> console.error('cloud presun souboru selhal', e));
  }
  return true;
}

function msDeleteProjectFolder(id){
  // Smaze slozku a VSECHNY jeji potomky (vnorene slozky i soubory v nich) -
  // stejne jako kaskadove mazani v databazi (on delete cascade).
  const folders = msLoadProjectFolders();
  const items = msLoadProjectItems();
  const toDeleteFolderIds = new Set([id]);
  let grew = true;
  while(grew){
    grew = false;
    folders.forEach(f=>{ if(f.parentId && toDeleteFolderIds.has(f.parentId) && !toDeleteFolderIds.has(f.id)){ toDeleteFolderIds.add(f.id); grew = true; } });
  }
  const deletedFolder = folders.find(f=>f.id===id);
  const remainingFolders = folders.filter(f=> !toDeleteFolderIds.has(f.id));
  const deletedItems = items.filter(it=> toDeleteFolderIds.has(it.folderId));
  const remainingItems = items.filter(it=> !toDeleteFolderIds.has(it.folderId));
  msSaveProjectFolders(remainingFolders);
  msSaveProjectItems(remainingItems);
  deletedItems.forEach(it=>{
    const key = msBlobKey('pitem', it.id);
    MS_BLOB_CACHE.delete(key);
    msIdbDelete(key).catch(()=>{});
  });
  // OPRAVA (14.8.2026): dokumenty etap ziji v samostatnem seznamu
  // (msDocuments), o kterem tahle funkce puvodne vubec nevedela. Bez
  // tohohle kroku by po smazani slozky zustaly dokumenty s folderId
  // ukazujicim na uz neexistujici slozku - OSIRELE a NAVZDY NEVIDITELNE
  // (nezobrazi se v korenu ani v zadne slozce). Databaze uz to resila
  // spravne (on delete set null v SQL), tady jen dohanime totez lokalne.
  if(typeof msDocuments === 'function' && typeof msUpdateDocument === 'function'){
    msDocuments().forEach(d=>{
      if(d.folderId && toDeleteFolderIds.has(d.folderId)) msUpdateDocument(d.id, { folderId: null });
    });
  }
  if(typeof MSCloud !== 'undefined' && deletedFolder && deletedFolder.cloudId && MSCloud.deleteProjectFolderCloud){
    // Kaskadove smazani v databazi (on delete cascade) se postara i o
    // vsechny vnorene slozky/soubory na serveru - staci smazat jen tu
    // hlavni.
    MSCloud.deleteProjectFolderCloud(deletedFolder.cloudId).catch(e=> console.error('cloud delete slozky selhalo', e));
  }
}

async function msAddProjectItem({ name, mime, isNote, folderId, content, scope, stageKey }){
  const list = msLoadProjectItems();
  const id = msUid('pitem');
  const withId = { id, folderId, name, mime: mime||null, isNote: !!isNote, cloudId: null, author: null, scope: scope||'projekt', stageKey: stageKey||null };
  if(content){
    const key = msBlobKey('pitem', id);
    MS_BLOB_CACHE.set(key, content);
    await msIdbSet(key, content);
    if(typeof MSCloud !== 'undefined'){
      MSCloud.uploadFile('projectitems', id, content).catch(e=> console.error('cloud upload souboru z Projekt selhal', e));
    }
  }
  list.push(withId);
  msSaveProjectItems(list);
  if(typeof MSCloud !== 'undefined' && MSCloud.pushProjectItem){
    MSCloud.pushProjectItem(withId).then(({error, row})=>{
      if(error){ console.error('cloud push souboru z Projekt selhal', error); return; }
      if(row && row.id){
        const cur = msLoadProjectItems();
        const idx = cur.findIndex(it=>it.id===id);
        if(idx>-1){ cur[idx] = Object.assign({}, cur[idx], { cloudId: row.id }); msSaveProjectItems(cur); }
      }
    }).catch(e=> console.error('cloud push souboru z Projekt selhal', e));
  }
  return withId;
}
function msDeleteProjectItem(id){
  const items = msLoadProjectItems();
  const item = items.find(it=>it.id===id);
  msSaveProjectItems(items.filter(it=>it.id!==id));
  const key = msBlobKey('pitem', id);
  MS_BLOB_CACHE.delete(key);
  msIdbDelete(key).catch(()=>{});
  if(typeof MSCloud !== 'undefined'){
    MSCloud.deleteFile('projectitems', id).catch(()=>{});
    if(item && item.cloudId && MSCloud.deleteProjectItemCloud){
      MSCloud.deleteProjectItemCloud(item.cloudId).catch(e=> console.error('cloud delete souboru z Projekt selhalo', e));
    }
  }
}

// Sloucení stažených řádků (slozky i soubory) - stejny princip jako u
// Deniku/Financi/Fotek: cloudId nebo local_id pro poznani vlastniho
// zaznamu, a mazani kdyz uz zaznam v cloudu neni (jen vlastnik maze).
function msMergeCloudProjectFolders(localProjectId, rows){
  const key = 'ms_project_folders_v1__' + localProjectId;
  let list = [];
  try{ list = JSON.parse(localStorage.getItem(key) || '[]'); }catch(e){}
  const cloudIdIndex = {};
  list.forEach((f,i)=>{ if(f.cloudId) cloudIdIndex[f.cloudId] = i; });
  const localIdIndex = {};
  list.forEach((f,i)=>{ localIdIndex[f.id] = i; });
  // Cloud ID -> lokalni ID (pro spravne namapovani parentId po sloucení)
  const cloudToLocal = {};
  list.forEach(f=>{ if(f.cloudId) cloudToLocal[f.cloudId] = f.id; });
  let added = 0, patched = false;
  const newFolders = [];
  (rows||[]).forEach(row=>{
    if(cloudIdIndex.hasOwnProperty(row.id)){
      // Prejmenovani z jineho zarizeni se ted taky propise, ne jen prvni nazev.
      const idx = cloudIdIndex[row.id];
      if(list[idx].name !== row.name){ list[idx] = Object.assign({}, list[idx], { name: row.name }); patched = true; }
      return;
    }
    if(row.local_id && localIdIndex.hasOwnProperty(row.local_id)){
      const idx = localIdIndex[row.local_id];
      if(!list[idx].cloudId){ list[idx] = Object.assign({}, list[idx], { cloudId: row.id }); patched = true; cloudToLocal[row.id] = list[idx].id; }
      return;
    }
    const entry = { id: msUid('pf'), cloudId: row.id, parentId: null, name: row.name, scope: row.scope||'projekt', stageKey: row.stage_key||null, sourceParentCloudId: row.parent_id||null };
    list.push(entry);
    newFolders.push(entry);
    cloudToLocal[row.id] = entry.id;
    added++;
  });
  // Druhy pruchod: namapovat parentId z cloud-parent-id na lokalni id
  // (rodicovska slozka uz musi byt bud existujici, nebo prave pridana vyse)
  newFolders.forEach(entry=>{
    if(entry.sourceParentCloudId && cloudToLocal[entry.sourceParentCloudId]){
      entry.parentId = cloudToLocal[entry.sourceParentCloudId];
    }
    delete entry.sourceParentCloudId;
  });
  // OPRAVA (10.8.2026): u slozek, ktere uz appka mela, se drive obnovoval
  // jen NAZEV - zarazeni pod rodice nikdy. Kdyz se tedy hierarchie v
  // cloudu opravila (viz MSCloud.fixProjectHierarchyInCloud), pozvany
  // mel porad rozsypany strom. Ted se srovna i zarazeni.
  (rows||[]).forEach(row=>{
    const localId = cloudToLocal[row.id];
    if(!localId) return;
    const idx = list.findIndex(f=> f.id === localId);
    if(idx < 0) return;
    const wantParent = row.parent_id ? (cloudToLocal[row.parent_id] || null) : null;
    // Rodic jeste nemusel dorazit - v tom pripade necháme zarazeni byt a
    // srovna se to v nekterem z dalsich kol, az rodic prijde.
    if(row.parent_id && !wantParent) return;
    if((list[idx].parentId || null) !== wantParent){
      list[idx] = Object.assign({}, list[idx], { parentId: wantParent });
      patched = true;
    }
  });
  const remoteIds = new Set((rows||[]).map(r=>r.id));
  const beforeLen = list.length;
  list = list.filter(f=> f.cloudId ? remoteIds.has(f.cloudId) : !f.fromSnapshot);
  const removed = beforeLen - list.length;
  if(added || patched || removed){ try{ localStorage.setItem(key, JSON.stringify(list)); }catch(e){ console.error('msMergeCloudProjectFolders', e); } }
  return added + removed;
}
function msMergeCloudProjectItems(localProjectId, rows){
  const folderKey = 'ms_project_folders_v1__' + localProjectId;
  let folders = [];
  try{ folders = JSON.parse(localStorage.getItem(folderKey) || '[]'); }catch(e){}
  const cloudFolderToLocal = {};
  folders.forEach(f=>{ if(f.cloudId) cloudFolderToLocal[f.cloudId] = f.id; });

  const key = 'ms_project_items_v1__' + localProjectId;
  let list = [];
  try{ list = JSON.parse(localStorage.getItem(key) || '[]'); }catch(e){}
  const cloudIdIndex = {};
  list.forEach((it,i)=>{ if(it.cloudId) cloudIdIndex[it.cloudId] = i; });
  const localIdIndex = {};
  list.forEach((it,i)=>{ localIdIndex[it.id] = i; });
  const newlyAdded = [];
  let patched = false;
  (rows||[]).forEach(row=>{
    if(cloudIdIndex.hasOwnProperty(row.id)){
      // OPRAVA (1.8.2026): drive appka takovy zaznam jen preskocila -
      // kdyz si vlastnik pozdeji zmenil jmeno pozvaneho, uz stazene
      // polozky si to jmeno nikdy nedotahly. Ted se obnovi vzdy.
      const idx = cloudIdIndex[row.id];
      const newAuthor = row.added_by_label || 'Sdíleno';
      if(list[idx].author !== newAuthor){ list[idx] = Object.assign({}, list[idx], { author: newAuthor }); patched = true; }
      // OPRAVA (10.8.2026): stejny duvod jako u slozek - zarazeni souboru
      // do slozky se u uz stazenych polozek nikdy neaktualizovalo.
      const wantFolder = row.folder_id ? (cloudFolderToLocal[row.folder_id] || null) : null;
      if(!(row.folder_id && !wantFolder) && (list[idx].folderId || null) !== wantFolder){
        list[idx] = Object.assign({}, list[idx], { folderId: wantFolder }); patched = true;
      }
      return;
    }
    if(row.local_id && localIdIndex.hasOwnProperty(row.local_id)){
      const idx = localIdIndex[row.local_id];
      if(!list[idx].cloudId){ list[idx] = Object.assign({}, list[idx], { cloudId: row.id }); patched = true; }
      return;
    }
    const localFolderId = row.folder_id ? cloudFolderToLocal[row.folder_id] : null;
    if(row.folder_id && !localFolderId) return; // slozka jeste nedorazila - preskocit, priste to dozeneme
    const entry = {
      id: msUid('pitem'), cloudId: row.id, folderId: localFolderId||null,
      name: row.name, mime: row.mime||null, isNote: !!row.is_note,
      author: row.added_by_label || 'Sdíleno', sourceLocalId: row.local_id||null,
      scope: row.scope||'projekt', stageKey: row.stage_key||null,
    };
    list.push(entry);
    newlyAdded.push(entry);
  });
  const remoteIds = new Set((rows||[]).map(r=>r.id));
  // (11.8.2026) I zaznam ze snimku bez cloudId - viz msHydrateSharedProjectData.
  const jePrycI = (it)=> it.cloudId ? !remoteIds.has(it.cloudId) : !!it.fromSnapshot;
  const toRemove = list.filter(jePrycI);
  if(toRemove.length){
    toRemove.forEach(it=>{
      const blobKey = msBlobKey('pitem', it.id);
      MS_BLOB_CACHE.delete(blobKey);
      msIdbDelete(blobKey).catch(()=>{});
    });
    list = list.filter(it=> !jePrycI(it));
  }
  if(newlyAdded.length || patched || toRemove.length){ try{ localStorage.setItem(key, JSON.stringify(list)); }catch(e){ console.error('msMergeCloudProjectItems', e); } }
  return { newEntries: newlyAdded, removed: toRemove.length };
}

/* ============================================================
   PROJEKTY (spravovano centralne - pouziva Dashboard, Onboarding i Nastaveni)
   ============================================================ */
const MS_PROJECTS_KEY = 'ms_projects_v1';
const MS_ACTIVE_PROJECT_KEY = 'ms_active_project_v1';
const MS_ONBOARDED_KEY = 'ms_onboarded_v1';

function msDefaultProjects(){ return []; } // bez onboardingu zadny projekt neexistuje
function msLoadProjects(){
  try{
    const raw = localStorage.getItem(MS_PROJECTS_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return msDefaultProjects();
}
function msSaveProjects(list){ try{ localStorage.setItem(MS_PROJECTS_KEY, JSON.stringify(list)); }catch(e){} }
function msGetActiveProjectId(){
  try{ return localStorage.getItem(MS_ACTIVE_PROJECT_KEY) || null; }catch(e){ return null; }
}
function msSetActiveProjectId(id){ try{ localStorage.setItem(MS_ACTIVE_PROJECT_KEY, id); }catch(e){} }

/* ============================================================
   PRAVA PODLE SEKCE (1.8.2026) - vlastnik vidi/prida vzdy vsechno.
   Pozvany: "vidi sektor X" = ma X zaskrtnuty v sections (bez ohledu
   na can_add). "muze pridavat v sektoru X" = navic ma can_add=true.
   Klice sektoru: finance, denik, etapy, projekt, kalendar, fotky -
   "etapy" pokryva konkretne Nabidky/Dulezite/Dokumenty etap, samotny
   detail etapy (nazev, foto, aktualni/dokoncit) zustava vzdy viditelny.
   ============================================================ */
function msActiveProjectForRights(){
  return msLoadProjects().find(p=>p.id===msGetActiveProjectId());
}
function msCanViewSection(sectionKey){
  const p = msActiveProjectForRights();
  if(!p) return true;
  if(!p.isShared) return true; // vlastni projekt - vzdy vse
  if(!p.mySections) return true; // jeste nestazeno / stary zaznam - radeji neomezovat, nez omylem schovat vse
  return !!p.mySections[sectionKey];
}
function msCanAddSection(sectionKey){
  const p = msActiveProjectForRights();
  if(!p) return true;
  if(!p.isShared) return true;
  if(!p.myCanAdd) return false;
  return msCanViewSection(sectionKey);
}

/* ============================================================
   ZAMEK MISTO MIZENI (2.8.2026) - misto aby appka casti UI, do
   kterych pozvany nema pristup, uplne schovala, appka je necha na
   miste jako zamcene (velky zamek, obsah pod nim skryty). Kliknuti
   na cokoli zamceneho appka nikam neposle a jen ukaze hlasku.
   ============================================================ */
function msShowAccessDenied(){
  alert('Nemáš do téhle části přístup. Obrať se na správce stavby.');
}
// SVG zamku pouzity vsude stejne, at je to appce vizualne konzistentni.
function msLockIconSvg(size){
  size = size || 20;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="1"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`;
}

function msSetOnboarded(){ try{ localStorage.setItem(MS_ONBOARDED_KEY, '1'); }catch(e){} }

// Zamek appky (Face ID / bez zamku). Skutecne biometricke overovani jde
// spolehlive napojit az v nativne zabalene appce (viz diskuze o formatu) -
// zatim se jen uklada volba uzivatele, at je na to UI uz pripravene.
const MS_APP_LOCK_KEY = 'ms_app_lock_v1';
function msGetAppLock(){
  try{ return localStorage.getItem(MS_APP_LOCK_KEY) || null; }catch(e){ return null; }
}
function msSetAppLock(mode){ try{ localStorage.setItem(MS_APP_LOCK_KEY, mode); }catch(e){} }

// Posledni pouzity e-mail pro prihlaseni (Premium/sdileni) - zarizeni-uroven,
// NENI projektove-scoped (clovek se prihlasuje jednou pro cely telefon, ne
// zvlast pro kazdy projekt). Viz Premium-sdileni-specifikace.md bod 2.2.
const MS_LAST_LOGIN_EMAIL_KEY = 'ms_last_login_email_v1';
function msGetLastLoginEmail(){
  try{ return localStorage.getItem(MS_LAST_LOGIN_EMAIL_KEY) || ''; }catch(e){ return ''; }
}
function msSetLastLoginEmail(email){ try{ localStorage.setItem(MS_LAST_LOGIN_EMAIL_KEY, email); }catch(e){} }

/* ============================================================
   PREMIUM STAV - MOCK
   ZMENA 29.7.2026: Premium plati NA KONKRETNI STAVBU (projekt),
   ne na cely ucet/telefon. Kazdy projekt ma svuj vlastni stav -
   proto jde pres msProjectKey (stejny mechanismus jako u ostatnich
   projektovych dat), NE pres plochy localStorage klic jako drive.
   Skutecny zdroj pravdy bude az server (Supabase tabulka
   subscriptions, vazana na projekt), viz Premium-sdileni-specifikace.md
   bod 2.5 a 11.
   ============================================================ */
const MS_PREMIUM_MOCK_KEY = 'ms_premium_mock_v1';
const MS_PREMIUM_PLAN_KEY = 'ms_premium_plan_v1'; // 'monthly' | 'yearly' | 'lifetime'

function msIsPremiumMock(){
  try{ return localStorage.getItem(msProjectKey(MS_PREMIUM_MOCK_KEY)) === '1'; }catch(e){ return false; }
}
function msSetPremiumMock(on){ try{ localStorage.setItem(msProjectKey(MS_PREMIUM_MOCK_KEY), on ? '1' : '0'); }catch(e){} }

function msGetPremiumPlanType(){
  try{ return localStorage.getItem(msProjectKey(MS_PREMIUM_PLAN_KEY)) || null; }catch(e){ return null; }
}
function msSetPremiumPlanType(type){ try{ localStorage.setItem(msProjectKey(MS_PREMIUM_PLAN_KEY), type); }catch(e){} }

// Pro seznam VSECH projektu v Nastaveni (bez prepnuti na ne) - potrebuje
// zjistit stav LIBOVOLNEHO projektu, ne jen toho prave aktivniho.
function msIsPremiumMockForProject(projectId){
  try{ return localStorage.getItem(MS_PREMIUM_MOCK_KEY + '__' + projectId) === '1'; }catch(e){ return false; }
}
// Setter k funkci vyse - chybel, i kdyz cteni uz existovalo. Potreba
// pri obnove vlastni stavby z cloudu: existence v cloudu uz sama o
// sobe znamena, ze byla Premium, kdyz se tam naposledy nahravala.
function msSetPremiumMockForProject(projectId, on){
  try{ localStorage.setItem(MS_PREMIUM_MOCK_KEY + '__' + projectId, on ? '1' : '0'); }catch(e){}
}

/* ============================================================
   SDILENI - MOCK SEZNAM POZVANYCH LIDI
   Projektove-scoped (kazdy projekt ma svuj vlastni seznam sdilenych
   lidi) - jde pres msLoad/msSave jako ostatni projektova data.
   Zatim jen lokalni UI mock, zadny skutecny backend/pozvanky.
   Tvar zaznamu: { id, name, email, role: 'rodina'|'dozor'|'projektant'|'vlastni',
   status: 'pending'|'active'|'denied', canAdd: bool,
   sections: {finance,denik,etapy,projekt,kalendar,fotky} (jen pro 'vlastni') }
   ============================================================ */
function msLoadSharedPeople(){
  return msLoad('ms_shared_people', ()=>[]);
}
function msSaveSharedPeople(list){ msSave('ms_shared_people', list); }

/* Rozliseni DUVODU odepreni pristupu - viz Premium-sdileni-specifikace.md
   sekce 18.1. "manual" = vlastnik odepral schvalne, "expired" = udelala to
   appka sama kvuli vyprsenemu predplatnemu. Pri obnoveni predplatneho se
   maji automaticky vratit prava JEN lidem s duvodem "expired" - rucne
   odepreni zustavaji zamceni dal, dokud je vlastnik neodemkne sam. */
function msRestoreExpiredSharedPeople(){
  const people = msLoadSharedPeople();
  let changed = false;
  people.forEach(p=>{
    if(p.status === 'denied' && p.deniedReason === 'expired'){ p.status = 'active'; p.deniedReason = null; changed = true; }
  });
  if(changed) msSaveSharedPeople(people);
}

function msHasChosenAppLock(){ return msGetAppLock() !== null; }

// vytvori novy projekt (pouziva se pri onboardingu i pri "Pridat projekt" v Nastaveni/Dashboardu)
function msCreateProject({name, type, location}){
  const list = msLoadProjects();
  const id = msUid('p');
  const project = {
    id, name, type: type || null, location: location || '',
    started:false, startDate:null, finished:false, finishDate:null, lastMilestoneMonths:0,
    currentStage:{name:'Bez etapy', color:'#94a0bc'},
    totalExpenses:0, monthExpenses:0, balance:0, photoCount:0
  };
  list.push(project);
  msSaveProjects(list);
  msSetActiveProjectId(id);
  if(type) msSetProjectMeta({type});
  // (10.8.2026) Tise zaloz ucet, at ma clovek k cemu pripojit e-mail,
  // az bude chtit Premium nebo sdileni. Bezi na pozadi a nic neblokuje -
  // offline se nic nestane a doresi se pri dalsim spusteni.
  if(typeof MSCloud !== 'undefined' && MSCloud.ensureAccountForNewProject){
    MSCloud.ensureAccountForNewProject().catch(e=> console.error('zalozeni uctu na pozadi', e));
  }
  return project;
}
function msUpdateProject(id, patch){
  const list = msLoadProjects();
  const idx = list.findIndex(p=>p.id===id);
  if(idx===-1) return null;
  list[idx] = Object.assign({}, list[idx], patch);
  msSaveProjects(list);
  // Stejny duvod jako u msSetProjectMeta: nazev, misto, "zahajeno" i
  // aktualni etapa jsou v hlavicce snimku. Funkce si sama overi, ze jde
  // o vlastni projekt s Premiem, takze u sdileneho projektu (kde ji
  // vola slucovani dat) se nic nestane.
  msTriggerCloudSnapshotSync();
  return list[idx];
}
// OPRAVA (2.8.2026): drive msDeleteProject smazalo jen zaznam projektu ze
// seznamu - vsechna jeho data (denik, vydaje, fotky, dokumenty, slozky...)
// zustala osirele v localStorage/IndexedDB. Ted appka pri smazani projektu
// uklidi VSECHNO, co k nemu patri - kazdy klic (localStorage i IndexedDB
// blob) je orazitkovany "__<projectId>" na konci (viz msProjectKey/
// msBlobKey), takze staci najit a smazat vse, co timhle vzorem konci.
async function msDeleteProject(id){
  let list = msLoadProjects();
  list = list.filter(p=>p.id!==id);
  msSaveProjects(list);
  if(msGetActiveProjectId()===id){
    msSetActiveProjectId(list.length ? list[0].id : null);
  }
  const suffix = '__' + id;
  try{
    const lsKeys = [];
    for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k && k.endsWith(suffix)) lsKeys.push(k); }
    lsKeys.forEach(k=> localStorage.removeItem(k));
  }catch(e){ console.error('msDeleteProject uklid localStorage selhal', e); }
  try{
    const idbKeys = await msIdbAllKeys();
    const toDelete = idbKeys.filter(k=> typeof k === 'string' && k.endsWith(suffix));
    await Promise.all(toDelete.map(k=> msIdbDelete(k).catch(()=>{})));
    if(typeof MS_BLOB_CACHE !== 'undefined'){
      [...MS_BLOB_CACHE.keys()].forEach(k=>{ if(typeof k==='string' && k.endsWith(suffix)) MS_BLOB_CACHE.delete(k); });
    }
  }catch(e){ console.error('msDeleteProject uklid IndexedDB selhal', e); }
}

/* ============================================================
   SDILENE PROJEKTY (Krok 11 - zobrazeni sdileneho projektu)
   Lokalni "zastupny" projekt, ktery reprezentuje stavbu VLASTNENOU
   NEKYM JINYM, ke ktere mam pristup pres prijatou pozvanku. Ma
   vlastni lokalni "id" (jako kazdy jiny projekt v appce), ale navic
   "remoteProjectId" (Supabase projects.id), podle ktereho appka
   pozna, ze jde o tenhle konkretni sdileny projekt (aby ho pri
   opakovanem prijeti/otevreni appky nezalozila dvakrat).
   ============================================================ */
function msFindLocalProjectByRemoteId(remoteId){
  return msLoadProjects().find(p=> p.remoteProjectId === remoteId) || null;
}
/* Lokalni zaznam pro VLASTNI stavbu obnovenou z cloudu (13.8.2026),
   pouziva se pri obnove po preinstalaci/vymene telefonu. Na rozdil od
   msCreateSharedProjectLocal je isShared:false - je to plnohodnotna
   vlastni stavba, ne sdilena kopie cizi. */
function msCreateOwnedProjectLocal({ remoteProjectId, name, location }){
  const existing = msFindLocalProjectByRemoteId(remoteProjectId);
  if(existing) return existing;
  const list = msLoadProjects();
  const id = msUid('p');
  const project = {
    id, name: name || 'Stavba', type: null, location: location || '',
    started:false, startDate:null, finished:false, finishDate:null, lastMilestoneMonths:0,
    currentStage:{name:'Bez etapy', color:'#94a0bc'},
    totalExpenses:0, monthExpenses:0, balance:0, photoCount:0,
    isShared: false, remoteProjectId,
  };
  list.push(project);
  msSaveProjects(list);
  return project;
}

function msCreateSharedProjectLocal({ remoteProjectId, name, location, role }){
  const existing = msFindLocalProjectByRemoteId(remoteProjectId);
  if(existing) return existing;
  const list = msLoadProjects();
  const id = msUid('p');
  const project = {
    id, name: name || 'Sdílená stavba', type: null, location: location || '',
    started:false, startDate:null, finished:false, finishDate:null, lastMilestoneMonths:0,
    currentStage:{name:'Bez etapy', color:'#94a0bc'},
    totalExpenses:0, monthExpenses:0, balance:0, photoCount:0,
    isShared: true, remoteProjectId, sharedRole: role || null
  };
  list.push(project);
  msSaveProjects(list);
  return project;
}

/* ============================================================
   KROK 12 - obsah snimku (etapy/finance/denik/kalendar/ukoly...).
   Zamerne JEN textova data bez vlozenych souboru/fotek - fotky
   (ms_photos_v1), dokumenty etap (ms_documents_v1) a obecny strom
   slozek (ms_folder_tree_v1 - soubory tam maji obsah vlozeny PRIMO
   v datech, ne v IndexedDB jako fotky) by snimek zbytecne nafoukly.
   Synchronizace souboru je samostatna, vetsi budouci prace.
   ============================================================ */
const MS_SNAPSHOT_TEXT_KEYS = [
  'ms_custom_stages_v1', 'ms_selected_stages_v1', 'ms_current_stage_v1',
  'ms_closed_stages_v1', 'ms_stage_order_v1', 'ms_stage_active_days_v1',
  'ms_diary_meta_v1', 'ms_important_v1', 'ms_offers_v1', 'ms_project_meta_v1',
  // POZOR (1.8.2026): 'ms_events_v1'/'ms_tasks_v1' TADY ZAMERNE NEJSOU -
  // Kalendar i Ukoly maji od tohoto bodu svuj vlastni OBOUSMERNY system
  // (project_calendar_events, project_task_items), stejny princip jako
  // Denik/Finance/Fotky.
  // POZOR (1.8.2026): 'ms_documents_v1' ("Dokumenty etap") TADY ZAMERNE
  // NENI - ma od tohoto bodu svuj vlastni OBOUSMERNY system
  // (project_stage_documents).
  // POZOR (1.8.2026): 'ms_photos_v1' TADY ZAMERNE NENI - Fotky maji od
  // tohoto bodu svuj vlastni OBOUSMERNY system (project_photos_meta,
  // stejny princip jako Denik/Finance) - kdyby byl i tady, hromadny
  // snimek by prepsal zive slouceni (presne chyba z bodu 21.27).
  // POZOR (1.8.2026): 'ms_diary_v1' TADY ZAMERNE NENI - Denik ma od
  // tohoto bodu svuj vlastni OBOUSMERNY system (project_diary_entries,
  // MSCloud.pushDiaryEntry/fetchAllDiaryEntries, msMergeCloudDiaryEntries)
  // - kdyby byl i tady, hromadny snimek by prepsal zive slouceni
  // (presne chyba z bodu 21.27 v historii specifikace, nesmi se opakovat).
  // VRACENO ZPET (1.8.2026, na zadost): "Projekt" slozky se vratily na
  // JEDNOSMERNE sdileni (vlastnik -> pozvany) pres tenhle snimek, presne
  // jak fungovaly od Kroku 15 do teto zmeny. Obousmerny pokus
  // (project_folder_files) se ukazal jako prilis rozhazeny/nespolehlivy
  // v praxi a byl vyjmut.
  'ms_folder_tree_v1',
];

// Posbira textova data AKTIVNIHO projektu do jednoducheho objektu
// {base_klic: syrovy JSON retezec} - presne to, co uz je v localStorage
// (msSave tam uklada uz jako JSON.stringify), takze se to jen kopiruje.
function msCollectSnapshotData(){
  const data = {};
  MS_SNAPSHOT_TEXT_KEYS.forEach(base=>{
    try{
      const raw = localStorage.getItem(msProjectKey(base));
      if(raw !== null) data[base] = raw;
    }catch(e){}
  });
  return data;
}

// Zapise stazena data snimku do localStorage POD KONKRETNIM lokalnim
// projektem (jeho vlastni "id", ne nutne aktivni projekt appky) -
// pouziva se pri prijeti/obnoveni sdileneho projektu.
function msHydrateSharedProjectData(localProjectId, snapshotData){
  if(!snapshotData || !localProjectId) return;
  Object.keys(snapshotData).forEach(base=>{
    try{
      let hodnota = snapshotData[base];
      /* OPRAVA (11.8.2026): snimek je JEDNORAZOVA kopie dat vlastnika
         porizena v okamziku nahrani. Kdyz mezitim vlastnik neco smazal,
         pozvany to ze snimku presto dostal - a uz se toho nikdy nezbavil.
         Uklid "co v cloudu neni, smaz" totiz maze jen zaznamy s cloudId,
         a zaznamy ze snimku ho nemaji.
         Reseni: oznacime je priznakem fromSnapshot. Az dorazi kompletni
         seznam z cloudu, slucovaci funkce takovy zaznam bud sparuje
         (a priznak zmizi), nebo ho smaze - protoze u vlastnika uz
         neexistuje. Vlastni zaznamy pozvaneho priznak nemaji, takze se
         jich uklid nikdy nedotkne. */
      try{
        const parsed = JSON.parse(hodnota);
        if(Array.isArray(parsed)){
          hodnota = JSON.stringify(parsed.map(z=>
            (z && typeof z === 'object' && !Array.isArray(z)) ? Object.assign({}, z, { fromSnapshot: true }) : z
          ));
        }
      }catch(e){ /* neni to pole - ulozime tak, jak prislo */ }
      localStorage.setItem(base + '__' + localProjectId, hodnota);
    }catch(e){ console.error('msHydrateSharedProjectData', base, e); }
  });
}
