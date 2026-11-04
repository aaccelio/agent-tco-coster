const path = require('node:path');
const assert = require('node:assert');

global.window = globalThis;

function makeEl(id) {
  const listeners = {};
  return {
    id,
    innerHTML: '',
    dataset: {},
    value: '',
    listeners,
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    classList: { toggle() {}, add() {}, remove() {} },
    querySelectorAll() { return []; },
    closest() { return null; },
    click() {}
  };
}

const els = {};
const documentStub = {
  getElementById(id) { return els[id] = els[id] || makeEl(id); },
  querySelectorAll() { return []; },
  createElement() { return makeEl('dyn'); }
};
global.document = documentStub;
global.Blob = class { constructor(parts) { this.parts = parts; } };
global.URL.createObjectURL = () => 'blob:x';
global.URL.revokeObjectURL = () => {};

require(path.join(__dirname, '..', 'js', 'defaults.js'));
require(path.join(__dirname, '..', 'js', 'model.js'));
require(path.join(__dirname, '..', 'js', 'app.js'));

const content = els['content'];
assert.ok(content.innerHTML.includes('Hypotheses'), 'hypotheses tab renders');
assert.ok(content.innerHTML.includes('meta_prompt_tokens') || content.innerHTML.includes('MS meta/system prompt'), 'meta prompt param present');
assert.ok(content.innerHTML.includes('Credits per 1,000 INPUT tokens'), 'input token pricing present');

const tabsEl = els['tabs'];
const clickHandlers = tabsEl.listeners['click'] || [];
assert.strictEqual(clickHandlers.length, 1, 'tab click handler registered');

for (const tab of ['calc', 'summary', 'sensitivity', 'components', 'sources', 'hypotheses']) {
  clickHandlers[0]({ target: { closest: sel => (sel === 'button[data-tab]' ? { dataset: { tab } } : null) } });
  assert.ok(content.innerHTML.length > 200, `tab ${tab} renders content`);
  console.log(`tab ${tab}: ${content.innerHTML.length} chars OK`);
}

assert.ok(content.innerHTML.includes('Power Platform environment with Dataverse') === false, 'components not on hypotheses');
clickHandlers[0]({ target: { closest: () => ({ dataset: { tab: 'components' } }) } });
assert.ok(content.innerHTML.includes('WorkIQ connector'), '16-component matrix renders');
assert.ok(content.innerHTML.includes('Copilot Credits capacity'), 'credits component renders');

clickHandlers[0]({ target: { closest: () => ({ dataset: { tab: 'summary' } }) } });
assert.ok(content.innerHTML.includes('17,830.80'), 'summary shows reference annual cost €17,830.80');
assert.ok(content.innerHTML.includes('585,469.20'), 'summary shows target scenario €585,469.20');

clickHandlers[0]({ target: { closest: () => ({ dataset: { tab: 'calc' } }) } });
assert.ok(content.innerHTML.includes('240,000'), 'calc shows 240,000 credits');

clickHandlers[0]({ target: { closest: () => ({ dataset: { tab: 'sensitivity' } }) } });
assert.ok(content.innerHTML.includes('meta/system prompt'), 'sensitivity includes meta prompt table');

clickHandlers[0]({ target: { closest: () => ({ dataset: { tab: 'sources' } }) } });
assert.ok(content.innerHTML.includes('payg_price_per_credit_usd'), 'sources table lists params');

const inputHandlers = content.listeners['input'] || [];
assert.strictEqual(inputHandlers.length, 1, 'input handler registered');
clickHandlers[0]({ target: { closest: () => ({ dataset: { tab: 'summary' } }) } });
inputHandlers[0]({ target: { closest: sel => (sel === '[data-param]' ? { dataset: { param: 'unresolved_lines_per_pass' }, value: '180000' } : null) } });
assert.ok(content.innerHTML.includes('20,590.80'), 'editing AI lines to 180k updates summary to €20,590.80');

for (const btn of ['btn-export-json', 'btn-export-csv', 'btn-export-md', 'btn-reset']) {
  const hs = (els[btn].listeners['click'] || []);
  assert.strictEqual(hs.length, 1, btn + ' handler registered');
  hs[0]();
}
console.log('exports + reset OK');

console.log('UI smoke test passed.');
