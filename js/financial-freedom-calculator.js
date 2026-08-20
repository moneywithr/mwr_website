// Logik NUR für calculator/financial_freedom/index.html (FIRE-Rechner).
// Modell: Wie viel Kapital brauchst du, um von deinen Kapitalerträgen zu leben,
// und wie viel musst du dafür monatlich sparen. Angelehnt an den Aufbau von
// investment-calculator.js (state/solve/render), aber ohne Diagramm. Die
// optionale Kapitalertragsteuer ist bewusst nach dem Modell von finanzfluss.de
// gerechnet (siehe solve und netFactors), damit die Ergebnisse mit dem dort
// verbreiteten Rechner vergleichbar bleiben.
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
    taxActive: false,
    // 25% Abgeltungsteuer + 5,5% Solidaritätszuschlag darauf = 26,375%.
    taxRate: 26.375,
  };

  function monthlyRateFromAnnual(annualPct){
    return Math.pow(1 + annualPct/100, 1/12) - 1;
  }

  // Steuersatz in Prozent, so wie er tatsächlich in die Rechnung eingeht:
  // ausgeschaltet = 0, sonst auf den gültigen Bereich begrenzt.
  function effectiveTaxPct(){
    return state.taxActive ? Math.min(99, Math.max(0, state.taxRate)) : 0;
  }

  // Steuermodell der Ansparphase, bewusst so gewählt, dass es dem Rechner von
  // finanzfluss.de entspricht (dort: "Fälligkeit der Kapitalertragsteuer =
  // am Ende der Laufzeit", die Voreinstellung): Die Steuer wird EINMALIG beim
  // Erreichen der finanziellen Freiheit auf den gesamten Gewinn fällig, also
  // auf (Endwert − eingezahlte Summe). Solange du nicht verkaufst, wächst das
  // Kapital ungeschmälert weiter, das trifft für thesaurierende ETFs zu
  // (die Vorabpauschale bleibt hier wie bei finanzfluss außen vor).
  //
  // Daraus lässt sich die Sparrate weiterhin geschlossen bestimmen: von jedem
  // eingezahlten Euro sind am Ende (k − N)/k Gewinn, also bleibt pro Euro
  // Sparrate netto k − τ·(k − N) übrig; vom Startkapital entsprechend
  // g − τ·(g − 1).
  function netFactors(N, rm, taxRate){
    if(N <= 0) return { capital: 1, payment: 0 };
    if(Math.abs(rm) < 1e-9) return { capital: 1, payment: N };
    const g = Math.pow(1+rm, N);
    const k = (1+rm)*(g-1)/rm;
    return {
      capital: g - taxRate*(g - 1),
      payment: k - taxRate*(k - N),
    };
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

    // Entnahmephase: Steuer fällt nur auf die Erträge an, nicht auf das
    // Kapital selbst. Das lässt sich abbilden, indem für die Entnahme mit
    // einem Netto-Zinssatz gerechnet wird, dann bleiben beim Kapitalverzehr
    // die zurückgezahlten eigenen Einlagen korrekt steuerfrei.
    const taxRate = effectiveTaxPct() / 100;
    const rmNet = rm * (1 - taxRate);

    let neededCapital, mWithdraw = null;
    if(state.depletionActive){
      mWithdraw = Math.round((state.lifetimeAge - state.goalAge) * 12);
      if(mWithdraw <= 0) return { invalid: true };
      if(Math.abs(rmNet) < 1e-9){
        neededCapital = state.netOutcome * mWithdraw;
      } else {
        neededCapital = state.netOutcome * (1 - Math.pow(1+rmNet, -mWithdraw)) / rmNet;
      }
    } else {
      // Ohne Kapitalverzehr lebst du allein von den Erträgen, das Kapital
      // bleibt unangetastet, ewige Rente: Kapital = Netto-Rate / Netto-Zins.
      if(rmNet <= 0) return { invalid: true };
      neededCapital = state.netOutcome / rmNet;
    }

    // Ansparphase: Startkapital und Sparrate wachsen brutto und werden am Ende
    // einmalig auf ihren Gewinnanteil besteuert (siehe netFactors).
    const nf = netFactors(nAcc, rm, taxRate);
    const fvCapital = state.capital * nf.capital;
    const remaining = Math.max(0, neededCapital - fvCapital);
    const payments = nf.payment > 0 ? remaining / nf.payment : 0;

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
    let html = template
      .replace('{payments}', b(fmtBig(res.payments)))
      .replace('{years}', b(String(Math.round(res.nAcc/12))))
      .replace('{interest}', b(interestStr))
      .replace('{needed}', b(fmtBig(res.neededCapital)))
      .replace('{netOutcome}', b(fmtBig(state.netOutcome)));

    const taxPct = effectiveTaxPct();
    if(taxPct > 0){
      // 3 Nachkommastellen, damit der deutsche Standardsatz auch im Text als
      // 26,375 % steht und nicht als gerundetes 26,38 % neben dem Eingabefeld.
      const taxRateStr = taxPct.toLocaleString(locale(), {maximumFractionDigits:3}) + '%';
      html += t('fireResultExplainTaxSuffix')
        .replace('{taxRate}', b(taxRateStr))
        .replace('{netOutcome}', b(fmtBig(state.netOutcome)));
    }
    return html;
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
  // min/max liegt, sonst kann man das Feld nicht leeren, um neu zu tippen.
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
  bindNumber('fire-tax-rate', 'taxRate', { min: 0, max: 99 });

  const swInflation = $('sw-inflation'), fieldsInflation = $('fields-inflation');
  swInflation.addEventListener('click', ()=>{
    state.inflationActive = !state.inflationActive;
    swInflation.classList.toggle('on', state.inflationActive);
    fieldsInflation.classList.toggle('open', state.inflationActive);
    render();
  });

  const swTax = $('sw-tax'), fieldsTax = $('fields-tax');
  swTax.addEventListener('click', ()=>{
    state.taxActive = !state.taxActive;
    swTax.classList.toggle('on', state.taxActive);
    fieldsTax.classList.toggle('open', state.taxActive);
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

  window.SavedResults.init({
    cookieKey: 'fire',
    // Letztes Element im Ergebnisblock, damit das Panel darunter landet. Die
    // Zeile ist zeitweise ausgeblendet (nur bei Kapitalverzehr sichtbar), als
    // Anker im DOM aber immer vorhanden.
    insertAfter: document.getElementById('fire-stat-years-after-row'),
    fields: [
      { type:'value', id:'fire-actualage' },
      { type:'value', id:'fire-goalage' },
      { type:'value', id:'fire-netoutcome' },
      { type:'value', id:'fire-interest-input' },
      { type:'switch', id:'sw-inflation' },
      { type:'value', id:'fire-inflation' },
      { type:'switch', id:'sw-tax' },
      { type:'value', id:'fire-tax-rate' },
      { type:'switch', id:'sw-depletion' },
      { type:'value', id:'fire-lifetimeage' },
      { type:'value', id:'fire-capital' },
    ],
  });
})();
