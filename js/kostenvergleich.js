// Logik NUR für index.html (Kostenrechner: ETF vs. Fonds).
(function(){
  const $ = id => document.getElementById(id);
  const { t, locale, fmtEUR, fmtCompact, fmtPct, textWidth } = window.Site;

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
    const maxV = Math.max(...noCost.snapshots) * 1.06;
    const monoFont = window.Site.state.lang === 'ar' ? 'IBM Plex Sans Arabic' : 'IBM Plex Mono';
    const sansFont = window.Site.state.lang === 'ar' ? 'IBM Plex Sans Arabic' : 'IBM Plex Sans';

    const finalGap = etf.snapshots[n-1] - fonds.snapshots[n-1];
    const etfWinsChart = finalGap >= 0;
    const valueText = '+' + fmtCompact(Math.abs(finalGap));
    const labelText = etfWinsChart ? t('calloutLabel') : t('calloutLabelFonds');
    const valueW = textWidth(valueText, `700 14.5px ${sansFont}`);
    const labelW = textWidth(labelText, `11px ${monoFont}`);
    const calloutW = Math.max(valueW, labelW);
    const padR = Math.max(calloutW + 8 + 10, 40);

    const W = 860;
    const innerW = W - padL - padR, innerH = H - padT - padB;

    const x = i => padL + (innerW * i/(n-1));
    const y = v => padT + innerH - (innerH * (v/maxV));

    function pathFor(arr){
      return arr.map((v,i)=> (i===0?'M':'L') + x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
    }

    const pathNoCost = pathFor(noCost.snapshots);
    const pathETF = pathFor(etf.snapshots);
    const pathFonds = pathFor(fonds.snapshots);

    const forward = etf.snapshots.map((v,i)=> x(i).toFixed(1)+','+y(v).toFixed(1)).join(' L ');
    const backward = fonds.snapshots.slice().reverse().map((v,i)=>{
      const idx = n-1-i;
      return x(idx).toFixed(1)+','+y(v).toFixed(1);
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

    const xLabels = [0, Math.round((n-1)/2), n-1].map(i=>{
      return `<text x="${x(i).toFixed(1)}" y="${H-10}" text-anchor="middle" font-family="${monoFont}" font-size="11.5" fill="#5B7167">${t('yearLabel')} ${i}</text>`;
    }).join('');

    const calloutY = y(etfWinsChart ? etf.snapshots[n-1] : fonds.snapshots[n-1]);
    const calloutColor = etfWinsChart ? '#173C2E' : '#8B72E8';

    const svg = `
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block; overflow:visible;">
      ${grid}
      <path d="${gapPath}" fill="#8FE07C" fill-opacity="0.25" stroke="none"/>
      <path d="${pathNoCost}" fill="none" stroke="#9AAA9F" stroke-width="1.5" stroke-dasharray="4 4"/>
      <path d="${pathFonds}" fill="none" stroke="#8B72E8" stroke-width="2.5"/>
      <path d="${pathETF}" fill="none" stroke="#173C2E" stroke-width="2.5"/>
      ${xLabels}
      <g transform="translate(${x(n-1)+8}, ${calloutY.toFixed(1)})">
        <text x="0" y="-6" font-family="${sansFont}" font-size="14.5" font-weight="700" fill="${calloutColor}">${valueText}</text>
        <text x="0" y="10" font-family="${monoFont}" font-size="11" fill="#5B7167">${labelText}</text>
      </g>
    </svg>`;
    $('chart-svg').innerHTML = svg;
  }

  function render(){
    const noCost = simulate(0, 0);
    const etf = simulate(state.etfOrder, state.etfTer);
    const fonds = simulate(state.fondsAA, state.fondsTer);

    $('r-etf').textContent = fmtEUR(etf.finalValue);
    $('r-fonds').textContent = fmtEUR(fonds.finalValue);
    const diff = etf.finalValue - fonds.finalValue;
    const etfWins = diff >= 0;
    $('tag-diff').textContent = etfWins ? t('etf') : t('fonds');
    $('k-diff').textContent = etfWins ? t('statAdvantage') : t('fondsAdvantage');
    $('r-diff').textContent = fmtEUR(Math.abs(diff));
    const pctBase = etfWins ? fonds.finalValue : etf.finalValue;
    const pctSuffix = etfWins ? t('diffPctSuffix') : t('diffPctSuffixFonds');
    $('r-diff-pct').textContent = pctBase > 0
      ? ((Math.abs(diff)/pctBase)*100).toLocaleString(locale(),{maximumFractionDigits:1}) + ' ' + pctSuffix
      : '';

    const etfGesamt = noCost.finalValue - etf.finalValue;
    const fondsGesamt = noCost.finalValue - fonds.finalValue;

    $('b-eingezahlt-etf').textContent = fmtEUR(etf.contributed);
    $('b-eingezahlt-fonds').textContent = fmtEUR(fonds.contributed);
    $('b-direkt-etf').textContent = fmtEUR(etf.feesPaid);
    $('b-direkt-fonds').textContent = fmtEUR(fonds.feesPaid);
    $('b-ter-etf').textContent = fmtEUR(etfGesamt - etf.feesPaid);
    $('b-ter-fonds').textContent = fmtEUR(fondsGesamt - fonds.feesPaid);
    $('b-gesamt-etf').textContent = fmtEUR(etfGesamt);
    $('b-gesamt-fonds').textContent = fmtEUR(fondsGesamt);

    drawChart(noCost, etf, fonds);
  }

  function updateSliderLabels(){
    $('v-years').textContent = state.years + ' ' + t('yearsUnit');
    $('v-rendite').textContent = fmtPct(state.rendite, 1);
    $('v-etf-order').textContent = fmtPct(state.etfOrder, 2);
    $('v-etf-ter').textContent = fmtPct(state.etfTer, 2);
    $('v-fonds-aa').textContent = fmtPct(state.fondsAA, 2);
    $('v-fonds-ter').textContent = fmtPct(state.fondsTer, 2);
  }

  $('years').addEventListener('input', ()=>{ state.years = parseInt($('years').value); updateSliderLabels(); render(); });
  $('rendite').addEventListener('input', ()=>{ state.rendite = parseFloat($('rendite').value); updateSliderLabels(); render(); });
  $('etf-order').addEventListener('input', ()=>{ state.etfOrder = parseFloat($('etf-order').value); updateSliderLabels(); render(); });
  $('etf-ter').addEventListener('input', ()=>{ state.etfTer = parseFloat($('etf-ter').value); updateSliderLabels(); render(); });
  $('fonds-aa').addEventListener('input', ()=>{ state.fondsAA = parseFloat($('fonds-aa').value); updateSliderLabels(); render(); });
  $('fonds-ter').addEventListener('input', ()=>{ state.fondsTer = parseFloat($('fonds-ter').value); updateSliderLabels(); render(); });
  $('einmal-betrag').addEventListener('input', e=>{ state.einmalBetrag = parseFloat(e.target.value)||0; render(); });
  $('sparplan-rate').addEventListener('input', e=>{ state.sparplanRate = parseFloat(e.target.value)||0; render(); });

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
  document.addEventListener('DOMContentLoaded', ()=>{ updateSliderLabels(); render(); });
})();
