# Graph Report - money-with-rami-website  (2026-08-14)

## Corpus Check
- Corpus is ~18,324 words - fits in a single context window. You may not need a graph.

## Summary
- 78 nodes · 123 edges · 16 communities (8 shown, 8 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.82)
- Token cost: 0 input · 135,302 output

## Community Hubs (Navigation)
- Investment Calculator Logic
- Shared Site Utilities
- Fund/ETF Fee Calculator
- Site Pages & Concepts
- Project README & Deployment Docs
- Favicon Brand Mark
- Apple Touch Icon
- ING Broker Logo
- Interactive Brokers Logo
- Scalable Capital Logo
- Smartbroker+ Logo
- Trade Republic Logo
- Trading212 Logo
- XTB Logo

## God Nodes (most connected - your core abstractions)
1. `Money with Rami — Projektstruktur (README)` - 13 edges
2. `ETF vs. Fonds Kostenrechner Page` - 11 edges
3. `Investitionsrechner Page` - 11 edges
4. `render()` - 8 edges
5. `Money with Rami Landing Page` - 8 edges
6. `solve()` - 7 edges
7. `Impressum page (impressum/index.html)` - 7 edges
8. `Broker-Finder page (stuff_i_use/brokerage_finder/index.html)` - 6 edges
9. `applyStatic()` - 5 edges
10. `init()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Money with Rami — Projektstruktur (README)` --references--> `ETF vs. Fonds Kostenrechner Page`  [EXTRACTED]
  README.md → calculator/fund_etf_fees/index.html
- `Money with Rami — Projektstruktur (README)` --references--> `Investitionsrechner Page`  [EXTRACTED]
  README.md → calculator/investment/index.html
- `Money with Rami — Projektstruktur (README)` --references--> `Impressum legal requirement per § 5 TMG`  [EXTRACTED]
  README.md → impressum/index.html
- `Money with Rami — Projektstruktur (README)` --references--> `Impressum page (impressum/index.html)`  [EXTRACTED]
  README.md → impressum/index.html
- `Money with Rami — Projektstruktur (README)` --references--> `Money with Rami Landing Page`  [EXTRACTED]
  README.md → index.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Free static hosting options documented in README** — readme_github_pages, readme_netlify, readme_cloudflare_pages [INFERRED 0.80]
- **Shared Site Layout, Navigation & i18n Pattern** — index_page, calculator_fund_etf_fees_index_page, calculator_investment_index_page, js_i18n, js_common [EXTRACTED 1.00]
- **Calculator Pages Chart Rendering Pattern** — calculator_fund_etf_fees_index_page, calculator_investment_index_page, js_chart_helpers [EXTRACTED 1.00]

## Communities (16 total, 8 thin omitted)

### Community 0 - "Investment Calculator Logic"
Cohesion: 0.20
Nodes (15): buildExplanation(), computeFV(), drawChart(), formatRateNumber(), formatYears(), formatYearsNumber(), monthlyRateFromAnnual(), render() (+7 more)

### Community 1 - "Shared Site Utilities"
Cohesion: 0.29
Nodes (12): applyStatic(), fmtCompact(), fmtEUR(), fmtPct(), init(), initCurrencySwitches(), initNav(), locale() (+4 more)

### Community 2 - "Fund/ETF Fee Calculator"
Cohesion: 0.24
Nodes (4): bindSwitch(), drawChart(), render(), simulate()

### Community 3 - "Site Pages & Concepts"
Cohesion: 0.47
Nodes (9): ETF vs. Fonds Kostenrechner Page, Investitionsrechner Page, Affiliate links disclosure, ETF vs. Managed Fund Cost Comparison, Investment Goal Solver (Endkapital/Rate/Laufzeit), style.css, Impressum page (impressum/index.html), Money with Rami Landing Page (+1 more)

### Community 4 - "Project README & Deployment Docs"
Cohesion: 0.31
Nodes (9): Impressum legal requirement per § 5 TMG, Workflow: adding a new section/page, Cloudflare Pages (free hosting option), pyftsubset font subsetting workflow, GitHub Pages (free hosting option), Netlify (free hosting option), Money with Rami — Projektstruktur (README), Tajawal font-weight:600 registered from 500 cut (missing 600 weight workaround) (+1 more)

### Community 5 - "Favicon Brand Mark"
Cohesion: 0.67
Nodes (3): Purple/Yellow-Green Brand Color Scheme, "R" Monogram Mark, Site Favicon Icon (Letter R)

## Knowledge Gaps
- **10 isolated node(s):** `ING broker logo`, `Interactive Brokers Logo`, `Scalable Capital logo`, `Smartbroker+ Logo`, `Trade Republic Logo` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Investitionsrechner Page` connect `Site Pages & Concepts` to `Investment Calculator Logic`, `Shared Site Utilities`, `Fund/ETF Fee Calculator`, `Project README & Deployment Docs`?**
  _High betweenness centrality (0.238) - this node is a cross-community bridge._
- **Why does `Money with Rami — Projektstruktur (README)` connect `Project README & Deployment Docs` to `Site Pages & Concepts`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Why does `ETF vs. Fonds Kostenrechner Page` connect `Site Pages & Concepts` to `Shared Site Utilities`, `Fund/ETF Fee Calculator`, `Project README & Deployment Docs`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **What connects `ING broker logo`, `Interactive Brokers Logo`, `Scalable Capital logo` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._