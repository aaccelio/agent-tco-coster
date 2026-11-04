# Agent TCO — generic cost model for the Copilot Studio stack

A dependency-free web app that **decomposes and anticipates** the cost of any agent built on the Microsoft Copilot Studio / Power Platform stack. It is **not** tied to any single use case: the PDE→TSA workbook is used only as a **validation fixture** proving the generic engine computes correctly.

## Principle

```
monthly cost = Σ fixed lines (platform base) + Σ (volume driver × unit consumption × sourced unit price)
projected month by month over the horizon, with user ramp-up and storage growth
```

Three strictly separated layers:

1. **Price catalog** (`js/catalog.js` → `PRICES`) — the only hard numbers; each with unit, currency, source, verification status (`provided` / `hypothesis` / `to-verify`) and doc link. Baseline rule kept: no price without proof.
2. **Volume drivers** (`DRIVERS`) — the only business inputs: messages/month, runs/month, users per license type (+ ramp), token profile per message (MS meta prompt, RAG, history, user input, output), storage initial + growth, benefits, savings target. All measurable on a pilot.
3. **Baseline components** (`COMPONENTS`) — the exact 16-component catalog from the technical baseline; each maps to the cost lines it activates. `écarté` zeroes its lines.

Cost lines (`LINES`) are declared per component and behavior (fixed/variable) and category (license / credits / storage / run / one-time).

## Run

No build, no dependencies: open `index.html` in a browser, or `python3 -m http.server 8000` → `http://localhost:8000`.

## Tabs

1. **Price catalog** — sourced unit prices (Copilot Credits PAYG/prepaid/packs, credit rates per 1k input vs output tokens, licenses per type, Dataverse/SharePoint per GB, run/build, FX).
2. **Baseline — 16 components** — status matrix; live run-rate cost per component.
3. **Volumes & growth** — all drivers incl. token profile and ramp.
4. **Projection / TCO** — year-by-year table + chart, run-rate KPIs, fixed vs variable split, per-line detail with formulas, per-component breakdown, unit economics (€/message, €/user, €/run, €/terminal), benefits & ROI / breakeven.
5. **Scenarios & sensitivities** — low/base/high volume factors; one-way tables (messages, storage growth, users, input-token rate); realization × attributable-share grid.
6. **Validation** — replays the PDE→TSA fixture (`js/fixtures.js`) through the generic engine and compares against the reference workbook values (run-rate €17,830.80, net −€14,530.80, ROI −81.49 %, breakeven 0.363 %, target scenario €585,469.20 / ROI 32.83, sensitivities…), showing OK/ÉCART per control.
7. **Sources & limits** — provenance of every price + standing rules.

Exports (header): JSON (inputs + results), CSV (run-rate lines), Markdown report.

## Verify

```bash
node test/model.test.js     # generic engine unit tests
node test/fixture.test.js   # engine vs PDE→TSA reference workbook (validation fixture)
node test/ui.smoke.js       # headless render of all 7 tabs + live recompute
```

## Structure

```
index.html            app shell
styles.css            dark UI
js/catalog.js         price catalog + volume drivers + cost lines + 16 components + scenarios
js/fixtures.js        validation fixtures (PDE→TSA example + expected workbook values)
js/model.js           engine: computeMonth / project / summarize / scenarios / sensitivity / validateFixture
js/app.js             UI controller (7 tabs, live recompute, exports)
test/                 model.test.js, fixture.test.js, ui.smoke.js
```

## Cost decomposition axes

- **Behavior**: fixed (licenses, PAYG capacity, run provisions, one-time build) vs variable (credits, storage growth).
- **Category**: license / credits / storage / run / one-time.
- **Component**: any of the 16 baseline components.
- **Unit economics**: per message, per user, per run, per GB, per business terminal.
- **Time**: monthly series → annual totals → multi-year TCO, with ramp-up and storage growth.
