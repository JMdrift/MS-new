/* ==========================================================
   IKONY ETAP - jedna sdilena sada pro cele kolo, prehled, detail
   i dashboard (drive kazda obrazovka mela kopii, coz vedlo k
   nekonzistenci - kolo/prehled/detail koncily s obecnym kolieckem
   misto skutecneho tvaru etapy)
   ========================================================== */
const MS_STAGE_ICONS = {
  zahrada: '<path d="M36 62V44"/><path d="M36 44c-10 0-16-7-16-16 9 0 14 4 16 9 2-5 7-9 16-9 0 9-6 16-16 16z"/><path d="M36 34c-8 0-13-6-13-13 7 0 11 3 13 7 2-4 6-7 13-7 0 7-5 13-13 13z"/>',
  zaklady: '<path d="M8 44 L36 60 L64 44 L36 28 Z"/><path d="M8 44 L8 50 L36 66 L36 60"/><path d="M64 44 L64 50 L36 66"/><path d="M26 40 V20 M32 37 V13 M38 39 V17 M44 41 V23 M50 43 V29"/><path d="M17 46.5 V41 M55 46.5 V41"/>',
  zemni: '<path d="M10 58h30"/><path d="M18 58V38l14-8 8 6-4 22"/><path d="M32 30l14-12 6 5-11 13"/><path d="M46 23l10-4 3 5-9 6"/><circle cx="18" cy="58" r="4"/>',
  hruba: '<path d="M10 54h52"/><path d="M10 44h20M34 44h28"/><path d="M10 34h10M24 34h18M46 34h18"/><path d="M10 24h28M42 24h22"/><path d="M10 20v38M62 20v38"/>',
  strecha: '<path d="M8 42 L36 14 L64 42"/><path d="M16 42h48"/><path d="M22 34h32M28 26h16"/><path d="M48 24v-10h8v18"/>',
  okna: '<path d="M14 18h20v38H14z"/><path d="M14 32h20M24 18v38"/><path d="M42 24h16v32H42z"/><path d="M42 40h16"/>',
  elektro: '<path d="M38 10 L18 40 H32 L26 62 L54 30 H40 Z"/>',
  voda: '<path d="M36 14c10 14 16 22 16 32a16 16 0 1 1-32 0c0-10 6-18 16-32z"/><path d="M27 46a9 9 0 0 0 9 9"/>',
  vytapeni: '<path d="M16 14h40v10H16z"/><path d="M20 24v34M28 24v34M36 24v34M44 24v34M52 24v34"/>',
  pozemek: '<rect x="16" y="16" width="40" height="40"/><path d="M16 16l-7-7M56 16l7-7M16 56l-7 7M56 56l7 7"/>',
  projekt_povoleni: '<path d="M18 10h26l10 10v42H18z"/><path d="M26 24h18M26 32h18M26 40h12"/><circle cx="46" cy="50" r="9"/><path d="M42 50l3 3 6-6"/>',
  zatepleni: '<rect x="14" y="14" width="44" height="44"/><path d="M22 22c4 4 4 8 0 12s-4 8 0 12M34 22c4 4 4 8 0 12s-4 8 0 12M46 22c4 4 4 8 0 12s-4 8 0 12"/>',
  interier: '<rect x="16" y="18" width="26" height="10" rx="3"/><path d="M29 28v12"/><path d="M20 40h18v14H20z"/>',
  koupelna: '<path d="M12 40h48v4a12 12 0 0 1-12 12H24A12 12 0 0 1 12 44z"/><path d="M18 40v-10a6 6 0 0 1 6-6"/><circle cx="21" cy="26" r="2"/>',
  kuchyne: '<path d="M18 18v8h10"/><rect x="14" y="30" width="28" height="16" rx="2"/><circle cx="28" cy="38" r="4"/><path d="M50 26v20"/>',
  naradi: '<path d="M44 14a9 9 0 0 0-12 12L18 40l6 6 14-14a9 9 0 0 0 12-12l-6 6-4-4z"/>',
  chytra_domacnost: '<path d="M16 36l20-16 20 16"/><path d="M22 36v20h28V36"/><path d="M30 44a8 8 0 0 1 12 0"/><circle cx="36" cy="50" r="1.8" fill="currentColor" stroke="none"/>',
  rekuperace: '<path d="M20 30a16 16 0 0 1 28-8"/><path d="M52 42a16 16 0 0 1-28 8"/><path d="M44 16l6 6-7 3"/><path d="M28 56l-6-6 7-3"/>',
  posledni_upravy: '<rect x="18" y="14" width="36" height="44" rx="2"/><path d="M27 30l4 4 8-8M27 44h16"/>',
  plot: '<path d="M18 24v32M30 20v36M42 20v36M54 24v32"/><path d="M14 32h44M14 44h44"/>',
  demolice: '<path d="M14 58h44"/><path d="M20 58V30l16-8 16 8v28"/><path d="M28 30l-3 12M40 30l4 14M22 42l6-3M50 40l-7 4"/>',
  sanace_vlhkosti: '<path d="M36 12c9 13 15 21 15 29a15 15 0 1 1-30 0c0-8 6-16 15-29z"/><path d="M22 46l28-16"/>',
  podlahy: '<path d="M10 24h20v16H10zM32 24h30v16H32zM10 42h30v16H10zM42 42h20v16H42z"/>',
  malby_natery: '<path d="M24 14h20v14a4 4 0 0 1-4 4H28a4 4 0 0 1-4-4z"/><path d="M30 32v10h12V32"/><path d="M32 42l-8 18h24l-8-18"/>',
  garaz: '<path d="M12 60V30l24-16 24 16v30z"/><path d="M12 34h48"/><path d="M22 60V38h28v22"/>',
  bazen: '<rect x="12" y="18" width="48" height="30" rx="2"/><path d="M16 56c4-3 8-3 12 0s8 3 12 0 8-3 12 0 8 3 12 0"/>',
};
const MS_ICON_FALLBACK = '<path d="M36 14v18M36 40v18M14 36h18M40 36h18" stroke-linecap="round"/><circle cx="36" cy="36" r="27"/>';

function msStageIconSvg(key, size, color){
  size = size || 24;
  const inner = MS_STAGE_ICONS[key] || MS_ICON_FALLBACK;
  const colorAttr = color ? ` style="color:${color} !important"` : '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 72 72" fill="none"${colorAttr}><g stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
}
