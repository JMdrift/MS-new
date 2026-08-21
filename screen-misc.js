/* ==========================================================
   OSLAVNA OBRAZOVKA
   ========================================================== */
const CelebrationScreen = (function(){
  function render(container, params){
    const title = params.title || 'Gratulujeme!';
    const colors = ['#4dffab','#b34cff','#25e8ff','#ffd35c','#ff5e7b','#25b7ff'];
    let fireworksHtml = '';
    for(let burst=0; burst<3; burst++){
      const cx = 20 + burst*30 + Math.random()*10;
      const cy = 20 + Math.random()*30;
      const delay = burst*0.35;
      let particles = '';
      for(let i=0;i<14;i++){
        const angle = (360/14)*i;
        const dist = 55 + Math.random()*25;
        const color = colors[(burst+i) % colors.length];
        const dx = Math.cos(angle*Math.PI/180)*dist;
        const dy = Math.sin(angle*Math.PI/180)*dist;
        particles += `<i style="position:absolute;left:${cx}%;top:${cy}%;width:5px;height:5px;border-radius:50%;background:${color};
          box-shadow:0 0 6px ${color};animation:fwPart 1.1s ${delay}s ease-out forwards;--dx:${dx.toFixed(0)}px;--dy:${dy.toFixed(0)}px"></i>`;
      }
      fireworksHtml += particles;
    }
    container.innerHTML = `
      <style>
        @keyframes fwPart{
          0%{ transform:translate(0,0) scale(1); opacity:1; }
          100%{ transform:translate(var(--dx),var(--dy)) scale(.2); opacity:0; }
        }
        @keyframes fwPop{ 0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.08);opacity:1} 100%{transform:scale(1)} }
      </style>
      <div style="position:absolute;inset:0;pointer-events:none;overflow:hidden">${fireworksHtml}</div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center;position:relative">
        <div style="width:80px;height:80px;border-radius:50%;border:2px solid #4dffab;color:#4dffab;display:grid;place-items:center;box-shadow:0 0 30px rgba(77,255,171,.5);animation:fwPop .5s ease">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
        </div>
        <h1 style="margin:0;font-size:22px">${title}</h1>
        <div style="display:flex;gap:20px">
          <div><b style="display:block;font-size:20px;color:#4dffab">${params.photos||0}</b><span style="font-size:10.5px;color:var(--muted)">fotek</span></div>
          <div><b style="display:block;font-size:20px;color:#4dffab">${Number(params.money||0).toLocaleString('cs-CZ')} Kč</b><span style="font-size:10.5px;color:var(--muted)">celkem utraceno</span></div>
        </div>
        <button class="btn-primary" id="contBtn" style="margin-top:16px;background:linear-gradient(90deg,#25e8ff,#4dffab);color:#04070f;border:0;width:auto;padding:12px 28px">Pokračovat</button>
      </div>
    `;
    container.querySelector('#contBtn').addEventListener('click', ()=> Router.go('dashboard'));
    return { showNav:false };
  }
  return { render };
})();
Router.register('celebration', CelebrationScreen);


/* ==========================================================
   NABIDKY A DULEZITE - jednoduche zastupne obrazovky (stub)
   ========================================================== */
function stubScreen(routeName, title, desc){
  Router.register(routeName, {
    render(container){
      container.innerHTML = `
        <div class="topbar">
          <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
          <h1>${title}</h1>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center">
          <span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);border:1px solid var(--line);padding:4px 10px">Připravujeme</span>
          <p style="font-size:12.5px;color:var(--muted);max-width:250px">${desc}</p>
        </div>
      `;
      container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());
      return { showNav:true, activeTab:'' };
    }
  });
}
stubScreen('offers', 'Nabídky', 'Porovnávání nabídek od řemeslníků a dodavatelů přijde v další verzi appky.');
