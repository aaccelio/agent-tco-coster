const assert = require('node:assert');
const path = require('node:path');
const DEFAULTS = require(path.join(__dirname, '..', 'js', 'defaults.js'));
const MODEL = require(path.join(__dirname, '..', 'js', 'model.js'));

const p = DEFAULTS.collectDefaults();
const r = MODEL.compute(p);

function close(actual, expected, tol = 1e-6, label = '') {
  assert.ok(Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected)),
    `${label}: expected ${expected}, got ${actual}`);
}

assert.strictEqual(r.benefits.baselineHours, 240, 'baseline hours');
close(r.benefits.grossGain, 180, 1e-9, 'gross gain');
close(r.benefits.pdeGross, 95.625, 1e-9, 'PDE gross');
close(r.benefits.tsaGross, 84.375, 1e-9, 'TSA gross');
assert.strictEqual(r.benefits.reviewHours, 48, 'review hours');
close(r.benefits.pdeNet, 47.625, 1e-9, 'PDE net');
close(r.benefits.tsaNet, 84.375, 1e-9, 'TSA net');
close(r.benefits.netChain, 132, 1e-9, 'chain net hours');
close(r.benefits.pdeBenefit, 1190.625, 1e-9, 'PDE benefit');
close(r.benefits.tsaBenefit, 2109.375, 1e-9, 'TSA benefit');
close(r.benefits.timeBenefit, 3300, 1e-9, 'time benefit');

close(r.credits.aiCalls, 160000, 1e-12, 'AI calls');
close(r.credits.tokensTotal, 160000000, 1e-12, 'tokens legacy');
close(r.credits.creditsAI, 240000, 1e-9, 'credits IA');
close(r.credits.creditsCostEUR, 2208, 1e-9, 'credits cost EUR');

close(r.licenses.licensesPA, 622.8, 1e-9, 'Power Apps Premium');
close(r.storage.capacityAtMaturity, 50, 1e-9, 'capacity at maturity');
close(r.storage.storageCostEUR, 15000, 1e-9, 'storage cost');
assert.strictEqual(r.storage.trajectory.length, 5, 'trajectory years');
close(r.storage.trajectory[2].annualCost, 9000, 1e-9, 'year 3 cost');
close(r.storage.trajectory[4].annualCost, 15000, 1e-9, 'year 5 cost');

close(r.results.annualCost, 17830.8, 1e-9, 'annual cost');
close(r.results.netBase, -14530.8, 1e-9, 'net base');
close(r.results.roiBase, -0.8149269802813109, 1e-9, 'ROI base');
close(r.results.breakevenShare, 0.0036327, 1e-4, 'breakeven share');
close(r.results.costPDE, 2208, 1e-9, 'PDE cost');
close(r.results.resultPDE, -1017.375, 1e-9, 'PDE result');
close(r.results.costTSAShared, 15622.8, 1e-9, 'TSA cost');
close(r.results.resultTSA, -13513.425, 1e-9, 'TSA result');
close(r.results.savingsAttributedTarget, 600000, 1e-9, 'target scenario savings');
close(r.results.totalBenefitTarget, 603300, 1e-9, 'target benefit');
close(r.results.netTarget, 585469.2, 1e-9, 'target net');
close(r.results.roiTarget, 32.83471296857123, 1e-9, 'target ROI');
close(r.results.benefitCostTarget, 33.83471296857124, 1e-9, 'benefit/cost target');

const sens = MODEL.standardSensitivities(p);
close(sens.aiLines[0].res.credits.creditsCostEUR, 1380, 1e-9, 'sens 50k credits cost');
close(sens.aiLines[2].res.credits.creditsCostEUR, 4968, 1e-9, 'sens 180k credits cost');
close(sens.aiLines[0].res.results.annualCost, 17002.8, 1e-9, 'sens 50k annual');
close(sens.aiLines[2].res.results.annualCost, 20590.8, 1e-9, 'sens 180k annual');
close(sens.avoidable[0].hoursNet, 72, 1e-9, 'avoidable 50% hours');
close(sens.avoidable[2].hoursNet, 192, 1e-9, 'avoidable 100% hours');
close(sens.passes[1].res.results.annualCost, 20038.8, 1e-9, '4 passes annual');
close(sens.storageYears[0].res.storage.storageCostEUR, 9000, 1e-9, 'storage 3y');

const grid = MODEL.savingsGridFixed(p);
close(grid[2]['real_1'].savings, 40000, 1e-9, 'grid 1% x 100%');
close(grid[2]['real_1'].net, 25469.2, 1e-9, 'grid 1% net');
close(grid[4]['real_1'].net, 3985469.2, 1e-9, 'grid 100% net');
close(grid[1]['real_1'].roi, -0.5905960472889606, 1e-9, 'grid 0.1% ROI');

const split = MODEL.compute(Object.assign({}, p, {
  token_mode: 'split', meta_prompt_tokens: 800, rag_context_tokens: 4000,
  history_tokens: 1500, user_input_tokens: 300, output_tokens_per_message: 500,
  credits_per_1k_input: 1.5, credits_per_1k_output: 3.0
}));
close(split.credits.tokensInput, 160000 * 6600, 1e-9, 'split input tokens');
close(split.credits.tokensOutput, 160000 * 500, 1e-9, 'split output tokens');
close(split.credits.creditsInput, 160000 * 6.6 * 1.5, 1e-9, 'split input credits');
close(split.credits.creditsOutput, 160000 * 0.5 * 3.0, 1e-9, 'split output credits');

const prepaid = MODEL.compute(Object.assign({}, p, { billing_mode: 'prepaid' }));
close(prepaid.credits.packsPerMonth, 1, 1e-9, 'packs per month (240k/12=20k -> 1 pack)');
close(prepaid.credits.creditsCostPrepaidEUR, 200 * 12 * 0.92, 1e-9, 'prepaid annual EUR');

const excluded = MODEL.compute(p, { power_apps: 'écarté', dataverse: 'écarté' });
close(excluded.licenses.licensesPA, 0, 1e-12, 'excluded PA licenses zeroed');
close(excluded.storage.storageCostEUR, 0, 1e-12, 'excluded storage zeroed');
close(excluded.results.annualCost, 17830.8 - 622.8 - 15000, 1e-9, 'annual cost with exclusions');

const sources = MODEL.sourcesTable(p, r);
assert.strictEqual(sources.length, DEFAULTS.PARAMS.length, 'sources table covers all params');
assert.ok(sources.every(s => s.status && s.source), 'every param has source + status');

console.log('All model tests passed.');
console.log('Reference reproduction: annualCost=€' + r.results.annualCost.toFixed(2) +
  ', net=' + r.results.netBase.toFixed(2) +
  ', ROI=' + (r.results.roiBase * 100).toFixed(2) + '%' +
  ', target net=' + r.results.netTarget.toFixed(2) +
  ', target ROI=' + r.results.roiTarget.toFixed(2));
