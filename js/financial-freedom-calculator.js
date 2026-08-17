// Logik NUR für calculator/financial_freedom/index.html (FIRE-Rechner).
// Modell: Wie viel Kapital brauchst du, um von deinen Kapitalerträgen zu leben,
// und wie viel musst du dafür monatlich sparen. Angelehnt an den Aufbau von
// investment-calculator.js (state/solve/render), aber ohne Diagramm und ohne
// Steuerberechnung (bewusst weggelassen, um den Rechner einfach zu halten).
(function(){
  const $ = id => document.getElementById(id);
  const { t, locale, fmtEUR, fmtCompact } = window.Site;

  const state = {
    netOutcome: 1200,
    interest: 7,
    inflationActive: false,
    inflationRate: 2,
    actualAge: 30,
    goalAge: 60,
    depletionActive: false,
    lifetimeAge: 90,
    capital: 5000,
  };

  function monthlyRateFromAnnual(annualPct){
    return Math.pow(1 + annualPct/100, 1/12) - 1;
  }

  // Monatliche Sparrate als Annuität: Einzahlung zu Beginn des Monats verzinst
  // sich noch im selben Monat mit (wie computeFV in investment-calculator.js).
  function solvePayments(target, N, rm){
    if(N <= 0 || target <= 0) return 0;
    if(Math.abs(rm) < 1e-9) return target / N;
    const f = Math.pow(1+rm, N);
    const k = (1+rm)*(f-1)/rm;
    return target / k;
  }

  function solve(){
    const nAcc = Math.round((state.goalAge - state.actualAge) * 12);
    if(nAcc <= 0) return { invalid: true };

    const realAnnual = state.interest - (state.inflationActive ? state.inflationRate : 0);
    // Schutz vor extremen Eingaben (sehr hohe Inflation bei 0% Rendite): bei
    // realAnnual <= -100% würde (1+i)^(1/12) auf 0 gehen und die Formeln
    // unten durch 0 teilen (Infinity/NaN im Ergebnis).
    if(realAnnual <= -100) return { invalid: true };
    const rm = monthlyRateFromAnnual(realAnnual);

    let neededCapital, mWithdraw = null;
    if(state.depletionActive){
      mWithdraw = Math.round((state.lifetimeAge - state.goalAge) * 12);
      if(mWithdraw <= 0) return { invalid: true };
      if(Math.abs(rm) < 1e-9){
        neededCapital = state.netOutcome * mWithdraw;
      } else {
        neededCapital = state.netOutcome * (1 - Math.pow(1+rm, -mWithdraw)) / rm;
      }
    } else {
      if(rm <= 0) return { invalid: true };
      neededCapital = state.netOutcome / rm;
    }

    const fvCapital = state.capital * Math.pow(1+rm, nAcc);
    const remaining = Math.max(0, neededCapital - fvCapital);
    const payments = solvePayments(remaining, nAcc, rm);

    return { invalid: false, neededCapital, capitalGrown: fvCapital, remaining, payments, nAcc, mWithdraw };
  }

  function fmtBig(v){
    const full = fmtEUR(v);
    const digits = full.replace(/[^0-9]/g, '').length;
    return digits > 9 ? fmtCompact(v) : full;
  }

  function buildExplanation(res){
    const template = t('fireResultExplain');
    const b = txt => '<strong>' + txt + '</strong>';
    const interestStr = state.interest.toLocaleString(locale(), {maximumFractionDigits:1}) + '%';
    return template
      .replace('{payments}', b(fmtBig(res.payments)))
      .replace('{years}', b(String(Math.round(res.nAcc/12))))
      .replace('{interest}', b(interestStr))
      .replace('{needed}', b(fmtBig(res.neededCapital)))
      .replace('{netOutcome}', b(fmtBig(state.netOutcome)));
  }

  function updateAgeNotes(){
    const yearsToFreedom = Math.max(0, state.goalAge - state.actualAge);
    $('fire-years-to-freedom').textContent = t('fireYearsToFreedom').replace('{years}', yearsToFreedom);
    const yearsAfter = Math.max(0, state.lifetimeAge - state.goalAge);
    $('fire-years-after-freedom').textContent = t('fireYearsAfterFreedom').replace('{years}', yearsAfter);
  }

  function render(){
    updateAgeNotes();
    const res = solve();
    const warningEl = $('fire-warning');

    if(res.invalid){
      warningEl.classList.add('show');
      $('fire-stat-needed').textContent = '–';
      $('fire-stat-needed-card').textContent = '–';
      $('fire-stat-capital').textContent = '–';
      $('fire-stat-remaining').textContent = '–';
      $('fire-stat-payments').textContent = '–';
      $('fire-stat-years-to').textContent = '–';
      $('fire-stat-years-after').textContent = '–';
      $('fire-result-explain').textContent = '';
      return;
    }
    warningEl.classList.remove('show');

    $('fire-stat-needed').textContent = fmtBig(res.neededCapital);
    $('fire-stat-needed-card').textContent = fmtBig(res.neededCapital);
    $('fire-stat-capital').textContent = fmtBig(res.capitalGrown);
    $('fire-stat-remaining').textContent = fmtBig(res.remaining);
    $('fire-stat-payments').textContent = fmtBig(res.payments);
    $('fire-stat-years-to').textContent = Math.round(res.nAcc/12);
    $('fire-result-explain').innerHTML = buildExplanation(res);

    const yearsAfterRow = $('fire-stat-years-after-row');
    if(state.depletionActive && res.mWithdraw !== null){
      yearsAfterRow.style.display = '';
      $('fire-stat-years-after').textContent = Math.round(res.mWithdraw/12);
    } else {
      yearsAfterRow.style.display = 'none';
    }
  }

  function updateSliderLabels(){
    $('fire-interest-input').value = state.interest;
  }

  // Rendite: Slider und Zahlenfeld synchron
  $('fire-interest').addEventListener('input', ()=>{
    state.interest = parseFloat($('fire-interest').value);
    updateSliderLabels();
    render();
  });
  $('fire-interest-input').addEventListener('input', e=>{
    let v = parseFloat(e.target.value);
    if(isNaN(v)) return;
    v = Math.max(0, Math.min(20, v));
    state.interest = v;
    $('fire-interest').value = v;
    render();
  });

  // Wie die Zahlenfelder in investment-calculator.js: Der State bekommt bei
  // leerem/ungültigem Feld einen Fallback von 0, aber das sichtbare Feld wird
  // nur korrigiert, wenn der eingegebene Wert wirklich außerhalb von
  // min/max liegt — sonst kann man das Feld nicht leeren, um neu zu tippen.
  function bindNumber(id, key, opts){
    opts = opts || {};
    $(id).addEventListener('input', e=>{
      const raw = parseFloat(e.target.value);
      let v = isNaN(raw) ? 0 : raw;
      if(opts.min !== undefined) v = Math.max(opts.min, v);
      if(opts.max !== undefined) v = Math.min(opts.max, v);
      state[key] = v;
      if(!isNaN(raw) && raw !== v) e.target.value = v;
      render();
    });
  }

  bindNumber('fire-netoutcome', 'netOutcome', { min: 0 });
  bindNumber('fire-inflation', 'inflationRate', { min: 0, max: 100 });
  bindNumber('fire-actualage', 'actualAge', { min: 1, max: 100 });
  bindNumber('fire-goalage', 'goalAge', { min: 1, max: 100 });
  bindNumber('fire-lifetimeage', 'lifetimeAge', { min: 1, max: 120 });
  bindNumber('fire-capital', 'capital', { min: 0 });

  const swInflation = $('sw-inflation'), fieldsInflation = $('fields-inflation');
  swInflation.addEventListener('click', ()=>{
    state.inflationActive = !state.inflationActive;
    swInflation.classList.toggle('on', state.inflationActive);
    fieldsInflation.classList.toggle('open', state.inflationActive);
    render();
  });

  const swDepletion = $('sw-depletion'), fieldsDepletion = $('fields-depletion');
  swDepletion.addEventListener('click', ()=>{
    state.depletionActive = !state.depletionActive;
    swDepletion.classList.toggle('on', state.depletionActive);
    fieldsDepletion.classList.toggle('open', state.depletionActive);
    render();
  });

  document.addEventListener('mwr:langchange', ()=>{ updateSliderLabels(); render(); });
  document.addEventListener('mwr:currencychange', render);
  document.addEventListener('DOMContentLoaded', ()=>{
    updateSliderLabels();
    render();
  });
})();
