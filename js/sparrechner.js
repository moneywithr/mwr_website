// Logik NUR für index.html (Sparrechner: Endkapital / Anfangskapital / Rate / Laufzeit).
// Modell: Anfangskapital wird zu Beginn eingezahlt, danach wird pro Monat zuerst die
// Rate eingezahlt und dann das gesamte Kapital mit der monatlichen Rendite verzinst.
(function(){
  const $ = id => document.getElementById(id);
  const { t, locale, fmtEUR, fmtCompact, fmtPct, textWidth } = window.Site;

  const state = {
    target: 'rate', // 'endkapital' | 'anfangskapital' | 'rate' | 'laufzeit'
    years: 15,
    rendite: 7,
    einmalActive: true,
    anfangskapital: 5000,
    rate: 300,
    endkapital: 100000,
  };

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

    if(!invalid && state.target !== 'endkapital'){
      FV = computeFV(P0, C, N, i);
    }

    return { P0, C, N, FV, i, invalid };
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

  function drawChart(res){
    const H = 360, padL = 56, padT = 20, padB = 34;
    const n = res.snapshots.length;
    const maxV = Math.max(...res.snapshots) * 1.06;
    const monoFont = window.Site.state.lang === 'ar' ? 'IBM Plex Sans Arabic' : 'IBM Plex Mono';
    const sansFont = window.Site.state.lang === 'ar' ? 'IBM Plex Sans Arabic' : 'IBM Plex Sans';

    const finalGain = res.snapshots[n-1] - res.contribSnapshots[n-1];
    const valueText = '+' + fmtCompact(Math.max(finalGain,0));
    const labelText = t('roiCalloutLabel');
    const valueW = textWidth(valueText, `700 14.5px ${sansFont}`);
    const labelW = textWidth(labelText, `11px ${monoFont}`);
    const calloutW = Math.max(valueW, labelW);
    const padR = Math.max(calloutW + 8 + 10, 40);

    const W = 860;
    const innerW = W - padL - padR, innerH = H - padT - padB;

    const x = idx => padL + (innerW * idx/(n-1));
    const y = v => padT + innerH - (innerH * (v/maxV));

    function pathFor(arr){
      return arr.map((v,idx)=> (idx===0?'M':'L') + x(idx).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
    }

    const pathValue = pathFor(res.snapshots);
    const pathContrib = pathFor(res.contribSnapshots);

    const forward = res.snapshots.map((v,idx)=> x(idx).toFixed(1)+','+y(v).toFixed(1)).join(' L ');
    const backward = res.contribSnapshots.slice().reverse().map((v,idx)=>{
      const i2 = n-1-idx;
      return x(i2).toFixed(1)+','+y(v).toFixed(1);
    }).join(' L ');
    const gapPath = 'M ' + forward + ' L ' + backward + ' Z';

    let grid = '';
    const steps = 4;
    for(let s=0; s<=steps; s++){
      const val = maxV * s/steps;
      const gy = y(val);
      grid += `<line x1="${padL}" y1="${gy.toFixed(1)}" x2="${W-padR}" y2="${gy.toFixed(1)}" stroke="#C9E8C0" stroke-width="1"/>`;
      grid += `<text x="${padL-8}" y="${(gy+4).toFixed(1)}" text-anchor="end" font-family="${monoFont}" font-size="11.5" fill="#5B7167">${fmtCompact(val)}</text>`;
    }

    const totalYears = res.totalMonths/12;
    const xLabels = [0, Math.round((n-1)/2), n-1].map((idx)=>{
      const isLast = idx === n-1;
      const label = isLast
        ? t('yearLabel') + ' ' + totalYears.toLocaleString(locale(),{maximumFractionDigits:1})
        : t('yearLabel') + ' ' + idx;
      return `<text x="${x(idx).toFixed(1)}" y="${H-10}" text-anchor="middle" font-family="${monoFont}" font-size="11.5" fill="#5B7167">${label}</text>`;
    }).join('');

    const calloutY = y(res.snapshots[n-1]);

    const svg = `
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block; overflow:visible;">
      ${grid}
      <path d="${gapPath}" fill="#8FE07C" fill-opacity="0.25" stroke="none"/>
      <path d="${pathContrib}" fill="none" stroke="#9AAA9F" stroke-width="1.5" stroke-dasharray="4 4"/>
      <path d="${pathValue}" fill="none" stroke="#173C2E" stroke-width="2.5"/>
      ${xLabels}
      <g transform="translate(${x(n-1)+8}, ${calloutY.toFixed(1)})">
        <text x="0" y="-6" font-family="${sansFont}" font-size="14.5" font-weight="700" fill="#173C2E">${valueText}</text>
        <text x="0" y="10" font-family="${monoFont}" font-size="11" fill="#5B7167">${labelText}</text>
      </g>
    </svg>`;
    $('spar-chart-svg').innerHTML = svg;
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
  function buildExplanation(res, contributed, gain){
    const template = state.einmalActive && res.P0 > 0 ? t('sparExplainLump') : t('sparExplainNoLump');
    const b = txt => '<strong>' + txt + '</strong>';
    return template
      .replace('{p0}', b(fmtEUR(res.P0)))
      .replace('{c}', b(fmtEUR(res.C)))
      .replace('{years}', b(formatYearsNumber(res.N)))
      .replace('{rate}', b(formatRateNumber(state.rendite)))
      .replace('{fv}', b(fmtEUR(res.FV)))
      .replace('{contributed}', b(fmtEUR(contributed)))
      .replace('{gain}', b(fmtEUR(gain)));
  }

  function resultDescKey(field){
    return {
      endkapital: 'sparResultEndkapital',
      anfangskapital: 'sparResultAnfangskapital',
      rate: 'sparResultRate',
      laufzeit: 'sparResultLaufzeit',
    }[field];
  }
  function targetLabelKey(field){
    return {
      endkapital: 'sparTargetEndkapital',
      anfangskapital: 'sparTargetAnfangskapital',
      rate: 'sparTargetRate',
      laufzeit: 'sparTargetLaufzeit',
    }[field];
  }

  function updateFieldVisibility(){
    // Jedes Feld wird versteckt, wenn es gerade das Rechenziel ist (dafür erscheint
    // das Ergebnis-Kästchen oben direkt unter der Auswahl).
    $('field-endkapital').style.display = state.target === 'endkapital' ? 'none' : '';
    $('field-laufzeit').style.display = state.target === 'laufzeit' ? 'none' : '';
    $('field-anfangskapital').style.display = state.target === 'anfangskapital' ? 'none' : '';
    $('field-rate').style.display = state.target === 'rate' ? 'none' : '';

    $('result-desc').textContent = t(resultDescKey(state.target));
    $('result-desc-card').textContent = t(resultDescKey(state.target));
  }

  function render(){
    const res = solve();
    const warningEl = $('calc-warning');
    const resultBox = $('result-box-top');

    if(res.invalid){
      warningEl.classList.add('show');
      resultBox.classList.add('invalid');
      $('stat-result-top').textContent = '–';
      $('stat-result').textContent = '–';
      $('stat-contributed').textContent = '–';
      $('stat-gain').textContent = '–';
      $('stat-gain-pct').textContent = '';
      $('spar-b-contributed').textContent = '–';
      $('spar-b-gain').textContent = '–';
      $('spar-b-total').textContent = '–';
      $('result-explain').textContent = '';
      return;
    }
    warningEl.classList.remove('show');
    resultBox.classList.remove('invalid');

    let resultText;
    if(state.target === 'laufzeit') resultText = formatYears(res.N);
    else if(state.target === 'endkapital') resultText = fmtEUR(res.FV);
    else if(state.target === 'anfangskapital') resultText = fmtEUR(res.P0);
    else resultText = fmtEUR(res.C);

    $('stat-result-top').textContent = resultText;
    $('stat-result').textContent = resultText;
    $('tag-result').textContent = t(targetLabelKey(state.target));

    const contributed = res.P0 + res.C * res.N;
    const gain = res.FV - contributed;
    $('stat-contributed').textContent = fmtEUR(contributed);
    $('stat-gain').textContent = fmtEUR(gain);
    $('stat-gain-pct').textContent = contributed > 0
      ? (gain/contributed*100).toLocaleString(locale(),{maximumFractionDigits:1}) + ' ' + t('diffPctSuffixRoi')
      : '';

    $('spar-b-contributed').textContent = fmtEUR(contributed);
    $('spar-b-gain').textContent = fmtEUR(gain);
    $('spar-b-total').textContent = fmtEUR(res.FV);
    $('result-explain').innerHTML = buildExplanation(res, contributed, gain);

    const series = simulateSeries(res.P0, res.C, res.N, res.i);
    series.totalMonths = res.N;
    drawChart(series);
    renderTable(series);
  }

  function updateSliderLabels(){
    $('spar-years-input').value = state.years;
    $('spar-rendite-input').value = state.rendite;
  }

  $('spar-target').addEventListener('change', e=>{
    state.target = e.target.value;
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
    v = Math.max(0, Math.min(20, v));
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

  $('spar-view-switch').querySelectorAll('.view-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const view = btn.getAttribute('data-view');
      $('spar-view-switch').querySelectorAll('.view-btn').forEach(b=> b.classList.toggle('active', b === btn));
      $('spar-chart-svg').style.display = view === 'chart' ? 'block' : 'none';
      $('spar-legend').style.display = view === 'chart' ? 'flex' : 'none';
      $('spar-table-view').style.display = view === 'table' ? 'block' : 'none';
    });
  });

  document.addEventListener('mwr:langchange', ()=>{ updateFieldVisibility(); updateSliderLabels(); render(); });
  document.addEventListener('DOMContentLoaded', ()=>{
    $('spar-target').value = state.target;
    updateFieldVisibility();
    updateSliderLabels();
    render();
  });
})();
