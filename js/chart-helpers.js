// Gemeinsame SVG-Chart-Bausteine für investment-calculator.js und
// fund-comparison-calculator.js, beide zeichnen ein Liniendiagramm mit
// gleichem Aufbau (Skalen, Pfade, Füllfläche zwischen zwei Serien, Gitter).
// Diagramm-spezifische Teile (Callout-Text/-Farbe, Anzahl der Linien) bleiben
// in den jeweiligen Dateien.
window.ChartHelpers = (function(){
  function scales({padL, padT, padR, padB, W, H, n, maxV}){
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const x = idx => padL + (innerW * idx/(n-1));
    const y = v => padT + innerH - (innerH * (v/maxV));
    return { x, y, innerW, innerH };
  }

  function pathFor(arr, x, y){
    return arr.map((v,idx)=> (idx===0?'M':'L') + x(idx).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
  }

  // Geschlossene Fläche zwischen zwei Serien (z.B. für die farbige Füllung
  // zwischen "Gesamtwert" und "eingezahltes Kapital").
  function areaBetween(topArr, bottomArr, x, y){
    const n = topArr.length;
    const forward = topArr.map((v,idx)=> x(idx).toFixed(1)+','+y(v).toFixed(1)).join(' L ');
    const backward = bottomArr.slice().reverse().map((v,idx)=>{
      const i2 = n-1-idx;
      return x(i2).toFixed(1)+','+y(v).toFixed(1);
    }).join(' L ');
    return 'M ' + forward + ' L ' + backward + ' Z';
  }

  function gridLines({padL, padT, W, padR, maxV, steps, monoFont, y, fmtCompact}){
    let grid = '';
    for(let s=0; s<=steps; s++){
      const val = maxV * s/steps;
      const gy = y(val);
      grid += `<line x1="${padL}" y1="${gy.toFixed(1)}" x2="${W-padR}" y2="${gy.toFixed(1)}" stroke="#E7E3DE" stroke-width="1"/>`;
      grid += `<text x="${padL-8}" y="${(gy+4).toFixed(1)}" text-anchor="end" font-family="${monoFont}" font-size="11.5" fill="#7C7876">${fmtCompact(val)}</text>`;
    }
    return grid;
  }

  return { scales, pathFor, areaBetween, gridLines };
})();
