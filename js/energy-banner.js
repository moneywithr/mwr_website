// Consent-Gate für das remind.me-Partnerbanner (Strom & Gas). Das Bild wird von
// content.remind.me geladen, dabei wird die IP-Adresse an einen Dritten übertragen.
// Deshalb liegt der unveränderte Werbemittel-Code in einem <template> (lädt nichts) und wird
// erst nach Zustimmung zu "Externe Dienste" (zentrales Banner in consent.js) eingesetzt.
// Ohne Zustimmung zeigt die Seite einen Platzhalter mit Annehmen-Knopf.
(function(){
  var slot = document.getElementById('energy-banner-slot');
  var tpl = document.getElementById('energy-banner-tpl');
  if(!slot || !tpl || !window.MWRConsent) return;

  function show(){
    if(slot.querySelector('a')) return;
    slot.innerHTML = '';
    slot.appendChild(tpl.content.cloneNode(true));
    // Arabische Einleitung vor dem Textlink (eigener Seitentext, der Werbemittel-Code bleibt unverändert)
    var link = slot.querySelectorAll('a')[1];
    if(link){
      var cap = document.createElement('p');
      cap.className = 'energy-cta-caption';
      cap.setAttribute('data-i18n', 'energyCtaCaption');
      slot.insertBefore(cap, link);
      if(window.Site && window.Site.applyStatic) window.Site.applyStatic();
    }
    window.MWRConsent.markLoaded('services');
  }

  function placeholder(){
    if(slot.querySelector('.tcpp-consent-placeholder')) return;
    slot.innerHTML =
      '<div class="tcpp-consent-placeholder">' +
        '<p class="tcpp-consent-placeholder-text" data-i18n="energyConsentText"></p>' +
        '<button type="button" class="tcpp-consent-placeholder-btn" data-i18n="energyConsentBtn"></button>' +
      '</div>';
    if(window.Site && window.Site.applyStatic) window.Site.applyStatic();
    slot.querySelector('button').addEventListener('click', function(){
      window.__mwrTarifOnly = true; // nur das Banner nachladen, keine Seite neu laden
      window.MWRConsent.save({ services:true, analytics:window.MWRConsent.has('analytics') });
    });
  }

  function sync(){
    if(window.MWRConsent.has('services')) show(); else placeholder();
  }

  function init(){ sync(); window.MWRConsent.onChange(sync); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
