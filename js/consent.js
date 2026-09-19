// Zentrale Cookie-/Dienste-Einwilligung für die ganze Website.
// Beim ersten Besuch erscheint ein Banner (Nur notwendige / Anpassen / Alle akzeptieren).
// Kategorien:
//   - notwendig: Sprache, Währung, gespeicherte Rechner-Ergebnisse (immer an, keine Einwilligung nötig)
//   - services:  externe Dienste (Cal.com Terminbuchung, Google reCAPTCHA + Brevo Newsletter, TARIFCHECK24-Widgets)
//   - analytics: optionale Analyse. Erscheint nur, wenn unten ANALYTICS_SRC gesetzt ist.
// Externe Skripte stehen im HTML als <script type="text/plain" data-consent="services" data-src="...">
// und werden erst nach Zustimmung geladen. Die Entscheidung liegt in localStorage ("mwr_consent").
(function(){
  var KEY = 'mwr_consent';
  var ANALYTICS_SRC = ''; // z.B. 'https://plausible.io/js/script.js'. Leer = keine Analyse, Kategorie bleibt ausgeblendet.
  var state = null;
  var listeners = [];
  var loaded = { services:false, analytics:false };
  var banner = null;

  function read(){
    try{
      var v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if(v && v.v === 2) return v;
    }catch(e){}
    return null;
  }
  function write(v){ try{ localStorage.setItem(KEY, JSON.stringify(v)); }catch(e){} }
  function has(cat){ return !!(state && state[cat] === true); }
  function t(k){ return (window.Site && window.Site.t) ? window.Site.t(k) : k; }
  function translate(){ if(window.Site && window.Site.applyStatic) window.Site.applyStatic(); }

  // ---- Externe Skripte erst nach Zustimmung laden (in der Reihenfolge im HTML)
  function activateServices(){
    var tags = document.querySelectorAll('script[type="text/plain"][data-consent="services"]');
    tags.forEach(function(tag){
      var s = document.createElement('script');
      s.src = tag.getAttribute('data-src');
      s.async = false;
      tag.parentNode.replaceChild(s, tag);
    });
    if(tags.length) loaded.services = true;
  }
  function activateAnalytics(){
    if(!ANALYTICS_SRC || loaded.analytics) return;
    var s = document.createElement('script');
    s.src = ANALYTICS_SRC; s.defer = true;
    document.head.appendChild(s);
    loaded.analytics = true;
  }
  function apply(){
    if(has('services')) activateServices();
    if(has('analytics')) activateAnalytics();
  }

  function save(partial){
    var prev = state || { services:false, analytics:false };
    state = { v:2, services:!!partial.services, analytics:!!partial.analytics && !!ANALYTICS_SRC, ts:Date.now() };
    write(state);
    closeBanner();
    var changed = prev.services !== state.services || prev.analytics !== state.analytics;
    // Schon geladene Fremdskripte lassen sich nicht sauber entladen, und manche (Brevo/reCAPTCHA)
    // müssen beim Laden der Seite starten: dann die Seite einmal neu laden.
    var pageHasGated = document.querySelector('script[type="text/plain"][data-consent="services"]');
    if(changed && ((prev.services && !state.services && loaded.services) || (!prev.services && state.services && pageHasGated && !window.__mwrTarifOnly) || (prev.analytics && !state.analytics && loaded.analytics))){
      location.reload();
      return;
    }
    apply();
    listeners.forEach(function(fn){ try{ fn(state); }catch(e){} });
  }

  // ---- Banner
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.5A9 9 0 1 1 11.5 3a3.5 3.5 0 0 0 4 4.5 3 3 0 0 0 5.5 5z"></path><circle cx="8.5" cy="11" r=".9" fill="currentColor"></circle><circle cx="12.5" cy="15.5" r=".9" fill="currentColor"></circle><circle cx="15.5" cy="10.5" r=".9" fill="currentColor"></circle><circle cx="8" cy="15.5" r=".9" fill="currentColor"></circle></svg>';

  function row(id, titleKey, descKey, checked, locked){
    return '<label class="cc-row"><span class="cc-row-text"><strong data-i18n="' + titleKey + '"></strong><small data-i18n="' + descKey + '"></small></span>' +
      '<input type="checkbox" class="cc-check" id="' + id + '"' + (checked ? ' checked' : '') + (locked ? ' disabled' : '') + '></label>';
  }

  function openBanner(expand){
    if(banner){ if(expand) toggleCustomize(true); return; }
    banner = document.createElement('div');
    banner.className = 'cc-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-labelledby', 'cc-title');
    banner.innerHTML =
      '<div class="cc-card">' +
        '<span class="cc-icon">' + ICON + '</span>' +
        '<h2 class="cc-title" id="cc-title" tabindex="-1" data-i18n="cookieTitle"></h2>' +
        '<p class="cc-text"><span data-i18n="cookieText"></span> <a href="/datenschutz/" data-i18n="cookiePolicy"></a></p>' +
        '<div class="cc-panel" hidden>' +
          row('cc-necessary', 'cookieCatNecessary', 'cookieCatNecessaryDesc', true, true) +
          row('cc-services', 'cookieCatServices', 'cookieCatServicesDesc', has('services'), false) +
          (ANALYTICS_SRC ? row('cc-analytics', 'cookieCatAnalytics', 'cookieCatAnalyticsDesc', has('analytics'), false) : '') +
        '</div>' +
        '<div class="cc-actions">' +
          '<button type="button" class="cc-btn" data-cc="necessary"><span data-i18n="cookieNecessaryOnly"></span></button>' +
          '<button type="button" class="cc-btn" data-cc="customize"><span data-i18n="cookieCustomize"></span></button>' +
          '<button type="button" class="cc-btn primary" data-cc="all"><span data-i18n="cookieAcceptAll"></span></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);
    translate();
    banner.addEventListener('click', function(e){
      var b = e.target.closest('[data-cc]');
      if(!b) return;
      var a = b.getAttribute('data-cc');
      if(a === 'necessary') save({ services:false, analytics:false });
      else if(a === 'all') save({ services:true, analytics:true });
      else if(a === 'customize'){
        var panel = banner.querySelector('.cc-panel');
        if(panel.hidden) toggleCustomize(true);
        else {
          var an = banner.querySelector('#cc-analytics');
          save({ services: banner.querySelector('#cc-services').checked, analytics: an ? an.checked : false });
        }
      }
    });
    if(expand) toggleCustomize(true);
    if(state){ try{ banner.querySelector('.cc-title').focus({ preventScroll:true }); }catch(e){} }
  }
  function toggleCustomize(open){
    if(!banner) return;
    var panel = banner.querySelector('.cc-panel');
    panel.hidden = !open;
    var span = banner.querySelector('[data-cc="customize"] span');
    span.setAttribute('data-i18n', open ? 'cookieSave' : 'cookieCustomize');
    translate();
    banner.classList.toggle('cc-expanded', !!open);
  }
  function closeBanner(){ if(banner){ banner.remove(); banner = null; } }

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && banner && state) closeBanner();
  });

  // Link "Cookie-Einstellungen" im Footer (auf allen Seiten), öffnet das Banner mit den Optionen.
  function initFooterLink(){
    var legal = document.querySelector('.footer-legal');
    if(legal && !legal.querySelector('.footer-cookie-settings-link')){
      var p = document.createElement('p');
      p.className = 'copyright';
      p.innerHTML = '<button type="button" class="footer-cookie-settings-link" data-i18n="footerCookieSettings"></button>';
      legal.appendChild(p);
    }
    document.querySelectorAll('.footer-cookie-settings-link').forEach(function(b){
      if(b.__cc) return; b.__cc = true;
      b.addEventListener('click', function(){ openBanner(true); });
    });
  }

  // Formulare, die einen externen Dienst brauchen (z.B. Newsletter mit reCAPTCHA/Brevo), ohne Zustimmung nicht absenden.
  document.addEventListener('submit', function(e){
    var f = e.target;
    if(f && f.getAttribute && f.getAttribute('data-needs-consent') === 'services' && !has('services')){
      e.preventDefault(); e.stopPropagation();
      openBanner(true);
    }
  }, true);

  window.MWRConsent = {
    has: has,
    open: function(){ openBanner(true); },
    save: save,
    onChange: function(fn){ listeners.push(fn); },
    markLoaded: function(cat){ loaded[cat] = true; if(cat === 'services') window.__mwrTarifOnly = false; }
  };

  function init(){
    state = read();
    apply();
    initFooterLink();
    translate();
    if(!state) openBanner(false);
  }
  state = read();
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
