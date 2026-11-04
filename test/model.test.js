const assert = require('node:assert');
const path = require('node:path');
const C = require(path.join(__dirname, '..', 'js', 'catalog.js'));
const M = require(path.join(__dirname, '..', 'js', 'model.js'));

function close(actual, expected, tol = 1e-9, label = '') {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected)),
    `${label}: expected ${expected}, got ${actual}`);
}

const p = C.collectDefaults();

let m1 = M.computeMonth(p, 1);
assert.ok(m1.total > 0, 'month 1 has a positive cost');
assert.strictEqual(m1.lines.length, C.LINES.length, 'all cost lines emitted');
close(M.lineAmount(m1, 'license_pa_premium'), 5 * 17.3, 1e-12, 'PA premium 5 users');
close(M.lineAmount(m1, 'build'), 0, 1e-12, 'no build by default');

const p2 = Object.assign({}, p, { build_cost: 10000, other_monthly_cost: 100 });
close(M.lineAmount(M.computeMonth(p2, 1), 'build'), 10000, 1e-12, 'build in month 1 only');
close(M.lineAmount(M.computeMonth(p2, 2), 'build'), 0, 1e-12, 'build not in month 2');
close(M.lineAmount(M.computeMonth(p2, 2), 'run_other'), 100, 1e-12, 'other run cost monthly');

const p3 = Object.assign({}, p, { messages_per_month: 1200, meta_prompt_tokens: 500, rag_context_tokens: 500, history_tokens: 0, user_input_tokens: 0, output_tokens_per_message: 1000, credits_per_1k_input: 2, credits_per_1k_output: 4 });
const m3 = M.computeMonth(p3, 1);
close(m3.credits.tokensIn, 1200 * 1000, 1e-12, 'input tokens');
close(m3.credits.tokensOut, 1200 * 1000, 1e-12, 'output tokens');
close(m3.credits.totalCredits, 1200 * 1000 / 1000 * 2 + 1200 * 1000 / 1000 * 4, 1e-12, 'credits in+out');
close(m3.billing.paygEUR, m3.credits.totalCredits * 0.01 * 0.92, 1e-12, 'payg EUR');

const pPre = Object.assign({}, p3, { billing_mode: 'prepaid' });
const mPre = M.computeMonth(pPre, 1);
assert.strictEqual(mPre.billing.packs, Math.ceil(mPre.credits.totalCredits / 25000), 'prepaid packs rounded up');
close(mPre.billing.prepaidEUR, mPre.billing.packs * 200 * 0.92, 1e-12, 'prepaid EUR');

const p4 = Object.assign({}, p, { pa_premium_users: 10, ramp_months: 6 });
close(M.computeMonth(p4, 1).lines.find(l => l.id === 'license_pa_premium').users, 10 / 6, 1e-12, 'ramp month 1');
close(M.computeMonth(p4, 6).lines.find(l => l.id === 'license_pa_premium').users, 10, 1e-12, 'ramp full at month 6');
close(M.computeMonth(p4, 12).lines.find(l => l.id === 'license_pa_premium').users, 10, 1e-12, 'ramp capped');

const p5 = Object.assign({}, p, { storage_initial_gb: 10, storage_gb_per_month: 2 });
close(M.computeMonth(p5, 1).gb, 12, 1e-12, 'gb month 1 = initial + growth×m');
close(M.computeMonth(p5, 12).gb, 34, 1e-12, 'gb month 12');

const p6 = Object.assign({}, p, { horizon_years: 3 });
const proj = M.project(p6);
assert.strictEqual(proj.months.length, 36, '36 months');
assert.strictEqual(proj.years.length, 3, '3 years');
close(proj.total, proj.months.reduce((s, x) => s + x.total, 0), 1e-12, 'TCO = sum of months');
close(proj.years.reduce((s, y) => s + y.total, 0), proj.total, 1e-12, 'years sum = TCO');

const s = M.summarize(p6);
close(s.runAnnual, proj.months[35].total * 12, 1e-12, 'runAnnual = last month × 12');
assert.strictEqual(s.breakeven, null, 'breakeven null without savings target');

const excl = M.summarize(p6, { power_apps: 'écarté', dataverse: 'écarté' });
close(M.lineAmount(excl.last, 'license_pa_premium'), 0, 1e-12, 'excluded component zeroed');
close(M.lineAmount(excl.last, 'storage_dataverse'), 0, 1e-12, 'excluded storage zeroed');
assert.ok(excl.runAnnual < s.runAnnual, 'exclusion lowers cost');

const sc = M.scenarios(p6);
assert.strictEqual(sc.length, 3, '3 scenarios');
assert.ok(sc[0].runAnnual <= sc[1].runAnnual && sc[1].runAnnual <= sc[2].runAnnual, 'scenario ordering low≤base≤high');

const sens = M.sensitivity(p6, 'messages_per_month', [1000, 10000]);
assert.ok(sens[1].runAnnual > sens[0].runAnnual, 'more messages → higher cost');

const grid = M.savingsGrid(Object.assign({}, p6, { opex_base: 1000000, savings_target_rate: 0.05 }), [0, 1], [0, 1]);
close(grid[1]['real_1'].savings, 50000, 1e-9, 'grid savings 100%×100%');

console.log('All generic model tests passed.');
