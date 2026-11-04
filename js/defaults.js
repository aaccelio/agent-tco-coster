(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AgentCostDefaults = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const GROUPS = [
    { id: 'scope', label: 'Scope & productivity (benefit side)' },
    { id: 'ia', label: 'AI consumption — tokens in / out, meta prompt, RAG' },
    { id: 'credits', label: 'Copilot Credits billing (PAYG vs prepaid)' },
    { id: 'licenses', label: 'Licenses & access (per type, per user)' },
    { id: 'storage', label: 'Data & Dataverse storage' },
    { id: 'run', label: 'Run & build costs' },
    { id: 'savings', label: 'Procurement savings (sensitivity, not a promise)' },
    { id: 'fx', label: 'Currency' }
  ];

  const PARAMS = [
    { id: 'terminals', group: 'scope', label: 'Terminals / endpoints in scope', value: 37, unit: 'terminals', min: 0, step: 1, source: 'User business case (target scenario)', status: 'provided', note: 'Projection perimeter, not the 3 app users.' },
    { id: 'lines_per_terminal_per_quarter', group: 'scope', label: 'Lines per terminal per quarter', value: 25000, unit: 'lines', min: 0, step: 1000, source: 'Initial UC12 model', status: 'provided', note: 'Average initial value.' },
    { id: 'lots_per_year', group: 'scope', label: 'Data batches per year', value: 4, unit: 'batches', min: 1, max: 52, step: 1, source: 'Functional requirements workshop 29/09/2026', status: 'provided', note: 'Quarterly exports of new data.' },
    { id: 'manual_analyses_per_year', group: 'scope', label: 'Manual analyses per year', value: 30, unit: 'analyses', min: 0, step: 1, source: 'Initial UC07 model', status: 'provided', note: 'Initial business baseline, not measured.' },
    { id: 'hours_per_analysis', group: 'scope', label: 'Manual hours per analysis', value: 8, unit: 'h', min: 0, step: 0.5, source: 'Initial UC07 model', status: 'provided', note: '240 h/year for the PDE + TSA chain; do not double count.' },
    { id: 'avoidable_share', group: 'scope', label: 'Share of baseline hours actually avoidable', value: 0.75, unit: 'ratio', min: 0, max: 1, step: 0.05, format: 'pct', source: 'Modelling hypothesis 29/09/2026', status: 'hypothesis', note: 'Central hypothesis 75%, not confirmed by buyers.' },
    { id: 'pde_share', group: 'scope', label: 'Share of gross gain attributed to upstream (PDE)', value: 0.53125, unit: 'ratio', min: 0, max: 1, step: 0.01, format: 'pct', source: 'Initial UC07 split 127.5/240 h', status: 'hypothesis', note: 'Indicative attribution.' },
    { id: 'review_days_per_quarter', group: 'scope', label: 'Human review days per quarter', value: 1.5, unit: 'days', min: 0, step: 0.5, source: 'Functional requirements workshop 15:28', status: 'provided', note: 'Midpoint of the 1–2 days/quarter business range.' },
    { id: 'review_hours_per_day', group: 'scope', label: 'Hours per review day', value: 8, unit: 'h', min: 1, max: 24, step: 1, source: 'Modelling convention', status: 'hypothesis', note: 'To confirm.' },
    { id: 'loaded_hourly_cost', group: 'scope', label: 'Loaded hourly cost', value: 50, unit: '€/h', min: 0, step: 1, source: 'Initial UC07/UC12 models', status: 'hypothesis', note: 'Not confirmed for these buyers.' },
    { id: 'capture_rate', group: 'scope', label: 'Value capture rate', value: 0.5, unit: 'ratio', min: 0, max: 1, step: 0.05, format: 'pct', source: 'Initial hypothesis', status: 'hypothesis', note: 'To be approved by Finance.' },

    { id: 'token_mode', group: 'ia', label: 'Token accounting mode', value: 'legacy', type: 'select', options: ['legacy', 'split'], source: 'App', status: 'app', note: 'legacy = xlsx convention (tokens/call × credits/1k); split = separate input vs output token pricing incl. meta prompt.' },
    { id: 'unresolved_lines_per_pass', group: 'ia', label: 'Distinct unresolved AI lines per full pass', value: 80000, unit: 'lines', min: 0, step: 1000, source: 'architecture-pde-tse-MVP.pptx slide 7', status: 'hypothesis', note: 'Future projection NOT observed on 37 terminals. Santos pilot: 12,960 texts / 143,161 lines reported before rules.' },
    { id: 'passes_per_year', group: 'ia', label: 'Full passes equivalent per year', value: 2, unit: 'passes', min: 0, max: 52, step: 1, source: 'Initial UC07 convention', status: 'hypothesis', note: 'To reconcile with 4 batches/year and retries.' },
    { id: 'tokens_per_call', group: 'ia', label: 'Tokens per AI call (legacy mode)', value: 1000, unit: 'tokens', min: 0, step: 100, source: 'Initial UC07 run costs', status: 'hypothesis', note: 'Prudent initial convention; measure on pilot.' },
    { id: 'meta_prompt_tokens', group: 'ia', label: 'MS meta/system prompt tokens per message', value: 800, unit: 'tokens', min: 0, step: 50, source: 'To measure on pilot', status: 'to-verify', note: 'System prompt injected by Microsoft on every turn; billed as input tokens.' },
    { id: 'rag_context_tokens', group: 'ia', label: 'RAG grounding context tokens per message', value: 4000, unit: 'tokens', min: 0, step: 100, source: 'To measure on pilot', status: 'to-verify', note: 'Retrieved chunks injected into the prompt.' },
    { id: 'history_tokens', group: 'ia', label: 'Conversation history tokens per message', value: 1500, unit: 'tokens', min: 0, step: 100, source: 'To measure on pilot', status: 'to-verify', note: 'Prior turns kept in context window.' },
    { id: 'user_input_tokens', group: 'ia', label: 'User input tokens per message', value: 300, unit: 'tokens', min: 0, step: 50, source: 'To measure on pilot', status: 'to-verify', note: 'Prompt typed/uploaded by the user.' },
    { id: 'output_tokens_per_message', group: 'ia', label: 'Output (completion) tokens per message', value: 500, unit: 'tokens', min: 0, step: 50, source: 'To measure on pilot', status: 'to-verify', note: 'Average agent response length.' },
    { id: 'credits_per_1k_tokens', group: 'ia', label: 'Credits per 1,000 tokens (legacy mode)', value: 1.5, unit: 'credits/1k tok', min: 0, step: 0.1, source: 'Microsoft Learn — message management', status: 'to-verify', link: 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management', note: 'Standard AI tool rate per Microsoft Learn billing rates.' },
    { id: 'credits_per_1k_input', group: 'ia', label: 'Credits per 1,000 INPUT tokens (split mode)', value: 1.5, unit: 'credits/1k tok', min: 0, step: 0.1, source: 'Microsoft Learn — model billing rates', status: 'to-verify', link: 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management', note: 'Input incl. meta prompt, RAG, history.' },
    { id: 'credits_per_1k_output', group: 'ia', label: 'Credits per 1,000 OUTPUT tokens (split mode)', value: 3.0, unit: 'credits/1k tok', min: 0, step: 0.1, source: 'Microsoft Learn — model billing rates', status: 'to-verify', link: 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management', note: 'Output tokens usually priced higher than input.' },
    { id: 'fixed_credits_per_message', group: 'ia', label: 'Fixed orchestration credits per message', value: 0, unit: 'credits/msg', min: 0, step: 0.1, source: 'Microsoft Learn — agent orchestration', status: 'to-verify', note: 'Some agent actions consume a fixed credit amount per message.' },
    { id: 'agent_flow_actions_per_pass', group: 'ia', label: 'Billed agent-flow actions per pass', value: 0, unit: 'actions', min: 0, step: 1, source: 'Architecture FINAL slide 2 + MS Learn billing rates', status: 'provided', note: 'Two main flows under TSA_App as standard cloud flows → 0 agent-flow credits.' },
    { id: 'credits_per_agent_action', group: 'ia', label: 'Credits per agent-flow action', value: 0.13, unit: 'credits/action', min: 0, step: 0.01, source: 'Microsoft Learn billing rates', status: 'to-verify', link: 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management', note: 'Only if orchestration is implemented as agent flow.' },
    { id: 'ai_builder_items_per_year', group: 'ia', label: 'AI Builder processed items per year', value: 0, unit: 'items', min: 0, step: 100, source: 'Use case', status: 'to-verify', note: 'Only if AI Builder probabilistic processing is retained.' },
    { id: 'ai_builder_credits_per_item', group: 'ia', label: 'Credits per AI Builder item', value: 1, unit: 'credits/item', min: 0, step: 0.1, source: 'Microsoft Learn — AI Builder message management', status: 'to-verify', link: 'https://learn.microsoft.com/en-us/ai-builder/message-management', note: 'AI Builder is NOT free; do not assume bundled.' },

    { id: 'billing_mode', group: 'credits', label: 'Copilot Credits billing mode', value: 'payg', type: 'select', options: ['payg', 'prepaid', 'compare'], source: 'App', status: 'app', note: 'payg = per credit; prepaid = 25,000-credit packs; compare = both shown.' },
    { id: 'payg_price_per_credit_usd', group: 'credits', label: 'PAYG price per credit', value: 0.01, unit: '$/credit', min: 0, step: 0.001, source: 'Initial model; confirm CMA/CGM contract', status: 'to-verify', note: 'Public PAYG rate $0.01/credit.' },
    { id: 'prepaid_pack_credits', group: 'credits', label: 'Credits per prepaid pack', value: 25000, unit: 'credits', min: 1, step: 1000, source: 'Microsoft Learn — Copilot Credits capacity', status: 'to-verify', link: 'https://learn.microsoft.com/en-us/power-platform/admin/manage-copilot-studio-copilot-credits-capacity', note: '25,000 credits per pack.' },
    { id: 'prepaid_pack_price_usd', group: 'credits', label: 'Prepaid pack price', value: 200, unit: '$/pack/month', min: 0, step: 10, source: 'Microsoft Learn — Copilot Credits capacity', status: 'to-verify', link: 'https://learn.microsoft.com/en-us/power-platform/admin/manage-copilot-studio-copilot-credits-capacity', note: '$200 per 25,000 credits per month.' },
    { id: 'payg_capacity_usd_per_month', group: 'credits', label: 'Copilot Studio PAYG tenant capacity', value: 200, unit: '$/month', min: 0, step: 10, source: 'Microsoft Learn — Copilot Credits capacity', status: 'to-verify', link: 'https://learn.microsoft.com/en-us/power-platform/admin/manage-copilot-studio-copilot-credits-capacity', note: '$200/month per 25,000 credits of tenant capacity. Count = number of capacity units.' },
    { id: 'payg_capacity_units', group: 'credits', label: 'PAYG tenant capacity units', value: 0, unit: 'units', min: 0, step: 1, source: 'Tenant configuration', status: 'to-verify', note: '0 = credits billed purely per consumption.' },

    { id: 'power_apps_premium_users', group: 'licenses', label: 'Power Apps Premium incremental users', value: 3, unit: 'users', min: 0, step: 1, source: 'Functional requirements 33:18', status: 'provided', note: 'Max 3 users, same rights; existing rights to verify. App user is not a 4th business user.' },
    { id: 'power_apps_premium_price', group: 'licenses', label: 'Power Apps Premium price', value: 17.3, unit: '€/user/mo', min: 0, step: 0.1, currency: 'EUR', source: 'Power Apps France public pricing', status: 'to-verify', link: 'https://www.microsoft.com/fr-fr/power-platform/products/power-apps/pricing', note: 'Public FR price excl. VAT; contractual conditions not included.' },
    { id: 'power_automate_premium_users', group: 'licenses', label: 'Power Automate Premium users', value: 0, unit: 'users', min: 0, step: 1, source: 'Use case', status: 'to-verify', note: 'Needed if flows require premium connectors or per-user licensing.' },
    { id: 'power_automate_premium_price', group: 'licenses', label: 'Power Automate Premium price', value: 15, unit: '$/user/mo', min: 0, step: 0.5, currency: 'USD', source: 'Microsoft public pricing', status: 'to-verify', link: 'https://www.microsoft.com/en-us/power-platform/products/power-automate/pricing', note: 'Public $15/user/month; confirm contract.' },
    { id: 'm365_copilot_users', group: 'licenses', label: 'M365 Copilot licensed consumers (agent in M365 channel)', value: 0, unit: 'users', min: 0, step: 1, source: 'Use case', status: 'to-verify', note: 'Users chatting with the agent inside M365 Copilot need an M365 Copilot license.' },
    { id: 'm365_copilot_price', group: 'licenses', label: 'M365 Copilot price', value: 30, unit: '$/user/mo', min: 0, step: 1, currency: 'USD', source: 'Microsoft public pricing', status: 'to-verify', link: 'https://www.microsoft.com/en-us/microsoft-365/copilot', note: 'Public $30/user/month.' },
    { id: 'copilot_studio_maker_users', group: 'licenses', label: 'Copilot Studio maker/agent-owner users', value: 0, unit: 'users', min: 0, step: 1, source: 'Use case', status: 'to-verify', note: 'Makers building agents; license requirement to confirm per publication channel.' },
    { id: 'copilot_studio_maker_price', group: 'licenses', label: 'Copilot Studio per-user price', value: 0, unit: '$/user/mo', min: 0, step: 1, currency: 'USD', source: 'To confirm with Microsoft account team', status: 'to-verify', note: 'No public per-user Copilot Studio price assumed; set only if contractually confirmed.' },

    { id: 'retention_years', group: 'storage', label: 'Target history (years)', value: 5, unit: 'years', min: 1, max: 15, step: 1, source: 'Functional requirements 35:19-35:27', status: 'provided', note: 'Target if capacity/cost reasonable; minimum 3 years.' },
    { id: 'provisioned_capacity_gb', group: 'storage', label: 'Gross provisioned capacity at full history', value: 50, unit: 'Go', min: 0, step: 5, source: 'User framing 01/10/2026', status: 'hypothesis', note: '50 Go provision to qualify on 6 tables / 101 business columns.' },
    { id: 'storage_maturity_years', group: 'storage', label: 'Maturity year used for run-rate', value: 5, unit: 'years', min: 1, max: 15, step: 1, source: 'Model convention', status: 'hypothesis', note: 'Run-rate cost computed at this year of the capacity trajectory.' },
    { id: 'dataverse_price_per_gb_month', group: 'storage', label: 'Dataverse capacity price', value: 25, unit: '€/Go/mo', min: 0, step: 1, currency: 'EUR', source: 'Budget hypothesis 01/10/2026', status: 'to-verify', link: 'https://learn.microsoft.com/fr-fr/power-platform/admin/add-storage', note: 'Effective price to confirm in M365 admin center / CSP / EA.' },
    { id: 'sharepoint_extra_gb', group: 'storage', label: 'Extra SharePoint storage beyond included quota', value: 0, unit: 'Go', min: 0, step: 10, source: 'Use case', status: 'to-verify', note: 'Sources/outputs in SharePoint measured separately from Dataverse base/log/files.' },
    { id: 'sharepoint_price_per_gb_month', group: 'storage', label: 'Extra SharePoint storage price', value: 0.2, unit: '$/Go/mo', min: 0, step: 0.05, currency: 'USD', source: 'Microsoft public pricing', status: 'to-verify', note: 'Only for storage beyond tenant quota.' },

    { id: 'other_flow_costs_per_year', group: 'run', label: 'Other flow / run costs provisioned', value: 0, unit: '€/year', min: 0, step: 100, source: 'None confirmed at this stage', status: 'to-verify', note: 'Hosting/implementation of the CSV/XLSX app-only module not priced: cost to qualify, not assumed zero in reality.' },
    { id: 'build_cost', group: 'run', label: 'Build cost (one-time)', value: 0, unit: '€', min: 0, step: 500, source: 'None confirmed', status: 'to-verify', note: 'Counted in full in year 1, like the reference model.' },

    { id: 'opex_base', group: 'savings', label: 'Eligible OPEX base', value: 80000000, unit: '€/year', min: 0, step: 1000000, source: 'User-provided 80 M€', status: 'provided', note: 'Do not convert to dollars.' },
    { id: 'savings_target_rate', group: 'savings', label: 'Target savings rate on OPEX', value: 0.05, unit: 'ratio', min: 0, max: 1, step: 0.01, format: 'pct', source: 'Explicit user correction', status: 'provided', note: '5% × 80 M€ = 4 M€ target.' },
    { id: 'attributable_share_base', group: 'savings', label: 'Attributable share — base case', value: 0, unit: 'ratio', min: 0, max: 1, step: 0.01, format: 'pct', source: 'Model', status: 'hypothesis', note: '0% in base case without a validated attribution method.' },
    { id: 'attributable_share_target', group: 'savings', label: 'Attributable share — target scenario (illustration)', value: 0.15, unit: 'ratio', min: 0, max: 1, step: 0.01, format: 'pct', source: 'Model', status: 'hypothesis', note: '100% is an illustrative bound, not a central scenario.' },
    { id: 'horizon_years', group: 'savings', label: 'Business-case horizon', value: 5, unit: 'years', min: 1, max: 10, step: 1, source: 'Initial model', status: 'provided', note: 'Used to amortize build cost in multi-year view.' },

    { id: 'fx_eur_per_usd', group: 'fx', label: 'FX rate', value: 0.92, unit: '€/$', min: 0, step: 0.01, source: 'Initial model convention', status: 'hypothesis', note: 'Confirm contract FX.' }
  ];

  const COMPONENTS = [
    { id: 'env', title: 'Power Platform environment with Dataverse', role: 'Target environment, DEV/TEST/PROD stages, access, capacities.', lines: ['build'], status: 'à confirmer' },
    { id: 'dataverse', title: 'Dataverse persistent store', role: 'Entities and structured states to persist, grain, security, lifecycle.', lines: ['storage'], status: 'retenu' },
    { id: 'outlook', title: 'Office 365 Outlook connector', role: 'Read/trigger/send emails, identity and permissions.', lines: [], status: 'à confirmer' },
    { id: 'sharepoint', title: 'SharePoint connector', role: 'Read/write files, metadata, lists; sites and rights.', lines: ['sharepointStorage'], status: 'à confirmer' },
    { id: 'power_automate', title: 'Power Automate', role: 'Orchestration, triggers, retries, journaling.', lines: ['agentActions', 'otherFlows', 'licensesPAF'], status: 'retenu' },
    { id: 'office_scripts', title: 'Office Scripts', role: 'Excel workbook processing actually needed; formats, volumes, limits.', lines: [], status: 'écarté' },
    { id: 'ai_builder', title: 'AI Builder', role: 'Probabilistic processing with measurable value; quality and consumption evaluation.', lines: ['aiBuilder'], status: 'à confirmer' },
    { id: 'power_apps', title: 'Power Apps – HITL review / dashboard', role: 'Who reviews exceptions, which data/metrics the UI shows.', lines: ['licensesPA'], status: 'retenu' },
    { id: 'cs_agent', title: 'Conversational Copilot Studio Agent', role: 'Dialogue needed? users, actions, knowledge, guardrails.', lines: ['creditsAI', 'licensesM365', 'licensesCS'], status: 'retenu' },
    { id: 'mcp_dataverse', title: 'MCP Dataverse connector', role: 'Agent access to Dataverse data, operations, permissions.', lines: [], status: 'à confirmer' },
    { id: 'workiq', title: 'WorkIQ connector', role: 'Contextual Microsoft 365 access; exact offer/variant and availability status.', lines: [], status: 'à confirmer' },
    { id: 'todo', title: 'Microsoft To Do connector', role: 'Personal task useful? approved tracking tool for this process?', lines: [], status: 'écarté' },
    { id: 'rag', title: 'RAG knowledge source – SharePoint / OneDrive', role: 'Authorized documents for answers; rights, freshness, traceability.', lines: ['ragTokens'], status: 'à confirmer' },
    { id: 'teams', title: 'Microsoft Teams + M365 channel', role: 'Conversational interface or notifications; approved channels/audiences.', lines: [], status: 'à confirmer' },
    { id: 'dlp', title: 'DLP policy + connector allowlist', role: 'Policies applying to environment and each connector/tool/channel/source.', lines: [], status: 'retenu' },
    { id: 'copilot_credits', title: 'Copilot Credits capacity', role: 'Which usages consume credits, volume, allocation, tracking, budget limit.', lines: ['paygCapacity', 'creditsBilling'], status: 'retenu' }
  ];

  function collectDefaults() {
    const p = {};
    for (const param of PARAMS) p[param.id] = param.value;
    return p;
  }

  function paramById(id) {
    return PARAMS.find(p => p.id === id);
  }

  return { GROUPS, PARAMS, COMPONENTS, collectDefaults, paramById };
});
