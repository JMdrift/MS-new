/* ==========================================================
   SUPABASE - KLIENT A PRIHLASOVACI POMOCNE FUNKCE (Krok 9)

   Nahrazuje UI mock v screen-premiumLogin.js skutecnym volanim
   Supabase Auth - Google OAuth a e-mail magic link, viz bod 2
   specifikace.

   DULEZITE - PKCE flow: Google i magic-link presmerovani se
   vraceji do appky s "?code=..." v ADRESE (query), NE v #hashi.
   Appka pouziva hash-based routovani (#/obrazovka), takze kdyby
   Supabase pouzival hash pro navratovy kod (starsi "implicit"
   zpusob), rozbilo by se to o Router (viz router.js). Proto je
   dole vyslovne nastaveno flowType:'pkce'.

   CEKANI NA JINEM ZARIZENI (bod 2.5 specifikace - odkaz otevreny
   na jinem telefonu/pocitaci nez appka): tohle zatim NENI reseno.
   To, co appka umi ted: pozna potvrzeni, pokud se odkaz otevre ve
   STEJNEM prohlizeci (i v jine zalozce) - Supabase session se mezi
   zalozkami stejneho prohlizece sdili automaticky pres localStorage.
   Skutecne mezi-zarizeni cekani vyzaduje samostatnou tabulku +
   pravidelne dotazovani serveru - samostatna prace na pozdeji.
   ========================================================== */
