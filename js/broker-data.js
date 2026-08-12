// Alle Broker/Länder-Daten für die Broker-Finder-Seite.
// Neues Land hinzufügen: einfach ein weiteres Objekt in dieses Array einfügen.
window.BROKER_DATA = [
  {
    id: "de",
    names: { de: "Deutschland", en: "Germany", ar: "ألمانيا" },
    note: {
      de: "Das ist keine Finanzberatung! Recherche nach bestem Wissen und Gewissen — der Anfang liegt bei dir.",
      en: "This is not financial advice! Researched to the best of our knowledge — the rest is up to you.",
      ar: "هذه ليست نصيحة مالية! تم البحث بأفضل ما لدينا من معرفة — والباقي عليك."
    },
    platforms: [
      { name: "Smartbroker+", url: "https://t.adcell.com/p/click?promoId=371155&slotId=148744", domain: "smartbrokerplus.de", logoUrl: "/img/broker-logos/smartbroker-plus.png", tag: { de: "aktuell mein favorit", en: "current top pick", ar: "المفضل عندي حالياً" } },
      { name: "Trade Republic", url: "https://refnocode.trade.re/szj7742l", domain: "traderepublic.com", logoUrl: "/img/broker-logos/trade-republic.png" },
      { name: "Scalable Capital", url: "https://de.scalable.capital/einladung/bsg5qk", domain: "scalable.capital", logoUrl: "/img/broker-logos/scalable-capital.png" },
      { name: "ING", url: "https://www.ing.de/", domain: "ing.de", logoUrl: "/img/broker-logos/ing.png" }
    ]
  },
  {
    id: "nl",
    names: { de: "Niederlande", en: "Netherlands", ar: "هولندا" },
    platforms: [
      { name: "Trade Republic", url: "https://refnocode.trade.re/szj7742l", domain: "traderepublic.com", logoUrl: "/img/broker-logos/trade-republic.png" },
      { name: "DEGIRO", url: "https://www.degiro.nl/", domain: "degiro.nl", logoUrl: "https://assets.finanzfluss.de/directus/c1b0e557-b864-49b3-bfbc-539cd0b8075a.svg" },
      { name: "Interactive Brokers (IBKR)", url: "https://www.interactivebrokers.com/", domain: "interactivebrokers.com", logoUrl: "/img/broker-logos/interactive-brokers.png" }
    ]
  },
  {
    id: "at",
    names: { de: "Österreich", en: "Austria", ar: "النمسا" },
    platforms: [
      { name: "Trade Republic", url: "https://refnocode.trade.re/szj7742l", domain: "traderepublic.com", logoUrl: "/img/broker-logos/trade-republic.png" },
      { name: "Flatex", url: "https://www.flatex.at/", domain: "flatex.at", logoUrl: "https://assets.finanzfluss.de/directus/09a0ea92-e4b9-4118-9fa2-429e4b09db82.svg" }
    ]
  },
  {
    id: "it",
    names: { de: "Italien", en: "Italy", ar: "إيطاليا" },
    platforms: [
      { name: "Trade Republic", url: "https://refnocode.trade.re/szj7742l", domain: "traderepublic.com", logoUrl: "/img/broker-logos/trade-republic.png" },
      { name: "Fineco", url: "https://finecobank.com/", domain: "finecobank.com" },
      { name: "Directa", url: "https://www.directa.it/", domain: "directa.it" }
    ]
  },
  {
    id: "se",
    names: { de: "Schweden", en: "Sweden", ar: "السويد" },
    platforms: [
      { name: "Avanza", url: "https://www.avanza.se/", domain: "avanza.se", note: { de: "Nur auf Schwedisch verfügbar", en: "Only available in Swedish", ar: "متاحة باللغة السويدية فقط" } },
      { name: "Nordnet", url: "https://www.nordnet.se/", domain: "nordnet.se" }
    ]
  },
  {
    id: "pt",
    names: { de: "Portugal", en: "Portugal", ar: "البرتغال" },
    platforms: [
      { name: "Trade Republic", url: "https://www.traderepublic.com/de-de", domain: "traderepublic.com", logoUrl: "/img/broker-logos/trade-republic.png" }
    ]
  },
  {
    id: "dk",
    names: { de: "Dänemark", en: "Denmark", ar: "الدنمارك" },
    platforms: [
      { name: "Nordnet", url: "https://www.nordnet.dk/", domain: "nordnet.dk" },
      { name: "Saxo Bank", url: "https://www.home.saxo/", domain: "home.saxo" }
    ]
  },
  {
    id: "fr",
    names: { de: "Frankreich", en: "France", ar: "فرنسا" },
    platforms: [
      { name: "Trade Republic", url: "https://refnocode.trade.re/szj7742l", domain: "traderepublic.com", logoUrl: "/img/broker-logos/trade-republic.png" }
    ]
  },
  {
    id: "es",
    names: { de: "Spanien", en: "Spain", ar: "إسبانيا" },
    platforms: [
      { name: "Trade Republic", url: "https://refnocode.trade.re/szj7742l", domain: "traderepublic.com", logoUrl: "/img/broker-logos/trade-republic.png" }
    ]
  },
  {
    id: "eg",
    names: { de: "Ägypten", en: "Egypt", ar: "مصر" },
    platforms: [
      { name: "Thndr", url: "https://thndr.app/", domain: "thndr.app", note: { de: "Von der ägyptischen Regierung lizenziert", en: "Licensed by the Egyptian government", ar: "مرخصة من الحكومة المصرية" } }
    ]
  },
  {
    id: "jo",
    names: { de: "Jordanien", en: "Jordan", ar: "الأردن" },
    platforms: [
      { name: "Interactive Brokers (IBKR)", url: "https://www.interactivebrokers.com/", domain: "interactivebrokers.com", logoUrl: "/img/broker-logos/interactive-brokers.png" }
    ]
  },
  {
    id: "tr",
    names: { de: "Türkei", en: "Turkey", ar: "تركيا" },
    platforms: [
      { name: "Midas", url: "https://www.getmidas.com/", domain: "getmidas.com" },
      { name: "Interactive Brokers (IBKR)", url: "https://www.interactivebrokers.com/", domain: "interactivebrokers.com", logoUrl: "/img/broker-logos/interactive-brokers.png" }
    ]
  },
  {
    id: "ae",
    names: { de: "Vereinigte Arabische Emirate", en: "United Arab Emirates", ar: "الإمارات العربية المتحدة" },
    platforms: [
      { name: "XTB", url: "https://link-pso.xtb.com/pso/qw27V", domain: "xtb.com", logoUrl: "/img/broker-logos/xtb.png" }
    ]
  },
  {
    id: "sa",
    names: { de: "Saudi-Arabien", en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    platforms: [
      { name: "Interactive Brokers (IBKR)", url: "https://www.interactivebrokers.com/", domain: "interactivebrokers.com", logoUrl: "/img/broker-logos/interactive-brokers.png" }
    ]
  },
  {
    id: "us",
    names: { de: "USA", en: "United States", ar: "الولايات المتحدة ألأمريكية" },
    platforms: [
      { name: "Charles Schwab", url: "https://www.schwab.com/", domain: "schwab.com" },
      { name: "Fidelity", url: "https://www.fidelity.com/", domain: "fidelity.com", logoUrl: "https://assets.finanzfluss.de/directus/2eeebd01-8bb4-41fd-add7-6d13ba773eec.svg" }
    ]
  },
  {
    id: "uk",
    names: { de: "UK", en: "United Kingdom", ar: "المملكة المتحدة" },
    platforms: [
      { name: "Trading 212", url: "https://trading212.com/", domain: "trading212.com", logoUrl: "/img/broker-logos/trading212.png" }
    ]
  },
  {
    id: "ca",
    names: { de: "Kanada", en: "Canada", ar: "كندا" },
    platforms: [
      { name: "Wealthsimple", url: "https://www.wealthsimple.com/", domain: "wealthsimple.com" },
      { name: "Questrade", url: "https://www.questrade.com/", domain: "questrade.com" }
    ]
  },
  {
    id: "other",
    names: { de: "Anderes Land", en: "Other country", ar: "دولتي غير موجودة" },
    note: {
      de: "Dein Land ist nicht dabei? Interactive Brokers ist in den meisten Ländern weltweit verfügbar.",
      en: "Your country isn't listed? Interactive Brokers is available in most countries worldwide.",
      ar: "بلدك غير مدرج؟ إنتراكتيف بروكرز متاح في معظم دول العالم."
    },
    platforms: [
      { name: "Interactive Brokers (IBKR)", url: "https://www.interactivebrokers.com/", domain: "interactivebrokers.com", logoUrl: "/img/broker-logos/interactive-brokers.png" }
    ]
  }
];
