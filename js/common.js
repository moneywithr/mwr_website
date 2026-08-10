// Gemeinsame Logik für alle Seiten: Sprache, Formatierung, Navigation.
// Wird auf JEDER Seite VOR dem seiten-spezifischen Skript eingebunden
// (nach i18n.js und broker-data.js).
window.Site = (function(){
  const LANG_KEY = 'mwr_lang';

  const state = {
    lang: localStorage.getItem(LANG_KEY) || 'ar',
  };

  function t(key){ return window.I18N[state.lang][key]; }
  function locale(){ return window.I18N[state.lang].locale; }

  function fmtEUR(v){
    return v.toLocaleString(locale(),{style:'currency',currency:'EUR',maximumFractionDigits:0});
  }
  function fmtCompact(v){
    const n = new Intl.NumberFormat(locale(),{notation:'compact',maximumFractionDigits:1}).format(v);
    return n + ' €';
  }
  function fmtPct(v, digits){
    return v.toLocaleString(locale(),{minimumFractionDigits:digits,maximumFractionDigits:digits}) + ' %';
  }
  function textWidth(text, font){
    const canvas = textWidth._c || (textWidth._c = document.createElement('canvas'));
    const ctx = canvas.getContext('2d');
    ctx.font = font;
    return ctx.measureText(text).width;
  }

  // Aktualisiert alle statischen Textelemente (data-i18n), Sprachbuttons,
  // Text-Richtung (rtl/ltr) und die aktive Nav-Markierung.
  function applyStatic(){
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-ar', state.lang === 'ar');

    document.querySelectorAll('[data-i18n]').forEach(el=>{
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('.lang-btn').forEach(btn=>{
      btn.classList.toggle('active', btn.getAttribute('data-lang') === state.lang);
    });
  }

  // Setzt die aktive Klasse in der Navigation anhand des aktuellen Pfads
  // (z.B. "/", "/rendite/", "/broker/" bei sauberen URLs ohne .html).
  function initNav(){
    let current = location.pathname;
    if(!current.endsWith('/')) current += '/';
    document.querySelectorAll('.tab-nav [data-page]').forEach(link=>{
      let target = link.getAttribute('data-page');
      if(!target.endsWith('/')) target += '/';
      link.classList.toggle('active', target === current);
    });
  }

  function setLanguage(lang){
    if(!window.I18N[lang]) return;
    state.lang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyStatic();
    // Andere Skripte (rechner.js, roi.js, broker.js) hören auf dieses Event,
    // um ihre eigenen dynamischen Inhalte (Zahlen, Charts) neu zu rendern.
    document.dispatchEvent(new CustomEvent('mwr:langchange', { detail: { lang } }));
  }

  function init(){
    applyStatic();
    initNav();
    document.querySelectorAll('.lang-btn').forEach(btn=>{
      btn.addEventListener('click', ()=> setLanguage(btn.getAttribute('data-lang')));
    });
    const yearEl = document.getElementById('copy-year');
    if(yearEl) yearEl.textContent = new Date().getFullYear();
  }

  document.addEventListener('DOMContentLoaded', init);

  return { state, t, locale, fmtEUR, fmtCompact, fmtPct, textWidth, setLanguage, applyStatic };
})();