const MSAuth = (function(){
  let client = null;

  function get(){
    if(!client){
      if(typeof supabase === 'undefined'){
        console.error('Supabase JS knihovna neni nactena - zkontroluj poradi <script> tagu v index.html');
        return null;
      }
      if(!MS_SUPABASE_ANON_KEY || MS_SUPABASE_ANON_KEY === 'SEM_VLOZ_SVUJ_ANON_KLIC'){
        console.error('Chybi anon klic - dopln MS_SUPABASE_ANON_KEY v supabase-config.js');
        return null;
      }
      client = supabase.createClient(MS_SUPABASE_URL, MS_SUPABASE_ANON_KEY, {
        auth: {
          flowType: 'pkce',
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true
        }
      });
    }
    return client;
  }

  // Adresa, kam se ma appka po prihlaseni vratit - schvalne BEZ #hashe
  // (appkova "trasa"/route se resi zvlast, viz ms_auth_pending_flow nize),
  // aby se v Supabase dala nastavit jedna pevna Redirect URL, ne zavisla
  // na tom, na jake obrazovce appky se zrovna prihlasovani spustilo.
  function redirectUrl(){
    return window.location.origin + window.location.pathname;
  }

  async function getSession(){
    const c = get(); if(!c) return null;
    const { data, error } = await c.auth.getSession();
    if(error){ console.error('MSAuth.getSession', error); return null; }
    return data ? data.session : null;
  }

  // event bude typicky 'SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED'...
  // vraci funkci na odhlaseni odberu (zavolej pri zavreni obrazovky)
  function onAuthChange(cb){
    const c = get(); if(!c) return function(){};
    const { data } = c.auth.onAuthStateChange((event, session)=>{ cb(event, session); });
    return function unsubscribe(){ try{ data.subscription.unsubscribe(); }catch(e){} };
  }

  // "Pamatuje si", ze appka po navratu z presmerovani (Google/magic link)
  // ma pokracovat v puvodnim rezimu (nakup Premium / prijeti pozvanky) -
  // appka se totiz pri presmerovani cela znovu nacte a beznou JS promennou
  // (flowMode v screen-premiumLogin.js) by tak ztratila. Cte se v main.js
  // pres PremiumLogin.checkAuthResume() hned pri startu appky. "extra" je
  // volitelny dodatecny kontext (napr. token pozvanky u rezimu 'identity').
  function setPendingFlow(flow, extra){
    try{ localStorage.setItem('ms_auth_pending_flow', JSON.stringify({ flow, extra: extra || null })); }catch(e){}
  }
  function takePendingFlow(){
    try{
      const raw = localStorage.getItem('ms_auth_pending_flow');
      if(!raw) return null;
      localStorage.removeItem('ms_auth_pending_flow');
      const parsed = JSON.parse(raw);
      // zpetna kompatibilita: starsi verze ukladala jen holy retezec
      return (parsed && typeof parsed === 'object') ? parsed : { flow: parsed, extra: null };
    }catch(e){ return null; }
  }
  // Necha zaznam na miste - jen precte, nemaze. Potreba (14.8.2026),
  // aby appka vedela PREDEM, jestli ma smysl na session cekat, driv
  // nez se pending flow destruktivne vezme.
  function peekPendingFlow(){
    try{
      const raw = localStorage.getItem('ms_auth_pending_flow');
      if(!raw) return null;
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object') ? parsed : { flow: parsed, extra: null };
    }catch(e){ return null; }
  }

  async function signInWithGoogle(flow, extra){
    const c = get(); if(!c) return { error: 'Supabase neni pripojene (chybi anon klic?)' };
    setPendingFlow(flow, extra);
    const { error } = await c.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl() }
    });
    return { error };
  }

  async function sendMagicLink(email, flow, extra){
    const c = get(); if(!c) return { error: 'Supabase neni pripojene (chybi anon klic?)' };
    setPendingFlow(flow, extra);
    const { error } = await c.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl(),
        shouldCreateUser: true
      }
    });
    return { error };
  }

  /* ============================================================
     ANONYMNI UCET (10.8.2026)
     Ucet se drive zakladal az pri koupi Premium nebo pri prijeti
     pozvanky. Kdo si preinstaloval telefon driv, prisel o vsechno -
     ensureProject() paruje projekt podle local_id vygenerovaneho na
     PUVODNIM telefonu, takze na novem zarizeni zalozil dalsi prazdny
     projekt misto aby nasel ten stary.
     Ted se pri zalozeni prvni stavby tise vytvori skutecny ucet v
     auth.users - bez e-mailu, bez hesla, uzivatel o nicem nevi. Az si
     nekdo koupi Premium nebo bude chtit sdilet, tenhle SAMY ucet se
     jen "povysi" pripojenim e-mailu/Googlu a nic se neztrati.
     POZOR: anonymni ucet zije jen v tomhle telefonu (token v
     localStorage). Dokud k nemu clovek nepripoji e-mail, obnovit se
     neda - proto je pripojeni pri koupi Premium povinne, viz
     screen-premiumLogin.js.
     Vyzaduje zapnute "Anonymous sign-ins" v Supabase (Authentication
     -> Providers -> Anonymous).
     ============================================================ */
  async function ensureAnonymousAccount(){
    const c = get();
    if(!c) return { error: null, session: null }; // offline/nezapojene - nevadi, zkusi se priste
    try{
      const existing = await getSession();
      if(existing) return { error: null, session: existing };
      if(typeof c.auth.signInAnonymously !== 'function'){
        return { error: null, session: null }; // starsi supabase-js, tise preskocit
      }
      const { data, error } = await c.auth.signInAnonymously();
      if(error){ console.error('anonymni ucet se nepodarilo zalozit', error); return { error, session: null }; }
      return { error: null, session: (data && data.session) || null };
    }catch(e){
      console.error('ensureAnonymousAccount neocekavana chyba', e);
      return { error: e, session: null };
    }
  }

  // Je prihlaseny ucet jeste anonymni (bez e-mailu)? Podle toho se
  // rozhoduje, jestli pri koupi Premium vyzadovat pripojeni e-mailu.
  async function isAnonymousAccount(){
    try{
      const s = await getSession();
      if(!s || !s.user) return false;
      if(s.user.is_anonymous === true) return true;
      return !s.user.email;
    }catch(e){ return false; }
  }

  async function signOut(){
    const c = get(); if(!c) return;
    try{ await c.auth.signOut(); }catch(e){}
  }

  return { get, getSession, onAuthChange, signInWithGoogle, sendMagicLink, signOut, setPendingFlow, takePendingFlow, peekPendingFlow, ensureAnonymousAccount, isAnonymousAccount };
})();
