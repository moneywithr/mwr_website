// Fallback für die TARIFCHECK24/CHECK24-Vergleichs-Widgets (Girokonto,
// Kreditkarte, Versicherungen): Mobile Browser (Safari, zunehmend auch
// Chrome) blockieren Drittanbieter-Cookies standardmäßig. Das Widget läuft
// dann zwar an, verliert aber seine Session, sobald man eine Bank/einen
// Tarif auswählt - Symptom: "Vergleich neu starten" statt Antrag. Öffnet
// man exakt dieselbe URL (die das Partner-Skript bereits mit den korrekten
// Tracking-Parametern in die iframe.src geschrieben hat) als eigenen Tab
// statt eingebettet, laufen die Cookies dort first-party und das Problem
// verschwindet. Wir lesen daher nur iframe.src aus - keine eigene
// URL-Konstruktion, damit die Provisions-Zuordnung unangetastet bleibt.
(function(){
  function addLink(container){
    var iframe = container.querySelector('iframe');
    if(!iframe || !iframe.src) return false;

    var link = document.createElement('a');
    link.className = 'find-bank-fullscreen-link';
    link.href = iframe.src;
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('data-i18n', 'widgetFullscreenLink');
    link.textContent = (window.Site && window.Site.t) ? window.Site.t('widgetFullscreenLink') : 'Vergleich in eigenem Tab öffnen ↗';

    container.parentNode.insertBefore(link, container);
    container.dataset.mwrFallbackAdded = '1';
    return true;
  }

  function init(){
    var containers = document.querySelectorAll('[id^="tcpp-iframe-"]');
    if(!containers.length) return;

    var pending = Array.prototype.filter.call(containers, function(c){
      return !c.dataset.mwrFallbackAdded;
    });
    if(!pending.length) return;

    var attempts = 0;
    var timer = setInterval(function(){
      attempts++;
      pending = pending.filter(function(c){ return !addLink(c); });
      if(!pending.length || attempts > 40){ clearInterval(timer); }
    }, 250);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
