// Logik NUR für calculator/spending_plan/index.html (Ausgabenplan-Rechner).
// Angelehnt an den "Conscious Spending Plan" von Ramit Sethi (I Will Teach
// You To Be Rich), aber in 4 eigene Kategorien umsortiert:
//   Fixkosten (50-60%)      – Miete, Rechnungen, Abos, ...
//   Variable Kosten (20-35%) – Essen, Ausgehen, Kleidung, ...
//   Deine Zukunft (10%)      – Investieren + langfristiges Sparen
//   Kurzfristiges Sparen (5-10%) – Reisen, Geschenke, ...
// Die Prozentbänder sind bewusst dieselben wie im Original-Sheet, nur die
// Gruppierung der Posten wurde geändert. Kein automatischer Puffer mehr:
// das übernimmt jetzt das "Sonstiges"-Feld bei den Fixkosten. Aufbau
// (state/solve/render) wie financial-freedom-calculator.js.
(function(){
  const $ = id => document.getElementById(id);
  const { t, fmtEUR, fmtPct } = window.Site;

  const FIXED_FIELDS = ['rent','utilities','insurance','debt','subscriptions','other-fixed'];
  const VARIABLE_FIELDS = ['groceries','diningout','clothes'];

  // Reihenfolge = Reihenfolge im Donut/in der Legende. textColor = lesbare
  // Beschriftungsfarbe auf dem jeweiligen Segment (hell vs. dunkel).
  const CATEGORIES = [
    { key:'fixed',     color:'#AEC0F2', textColor:'#243B7A', labelKey:'spendFixedTitle',     badge:'50–60%' },
    { key:'variable',  color:'#E4633C', textColor:'#FFFFFF', labelKey:'spendVariableTitle',  badge:'20–35%' },
    { key:'shortterm', color:'#DAFF00', textColor:'#3D3D0A', labelKey:'spendShortTermTitle', badge:'5–10%' },
    { key:'future',    color:'#3D3480', textColor:'#FFFFFF', labelKey:'spendFutureTitle',    badge:'10%' },
  ];

  const state = {
    netIncome: 2500,
    rent: 700,
    utilities: 170,
    insurance: 120,
    debt: 100,
    subscriptions: 30,
    'other-fixed': 0,
    groceries: 250,
    diningout: 100,
    clothes: 40,
    futurePct: 10,
    shorttermPct: 10,
  };

  function solve(){
    const fixedTotal = FIXED_FIELDS.reduce((sum, key) => sum + state[key], 0);
    const variableTotal = VARIABLE_FIELDS.reduce((sum, key) => sum + state[key], 0);
    const futureAmount = state.netIncome * state.futurePct / 100;
    const shorttermAmount = state.netIncome * state.shorttermPct / 100;
    const totalAllocated = fixedTotal + variableTotal + futureAmount + shorttermAmount;
    const remaining = state.netIncome - totalAllocated;

    return {
      fixedTotal,
      variableTotal,
      futureAmount, shorttermAmount,
      totalAllocated, remaining,
      overspent: state.netIncome > 0 && remaining < 0,
    };
  }

  function buildExplanation(res){
    if(state.netIncome <= 0) return '';
    const template = t('spendResultExplain');
    const b = txt => '<strong>' + txt + '</strong>';
    const pctOf = v => fmtPct(state.netIncome > 0 ? v/state.netIncome*100 : 0, 0);
    return template
      .replace('{fixed}', b(fmtEUR(res.fixedTotal)))
      .replace('{fixedPct}', b(pctOf(res.fixedTotal)))
      .replace('{variable}', b(fmtEUR(res.variableTotal)))
      .replace('{variablePct}', b(pctOf(res.variableTotal)))
      .replace('{future}', b(fmtEUR(res.futureAmount)))
      .replace('{shortterm}', b(fmtEUR(res.shorttermAmount)))
      .replace('{remaining}', b(fmtEUR(Math.abs(res.remaining))));
  }

  // Donut per stroke-dasharray-Trick: ein <circle> pro Segment, alle mit
  // gleichem Radius/Mittelpunkt, das Segment wird über dasharray (Länge des
  // sichtbaren Bogens vs. Rest) plus dashoffset (Startpunkt) ausgeschnitten.
  // Ein <g rotate(-90)> sorgt dafür, dass alles bei 12 Uhr beginnt statt bei
  // 3 Uhr (SVG-Kreise starten sonst rechts).
  // Prozent-Beschriftung auf jedem Segment: Position per Trigonometrie in
  // der Mitte des Bogens (Winkel-Mitte, Radius = Ringmitte), das <g
  // rotate(-90)> gilt nur für die Kreise, die Labels werden separat auf den
  // schon gedrehten Winkeln berechnet (deshalb -90° direkt im Winkel selbst).
  function buildDonut(segments, base){
    const size = 180, sw = 26;
    const r = (size - sw) / 2;
    const cx = size/2, cy = size/2;
    const circumference = 2 * Math.PI * r;
    let cumulative = 0;
    let arcs = '', labels = '';
    segments.forEach(seg=>{
      const frac = base > 0 ? Math.max(0, seg.value) / base : 0;
      const segLen = frac * circumference;
      const dashoffset = -cumulative * circumference;
      arcs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${sw}" stroke-dasharray="${segLen.toFixed(2)} ${(circumference-segLen).toFixed(2)}" stroke-dashoffset="${dashoffset.toFixed(2)}"/>`;
      if(frac > 0.055 && seg.label){
        const midAngle = (cumulative + frac/2) * 2*Math.PI - Math.PI/2;
        const lx = cx + r * Math.cos(midAngle);
        const ly = cy + r * Math.sin(midAngle);
        labels += `<text x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-family="IBM Plex Mono, monospace" font-size="12" font-weight="700" fill="${seg.textColor || '#201E1F'}">${seg.label}</text>`;
      }
      cumulative += frac;
    });
    return `<svg viewBox="0 0 ${size} ${size}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E7E3DE" stroke-width="${sw}"/>
      <g transform="rotate(-90 ${cx} ${cy})">${arcs}</g>
      ${labels}
    </svg>`;
  }

  function buildLegend(res){
    const values = { fixed:res.fixedTotal, variable:res.variableTotal, future:res.futureAmount, shortterm:res.shorttermAmount };
    let rows = CATEGORIES.map(cat=>{
      const value = values[cat.key];
      const actualPct = state.netIncome > 0 ? fmtPct(value/state.netIncome*100, 0) : '–';
      return `<div class="spend-legend-row">
        <span class="spend-legend-dot" style="background:${cat.color}"></span>
        <span class="spend-legend-name">${t(cat.labelKey)}</span>
        <span class="spend-legend-actual"><strong>${actualPct}</strong></span>
        <span class="spend-legend-target">${t('spendLegendTarget')} <span class="num-range">${cat.badge}</span></span>
      </div>`;
    }).join('');
    // Grauer Ring-Rest = noch nicht zugewiesenes Geld, nur wenn er im Donut
    // tatsächlich sichtbar ist (kein grauer Rest mehr bei Überschreitung).
    if(!res.overspent && res.remaining > 0){
      const actualPct = state.netIncome > 0 ? fmtPct(res.remaining/state.netIncome*100, 0) : '–';
      rows += `<div class="spend-legend-row">
        <span class="spend-legend-dot" style="background:#E7E3DE"></span>
        <span class="spend-legend-name">${t('spendStatUnallocatedLabel')}</span>
        <span class="spend-legend-actual"><strong>${actualPct}</strong></span>
        <span class="spend-legend-target"></span>
      </div>`;
    }
    return rows;
  }

  function render(){
    const res = solve();

    const warningEl = $('spend-warning');
    warningEl.classList.toggle('show', res.overspent);
    if(res.overspent){
      warningEl.textContent = t('spendOverspentWarning').replace('{amount}', fmtEUR(Math.abs(res.remaining)));
    }

    $('spend-stat-income').textContent = fmtEUR(state.netIncome);
    $('spend-stat-allocated').textContent = fmtEUR(res.totalAllocated);
    $('spend-stat-unallocated').textContent = fmtEUR(res.remaining);
    $('spend-stat-unallocated').classList.toggle('negative', res.overspent);

    $('spend-stat-fixed').textContent = fmtEUR(res.fixedTotal);
    $('spend-stat-variable').textContent = fmtEUR(res.variableTotal);
    $('spend-stat-future').textContent = fmtEUR(res.futureAmount);
    $('spend-stat-shortterm').textContent = fmtEUR(res.shorttermAmount);

    $('spend-result-explain').innerHTML = buildExplanation(res);

    const donutBase = res.overspent ? res.totalAllocated : state.netIncome;
    const values = { fixed:res.fixedTotal, variable:res.variableTotal, future:res.futureAmount, shortterm:res.shorttermAmount };
    const segments = CATEGORIES.map(cat => {
      const value = values[cat.key];
      const actualPct = state.netIncome > 0 ? Math.round(value/state.netIncome*100) : 0;
      return { color: cat.color, textColor: cat.textColor, value, label: actualPct + '%' };
    });
    $('spend-donut').innerHTML = buildDonut(segments, donutBase);
    $('spend-legend').innerHTML = buildLegend(res);
  }

  // Prozent-Auswahl als Boxen statt Slider: feste Werte per Klick, plus ein
  // Zahlenfeld für einen eigenen Wert. Das Zahlenfeld bleibt die einzige
  // Quelle der Wahrheit für den Anzeigewert, die Boxen markieren nur, ob der
  // aktuelle Wert einer der Voreinstellungen entspricht.
  function syncPctChoices(choicesId, value){
    $(choicesId).querySelectorAll('.pct-choice-btn').forEach(btn=>{
      btn.classList.toggle('active', parseFloat(btn.dataset.value) === value);
    });
  }

  function updatePctInputs(){
    $('spend-future-pct-input').value = state.futurePct;
    $('spend-shortterm-pct-input').value = state.shorttermPct;
    syncPctChoices('spend-future-pct-choices', state.futurePct);
    syncPctChoices('spend-shortterm-pct-choices', state.shorttermPct);
  }

  function bindPctChoice(choicesId, inputId, key, min, max){
    $(choicesId).querySelectorAll('.pct-choice-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        state[key] = parseFloat(btn.dataset.value);
        updatePctInputs();
        render();
      });
    });
    $(inputId).addEventListener('input', e=>{
      let v = parseFloat(e.target.value);
      if(isNaN(v)) return;
      v = Math.max(min, Math.min(max, v));
      state[key] = v;
      syncPctChoices(choicesId, v);
      render();
    });
  }

  bindPctChoice('spend-future-pct-choices', 'spend-future-pct-input', 'futurePct', 0, 40);
  bindPctChoice('spend-shortterm-pct-choices', 'spend-shortterm-pct-input', 'shorttermPct', 0, 30);

  // Wie in financial-freedom-calculator.js: Der State bekommt bei
  // leerem/ungültigem Feld einen Fallback von 0, das sichtbare Feld wird
  // nur korrigiert, wenn der Wert wirklich außerhalb von min liegt.
  function bindNumber(id, key, opts){
    opts = opts || {};
    $(id).addEventListener('input', e=>{
      const raw = parseFloat(e.target.value);
      let v = isNaN(raw) ? 0 : raw;
      if(opts.min !== undefined) v = Math.max(opts.min, v);
      state[key] = v;
      if(!isNaN(raw) && raw !== v) e.target.value = v;
      render();
    });
  }

  bindNumber('spend-netincome', 'netIncome', { min: 0 });
  FIXED_FIELDS.forEach(key => bindNumber('spend-' + key, key, { min: 0 }));
  VARIABLE_FIELDS.forEach(key => bindNumber('spend-' + key, key, { min: 0 }));

  document.addEventListener('mwr:langchange', ()=>{ updatePctInputs(); render(); });
  document.addEventListener('mwr:currencychange', render);
  document.addEventListener('DOMContentLoaded', ()=>{
    updatePctInputs();
    render();
  });

  window.SavedResults.init({
    cookieKey: 'spend',
    insertAfter: document.querySelector('.panel.result-summary'),
    fields: [
      { type:'value', id:'spend-netincome' },
      { type:'value', id:'spend-rent' },
      { type:'value', id:'spend-utilities' },
      { type:'value', id:'spend-insurance' },
      { type:'value', id:'spend-debt' },
      { type:'value', id:'spend-subscriptions' },
      { type:'value', id:'spend-other-fixed' },
      { type:'value', id:'spend-groceries' },
      { type:'value', id:'spend-diningout' },
      { type:'value', id:'spend-clothes' },
      { type:'value', id:'spend-future-pct-input' },
      { type:'value', id:'spend-shortterm-pct-input' },
    ],
  });
})();
