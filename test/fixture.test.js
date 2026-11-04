const assert = require('node:assert');
const path = require('node:path');
const M = require(path.join(__dirname, '..', 'js', 'model.js'));
const FIXTURES = require(path.join(__dirname, '..', 'js', 'fixtures.js'));

assert.ok(FIXTURES.FIXTURES.length >= 1, 'at least one validation fixture');

for (const f of FIXTURES.FIXTURES) {
  const r = M.validateFixture(f);
  for (const c of r.checks) {
    assert.ok(c.ok, `${f.id} — ${c.key}: expected ${c.expected}, got ${c.actual}`);
  }
  console.log(`${f.id}: ${r.checks.length}/${r.checks.length} controls OK (runAnnual=${r.checks[0].actual.toFixed(2)} EUR)`);
}

const s = M.summarize(FIXTURES.FIXTURES[0].params, FIXTURES.FIXTURES[0].statuses);
console.log('Reference reproduction: run-rate=€' + s.runAnnual.toFixed(2) +
  ', net=' + s.netBase.toFixed(2) + ', ROI=' + (s.roiBase * 100).toFixed(2) + '%' +
  ', breakeven=' + (s.breakeven * 100).toFixed(4) + '%' +
  ', target net=' + s.netTarget.toFixed(2) + ', target ROI=' + s.roiTarget.toFixed(2));
console.log('All fixture validation tests passed.');
