(function (root) {
  const msg = 'js/defaults.js is deprecated — use js/catalog.js (PRICES, DRIVERS, LINES, COMPONENTS, SCENARIOS). Kept as a thin alias for backward compatibility.';
  if (typeof console !== 'undefined') console.warn(msg);
  const api = root.AgentCostCatalog || (typeof module !== 'undefined' && module.exports ? require('./catalog.js') : null);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AgentCostDefaults = api;
})(typeof self !== 'undefined' ? self : globalThis);
