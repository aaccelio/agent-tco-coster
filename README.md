# Agent TCO Calculator — Copilot Studio stack

A dependency-free web app to calculate the annual cost (TCO) of an agent built on the Microsoft Copilot Studio / Power Platform stack, grounded in two reference documents:

- **Technical baseline** (`yaiZpnrI-technical_baseline.md`): the catalog of the 16 authorized stack components and the rule *"never announce a price, quota, license or region without proof — mark À VÉRIFIER"*.
- **TCO/ROI model** (`lXzN1euY-2026-10-01-ROI-PDE-TSA-anonymous.xlsx`): the PDE→TSA chain model (Synthèse, Hypothèses, Stockage Dataverse, Calcul détaillé, Sensibilités, Sources et limites).

The engine reproduces the reference workbook exactly (see tests below).

## Run

No build step, no dependencies. Either:

- open `index.html` directly in a browser, or
- serve the folder: `python3 -m http.server 8000` then browse `http://localhost:8000`.

## Verify

```bash
node test/model.test.js   # engine vs xlsx reference numbers
node test/ui.smoke.js     # headless render of all tabs + live recompute
```

`model.test.js` asserts the exact reference values: annual cost **€17,830.80**, net **−€14,530.80**, ROI **−81.49%**, breakeven attribution **0.363%**, target scenario net **€585,469.20**, ROI **32.83**, plus sensitivity rows (50k/180k calls → €1,380/€4,968 credits cost, 4 passes → €20,038.80, storage 3y → €9,000).

## Tabs

1. **Hypotheses** — every parameter grouped (scope/productivity, AI tokens, Copilot Credits billing, licenses, storage, run/build, savings, FX), each with unit, source, verification status badge and doc link.
2. **Detailed calculation** — line-by-line annual cost with the formula behind each line, token in/out breakdown, credit totals, PAYG vs prepaid comparison.
3. **Summary & ROI** — KPIs (annual cost, benefit, net, ROI, breakeven share, target scenario), cost breakdown chart, PDE/TSA split, unit economics (€/call, €/1k tokens, €/user, €/terminal), Dataverse capacity trajectory.
4. **Sensitivities** — one-way tables (AI volume, avoidable share, passes, token price, meta-prompt tokens, storage maturity, license count) and the realization × attributable-share savings grid.
5. **Baseline — 16 components** — the exact baseline catalog; set each component to `retenu / optionnel / à confirmer / écarté`. `écarté` zeroes its cost lines live.
6. **Sources & limits** — provenance table for every number + standing limits; exportable.

## Parameters explored (per the baseline §4.4 "dimensionnement et coût")

- **License types**: Power Apps Premium (per user), Power Automate Premium, M365 Copilot consumers, Copilot Studio makers, Copilot Studio PAYG tenant capacity, Copilot Credits prepaid packs vs PAYG.
- **Number of users**: per license type; app-user vs business-user distinction kept.
- **Data costs**: Dataverse capacity (Go × €/Go/mo × 12) with year-by-year trajectory and maturity run-rate; extra SharePoint storage beyond quota.
- **Token input vs output**: split mode prices input (meta/system prompt + RAG context + history + user input) and output separately per 1,000 tokens; legacy mode keeps the workbook convention (tokens/call × credits/1k).
- **MS meta prompt**: dedicated `meta_prompt_tokens` parameter — the Microsoft system prompt injected on every turn, billed as input tokens.
- **Copilot Credits**: total credits = token credits + fixed per-message orchestration credits + agent-flow actions (× 0.13) + AI Builder items; billed PAYG ($/credit × FX) or via prepaid 25k-credit packs, with a compare mode.
- **Savings**: target = rate × OPEX base, attributed at a configurable share (0% base case); breakeven share computed.

## Exports

JSON (inputs + results), CSV (cost lines), Markdown report (results + sources & limits) — from the header buttons.

## Structure

```
index.html          app shell
styles.css          dark UI
js/defaults.js      parameter catalog (defaults, sources, statuses) + 16 components
js/model.js         pure calculation engine (browser + Node)
js/app.js           UI controller
test/model.test.js  engine tests vs xlsx reference numbers
test/ui.smoke.js    headless UI render/recompute test
```

All prices default to the values carried in the reference model and are flagged `to verify` with their Microsoft Learn / pricing links, per the baseline rule that no price is asserted without proof.
