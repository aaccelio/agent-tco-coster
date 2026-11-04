(function () {
  const D = window.AgentCostDefaults;
  const M = window.AgentCostModel;

  const state = {
    params: D.collectDefaults(),
    statuses: Object.fromEntries(D.COMPONENTS.map(c => [c.id, c.status])),
    tab: 'hypotheses',
    res: null
  };

  const content = document.getElementById('content');
  const eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
  const numFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
  const intFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

  const fmtEUR = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : eur.format(v);
  const fmtN = (v, d = 2) => v === null || v === undefined || !Number.isFinite(v) ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: d }).format(v);
  const fmtPct = v => v === null || !Number.isFinite(v) ? '—' : (v * 100).toFixed(2) + '%';
  const fmtROI = v => v === null || !Number.isFinite(v) ? '—' : (v * 100).toFixed(1) + '%';

  function recompute() {
    state.res = M.compute(state.params, state.statuses);
  }

  function statusBadge(s) {
    const labels = { provided: 'provided', hypothesis: 'hypothesis', 'to-verify': 'to verify', app: 'app' };
    return `<span class="badge ${s}">${labels[s] || s}</span>`;
  }

  function fieldHtml(def) {
    const v = state.params[def.id];
    const input = def.type === 'select'
      ? `<select data-param="${def.id}">${def.options.map(o => `<option value="${o}" ${String(o) === String(v) ? 'selected' : ''}>${o}</option>`).join('')}</select>`
      : `<input type="number" data-param="${def.id}" value="${v}" min="${def.min !== undefined ? def.min : ''}" max="${def.max !== undefined ? def.max : ''}" step="${def.step || 'any'}">`;
    const link = def.link ? ` · <a href="${def.link}" target="_blank" rel="noopener" style="color:var(--accent)">doc</a>` : '';
    return `<div class="field">
      <label>${def.label}</label>
      <div class="meta">${input} <span class="unit">${def.unit || ''}</span> ${statusBadge(def.status)}${link}</div>
      ${def.note ? `<div class="note">${def.note}</div>` : ''}
    </div>`;
  }

  function renderHypotheses() {
    let html = '<h2>Hypotheses — every model parameter, with its source and verification status</h2>';
    for (const g of D.GROUPS) {
      const params = D.PARAMS.filter(p => p.group === g.id);
      if (!params.length) continue;
      html += `<div class="panel"><h3>${g.label}</h3><div class="grid">${params.map(fieldHtml).join('')}</div></div>`;
    }
    content.innerHTML = html;
  }

  function renderCalc() {
    const r = state.res;
    const b = r.benefits;
    let rows = '';
    rows += `<tr><td>Baseline time (analyses × hours)</td><td class="num">${fmtN(b.baselineHours, 1)} h</td><td class="formula">${state.params.manual_analyses_per_year} × ${state.params.hours_per_analysis}</td></tr>`;
    rows += `<tr><td>Gross gain (× avoidable share)</td><td class="num">${fmtN(b.grossGain, 3)} h</td><td class="formula">× ${fmtPct(state.params.avoidable_share)}</td></tr>`;
    rows += `<tr><td>— upstream (PDE) gross / net after review</td><td class="num">${fmtN(b.pdeGross, 3)} / ${fmtN(b.pdeNet, 3)} h</td><td class="formula">review ${fmtN(b.reviewHours, 1)} h subtracted once, on PDE only</td></tr>`;
    rows += `<tr><td>— downstream (TSA) gross / net</td><td class="num">${fmtN(b.tsaGross, 3)} / ${fmtN(b.tsaNet, 3)} h</td><td class="formula"></td></tr>`;
    rows += `<tr><td>Time benefit captured</td><td class="num">${fmtEUR(b.timeBenefit)}/yr</td><td class="formula">${fmtN(b.netChain, 1)} h × ${state.params.loaded_hourly_cost} €/h × ${fmtPct(state.params.capture_rate)}</td></tr>`;

    const c = r.credits;
    let tokLine = '';
    if (state.params.token_mode === 'split') {
      const t = c.tokenDetail;
      tokLine = `<tr><td>Token split per message (input = meta ${fmtN(t.meta, 0)} + RAG ${fmtN(t.rag, 0)} + history ${fmtN(t.hist, 0)} + user ${fmtN(t.user, 0)}; output ${fmtN(t.out, 0)})</td><td class="num">in ${fmtN(c.tokensInput, 0)} / out ${fmtN(c.tokensOutput, 0)}</td><td class="formula">× ${fmtN(c.aiCalls, 0)} calls/yr</td></tr>`
        + `<tr><td>Credits input / output / fixed</td><td class="num">${fmtN(c.creditsInput, 0)} / ${fmtN(c.creditsOutput, 0)} / ${fmtN(c.creditsFixed, 0)}</td><td class="formula">tok/1000 × credits/1k (in ${state.params.credits_per_1k_input}, out ${state.params.credits_per_1k_output})</td></tr>`;
    } else {
      tokLine = `<tr><td>AI tokens (legacy mode)</td><td class="num">${fmtN(c.tokensTotal, 0)} tok</td><td class="formula">${fmtN(c.aiCalls, 0)} calls × ${fmtN(state.params.tokens_per_call, 0)} tok × ${state.params.credits_per_1k_tokens} credits/1k = ${fmtN(c.creditsAI, 0)} credits</td></tr>`;
    }

    let costRows = '';
    for (const l of r.lines.filter(l => !['timeBenefit'].includes(l.id))) {
      costRows += `<tr><td>${l.label}${l.component ? `<span class="tag">${componentTitle(l.component)}</span>` : ''}</td><td class="num">${fmtEUR(l.amount)}</td><td class="formula">${l.formula || ''}</td></tr>`;
    }
    costRows += `<tr class="total"><td>Annual cost (year 1, incl. build)</td><td class="num">${fmtEUR(r.results.annualCost)}</td><td class="formula">run-rate excl. build: ${fmtEUR(r.results.annualCostRun)}/yr</td></tr>`;

    content.innerHTML = `
      <h2>Detailed annual calculation</h2>
      <div class="panel"><h3>Benefits (baseline → net gain)</h3><table>${rows}</table></div>
      <div class="panel"><h3>Consumption — tokens in/out, meta prompt, credits</h3><table>
        <tr><td>AI calls per year (unresolved lines × passes)</td><td class="num">${fmtN(c.aiCalls, 0)}</td><td class="formula">${fmtN(state.params.unresolved_lines_per_pass, 0)} × ${state.params.passes_per_year}</td></tr>
        ${tokLine}
        <tr><td>Agent-flow action credits / AI Builder credits</td><td class="num">${fmtN(c.agentActionCredits, 2)} / ${fmtN(c.aiBuilderCredits, 2)}</td><td class="formula">${state.params.agent_flow_actions_per_pass} × ${state.params.passes_per_year} × ${state.params.credits_per_agent_action}; ${fmtN(state.params.ai_builder_items_per_year, 0)} × ${state.params.ai_builder_credits_per_item}</td></tr>
        <tr><td>Total Copilot Credits / year</td><td class="num">${fmtN(c.totalCredits, 0)}</td><td class="formula">PAYG: ${fmtEUR(c.creditsCostPaygEUR)} · prepaid ${fmtN(c.packsPerMonth, 0)} pack(s)/mo: ${fmtEUR(c.creditsCostPrepaidEUR)}</td></tr>
      </table></div>
      <div class="panel"><h3>Annual cost lines</h3><table>${costRows}</table>
      <p class="legend">Cost lines of components marked “écarté” in tab 5 are zeroed. Credits total already includes agent-flow and AI Builder credits; their rows are shown for traceability only.</p></div>`;
  }

  function componentTitle(id) {
    const c = D.COMPONENTS.find(c => c.id === id);
    return c ? c.title.split('–')[0].trim() : id;
  }

  function barChart(items, maxV) {
    const max = maxV !== undefined ? maxV : Math.max(...items.map(i => Math.abs(i.value)), 1);
    return `<div class="chart">${items.map(i => `
      <div class="bar-row"><div>${i.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(0.5, Math.abs(i.value) / max * 100)}%;background:${i.color || 'var(--accent)'}"></div></div>
      <div class="bar-val">${i.valText}</div></div>`).join('')}</div>`;
  }

  function renderSummary() {
    const r = state.res, res = r.results;
    const kpis = `
      <div class="kpi"><div class="k">Annual cost (year 1)</div><div class="v">${fmtEUR(res.annualCost)}</div><div class="s">run-rate excl. one-time build: ${fmtEUR(res.annualCostRun)}/yr · ${fmtEUR(res.monthlyCost)}/mo</div></div>
      <div class="kpi"><div class="k">Time benefit captured</div><div class="v">${fmtEUR(r.benefits.timeBenefit)}/yr</div><div class="s">${fmtN(r.benefits.netChain, 1)} net hours of ${fmtN(r.benefits.baselineHours, 0)} h baseline</div></div>
      <div class="kpi"><div class="k">Net value — base case</div><div class="v ${res.netBase >= 0 ? 'good' : 'bad'}">${fmtEUR(res.netBase)}/yr</div><div class="s">ROI ${fmtROI(res.roiBase)} · savings attributed: ${fmtPct(state.params.attributable_share_base)}</div></div>
      <div class="kpi"><div class="k">Breakeven attribution</div><div class="v">${fmtPct(res.breakevenShare)}</div><div class="s">min share of the ${fmtEUR(res.targetSavings)} target needed to break even on time alone</div></div>
      <div class="kpi"><div class="k">Target scenario (${fmtPct(state.params.attributable_share_target)} attributed)</div><div class="v ${res.netTarget >= 0 ? 'good' : 'bad'}">${fmtEUR(res.netTarget)}/yr</div><div class="s">ROI ${fmtROI(res.roiTarget)} · benefit/cost ${fmtN(res.benefitCostTarget, 2)}×</div></div>
      <div class="kpi"><div class="k">Unit economics</div><div class="v" style="font-size:14px">${fmtEUR(res.costPerAICall)}/call</div><div class="s">${fmtEUR(res.costPer1kTokens)}/1k tok · ${fmtEUR(res.costPerUser)}/user · ${fmtEUR(res.costPerTerminal)}/terminal</div></div>`;

    const costItems = r.lines.filter(l => l.id !== 'timeBenefit' && l.amount !== 0)
      .map(l => ({ label: l.label.length > 42 ? l.label.slice(0, 42) + '…' : l.label, value: l.amount, valText: fmtEUR(l.amount) }));

    const split = `
      <div class="two-col">
        <div class="panel"><h3>Upstream (PDE) — precursor</h3>
          <table>
            <tr><td>Net gain after review</td><td class="num">${fmtN(r.benefits.pdeNet, 3)} h</td></tr>
            <tr><td>Benefit captured</td><td class="num">${fmtEUR(r.benefits.pdeBenefit)}</td></tr>
            <tr><td>Direct AI cost</td><td class="num">${fmtEUR(res.costPDE)}</td></tr>
            <tr class="total"><td>Result alone</td><td class="num" style="color:${res.resultPDE >= 0 ? 'var(--good)' : 'var(--bad)'}">${fmtEUR(res.resultPDE)}</td></tr>
          </table></div>
        <div class="panel"><h3>Downstream (TSA) — consumer + shared base</h3>
          <table>
            <tr><td>Net gain</td><td class="num">${fmtN(r.benefits.tsaNet, 3)} h</td></tr>
            <tr><td>Benefit captured</td><td class="num">${fmtEUR(r.benefits.tsaBenefit)}</td></tr>
            <tr><td>Licenses + shared base</td><td class="num">${fmtEUR(res.costTSAShared)}</td></tr>
            <tr class="total"><td>Result alone</td><td class="num" style="color:${res.resultTSA >= 0 ? 'var(--good)' : 'var(--bad)'}">${fmtEUR(res.resultTSA)}</td></tr>
          </table></div>
      </div>`;

    content.innerHTML = `
      <h2>Consolidated result</h2>
      <div class="kpis">${kpis}</div>
      <div class="panel" style="margin-top:16px"><h3>Annual cost breakdown</h3>
        ${costItems.length ? barChart(costItems) : '<p class="legend">No cost lines active — check component statuses in tab 5.</p>'}
      </div>
      ${split}
      <div class="panel"><h3>Dataverse capacity trajectory</h3>
        <table><tr><th>Year</th><th class="num">Cumulative capacity (Go)</th><th class="num">Annual cost</th></tr>
        ${r.storage.trajectory.map(t => `<tr><td>${t.year}</td><td class="num">${fmtN(t.capacityGB, 1)}</td><td class="num">${fmtEUR(t.annualCost)}</td></tr>`).join('')}
        <tr class="total"><td>Run-rate at year ${r.storage.maturityYears} (used in TCO)</td><td class="num">${fmtN(r.storage.capacityAtMaturity, 1)} Go</td><td class="num">${fmtEUR(r.storage.storageCostEUR)}</td></tr></table></div>`;
  }

  function sensTable(title, headers, rows) {
    return `<div class="panel"><h3>${title}</h3><table><tr>${headers.map(h => `<th class="${h.num ? 'num' : ''}">${h.label}</th>`).join('')}</tr>
      ${rows.map(row => `<tr>${headers.map(h => `<td class="${h.num ? 'num' : ''}">${row[h.key]}</td>`).join('')}</tr>`).join('')}</table></div>`;
  }

  function renderSensitivity() {
    const p = state.params;
    const s = M.standardSensitivities(p);
    const grid = M.savingsGridFixed(p);

    const aiRows = s.aiLines.map(x => ({ calls: fmtN(x.value, 0), credits: fmtEUR(x.res.credits.creditsCostEUR), annual: fmtEUR(x['annualCost']), net: fmtEUR(x['netBase']), breakeven: fmtPct(x['breakevenShare']) }));
    const avRows = s.avoidable.map(x => ({ share: fmtPct(x.value), hours: fmtN(x.hoursNet, 1), benefit: fmtEUR(x.timeBenefit), net: fmtEUR(x['netBase']), roi: fmtROI(x['roiBase']) }));
    const passRows = s.passes.map(x => ({ passes: x.value, annual: fmtEUR(x['annualCost']), net: fmtEUR(x['netBase']) }));
    const tokRows = s.tokenPrice.map(x => ({ rate: x.value, annual: fmtEUR(x['annualCost']), net: fmtEUR(x['netBase']) }));
    const metaRows = s.metaPrompt.map(x => ({ meta: fmtN(x.value, 0), credits: fmtN(x.credits, 0), annual: fmtEUR(x['annualCost']) }));
    const stRows = s.storageYears.map(x => ({ years: x.value, cap: fmtN(x.capacityGB, 1) + ' Go', storage: fmtEUR(x.storageEUR), annual: fmtEUR(x['annualCost']) }));
    const licRows = s.licenses.map(x => ({ users: x.value, annual: fmtEUR(x['annualCost']), net: fmtEUR(x['netBase']) }));

    const gridRows = grid.map(g => {
      const row = { share: fmtPct(g.share) };
      for (const k of Object.keys(g)) if (k.startsWith('real_')) {
        const cell = g[k];
        row[k] = `${fmtEUR(cell.net)} (${fmtROI(cell.roi)})`;
      }
      return row;
    });
    const gridHeaders = [{ key: 'share', label: 'Attributable share \\ target realized' }].concat([0, 0.5, 1].map(rr => ({ key: 'real_' + rr, label: fmtPct(rr) + ' of target', num: true })));

    content.innerHTML = `
      <h2>Sensitivity analysis — vary one hypothesis at a time</h2>
      <div class="two-col">
        ${sensTable('AI calls per pass (volume driver)', [
          { key: 'calls', label: 'Calls/yr input' }, { key: 'credits', label: 'Credits cost', num: true },
          { key: 'annual', label: 'Annual cost', num: true }, { key: 'net', label: 'Net (time only)', num: true }, { key: 'breakeven', label: 'Breakeven share', num: true }], aiRows)}
        ${sensTable('Avoidable share of baseline hours', [
          { key: 'share', label: 'Avoidable' }, { key: 'hours', label: 'Net hours', num: true }, { key: 'benefit', label: 'Benefit €/yr', num: true },
          { key: 'net', label: 'Net €/yr', num: true }, { key: 'roi', label: 'ROI', num: true }], avRows)}
        ${sensTable('Full passes per year', [
          { key: 'passes', label: 'Passes/yr' }, { key: 'annual', label: 'Annual cost', num: true }, { key: 'net', label: 'Net', num: true }], passRows)}
        ${sensTable('Credits per 1,000 tokens (price driver, legacy mode)', [
          { key: 'rate', label: 'Credits/1k tok' }, { key: 'annual', label: 'Annual cost', num: true }, { key: 'net', label: 'Net', num: true }], tokRows)}
        ${sensTable('MS meta/system prompt tokens per message (split mode)', [
          { key: 'meta', label: 'Meta tokens/msg' }, { key: 'credits', label: 'Total credits/yr', num: true }, { key: 'annual', label: 'Annual cost', num: true }], metaRows)}
        ${sensTable('Storage maturity', [
          { key: 'years', label: 'Years' }, { key: 'cap', label: 'Capacity', num: true }, { key: 'storage', label: 'Storage €/yr', num: true }, { key: 'annual', label: 'Annual cost', num: true }], stRows)}
        ${sensTable('Incremental Power Apps Premium users', [
          { key: 'users', label: 'Users' }, { key: 'annual', label: 'Annual cost', num: true }, { key: 'net', label: 'Net', num: true }], licRows)}
      </div>
      ${sensTable('Procurement savings grid — target realization × attributable share (net value / ROI)', gridHeaders, gridRows)}
      <p class="legend">The ${fmtEUR(state.res.results.targetSavings)} target is a goal, not an acquired gain: base case attributes ${fmtPct(p.attributable_share_base)}, 100% is an illustrative bound only.</p>`;
  }

  function renderComponents() {
    const rows = D.COMPONENTS.map(c => {
      const activeLines = c.lines.filter(lid => {
        const line = state.res.lines.find(l => l.id === lid);
        return line && line.amount !== 0;
      });
      const cost = activeLines.reduce((s, lid) => s + state.res.lines.find(l => l.id === lid).amount, 0);
      return `<tr>
        <td><strong>${c.title}</strong><div class="note" style="color:var(--muted);font-size:11px">${c.role}</div></td>
        <td><select class="status" data-component="${c.id}">
          ${['retenu', 'optionnel', 'à confirmer', 'écarté'].map(s => `<option ${state.statuses[c.id] === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select></td>
        <td>${c.lines.length ? c.lines.join(', ') : '<span style="color:var(--muted)">no direct cost line</span>'}</td>
        <td class="num">${cost ? fmtEUR(cost) + '/yr' : '—'}</td>
      </tr>`;
    }).join('');
    content.innerHTML = `
      <h2>Technical baseline — the 16 authorized components to examine</h2>
      <p class="legend">“Present in the stack” ≠ “required for this use case”. Set <em>écarté</em> to zero the cost lines of a component; <em>à confirmer</em> flags what must be proven in the tenant before go-live.</p>
      <div class="panel"><table>
        <tr><th>Component (exact baseline title)</th><th>Status</th><th>Cost lines driven</th><th class="num">Active cost</th></tr>
        ${rows}
      </table></div>`;
  }

  function renderSources() {
    const rows = M.sourcesTable(state.params, state.res).map(s => `<tr>
      <td>${s.id}</td><td>${s.label}</td>
      <td class="num">${typeof s.value === 'number' ? fmtN(s.value, 4) : s.value} ${s.unit}</td>
      <td>${s.source}</td><td>${statusBadge(s.status)}</td>
      <td>${s.link ? `<a href="${s.link}" target="_blank" rel="noopener" style="color:var(--accent)">link</a>` : ''}</td>
      <td style="color:var(--muted);font-size:11px">${s.note}</td></tr>`).join('');
    content.innerHTML = `
      <h2>Sources &amp; limits — provenance of every number</h2>
      <div class="panel"><table>
        <tr><th>Param</th><th>Label</th><th class="num">Value</th><th>Source</th><th>Status</th><th>Ref</th><th>Limit / note</th></tr>
        ${rows}
      </table></div>
      <div class="panel"><h3>Standing limits (from the reference model)</h3>
      <ul style="color:var(--muted);font-size:12.5px;line-height:1.6">
        <li>The ${fmtEUR(state.res.results.targetSavings)} savings target is a target, not a result; base case attributes 0%.</li>
        <li>${state.params.terminals} terminals is a projection perimeter; annualized gains do not automatically apply to the pilot.</li>
        <li>Measure on the pilot: file profiling, AI calls, real review time, the ${fmtN(state.res.benefits.baselineHours, 0)} h baseline, catalog volumes/quality.</li>
        <li>Confirm with Finance/IT: license counts, Dataverse capacity, flows owned by the app, Copilot Studio usage, Graph file module, contract and FX — effective costs to be confirmed.</li>
        <li>No price, quota, region or license is asserted without proof: “to verify” items need a targeted test in the tenant.</li>
      </ul></div>`;
  }

  const RENDERERS = {
    hypotheses: renderHypotheses,
    calc: renderCalc,
    summary: renderSummary,
    sensitivity: renderSensitivity,
    components: renderComponents,
    sources: renderSources
  };

  function render() {
    recompute();
    RENDERERS[state.tab]();
  }

  document.getElementById('tabs').addEventListener('click', e => {
    const btn = e.target.closest('button[data-tab]');
    if (!btn) return;
    state.tab = btn.dataset.tab;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b === btn));
    render();
  });

  content.addEventListener('input', e => {
    const el = e.target.closest('[data-param]');
    if (el) {
      const def = D.paramById(el.dataset.param);
      state.params[def.id] = def.type === 'select' ? el.value : Number(el.value);
      render();
      return;
    }
    const cs = e.target.closest('[data-component]');
    if (cs) {
      state.statuses[cs.dataset.component] = cs.value;
      render();
    }
  });

  function download(name, text, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  document.getElementById('btn-export-json').addEventListener('click', () => {
    recompute();
    download('agent-tco.json', JSON.stringify({ params: state.params, componentStatuses: state.statuses, results: state.res.results, credits: state.res.credits, benefits: state.res.benefits, lines: state.res.lines }, null, 2), 'application/json');
  });

  document.getElementById('btn-export-csv').addEventListener('click', () => {
    recompute();
    const esc = v => '"' + String(v).replace(/"/g, '""') + '"';
    const rows = [['line', 'component', 'amount_EUR_per_year', 'formula']]
      .concat(state.res.lines.map(l => [esc(l.label), l.component, l.amount.toFixed(2), esc(l.formula)]))
      .concat([['TOTAL annual cost (year 1)', '', state.res.results.annualCost.toFixed(2), ''], ['Net base', '', state.res.results.netBase.toFixed(2), ''], ['ROI base', '', state.res.results.roiBase === null ? '' : state.res.results.roiBase.toFixed(6), '']]);
    download('agent-tco-lines.csv', rows.map(r => r.join(',')).join('\n'), 'text/csv');
  });

  document.getElementById('btn-export-md').addEventListener('click', () => {
    recompute();
    const r = state.res;
    const md = [
      '# Agent TCO report — Copilot Studio stack', '',
      '## Consolidated result (base case)', '',
      `- Annual cost (year 1, incl. build): **${fmtEUR(r.results.annualCost)}** (run-rate excl. build: ${fmtEUR(r.results.annualCostRun)}/yr)`,
      `- Time benefit captured: **${fmtEUR(r.benefits.timeBenefit)}/yr** (${fmtN(r.benefits.netChain, 1)} net h of ${fmtN(r.benefits.baselineHours, 0)} h baseline)`,
      `- Net value: **${fmtEUR(r.results.netBase)}/yr**, ROI **${fmtROI(r.results.roiBase)}**`,
      `- Breakeven attribution of the ${fmtEUR(r.results.targetSavings)} target: **${fmtPct(r.results.breakevenShare)}**`,
      `- Target scenario (${fmtPct(state.params.attributable_share_target)} attributed): net **${fmtEUR(r.results.netTarget)}/yr**, ROI **${fmtROI(r.results.roiTarget)}**`,
      `- Unit economics: ${fmtEUR(r.results.costPerAICall)}/AI call · ${fmtEUR(r.results.costPer1kTokens)}/1k tokens · ${fmtEUR(r.results.costPerUser)}/user`, '',
      '## Cost lines', '',
      '| Line | Component | €/yr | Formula |', '|---|---|---|---|',
      ...r.lines.filter(l => l.id !== 'timeBenefit').map(l => `| ${l.label} | ${l.component} | ${l.amount.toFixed(2)} | ${l.formula} |`), '',
      '## Sources & limits', '',
      '| Param | Value | Source | Status | Note |', '|---|---|---|---|---|',
      ...M.sourcesTable(state.params, r).map(s => `| ${s.id} | ${typeof s.value === 'number' ? fmtN(s.value, 4) : s.value} ${s.unit} | ${s.source} | ${s.status} | ${s.note} |`),
      ''
    ].join('\n');
    download('agent-tco-report.md', md, 'text/markdown');
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    state.params = D.collectDefaults();
    state.statuses = Object.fromEntries(D.COMPONENTS.map(c => [c.id, c.status]));
    render();
  });

  render();
})();
