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
  const COUNTRY_NAMES = { de:'Deutschland', at:'Österreich', se:'Schweden', us:'USA' };
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

  function render(){
    track.replaceChildren();
    // Liste doppelt, damit die Endlosschleife (translateX -50%) nahtlos ist.
    reviews.forEach(r => track.appendChild(card(r, false)));
    reviews.forEach(r => track.appendChild(card(r, true)));
    closeBtn.setAttribute('aria-label', Site.t('coachingClose'));
    if(openReview) fill(openReview);
  }

  function fill(r){
    dlgFlag.src = '/img/flags/' + r.country + '.svg';
    dlgFlag.alt = COUNTRY_NAMES[r.country] || '';
    dlgDate.textContent = fmtDate(r.date);
    dlgDate.dir = 'ltr';
    dlgText.textContent = r.text;
  }
  function show(r){ openReview = r; fill(r); dialog.showModal(); }

  closeBtn.addEventListener('click', ()=> dialog.close());
  dialog.addEventListener('close', ()=>{ openReview = null; });
  dialog.addEventListener('click', e=>{ if(e.target === dialog) dialog.close(); });

  document.addEventListener('mwr:langchange', render);
  render();
})();
