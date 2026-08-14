// Logik NUR für index.html (Sparrechner: Endkapital / Anfangskapital / Rate / Laufzeit).
// Modell: Anfangskapital wird zu Beginn eingezahlt, danach wird pro Monat zuerst die
// Rate eingezahlt und dann das gesamte Kapital mit der monatlichen Rendite verzinst.
(function(){
  const $ = id => document.getElementById(id);
  const { t, locale, fmtEUR, fmtCompact, fmtPct } = window.Site;

  const state = {
    target: 'endkapital', // 'endkapital' | 'anfangskapital' | 'rate' | 'laufzeit'
    years: 15,
    rendite: 7,
    einmalActive: true,
    anfangskapital: 5000,
    rate: 300,
    endkapital: 100000,
    taxActive: false,
    kapst: 26.375,
    teilfreistellungActive: true,
  };
  // Feste Teilfreistellungsquote für Aktienfonds (Aktienquote ≥ 51%) — die
  // Auswahl der Fondsart wird bewusst nicht abgefragt, deshalb hier als
  // Konstante statt als Eingabefeld.
  const TEILFREISTELLUNGSQUOTE = 30;

  // Balken-Diagramm: welches Jahr aktuell angeklickt/hervorgehoben ist. null =
  // "noch nichts angeklickt", zeigt dann standardmäßig das letzte Jahr. Bleibt
  // über Neuberechnungen (Slider etc.) hinweg erhalten, damit man z.B. Jahr 10
  // angeklickt lässt und dabei die Rendite verstellt, um live zu sehen, wie
  // sich der Wert für genau dieses Jahr ändert.
  let chartActiveIdx = null;
  let lastSeries = null;

  function monthlyRateFromAnnual(annualPct){
    return Math.pow(1 + annualPct/100, 1/12) - 1;
  }

  function computeFV(P0, C, N, i){
    if(N <= 0) return P0;
    if(Math.abs(i) < 1e-9) return P0 + C*N;
    const f = Math.pow(1+i, N);
    return P0*f + C*(1+i)*(f-1)/i;
  }
  function solveP0(FV, C, N, i){
    if(N <= 0) return FV;
    if(Math.abs(i) < 1e-9) return FV - C*N;
    const f = Math.pow(1+i, N);
    return (FV - C*(1+i)*(f-1)/i) / f;
  }
  function solveC(FV, P0, N, i){
    if(N <= 0) return null;
    if(Math.abs(i) < 1e-9) return (FV - P0)/N;
    const f = Math.pow(1+i, N);
    const denom = (1+i)*(f-1)/i;
    if(Math.abs(denom) < 1e-9) return null;
    return (FV - P0*f) / denom;
  }
  function solveN(FV, P0, C, i){
    if(Math.abs(i) < 1e-9){
      if(Math.abs(C) < 1e-9) return null;
      const n = (FV - P0)/C;
      return n > 0 ? n : null;
    }
    const k = C*(1+i)/i;
    const num = FV + k, den = P0 + k;
    if(num <= 0 || den <= 0) return null;
    const ratio = num/den;
    if(ratio <= 0) return null;
    const months = Math.log(ratio) / Math.log(1+i);
    return months > 0 ? months : null;
  }

  function solve(){
    const i = monthlyRateFromAnnual(state.rendite);
    let P0 = state.einmalActive ? state.anfangskapital : 0;
    let C = state.rate;
    let N = state.years * 12;
    let FV = state.endkapital;
    let invalid = false;

    if(state.target === 'endkapital'){
      FV = computeFV(P0, C, N, i);
    } else if(state.target === 'anfangskapital'){
      const r = solveP0(FV, C, N, i);
      if(r === null || !isFinite(r) || r < 0) invalid = true; else P0 = r;
    } else if(state.target === 'rate'){
      const r = solveC(FV, P0, N, i);
      if(r === null || !isFinite(r) || r < 0) invalid = true; else C = r;
    } else if(state.target === 'laufzeit'){
      const r = solveN(FV, P0, C, i);
      if(r === null || !isFinite(r)) invalid = true;
      else N = Math.max(1, Math.round(r));
    }

    // Für "laufzeit" ist N auf ganze Monate gerundet (Math.round oben) — würde
    // man FV daraus neu berechnen, würde die Zielsumme leicht vom eingegebenen
    // Zielwert abweichen (z.B. 99.688 € statt der eingegebenen 100.000 €), obwohl
    // der Nutzer genau diesen Betrag als festes Ziel vorgegeben hat. FV bleibt
    // daher für "laufzeit" unverändert der ursprüngliche Zielwert.
    if(!invalid && state.target !== 'endkapital' && state.target !== 'laufzeit'){
      FV = computeFV(P0, C, N, i);
    }

    return { P0, C, N, FV, i, invalid };
  }

  // Effektiver Steuersatz auf Kapitalerträge: Kapitalertragsteuer, ggf.
  // reduziert um die steuerfreie Teilfreistellungsquote. 0, wenn die
  // Steuerberechnung ausgeschaltet ist.
  function effectiveTaxRate(){
    if(!state.taxActive) return 0;
    const taxableFraction = state.teilfreistellungActive ? (1 - TEILFREISTELLUNGSQUOTE/100) : 1;
    return (state.kapst/100) * taxableFraction;
  }

  function simulateSeries(P0, C, totalMonths, i){
    let portfolio = P0, contributed = P0;
    const snapshots = [portfolio], contribSnapshots = [contributed];
    for(let m=1; m<=totalMonths; m++){
      portfolio += C;
      contributed += C;
      portfolio *= (1+i);
      if(m % 12 === 0){
        snapshots.push(portfolio);
        contribSnapshots.push(contributed);
      }
    }
    if(totalMonths % 12 !== 0){
      snapshots.push(portfolio);
      contribSnapshots.push(contributed);
    }
    return { snapshots, contribSnapshots };
  }

  // Bewusst dieselben Farben wie im Rest der Seite (kein neuer Akzentton nur
  // fürs Diagramm): var(--green) ist die überall genutzte Marken-"Lila"-Farbe
  // (Buttons, Ergebnis-Panel), var(--mint) das etablierte Gelb/Lime-Highlight
  // (Währungsauswahl, aktive Sprache, Switches). Die "aktiv"-Varianten sind
  // dieselben helleren Töne, die anderswo als Pendant zu green/mint stehen
  // (--green-dim bzw. die helle Chartreuse-Fläche von .stat-card.orange).
  const INVESTED_COLOR = '#685CC8', INVESTED_ACTIVE_COLOR = '#F0EEFA'; // var(--green) / var(--green-dim)
  const RETURN_COLOR = '#DAFF00', RETURN_ACTIVE_COLOR = '#F2FFB8';     // var(--mint) / helle Mint-Fläche

  function drawChart(res){
    lastSeries = res;
    const H = 360, padL = 56, padT = 20, padR = 20, padB = 34;
    const n = res.snapshots.length; // enthält auch Jahr 0 (Startpunkt)
    const m = n - 1; // Anzahl gezeichneter Balken (Jahr 1..n-1, Jahr 0 wird nicht als eigener Balken gezeigt)
    const maxV = Math.max(...res.snapshots) * 1.08 || 1; // Fallback verhindert Division durch 0, wenn nie eingezahlt wird
    // Ziffern bleiben in Mono/Sans wie bei DE/EN (nicht IBM Plex Sans Arabic) —
    // die Arabic-Schrift greift nur als Fallback für tatsächliche arabische
    // Buchstaben, die in denselben <text>-Elementen vorkommen (z.B. "سنة 5").
    const monoFont = window.Site.state.lang === 'ar' ? "'IBM Plex Mono','IBM Plex Sans Arabic',sans-serif" : "'IBM Plex Mono',monospace";
    const sansFont = window.Site.state.lang === 'ar' ? "'IBM Plex Sans','IBM Plex Sans Arabic',sans-serif" : "'IBM Plex Sans',sans-serif";

    const W = 860;
    const { y, innerW, innerH } = window.ChartHelpers.scales({ padL, padT, padR, padB, W, H, n, maxV });
    const steps = 4;
    const grid = window.ChartHelpers.gridLines({ padL, padT, W, padR, maxV, steps, monoFont, y, fmtCompact });

    const slot = innerW / m;
    const barW = Math.min(Math.max(slot * 0.62, 3), 30);
    const baseline = padT + innerH;
    const xCenter = idx => padL + slot * ((idx - 1) + 0.5);

    if(chartActiveIdx !== null && (chartActiveIdx > n - 1 || chartActiveIdx < 1)) chartActiveIdx = null;
    const activeIdx = chartActiveIdx;

    const totalYears = res.totalMonths / 12;
    const maxLabels = Math.max(4, Math.floor(innerW / 34));
    const step = Math.max(1, Math.ceil(m / maxLabels));
    const labelIdxs = [];
    for(let i = 1; i < n; i += step) labelIdxs.push(i);
    if(labelIdxs[labelIdxs.length - 1] !== n - 1) labelIdxs.push(n - 1);

    let bars = '', xLabels = '';
    for(let idx = 1; idx < n; idx++){
      const total = res.snapshots[idx];
      const principal = res.contribSnapshots[idx];
      const gain = Math.max(total - principal, 0);
      const active = idx === activeIdx;
      const cx = xCenter(idx);
      const bx = (cx - barW / 2).toFixed(1);
      const yPrincipalPx = y(principal);
      const yTotalPx = y(total);

      let seg = `<rect class="bar-seg" x="${bx}" y="${yPrincipalPx.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(baseline - yPrincipalPx, 0).toFixed(1)}" fill="${active ? INVESTED_ACTIVE_COLOR : INVESTED_COLOR}"/>`;
      if(gain > 0){
        seg += `<rect class="bar-seg" x="${bx}" y="${yTotalPx.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(yPrincipalPx - yTotalPx, 0).toFixed(1)}" fill="${active ? RETURN_ACTIVE_COLOR : RETURN_COLOR}"/>`;
      }
      bars += `<g class="bar-col" data-idx="${idx}">
        <rect x="${(cx - slot/2).toFixed(1)}" y="${padT}" width="${slot.toFixed(1)}" height="${innerH.toFixed(1)}" fill="transparent"/>
        ${seg}
      </g>`;

      if(labelIdxs.includes(idx)){
        const isLast = idx === n - 1;
        const label = isLast && res.totalMonths % 12 !== 0
          ? totalYears.toLocaleString(locale(), {maximumFractionDigits:1})
          : String(idx);
        xLabels += `<text x="${cx.toFixed(1)}" y="${H-10}" text-anchor="middle" font-family="${monoFont}" font-size="11.5" fill="#7C7876">${label}</text>`;
      }
    }
    const axisCaption = `<text x="${padL}" y="${H+10}" text-anchor="start" font-family="${monoFont}" font-size="11.5" fill="#7C7876">${t('yearLabel')}</text>`;

    // Callout oben rechts im Diagramm: Jahr + Gesamtwert, dann die zwei
    // Bestandteile mit passenden Punkt-Farben — folgt dem gehoverten/angeklickten
    // Balken. Wird nur gebaut, wenn gerade ein Balken aktiv ist (Desktop: Hover,
    // Touch: Tap) — sonst bleibt das Diagramm ohne Callout.
    let callout = '';
    if(activeIdx !== null){
      const activeTotal = res.snapshots[activeIdx];
      const activePrincipal = res.contribSnapshots[activeIdx];
      const activeGain = Math.max(activeTotal - activePrincipal, 0);
      const activeIsLast = activeIdx === n - 1;
      const activeYearLabel = t('yearLabel') + ' ' + (activeIsLast && res.totalMonths % 12 !== 0
        ? totalYears.toLocaleString(locale(), {maximumFractionDigits:1})
        : activeIdx);

      const boxRight = W - padR;
      const boxLeft = boxRight - 220;
      const rowY = [padT + 8, padT + 30, padT + 50];
      // Weiße Karte hinter dem Callout, sonst verschwimmt der Text mit den
      // Gitterlinien/Balken dahinter, wenn man mitten im Diagramm hovert.
      const boxPad = 14;
      const boxX = boxLeft - boxPad, boxY = rowY[0] - 22;
      const boxW = (boxRight + boxPad) - boxX, boxH = (rowY[2] + 12) - boxY;
      callout = `
        <g font-family="${sansFont}">
          <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="12" fill="#FFFFFF" stroke="#E7E3DE"/>
          <text x="${boxLeft}" y="${rowY[0]}" text-anchor="start" font-size="14.5" font-weight="700" fill="#201E1F">${activeYearLabel}</text>
          <text x="${boxRight}" y="${rowY[0]}" text-anchor="end" font-size="14.5" font-weight="700" fill="#201E1F">${fmtEUR(activeTotal)}</text>

          <circle cx="${boxLeft + 4}" cy="${rowY[1]-4}" r="4" fill="${RETURN_COLOR}"/>
          <text x="${boxLeft + 14}" y="${rowY[1]}" text-anchor="start" font-family="${monoFont}" font-size="12" fill="#7C7876">${t('roiLegendReturn')}</text>
          <text x="${boxRight}" y="${rowY[1]}" text-anchor="end" font-size="13" font-weight="600" fill="#201E1F">${fmtEUR(activeGain)}</text>

          <circle cx="${boxLeft + 4}" cy="${rowY[2]-4}" r="4" fill="${INVESTED_COLOR}"/>
          <text x="${boxLeft + 14}" y="${rowY[2]}" text-anchor="start" font-family="${monoFont}" font-size="12" fill="#7C7876">${t('roiLegendInvested')}</text>
          <text x="${boxRight}" y="${rowY[2]}" text-anchor="end" font-size="13" font-weight="600" fill="#201E1F">${fmtEUR(activePrincipal)}</text>
        </g>`;
    }

    const svg = `
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block; overflow:visible;">
      ${grid}
      ${bars}
      ${xLabels}
      ${axisCaption}
      ${callout}
    </svg>`;
    $('spar-chart-svg').innerHTML = svg;
  }

  // Desktop (Maus vorhanden): Callout erscheint beim Hovern über einen Balken
  // und verschwindet wieder, sobald die Maus das Diagramm verlässt. Touch
  // (kein Hover): Callout bleibt nach dem Antippen stehen, bis ein anderer
  // Balken angetippt wird — Tippen simuliert dort keinen Hover-Zustand.
  const chartHoverCapable = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const sparChartSvg = $('spar-chart-svg');

  sparChartSvg.addEventListener('click', e=>{
    if(chartHoverCapable) return; // Desktop wird über Hover gesteuert, s.u.
    const col = e.target.closest('.bar-col');
    if(!col || !lastSeries) return;
    chartActiveIdx = parseInt(col.getAttribute('data-idx'), 10);
    drawChart(lastSeries);
  });

  if(chartHoverCapable){
    sparChartSvg.addEventListener('mouseover', e=>{
      const col = e.target.closest('.bar-col');
      if(!col || !lastSeries) return;
      const idx = parseInt(col.getAttribute('data-idx'), 10);
      if(idx === chartActiveIdx) return;
      chartActiveIdx = idx;
      drawChart(lastSeries);
    });
    sparChartSvg.addEventListener('mouseleave', ()=>{
      if(chartActiveIdx === null || !lastSeries) return;
      chartActiveIdx = null;
      drawChart(lastSeries);
    });
  }

  function renderTable(res){
    $('spar-th-return').textContent = t('roiColReturn') + ' (' + fmtPct(state.rendite,1) + ')';
    const body = $('spar-table-body');
    body.innerHTML = '';
    const totalYears = res.totalMonths/12;
    res.snapshots.forEach((val, idx)=>{
      const principal = res.contribSnapshots[idx];
      const gainYear = val - principal;
      const isLast = idx === res.snapshots.length-1;
      const yearLabel = (isLast && res.totalMonths % 12 !== 0)
        ? totalYears.toLocaleString(locale(),{maximumFractionDigits:1})
        : String(idx);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="col-year">${t('yearLabel')} ${yearLabel}</td>`
        + `<td>${fmtEUR(principal)}</td>`
        + `<td class="col-gain">${fmtEUR(gainYear)}</td>`
        + `<td class="col-total">${fmtEUR(val)}</td>`;
      body.appendChild(tr);
    });
  }

  function formatYears(months){
    const y = months/12;
    return y.toLocaleString(locale(),{minimumFractionDigits:1,maximumFractionDigits:1}) + ' ' + t('yearsUnit');
  }
  function formatYearsNumber(months){
    const y = months/12;
    const hasFraction = months % 12 !== 0;
    return y.toLocaleString(locale(), hasFraction
      ? {minimumFractionDigits:1,maximumFractionDigits:1}
      : {maximumFractionDigits:0});
  }
  function formatRateNumber(v){
    return v.toLocaleString(locale(),{maximumFractionDigits:1});
  }
  function buildExplanation(res, contributed, gain, displayFV){
    const lump = state.einmalActive && res.P0 > 0;
    let templateKey;
    if(state.target === 'anfangskapital'){
      // Hier ist P0 selbst die gesuchte Antwort — eine "mit/ohne Einmalanlage"-
      // Unterscheidung ergibt keinen Sinn, es gibt nur eine Fassung.
      templateKey = 'sparExplainAnfangskapital';
    } else if(state.target === 'rate'){
      templateKey = lump ? 'sparExplainRateLump' : 'sparExplainRateNoLump';
    } else if(state.target === 'laufzeit'){
      templateKey = lump ? 'sparExplainLaufzeitLump' : 'sparExplainLaufzeitNoLump';
    } else {
      templateKey = lump ? 'sparExplainEndkapitalLump' : 'sparExplainEndkapitalNoLump';
    }
    const template = t(templateKey);
    const b = txt => '<strong>' + txt + '</strong>';
    return template
      .replace('{p0}', b(fmtEUR(res.P0)))
      .replace('{c}', b(fmtEUR(res.C)))
      .replace('{years}', b(formatYearsNumber(res.N)))
      .replace('{rate}', b(formatRateNumber(state.rendite)))
      .replace('{fv}', b(fmtEUR(displayFV !== undefined ? displayFV : res.FV)))
      .replace('{contributed}', b(fmtEUR(contributed)))
      .replace('{gain}', b(fmtEUR(gain)));
  }

  function targetLabelKey(field){
    return {
      endkapital: 'sparTargetEndkapital',
      anfangskapital: 'sparTargetAnfangskapital',
      rate: 'sparTargetRate',
      laufzeit: 'sparTargetLaufzeit',
    }[field];
  }

  // Hält den Custom-Select-Button ("Was möchtest du berechnen?") und die
  // aktive Markierung im Menü synchron mit state.target — muss nach jeder
  // Auswahl UND nach jedem Sprachwechsel neu aufgerufen werden, weil der
  // Button-Text (anders als die <li>-Optionen) kein data-i18n hat, sondern
  // hier direkt gesetzt wird (er zeigt ja die aktuell GEWÄHLTE Option, nicht
  // immer dieselbe fixe Übersetzung).
  function syncTargetSelectUI(){
    $('spar-target-value').textContent = t(targetLabelKey(state.target));
    $('spar-target-select').querySelectorAll('[data-value]').forEach(li=>{
      const isActive = li.getAttribute('data-value') === state.target;
      li.classList.toggle('active', isActive);
      li.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function updateFieldVisibility(){
    // Jedes Feld wird versteckt, wenn es gerade das Rechenziel ist (dafür erscheint
    // das Ergebnis-Kästchen oben direkt unter der Auswahl).
    $('field-endkapital').style.display = state.target === 'endkapital' ? 'none' : '';
    $('field-laufzeit').style.display = state.target === 'laufzeit' ? 'none' : '';
    $('field-anfangskapital').style.display = state.target === 'anfangskapital' ? 'none' : '';
    $('field-rate').style.display = state.target === 'rate' ? 'none' : '';
  }

  // Bei hoch angesetzter Rendite (>20%) über viele Jahre wächst der Endbetrag
  // exponentiell — als volle Zahl ausgeschrieben (fmtEUR) wird die Ziffernfolge
  // so lang, dass sie in der Ergebnis-Box umbricht und die Box beim Ziehen des
  // Sliders sichtbar mitwächst. Ab einer gewissen Länge deshalb kompakt
  // formatieren (z.B. "12,3 Mio. €"), damit die Box stabil bleibt.
  function fmtBig(v){
    const full = fmtEUR(v);
    const digits = full.replace(/[^0-9]/g, '').length;
    return digits > 9 ? fmtCompact(v) : full;
  }

  function render(){
    const res = solve();
    const warningEl = $('calc-warning');

    if(res.invalid){
      warningEl.classList.add('show');
      $('stat-result').textContent = '–';
      $('stat-contributed').textContent = '–';
      $('stat-gain').textContent = '–';
      $('result-summary-explain').textContent = '';
      return;
    }
    warningEl.classList.remove('show');

    const contributed = res.P0 + res.C * res.N;
    const pretaxGain = res.FV - contributed;
    const taxRate = effectiveTaxRate();

    // Steuer fällt einmalig auf den Gesamtgewinn an (vereinfachte Annahme —
    // ignoriert Zeitpunkt und Häufigkeit realer Steuerzahlungen).
    let displayFV = res.FV, displayGain = pretaxGain;
    if(taxRate > 0){
      const taxAmount = Math.max(pretaxGain, 0) * taxRate;
      displayFV = res.FV - taxAmount;
      displayGain = pretaxGain - taxAmount;
    }

    let resultText;
    if(state.target === 'laufzeit') resultText = formatYears(res.N);
    else if(state.target === 'endkapital') resultText = fmtBig(displayFV);
    else if(state.target === 'anfangskapital') resultText = fmtBig(res.P0);
    else resultText = fmtBig(res.C);

    $('stat-result').textContent = resultText;
    $('tag-result').textContent = t(targetLabelKey(state.target));

    $('stat-contributed').textContent = fmtBig(contributed);
    $('stat-gain').textContent = fmtBig(displayGain);
    $('result-summary-explain').innerHTML = buildExplanation(res, contributed, displayGain, displayFV);

    const series = simulateSeries(res.P0, res.C, res.N, res.i);
    // Die Kurve wächst brutto weiter, nur der letzte Balken (Ende der
    // Laufzeit) bekommt die einmalige Steuer auf den Gesamtgewinn
    // abgezogen — die Zwischenjahre bleiben unversteuert dargestellt.
    if(taxRate > 0){
      const lastIdx = series.snapshots.length - 1;
      const finalGain = series.snapshots[lastIdx] - series.contribSnapshots[lastIdx];
      if(finalGain > 0) series.snapshots[lastIdx] -= finalGain * taxRate;
    }
    series.totalMonths = res.N;
    drawChart(series);
    renderTable(series);
  }

  function updateSliderLabels(){
    $('spar-years-input').value = state.years;
    $('spar-rendite-input').value = state.rendite;
  }

  $('spar-target-select').addEventListener('customselect:change', e=>{
    state.target = e.detail.value;
    syncTargetSelectUI();
    updateFieldVisibility();
    render();
  });

  // Anlagedauer: Slider und Zahlenfeld halten sich gegenseitig synchron
  $('spar-years').addEventListener('input', ()=>{
    state.years = parseInt($('spar-years').value);
    updateSliderLabels();
    render();
  });
  $('spar-years-input').addEventListener('input', e=>{
    let v = parseInt(e.target.value);
    if(isNaN(v)) return;
    v = Math.max(1, Math.min(60, v));
    state.years = v;
    $('spar-years').value = v;
    render();
  });

  // Erwartete Rendite: Slider und Zahlenfeld halten sich gegenseitig synchron
  $('spar-rendite').addEventListener('input', ()=>{
    state.rendite = parseFloat($('spar-rendite').value);
    updateSliderLabels();
    render();
  });
  $('spar-rendite-input').addEventListener('input', e=>{
    let v = parseFloat(e.target.value);
    if(isNaN(v)) return;
    v = Math.max(0, Math.min(50, v));
    state.rendite = v;
    $('spar-rendite').value = v;
    render();
  });

  $('spar-anfangskapital').addEventListener('input', e=>{ state.anfangskapital = parseFloat(e.target.value)||0; render(); });
  $('spar-rate').addEventListener('input', e=>{ state.rate = parseFloat(e.target.value)||0; render(); });
  $('spar-endkapital').addEventListener('input', e=>{ state.endkapital = parseFloat(e.target.value)||0; render(); });

  const swEinmal = $('sw-einmal'), fieldsEinmal = $('fields-einmal');
  swEinmal.addEventListener('click', ()=>{
    state.einmalActive = !state.einmalActive;
    swEinmal.classList.toggle('on', state.einmalActive);
    fieldsEinmal.classList.toggle('open', state.einmalActive);
    render();
  });

  const swTax = $('sw-tax'), fieldsTax = $('fields-tax');
  swTax.addEventListener('click', ()=>{
    state.taxActive = !state.taxActive;
    swTax.classList.toggle('on', state.taxActive);
    fieldsTax.classList.toggle('open', state.taxActive);
    render();
  });

  $('spar-kapst').addEventListener('input', e=>{
    const v = parseFloat(e.target.value);
    state.kapst = isNaN(v) ? 0 : v;
    render();
  });

  const swTeilfreistellung = $('sw-teilfreistellung'), fieldsTfq = $('fields-tfq');
  swTeilfreistellung.addEventListener('click', ()=>{
    state.teilfreistellungActive = !state.teilfreistellungActive;
    swTeilfreistellung.classList.toggle('on', state.teilfreistellungActive);
    fieldsTfq.classList.toggle('open', state.teilfreistellungActive);
    render();
  });

  $('spar-view-switch').querySelectorAll('.view-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const view = btn.getAttribute('data-view');
      $('spar-view-switch').querySelectorAll('.view-btn').forEach(b=> b.classList.toggle('active', b === btn));
      $('spar-chart-svg').style.display = view === 'chart' ? 'block' : 'none';
      $('spar-legend').style.display = view === 'chart' ? 'flex' : 'none';
      $('spar-table-view').style.display = view === 'table' ? 'block' : 'none';
    });
  });

  document.addEventListener('mwr:langchange', ()=>{ syncTargetSelectUI(); updateFieldVisibility(); updateSliderLabels(); render(); });
  document.addEventListener('mwr:currencychange', render);
  document.addEventListener('DOMContentLoaded', ()=>{
    syncTargetSelectUI();
    updateFieldVisibility();
    updateSliderLabels();
    render();
  });
})();
