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
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = reviews.length;

  // Endlos-Karussell per transform (butterweich, auch mit Bruchteilen von Pixeln):
  // Die Karten stehen genau einmal im Track, dahinter so viele Klone, dass der
  // sichtbare Bereich immer gefüllt ist. Bei x >= setWidth springt es unsichtbar
  // auf 0 zurück (die Klone sehen identisch aus). Wischen/Ziehen und Nachrollen
  // laufen über Pointer-Events, senkrechtes Scrollen der Seite bleibt erhalten.
  let setWidth = 0;   // Breite einer Kartenliste inkl. Abstand
  let x = 0;          // aktuelle Verschiebung in Pixeln
  let paused = false; // Maus über dem Bereich / Fokus
  let dragging = false;
  let inertia = 0;    // Nachroll-Geschwindigkeit in Pixel pro Sekunde
  let suppressClick = false;

  function render(){
    track.replaceChildren();
    reviews.forEach(r => track.appendChild(card(r, false)));
    closeBtn.setAttribute('aria-label', Site.t('coachingClose'));
    prevBtn.setAttribute('aria-label', Site.t('coachingReviewPrev'));
    nextBtn.setAttribute('aria-label', Site.t('coachingReviewNext'));
    if(openReview) fill(openReview);
    layout();
  }

  // Klone anhängen und die Breite einer Liste messen (bei Größenänderung erneut).
  function layout(){
    var real = N;
    while(track.children.length > real) track.removeChild(track.lastChild);
    if(!N || reduceMotion){ setWidth = 0; track.style.transform = ''; return; }
    if(!marquee.clientWidth){ setWidth = 0; return; } // versteckt (anderer Tab)
    // Ein Klon reicht zum Messen, danach genug Klone für Sichtbereich + eine Karte.
    track.appendChild(card(reviews[0], true));
    setWidth = track.children[real].offsetLeft - track.children[0].offsetLeft;
    var need = marquee.clientWidth + track.children[0].offsetWidth + 40;
    var i = 1;
    while(track.scrollWidth - setWidth < need && i < N){
      track.appendChild(card(reviews[i % N], true));
      i++;
    }
    normalize();
    apply();
  }

  function normalize(){
    if(!setWidth) return;
    x = ((x % setWidth) + setWidth) % setWidth;
  }
  function apply(){
    track.style.transform = 'translate3d(' + (-x) + 'px,0,0)';
  }

  var last = performance.now();
  function tick(now){
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    if(setWidth && !dragging){
      var speed = window.innerWidth < 760 ? 16 : 24; // Pixel pro Sekunde
      if(Math.abs(inertia) > speed){
        x += inertia * dt;
        inertia *= Math.pow(0.92, dt * 60); // sanftes Ausrollen
      } else {
        inertia = 0;
        if(!paused) x += speed * dt;
      }
      normalize();
      apply();
    }
    requestAnimationFrame(tick);
  }

  if(!reduceMotion){
    var startX = 0, lastX = 0, lastT = 0, vel = 0, captured = false;
    marquee.addEventListener('pointerdown', e=>{
      if(e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; captured = false; inertia = 0; vel = 0;
      startX = lastX = e.clientX; lastT = performance.now();
    });
    marquee.addEventListener('pointermove', e=>{
      if(!dragging) return;
      var dx = e.clientX - lastX, now = performance.now();
      if(!captured && Math.abs(e.clientX - startX) > 6){
        captured = true;
        try{ marquee.setPointerCapture(e.pointerId); }catch(err){}
      }
      if(captured){
        x -= dx; normalize(); apply();
        var dtm = Math.max(now - lastT, 1);
        vel = 0.8 * vel + 0.2 * (-dx / dtm * 1000); // geglättete Geschwindigkeit
      }
      lastX = e.clientX; lastT = now;
    });
    function end(e){
      if(!dragging) return;
      dragging = false;
      if(captured){
        inertia = Math.max(-2500, Math.min(2500, vel));
        suppressClick = true;
        setTimeout(()=>{ suppressClick = false; }, 80);
        try{ marquee.releasePointerCapture(e.pointerId); }catch(err){}
      }
    }
    marquee.addEventListener('pointerup', end);
    marquee.addEventListener('pointercancel', end);
    // Nach einem Wisch soll kein Klick auf die Karte darunter durchgehen.
    marquee.addEventListener('click', e=>{ if(suppressClick){ e.stopPropagation(); e.preventDefault(); } }, true);
    marquee.addEventListener('pointerenter', e=>{ if(e.pointerType === 'mouse') paused = true; });
    marquee.addEventListener('pointerleave', e=>{ if(e.pointerType === 'mouse') paused = false; });
    marquee.addEventListener('focusin', e=>{
      paused = true;
      // Karte per Tastatur fokussiert: in den sichtbaren Bereich schieben.
      var c = e.target.closest ? e.target.closest('.review-card') : null;
      if(c && setWidth){ x = c.offsetLeft - 24; normalize(); apply(); }
    });
    marquee.addEventListener('focusout', ()=>{ paused = false; });
    marquee.addEventListener('scroll', ()=>{ marquee.scrollLeft = 0; }, { passive:true });
    // Waagerechtes Trackpad-Wischen
    marquee.addEventListener('wheel', e=>{
      if(Math.abs(e.deltaX) > Math.abs(e.deltaY) && setWidth){
        x += e.deltaX; inertia = 0; normalize(); apply(); e.preventDefault();
      }
    }, { passive:false });
    requestAnimationFrame(tick);
  }

  // Neu messen bei Größenänderung und sobald der Bereich sichtbar wird (Startseiten-Tab).
  if(window.ResizeObserver){ new ResizeObserver(()=> layout()).observe(marquee); }
  window.addEventListener('resize', ()=> layout());
  window.addEventListener('load', ()=> layout());

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
