// Consent-Gate für die eingebetteten TARIFCHECK24/Check24-Vergleichs-Widgets
// (Girokonto, Kreditkarte, Versicherungen). Diese Widgets laden automatisch
// beim Seitenaufruf ein fremdes Skript, das eigene Cookies setzt und einen
// Tracking-Pixel nachlädt (siehe a.partner-versicherung.de/click.php). Das
// ist keine "unbedingt erforderliche" Funktion der Seite (die Seite
// funktioniert ohne das Vergleichstool weiterhin einwandfrei) und braucht
// daher nach § 25 Abs. 2 TTDSG / Art. 6 Abs. 1 lit. a DSGVO eine aktive
// Einwilligung, bevor es lädt.
//
// Mechanik: Das Partner-Skript steht im HTML als
//   <script type="text/plain" data-consent="tarifcheck24" data-src="...">
// - ein Browser führt "text/plain"-Skripte nie aus, es lädt also nichts von
// selbst. Erst wenn der Nutzer zustimmt (per Banner unten oder per Klick auf
// den Platzhalter im Tool-Bereich), ersetzen wir diese Tags durch echte
// <script src="...">-Elemente. Die Zustimmung wird in localStorage
// gespeichert und gilt seitenübergreifend für alle 6 Tool-Seiten.
(function(){
  var STORAGE_KEY = 'mwr_consent_tarifcheck24';

  function getConsent(){
    try{ return localStorage.getItem(STORAGE_KEY); }catch(e){ return null; }
  }
  function setConsent(value){
    try{ localStorage.setItem(STORAGE_KEY, value); }catch(e){}
  }

  // Ausprobiert und verworfen: den Container künstlich auf Desktop-Breite
  // zu ziehen, damit das Partner-Skript in seinen "desktop"-Modus schaltet
  // (siehe widget-fullscreen-link.js) und der Antrag ohne neuen Tab läuft.
  // Ergebnis am echten Mobile-Viewport: Check24s Desktop-Ansicht ist ein
  // mehrspaltiges, nicht responsives Layout - bei 375px überlappt sich
  // alles und ist unbedienbar. Fazit: der "desktop"-Modus ist nicht nur ein
  // anderer Antrags-Ablauf, sondern ein komplett anderes, absichtlich
  // breites Layout. Es gibt daher keinen Weg, auf einem Handy-Bildschirm
  // sowohl ein lesbares Layout als auch den funktionierenden Antrags-Ablauf
  // zu bekommen - deshalb bleibt es beim Button, der in einem eigenen Tab
  // öffnet (siehe widget-fullscreen-link.js).
  function activateGatedScripts(){
    var tags = document.querySelectorAll('script[type="text/plain"][data-consent="tarifcheck24"]');
    tags.forEach(function(tag){
      var real = document.createElement('script');
      real.src = tag.getAttribute('data-src');
      real.onload = function(){
        if(window.MWRWidgetFallback){ window.MWRWidgetFallback.rescan(); }
      };
      tag.parentNode.replaceChild(real, tag);
    });
    document.querySelectorAll('.tcpp-consent-placeholder').forEach(function(el){
      el.remove();
    });
  }

  function addPlaceholders(){
    var tags = document.querySelectorAll('script[type="text/plain"][data-consent="tarifcheck24"]');
    tags.forEach(function(tag){
      var containerId = tag.previousElementSibling && tag.previousElementSibling.id;
      var container = containerId ? document.getElementById(containerId) : null;
      if(!container) return;

      var box = document.createElement('div');
      box.className = 'tcpp-consent-placeholder';
      box.innerHTML =
        '<p class="tcpp-consent-placeholder-text" data-i18n="consentPlaceholderText"></p>' +
        '<button type="button" class="tcpp-consent-placeholder-btn" data-i18n="consentAccept"></button>';
      container.parentNode.insertBefore(box, container);
      if(window.Site && window.Site.applyStatic){ window.Site.applyStatic(); }

      box.querySelector('.tcpp-consent-placeholder-btn').addEventListener('click', function(){
        grantConsent();
      });
    });
  }

  function grantConsent(){
    setConsent('accepted');
    hideBanner();
    activateGatedScripts();
  }

  function rejectConsent(){
    setConsent('rejected');
    hideBanner();
    addPlaceholders();
  }

  var banner = null;

  function hideBanner(){
    if(banner){ banner.remove(); banner = null; }
    document.body.classList.remove('has-cookie-banner');
  }

  function showBanner(){
    if(banner) return;
    banner = document.createElement('div');
    banner.className = 'cookie-consent-banner';
    banner.innerHTML =
      '<div class="cookie-consent-banner-inner">' +
        '<div class="cookie-consent-text">' +
          '<strong class="cookie-consent-title" data-i18n="consentBannerTitle"></strong>' +
          '<span class="cookie-consent-desc" data-i18n="consentBannerDesc"></span>' +
          '<a class="cookie-consent-link" href="/datenschutz/" data-i18n="consentBannerLink"></a>' +
        '</div>' +
        '<div class="cookie-consent-actions">' +
          '<button type="button" class="cookie-consent-btn cookie-consent-reject" data-i18n="consentReject"></button>' +
          '<button type="button" class="cookie-consent-btn cookie-consent-accept" data-i18n="consentAccept"></button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(banner);
    document.body.classList.add('has-cookie-banner');
    if(window.Site && window.Site.applyStatic){ window.Site.applyStatic(); }

    banner.querySelector('.cookie-consent-accept').addEventListener('click', grantConsent);
    banner.querySelector('.cookie-consent-reject').addEventListener('click', rejectConsent);
  }

  function openSettings(){
    document.querySelectorAll('.tcpp-consent-placeholder').forEach(function(el){ el.remove(); });
    showBanner();
  }
  window.MWRCookieConsent = { openSettings: openSettings };

  function init(){
    if(!document.querySelector('script[type="text/plain"][data-consent="tarifcheck24"]')) return;

    var consent = getConsent();
    if(consent === 'accepted'){
      activateGatedScripts();
    } else if(consent === 'rejected'){
      addPlaceholders();
    } else {
      showBanner();
    }

    var settingsLink = document.querySelector('.footer-cookie-settings-link');
    if(settingsLink){
      settingsLink.addEventListener('click', openSettings);
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
