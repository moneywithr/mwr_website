// Gemeinsame Logik für alle Seiten: Sprache, Formatierung, Navigation.
// Wird auf JEDER Seite VOR dem seiten-spezifischen Skript eingebunden
// (nach i18n.js und broker-data.js).
window.Site = (function(){
  const LANG_KEY = 'mwr_lang';
  const CURRENCY_KEY = 'mwr_currency';

  // Anzeigewährungen: reine Anzeige-Umschaltung, KEINE Umrechnung des
  // zugrunde liegenden Betrags, 100.000 bleiben 100.000, nur das
  // Währungssymbol/-format wechselt (siehe fmtEUR/fmtCompact unten).
  const CURRENCIES = ['EUR', 'USD', 'AED'];
  const CURRENCY_FLAG = { EUR: 'flag-eur', USD: 'flag-usd', AED: 'flag-aed' };
  const CURRENCY_NAME_KEY = { EUR: 'currencyEUR', USD: 'currencyUSD', AED: 'currencyAED' };

  // Erstbesucher (kein gespeicherter Wert) bekommen immer Arabisch, die
  // Hauptzielgruppe, unabhängig von der Gerätesprache. Sobald jemand die Sprache
  // per Umschalter wählt, wird das in localStorage gemerkt und bleibt bestehen.
  function detectLang(){
    const stored = localStorage.getItem(LANG_KEY);
    if(stored && window.I18N && window.I18N[stored]) return stored;
    return 'ar';
  }

  const state = {
    lang: detectLang(),
    currency: CURRENCIES.includes(localStorage.getItem(CURRENCY_KEY)) ? localStorage.getItem(CURRENCY_KEY) : 'EUR',
  };

  function t(key){ return window.I18N[state.lang][key]; }
  function locale(){ return window.I18N[state.lang].locale; }

  // Intl gibt für USD in arabischer Locale "US$" statt "$" aus (CLDR-Disambiguierung),
  // das liest sich wie Symbol+Code zusammen. Für die arabische UI reicht das bloße Symbol.
  function fixArabicUsdSymbol(str){
    return state.lang === 'ar' && state.currency === 'USD' ? str.replace('US$','$') : str;
  }
  function fmtEUR(v){
    // Name historisch gewachsen (früher gab's nur Euro), formatiert
    // inzwischen in der aktuell gewählten Anzeigewährung (state.currency).
    return fixArabicUsdSymbol(v.toLocaleString(locale(),{style:'currency',currency:state.currency,maximumFractionDigits:0}));
  }
  function fmtCompact(v){
    return fixArabicUsdSymbol(new Intl.NumberFormat(locale(),{style:'currency',currency:state.currency,notation:'compact',maximumFractionDigits:1}).format(v));
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
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    // Beschriftungen, die nur Screenreader hören (Navigationsbereiche, Knöpfe
    // mit reinem Icon). Standen vorher fest auf Deutsch/Englisch im HTML und
    // blieben dadurch auch auf der arabischen Seite deutsch.
    document.querySelectorAll('[data-i18n-aria]').forEach(el=>{
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
    // Wie data-i18n, aber setzt innerHTML statt textContent - nur für
    // Stellen mit eingebautem Markup (z.B. ein Link in einem Rechtstext).
    // Immer nur mit eigenen, fest im Code stehenden Übersetzungen benutzen,
    // nie mit Nutzereingaben füttern.
    document.querySelectorAll('[data-i18n-html]').forEach(el=>{
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    const titleKey = document.body.getAttribute('data-i18n-title');
    if(titleKey) document.title = t(titleKey);
    document.querySelectorAll('.lang-btn').forEach(btn=>{
      btn.classList.toggle('active', btn.getAttribute('data-lang') === state.lang);
    });
    updateCurrencyUI();
    document.querySelectorAll('.category-switch').forEach(el=>{
      if(el._recomputeThumb) requestAnimationFrame(el._recomputeThumb);
    });
  }

  function setLanguage(lang){
    if(!window.I18N[lang] || lang === state.lang) return;
    // Kurzes Fade statt hartem Sprung, Text, Schriftart und rtl/ltr
    // wechseln sonst mitten im Blick des Nutzers ohne jeden Übergang.
    const wrap = document.querySelector('.wrap') || document.body;
    wrap.classList.add('lang-fade');
    window.setTimeout(()=>{
      state.lang = lang;
      localStorage.setItem(LANG_KEY, lang);
      applyStatic();
      // Andere Skripte (rechner.js, roi.js, broker.js) hören auf dieses Event,
      // um ihre eigenen dynamischen Inhalte (Zahlen, Charts) neu zu rendern.
      document.dispatchEvent(new CustomEvent('mwr:langchange', { detail: { lang } }));
      requestAnimationFrame(()=> wrap.classList.remove('lang-fade'));
    }, 130);
  }

  // Kategorie-Switch im Top-Banner (Start/Tools/Rechner): auf der
  // Startseite filtert ein Klick direkt die .cat-section-Blöcke darunter
  // (nur die passende bleibt sichtbar), auf allen anderen Seiten springt er
  // stattdessen zur Startseite mit dem passenden Hash. Die gleitende Pille
  // dahinter nutzt dasselbe Prinzip wie .lang-switch, per transform statt
  // Layout-Wechsel positioniert, damit sie animiert statt springt.
  const CATEGORY_COLORS = { start: '#DAFF00', tools: '#E4633C', calculators: '#685CC8' };
  const CATEGORY_KEYS = Object.keys(CATEGORY_COLORS);

  // Start-Tab ("Investieren starten", Coaching-Hero) ausgeblendet. Zum Einblenden auf false setzen.
  const HIDE_START_TAB = true;

  function initCategorySwitch(){
    const sw = document.querySelector('.category-switch');
    if(!sw) return;
    const thumb = sw.querySelector('.category-switch-thumb');
    if(HIDE_START_TAB){
      const startBtn = sw.querySelector('.category-switch-btn[data-category="start"]');
      if(startBtn) startBtn.remove();
    }
    const buttons = Array.from(sw.querySelectorAll('.category-switch-btn'));
    if(!thumb || !buttons.length) return;

    let path = location.pathname;
    if(!path.endsWith('/')) path += '/';
    const isHome = path === '/' || /\/index\.html\/?$/.test(location.pathname);

    // Beschriftungs-Kopie in der Pille (siehe .category-switch-mask in style.css).
    // data-i18n bleibt an den Kopien, dadurch aktualisiert applyStatic() sie mit.
    const mask = document.createElement('span');
    mask.className = 'category-switch-mask';
    mask.setAttribute('aria-hidden', 'true');
    mask.setAttribute('inert', '');
    buttons.forEach(b=>{
      const c = b.cloneNode(true);
      c.removeAttribute('data-category');
      c.removeAttribute('aria-pressed');
      c.classList.remove('active');
      c.tabIndex = -1;
      mask.appendChild(c);
    });
    thumb.appendChild(mask);

    function moveThumb(btn){
      if(!btn) return;
      sw.classList.remove('is-scrollable');
      if(sw.scrollWidth > sw.clientWidth) sw.classList.add('is-scrollable');
      const cat = btn.getAttribute('data-category');
      thumb.style.width = btn.offsetWidth + 'px';
      thumb.style.transform = 'translateX(' + btn.offsetLeft + 'px)';
      thumb.style.backgroundColor = CATEGORY_COLORS[cat] || CATEGORY_COLORS.calculators;
      thumb.setAttribute('data-category', cat);
      // Gegenbewegung: Kopie bleibt relativ zum Container an der Stelle der echten Buttons.
      mask.style.transform = 'translateX(' + (buttons[0].offsetLeft - btn.offsetLeft) + 'px)';
      centerButton(btn);
    }

    // Wenn die Labels (v.a. Arabisch, meist länger als Deutsch/Englisch)
    // auf schmalen Screens knapp nicht mehr alle drei nebeneinander
    // reinpassen, wird .category-switch horizontal scrollbar. Ohne das hier
    // bliebe scrollLeft immer auf 0 stehen - der erste Button hätte dann
    // immer sauberen Abstand zum Rand, der letzte (rechte) Button aber
    // würde an der Kante abgeschnitten aussehen, egal welcher gerade aktiv
    // ist. Der aktive Button wird deshalb bei jeder Auswahl (und bei jedem
    // Neu-Vermessen, z.B. nach Sprachwechsel/Resize) in die Mitte des
    // sichtbaren Bereichs gescrollt, damit links/rechts wieder Luft ist.
    function centerButton(btn){
      if(sw.scrollWidth <= sw.clientWidth) return;
      const target = btn.offsetLeft + btn.offsetWidth / 2 - sw.clientWidth / 2;
      const max = sw.scrollWidth - sw.clientWidth;
      sw.scrollLeft = Math.max(0, Math.min(target, max));
    }

    function setActive(cat, updateHash){
      const btn = buttons.find(b=> b.getAttribute('data-category') === cat) || buttons[0];
      buttons.forEach(b=>{
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      moveThumb(btn);
      if(isHome){
        // Der Einblend-Effekt der Karten läuft nur nach einem Klick auf einen Tab,
        // nicht beim Laden oder Zurückkehren auf die Seite (sonst wirkt es, als wäre der Tab neu gewählt worden).
        const animate = updateHash !== false;
        document.querySelectorAll('.cat-section[data-category]').forEach(sec=>{
          const show = sec.getAttribute('data-category') === btn.getAttribute('data-category');
          sec.hidden = !show;
          sec.classList.toggle('cat-anim', animate && show);
        });
        // Elemente mit data-hide-on="<kategorie>" (z.B. das Tool-Panel) sind auf
        // dem Start-Tab ausgeblendet.
        document.querySelectorAll('[data-hide-on]').forEach(el=>{
          el.hidden = el.getAttribute('data-hide-on') === btn.getAttribute('data-category');
        });
        if(updateHash !== false) history.replaceState(null, '', '#cat-' + btn.getAttribute('data-category'));
      }
    }

    buttons.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const cat = btn.getAttribute('data-category');
        if(isHome) setActive(cat);
        else location.href = '/#cat-' + cat;
      });
    });

    // Alte Links auf #cat-comparisons landen im zusammengelegten Rechner-Tab.
    const hashCat = (location.hash || '').replace('#cat-', '').replace('comparisons', 'calculators');
    let initialCat;
    if(isHome){
      const homeCat = HIDE_START_TAB ? 'tools' : 'start';
      initialCat = buttons.some(b=> b.getAttribute('data-category') === hashCat) ? hashCat : homeCat;
    } else {
      // Auf Unterseiten steht die eigentliche Kategorie in der Breadcrumb
      // (z.B. "Tools, die ich nutze"), nicht in der URL. Von dort ableiten,
      // statt hart auf den ersten Button ("Rechner") zu fallen.
      const crumbKey = document.querySelector('.breadcrumb [data-i18n^="landingCat"]');
      const crumbCat = crumbKey && buttons.find(b=> b.getAttribute('data-i18n') === crumbKey.getAttribute('data-i18n'));
      initialCat = crumbCat ? crumbCat.getAttribute('data-category') : CATEGORY_KEYS[0];
    }
    // Erste Platzierung der Pille ohne Gleit-Animation (auch nach dem Laden der Schriften),
    // damit beim Öffnen/Zurückkehren nichts "neu angewählt" aussieht.
    sw.classList.add('no-anim');
    requestAnimationFrame(()=> setActive(initialCat, false));
    const settle = ()=>{
      const a = buttons.find(b=> b.classList.contains('active'));
      if(a) moveThumb(a);
      requestAnimationFrame(()=> requestAnimationFrame(()=> sw.classList.remove('no-anim')));
    };
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=> requestAnimationFrame(settle));
    else setTimeout(settle, 400);

    let resizeTimer;
    window.addEventListener('resize', ()=>{
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(()=>{
        const active = buttons.find(b=> b.classList.contains('active'));
        moveThumb(active);
      }, 120);
    });

    // Sprachwechsel ändert die Textbreite der Buttons (z.B. Arabisch länger
    // als Deutsch/Englisch) - Pille muss danach neu vermessen werden.
    sw._recomputeThumb = ()=>{
      const active = buttons.find(b=> b.classList.contains('active'));
      moveThumb(active);
    };
  }

  // Aktualisiert alle Currency-Switch-Instanzen (Desktop- und Mobil-Variante)
  // auf der Seite: aktive Flagge/Code im Button, aktive Markierung + Name im Menü.
  function updateCurrencyUI(){
    document.querySelectorAll('.currency-switch').forEach(el=>{
      const codeEl = el.querySelector('.currency-switch-btn .cs-code');
      const flagUse = el.querySelector('.currency-switch-btn .currency-flag-icon use');
      if(codeEl) codeEl.textContent = state.lang === 'ar' ? t(CURRENCY_NAME_KEY[state.currency]) : state.currency;
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

  // Bindet Klick-Interaktionen für jede .custom-select-Instanz (Ersatz für
  // native <select>-Elemente, siehe css .custom-select). Nutzt Event-
  // Delegation auf .custom-select-menu statt Listener pro <li>, dadurch
  // funktioniert es auch, wenn eine Seite (z.B. broker.js) die Optionsliste
  // per innerHTML neu aufbaut, ohne initCustomSelects() erneut aufzurufen.
  // Die eigentliche Auswahl-Logik bleibt beim jeweiligen Seiten-Skript: hier
  // wird nur geöffnet/geschlossen und ein "customselect:change"-Event mit
  // dem gewählten Wert ausgelöst.
  function initCustomSelects(){
    document.querySelectorAll('.custom-select').forEach(el=>{
      if(el._csInit) return;
      el._csInit = true;
      const btn = el.querySelector('.custom-select-btn');
      const menu = el.querySelector('.custom-select-menu');
      if(!btn || !menu) return;

      btn.addEventListener('click', e=>{
        e.stopPropagation();
        const willOpen = !el.classList.contains('open');
        document.querySelectorAll('.custom-select.open').forEach(o=>{
          o.classList.remove('open');
          o.querySelector('.custom-select-btn').setAttribute('aria-expanded','false');
        });
        if(willOpen){
          el.classList.add('open');
          btn.setAttribute('aria-expanded','true');
        }
      });

      menu.addEventListener('click', e=>{
        const opt = e.target.closest('[data-value]');
        if(!opt) return;
        el.classList.remove('open');
        btn.setAttribute('aria-expanded','false');
        el.dispatchEvent(new CustomEvent('customselect:change', { detail: { value: opt.getAttribute('data-value') }, bubbles: true }));
      });
    });

    document.addEventListener('click', ()=>{
      document.querySelectorAll('.custom-select.open').forEach(o=>{
        o.classList.remove('open');
        o.querySelector('.custom-select-btn').setAttribute('aria-expanded','false');
      });
    });
    document.addEventListener('keydown', e=>{
      if(e.key === 'Escape'){
        document.querySelectorAll('.custom-select.open').forEach(o=> o.classList.remove('open'));
      }
    });
  }

  function init(){
    applyStatic();
    initCurrencySwitches();
    initCustomSelects();
    initCategorySwitch();
    document.querySelectorAll('.lang-btn').forEach(btn=>{
      btn.addEventListener('click', ()=> setLanguage(btn.getAttribute('data-lang')));
    });
    const yearEl = document.getElementById('copy-year');
    if(yearEl) yearEl.textContent = new Date().getFullYear();
    // Seite erst jetzt anzeigen: verhindert, dass der deutsche Platzhaltertext
    // kurz aufblitzt, bevor er durch die tatsächlich gespeicherte Sprache ersetzt wird.
    // Erst zeigen, wenn die (vorgeladene) arabische Schrift bereit ist, damit
    // kein Wechsel von Ersatzschrift zu IBM Plex Sans Arabic sichtbar wird.
    // Das 1,5-s-Limit im <head> greift weiterhin als Sicherheitsnetz.
    const reveal = ()=>{ document.documentElement.style.visibility = 'visible'; };
    if(state.lang === 'ar' && document.fonts && document.fonts.load){
      const need = [
        document.fonts.load("400 1em 'IBM Plex Sans Arabic'"),
        document.fonts.load("700 1em 'IBM Plex Sans Arabic'")
      ];
      // Seiten mit coaching.css (Startseite, Coaching) setzen Tajawal + Ziffern ein.
      if(document.querySelector('link[href*="coaching.css"]')){
        need.push(
          document.fonts.load("400 1em 'Tajawal'"),
          document.fonts.load("700 1em 'Tajawal'"),
          document.fonts.load("400 1em 'MWR Digits'", '0123456789')
        );
      }
      Promise.all(need).then(reveal, reveal);
    } else reveal();
    // Der Browser versucht direkt beim Laden zu einem #hash-Ziel zu scrollen,
    // sieht dabei aber noch visibility:hidden auf <html> und überspringt den
    // Sprung stillschweigend - und holt ihn später beim Sichtbarwerden nicht
    // nach. Deshalb hier von Hand nachholen, sobald die Seite sichtbar ist.
    // behavior:'instant' statt der globalen scroll-behavior:smooth aus
    // style.css: bei "smooth" verschiebt sich das Ziel während der Animation
    // noch durch nachladende Webfonts (Layout-Reflow), wodurch der Sprung
    // bis ganz ans Seitenende weiterlaufen kann statt am Ziel zu stoppen.
    // document.fonts.ready sorgt zusätzlich dafür, dass die Fonts (und damit
    // die finalen Zeilenumbrüche/Höhen) schon feststehen, bevor gesprungen wird.
    if(location.hash){
      const target = document.querySelector(location.hash);
      if(target){
        const jump = ()=> target.scrollIntoView({ block: 'start', behavior: 'instant' });
        if(document.fonts && document.fonts.ready) document.fonts.ready.then(jump).catch(jump);
        else requestAnimationFrame(jump);
      }
    }
  }

  // Zahlenfelder: statt type="number" (Komma/Punkt-Verhalten hängt am Browser
  // und Gerät, oft lässt sich kein Komma tippen) echte Textfelder mit
  // Ziffern-Tastatur. Erlaubt sind Ziffern und EIN Dezimaltrenner; Komma und
  // Punkt werden beide akzeptiert und sofort in den Trenner der Seitensprache
  // umgewandelt (de ",", en/ar "."), egal welchen die Gerätetastatur anbietet.
  // .value liefert nach außen weiter "1234.5", so laufen die Rechner unverändert.
  function decSep(){
    try{
      return new Intl.NumberFormat(locale()).formatToParts(1.1).find(p=>p.type === 'decimal').value;
    }catch(e){ return '.'; }
  }
  function initNumberInputs(){
    const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
    const inputs = Array.from(document.querySelectorAll('input[type=number]'));
    inputs.forEach(el=>{
      const integer = el.getAttribute('inputmode') === 'numeric';
      const initial = el.value;
      const raw = ()=> nativeValue.get.call(el);
      const read = ()=>{
        const parts = raw().split(/[.,٫،]/);
        const r = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : parts[0];
        return r === '.' ? '' : r;
      };
      const fmt = v => String(v).replace('.', decSep());
      const clean = str=>{
        let out = '', seen = false;
        const sep = decSep();
        for(const ch of String(str).replace(/[٠-٩]/g, d=> AR_DIGITS.indexOf(d))){
          if(ch >= '0' && ch <= '9') out += ch;
          else if(!integer && !seen && /[.,٫،]/.test(ch)){ out += sep; seen = true; }
        }
        return out;
      };
      el.type = 'text';
      el.setAttribute('data-num', '');
      el.setAttribute('dir', 'ltr'); // sonst verschwindet ein Trenner am Ende in RTL-Seiten (Arabisch)
      el.setAttribute('autocomplete', 'off');
      Object.defineProperty(el, 'value', {
        configurable: true,
        get: read,
        set(v){
          const n = String(v == null ? '' : v);
          // Beim Tippen ("7," oder "7,0") nicht zurückschreiben, sonst
          // verschwindet der gerade getippte Trenner.
          if(n !== '' && read() !== '' && Number(read()) === Number(n)) return;
          nativeValue.set.call(el, fmt(n));
        }
      });
      nativeValue.set.call(el, fmt(initial));
      el.addEventListener('input', ()=>{
        const c = clean(raw());
        if(c !== raw()) nativeValue.set.call(el, c);
      }, true);
      el._numRedisplay = ()=>{ nativeValue.set.call(el, fmt(read())); };
    });
    document.addEventListener('mwr:langchange', ()=>{
      inputs.forEach(el=> el._numRedisplay && el._numRedisplay());
    });
  }
  initNumberInputs();

  document.addEventListener('DOMContentLoaded', init);

  return { state, t, locale, fmtEUR, fmtCompact, fmtPct, textWidth, setLanguage, setCurrency, applyStatic };
})();
