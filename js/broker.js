// Logik NUR für broker.html (Broker-Finder).
(function(){
  const $ = id => document.getElementById(id);
  const { t } = window.Site;
  const brokerData = window.BROKER_DATA;

  const state = { brokerIndex: '' };

  // Länder-Codes sind größtenteils ISO-3166-1-alpha-2 (passend für Flaggen-
  // Emoji aus Regional-Indicator-Symbolen) — "uk" ist umgangssprachlich und
  // wird auf "gb" gemappt, "other" hat keine Flagge (Symbol als Platzhalter).
  const FLAG_OVERRIDE = { uk: 'gb', other: null };
  function flagEmoji(id){
    const code = FLAG_OVERRIDE.hasOwnProperty(id) ? FLAG_OVERRIDE[id] : id;
    if(!code || code.length !== 2) return '🌐';
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + (c.charCodeAt(0) - 65)));
  }

  const continents = window.BROKER_CONTINENTS || [];

  function renderOptions(){
    const menu = $('broker-country-select').querySelector('.custom-select-menu');
    menu.innerHTML = '';
    const lang = window.Site.state.lang;
    continents.forEach(continent=>{
      const entriesInContinent = brokerData
        .map((entry, i)=>({ entry, i }))
        .filter(({entry})=> entry.continent === continent.id);
      if(!entriesInContinent.length) return;

      if(continent.id === 'other'){
        entriesInContinent.forEach(({entry, i})=>{
          const li = document.createElement('li');
          li.setAttribute('role','option');
          li.setAttribute('data-value', i);
          li.setAttribute('aria-selected', String(i) === state.brokerIndex ? 'true' : 'false');
          li.classList.toggle('active', String(i) === state.brokerIndex);
          const flag = document.createElement('span');
          flag.className = 'custom-select-flag';
          flag.textContent = flagEmoji(entry.id);
          const name = document.createElement('span');
          name.textContent = entry.names[lang];
          li.appendChild(flag);
          li.appendChild(name);
          menu.appendChild(li);
        });
        return;
      }

      const groupHeader = document.createElement('li');
      groupHeader.className = 'custom-select-group';
      groupHeader.setAttribute('role','presentation');
      const groupIcon = document.createElement('span');
      groupIcon.className = 'custom-select-group-icon';
      groupIcon.textContent = continent.icon;
      const groupName = document.createElement('span');
      groupName.className = 'custom-select-group-name';
      groupName.textContent = continent.names[lang];
      groupHeader.appendChild(groupIcon);
      groupHeader.appendChild(groupName);
      menu.appendChild(groupHeader);

      entriesInContinent.forEach(({entry, i})=>{
        const li = document.createElement('li');
        li.setAttribute('role','option');
        li.setAttribute('data-value', i);
        li.setAttribute('aria-selected', String(i) === state.brokerIndex ? 'true' : 'false');
        li.classList.toggle('active', String(i) === state.brokerIndex);
        const flag = document.createElement('span');
        flag.className = 'custom-select-flag';
        flag.textContent = flagEmoji(entry.id);
        const name = document.createElement('span');
        name.textContent = entry.names[lang];
        li.appendChild(flag);
        li.appendChild(name);
        menu.appendChild(li);
      });
    });
    syncCountrySelectUI();
  }

  function syncCountrySelectUI(){
    const valueEl = $('broker-country-value');
    if(state.brokerIndex === ''){
      valueEl.textContent = t('brokerSelectPlaceholder');
      valueEl.classList.add('placeholder');
    } else {
      const entry = brokerData[parseInt(state.brokerIndex, 10)];
      valueEl.textContent = flagEmoji(entry.id) + ' ' + entry.names[window.Site.state.lang];
      valueEl.classList.remove('placeholder');
    }
    $('broker-country-select').querySelectorAll('[data-value]').forEach(li=>{
      const isActive = li.getAttribute('data-value') === state.brokerIndex;
      li.classList.toggle('active', isActive);
      li.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
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
      card.className = 'broker-card' + (p.highlight ? ' broker-card-featured' : '');

      const main = document.createElement('div');
      main.className = 'broker-card-main';

      const logoWrap = document.createElement('div');
      logoWrap.className = 'broker-logo-wrap';

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
        logoWrap.appendChild(logo);
      } else {
        const fallback = document.createElement('div');
        fallback.className = 'broker-logo-fallback';
        fallback.textContent = p.name.slice(0,2).toUpperCase();
        logoWrap.appendChild(fallback);
      }

      main.appendChild(logoWrap);

      if(p.tag || p.bonus){
        const bonusBanner = document.createElement('span');
        bonusBanner.className = 'broker-bonus-banner';
        bonusBanner.textContent = [p.tag && p.tag[lang], p.bonus && p.bonus[lang]].filter(Boolean).join(' · ');
        main.appendChild(bonusBanner);
      }

      const left = document.createElement('div');
      left.className = 'broker-card-text';
      const nameLine = document.createElement('p');
      nameLine.className = 'broker-name';
      nameLine.textContent = p.name;
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

  $('broker-country-select').addEventListener('customselect:change', e=>{
    state.brokerIndex = e.detail.value;
    syncCountrySelectUI();
    renderResults();
  });

  document.addEventListener('mwr:langchange', ()=>{ renderOptions(); renderResults(); });
  document.addEventListener('DOMContentLoaded', ()=>{ renderOptions(); renderResults(); });
})();
