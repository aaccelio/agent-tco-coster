(function (root, factory) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const catalog = isNode ? require('./catalog.js') : root.AgentCostCatalog;
  const fixtures = isNode ? require('./fixtures.js') : root.AgentCostFixtures;
  const api = factory(catalog, fixtures);
  if (isNode) module.exports = api;
  root.AgentCostModel = api;
})(typeof self !== 'undefined' ? self : globalThis, function (CATALOG, FIXTURES) {
  const EPS = 1e-9;

  const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const clone = p => Object.assign({}, p);

  function collectDefaults() { return CATALOG.collectDefaults(); }

  function lineMeta(id) { return CATALOG.lineById(id) || { id, label: id, component: '', category: '', behavior: 'variable', formula: '' }; }

  function computeMonth(rawParams, m, statuses) {
    const p = Object.assign(collectDefaults(), rawParams || {});
    const st = statuses || {};
    const excluded = cid => st[cid] === 'écarté';
    m = Math.max(1, Math.floor(m));
    const fx = num(p.fx_eur_per_usd);
    const usd2eur = v => v * fx;
    const ramp = num(p.ramp_months) > 0 ? Math.min(1, m / num(p.ramp_months)) : 1;

    const lines = [];
    const addLine = (id, amount, detail) => {
      const meta = lineMeta(id);
      const amt = excluded(meta.component) ? 0 : amount;
      lines.push(Object.assign({
        id, label: meta.label, component: meta.component,
        category: meta.category, behavior: meta.behavior, formula: meta.formula, amount: amt
      }, detail || {}));
    };

    const usersPA = num(p.pa_premium_users) * ramp;
    const usersPAF = num(p.paf_premium_users) * ramp;
    const usersM365 = num(p.m365_copilot_users) * ramp;
    const usersCS = num(p.cs_maker_users) * ramp;
    addLine('license_pa_premium', usersPA * num(p.pa_premium_price), { users: usersPA });
    addLine('license_paf_premium', usd2eur(usersPAF * num(p.paf_premium_price)), { users: usersPAF });
    addLine('license_m365', usd2eur(usersM365 * num(p.m365_copilot_price)), { users: usersM365 });
    addLine('license_cs_maker', usd2eur(usersCS * num(p.cs_maker_price)), { users: usersCS });

    const messages = num(p.messages_per_month);
    const tokensIn = messages * (num(p.meta_prompt_tokens) + num(p.rag_context_tokens) + num(p.history_tokens) + num(p.user_input_tokens));
    const tokensOut = messages * num(p.output_tokens_per_message);
    const cTokIn = tokensIn / 1000 * num(p.credits_per_1k_input);
    const cTokOut = tokensOut / 1000 * num(p.credits_per_1k_output);
    const cFixed = messages * num(p.fixed_credits_per_message);
    const cTokens = cTokIn + cTokOut + cFixed;
    const cActions = num(p.runs_per_month) * num(p.agent_actions_per_run) * num(p.credits_per_agent_action);
    const cAI = num(p.ai_builder_items_per_month) * num(p.ai_builder_credits_per_item);
    const totalCredits = cTokens + cActions + cAI;

    const paygEUR = totalCredits * num(p.payg_price_per_credit) * fx;
    const packs = totalCredits > EPS ? Math.ceil(totalCredits / Math.max(EPS, num(p.prepaid_pack_credits))) : 0;
    const prepaidEUR = packs * num(p.prepaid_pack_price) * fx;
    const modeEUR = p.billing_mode === 'prepaid' ? prepaidEUR : paygEUR;
    const share = part => totalCredits > EPS ? modeEUR * part / totalCredits : 0;
    addLine('credits_tokens', share(cTokens), { credits: cTokens, creditsIn: cTokIn, creditsOut: cTokOut, creditsFixed: cFixed });
    addLine('credits_agent_actions', share(cActions), { credits: cActions });
    addLine('credits_ai_builder', share(cAI), { credits: cAI });

    addLine('payg_capacity', num(p.payg_capacity_units) * usd2eur(num(p.payg_capacity_price)));

    const gb = num(p.storage_initial_gb) + num(p.storage_gb_per_month) * m;
    addLine('storage_dataverse', gb * num(p.dataverse_price_per_gb_month), { gb });
    addLine('storage_sharepoint', usd2eur(num(p.sharepoint_extra_gb) * num(p.sharepoint_price_per_gb_month)));

    addLine('run_other', num(p.other_monthly_cost));
    addLine('build', m === 1 ? num(p.build_cost) : 0);

    const fixedTotal = lines.filter(l => l.behavior === 'fixed').reduce((s, l) => s + l.amount, 0);
    const variableTotal = lines.filter(l => l.behavior === 'variable').reduce((s, l) => s + l.amount, 0);
    const creditsEUR = lines.filter(l => l.category === 'credits').reduce((s, l) => s + l.amount, 0);

    return {
      month: m, lines, fixedTotal, variableTotal, creditsEUR, total: fixedTotal + variableTotal,
      credits: { tokensIn, tokensOut, cTokIn, cTokOut, cFixed, cTokens, cActions, cAI, totalCredits },
      messages, gb, ramp,
      users: usersPA + usersPAF + usersM365 + usersCS,
      billing: { paygEUR, prepaidEUR, packs, mode: p.billing_mode }
    };
  }

  function project(rawParams, statuses) {
    const p = Object.assign(collectDefaults(), rawParams || {});
    const monthsN = Math.max(1, Math.round(num(p.horizon_years))) * 12;
    const months = [];
    for (let m = 1; m <= monthsN; m++) months.push(computeMonth(p, m, statuses));
    const years = [];
    for (let y = 0; y < monthsN / 12; y++) {
      const slice = months.slice(y * 12, (y + 1) * 12);
      years.push({
        year: y + 1,
        total: slice.reduce((s, x) => s + x.total, 0),
        fixed: slice.reduce((s, x) => s + x.fixedTotal, 0),
        variable: slice.reduce((s, x) => s + x.variableTotal, 0),
        creditsEUR: slice.reduce((s, x) => s + x.creditsEUR, 0),
        credits: slice.reduce((s, x) => s + x.credits.totalCredits, 0)
      });
    }
    return { months, years, monthsN, total: months.reduce((s, x) => s + x.total, 0) };
  }

  function annualizedAtMonth(rawParams, m, statuses) {
    return computeMonth(rawParams, m, statuses).total * 12;
  }

  function lineAmount(monthRes, lineId) {
    const l = monthRes.lines.find(x => x.id === lineId);
    return l ? l.amount : 0;
  }

  function summarize(rawParams, statuses) {
    const p = Object.assign(collectDefaults(), rawParams || {});
    const proj = project(p, statuses);
    const last = proj.months[proj.months.length - 1];
    const year1 = proj.years[0];
    const runAnnual = last.total * 12;

    const baseline = num(p.baseline_hours_per_year);
    const gross = baseline * num(p.avoidable_share);
    const netH = gross - num(p.review_hours_per_year);
    const timeBenefit = netH * num(p.loaded_hourly_cost) * num(p.capture_rate);
    const pdeGross = gross * num(p.pde_share);
    const pdeNet = pdeGross - num(p.review_hours_per_year);
    const tsaNet = gross - pdeGross;

    const target = num(p.opex_base) * num(p.savings_target_rate);
    const savBase = target * num(p.attributable_share_base);
    const netBase = timeBenefit + savBase - runAnnual;
    const roiBase = runAnnual > EPS ? netBase / runAnnual : null;
    const breakeven = target > EPS ? Math.max(0, (runAnnual - timeBenefit) / target) : null;
    const savTarget = target * num(p.attributable_share_target);
    const netTarget = timeBenefit + savTarget - runAnnual;
    const roiTarget = runAnnual > EPS ? netTarget / runAnnual : null;

    const perUser = last.users > EPS ? runAnnual / last.users : null;
    const perMessage = num(p.messages_per_month) > EPS ? runAnnual / (num(p.messages_per_month) * 12) : null;
    const perRun = num(p.runs_per_month) > EPS ? runAnnual / (num(p.runs_per_month) * 12) : null;
    const perTerminal = num(p.terminals) > EPS ? runAnnual / num(p.terminals) : null;
    const storageRunAnnual = lineAmount(last, 'storage_dataverse') * 12;
    const licensesPARunAnnual = lineAmount(last, 'license_pa_premium') * 12;
    const creditsEURRunAnnual = last.billing.mode === 'prepaid' ? last.billing.prepaidEUR * 12 : last.billing.paygEUR * 12;

    return {
      proj, last, year1, runAnnual, tco: proj.total,
      fixedRunAnnual: last.fixedTotal * 12, variableRunAnnual: last.variableTotal * 12,
      baseline, gross, netH, timeBenefit, pdeGross, pdeNet, tsaNet,
      target, netBase, roiBase, breakeven, netTarget, roiTarget,
      creditsYear: last.credits.totalCredits * 12, creditsEURRunAnnual,
      storageRunAnnual, licensesPARunAnnual,
      perUser, perMessage, perRun, perTerminal,
      usersRun: last.users, gbRun: last.gb
    };
  }

  function applyVolumeFactor(p, factor) {
    const q = clone(p);
    q.messages_per_month = num(q.messages_per_month) * factor;
    q.runs_per_month = num(q.runs_per_month) * factor;
    q.ai_builder_items_per_month = num(q.ai_builder_items_per_month) * factor;
    return q;
  }

  function scenarios(rawParams, statuses) {
    return CATALOG.SCENARIOS.map(sc => {
      const s = summarize(applyVolumeFactor(rawParams || {}, sc.volumeFactor), statuses);
      return { id: sc.id, label: sc.label, volumeFactor: sc.volumeFactor, runAnnual: s.runAnnual, tco: s.tco, netBase: s.netBase, roiBase: s.roiBase };
    });
  }

  function sensitivity(rawParams, driverId, values, statuses) {
    return values.map(v => {
      const q = clone(rawParams || {});
      q[driverId] = v;
      const s = summarize(q, statuses);
      return { value: v, runAnnual: s.runAnnual, netBase: s.netBase, roiBase: s.roiBase, res: s };
    });
  }

  function savingsGrid(rawParams, realizations, shares, statuses) {
    const p = Object.assign(collectDefaults(), rawParams || {});
    const target = num(p.opex_base) * num(p.savings_target_rate);
    return shares.map(share => {
      const row = { share };
      for (const real of realizations) {
        const s = summarize(p, statuses);
        const savings = target * real * share;
        const net = s.timeBenefit + savings - s.runAnnual;
        row['real_' + real] = { savings, net, roi: s.runAnnual > EPS ? net / s.runAnnual : null };
      }
      return row;
    });
  }

  function validateFixture(f) {
    const checks = [];
    const eq = (key, actual, expected, tol) => {
      const t = tol === undefined ? 1e-6 : tol;
      const ok = Number.isFinite(actual) && Math.abs(actual - expected) <= t * Math.max(1, Math.abs(expected));
      checks.push({ key, expected, actual, ok });
    };
    const s = summarize(f.params, f.statuses);
    const e = f.expected;
    eq('runAnnual (coût annuel run-rate)', s.runAnnual, e.runAnnual);
    eq('Crédits / an', s.creditsYear, e.creditsYear);
    eq('Coût crédits € run-rate', s.creditsEURRunAnnual, e.creditsEUR_runAnnual);
    eq('Licences PA € run-rate', s.licensesPARunAnnual, e.licensesPA_runAnnual);
    eq('Stockage € run-rate (maturité)', s.storageRunAnnual, e.storage_runAnnual);
    eq('Stockage annualisé année 3', lineAmount(computeMonth(f.params, 36, f.statuses), 'storage_dataverse') * 12, e.storage_annualizedYear3);
    eq('Bénéfice temps €/an', s.timeBenefit, e.timeBenefit);
    eq('Gain net amont (h)', s.pdeNet, e.pdeNet);
    eq('Gain net aval (h)', s.tsaNet, e.tsaNet);
    eq('Valeur nette base €', s.netBase, e.netBase);
    eq('ROI base', s.roiBase, e.roiBase);
    eq('Part au point mort', s.breakeven, e.breakevenShare, 1e-4);
    eq('Valeur nette scénario cible €', s.netTarget, e.netTarget);
    eq('ROI scénario cible', s.roiTarget, e.roiTarget);
    if (e.sens) {
      for (const sens of e.sens) {
        const q = clone(f.params);
        q.messages_per_month = sens.messages_per_month;
        const rs = summarize(q, f.statuses);
        eq('Sensibilité messages=' + Math.round(sens.messages_per_month * 12) + '/an → run-rate €', rs.runAnnual, sens.runAnnual);
      }
    }
    return { fixture: f, checks, ok: checks.every(c => c.ok) };
  }

  function validateAll() {
    return (FIXTURES ? FIXTURES.FIXTURES : []).map(validateFixture);
  }

  function sourcesTable(p) {
    return CATALOG.PRICES.map(pr => ({
      id: pr.id, label: pr.label, value: p && p[pr.id] !== undefined ? p[pr.id] : pr.price,
      unit: pr.unit, currency: pr.currency || '', source: pr.source, status: pr.status, link: pr.link || '', note: pr.note || ''
    }));
  }

  return {
    computeMonth, project, summarize, annualizedAtMonth, lineAmount,
    scenarios, sensitivity, savingsGrid, applyVolumeFactor,
    validateFixture, validateAll, sourcesTable, collectDefaults, clone, num
  };
});
