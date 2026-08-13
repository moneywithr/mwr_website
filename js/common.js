// Gemeinsame Logik für alle Seiten: Sprache, Formatierung, Navigation.
// Wird auf JEDER Seite VOR dem seiten-spezifischen Skript eingebunden
// (nach i18n.js und broker-data.js).
window.Site = (function(){
  const LANG_KEY = 'mwr_lang';
  const CURRENCY_KEY = 'mwr_currency';

  // Anzeigewährungen: reine Anzeige-Umschaltung, KEINE Umrechnung des
  // zugrunde liegenden Betrags — 100.000 bleiben 100.000, nur das
  // Währungssymbol/-format wechselt (siehe fmtEUR/fmtCompact unten).
  const CURRENCIES = ['EUR', 'USD', 'AED'];
  const CURRENCY_FLAG = { EUR: 'flag-eur', USD: 'flag-usd', AED: 'flag-aed' };
  const CURRENCY_NAME_KEY = { EUR: 'currencyEUR', USD: 'currencyUSD', AED: 'currencyAED' };

  const state = {
    lang: localStorage.getItem(LANG_KEY) || 'ar',
    currency: CURRENCIES.includes(localStorage.getItem(CURRENCY_KEY)) ? localStorage.getItem(CURRENCY_KEY) : 'EUR',
  };

  function t(key){ return window.I18N[state.lang][key]; }
  function locale(){ return window.I18N[state.lang].locale; }

  function fmtEUR(v){
    // Name historisch gewachsen (früher gab's nur Euro) — formatiert
    // inzwischen in der aktuell gewählten Anzeigewährung (state.currency).
    return v.toLocaleString(locale(),{style:'currency',currency:state.currency,maximumFractionDigits:0});
  }
  function fmtCompact(v){
    return new Intl.NumberFormat(locale(),{style:'currency',currency:state.currency,notation:'compact',maximumFractionDigits:1}).format(v);
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
    document.querySelectorAll('[data-i18n-tip]').forEach(el=>{
      el.setAttribute('data-tip', t(el.getAttribute('data-i18n-tip')));
    });
    const titleKey = document.body.getAttribute('data-i18n-title');
    if(titleKey) document.title = t(titleKey);
    document.querySelectorAll('.lang-btn').forEach(btn=>{
      btn.classList.toggle('active', btn.getAttribute('data-lang') === state.lang);
    });
    updateCurrencyUI();
  }

  // Setzt die aktive Klasse in der Navigation anhand des aktuellen Pfads
  // (z.B. "/", "/calculator/investment/", "/stuff_i_use/brokerage_finder/" bei sauberen URLs ohne .html).
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

  // Aktualisiert alle Currency-Switch-Instanzen (Desktop- und Mobil-Variante)
  // auf der Seite: aktive Flagge/Code im Button, aktive Markierung + Name im Menü.
  function updateCurrencyUI(){
    document.querySelectorAll('.currency-switch').forEach(el=>{
      const codeEl = el.querySelector('.currency-switch-btn .cs-code');
      const flagUse = el.querySelector('.currency-switch-btn .currency-flag-icon use');
      if(codeEl) codeEl.textContent = state.currency;
      if(flagUse) flagUse.setAttribute('href', '#' + CURRENCY_FLAG[state.currency]);
      el.querySelectorAll('[data-currency]').forEach(opt=>{
        const code = opt.getAttribute('data-currency');
        const isActive = code === state.currency;
        opt.classList.toggle('active', isActive);
        opt.setAttribute('aria-selected', isActive ? 'true' : 'false');
        const nameEl = opt.querySelector('.cs-name');
        if(nameEl) nameEl.textContent = t(CURRENCY_NAME_KEY[code]);
      });
    });
  }

  function setCurrency(code){
    if(!CURRENCIES.includes(code)) return;
    state.currency = code;
    localStorage.setItem(CURRENCY_KEY, code);
    updateCurrencyUI();
    // Rechner-Skripte hören auf dieses Event, um Beträge in der neuen
    // Anzeigewährung neu zu rendern (keine Umrechnung, nur Neuformatierung).
    document.dispatchEvent(new CustomEvent('mwr:currencychange', { detail: { currency: code } }));
  }

  // Bindet Klick-Interaktionen für jede .currency-switch-Instanz (Button öffnet/
  // schließt das Menü, Optionsklick setzt die Währung). Mehrere Instanzen pro
  // Seite (Desktop-/Mobil-Variante) bleiben über updateCurrencyUI() synchron.
  function initCurrencySwitches(){
    document.querySelectorAll('.currency-switch').forEach(el=>{
      if(el._csInit) return;
      el._csInit = true;
      const btn = el.querySelector('.currency-switch-btn');
      const menu = el.querySelector('.currency-switch-menu');
      if(!btn || !menu) return;

      btn.addEventListener('click', e=>{
        e.stopPropagation();
        const willOpen = !el.classList.contains('open');
        document.querySelectorAll('.currency-switch.open').forEach(o=>{
          o.classList.remove('open');
          o.querySelector('.currency-switch-btn').setAttribute('aria-expanded','false');
        });
        if(willOpen){
          el.classList.add('open');
          btn.setAttribute('aria-expanded','true');
        }
      });

      menu.querySelectorAll('[data-currency]').forEach(opt=>{
        opt.addEventListener('click', ()=>{
          setCurrency(opt.getAttribute('data-currency'));
          el.classList.remove('open');
          btn.setAttribute('aria-expanded','false');
        });
      });
    });

    document.addEventListener('click', ()=>{
      document.querySelectorAll('.currency-switch.open').forEach(o=>{
        o.classList.remove('open');
        o.querySelector('.currency-switch-btn').setAttribute('aria-expanded','false');
      });
    });
    document.addEventListener('keydown', e=>{
      if(e.key === 'Escape'){
        document.querySelectorAll('.currency-switch.open').forEach(o=> o.classList.remove('open'));
      }
    });
  }

  function init(){
    applyStatic();
    initNav();
    initCurrencySwitches();
    document.querySelectorAll('.lang-btn').forEach(btn=>{
      btn.addEventListener('click', ()=> setLanguage(btn.getAttribute('data-lang')));
    });
    const yearEl = document.getElementById('copy-year');
    if(yearEl) yearEl.textContent = new Date().getFullYear();
    // Seite erst jetzt anzeigen: verhindert, dass der deutsche Platzhaltertext
    // kurz aufblitzt, bevor er durch die tatsächlich gespeicherte Sprache ersetzt wird.
    document.documentElement.style.visibility = 'visible';
  }

  document.addEventListener('DOMContentLoaded', init);

  return { state, t, locale, fmtEUR, fmtCompact, fmtPct, textWidth, setLanguage, setCurrency, applyStatic };
})();
