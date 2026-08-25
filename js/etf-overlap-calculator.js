// Logik NUR für calculator/etf_overlap/index.html (ETF-Overlap-Rechner).
// Aufbau angelehnt an js/broker.js (dynamisch befülltes .custom-select mit
// Gruppen) + js/spending-plan-calculator.js (state/solve/render). Holdings-
// Daten kommen aus etf-overlap-data.js (kuratiert, siehe Kommentar dort).
(function(){
  const $ = id => document.getElementById(id);
  const { t, fmtPct } = window.Site;
  const DATA = window.ETF_OVERLAP_DATA;

  const etfById = {};
  DATA.etfs.forEach(e => { etfById[e.id] = e; });

  const state = {
    a: 'ishares-msci-world',
    b: 'ishares-world-islamic',
  };

  function holdingsMap(etf){
    const map = {};
    DATA.holdingSets[etf.holdingSet].forEach(h => { map[h.key] = h.weight; });
    return map;
  }

  function solve(){
    const etfA = etfById[state.a], etfB = etfById[state.b];
    const mapA = holdingsMap(etfA), mapB = holdingsMap(etfB);
    const totalA = Object.values(mapA).reduce((s,v)=>s+v, 0);
    const totalB = Object.values(mapB).reduce((s,v)=>s+v, 0);

    const shared = [], onlyA = [], onlyB = [];
    Object.keys(mapA).forEach(key=>{
      if(mapB.hasOwnProperty(key)) shared.push({ key, wa: mapA[key], wb: mapB[key] });
      else onlyA.push({ key, w: mapA[key] });
    });
    Object.keys(mapB).forEach(key=>{
      if(!mapA.hasOwnProperty(key)) onlyB.push({ key, w: mapB[key] });
    });
    shared.sort((x,y)=> (y.wa+y.wb) - (x.wa+x.wb));
    onlyA.sort((x,y)=> y.w - x.w);
    onlyB.sort((x,y)=> y.w - x.w);

    const overlapWeight = shared.reduce((s,h)=> s + Math.min(h.wa, h.wb), 0);
    const overlapPct = (totalA + totalB) > 0 ? (2 * overlapWeight) / (totalA + totalB) * 100 : 0;

    return { etfA, etfB, totalA, totalB, shared, onlyA, onlyB, overlapWeight, overlapPct };
  }

  function companyName(key){ return DATA.companies[key] || key; }

  // Ampel-Skala für die Überlappungs-Gauge: bewusst eigene Farben statt der
  // Marken-Indigo/Lila-Töne, weil hier eine echte Risiko-Einstufung gemeint
  // ist (niedrig -> hoch), keine Marken-/Kategoriefarbe.
  const SEVERITY = [
    { max:15, level:'low',      color:'#3FAE6A', textColor:'#FFFFFF', labelKey:'overlapVerdictLow' },
    { max:35, level:'moderate', color:'#DAFF00', textColor:'#3D3D0A', labelKey:'overlapVerdictModerate' },
    { max:55, level:'elevated', color:'#F5A623', textColor:'#FFFFFF', labelKey:'overlapVerdictElevated' },
    { max:Infinity, level:'high', color:'#FE572C', textColor:'#FFFFFF', labelKey:'overlapVerdictHigh' },
  ];
  function severityFor(pct){ return SEVERITY.find(s => pct <= s.max) || SEVERITY[SEVERITY.length-1]; }

  // Gauge-Donut: derselbe Kreis-Trick (stroke-dasharray/-dashoffset) wie
  // spend-donut in spending-plan-calculator.js, aber nur EIN Segment (die
  // Überlappung) statt mehrerer Kategorien, plus große Zahl in der Mitte
  // (per absolut positioniertem HTML-Overlay statt SVG-Text).
  function buildGauge(pct, sev){
    const size = 168, sw = 20;
    const r = (size - sw) / 2;
    const cx = size/2, cy = size/2;
    const circumference = 2 * Math.PI * r;
    const frac = Math.max(0, Math.min(1, pct/100));
    const segLen = frac * circumference;
    return `<svg viewBox="0 0 ${size} ${size}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--panel-2)" stroke-width="${sw}"/>
      <g transform="rotate(-90 ${cx} ${cy})">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${sev.color}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${segLen.toFixed(2)} ${(circumference-segLen).toFixed(2)}"/>
      </g>
    </svg>`;
  }

  function buildSummaryText(res, sev){
    const a = res.etfA.name, b = res.etfB.name;
    const pctStr = fmtPct(res.overlapPct, 1);
    const template = t('overlapSummaryTemplate');
    const b_ = txt => '<strong>' + txt + '</strong>';
    return template
      .replaceAll('{a}', b_(a)).replaceAll('{b}', b_(b))
      .replaceAll('{pct}', b_(pctStr))
      .replaceAll('{sharedCount}', b_(res.shared.length))
      .replaceAll('{onlyACount}', b_(res.onlyA.length))
      .replaceAll('{onlyBCount}', b_(res.onlyB.length))
      + ' ' + t('overlapVerdictSentence_' + sev.level);
  }

  function buildSharedList(res){
    if(!res.shared.length) return `<div class="overlap-empty">${t('overlapSharedEmpty')}</div>`;
    const maxW = Math.max(...res.shared.map(h=> Math.max(h.wa, h.wb)));
    return res.shared.map(h=>{
      const wA = maxW > 0 ? h.wa / maxW * 100 : 0;
      const wB = maxW > 0 ? h.wb / maxW * 100 : 0;
      return `<div class="overlap-holding-row">
        <div class="overlap-holding-name">${companyName(h.key)}</div>
        <div class="overlap-mini-bar">
          <div class="overlap-mini-bar-track"><div class="overlap-mini-bar-fill etf" style="width:${wA.toFixed(1)}%"></div></div>
          <div class="overlap-mini-bar-val">${fmtPct(h.wa,2)}</div>
        </div>
        <div class="overlap-mini-bar">
          <div class="overlap-mini-bar-track"><div class="overlap-mini-bar-fill fonds" style="width:${wB.toFixed(1)}%"></div></div>
          <div class="overlap-mini-bar-val">${fmtPct(h.wb,2)}</div>
        </div>
      </div>`;
    }).join('');
  }

  function buildOnlyList(list){
    if(!list.length) return '–';
    return list.map(h=> `<div class="b-row"><span class="b-label">${companyName(h.key)}</span><span class="b-val">${fmtPct(h.w,2)}</span></div>`).join('');
  }

  function render(){
    const res = solve();
    const sev = severityFor(res.overlapPct);

    $('overlap-warning').classList.toggle('show', state.a === state.b);

    $('overlap-gauge').querySelector('svg')?.remove();
    $('overlap-gauge').insertAdjacentHTML('afterbegin', buildGauge(res.overlapPct, sev));
    $('overlap-gauge-pct').textContent = fmtPct(res.overlapPct, 1);
    const verdictEl = $('overlap-gauge-verdict');
    verdictEl.textContent = t(sev.labelKey);
    verdictEl.style.background = sev.color;
    verdictEl.style.color = sev.textColor;
    $('overlap-summary-text').innerHTML = buildSummaryText(res, sev);

    $('overlap-shared-list').innerHTML = buildSharedList(res);

    $('overlap-only-a-heading').textContent = t('overlapOnlyAHeading').replace('{a}', res.etfA.ticker);
    $('overlap-only-b-heading').textContent = t('overlapOnlyBHeading').replace('{b}', res.etfB.ticker);
    $('overlap-only-a-list').innerHTML = buildOnlyList(res.onlyA);
    $('overlap-only-b-list').innerHTML = buildOnlyList(res.onlyB);
  }

  // Sucht per Freitext über Name/ISIN/WKN/Ticker (kein Server-Lookup, da die
  // Seite statisch ist - filtert nur innerhalb des kuratierten ETF-Sets).
  function matchesQuery(entry, query){
    if(!query) return true;
    const haystack = [entry.name, entry.isin, entry.wkn, entry.ticker].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  }

  function filterMenu(selectId, query){
    const menu = $(selectId).querySelector('.custom-select-menu');
    let groupHeader = null, groupHasVisible = false;
    menu.querySelectorAll(':scope > li').forEach(li=>{
      if(li.classList.contains('custom-select-search-row')) return;
      if(li.classList.contains('custom-select-group')){
        if(groupHeader) groupHeader.style.display = groupHasVisible ? '' : 'none';
        groupHeader = li;
        groupHasVisible = false;
        return;
      }
      const entry = etfById[li.getAttribute('data-value')];
      const visible = matchesQuery(entry, query);
      li.style.display = visible ? '' : 'none';
      if(visible) groupHasVisible = true;
    });
    if(groupHeader) groupHeader.style.display = groupHasVisible ? '' : 'none';
  }

  function resetFilter(selectId){
    const menu = $(selectId).querySelector('.custom-select-menu');
    const input = menu.querySelector('.custom-select-search-input');
    if(input) input.value = '';
    filterMenu(selectId, '');
  }

  // ---- Dynamische Custom-Select-Menüs (nach Kategorie gruppiert, wie bei
  // js/broker.js), plus Suchfeld oben im Menü zum Filtern nach Name/ISIN/
  // WKN/Ticker. ----
  function renderSelectMenu(selectId, valueId, metaId, stateKey){
    const menu = $(selectId).querySelector('.custom-select-menu');
    menu.innerHTML = '';
    const lang = window.Site.state.lang;

    const searchRow = document.createElement('li');
    searchRow.className = 'custom-select-search-row';
    searchRow.setAttribute('role','presentation');
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'custom-select-search-input';
    searchInput.placeholder = t('overlapSearchPlaceholder');
    searchInput.addEventListener('click', e=> e.stopPropagation());
    searchInput.addEventListener('mousedown', e=> e.stopPropagation());
    searchInput.addEventListener('input', ()=> filterMenu(selectId, searchInput.value));
    searchRow.appendChild(searchInput);
    menu.appendChild(searchRow);

    function appendOption(entry){
      const li = document.createElement('li');
      li.setAttribute('role','option');
      li.setAttribute('data-value', entry.id);
      const isActive = entry.id === state[stateKey];
      li.setAttribute('aria-selected', isActive ? 'true' : 'false');
      li.classList.toggle('active', isActive);
      li.textContent = entry.name + ' (' + entry.ticker + ')';
      menu.appendChild(li);
    }

    // Restliche Kategorien ohne Gruppenüberschriften (nur eine flache
    // Liste), islamische Fonds als einzige Gruppe ganz unten - auf Wunsch
    // des Nutzers, weniger visuelle Unterteilung, islamische Fonds bleiben
    // aber als eigener Block auffindbar.
    DATA.etfs.filter(e => e.category !== 'islamic').forEach(appendOption);

    const islamicEntries = DATA.etfs.filter(e => e.category === 'islamic');
    if(islamicEntries.length){
      const islamicCat = DATA.categories.find(c => c.id === 'islamic');
      const groupHeader = document.createElement('li');
      groupHeader.className = 'custom-select-group';
      groupHeader.setAttribute('role','presentation');
      const groupIcon = document.createElement('span');
      groupIcon.className = 'custom-select-group-icon';
      groupIcon.textContent = islamicCat.icon;
      const groupName = document.createElement('span');
      groupName.className = 'custom-select-group-name';
      groupName.textContent = islamicCat.names[lang];
      groupHeader.appendChild(groupIcon);
      groupHeader.appendChild(groupName);
      menu.appendChild(groupHeader);
      islamicEntries.forEach(appendOption);
    }
    syncSelectUI(selectId, valueId, metaId, stateKey);
  }

  function syncSelectUI(selectId, valueId, metaId, stateKey){
    const entry = etfById[state[stateKey]];
    $(valueId).textContent = entry.name;
    const metaParts = ['ISIN: ' + (entry.isin || '–'), 'Ticker: ' + entry.ticker];
    if(entry.wkn) metaParts.splice(1, 0, 'WKN: ' + entry.wkn);
    $(metaId).textContent = metaParts.join('  ·  ');
    $(selectId).querySelectorAll('[data-value]').forEach(li=>{
      const isActive = li.getAttribute('data-value') === state[stateKey];
      li.classList.toggle('active', isActive);
      li.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  // Bei jedem Öffnen die Suche zurücksetzen (alle Optionen wieder sichtbar)
  // und ins Suchfeld fokussieren - der Toggle selbst passiert schon in
  // common.js (initCustomSelects), dieser Listener kommt danach dran.
  function bindSearchReset(selectId){
    const btn = $(selectId).querySelector('.custom-select-btn');
    if(btn._overlapSearchInit) return;
    btn._overlapSearchInit = true;
    btn.addEventListener('click', ()=>{
      if($(selectId).classList.contains('open')){
        resetFilter(selectId);
        const input = $(selectId).querySelector('.custom-select-search-input');
        if(input) requestAnimationFrame(()=> input.focus());
      }
    });
  }

  function renderSelects(){
    renderSelectMenu('overlap-select-a', 'overlap-select-a-value', 'overlap-select-a-meta', 'a');
    renderSelectMenu('overlap-select-b', 'overlap-select-b-value', 'overlap-select-b-meta', 'b');
    bindSearchReset('overlap-select-a');
    bindSearchReset('overlap-select-b');
  }

  $('overlap-select-a').addEventListener('customselect:change', e=>{
    state.a = e.detail.value;
    syncSelectUI('overlap-select-a', 'overlap-select-a-value', 'overlap-select-a-meta', 'a');
    render();
  });
  $('overlap-select-b').addEventListener('customselect:change', e=>{
    state.b = e.detail.value;
    syncSelectUI('overlap-select-b', 'overlap-select-b-value', 'overlap-select-b-meta', 'b');
    render();
  });

  document.addEventListener('mwr:langchange', ()=>{ renderSelects(); render(); });
  document.addEventListener('DOMContentLoaded', ()=>{
    renderSelects();
    render();
  });
})();
