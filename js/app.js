(function () {
  const C = window.AgentCostCatalog;
  const M = window.AgentCostModel;

  const state = {
    params: C.collectDefaults(),
    statuses: Object.fromEntries(C.COMPONENTS.map(c => [c.id, c.status])),
    tab: 'volumes',
    sum: null
  };

  const content = document.getElementById('content');
  const eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
  const fmtEUR = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : eur.format(v);
  const fmtN = (v, d = 2) => v === null || v === undefined || !Number.isFinite(v) ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: d }).format(v);
  const fmtPct = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : (v * 100).toFixed(2) + '%';
  const fmtROI = v => v === null || !Number.isFinite(v) ? '—' : (v * 100).toFixed(1) + '%';

  const badge = s => {
    const labels = { provided: 'fourni', hypothesis: 'hypothèse', 'to-verify': 'à vérifier', app: 'app' };
    return `<span class="badge ${s}">${labels[s] || s}</span>`;
  };

  function recompute() {
    state.sum = M.summarize(state.params, state.statuses);
  }

  function fieldHtml(def, kind) {
    const v = state.params[def.id];
    const attr = kind === 'price' ? 'data-price' : 'data-driver';
    const input = def.type === 'select'
      ? `<select ${attr}="${def.id}">${def.options.map(o => `<option value="${o}" ${String(o) === String(v) ? 'selected' : ''}>${o}</option>`).join('')}</select>`
      : `<input type="number" ${attr}="${def.id}" value="${v}" min="${def.min !== undefined ? def.min : ''}" max="${def.max !== undefined ? def.max : ''}" step="${def.step || 'any'}">`;
    const link = def.link ? ` · <a href="${def.link}" target="_blank" rel="noopener" style="color:var(--accent)">doc</a>` : '';
    return `<div class="field">
      <label>${def.label}</label>
      <div class="meta">${input} <span class="unit">${def.unit || ''}</span> ${badge(def.status)}${link}</div>
      ${def.note ? `<div class="note">${def.note}</div>` : ''}
    </div>`;
  }

  function renderPrices() {
    let html = '<h2>Catalogue de prix — la seule source de chiffres durs, chacun sourcé et statuté</h2>';
    for (const g of C.PRICE_GROUPS) {
      const items = C.PRICES.filter(p => p.group === g.id);
      if (!items.length) continue;
      html += `<div class="panel"><h3>${g.label}</h3><div class="grid">${items.map(p => fieldHtml(p, 'price')).join('')}</div></div>`;
    }
    content.innerHTML = html;
  }

  function renderComponents() {
    const s = state.sum;
    const rows = C.COMPONENTS.map(c => {
      const cost = c.lines.reduce((sum, lid) => sum + M.lineAmount(s.last, lid) * 12, 0);
      return `<tr>
        <td><strong>${c.title}</strong><div style="color:var(--muted);font-size:11px">${c.role}</div></td>
        <td><select class="status" data-component="${c.id}">
          ${['retenu', 'optionnel', 'à confirmer', 'écarté'].map(x => `<option ${state.statuses[c.id] === x ? 'selected' : ''}>${x}</option>`).join('')}
        </select></td>
        <td>${c.lines.length ? c.lines.map(lid => C.lineById(lid).label).join('<br>') : '<span style="color:var(--muted)">aucune ligne de coût directe</span>'}</td>
        <td class="num">${cost ? fmtEUR(cost) + '/an' : '—'}</td>
      </tr>`;
    }).join('');
    content.innerHTML = `
      <h2>Baseline technique — les 16 composants autorisés</h2>
      <p class="legend">« Présent dans la stack » ≠ « requis ». <em>écarté</em> met à zéro les lignes de coût du composant ; <em>à confirmer</em> = à prouver dans le tenant avant go-live.</p>
      <div class="panel"><table>
        <tr><th>Composant (titre exact du baseline)</th><th>Statut</th><th>Lignes de coût pilotées</th><th class="num">Coût run-rate</th></tr>
        ${rows}
      </table></div>`;
  }

  function renderVolumes() {
    let html = '<h2>Volumes & croissance — les seules entrées métier (mesurables sur un pilote)</h2>';
    for (const g of C.DRIVER_GROUPS) {
      const items = C.DRIVERS.filter(d => d.group === g.id);
      if (!items.length) continue;
      html += `<div class="panel"><h3>${g.label}</h3><div class="grid">${items.map(d => fieldHtml(d, 'driver')).join('')}</div></div>`;
    }
    content.innerHTML = html;
  }

  function barChart(items) {
    const max = Math.max(...items.map(i => Math.abs(i.value)), 1);
    return `<div class="chart">${items.map(i => `
      <div class="bar-row"><div>${i.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(0.5, Math.abs(i.value) / max * 100)}%;background:${i.color || 'var(--accent)'}"></div></div>
      <div class="bar-val">${i.valText}</div></div>`).join('')}</div>`;
  }

  function renderProjection() {
    const s = state.sum;
    const kpis = `
      <div class="kpi"><div class="k">Coût année 1</div><div class="v">${fmtEUR(s.year1.total)}</div><div class="s">fixe ${fmtEUR(s.year1.fixed)} · variable ${fmtEUR(s.year1.variable)}</div></div>
      <div class="kpi"><div class="k">Run-rate annuel (fin d'horizon)</div><div class="v">${fmtEUR(s.runAnnual)}</div><div class="s">fixe ${fmtEUR(s.fixedRunAnnual)} · variable ${fmtEUR(s.variableRunAnnual)}</div></div>
      <div class="kpi"><div class="k">TCO sur ${state.params.horizon_years} ans</div><div class="v">${fmtEUR(s.tco)}</div><div class="s">${s.proj.monthsN} mois projetés</div></div>
      <div class="kpi"><div class="k">Crédits Copilot / an (run-rate)</div><div class="v" style="font-size:16px">${fmtN(s.creditsYear, 0)}</div><div class="s">${fmtEUR(s.creditsEURRunAnnual)}/an en mode ${state.params.billing_mode}${state.params.billing_mode === 'compare' ? ` (PAYG ${fmtEUR(s.last.billing.paygEUR * 12)} · prepaid ${fmtEUR(s.last.billing.prepaidEUR * 12)})` : ''}</div></div>
      <div class="kpi"><div class="k">Stockage Dataverse run-rate</div><div class="v" style="font-size:16px">${fmtN(s.gbRun, 1)} Go</div><div class="s">${fmtEUR(s.storageRunAnnual)}/an</div></div>
      <div class="kpi"><div class="k">Économie unitaire</div><div class="v" style="font-size:14px">${fmtEUR(s.perMessage)}/msg</div><div class="s">${fmtEUR(s.perUser)}/user · ${fmtEUR(s.perRun)}/run${s.perTerminal ? ' · ' + fmtEUR(s.perTerminal) + '/terminal' : ''}</div></div>`;

    const yearRows = s.proj.years.map(y => `<tr><td>Année ${y.year}</td><td class="num">${fmtN(y.credits, 0)}</td><td class="num">${fmtEUR(y.creditsEUR)}</td><td class="num">${fmtEUR(y.fixed)}</td><td class="num">${fmtEUR(y.variable)}</td><td class="num"><strong>${fmtEUR(y.total)}</strong></td></tr>`).join('');

    const compRows = C.COMPONENTS.filter(c => c.lines.length).map(c => {
      const cost = c.lines.reduce((sum, lid) => sum + M.lineAmount(s.last, lid) * 12, 0);
      return { label: c.title, value: cost, valText: fmtEUR(cost) };
    }).filter(x => x.value !== 0);

    const lineRows = s.last.lines.map(l => `<tr><td>${l.label}${l.component ? `<span class="tag">${C.COMPONENTS.find(c => c.id === l.component)?.title.split('–')[0].trim() || l.component}</span>` : ''}</td><td>${l.behavior}</td><td class="num">${fmtEUR(l.amount)}/mois</td><td class="num">${fmtEUR(l.amount * 12)}/an</td><td class="formula">${l.formula}</td></tr>`).join('');

    const roiBlock = `
      <div class="two-col">
        <div class="panel"><h3>Bénéfices & résultat (run-rate)</h3>
          <table>
            <tr><td>Baseline manuel</td><td class="num">${fmtN(s.baseline, 0)} h/an</td></tr>
            <tr><td>Gain brut (× ${fmtPct(state.params.avoidable_share)}) − revue ${fmtN(state.params.review_hours_per_year, 0)} h</td><td class="num">${fmtN(s.netH, 2)} h</td></tr>
            <tr><td>Bénéfice temps capté</td><td class="num">${fmtEUR(s.timeBenefit)}/an</td></tr>
            <tr><td>Split amont / aval (h)</td><td class="num">${fmtN(s.pdeNet, 3)} / ${fmtN(s.tsaNet, 3)}</td></tr>
            <tr><td>Cible savings (${fmtEUR(state.params.opex_base)} × ${fmtPct(state.params.savings_target_rate)})</td><td class="num">${fmtEUR(s.target)}/an</td></tr>
            <tr class="total"><td>Valeur nette — base (part attribuée ${fmtPct(state.params.attributable_share_base)})</td><td class="num" style="color:${s.netBase >= 0 ? 'var(--good)' : 'var(--bad)'}">${fmtEUR(s.netBase)}/an · ROI ${fmtROI(s.roiBase)}</td></tr>
            <tr><td>Point mort (part minimale de la cible)</td><td class="num">${fmtPct(s.breakeven)}</td></tr>
            <tr class="total"><td>Scénario cible (part ${fmtPct(state.params.attributable_share_target)})</td><td class="num" style="color:${s.netTarget >= 0 ? 'var(--good)' : 'var(--bad)'}">${fmtEUR(s.netTarget)}/an · ROI ${fmtROI(s.roiTarget)}</td></tr>
          </table></div>
        <div class="panel"><h3>Coût run-rate par composant (16 baseline)</h3>
        ${compRows.length ? barChart(compRows) : '<p class="legend">Aucune ligne active — voir onglet Composants.</p>'}</div>
      </div>`;

    content.innerHTML = `
      <h2>Projection — découper et anticiper le coût</h2>
      <div class="kpis">${kpis}</div>
      <div class="panel" style="margin-top:16px"><h3>Projection annuelle</h3>
        <table><tr><th>Année</th><th class="num">Crédits</th><th class="num">Crédits €</th><th class="num">Fixe €</th><th class="num">Variable €</th><th class="num">Total €</th></tr>${yearRows}
        <tr class="total"><td>TCO ${state.params.horizon_years} ans</td><td class="num">${fmtN(s.proj.years.reduce((a, y) => a + y.credits, 0), 0)}</td><td class="num">${fmtEUR(s.proj.years.reduce((a, y) => a + y.creditsEUR, 0))}</td><td></td><td></td><td class="num">${fmtEUR(s.tco)}</td></tr></table>
        ${barChart(s.proj.years.map(y => ({ label: 'Année ' + y.year, value: y.total, valText: fmtEUR(y.total) })))}
      </div>
      <div class="panel"><h3>Détail des lignes de coût (run-rate, dernier mois)</h3>
        <table><tr><th>Ligne</th><th>Comportement</th><th class="num">/mois</th><th class="num">/an</th><th>Formule</th></tr>${lineRows}</table></div>
      ${roiBlock}`;
  }

  function sensTable(title, headers, rows) {
    return `<div class="panel"><h3>${title}</h3><table><tr>${headers.map(h => `<th class="${h.num ? 'num' : ''}">${h.label}</th>`).join('')}</tr>
      ${rows.map(row => `<tr>${headers.map(h => `<td class="${h.num ? 'num' : ''}">${row[h.key]}</td>`).join('')}</tr>`).join('')}</table></div>`;
  }

  function renderScenarios() {
    const p = state.params;
    const sc = M.scenarios(p, state.statuses);
    const scRows = sc.map(x => ({ sc: x.label, run: fmtEUR(x.runAnnual), tco: fmtEUR(x.tco), net: fmtEUR(x.netBase), roi: fmtROI(x.roiBase) }));

    const msgSens = M.sensitivity(p, 'messages_per_month', [1000, 4400, 10000, 50000], state.statuses)
      .map(x => ({ v: fmtN(x.value, 0), run: fmtEUR(x.runAnnual), net: fmtEUR(x.netBase), roi: fmtROI(x.roiBase) }));
    const gbSens = M.sensitivity(p, 'storage_gb_per_month', [0, 1, 5, 10], state.statuses)
      .map(x => ({ v: fmtN(x.value, 1) + ' Go/mois', run: fmtEUR(x.runAnnual), net: fmtEUR(x.netBase) }));
    const userSens = M.sensitivity(p, 'pa_premium_users', [0, 5, 10, 50], state.statuses)
      .map(x => ({ v: x.value, run: fmtEUR(x.runAnnual), net: fmtEUR(x.netBase) }));
    const rateSens = M.sensitivity(p, 'credits_per_1k_input', [0.5, 1.5, 3, 6], state.statuses)
      .map(x => ({ v: x.value, run: fmtEUR(x.runAnnual), net: fmtEUR(x.netBase) }));
    const grid = M.savingsGrid(p, [0, 0.5, 1], [0, 0.001, 0.01, 0.05, 1], state.statuses);
    const gridRows = grid.map(g => {
      const row = { share: fmtPct(g.share) };
      for (const k of Object.keys(g)) if (k.startsWith('real_')) row[k] = `${fmtEUR(g[k].net)} (${fmtROI(g[k].roi)})`;
      return row;
    });

    content.innerHTML = `
      <h2>Scénarios & sensibilités</h2>
      ${sensTable('Scénarios de volume (multiplicateur sur messages / runs / items)', [
        { key: 'sc', label: 'Scénario' }, { key: 'run', label: 'Run-rate annuel', num: true }, { key: 'tco', label: 'TCO horizon', num: true }, { key: 'net', label: 'Net base', num: true }, { key: 'roi', label: 'ROI', num: true }], scRows)}
      <div class="two-col">
        ${sensTable('Messages agent / mois', [
          { key: 'v', label: 'messages/mois' }, { key: 'run', label: 'Run-rate €', num: true }, { key: 'net', label: 'Net €', num: true }, { key: 'roi', label: 'ROI', num: true }], msgSens)}
        ${sensTable('Croissance stockage (Go/mois)', [
          { key: 'v', label: 'Go/mois' }, { key: 'run', label: 'Run-rate €', num: true }, { key: 'net', label: 'Net €', num: true }], gbSens)}
        ${sensTable('Users Power Apps Premium', [
          { key: 'v', label: 'users' }, { key: 'run', label: 'Run-rate €', num: true }, { key: 'net', label: 'Net €', num: true }], userSens)}
        ${sensTable('Taux crédits / 1k tokens input', [
          { key: 'v', label: 'crédits/1k tok' }, { key: 'run', label: 'Run-rate €', num: true }, { key: 'net', label: 'Net €', num: true }], rateSens)}
      </div>
      ${sensTable('Cible savings — réalisation × part attribuable (net / ROI)', [{ key: 'share', label: 'Part attribuable \\ réalisation' }].concat([0, 0.5, 1].map(r => ({ key: 'real_' + r, label: fmtPct(r), num: true }))), gridRows)}
      <p class="legend">La cible de savings est un objectif, pas un acquis : cas de base à ${fmtPct(p.attributable_share_base)}, 100 % n'est qu'une borne illustrative.</p>`;
  }

  function renderValidation() {
    const results = M.validateAll();
    let html = '<h2>Validation — l\'exemple PDE→TSA ne sert qu\'à prouver que le moteur générique calcule juste</h2>';
    for (const r of results) {
      const rows = r.checks.map(c => `<tr>
        <td>${c.key}</td>
        <td class="num">${typeof c.expected === 'number' ? fmtN(c.expected, 6) : c.expected}</td>
        <td class="num">${typeof c.actual === 'number' ? fmtN(c.actual, 6) : c.actual}</td>
        <td><span class="badge ${c.ok ? 'ok' : 'ko'}">${c.ok ? 'OK' : 'ÉCART'}</span></td>
      </tr>`).join('');
      html += `<div class="panel"><h3>${r.fixture.name} — ${r.ok ? '<span class="badge ok">TOUS LES CONTRÔLES PASSENT</span>' : '<span class="badge ko">ÉCARTS DÉTECTÉS</span>'}</h3>
        <p class="legend">${r.fixture.note}</p>
        <table><tr><th>Contrôle</th><th class="num">Attendu (classeur)</th><th class="num">Calculé (moteur)</th><th>Statut</th></tr>${rows}</table></div>`;
    }
    content.innerHTML = html;
  }

  function renderSources() {
    const rows = M.sourcesTable(state.params).map(s => `<tr>
      <td>${s.id}</td><td>${s.label}</td>
      <td class="num">${fmtN(s.value, 4)} ${s.unit}${s.currency ? ' (' + s.currency + ')' : ''}</td>
      <td>${s.source}</td><td>${badge(s.status)}</td>
      <td>${s.link ? `<a href="${s.link}" target="_blank" rel="noopener" style="color:var(--accent)">lien</a>` : ''}</td>
      <td style="color:var(--muted);font-size:11px">${s.note}</td></tr>`).join('');
    content.innerHTML = `
      <h2>Sources & limites — provenance de chaque prix</h2>
      <div class="panel"><table>
        <tr><th>Prix</th><th>Libellé</th><th class="num">Valeur</th><th>Source</th><th>Statut</th><th>Réf</th><th>Limite / note</th></tr>
        ${rows}
      </table></div>
      <div class="panel"><h3>Limites permanentes (règles du baseline)</h3>
      <ul style="color:var(--muted);font-size:12.5px;line-height:1.6">
        <li>Aucun prix, quota, région, licence ou fonction n'est annoncé sans preuve : les éléments « à vérifier » nécessitent un test ciblé dans le tenant.</li>
        <li>« Présent dans la stack » n'implique pas « requis » : seuls les composants retenus portent des lignes de coût.</li>
        <li>Les volumes (messages, runs, Go/mois, profil de tokens) sont des hypothèses à mesurer sur le pilote, jamais des extrapolations.</li>
        <li>Le stockage Dataverse se mesure en base + log + fichiers ; aucune économie déduite du nombre de colonnes.</li>
        <li>La cible de savings est un objectif ; l'attribution à la solution se valide avec Procurement / Finance.</li>
      </ul></div>`;
  }

  const RENDERERS = {
    prices: renderPrices,
    components: renderComponents,
    volumes: renderVolumes,
    projection: renderProjection,
    scenarios: renderScenarios,
    validation: renderValidation,
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
    const el = e.target.closest('[data-driver],[data-price]');
    if (el) {
      const id = el.dataset.driver || el.dataset.price;
      const def = C.driverById(id) || C.priceById(id);
      state.params[id] = def && def.type === 'select' ? el.value : Number(el.value);
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
    download('agent-tco.json', JSON.stringify({
      params: state.params, componentStatuses: state.statuses,
      summary: { runAnnual: state.sum.runAnnual, tco: state.sum.tco, year1: state.sum.year1.total, netBase: state.sum.netBase, roiBase: state.sum.roiBase },
      runRateLines: state.sum.last.lines
    }, null, 2), 'application/json');
  });

  document.getElementById('btn-export-csv').addEventListener('click', () => {
    recompute();
    const esc = v => '"' + String(v).replace(/"/g, '""') + '"';
    const rows = [['ligne', 'composant', 'categorie', 'comportement', 'EUR_par_mois_runrate', 'EUR_par_an_runrate', 'formule']]
      .concat(state.sum.last.lines.map(l => [esc(l.label), l.component, l.category, l.behavior, l.amount.toFixed(2), (l.amount * 12).toFixed(2), esc(l.formula)]))
      .concat([['TOTAL run-rate annuel', '', '', '', '', state.sum.runAnnual.toFixed(2), '']]);
    download('agent-tco-lines.csv', rows.map(r => r.join(',')).join('\n'), 'text/csv');
  });

  document.getElementById('btn-export-md').addEventListener('click', () => {
    recompute();
    const s = state.sum;
    const md = [
      '# Rapport TCO agent — Copilot Studio stack', '',
      '## Run-rate annuel', `- Total : **${fmtEUR(s.runAnnual)}** (fixe ${fmtEUR(s.fixedRunAnnual)} · variable ${fmtEUR(s.variableRunAnnual)})`,
      `- Année 1 : ${fmtEUR(s.year1.total)} · TCO ${state.params.horizon_years} ans : ${fmtEUR(s.tco)}`,
      `- Crédits : ${fmtN(s.creditsYear, 0)}/an → ${fmtEUR(s.creditsEURRunAnnual)}/an`,
      `- Stockage : ${fmtN(s.gbRun, 1)} Go → ${fmtEUR(s.storageRunAnnual)}/an`,
      `- Économie unitaire : ${fmtEUR(s.perMessage)}/message · ${fmtEUR(s.perUser)}/user`, '',
      '## Résultat', `- Bénéfice temps : ${fmtEUR(s.timeBenefit)}/an · net base : ${fmtEUR(s.netBase)} (ROI ${fmtROI(s.roiBase)})`,
      `- Point mort : ${fmtPct(s.breakeven)} de la cible ${fmtEUR(s.target)} · scénario cible : ${fmtEUR(s.netTarget)} (ROI ${fmtROI(s.roiTarget)})`, '',
      '## Lignes de coût (run-rate)', '', '| Ligne | Composant | €/an | Formule |', '|---|---|---|---|',
      ...s.last.lines.map(l => `| ${l.label} | ${l.component} | ${(l.amount * 12).toFixed(2)} | ${l.formula} |`), '',
      '## Prix & sources', '', '| Prix | Valeur | Source | Statut | Note |', '|---|---|---|---|---|',
      ...M.sourcesTable(state.params).map(x => `| ${x.id} | ${fmtN(x.value, 4)} ${x.unit} | ${x.source} | ${x.status} | ${x.note} |`), ''
    ].join('\n');
    download('agent-tco-report.md', md, 'text/markdown');
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    state.params = C.collectDefaults();
    state.statuses = Object.fromEntries(C.COMPONENTS.map(c => [c.id, c.status]));
    render();
  });

  render();
})();
