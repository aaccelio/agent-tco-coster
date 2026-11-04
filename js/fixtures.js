(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AgentCostFixtures = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const PDE_TSA = {
    id: 'pde-tsa',
    name: 'Exemple PDE→TSA — classeur ROI 2026-10-01 (fixture de validation)',
    note: 'Ce fixture ne pilote pas le moteur : il valide que le moteur générique reproduit le classeur de référence. Paramètres issus de yaiZpnrI-technical_baseline.md + lXzN1euY-2026-10-01-ROI-PDE-TSA-anonymous.xlsx.',
    params: {
      messages_per_month: 13333.333333333334,
      runs_per_month: 0,
      agent_actions_per_run: 0,
      ai_builder_items_per_month: 0,
      pa_premium_users: 3,
      paf_premium_users: 0,
      m365_copilot_users: 0,
      cs_maker_users: 0,
      ramp_months: 0,
      meta_prompt_tokens: 200,
      rag_context_tokens: 300,
      history_tokens: 200,
      user_input_tokens: 100,
      output_tokens_per_message: 200,
      storage_initial_gb: 0,
      storage_gb_per_month: 0.8333333333333334,
      sharepoint_extra_gb: 0,
      baseline_hours_per_year: 240,
      avoidable_share: 0.75,
      review_hours_per_year: 48,
      pde_share: 0.53125,
      loaded_hourly_cost: 50,
      capture_rate: 0.5,
      opex_base: 80000000,
      savings_target_rate: 0.05,
      attributable_share_base: 0,
      attributable_share_target: 0.15,
      horizon_years: 5,
      billing_mode: 'payg',
      payg_capacity_units: 0,
      terminals: 37,
      payg_price_per_credit: 0.01,
      prepaid_pack_credits: 25000,
      prepaid_pack_price: 200,
      payg_capacity_price: 200,
      credits_per_1k_input: 1.5,
      credits_per_1k_output: 1.5,
      fixed_credits_per_message: 0,
      credits_per_agent_action: 0.13,
      ai_builder_credits_per_item: 1,
      pa_premium_price: 17.3,
      paf_premium_price: 15,
      m365_copilot_price: 30,
      cs_maker_price: 0,
      dataverse_price_per_gb_month: 25,
      sharepoint_price_per_gb_month: 0.2,
      other_monthly_cost: 0,
      build_cost: 0,
      fx_eur_per_usd: 0.92
    },
    statuses: {
      env: 'retenu', dataverse: 'retenu', outlook: 'à confirmer', sharepoint: 'à confirmer',
      power_automate: 'retenu', office_scripts: 'écarté', ai_builder: 'à confirmer', power_apps: 'retenu',
      cs_agent: 'retenu', mcp_dataverse: 'à confirmer', workiq: 'à confirmer', todo: 'écarté',
      rag: 'à confirmer', teams: 'à confirmer', dlp: 'retenu', copilot_credits: 'retenu'
    },
    expected: {
      runAnnual: 17830.8,
      creditsYear: 240000,
      creditsEUR_runAnnual: 2208,
      licensesPA_runAnnual: 622.8,
      storage_runAnnual: 15000,
      storage_annualizedYear3: 9000,
      timeBenefit: 3300,
      pdeNet: 47.625,
      tsaNet: 84.375,
      netBase: -14530.8,
      roiBase: -0.8149269802813109,
      breakevenShare: 0.0036327,
      netTarget: 585469.2,
      roiTarget: 32.83471296857123,
      sens: [
        { messages_per_month: 8333.333333333334, runAnnual: 17002.8 },
        { messages_per_month: 30000, runAnnual: 20590.8 },
        { messages_per_month: 26666.666666666668, runAnnual: 20038.8 }
      ]
    }
  };

  return { FIXTURES: [PDE_TSA] };
});
