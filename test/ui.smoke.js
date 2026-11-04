const path = require('node:path');
const assert = require('node:assert');

global.window = globalThis;

function makeEl(id) {
  const listeners = {};
  return {
    id, innerHTML: '', dataset: {}, value: '', listeners,
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    classList: { toggle() {}, add() {}, remove() {} },
    querySelectorAll() { return []; },
    closest() { return null; },
    click() {}
  };
}

const els = {};
global.document = {
  getElementById(id) { return els[id] = els[id] || makeEl(id); },
  querySelectorAll() { return []; },
  createElement() { return makeEl('dyn'); }
};
global.Blob = class { constructor(parts) { this.parts = parts; } };
global.URL.createObjectURL = () => 'blob:x';
global.URL.revokeObjectURL = () => {};

require(path.join(__dirname, '..', 'js', 'catalog.js'));
require(path.join(__dirname, '..', 'js', 'fixtures.js'));
require(path.join(__dirname, '..', 'js', 'model.js'));
require(path.join(__dirname, '..', 'js', 'app.js'));

const content = els['content'];
const tabsEl = els['tabs'];
const clickHandlers = tabsEl.listeners['click'] || [];
assert.strictEqual(clickHandlers.length, 1, 'tab handler registered');

function goTab(tab) {
  clickHandlers[0]({ target: { closest: sel => (sel === 'button[data-tab]' ? { dataset: { tab } } : null) } });
  assert.ok(content.innerHTML.length > 200, `tab ${tab} renders`);
  console.log(`tab ${tab}: ${content.innerHTML.length} chars OK`);
}

for (const tab of ['prices', 'components', 'volumes', 'projection', 'scenarios', 'sources']) goTab(tab);

goTab('volumes');
assert.ok(content.innerHTML.includes('Meta/system prompt MS par message'), 'volumes tab has meta prompt driver');
assert.ok(content.innerHTML.includes('value="0"'), 'null initial state: fields render at 0');

goTab('components');
assert.ok(content.innerHTML.includes('WorkIQ connector'), '16-component matrix renders');
assert.ok(content.innerHTML.includes('Copilot Credits capacity'), 'credits component renders');

goTab('projection');
assert.ok(content.innerHTML.includes('Run-rate annuel'), 'projection KPIs render');
assert.ok(content.innerHTML.includes('Crédits Copilot'), 'credits KPI renders');

goTab('scenarios');
assert.ok(content.innerHTML.includes('Scénarios de volume'), 'scenario table renders');

const inputHandlers = content.listeners['input'] || [];
assert.strictEqual(inputHandlers.length, 1, 'input handler registered');
goTab('projection');
const before = content.innerHTML;
inputHandlers[0]({ target: { closest: sel => (String(sel).includes('data-price') ? { dataset: { price: 'credits_per_1k_input' }, value: '1.5' } : null) } });
inputHandlers[0]({ target: { closest: sel => (String(sel).includes('data-driver') ? { dataset: { driver: 'messages_per_month' }, value: '50000' } : null) } });
inputHandlers[0]({ target: { closest: sel => (String(sel).includes('data-driver') ? { dataset: { driver: 'meta_prompt_tokens' }, value: '800' } : null) } });
assert.ok(content.innerHTML !== before, 'editing price+driver re-renders projection with non-zero cost');
assert.ok(content.innerHTML.includes('Run-rate annuel'), 'projection still renders after edit');

for (const btn of ['btn-export-json', 'btn-export-csv', 'btn-export-md', 'btn-reset']) {
  const hs = els[btn].listeners['click'] || [];
  assert.strictEqual(hs.length, 1, btn + ' handler registered');
  hs[0]();
}
console.log('exports + reset OK');
console.log('UI smoke test passed (6 tabs, null initial state).');
