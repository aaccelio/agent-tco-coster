(function (root, factory) {
  const defaults = (typeof module !== 'undefined' && module.exports)
    ? require('./defaults.js')
    : root.AgentCostDefaults;
  const api = factory(defaults);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AgentCostModel = api;
})(typeof self !== 'undefined' ? self : globalThis, function (DEFAULTS) {
  const EPS = 1e-9;

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function clone(p) {
    return Object.assign({}, p);
  }

  function line(id, label, component, amount, formula, note) {
    return { id, label, component, amount, formula, note: note || '' };
  }

  function compute(rawParams, componentStatuses) {
    const p = Object.assign(DEFAULTS.collectDefaults(), rawParams || {});
    const statuses = componentStatuses || {};
    const excluded = id => statuses[id] === 'écarté';

    const fx = num(p.fx_eur_per_usd);
    const toEUR = (usd, currency) => num(usd) * (currency === 'USD' ? fx : 1);

    const r = { params: p, lines: [], warnings: [] };

    const baselineHours = num(p.manual_analyses_per_year) * num(p.hours_per_analysis);
    const grossGain = baselineHours * num(p.avoidable_share);
    const pdeGross = grossGain * num(p.pde_share);
    const tsaGross = grossGain - pdeGross;
    const reviewHours = num(p.lots_per_year) * num(p.review_days_per_quarter) * num(p.review_hours_per_day);
    const pdeNet = pdeGross - reviewHours;
    const tsaNet = tsaGross;
    const netChain = pdeNet + tsaNet;
    const pdeBenefit = pdeNet * num(p.loaded_hourly_cost) * num(p.capture_rate);
    const tsaBenefit = tsaNet * num(p.loaded_hourly_cost) * num(p.capture_rate);
    const timeBenefit = pdeBenefit + tsaBenefit;

    r.benefits = {
      baselineHours, grossGain, pdeGross, tsaGross, reviewHours,
      pdeNet, tsaNet, netChain, pdeBenefit, tsaBenefit, timeBenefit
    };

    const aiCalls = num(p.unresolved_lines_per_pass) * num(p.passes_per_year);
    const linesPerBatch = num(p.terminals) * num(p.lines_per_terminal_per_quarter);

    let tokensInput = 0, tokensOutput = 0, tokensTotal = 0;
    let creditsInput = null, creditsOutput = null, creditsAI = 0, creditsFixed = 0;
    let tokenDetail = null;
    if (p.token_mode === 'split') {
      const meta = num(p.meta_prompt_tokens);
      const rag = num(p.rag_context_tokens);
      const hist = num(p.history_tokens);
      const user = num(p.user_input_tokens);
      const out = num(p.output_tokens_per_message);
      const inputPerMsg = meta + rag + hist + user;
      tokensInput = aiCalls * inputPerMsg;
      tokensOutput = aiCalls * out;
      tokensTotal = tokensInput + tokensOutput;
      creditsInput = tokensInput / 1000 * num(p.credits_per_1k_input);
      creditsOutput = tokensOutput / 1000 * num(p.credits_per_1k_output);
      creditsFixed = aiCalls * num(p.fixed_credits_per_message);
      creditsAI = creditsInput + creditsOutput + creditsFixed;
      tokenDetail = { meta, rag, hist, user, inputPerMsg, out };
    } else {
      tokensTotal = aiCalls * num(p.tokens_per_call);
      creditsAI = tokensTotal / 1000 * num(p.credits_per_1k_tokens);
      tokenDetail = { mode: 'legacy', tokensPerCall: num(p.tokens_per_call) };
    }

    const agentActionCredits = num(p.agent_flow_actions_per_pass) * num(p.passes_per_year) * num(p.credits_per_agent_action);
    const aiBuilderCredits = num(p.ai_builder_items_per_year) * num(p.ai_builder_credits_per_item);
    const totalCredits = creditsAI + agentActionCredits + aiBuilderCredits;

    const creditsCostPaygEUR = totalCredits * num(p.payg_price_per_credit_usd) * fx;
    const monthlyCredits = totalCredits / 12;
    const packsPerMonth = Math.ceil(monthlyCredits / Math.max(EPS, num(p.prepaid_pack_credits)));
    const creditsCostPrepaidEUR = packsPerMonth * num(p.prepaid_pack_price_usd) * 12 * fx;
    let creditsCostEUR = creditsCostPaygEUR;
    if (p.billing_mode === 'prepaid') creditsCostEUR = creditsCostPrepaidEUR;
    r.credits = {
      aiCalls, linesPerBatch, tokensInput, tokensOutput, tokensTotal,
      creditsInput, creditsOutput, creditsFixed, creditsAI, agentActionCredits,
      aiBuilderCredits, totalCredits, creditsCostPaygEUR, creditsCostPrepaidEUR,
      creditsCostEUR, packsPerMonth, tokenDetail
    };

    const licensesPA = excluded('power_apps') ? 0 : num(p.power_apps_premium_users) * num(p.power_apps_premium_price) * 12;
    const licensesPAF = excluded('power_automate') ? 0 : num(p.power_automate_premium_users) * toEUR(num(p.power_automate_premium_price), paramCurrency('power_automate_premium_price')) * 12;
    const licensesM365 = excluded('cs_agent') ? 0 : num(p.m365_copilot_users) * toEUR(num(p.m365_copilot_price), paramCurrency('m365_copilot_price')) * 12;
    const licensesCS = excluded('cs_agent') ? 0 : num(p.copilot_studio_maker_users) * toEUR(num(p.copilot_studio_maker_price), paramCurrency('copilot_studio_maker_price')) * 12;
    const paygCapacityEUR = excluded('copilot_credits') ? 0 : num(p.payg_capacity_units) * num(p.payg_capacity_usd_per_month) * 12 * fx;
    const licensesTotal = licensesPA + licensesPAF + licensesM365 + licensesCS;
    r.licenses = { licensesPA, licensesPAF, licensesM365, licensesCS, paygCapacityEUR, licensesTotal };

    const retentionYears = Math.max(1, num(p.retention_years));
    const incrementalGB = num(p.provisioned_capacity_gb) / retentionYears;
    const maturityYears = Math.min(Math.max(1, num(p.storage_maturity_years)), retentionYears);
    const capacityAtMaturity = incrementalGB * maturityYears;
    const storageCostEUR = excluded('dataverse') ? 0 : capacityAtMaturity * num(p.dataverse_price_per_gb_month) * 12;
    const sharepointCostEUR = excluded('sharepoint') ? 0 : num(p.sharepoint_extra_gb) * toEUR(num(p.sharepoint_price_per_gb_month), paramCurrency('sharepoint_price_per_gb_month')) * 12;
    const trajectory = [];
    for (let y = 1; y <= retentionYears; y++) {
      const cap = incrementalGB * y;
      trajectory.push({ year: y, capacityGB: cap, annualCost: cap * num(p.dataverse_price_per_gb_month) * 12 });
    }
    r.storage = {
      retentionYears, incrementalGB, maturityYears, capacityAtMaturity,
      storageCostEUR, sharepointCostEUR, storageTotalEUR: storageCostEUR + sharepointCostEUR,
      pricePerGBMonth: num(p.dataverse_price_per_gb_month), trajectory
    };

    const otherFlowsEUR = excluded('power_automate') ? 0 : num(p.other_flow_costs_per_year);
    const buildCostEUR = excluded('env') ? 0 : num(p.build_cost);
    r.run = { otherFlowsEUR, buildCostEUR };

    const costCreditsAI = excluded('cs_agent') ? 0 : creditsCostEUR;
    const costAgentActions = excluded('power_automate') ? 0 : 0;
    const costPaygCapacity = paygCapacityEUR;

    const annualCost = costCreditsAI + licensesTotal + costPaygCapacity + r.storage.storageTotalEUR + otherFlowsEUR + buildCostEUR;
    const annualCostRun = costCreditsAI + licensesTotal + costPaygCapacity + r.storage.storageTotalEUR + otherFlowsEUR;

    const targetSavings = num(p.opex_base) * num(p.savings_target_rate);
    const savingsAttributedBase = targetSavings * num(p.attributable_share_base);
    const totalBenefitBase = timeBenefit + savingsAttributedBase;
    const netBase = totalBenefitBase - annualCost;
    const roiBase = annualCost > EPS ? netBase / annualCost : null;
    const breakevenShare = targetSavings > EPS ? Math.max(0, (annualCost - timeBenefit) / targetSavings) : null;

    const savingsAttributedTarget = targetSavings * num(p.attributable_share_target);
    const totalBenefitTarget = timeBenefit + savingsAttributedTarget;
    const netTarget = totalBenefitTarget - annualCost;
    const roiTarget = annualCost > EPS ? netTarget / annualCost : null;
    const benefitCostTarget = annualCost > EPS ? totalBenefitTarget / annualCost : null;

    const costPDE = costCreditsAI;
    const resultPDE = pdeBenefit - costPDE;
    const costTSAShared = licensesTotal + costPaygCapacity + r.storage.storageTotalEUR + otherFlowsEUR + buildCostEUR;
    const resultTSA = tsaBenefit - costTSAShared;

    const totalUsers = num(p.power_apps_premium_users) + num(p.power_automate_premium_users) + num(p.m365_copilot_users) + num(p.copilot_studio_maker_users);

    r.results = {
      annualCost, annualCostRun, monthlyCost: annualCost / 12,
      targetSavings, savingsAttributedBase, totalBenefitBase, netBase, roiBase, breakevenShare,
      savingsAttributedTarget, totalBenefitTarget, netTarget, roiTarget, benefitCostTarget,
      costPDE, resultPDE, costTSAShared, resultTSA,
      costPerAICall: aiCalls > EPS ? annualCost / aiCalls : null,
      costPer1kTokens: tokensTotal > EPS ? annualCost / (tokensTotal / 1000) : null,
      costPerUser: totalUsers > EPS ? annualCost / totalUsers : null,
      costPerTerminal: num(p.terminals) > EPS ? annualCost / num(p.terminals) : null,
      totalUsers, aiCalls,
      buildAmortizedPerYear: num(p.horizon_years) > EPS ? buildCostEUR / num(p.horizon_years) : 0
    };

    r.lines = buildLines(r, p);
    return r;
  }

  function paramCurrency(id) {
    const def = DEFAULTS.paramById(id);
    return def && def.currency ? def.currency : 'EUR';
  }

  function buildLines(r, p) {
    const fx = num(p.fx_eur_per_usd);
    const L = [];
    const c = r.credits, s = r.storage, l = r.licenses;
    L.push(line('timeBenefit', 'Time benefit captured (€/yr)', 'scope', r.benefits.timeBenefit, `${r.benefits.netChain.toFixed(2)} h × ${p.loaded_hourly_cost} €/h × ${fmtPct(p.capture_rate)}`, 'Benefit, not a cost'));
    L.push(line('creditsAI', `Copilot Credits — AI tokens/messages (${c.totalCredits.toFixed(0)} credits)`, 'cs_agent', r.results.annualCost >= 0 ? c.creditsCostEUR : 0, c.tokensTotal > 0 ? `${c.tokensTotal.toFixed(0)} tok / 1000 × rate × $${p.payg_price_per_credit_usd}/credit × ${fx} €/$` : 'no AI calls', 'PAYG price path; see prepaid comparison'));
    L.push(line('agentActions', 'Agent-flow action credits', 'power_automate', c.agentActionCredits * num(p.payg_price_per_credit_usd) * fx, `${p.agent_flow_actions_per_pass} actions/pass × ${p.passes_per_year} passes × ${p.credits_per_agent_action} credits`, 'Included in credits total above when > 0'));
    L.push(line('aiBuilder', 'AI Builder credits', 'ai_builder', c.aiBuilderCredits * num(p.payg_price_per_credit_usd) * fx, `${p.ai_builder_items_per_year} items × ${p.ai_builder_credits_per_item} credits`, 'Included in credits total above when > 0'));
    L.push(line('paygCapacity', 'Copilot Studio PAYG tenant capacity', 'copilot_credits', l.paygCapacityEUR, `${p.payg_capacity_units} units × $${p.payg_capacity_usd_per_month}/mo × 12 × ${fx}`, 'Only if tenant capacity is provisioned'));
    L.push(line('licensesPA', `Power Apps Premium (${p.power_apps_premium_users} users)`, 'power_apps', l.licensesPA, `${p.power_apps_premium_users} × ${p.power_apps_premium_price} €/user/mo × 12`, 'Public FR price HT'));
    L.push(line('licensesPAF', `Power Automate Premium (${p.power_automate_premium_users} users)`, 'power_automate', l.licensesPAF, `${p.power_automate_premium_users} × $${p.power_automate_premium_price}/user/mo × 12 × ${fx}`, ''));
    L.push(line('licensesM365', `M365 Copilot consumers (${p.m365_copilot_users} users)`, 'cs_agent', l.licensesM365, `${p.m365_copilot_users} × $${p.m365_copilot_price}/user/mo × 12 × ${fx}`, 'Agent published in M365 channel'));
    L.push(line('licensesCS', `Copilot Studio maker users (${p.copilot_studio_maker_users})`, 'cs_agent', l.licensesCS, `${p.copilot_studio_maker_users} × $${p.copilot_studio_maker_price}/user/mo × 12 × ${fx}`, 'Price only if contractually confirmed'));
    L.push(line('storage', `Dataverse storage at maturity (${s.capacityAtMaturity.toFixed(0)} Go @ year ${s.maturityYears})`, 'dataverse', s.storageCostEUR, `${s.capacityAtMaturity.toFixed(1)} Go × ${s.pricePerGBMonth} €/Go/mo × 12`, 'Provision to qualify: base/log/files'));
    L.push(line('sharepointStorage', 'Extra SharePoint storage', 'sharepoint', s.sharepointCostEUR, `${p.sharepoint_extra_gb} Go × $${p.sharepoint_price_per_gb_month}/Go/mo × 12 × ${fx}`, 'Beyond included quota only'));
    L.push(line('otherFlows', 'Other flow / run costs provisioned', 'power_automate', r.run.otherFlowsEUR, 'flat provision', 'To qualify — not assumed zero in reality'));
    L.push(line('build', 'Build cost (one-time, year 1)', 'env', r.run.buildCostEUR, 'flat', `Amortized over ${p.horizon_years} years: ${r.results.buildAmortizedPerYear.toFixed(2)} €/yr`));
    return L;
  }

  function fmtPct(v) {
    return (num(v) * 100).toFixed(1) + '%';
  }

  function sensitivity(p, id, values, pick) {
    return values.map(v => {
      const q = clone(p);
      q[id] = v;
      const res = compute(q);
      const row = { value: v };
      for (const key of pick || ['annualCost', 'netBase', 'roiBase']) {
        const parts = key.split('.');
        let obj = res.results;
        for (const part of parts) obj = obj ? obj[part] : undefined;
        row[key] = typeof obj === 'object' && obj !== null && 'amount' in obj ? obj.amount : obj;
      }
      row.res = res;
      return row;
    });
  }

  function sensitivityGrid(p, idX, valuesX, idY, valuesY, fn) {
    return valuesY.map(y => {
      const row = { y };
      for (const x of valuesX) {
        const q = clone(p);
        q[idX] = x;
        q[idY] = y;
        row['x_' + x] = fn(compute(q), x, y);
      }
      return row;
    });
  }

  function standardSensitivities(p) {
    return {
      aiLines: sensitivity(p, 'unresolved_lines_per_pass', [50000, 80000, 180000], ['annualCost', 'netBase', 'breakevenShare']),
      avoidable: sensitivity(p, 'avoidable_share', [0.5, 0.75, 1], ['netBase', 'roiBase']).map(rw => {
        rw.hoursNet = rw.res.benefits.netChain;
        rw.timeBenefit = rw.res.benefits.timeBenefit;
        return rw;
      }),
      passes: sensitivity(p, 'passes_per_year', [2, 4], ['annualCost', 'netBase']),
      tokenPrice: sensitivity(p, 'credits_per_1k_tokens', [0.5, 1.5, 3], ['annualCost', 'netBase']),
      metaPrompt: sensitivity(p, 'meta_prompt_tokens', [0, 800, 2000, 5000], ['annualCost']).map(rw => {
        rw.credits = rw.res.credits.totalCredits;
        return rw;
      }),
      storageYears: sensitivity(p, 'storage_maturity_years', [3, 5], ['annualCost']).map(rw => {
        rw.capacityGB = rw.res.storage.capacityAtMaturity;
        rw.storageEUR = rw.res.storage.storageCostEUR;
        return rw;
      }),
      licenses: sensitivity(p, 'power_apps_premium_users', [0, 3, 6], ['annualCost', 'netBase']),
      savingsGrid: sensitivityGrid(p, 'savings_target_rate_realized', [0, 0.5, 1], 'attributable_share_grid', [0, 0.001, 0.01, 0.05, 1], (res) => res.results.netBase)
    };
  }

  function savingsGridFixed(p) {
    const target = num(p.opex_base) * num(p.savings_target_rate);
    const realizations = [0, 0.5, 1];
    const shares = [0, 0.001, 0.01, 0.05, 1];
    return shares.map(share => {
      const row = { share };
      for (const real of realizations) {
        const q = clone(p);
        const res = compute(q);
        const savings = target * real * share;
        const net = res.benefits.timeBenefit + savings - res.results.annualCost;
        const roi = res.results.annualCost > EPS ? net / res.results.annualCost : null;
        row['real_' + real] = { savings, net, roi };
      }
      return row;
    });
  }

  function sourcesTable(p, res) {
    return DEFAULTS.PARAMS.map(def => ({
      id: def.id,
      label: def.label,
      value: p[def.id] !== undefined ? p[def.id] : def.value,
      unit: def.unit || '',
      source: def.source || '',
      status: def.status || '',
      link: def.link || '',
      note: def.note || ''
    }));
  }

  return { compute, sensitivity, sensitivityGrid, standardSensitivities, savingsGridFixed, sourcesTable, clone, num };
});
