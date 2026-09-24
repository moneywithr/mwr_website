// Coaching-Box am Ende der Rechner-/Vergleichsseiten (vor dem Footer).
// Wird nur eingefügt, wenn <body data-coach-box> gesetzt ist.
(function(){
  // 1:1-Coaching-Seite ist ausgeblendet. Zum Einblenden diese Zeile entfernen.
  return;
  if(!document.body.hasAttribute('data-coach-box')) return;
  var footer = document.querySelector('footer');
  if(!footer) return;
  var check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5.5 12.2 9.8 16.5 18.5 7.7"></polyline></svg>';
  var box = document.createElement('section');
  box.className = 'coach-box';
  box.innerHTML =
    '<h2 class="coach-box-title" data-i18n="coachBoxTitle"></h2>' +
    '<p class="coach-box-text" data-i18n="coachBoxText"></p>' +
    '<ul class="coach-box-points">' +
      '<li><span class="coach-check">' + check + '</span><span data-i18n="coachBoxPoint1"></span></li>' +
      '<li><span class="coach-check">' + check + '</span><span data-i18n="coachBoxPoint2"></span></li>' +
      '<li><span class="coach-check">' + check + '</span><span data-i18n="coachBoxPoint3"></span></li>' +
    '</ul>' +
    '<div class="coach-box-actions">' +
      '<a class="landing-cta-btn" href="/one-on-one-coaching/"><span data-i18n="coachBoxCta"></span></a>' +
    '</div>';
  footer.parentNode.insertBefore(box, footer);
})();
