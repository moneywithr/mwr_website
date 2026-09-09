// Die TARIFCHECK24/CHECK24-Vergleichs-Widgets (Girokonto, Kreditkarte,
// Versicherungen) laufen als iframe auf unserer Seite. Wählt man darin eine
// Bank/einen Tarif aus, versucht das Widget, die Antragsseite (z.B. ing.de)
// in einem VERSCHACHTELTEN iframe zu öffnen - Seite im Fenster im Fenster.
// Banken erlauben das per eigener Content-Security-Policy (frame-ancestors)
// grundsätzlich nur, wenn Check24 selbst der direkte, einzige Rahmen ist,
// nicht wenn eine dritte Seite (wir) nochmal drumrum sitzt. Der Browser
// blockt das dann hart - unabhängig von Cookie-Einstellungen, Handy oder
// Desktop, und unabhängig davon was wir hier programmieren. Sogar Check24
// selbst zeigt dafür intern nur "Dieser Link ist nicht verfügbar" + einen
// eigenen "im neuen Tab öffnen"-Link.
//
// Das Partner-Skript selbst unterscheidet zwischen "mobile" und "desktop"
// Ausgabe (deviceoutput=... in der iframe-URL, abhängig von der Breite
// unseres Container-Elements). Im Desktop-Modus scheint der Antrag über
// eine normale Weiterleitung zu laufen (funktioniert bereits einwandfrei,
// nicht anfassen). Im Mobile-Modus versucht das Widget, alles in einem
// verschachtelten iframe zu halten - genau das blockieren die Banken. Wir
// greifen daher NUR im Mobile-Fall ein: den Vergleich dann von Anfang an
// NICHT einbetten, sondern direkt als eigene Seite öffnen (keine
// Verschachtelung mehr -> die Bank-Policy blockt nichts). Wir lassen das
// Partner-Skript den iframe wie gewohnt bauen (unsichtbar), lesen nur seine
// bereits fertige URL aus (inkl. aller Tracking-/Provisions-Parameter) und
// zeigen stattdessen einen Button, der genau diese URL in einem neuen Tab
// öffnet.
(function(){
  function swapIn(container){
    var iframe = container.querySelector('iframe');
    if(!iframe || !iframe.src) return false;

    if(!/[?&]deviceoutput=mobile\b/.test(iframe.src)){
      container.dataset.mwrFallbackAdded = '1';
      return true;
    }

    container.classList.add('tcpp-widget-hidden');

    var link = document.createElement('a');
    link.className = 'find-bank-fullscreen-link';
    link.href = iframe.src;
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('data-i18n', 'widgetFullscreenLink');
    link.textContent = (window.Site && window.Site.t) ? window.Site.t('widgetFullscreenLink') : 'Vergleich jetzt starten ↗';

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
      pending = pending.filter(function(c){ return !swapIn(c); });
      if(!pending.length || attempts > 40){ clearInterval(timer); }
    }, 250);
  }

  // cookie-consent.js lädt das Partner-Skript ggf. erst, nachdem der
  // Nutzer zustimmt (also unter Umständen erst Sekunden nach dem
  // Seitenaufruf) - ruft danach diese Funktion erneut auf, damit wir den
  // dann neu entstandenen iframe trotzdem erwischen.
  window.MWRWidgetFallback = { rescan: init };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
