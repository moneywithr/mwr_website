// Logik NUR für calculator/financial_freedom/index.html (FIRE-Rechner).
// Modell: Wie viel Kapital brauchst du, um von deinen Kapitalerträgen zu leben,
// und wie viel musst du dafür monatlich sparen. Angelehnt an den Aufbau von
// investment-calculator.js (state/solve/render), aber ohne Diagramm. Die
// optionale Kapitalertragsteuer ist bewusst nach einem verbreiteten Modell
// gerechnet (siehe solve und netFactors), damit die Ergebnisse mit gängigen
// FIRE-Rechnern vergleichbar bleiben.
(function(){
  const $ = id => document.getElementById(id);
  const { t, locale, fmtEUR, fmtCompact } = window.Site;

  const state = {
    // 'payment': Ziel-Alter ist gegeben, gesucht ist die monatliche Sparrate.
    // 'years': monatliche Sparrate ist gegeben, gesucht sind die Jahre bis
    // zur finanziellen Freiheit.
    target: 'payment',
    monthly: 300,
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

  // Steuermodell der Ansparphase, bewusst so gewählt, dass es einer gängigen
  // Voreinstellung entspricht ("Fälligkeit der Kapitalertragsteuer = am Ende
  // der Laufzeit"): Die Steuer wird EINMALIG beim Erreichen der finanziellen
  // Freiheit auf den gesamten Gewinn fällig, also auf (Endwert − eingezahlte
  // Summe). Solange du nicht verkaufst, wächst das Kapital ungeschmälert
  // weiter, das trifft für thesaurierende ETFs zu (die Vorabpauschale bleibt
  // hier außen vor).
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

  // Benötigtes Kapital bei Erreichen der finanziellen Freiheit. mWithdraw ist
  // die Zahl der Entnahmemonate (nur bei Kapitalverzehr relevant).
  function neededCapitalFor(rmNet, mWithdraw){
    if(state.depletionActive){
      if(mWithdraw <= 0) return null;
      if(Math.abs(rmNet) < 1e-9) return state.netOutcome * mWithdraw;
      return state.netOutcome * (1 - Math.pow(1+rmNet, -mWithdraw)) / rmNet;
    }
    // Ohne Kapitalverzehr lebst du allein von den Erträgen, das Kapital
    // bleibt unangetastet, ewige Rente: Kapital = Netto-Rate / Netto-Zins.
    if(rmNet <= 0) return null;
    return state.netOutcome / rmNet;
  }

  function solve(){
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

    if(state.target === 'years') return solveYears(rm, rmNet, taxRate);

    const nAcc = Math.round((state.goalAge - state.actualAge) * 12);
    if(nAcc <= 0) return { invalid: true };

    let mWithdraw = null;
    if(state.depletionActive){
      mWithdraw = Math.round((state.lifetimeAge - state.goalAge) * 12);
    }
    const neededCapital = neededCapitalFor(rmNet, mWithdraw);
    if(neededCapital === null) return { invalid: true };

    // Ansparphase: Startkapital und Sparrate wachsen brutto und werden am Ende
    // einmalig auf ihren Gewinnanteil besteuert (siehe netFactors).
    const nf = netFactors(nAcc, rm, taxRate);
    const fvCapital = state.capital * nf.capital;
    const remaining = Math.max(0, neededCapital - fvCapital);
    const payments = nf.payment > 0 ? remaining / nf.payment : 0;

    return { invalid: false, neededCapital, capitalGrown: fvCapital, remaining, payments, nAcc, mWithdraw };
  }

  // Umgekehrte Rechnung: Sparrate ist vorgegeben, gesucht ist der erste Monat,
  // in dem Startkapital + Sparrate (nach Steuer, siehe netFactors) das
  // benötigte Kapital erreichen. Bei aktivem Kapitalverzehr hängt das
  // benötigte Kapital selbst vom Zeitpunkt ab (je später, desto kürzer die
  // Entnahmezeit, desto weniger Kapital), deshalb wird für jeden Monat beides
  // neu bestimmt. Der erste Treffer ist die Lösung.
  function solveYears(rm, rmNet, taxRate){
    let maxN = 100 * 12;
    let withdrawTotal = 0;
    if(state.depletionActive){
      withdrawTotal = Math.round((state.lifetimeAge - state.actualAge) * 12);
      if(withdrawTotal <= 1) return { invalid: true };
      maxN = withdrawTotal - 1;
    } else if(neededCapitalFor(rmNet, 0) === null){
      return { invalid: true };
    }

    for(let n = 0; n <= maxN; n++){
      const mWithdraw = state.depletionActive ? withdrawTotal - n : null;
      const neededCapital = neededCapitalFor(rmNet, mWithdraw);
      if(neededCapital === null) return { invalid: true };
      const nf = netFactors(n, rm, taxRate);
      const fvCapital = state.capital * nf.capital;
      const total = fvCapital + state.monthly * nf.payment;
      if(total >= neededCapital){
        return {
          invalid: false, neededCapital, capitalGrown: fvCapital,
          remaining: Math.max(0, neededCapital - fvCapital),
          payments: state.monthly, nAcc: n, mWithdraw,
        };
      }
    }
    return { invalid: true, unreachable: true };
  }

  function fmtBig(v){
    const full = fmtEUR(v);
    const digits = full.replace(/[^0-9]/g, '').length;
    return digits > 9 ? fmtCompact(v) : full;
  }

  // Dauer in Monaten als "12 J. 4 M." (bzw. nur Jahre/nur Monate).
  function fmtDuration(months){
    const y = Math.floor(months / 12), m = months % 12;
    if(y > 0 && m > 0) return t('fireDurationYM').replace('{y}', y).replace('{m}', m);
    if(y > 0) return t('fireDurationY').replace('{y}', y);
    return t('fireDurationM').replace('{m}', m);
  }

  function buildExplanation(res){
    const b = txt => '<strong>' + txt + '</strong>';
    const yearsMode = state.target === 'years';
    const template = t(yearsMode ? 'fireResultExplainYears' : 'fireResultExplain');
    const interestStr = state.interest.toLocaleString(locale(), {maximumFractionDigits:1}) + '%';
    let html = template
      .replace('{payments}', b(fmtBig(res.payments)))
      .replace('{years}', b(String(Math.round(res.nAcc/12))))
      .replace('{interest}', b(interestStr))
      .replace('{needed}', b(fmtBig(res.neededCapital)))
      .replace('{netOutcome}', b(fmtBig(state.netOutcome)))
      .replace('{duration}', b(fmtDuration(res.nAcc)))
      .replace('{age}', b(String(Math.round((state.actualAge + res.nAcc/12) * 10) / 10)));

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

  function syncTargetUI(){
    const yearsMode = state.target === 'years';
    $('fire-target-value').textContent = t(yearsMode ? 'fireTargetYears' : 'fireTargetPayment');
    $('fire-target-select').querySelectorAll('[data-value]').forEach(li=>{
      const isActive = li.getAttribute('data-value') === state.target;
      li.classList.toggle('active', isActive);
      li.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    $('field-goalage').style.display = yearsMode ? 'none' : '';
    $('field-monthly').style.display = yearsMode ? '' : 'none';
  }

  $('fire-target-select').addEventListener('customselect:change', e=>{
    state.target = e.detail.value === 'years' ? 'years' : 'payment';
    render();
  });

  function render(){
    syncTargetUI();
    updateAgeNotes();
    const res = solve();
    const warningEl = $('fire-warning');

    // Karte mit der Sparrate: im Modus "Jahre" ist es deine Eingabe, im
    // Modus "Sparrate" das Ergebnis, entsprechend anders beschriftet.
    $('fire-stat-payments-label').textContent = t(state.target === 'years' ? 'fireLabelMonthly' : 'fireStatPaymentsLabel');

    if(res.invalid){
      warningEl.textContent = t(res.unreachable ? 'fireUnreachable' : 'fireInvalid');
      warningEl.classList.add('show');
      $('fire-stat-needed').textContent = '-';
      $('fire-stat-capital').textContent = '-';
      $('fire-stat-remaining').textContent = '-';
      $('fire-stat-payments').textContent = '-';
      $('fire-stat-years-to').textContent = '-';
      $('fire-stat-years-after').textContent = '-';
      $('fire-result-explain').textContent = '';
      return;
    }
    warningEl.classList.remove('show');

    $('fire-stat-needed').textContent = fmtBig(res.neededCapital);
    $('fire-stat-capital').textContent = fmtBig(res.capitalGrown);
    $('fire-stat-remaining').textContent = fmtBig(res.remaining);
    $('fire-stat-payments').textContent = fmtBig(res.payments);
    $('fire-stat-years-to').textContent = state.target === 'years' ? fmtDuration(res.nAcc) : Math.round(res.nAcc/12);
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
  bindNumber('fire-monthly', 'monthly', { min: 0 });
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
      { type:'customselect', id:'fire-target-select' },
      { type:'value', id:'fire-monthly' },
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
