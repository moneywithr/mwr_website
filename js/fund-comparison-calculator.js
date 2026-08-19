// Logik NUR für index.html (Kostenrechner: ETF vs. Fonds).
(function(){
  const $ = id => document.getElementById(id);
  const { t, locale, fmtEUR, fmtCompact, textWidth } = window.Site;

  const state = {
    years: 20, rendite: 7,
    einmalActive: true, einmalBetrag: 10000,
    sparplanActive: true, sparplanRate: 200,
    etfOrder: 0.2, etfTer: 0.2,
    fondsAA: 3, fondsTer: 1.5,
  };

  function simulate(orderFeePct, terPct){
    const months = state.years*12;
    const monthlyReturn = Math.pow(1+state.rendite/100, 1/12) - 1;
    const monthlyTERFactor = Math.pow(1-terPct/100, 1/12);
    let portfolio = 0, contributed = 0, feesPaid = 0;
    const snapshots = [];

    if(state.einmalActive){
      let amount = state.einmalBetrag;
      contributed += amount;
      const fee = amount * (orderFeePct/100);
      feesPaid += fee;
      amount -= fee;
      portfolio += amount;
    }
    snapshots.push(portfolio);

    for(let m=1; m<=months; m++){
      if(state.sparplanActive){
        let rate = state.sparplanRate;
        contributed += rate;
        const fee = rate * (orderFeePct/100);
        feesPaid += fee;
        rate -= fee;
        portfolio += rate;
      }
      portfolio *= (1+monthlyReturn) * monthlyTERFactor;
      if(m % 12 === 0) snapshots.push(portfolio);
    }
    return { finalValue: portfolio, contributed, feesPaid, snapshots };
  }

  function drawChart(noCost, etf, fonds){
    const H = 360, padL = 56, padT = 20, padB = 34;
    const n = noCost.snapshots.length;
    const maxV = Math.max(...noCost.snapshots) * 1.06 || 1; // Fallback verhindert Division durch 0, wenn nie eingezahlt wird
    // Ziffern bleiben in Mono/Sans wie bei DE/EN (nicht IBM Plex Sans Arabic) —
    // die Arabic-Schrift greift nur als Fallback für tatsächliche arabische
    // Buchstaben, die in denselben <text>-Elementen vorkommen (z.B. "سنة 5").
    const monoFont = window.Site.state.lang === 'ar' ? "'IBM Plex Mono','IBM Plex Sans Arabic',sans-serif" : "'IBM Plex Mono',monospace";
    const sansFont = window.Site.state.lang === 'ar' ? "'IBM Plex Sans','IBM Plex Sans Arabic',sans-serif" : "'IBM Plex Sans',sans-serif";

    const finalGap = etf.snapshots[n-1] - fonds.snapshots[n-1];
    const etfWinsChart = finalGap >= 0;
    const valueText = '+' + fmtCompact(Math.abs(finalGap));
    const labelText = etfWinsChart ? t('calloutLabel') : t('calloutLabelFonds');
    const valueW = textWidth(valueText, `700 14.5px ${sansFont}`);
    const labelW = textWidth(labelText, `11px ${monoFont}`);
    const calloutW = Math.max(valueW, labelW);
    const padR = Math.max(calloutW + 8 + 10, 40);

    const W = 860;
    const { x, y } = window.ChartHelpers.scales({ padL, padT, padR, padB, W, H, n, maxV });

    const pathETF = window.ChartHelpers.pathFor(etf.snapshots, x, y);
    const pathFonds = window.ChartHelpers.pathFor(fonds.snapshots, x, y);
    const gapPath = window.ChartHelpers.areaBetween(etf.snapshots, fonds.snapshots, x, y);

    const steps = 4;
    const grid = window.ChartHelpers.gridLines({ padL, padT, W, padR, maxV, steps, monoFont, y, fmtCompact });

    const xLabels = [0, Math.round((n-1)/2), n-1].map(i=>{
      return `<text x="${x(i).toFixed(1)}" y="${H-10}" text-anchor="middle" font-family="${monoFont}" font-size="11.5" fill="#7C7876">${t('yearLabel')} ${i}</text>`;
    }).join('');

    const calloutY = y(etfWinsChart ? etf.snapshots[n-1] : fonds.snapshots[n-1]);
    const calloutColor = etfWinsChart ? '#1FA971' : '#5347A8';

    const svg = `
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block; overflow:visible;">
      ${grid}
      <path d="${gapPath}" fill="#685CC8" fill-opacity="0.14" stroke="none"/>
      <path d="${pathFonds}" fill="none" stroke="#5347A8" stroke-width="2.5"/>
      <path d="${pathETF}" fill="none" stroke="#1FA971" stroke-width="2.5"/>
      ${xLabels}
      <g transform="translate(${x(n-1)+8}, ${calloutY.toFixed(1)})">
        <text x="0" y="-6" font-family="${sansFont}" font-size="14.5" font-weight="700" fill="${calloutColor}">${valueText}</text>
        <text x="0" y="10" font-family="${monoFont}" font-size="11" fill="#7C7876">${labelText}</text>
      </g>
    </svg>`;
    $('chart-svg').innerHTML = svg;
  }

  // Bei hoch angesetzter Rendite (>20%) über viele Jahre wachsen die Beträge
  // exponentiell — als volle Zahl ausgeschrieben (fmtEUR) wird die Ziffernfolge
  // so lang, dass sie in den Ergebnis-Boxen umbricht und diese sichtbar
  // mitwachsen. Ab einer gewissen Länge deshalb kompakt formatieren (z.B.
  // "12,3 Mio. €"), damit die Boxen stabil bleiben. Siehe investment-calculator.js.
  function fmtBig(v){
    const full = fmtEUR(v);
    const digits = full.replace(/[^0-9]/g, '').length;
    return digits > 9 ? fmtCompact(v) : full;
  }

  function render(){
    const noCost = simulate(0, 0);
    const etf = simulate(state.etfOrder, state.etfTer);
    const fonds = simulate(state.fondsAA, state.fondsTer);

    $('r-etf').textContent = fmtBig(etf.finalValue);
    $('r-fonds').textContent = fmtBig(fonds.finalValue);
    const diff = etf.finalValue - fonds.finalValue;
    const etfWins = diff >= 0;
    $('k-diff').textContent = etfWins ? t('diffWinnerEtf') : t('diffWinnerFonds');
    $('r-diff').textContent = fmtBig(Math.abs(diff));
    const pctBase = etfWins ? fonds.finalValue : etf.finalValue;
    const pctSuffix = etfWins ? t('diffPctSuffix') : t('diffPctSuffixFonds');
    $('r-diff-pct').textContent = pctBase > 0
      ? ((Math.abs(diff)/pctBase)*100).toLocaleString(locale(),{maximumFractionDigits:1}) + ' ' + pctSuffix
      : '';

    const etfGesamt = noCost.finalValue - etf.finalValue;
    const fondsGesamt = noCost.finalValue - fonds.finalValue;

    $('b-eingezahlt-etf').textContent = fmtBig(etf.contributed);
    $('b-eingezahlt-fonds').textContent = fmtBig(fonds.contributed);
    $('b-direkt-etf').textContent = fmtBig(etf.feesPaid);
    $('b-direkt-fonds').textContent = fmtBig(fonds.feesPaid);
    $('b-ter-etf').textContent = fmtBig(etfGesamt - etf.feesPaid);
    $('b-ter-fonds').textContent = fmtBig(fondsGesamt - fonds.feesPaid);
    $('b-gesamt-etf').textContent = fmtBig(etfGesamt);
    $('b-gesamt-fonds').textContent = fmtBig(fondsGesamt);

    drawChart(noCost, etf, fonds);
  }

  function updateSliderLabels(){
    $('years-input').value = state.years;
    $('rendite-input').value = state.rendite;
    $('etf-order-input').value = state.etfOrder;
    $('etf-ter-input').value = state.etfTer;
    $('fonds-aa-input').value = state.fondsAA;
    $('fonds-ter-input').value = state.fondsTer;
  }

  // Anlagedauer: Slider und Zahlenfeld halten sich gegenseitig synchron
  $('years').addEventListener('input', ()=>{ state.years = parseInt($('years').value); updateSliderLabels(); render(); });
  $('years-input').addEventListener('input', e=>{
    let v = parseInt(e.target.value);
    if(isNaN(v)) return;
    v = Math.max(1, Math.min(60, v));
    state.years = v;
    $('years').value = v;
    render();
  });

  // Erwartete Rendite: Slider und Zahlenfeld halten sich gegenseitig synchron
  $('rendite').addEventListener('input', ()=>{ state.rendite = parseFloat($('rendite').value); updateSliderLabels(); render(); });
  $('rendite-input').addEventListener('input', e=>{
    let v = parseFloat(e.target.value);
    if(isNaN(v)) return;
    v = Math.max(0, Math.min(50, v));
    state.rendite = v;
    $('rendite').value = v;
    render();
  });

  function bindFeeField(sliderId, inputId, key, min, max){
    $(sliderId).addEventListener('input', ()=>{ state[key] = parseFloat($(sliderId).value); updateSliderLabels(); render(); });
    $(inputId).addEventListener('input', e=>{
      let v = parseFloat(e.target.value);
      if(isNaN(v)) return;
      v = Math.max(min, Math.min(max, v));
      state[key] = v;
      $(sliderId).value = v;
      render();
    });
  }
  bindFeeField('etf-order', 'etf-order-input', 'etfOrder', 0, 2);
  bindFeeField('etf-ter', 'etf-ter-input', 'etfTer', 0, 2);
  bindFeeField('fonds-aa', 'fonds-aa-input', 'fondsAA', 0, 6);
  bindFeeField('fonds-ter', 'fonds-ter-input', 'fondsTer', 0, 3);
  // Negative Beträge ergeben hier keinen Sinn, siehe investment-calculator.js.
  $('einmal-betrag').addEventListener('input', e=>{
    const v = Math.max(0, parseFloat(e.target.value)||0);
    state.einmalBetrag = v;
    if(parseFloat(e.target.value) < 0) e.target.value = v;
    render();
  });
  $('sparplan-rate').addEventListener('input', e=>{
    const v = Math.max(0, parseFloat(e.target.value)||0);
    state.sparplanRate = v;
    if(parseFloat(e.target.value) < 0) e.target.value = v;
    render();
  });

  function bindSwitch(swId, fieldsId, key){
    const sw = $(swId), fields = $(fieldsId);
    sw.addEventListener('click', ()=>{
      state[key] = !state[key];
      sw.classList.toggle('on', state[key]);
      fields.classList.toggle('open', state[key]);
      render();
    });
  }
  bindSwitch('sw-einmal','fields-einmal','einmalActive');
  bindSwitch('sw-sparplan','fields-sparplan','sparplanActive');

  document.addEventListener('mwr:langchange', ()=>{ updateSliderLabels(); render(); });
  document.addEventListener('mwr:currencychange', render);
  document.addEventListener('DOMContentLoaded', ()=>{ updateSliderLabels(); render(); });

  window.SavedResults.init({
    cookieKey: 'fund_fees',
    insertAfter: document.querySelector('.chart-panel'),
    fields: [
      { type:'value', id:'years-input' },
      { type:'value', id:'rendite-input' },
      { type:'switch', id:'sw-einmal' },
      { type:'value', id:'einmal-betrag' },
      { type:'switch', id:'sw-sparplan' },
      { type:'value', id:'sparplan-rate' },
      { type:'value', id:'etf-order' },
      { type:'value', id:'etf-ter' },
      { type:'value', id:'fonds-aa' },
      { type:'value', id:'fonds-ter' },
    ],
  });
})();
