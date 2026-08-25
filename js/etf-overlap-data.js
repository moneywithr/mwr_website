// Kuratierte Holdings-Daten für den ETF-Overlap-Rechner.
// Die Seite ist rein statisch (kein Backend), deshalb gibt es keinen freien
// ISIN-Lookup: stattdessen ein festes Set beliebter ETFs (inkl. mehrerer
// Schariah-konformer/islamischer Fonds) mit ihren jeweils größten
// Positionen (~Top 5-10, je nachdem was öffentlich verfügbar war).
// Gewichtungen sind Näherungswerte (Stand ca. August 2026, Quellen: justETF,
// Morningstar, Yahoo Finance, Anbieter-Factsheets) und verschieben sich mit
// der Zeit - für einen groben Überlappungsvergleich reicht das, für exakte
// Anlageentscheidungen bitte die aktuellen Factsheets der Anbieter prüfen.
// Mehrere ETFs, die denselben Index abbilden (z.B. drei MSCI-World-ETFs von
// unterschiedlichen Anbietern), teilen sich bewusst dasselbe holdingSet -
// ihre Positionen sind in der Praxis nahezu identisch.
window.ETF_OVERLAP_DATA = (function(){

  const holdingSets = {
    msci_world: [
      { key:'nvidia', weight:5.16 }, { key:'apple', weight:5.05 }, { key:'microsoft', weight:3.65 },
      { key:'amazon', weight:2.93 }, { key:'alphabet', weight:4.15 }, { key:'broadcom', weight:1.95 },
      { key:'meta', weight:1.36 }, { key:'jpmorgan', weight:1.05 }, { key:'micron', weight:1.03 },
    ],
    sp500: [
      { key:'nvidia', weight:7.88 }, { key:'apple', weight:7.04 }, { key:'microsoft', weight:5.14 },
      { key:'amazon', weight:4.06 }, { key:'alphabet', weight:6.10 }, { key:'broadcom', weight:3.25 },
      { key:'meta', weight:2.13 }, { key:'tesla', weight:1.88 }, { key:'micron', weight:1.68 },
    ],
    nasdaq100: [
      { key:'nvidia', weight:9.02 }, { key:'apple', weight:8.00 }, { key:'microsoft', weight:7.16 },
      { key:'amazon', weight:4.91 }, { key:'tesla', weight:3.96 }, { key:'meta', weight:3.86 },
      { key:'alphabet', weight:7.01 }, { key:'broadcom', weight:3.26 }, { key:'palantir', weight:2.23 },
    ],
    ftse_all_world: [
      { key:'nvidia', weight:4.5 }, { key:'apple', weight:4.3 }, { key:'alphabet', weight:3.6 },
      { key:'microsoft', weight:3.3 }, { key:'amazon', weight:2.5 }, { key:'taiwan_semi', weight:1.7 },
      { key:'broadcom', weight:1.7 }, { key:'meta', weight:1.2 }, { key:'samsung', weight:0.9 },
      { key:'jpmorgan', weight:0.9 },
    ],
    msci_acwi_imi: [
      { key:'nvidia', weight:4.83 }, { key:'apple', weight:4.01 }, { key:'microsoft', weight:3.16 },
      { key:'amazon', weight:2.39 }, { key:'alphabet', weight:3.77 }, { key:'meta', weight:1.62 },
      { key:'broadcom', weight:1.55 }, { key:'taiwan_semi', weight:1.45 }, { key:'tesla', weight:1.27 },
    ],
    msci_em: [
      { key:'taiwan_semi', weight:13.57 }, { key:'samsung', weight:7.11 }, { key:'sk_hynix', weight:4.88 },
      { key:'tencent', weight:2.74 }, { key:'alibaba', weight:1.84 }, { key:'mediatek', weight:1.18 },
      { key:'china_construction_bank', weight:0.74 }, { key:'delta_electronics', weight:0.73 }, { key:'hon_hai', weight:0.70 },
    ],
    stoxx_europe_600: [
      { key:'asml', weight:4.75 }, { key:'hsbc', weight:2.15 }, { key:'novartis', weight:1.98 },
      { key:'roche', weight:1.96 }, { key:'astrazeneca', weight:1.95 }, { key:'nestle', weight:1.79 },
      { key:'siemens', weight:1.50 }, { key:'shell', weight:1.43 }, { key:'santander', weight:1.33 },
      { key:'schneider_electric', weight:1.22 },
    ],
    dax: [
      { key:'siemens', weight:12.11 }, { key:'allianz', weight:9.24 }, { key:'sap', weight:7.95 },
      { key:'siemens_energy', weight:7.91 }, { key:'airbus', weight:6.71 }, { key:'infineon', weight:6.26 },
      { key:'deutsche_telekom', weight:4.85 }, { key:'munich_re', weight:3.64 }, { key:'deutsche_bank', weight:3.32 },
      { key:'deutsche_post', weight:2.95 },
    ],
    euro_stoxx_50: [
      { key:'asml', weight:11.10 }, { key:'siemens', weight:4.67 }, { key:'totalenergies', weight:3.79 },
      { key:'sap', weight:3.65 }, { key:'santander', weight:3.63 }, { key:'schneider_electric', weight:3.59 },
      { key:'allianz', weight:3.34 }, { key:'siemens_energy', weight:2.91 }, { key:'iberdrola', weight:2.79 },
      { key:'lvmh', weight:2.72 },
    ],
    semiconductor: [
      { key:'amd', weight:11.06 }, { key:'broadcom', weight:11.00 }, { key:'nvidia', weight:10.53 },
      { key:'taiwan_semi', weight:10.40 }, { key:'asml', weight:9.82 }, { key:'micron', weight:9.70 },
      { key:'intel', weight:6.24 }, { key:'applied_materials', weight:5.76 }, { key:'lam_research', weight:5.11 },
      { key:'texas_instruments', weight:3.59 },
    ],
    sp500_it: [
      { key:'nvidia', weight:19.74 }, { key:'apple', weight:16.94 }, { key:'microsoft', weight:11.36 },
      { key:'broadcom', weight:7.33 }, { key:'micron', weight:5.34 }, { key:'amd', weight:3.88 },
      { key:'intel', weight:2.70 }, { key:'applied_materials', weight:2.35 }, { key:'lam_research', weight:2.22 },
      { key:'cisco', weight:1.90 },
    ],
    msci_japan: [
      { key:'tokyo_electron', weight:4.16 }, { key:'mufg', weight:4.12 }, { key:'kioxia', weight:3.39 },
      { key:'toyota', weight:3.11 }, { key:'advantest', weight:2.85 }, { key:'smfg', weight:2.78 },
      { key:'softbank_group', weight:2.66 }, { key:'hitachi', weight:2.38 }, { key:'sony', weight:2.31 },
      { key:'murata', weight:2.22 },
    ],
    msci_world_islamic: [
      { key:'microsoft', weight:12.27 }, { key:'tesla', weight:4.74 }, { key:'micron', weight:4.23 },
      { key:'amd', weight:3.25 }, { key:'asml', weight:2.42 }, { key:'exxon', weight:2.33 },
      { key:'jnj', weight:2.10 }, { key:'intel', weight:1.95 }, { key:'cisco', weight:1.84 },
    ],
    msci_usa_islamic: [
      { key:'microsoft', weight:15.32 }, { key:'tesla', weight:8.09 }, { key:'exxon', weight:4.41 },
      { key:'jnj', weight:4.03 }, { key:'micron', weight:3.66 },
    ],
    msci_em_islamic: [
      { key:'taiwan_semi', weight:19.82 }, { key:'samsung', weight:11.74 }, { key:'reliance', weight:3.78 },
      { key:'sk_hynix', weight:2.47 }, { key:'vale', weight:2.22 }, { key:'al_rajhi_bank', weight:1.74 },
      { key:'petrobras', weight:2.75 }, { key:'xiaomi', weight:1.34 },
    ],
    sp500_shariah: [
      { key:'nvidia', weight:13.69 }, { key:'apple', weight:11.84 }, { key:'microsoft', weight:9.58 },
      { key:'alphabet', weight:5.41 }, { key:'broadcom', weight:5.14 },
    ],
    ftse_usa_shariah: [
      { key:'apple', weight:12.89 }, { key:'microsoft', weight:9.30 }, { key:'alphabet', weight:12.46 },
      { key:'broadcom', weight:5.98 },
    ],
  };

  // Anzeigenamen der Unternehmen - bewusst überall lateinische Schreibweise
  // (Tickernamen/Firmennamen werden international, auch auf Arabisch, nicht
  // übersetzt), daher ein einzelner String statt einer Sprachkarte.
  const companies = {
    nvidia:'NVIDIA', apple:'Apple', microsoft:'Microsoft', amazon:'Amazon', alphabet:'Alphabet (Google)',
    broadcom:'Broadcom', meta:'Meta Platforms', tesla:'Tesla', micron:'Micron Technology', jpmorgan:'JPMorgan Chase',
    palantir:'Palantir', taiwan_semi:'Taiwan Semiconductor (TSMC)', samsung:'Samsung Electronics',
    sk_hynix:'SK Hynix', tencent:'Tencent', alibaba:'Alibaba', mediatek:'MediaTek',
    china_construction_bank:'China Construction Bank', delta_electronics:'Delta Electronics', hon_hai:'Hon Hai (Foxconn)',
    asml:'ASML', hsbc:'HSBC', novartis:'Novartis', roche:'Roche', astrazeneca:'AstraZeneca', nestle:'Nestlé',
    siemens:'Siemens', shell:'Shell', santander:'Banco Santander', schneider_electric:'Schneider Electric',
    allianz:'Allianz', sap:'SAP', siemens_energy:'Siemens Energy', airbus:'Airbus', infineon:'Infineon',
    deutsche_telekom:'Deutsche Telekom', munich_re:'Münchener Rück', deutsche_bank:'Deutsche Bank', deutsche_post:'DHL Group',
    totalenergies:'TotalEnergies', iberdrola:'Iberdrola', lvmh:'LVMH', amd:'AMD', intel:'Intel',
    applied_materials:'Applied Materials', lam_research:'Lam Research', texas_instruments:'Texas Instruments',
    tokyo_electron:'Tokyo Electron', mufg:'Mitsubishi UFJ', kioxia:'Kioxia', toyota:'Toyota', advantest:'Advantest',
    smfg:'Sumitomo Mitsui', softbank_group:'SoftBank Group', hitachi:'Hitachi', sony:'Sony', murata:'Murata',
    exxon:'ExxonMobil', jnj:'Johnson & Johnson', cisco:'Cisco', reliance:'Reliance Industries', vale:'Vale',
    al_rajhi_bank:'Al Rajhi Bank', petrobras:'Petrobras', xiaomi:'Xiaomi',
  };

  const categories = [
    { id:'islamic', icon:'☪', names:{ de:'Islamisch / Schariah-konform', en:'Islamic / Sharia-compliant', ar:'إسلامي / متوافق مع الشريعة' } },
    { id:'world',   icon:'🌍', names:{ de:'Welt', en:'World', ar:'عالمي' } },
    { id:'us',      icon:'🇺🇸', names:{ de:'USA', en:'US', ar:'الولايات المتحدة' } },
    { id:'nasdaq',  icon:'💻', names:{ de:'Nasdaq / Tech', en:'Nasdaq / Tech', ar:'ناسداك / تكنولوجيا' } },
    { id:'europe',  icon:'🇪🇺', names:{ de:'Europa', en:'Europe', ar:'أوروبا' } },
    { id:'em',      icon:'🌐', names:{ de:'Schwellenländer', en:'Emerging Markets', ar:'الأسواق الناشئة' } },
    { id:'japan',   icon:'🇯🇵', names:{ de:'Japan', en:'Japan', ar:'اليابان' } },
    { id:'sector',  icon:'⚙️', names:{ de:'Sektor / Thema', en:'Sector / Theme', ar:'قطاع / موضوع' } },
  ];

  // name = offizieller Produktname, bewusst nicht übersetzt (wie "ETF"
  // selbst bleibt das auf allen drei Sprachen unverändert stehen).
  // wkn = deutsche Wertpapierkennnummer, nur gesetzt wenn wirklich verifiziert
  // (z.B. über justETF) - lieber leer lassen als eine falsche WKN zeigen.
  const etfs = [
    { id:'ishares-msci-world',   isin:'IE00B4L5Y983', wkn:'A0RPWH', ticker:'IWDA', category:'world',   holdingSet:'msci_world',        name:'iShares Core MSCI World UCITS ETF' },
    { id:'xtrackers-msci-world', isin:'IE00BJ0KDQ92', wkn:null,     ticker:'XDWD', category:'world',   holdingSet:'msci_world',        name:'Xtrackers MSCI World UCITS ETF' },
    { id:'spdr-msci-world',      isin:'IE00BFY0GT14', wkn:null,     ticker:'SPPW', category:'world',   holdingSet:'msci_world',        name:'SPDR MSCI World UCITS ETF' },
    { id:'vanguard-ftse-all-world', isin:'IE00BK5BQT80', wkn:'A2PKXG', ticker:'VWCE', category:'world', holdingSet:'ftse_all_world',   name:'Vanguard FTSE All-World UCITS ETF' },
    { id:'spdr-msci-acwi-imi',   isin:'IE00B3YLTY66', wkn:'A1JJTD', ticker:'SPYI', category:'world',   holdingSet:'msci_acwi_imi',     name:'SPDR MSCI ACWI IMI UCITS ETF' },
    { id:'ishares-sp500',        isin:'IE00B5BMR087', wkn:'A0YEDG', ticker:'CSPX', category:'us',      holdingSet:'sp500',             name:'iShares Core S&P 500 UCITS ETF' },
    { id:'vanguard-sp500',       isin:'IE00B3XXRP09', wkn:null,     ticker:'VUSA', category:'us',      holdingSet:'sp500',             name:'Vanguard S&P 500 UCITS ETF' },
    { id:'invesco-nasdaq100',    isin:'IE0032077012', wkn:'801498', ticker:'EQQQ', category:'nasdaq',  holdingSet:'nasdaq100',         name:'Invesco Nasdaq-100 UCITS ETF' },
    { id:'ishares-nasdaq100',    isin:'IE00B53SZB19', wkn:null,     ticker:'CNDX', category:'nasdaq',  holdingSet:'nasdaq100',         name:'iShares Nasdaq 100 UCITS ETF' },
    { id:'vaneck-semiconductor', isin:'IE00BMC38736', wkn:'A2QC5J', ticker:'SMH',  category:'sector',  holdingSet:'semiconductor',     name:'VanEck Semiconductor UCITS ETF' },
    { id:'ishares-sp500-it',     isin:'IE00B3WJKG14', wkn:'A142N1', ticker:'QDVE', category:'sector',  holdingSet:'sp500_it',          name:'iShares S&P 500 Information Technology Sector UCITS ETF' },
    { id:'amundi-stoxx600',      isin:'LU0908500753', wkn:'LYX0Q0', ticker:'MEUD', category:'europe',  holdingSet:'stoxx_europe_600',  name:'Amundi Core Stoxx Europe 600 UCITS ETF' },
    { id:'ishares-core-dax',     isin:'DE0005933931', wkn:'593393', ticker:'EXS1', category:'europe',  holdingSet:'dax',               name:'iShares Core DAX UCITS ETF (DE)' },
    { id:'ishares-eurostoxx50',  isin:'IE00B53L3W79', wkn:'A0YEDJ', ticker:'CSX5', category:'europe',  holdingSet:'euro_stoxx_50',     name:'iShares Core EURO STOXX 50 UCITS ETF' },
    { id:'ishares-em-imi',       isin:'IE00BKM4GZ66', wkn:'A111X9', ticker:'EIMI', category:'em',      holdingSet:'msci_em',           name:'iShares Core MSCI EM IMI UCITS ETF' },
    { id:'xtrackers-em',         isin:'IE00BTJRMP35', wkn:null,     ticker:'XMME', category:'em',      holdingSet:'msci_em',           name:'Xtrackers MSCI Emerging Markets UCITS ETF' },
    { id:'ishares-msci-japan',   isin:'IE00B02KXK85', wkn:null,     ticker:'IJPN', category:'japan',   holdingSet:'msci_japan',        name:'iShares MSCI Japan UCITS ETF' },
    { id:'ishares-world-islamic', isin:'IE00B27YCN58', wkn:'A0NA46', ticker:'ISWD', category:'islamic', holdingSet:'msci_world_islamic', name:'iShares MSCI World Islamic UCITS ETF' },
    { id:'ishares-usa-islamic',  isin:'IE00B296QM64', wkn:'A0NA48', ticker:'ISUS', category:'islamic', holdingSet:'msci_usa_islamic',  name:'iShares MSCI USA Islamic UCITS ETF' },
    { id:'ishares-em-islamic',   isin:'IE00B27YCP72', wkn:'A0NA47', ticker:'ISDE', category:'islamic', holdingSet:'msci_em_islamic',   name:'iShares MSCI EM Islamic UCITS ETF' },
    { id:'spus-sp500-shariah',   isin:null,           wkn:null,     ticker:'SPUS', category:'islamic', holdingSet:'sp500_shariah',     name:'SP Funds S&P 500 Sharia Industry Exclusions ETF' },
    { id:'hlal-ftse-usa-shariah', isin:null,          wkn:null,     ticker:'HLAL', category:'islamic', holdingSet:'ftse_usa_shariah',  name:'Wahed FTSE USA Shariah ETF' },
  ];

  return { holdingSets, companies, categories, etfs };
})();
