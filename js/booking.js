// Cal.com-Terminbuchung (Buttons mit data-cal-link). Der Cal-Embed lädt erst nach Zustimmung zu
// "Externe Dienste". Ohne Zustimmung öffnet der Button die Buchungsseite direkt in einem neuen Tab.
(function(){
  var started = false;
  function loadCal(){
    if(started) return; started = true;
    if(window.MWRConsent) window.MWRConsent.markLoaded('services');
    (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if(typeof namespace === "string"){cal.ns[namespace] = cal.ns[namespace] || api;p(cal.ns[namespace], ar);p(cal, ["initNamespace", namespace]);} else p(cal, ar); return;} p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
    Cal("init", "15min", {origin:"https://app.cal.com"});
    Cal.config = Cal.config || {};
    Cal.config.forwardQueryParams = true;
    Cal.ns["15min"]("ui", {"cssVarsPerTheme":{"light":{"cal-brand":"#DAFF00"},"dark":{"cal-brand":"#DAFF00"}},"hideEventTypeDetails":false,"layout":"month_view"});
  }
  function sync(){ if(window.MWRConsent && window.MWRConsent.has('services')) loadCal(); }
  sync();
  if(window.MWRConsent) window.MWRConsent.onChange(sync);
  // Ohne Zustimmung: direkt zur Buchungsseite (neuer Tab), kein Fremdskript auf dieser Seite.
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('[data-cal-link]');
    if(!b) return;
    if(window.MWRConsent && window.MWRConsent.has('services')) return;
    e.preventDefault(); e.stopPropagation();
    window.open('https://cal.com/' + b.getAttribute('data-cal-link'), '_blank', 'noopener');
  }, true);
})();
