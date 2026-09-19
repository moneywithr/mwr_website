// Consent-Gate für die eingebetteten TARIFCHECK24/Check24-Vergleichs-Widgets
// (Girokonto, Kreditkarte, Versicherungen). Diese Widgets laden ein fremdes Skript, das eigene
// Cookies setzt und einen Tracking-Pixel nachlädt. Das ist keine "unbedingt erforderliche"
// Funktion (§ 25 Abs. 2 TTDSG / Art. 6 Abs. 1 lit. a DSGVO), deshalb laden sie erst nach der
// Zustimmung zu "Externe Dienste" (zentrales Banner in consent.js).
//
// Das Partner-Skript steht im HTML als
//   <script type="text/plain" data-consent="tarifcheck24" data-src="...">
// und wird hier bei Zustimmung durch ein echtes <script src="..."> ersetzt. Ohne Zustimmung zeigt
// jedes Widget einen Platzhalter mit Annehmen-Knopf.
// (Ein Versuch, den Container künstlich auf Desktop-Breite zu ziehen, damit Check24 in den
// "desktop"-Modus schaltet, wurde verworfen: auf dem Handy ist das ein nicht responsives
// Mehrspalten-Layout, siehe widget-fullscreen-link.js.)
(function(){
  var SEL = 'script[type="text/plain"][data-consent="tarifcheck24"]';

  function activate(){
    var tags = document.querySelectorAll(SEL);
    tags.forEach(function(tag){
      var real = document.createElement('script');
      real.src = tag.getAttribute('data-src');
      real.onload = function(){ if(window.MWRWidgetFallback){ window.MWRWidgetFallback.rescan(); } };
      tag.parentNode.replaceChild(real, tag);
    });
    if(tags.length && window.MWRConsent) window.MWRConsent.markLoaded('services');
    document.querySelectorAll('.tcpp-consent-placeholder').forEach(function(el){ el.remove(); });
  }

  function addPlaceholders(){
    document.querySelectorAll(SEL).forEach(function(tag){
      var containerId = tag.previousElementSibling && tag.previousElementSibling.id;
      var container = containerId ? document.getElementById(containerId) : null;
      if(!container || container.previousElementSibling && container.previousElementSibling.classList.contains('tcpp-consent-placeholder')) return;
      var box = document.createElement('div');
      box.className = 'tcpp-consent-placeholder';
      box.innerHTML =
        '<p class="tcpp-consent-placeholder-text" data-i18n="consentPlaceholderText"></p>' +
        '<button type="button" class="tcpp-consent-placeholder-btn" data-i18n="consentAccept"></button>';
      container.parentNode.insertBefore(box, container);
      if(window.Site && window.Site.applyStatic){ window.Site.applyStatic(); }
      box.querySelector('.tcpp-consent-placeholder-btn').addEventListener('click', function(){
        window.__mwrTarifOnly = true; // nur diese Widgets nachladen, keine Seite neu laden
        window.MWRConsent.save({ services:true, analytics:window.MWRConsent.has('analytics') });
      });
    });
  }

  function sync(){
    if(!document.querySelector(SEL)) return;
    if(window.MWRConsent && window.MWRConsent.has('services')) activate();
    else addPlaceholders();
  }

  function init(){
    if(!document.querySelector(SEL) || !window.MWRConsent) return;
    sync();
    window.MWRConsent.onChange(sync);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
