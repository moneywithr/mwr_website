// Logik NUR für broker.html (Broker-Finder).
(function(){
  const $ = id => document.getElementById(id);
  const { t } = window.Site;
  const brokerData = window.BROKER_DATA;

  const state = { brokerIndex: '' };

  function renderOptions(){
    const sel = $('broker-country');
    sel.innerHTML = '';
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = t('brokerSelectPlaceholder');
    sel.appendChild(empty);
    brokerData.forEach((entry, i)=>{
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = entry.names[window.Site.state.lang];
      sel.appendChild(opt);
    });
    sel.value = state.brokerIndex;
  }

  function renderResults(){
    const placeholder = $('broker-placeholder');
    const results = $('broker-results');
    if(state.brokerIndex === ''){
      placeholder.style.display = 'block';
      results.style.display = 'none';
      return;
    }
    const lang = window.Site.state.lang;
    const entry = brokerData[parseInt(state.brokerIndex, 10)];
    placeholder.style.display = 'none';
    results.style.display = 'block';

    $('broker-result-country').textContent = entry.names[lang];
    const count = entry.platforms.length;
    $('broker-result-count').textContent = count + ' ' + (count === 1 ? t('brokerCountOne') : t('brokerCountMany'));

    const cardsEl = $('broker-cards');
    cardsEl.innerHTML = '';
    entry.platforms.forEach(p=>{
      const card = document.createElement('div');
      card.className = 'broker-card';

      const main = document.createElement('div');
      main.className = 'broker-card-main';

      if(p.logoUrl || p.domain){
        const logo = document.createElement('img');
        logo.className = 'broker-logo';
        logo.src = p.logoUrl || ('https://www.google.com/s2/favicons?domain=' + p.domain + '&sz=128');
        logo.alt = p.name;
        logo.loading = 'lazy';
        logo.onerror = function(){
          const fallback = document.createElement('div');
          fallback.className = 'broker-logo-fallback';
          fallback.textContent = p.name.slice(0,2).toUpperCase();
          this.replaceWith(fallback);
        };
        main.appendChild(logo);
      } else {
        const fallback = document.createElement('div');
        fallback.className = 'broker-logo-fallback';
        fallback.textContent = p.name.slice(0,2).toUpperCase();
        main.appendChild(fallback);
      }

      const left = document.createElement('div');
      left.className = 'broker-card-text';
      const nameLine = document.createElement('p');
      nameLine.className = 'broker-name';
      nameLine.textContent = p.name;
      if(p.tag){
        const badge = document.createElement('span');
        badge.className = 'broker-badge';
        badge.textContent = p.tag[lang];
        nameLine.appendChild(badge);
      }
      left.appendChild(nameLine);
      if(p.note){
        const noteLine = document.createElement('p');
        noteLine.className = 'broker-note';
        noteLine.textContent = p.note[lang];
        left.appendChild(noteLine);
      }

      const link = document.createElement('a');
      link.className = 'broker-cta' + (p.url ? '' : ' disabled');
      const label = document.createElement('span');
      label.textContent = p.url ? t('brokerCtaLink') : t('brokerCtaNoLink');
      link.appendChild(label);
      if(p.url){
        const arrow = document.createElement('span');
        arrow.className = 'broker-cta-arrow';
        arrow.textContent = '→';
        link.appendChild(arrow);
        link.href = p.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }

      main.appendChild(left);
      card.appendChild(main);
      card.appendChild(link);
      cardsEl.appendChild(card);
    });

    const generalNote = $('broker-general-note');
    if(entry.note){
      generalNote.style.display = 'block';
      generalNote.textContent = entry.note[lang];
    } else {
      generalNote.style.display = 'none';
    }
  }

  $('broker-country').addEventListener('change', e=>{
    state.brokerIndex = e.target.value;
    renderResults();
  });

  document.addEventListener('mwr:langchange', ()=>{ renderOptions(); renderResults(); });
  document.addEventListener('DOMContentLoaded', ()=>{ renderOptions(); renderResults(); });
})();
