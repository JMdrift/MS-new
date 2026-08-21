/* ==========================================================
   PRAVNI OBSAH - Zasady ochrany osobnich udaju + Podminky pouzivani.
   Aktualizovano podle skutecneho stavu appky: appka je 100% lokalni,
   zadny cloud, zadne prihlasovani, zadne sdileni (viz
   Premium-sdileni-specifikace.md - tyhle funkce se az v budoucnu
   znovu navrhnou a pridaji, zatim v appce vubec nejsou). Google Play
   i App Store vyzaduji verejnou URL se zasadami ochrany osobnich
   udaju - stejny text je proto potreba mit i jako samostatnou
   staticky hostovanou stranku (viz privacy.html), tohle je jen kopie
   uvnitr appky.
   ========================================================== */
function legalScreenShell(container, title, bodyHtml){
  container.innerHTML = `
    <div class="topbar">
      <button class="back-btn" id="backBtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
      <h1>${title}</h1>
    </div>
    <div class="screen-scroll" style="padding:18px 16px 40px;font-size:12.5px;line-height:1.7;color:var(--text-main)">
      ${bodyHtml}
    </div>
  `;
  container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());
  return { showNav:false };
}

const PrivacyPolicyScreen = (function(){
  function render(container){
    return legalScreenShell(container, 'Ochrana osobních údajů', `
      <p style="color:var(--muted);font-size:11px">Platné od: 2026</p>

      <p><b>To nejdůležitější shrnuté na začátek:</b> Appka je 100% lokální - všechna data, která do ní zadáš, se ukládají pouze v tomto telefonu. Appka nemá žádný cloud, žádné přihlašování a žádnou možnost sdílet projekt s jinou osobou. Nic z appky se nikam neodesílá. Data nikdy neprodáváme, nesdílíme s inzerenty a appka neobsahuje žádné reklamní ani sledovací nástroje třetích stran.</p>

      <p><b>Jaká data appka ukládá</b><br/>
      Vše, co do appky sám zadáš: název a místo projektu, etapy stavby, výdaje a jejich částky, fotografie, poznámky do deníku, události v kalendáři, úkoly a nahrané dokumenty. Appka si dále lokálně pamatuje tvoje nastavení (zvolený motiv, zámek appky).</p>

      <p><b>Kam se tato data ukládají</b><br/>
      Výhradně do lokálního úložiště tvého telefonu (localStorage a IndexedDB) - appka je nikam neodesílá a nemá k tomu ani technickou možnost.</p>

      <p><b>Sdílení s třetími stranami</b><br/>
      Appka data neprodává, nesdílí s inzerenty ani s žádnou třetí stranou - protože appka žádnou síťovou komunikaci s daty ani nevyužívá. Appka neobsahuje reklamy ani analytické/sledovací nástroje třetích stran.</p>

      <p><b>Fotoaparát a fotky</b><br/>
      Appka žádá přístup k fotoaparátu/galerii pouze proto, aby sis mohl vyfotit nebo vybrat fotku, kterou sám přiložíš k etapě. Fotky zůstávají jen lokálně v telefonu.</p>

      <p><b>Záloha a export dat</b><br/>
      Appka nabízí možnost vytvořit si ruční zálohu dat jako soubor (Nastavení → Zálohovat) - tenhle soubor vytváříš a spravuješ výhradně ty sám, appka ho nikam sama neodesílá.</p>

      <p><b>Smazání dat</b><br/>
      Lokální data můžeš kdykoli smazat přímo v appce (Nastavení → Smazat všechna data appky) nebo odinstalováním appky z telefonu.</p>

      <p><b>Zámek appky</b><br/>
      Pokud appku zamkneš (Face ID / kód telefonu), appka se k ověření tvé identity dotazuje operačního systému telefonu - appka sama nikdy nevidí ani neukládá tvůj kód či biometrické údaje.</p>

      <p><b>Děti</b><br/>
      Appka není cílená na děti a vědomě nesbírá údaje o dětech.</p>

      <p><b>Změny těchto zásad</b><br/>
      Pokud appka v budoucnu přibyde další funkce pracující s daty, tahle stránka i text v appce budou aktualizovány a datum na začátku se změní.</p>

      <p><b>Kontakt</b><br/>
      Dotazy ohledně ochrany osobních údajů piš na <b>moje-stavba-app@seznam.cz</b>.</p>
    `);
  }
  return { render };
})();
Router.register('privacy-policy', PrivacyPolicyScreen);

const TermsScreen = (function(){
  function render(container){
    return legalScreenShell(container, 'Podmínky používání', `
      <p style="color:var(--muted);font-size:11px">Platné od: 2026</p>

      <p>Používáním appky Moje Stavba souhlasíš s těmito podmínkami.</p>

      <p><b>Co appka je</b><br/>
      Moje Stavba je osobní nástroj na sledování průběhu vlastní stavby nebo rekonstrukce - etapy, výdaje, stavební deník, fotky, kalendář a dokumenty. Appka je poskytována tak, jak je ("as is"), bez záruky nepřetržité bezchybné funkčnosti.</p>

      <p><b>Tvoje data, tvoje odpovědnost</b><br/>
      Appka ukládá data výhradně v tvém telefonu (viz Zásady ochrany osobních údajů výše) - za jejich zálohování tak odpovídáš ty sám, appka nabízí i funkci ručního exportu zálohy (Nastavení → Zálohovat), doporučujeme ji používat pravidelně. Při ztrátě, poškození nebo výměně telefonu bez vytvořené zálohy může dojít ke ztrátě dat - autor appky za takovou ztrátu neodpovídá.</p>

      <p><b>Přesnost údajů</b><br/>
      Appka je pomocný nástroj pro evidenci - za správnost zadaných částek, dat a informací (např. pro účely daňové evidence či komunikace s úřady) odpovídá výhradně uživatel.</p>

      <p><b>Změny appky</b><br/>
      Appka se může v čase měnit a vyvíjet (nové funkce, opravy). Podstatné změny těchto podmínek budou uvedeny s novým datem platnosti výše.</p>

      <p><b>Ukončení používání</b><br/>
      Appku můžeš kdykoli přestat používat a odinstalovat. Smazání appky z telefonu trvale odstraní i všechna lokálně uložená data, pokud sis předtím nevytvořil zálohu.</p>

      <p><b>Kontakt</b><br/>
      Dotazy piš na <b>moje-stavba-app@seznam.cz</b>.</p>
    `);
  }
  return { render };
})();
Router.register('terms', TermsScreen);
