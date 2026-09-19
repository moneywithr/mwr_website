// Coaching-Seite: Bewertungs-Karussell und Detail-Dialog.
// Zeigt bewusst nur Text, Land (als Flagge) und Datum, keine Namen.
(function(){
  const reviews = window.COACHING_REVIEWS || [];
  const track = document.getElementById('reviews-track');
  const dialog = document.getElementById('review-dialog');
  const dlgFlag = document.getElementById('review-dialog-flag');
  const dlgDate = document.getElementById('review-dialog-date');
  const dlgText = document.getElementById('review-dialog-text');
  const closeBtn = document.getElementById('review-close');
  const dlgName = document.getElementById('review-dialog-name');
  const prevBtn = document.getElementById('review-prev');
  const nextBtn = document.getElementById('review-next');
  const COUNTRY_NAMES = { de:'Deutschland', at:'Österreich', se:'Schweden', us:'USA', uk:'United Kingdom' };
  let openReview = null;
  // Reihenfolge bei jedem Seitenaufruf zufällig (Fisher-Yates).
  for(let i = reviews.length - 1; i > 0; i--){
    const k = Math.floor(Math.random() * (i + 1));
    [reviews[i], reviews[k]] = [reviews[k], reviews[i]];
  }

  // Rein numerisch (TT.MM.JJJJ) in allen Sprachen, damit gemischte Schrift/Ziffern nicht kippen.
  function fmtDate(iso){
    const [y, m, d] = iso.split('-');
    return d + '.' + m + '.' + y;
  }

  function card(r, dup){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'review-card';
    if(dup){ b.setAttribute('aria-hidden','true'); b.tabIndex = -1; }
    const p = document.createElement('p');
    p.className = 'review-excerpt';
    p.dir = 'auto';
    p.textContent = r.text;
    const foot = document.createElement('div');
    foot.className = 'review-foot';
    const who = document.createElement('div');
    who.className = 'review-who';
    const n = document.createElement('span');
    n.className = 'review-name';
    n.dir = 'auto';
    n.textContent = r.name;
    const d = document.createElement('span');
    d.className = 'review-date';
    d.textContent = fmtDate(r.date);
    d.dir = 'ltr';
    const img = document.createElement('img');
    img.className = 'review-flag';
    img.src = '/img/flags/' + r.country + '.svg';
    img.alt = COUNTRY_NAMES[r.country] || '';
    who.append(n, d);
    foot.append(who, img);
    b.append(p, foot);
    b.addEventListener('click', ()=> show(r));
    return b;
  }

  const marquee = document.getElementById('reviews-marquee');
  let setWidth = 0;   // Breite einer Kopie der Kartenliste (inkl. Abstände)
  let pos = 0;        // Scroll-Position als Kommazahl (scrollLeft rundet auf ganze Pixel)
  let paused = false;
  let started = false;

  function render(){
    track.replaceChildren();
    // Drei Kopien: die mittlere ist die echte, die äußeren sind Klone für die
    // Endlosschleife (Scroll-Position bleibt immer in der mittleren Kopie).
    reviews.forEach(r => track.appendChild(card(r, true)));
    reviews.forEach(r => track.appendChild(card(r, false)));
    reviews.forEach(r => track.appendChild(card(r, true)));
    closeBtn.setAttribute('aria-label', Site.t('coachingClose'));
    prevBtn.setAttribute('aria-label', Site.t('coachingReviewPrev'));
    nextBtn.setAttribute('aria-label', Site.t('coachingReviewNext'));
    if(openReview) fill(openReview);
    measure();
  }

  function measure(){
    var n = reviews.length;
    if(!n || track.children.length < 2 * n) return;
    setWidth = track.children[n].offsetLeft - track.children[0].offsetLeft;
    pos = setWidth;
    marquee.scrollLeft = pos;
  }

  // Automatisch laufen lassen, aber als normaler Scroll-Container: Nutzer können
  // jederzeit selbst wischen/scrollen. Wichtig gegen Zittern auf dem Handy:
  // solange der Nutzer wischt oder die Fingerbewegung noch nachrollt (Momentum),
  // schreibt der Code NICHT in scrollLeft und springt auch nicht. Erst nach kurzer
  // Ruhe läuft es weiter, und die Endlosschleife wird erst dann neu zentriert.
  var lastUser = 0;        // Zeitpunkt der letzten Nutzer-Interaktion (Touch/Rad/Scroll)
  var lastWritten = null;  // zuletzt von uns gesetzte Position (zum Erkennen eigener Scroll-Events)
  var wrapTimer = null;
  var IDLE_MS = 1500;

  function touch(){ lastUser = performance.now(); }

  function tick(now){
    var dt = Math.min((now - tick.last) / 1000, 0.1); tick.last = now;
    if(!paused && setWidth && now - lastUser > IDLE_MS){
      var speed = window.innerWidth < 760 ? 16 : 24; // Pixel pro Sekunde
      pos += speed * dt;
      wrap();
      lastWritten = pos;
      marquee.scrollLeft = pos;
    }
    requestAnimationFrame(tick);
  }
  tick.last = performance.now();

  function wrap(){
    if(!setWidth) return;
    if(pos >= 2 * setWidth) pos -= setWidth;
    else if(pos < setWidth) pos += setWidth;
  }
  // Nach dem Wischen (wenn nichts mehr scrollt) unsichtbar in die mittlere Kopie zurückspringen.
  function normalize(){
    if(!setWidth) return;
    var x = marquee.scrollLeft;
    if(x >= 2 * setWidth || x < setWidth){
      var target = x >= 2 * setWidth ? x - setWidth : x + setWidth;
      lastWritten = target;
      marquee.scrollLeft = target;
      pos = target;
    } else {
      pos = x;
    }
  }

  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduceMotion){
    marquee.addEventListener('mouseenter', ()=>{ paused = true; });
    marquee.addEventListener('mouseleave', ()=>{ pos = marquee.scrollLeft; paused = false; });
    marquee.addEventListener('focusin', ()=>{ paused = true; });
    marquee.addEventListener('focusout', ()=>{ pos = marquee.scrollLeft; paused = false; });
  }
  ['touchstart', 'touchmove', 'touchend', 'wheel', 'pointerdown'].forEach(ev=>{
    marquee.addEventListener(ev, touch, { passive:true });
  });
  marquee.addEventListener('scroll', ()=>{
    if(!setWidth || restoring) return;
    var x = marquee.scrollLeft;
    // Eigene Schreibzugriffe (Auto-Lauf) ignorieren, alles andere ist Nutzer/Momentum.
    if(lastWritten !== null && Math.abs(x - lastWritten) < 2) return;
    touch();
    pos = x;
    clearTimeout(wrapTimer);
    wrapTimer = setTimeout(normalize, 250);
  }, { passive:true });
  // Auf der Startseite ist der Bereich anfangs evtl. versteckt (anderer Tab): messen, sobald er sichtbar wird.
  // Beim Wiedereinblenden (display:none setzt scrollLeft auf 0) die letzte Position wiederherstellen.
  var restoring = false;
  if(window.ResizeObserver){
    new ResizeObserver(()=>{
      if(!marquee.clientWidth) return;
      if(!setWidth){ measure(); return; }
      restoring = true;
      lastWritten = pos;
      marquee.scrollLeft = pos;
      setTimeout(()=>{ restoring = false; }, 150);
    }).observe(marquee);
  }
  window.addEventListener('resize', ()=> measure());
  window.addEventListener('load', ()=> measure());
  if(!reduceMotion) requestAnimationFrame(tick);

  function fill(r){
    dlgFlag.src = '/img/flags/' + r.country + '.svg';
    dlgFlag.alt = COUNTRY_NAMES[r.country] || '';
    dlgName.textContent = r.name;
    dlgDate.textContent = fmtDate(r.date);
    dlgDate.dir = 'ltr';
    dlgText.textContent = r.text;
    dialog.scrollTop = 0;
  }
  function show(r){ openReview = r; fill(r); dialog.showModal(); }
  // Vor/zurück durch alle Bewertungen (Reihenfolge wie im Karussell), mit Umlauf.
  function step(delta){
    var i = reviews.indexOf(openReview);
    openReview = reviews[(i + delta + reviews.length) % reviews.length];
    fill(openReview);
  }
  prevBtn.addEventListener('click', ()=> step(-1));
  nextBtn.addEventListener('click', ()=> step(1));
  // Pfeiltasten: in RTL zeigt "links" auf die nächste Bewertung.
  dialog.addEventListener('keydown', e=>{
    if(e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var rtl = document.documentElement.dir === 'rtl';
    step((e.key === 'ArrowRight') === rtl ? -1 : 1);
    e.preventDefault();
  });
  // Wischen auf Touch-Geräten.
  var touchX = null;
  dialog.addEventListener('touchstart', e=>{ touchX = e.touches[0].clientX; }, { passive:true });
  dialog.addEventListener('touchend', e=>{
    if(touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX; touchX = null;
    if(Math.abs(dx) < 60) return;
    var rtl = document.documentElement.dir === 'rtl';
    step((dx > 0) === rtl ? 1 : -1);
  }, { passive:true });

  closeBtn.addEventListener('click', ()=> dialog.close());
  dialog.addEventListener('close', ()=>{ openReview = null; });
  dialog.addEventListener('click', e=>{ if(e.target === dialog) dialog.close(); });

  document.addEventListener('mwr:langchange', render);
  render();

  // Wartelisten-Formular: wird nach der Prüfung normal an Brevo gesendet.
  // Brevo leitet danach auf die dort eingestellte Bestätigungsseite weiter
  // (/coaching/thank-you/).
  document.querySelectorAll('.waitlist-form').forEach(form=>{
    const status = form.querySelector('.waitlist-status');
    form.addEventListener('submit', e=>{
      const email = form.elements.EMAIL.value.trim();
      const consent = form.querySelector('.waitlist-consent-box').checked;
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !consent){
        e.preventDefault();
        status.textContent = Site.t('coachingWaitlistInvalid');
        status.className = 'waitlist-status err';
        return;
      }
      form.elements.locale.value = Site.state.lang;
      status.textContent = '';
    });
  });
})();
