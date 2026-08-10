// Logik NUR für rendite.html (Renditerechner / ROI).
(function(){
  const $ = id => document.getElementById(id);
  const { t, locale, fmtEUR, fmtCompact, fmtPct, textWidth } = window.Site;

  const state = {
    roiYears: 15, roiRendite: 7,
    roiEinmalActive: true, roiEinmalBetrag: 5000,
    roiSparplanActive: true, roiSparplanRate: 300,
  };

  function simulateROI(){
    const months = state.roiYears*12;
    const monthlyReturn = Math.pow(1+state.roiRendite/100, 1/12) - 1;
    let portfolio = 0, contributed = 0;
    const snapshots = [], contribSnapshots = [];

    if(state.roiEinmalActive){
      portfolio += state.roiEinmalBetrag;
      contributed += state.roiEinmalBetrag;
    }
    snapshots.push(portfolio);
    contribSnapshots.push(contributed);

    for(let m=1; m<=months; m++){
      if(state.roiSparplanActive){
        portfolio += state.roiSparplanRate;
        contributed += state.roiSparplanRate;
      }
      portfolio *= (1+monthlyReturn);
      if(m % 12 === 0){
        snapshots.push(portfolio);
        contribSnapshots.push(contributed);
      }
    }
    return { finalValue: portfolio, contributed, snapshots, contribSnapshots };
  }

  function drawROIChart(res){
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

    const x = i => padL + (innerW * i/(n-1));
    const y = v => padT + innerH - (innerH * (v/maxV));

    function pathFor(arr){
      return arr.map((v,i)=> (i===0?'M':'L') + x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
    }

    const pathValue = pathFor(res.snapshots);
    const pathContrib = pathFor(res.contribSnapshots);

    const forward = res.snapshots.map((v,i)=> x(i).toFixed(1)+','+y(v).toFixed(1)).join(' L ');
    const backward = res.contribSnapshots.slice().reverse().map((v,i)=>{
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
    $('roi-chart-svg').innerHTML = svg;
  }

  function renderRoiTable(res){
    $('roi-th-return').textContent = t('roiColReturn') + ' (' + fmtPct(state.roiRendite,1) + ')';
    const body = $('roi-table-body');
    body.innerHTML = '';
    res.snapshots.forEach((val, i)=>{
      const principal = res.contribSnapshots[i];
      const gainYear = val - principal;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="col-year">${t('yearLabel')} ${i}</td>`
        + `<td>${fmtEUR(principal)}</td>`
        + `<td class="col-gain">${fmtEUR(gainYear)}</td>`
        + `<td class="col-total">${fmtEUR(val)}</td>`;
      body.appendChild(tr);
    });
  }

  function render(){
    const res = simulateROI();
    const gain = res.finalValue - res.contributed;

    $('roi-final').textContent = fmtEUR(res.finalValue);
    $('roi-contributed').textContent = fmtEUR(res.contributed);
    $('roi-gain').textContent = fmtEUR(gain);
    $('roi-gain-pct').textContent = res.contributed > 0
      ? (gain/res.contributed*100).toLocaleString(locale(),{maximumFractionDigits:1}) + ' ' + t('diffPctSuffixRoi')
      : '';

    $('roi-b-contributed').textContent = fmtEUR(res.contributed);
    $('roi-b-gain').textContent = fmtEUR(gain);
    $('roi-b-total').textContent = fmtEUR(res.finalValue);

    drawROIChart(res);
    renderRoiTable(res);
  }

  function updateSliderLabels(){
    $('v-roi-years').textContent = state.roiYears + ' ' + t('yearsUnit');
    $('v-roi-rendite').textContent = fmtPct(state.roiRendite, 1);
  }

  $('roi-years').addEventListener('input', ()=>{ state.roiYears = parseInt($('roi-years').value); updateSliderLabels(); render(); });
  $('roi-rendite').addEventListener('input', ()=>{ state.roiRendite = parseFloat($('roi-rendite').value); updateSliderLabels(); render(); });
  $('roi-einmal-betrag').addEventListener('input', e=>{ state.roiEinmalBetrag = parseFloat(e.target.value)||0; render(); });
  $('roi-sparplan-rate').addEventListener('input', e=>{ state.roiSparplanRate = parseFloat(e.target.value)||0; render(); });

  function bindSwitch(swId, fieldsId, key){
    const sw = $(swId), fields = $(fieldsId);
    sw.addEventListener('click', ()=>{
      state[key] = !state[key];
      sw.classList.toggle('on', state[key]);
      fields.classList.toggle('open', state[key]);
      render();
    });
  }
  bindSwitch('sw-roi-einmal','fields-roi-einmal','roiEinmalActive');
  bindSwitch('sw-roi-sparplan','fields-roi-sparplan','roiSparplanActive');

  $('roi-view-switch').querySelectorAll('.view-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const view = btn.getAttribute('data-view');
      $('roi-view-switch').querySelectorAll('.view-btn').forEach(b=> b.classList.toggle('active', b === btn));
      $('roi-chart-svg').style.display = view === 'chart' ? 'block' : 'none';
      $('roi-legend').style.display = view === 'chart' ? 'flex' : 'none';
      $('roi-table-view').style.display = view === 'table' ? 'block' : 'none';
    });
  });

  document.addEventListener('mwr:langchange', ()=>{ updateSliderLabels(); render(); });
  document.addEventListener('DOMContentLoaded', ()=>{ updateSliderLabels(); render(); });
})();
