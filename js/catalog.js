(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AgentCostCatalog = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const PRICE_GROUPS = [
    { id: 'credits', label: 'Crédits Copilot — facturation & taux' },
    { id: 'licenses', label: 'Licences (par type, par utilisateur)' },
    { id: 'storage', label: 'Stockage & données' },
    { id: 'run', label: 'Run & construction' },
    { id: 'fx', label: 'Devise' }
  ];

  const PRICES = [
    { id: 'payg_price_per_credit', group: 'credits', label: 'PAYG — prix par crédit', price: 0.01, unit: '$/crédit', currency: 'USD', source: 'Microsoft Learn — Copilot Credits capacity', status: 'to-verify', link: 'https://learn.microsoft.com/en-us/power-platform/admin/manage-copilot-studio-copilot-credits-capacity', note: 'Tarif PAYG public $0,01/crédit ; contrat à confirmer.' },
    { id: 'prepaid_pack_credits', group: 'credits', label: 'Crédits par pack prépayé', price: 25000, unit: 'crédits/pack', currency: null, source: 'Microsoft Learn — Copilot Credits capacity', status: 'to-verify', link: 'https://learn.microsoft.com/en-us/power-platform/admin/manage-copilot-studio-copilot-credits-capacity', note: '25 000 crédits par pack.' },
    { id: 'prepaid_pack_price', group: 'credits', label: 'Prix du pack prépayé', price: 200, unit: '$/pack/mois', currency: 'USD', source: 'Microsoft Learn — Copilot Credits capacity', status: 'to-verify', link: 'https://learn.microsoft.com/en-us/power-platform/admin/manage-copilot-studio-copilot-credits-capacity', note: '$200 par pack de 25 000 crédits et par mois.' },
    { id: 'payg_capacity_price', group: 'credits', label: 'Capacité tenant PAYG (par unité)', price: 200, unit: '$/mois', currency: 'USD', source: 'Microsoft Learn — Copilot Credits capacity', status: 'to-verify', link: 'https://learn.microsoft.com/en-us/power-platform/admin/manage-copilot-studio-copilot-credits-capacity', note: '$200/mois par unité de 25 000 crédits de capacité tenant.' },
    { id: 'credits_per_1k_input', group: 'credits', label: 'Taux — crédits / 1 000 tokens INPUT', price: 1.5, unit: 'crédits/1k tok', currency: null, source: 'Microsoft Learn — message management', status: 'to-verify', link: 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management', note: 'Input = meta prompt + RAG + historique + saisie utilisateur.' },
    { id: 'credits_per_1k_output', group: 'credits', label: 'Taux — crédits / 1 000 tokens OUTPUT', price: 3.0, unit: 'crédits/1k tok', currency: null, source: 'Microsoft Learn — message management', status: 'to-verify', link: 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management', note: 'Le output est généralement tarifé plus cher que l\'input.' },
    { id: 'fixed_credits_per_message', group: 'credits', label: 'Crédits fixes d\'orchestration / message', price: 0, unit: 'crédits/message', currency: null, source: 'Microsoft Learn — orchestration agent', status: 'to-verify', note: 'Certaines actions agent consomment un montant fixe par message.' },
    { id: 'credits_per_agent_action', group: 'credits', label: 'Crédits par action agent-flow', price: 0.13, unit: 'crédits/action', currency: null, source: 'Microsoft Learn — billing rates', status: 'to-verify', link: 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management', note: 'Uniquement si l\'orchestration est en agent flow.' },
    { id: 'ai_builder_credits_per_item', group: 'credits', label: 'Crédits AI Builder / item', price: 1, unit: 'crédits/item', currency: null, source: 'Microsoft Learn — AI Builder message management', status: 'to-verify', link: 'https://learn.microsoft.com/en-us/ai-builder/message-management', note: 'AI Builder n\'est pas gratuit.' },

    { id: 'pa_premium_price', group: 'licenses', label: 'Power Apps Premium', price: 17.3, unit: '€/user/mois', currency: 'EUR', source: 'Pricing public Power Apps France', status: 'to-verify', link: 'https://www.microsoft.com/fr-fr/power-platform/products/power-apps/pricing', note: 'Prix public FR HT ; conditions contractuelles non prises en compte.' },
    { id: 'paf_premium_price', group: 'licenses', label: 'Power Automate Premium', price: 15, unit: '$/user/mois', currency: 'USD', source: 'Pricing public Microsoft', status: 'to-verify', link: 'https://www.microsoft.com/en-us/power-platform/products/power-automate/pricing', note: '$15/user/mois public ; contrat à confirmer.' },
    { id: 'm365_copilot_price', group: 'licenses', label: 'M365 Copilot (consommateurs)', price: 30, unit: '$/user/mois', currency: 'USD', source: 'Pricing public Microsoft', status: 'to-verify', link: 'https://www.microsoft.com/en-us/microsoft-365/copilot', note: '$30/user/mois public ; requis si l\'agent est publié dans M365.' },
    { id: 'cs_maker_price', group: 'licenses', label: 'Copilot Studio par maker', price: 0, unit: '$/user/mois', currency: 'USD', source: 'À confirmer avec l\'équipe compte Microsoft', status: 'to-verify', note: 'Aucun prix per-user supposé sans preuve contractuelle.' },

    { id: 'dataverse_price_per_gb_month', group: 'storage', label: 'Capacité Dataverse', price: 25, unit: '€/Go/mois', currency: 'EUR', source: 'Hypothèse budgétaire retenue 01/10/2026', status: 'to-verify', link: 'https://learn.microsoft.com/fr-fr/power-platform/admin/add-storage', note: 'Prix effectif à confirmer (admin center M365 / CSP / EA). Couvre base + log + fichiers selon mesure.' },
    { id: 'sharepoint_price_per_gb_month', group: 'storage', label: 'Stockage SharePoint au-delà du quota', price: 0.2, unit: '$/Go/mois', currency: 'USD', source: 'Pricing public Microsoft', status: 'to-verify', note: 'Uniquement au-delà du quota inclus.' },

    { id: 'other_monthly_cost', group: 'run', label: 'Autres coûts de run / mois', price: 0, unit: '€/mois', currency: 'EUR', source: 'Aucun montant confirmé à ce stade', status: 'to-verify', note: 'Hébergement / implémentation à qualifier ; non supposé nul.' },
    { id: 'build_cost', group: 'run', label: 'Coût de construction (one-time)', price: 0, unit: '€', currency: 'EUR', source: 'Aucun montant confirmé', status: 'to-verify', note: 'Comptabilisé en totalité au mois 1.' },

    { id: 'fx_eur_per_usd', group: 'fx', label: 'Taux de change', price: 0.92, unit: '€/$', currency: 'EUR', source: 'Convention du modèle initial', status: 'hypothesis', note: 'FX contrat à confirmer.' }
  ];

  const DRIVER_GROUPS = [
    { id: 'usage', label: 'Volumes d\'usage (par mois)' },
    { id: 'users', label: 'Utilisateurs & licences' },
    { id: 'tokens', label: 'Profil de tokens par message' },
    { id: 'storage', label: 'Données & stockage' },
    { id: 'benefits', label: 'Bénéfices (optionnel — ROI / point mort)' },
    { id: 'savings', label: 'Économies achats (sensibilité, pas une promesse)' },
    { id: 'params', label: 'Paramètres généraux' }
  ];

  const DRIVERS = [
    { id: 'messages_per_month', group: 'usage', label: 'Messages agent / mois', value: 4400, unit: 'messages', min: 0, step: 100, source: 'À mesurer sur le pilote', status: 'to-verify', note: 'Volume de conversations avec l\'agent.' },
    { id: 'runs_per_month', group: 'usage', label: 'Exécutions de flows / mois', value: 1000, unit: 'runs', min: 0, step: 50, source: 'À mesurer sur le pilote', status: 'to-verify', note: 'Déclenchements Power Automate.' },
    { id: 'agent_actions_per_run', group: 'usage', label: 'Actions agent-flow facturées / run', value: 0, unit: 'actions', min: 0, step: 0.5, source: 'Architecture retenue', status: 'to-verify', note: '0 si les flows sont des cloud flows standard.' },
    { id: 'ai_builder_items_per_month', group: 'usage', label: 'Items traités par AI Builder / mois', value: 0, unit: 'items', min: 0, step: 100, source: 'Cas d\'usage', status: 'to-verify', note: 'Uniquement si AI Builder est retenu.' },

    { id: 'pa_premium_users', group: 'users', label: 'Users Power Apps Premium', value: 5, unit: 'users', min: 0, step: 1, source: 'Cas d\'usage', status: 'to-verify', note: 'Droits existants à vérifier ; l\'app user n\'est pas un user métier.' },
    { id: 'paf_premium_users', group: 'users', label: 'Users Power Automate Premium', value: 0, unit: 'users', min: 0, step: 1, source: 'Cas d\'usage', status: 'to-verify', note: 'Si connecteurs premium ou licence per-user requise.' },
    { id: 'm365_copilot_users', group: 'users', label: 'Users M365 Copilot (agent dans M365)', value: 0, unit: 'users', min: 0, step: 1, source: 'Cas d\'usage', status: 'to-verify', note: 'Agent publié dans le canal M365.' },
    { id: 'cs_maker_users', group: 'users', label: 'Makers Copilot Studio', value: 0, unit: 'users', min: 0, step: 1, source: 'Cas d\'usage', status: 'to-verify', note: 'Constructeurs de l\'agent.' },
    { id: 'ramp_months', group: 'users', label: 'Rampe de montée en charge', value: 0, unit: 'mois', min: 0, step: 1, source: 'Plan de déploiement', status: 'hypothesis', note: '0 = pleine charge dès le mois 1 ; sinon rampe linéaire des utilisateurs sur N mois.' },

    { id: 'meta_prompt_tokens', group: 'tokens', label: 'Meta/system prompt MS par message', value: 800, unit: 'tok', min: 0, step: 50, source: 'À mesurer sur le pilote', status: 'to-verify', note: 'Prompt système injecté par Microsoft à chaque tour ; facturé en input.' },
    { id: 'rag_context_tokens', group: 'tokens', label: 'Contexte RAG par message', value: 2000, unit: 'tok', min: 0, step: 100, source: 'À mesurer sur le pilote', status: 'to-verify', note: 'Chunks récupérés injectés dans le prompt.' },
    { id: 'history_tokens', group: 'tokens', label: 'Historique de conversation / message', value: 1000, unit: 'tok', min: 0, step: 100, source: 'À mesurer sur le pilote', status: 'to-verify', note: 'Tours précédents conservés dans la fenêtre de contexte.' },
    { id: 'user_input_tokens', group: 'tokens', label: 'Saisie utilisateur / message', value: 200, unit: 'tok', min: 0, step: 50, source: 'À mesurer sur le pilote', status: 'to-verify', note: 'Prompt saisi/téléversé par l\'utilisateur.' },
    { id: 'output_tokens_per_message', group: 'tokens', label: 'Tokens OUTPUT (réponse) / message', value: 400, unit: 'tok', min: 0, step: 50, source: 'À mesurer sur le pilote', status: 'to-verify', note: 'Longueur moyenne de la réponse de l\'agent.' },

    { id: 'storage_initial_gb', group: 'storage', label: 'Stockage Dataverse initial', value: 5, unit: 'Go', min: 0, step: 1, source: 'Cas d\'usage', status: 'to-verify', note: 'Capacité en début de mois 1.' },
    { id: 'storage_gb_per_month', group: 'storage', label: 'Croissance Dataverse', value: 1, unit: 'Go/mois', min: 0, step: 0.1, source: 'Profilage des données à reproduire', status: 'to-verify', note: 'Croissance linéaire ; mesurer base/log/fichiers réels.' },
    { id: 'sharepoint_extra_gb', group: 'storage', label: 'Stockage SharePoint extra', value: 0, unit: 'Go', min: 0, step: 10, source: 'Cas d\'usage', status: 'to-verify', note: 'Sources/sorties SharePoint mesurées séparément.' },

    { id: 'baseline_hours_per_year', group: 'benefits', label: 'Baseline manuel annuel', value: 1000, unit: 'h/an', min: 0, step: 10, source: 'Modèle métier initial', status: 'hypothesis', note: 'Heures manuelles actuelles du processus.' },
    { id: 'avoidable_share', group: 'benefits', label: 'Part réellement évitable', value: 0.5, unit: 'ratio', min: 0, max: 1, step: 0.05, format: 'pct', source: 'Hypothèse de modélisation', status: 'hypothesis', note: 'À confirmer par les acheteurs.' },
    { id: 'review_hours_per_year', group: 'benefits', label: 'Revue humaine annuelle (à soustraire une fois)', value: 0, unit: 'h/an', min: 0, step: 1, source: 'Atelier fonctionnel', status: 'hypothesis', note: 'Jours de revue × heures × périodes.' },
    { id: 'pde_share', group: 'benefits', label: 'Part du gain attribuée à l\'amont (split affichage)', value: 0.5, unit: 'ratio', min: 0, max: 1, step: 0.01, format: 'pct', source: 'Attribution indicative', status: 'hypothesis', note: 'Uniquement pour la vue amont/aval.' },
    { id: 'loaded_hourly_cost', group: 'benefits', label: 'Coût horaire chargé', value: 50, unit: '€/h', min: 0, step: 1, source: 'Modèles initiaux', status: 'hypothesis', note: 'À confirmer pour ces acheteurs.' },
    { id: 'capture_rate', group: 'benefits', label: 'Taux de captation de la valeur', value: 0.5, unit: 'ratio', min: 0, max: 1, step: 0.05, format: 'pct', source: 'Hypothèse initiale', status: 'hypothesis', note: 'À faire approuver par Finance.' },

    { id: 'opex_base', group: 'savings', label: 'Assiette OPEX éligible', value: 0, unit: '€/an', min: 0, step: 1000000, source: 'Donnée utilisateur', status: 'provided', note: 'Ne pas convertir en dollars.' },
    { id: 'savings_target_rate', group: 'savings', label: 'Taux de savings cible sur OPEX', value: 0.05, unit: 'ratio', min: 0, max: 1, step: 0.01, format: 'pct', source: 'Correction explicite utilisateur', status: 'provided', note: 'Ex. 5 % × 80 M€ = 4 M€.' },
    { id: 'attributable_share_base', group: 'savings', label: 'Part attribuable — cas de base', value: 0, unit: 'ratio', min: 0, max: 1, step: 0.01, format: 'pct', source: 'Modèle', status: 'hypothesis', note: '0 % en base sans méthode d\'attribution validée.' },
    { id: 'attributable_share_target', group: 'savings', label: 'Part attribuable — scénario cible (illustration)', value: 0.15, unit: 'ratio', min: 0, max: 1, step: 0.01, format: 'pct', source: 'Modèle', status: 'hypothesis', note: '100 % n\'est qu\'une borne illustrative.' },

    { id: 'horizon_years', group: 'params', label: 'Horizon de projection', value: 3, unit: 'ans', min: 1, max: 10, step: 1, source: 'Cas d\'usage', status: 'provided', note: 'Durée du TCO projeté.' },
    { id: 'billing_mode', group: 'params', label: 'Mode de facturation des crédits', value: 'payg', type: 'select', options: ['payg', 'prepaid', 'compare'], source: 'App', status: 'app', note: 'payg = au crédit ; prepaid = packs 25k ; compare = les deux affichés.' },
    { id: 'payg_capacity_units', group: 'params', label: 'Unités de capacité tenant PAYG', value: 0, unit: 'unités', min: 0, step: 1, source: 'Configuration tenant', status: 'to-verify', note: '0 = crédits facturés purement à la consommation.' },
    { id: 'terminals', group: 'params', label: 'Périmètre métier (terminaux / dossiers / sites)', value: 0, unit: 'unités', min: 0, step: 1, source: 'Cas d\'usage', status: 'provided', note: 'Uniquement pour l\'économie unitaire par périmètre.' }
  ];

  const LINES = [
    { id: 'license_pa_premium', label: 'Licence Power Apps Premium', component: 'power_apps', category: 'license', behavior: 'fixed', formula: 'users × prix/user/mois' },
    { id: 'license_paf_premium', label: 'Licence Power Automate Premium', component: 'power_automate', category: 'license', behavior: 'fixed', formula: 'users × prix/user/mois × FX' },
    { id: 'license_m365', label: 'Licence M365 Copilot (consommateurs)', component: 'cs_agent', category: 'license', behavior: 'fixed', formula: 'users × prix/user/mois × FX' },
    { id: 'license_cs_maker', label: 'Licence Copilot Studio (makers)', component: 'cs_agent', category: 'license', behavior: 'fixed', formula: 'users × prix/user/mois × FX (si confirmé)' },
    { id: 'credits_tokens', label: 'Crédits Copilot — tokens input + output', component: 'cs_agent', category: 'credits', behavior: 'variable', formula: 'messages × (meta+RAG+histo+user) /1000 × taux_in + messages × output /1000 × taux_out + fixes' },
    { id: 'credits_agent_actions', label: 'Crédits — actions agent-flow', component: 'power_automate', category: 'credits', behavior: 'variable', formula: 'runs/mois × actions/run × crédits/action' },
    { id: 'credits_ai_builder', label: 'Crédits — AI Builder', component: 'ai_builder', category: 'credits', behavior: 'variable', formula: 'items/mois × crédits/item' },
    { id: 'payg_capacity', label: 'Capacité tenant PAYG Copilot Studio', component: 'copilot_credits', category: 'credits', behavior: 'fixed', formula: 'unités × $/mois × 12 → /mois × FX' },
    { id: 'storage_dataverse', label: 'Stockage Dataverse', component: 'dataverse', category: 'storage', behavior: 'variable', formula: '(initial + Go/mois × m) × €/Go/mois' },
    { id: 'storage_sharepoint', label: 'Stockage SharePoint extra', component: 'sharepoint', category: 'storage', behavior: 'variable', formula: 'Go extra × $/Go/mois × FX' },
    { id: 'run_other', label: 'Autres coûts de run', component: 'power_automate', category: 'run', behavior: 'fixed', formula: 'provision mensuelle' },
    { id: 'build', label: 'Coût de construction (one-time, mois 1)', component: 'env', category: 'one-time', behavior: 'fixed', formula: 'montant forfaitaire' }
  ];

  const COMPONENTS = [
    { id: 'env', title: 'Power Platform environment with Dataverse', role: 'Environnement cible, paliers DEV/TEST/PROD, accès, capacités.', lines: ['build'], status: 'à confirmer' },
    { id: 'dataverse', title: 'Dataverse persistent store', role: 'Entités et états structurés à persister, grain, sécurité, cycle de vie.', lines: ['storage_dataverse'], status: 'retenu' },
    { id: 'outlook', title: 'Office 365 Outlook connector', role: 'Lire/déclencher/envoyer des e-mails, identité et permissions.', lines: [], status: 'à confirmer' },
    { id: 'sharepoint', title: 'SharePoint connector', role: 'Lire/écrire fichiers, métadonnées, listes ; sites et droits.', lines: ['storage_sharepoint'], status: 'à confirmer' },
    { id: 'power_automate', title: 'Power Automate', role: 'Orchestration, déclencheurs, reprises, journalisation.', lines: ['license_paf_premium', 'credits_agent_actions', 'run_other'], status: 'retenu' },
    { id: 'office_scripts', title: 'Office Scripts', role: 'Traitement de classeurs réellement nécessaire ; formats, volumes, limites.', lines: [], status: 'écarté' },
    { id: 'ai_builder', title: 'AI Builder', role: 'Traitement probabiliste à valeur mesurable ; évaluation qualité et consommation.', lines: ['credits_ai_builder'], status: 'à confirmer' },
    { id: 'power_apps', title: 'Power Apps – HITL review / dashboard', role: 'Qui révise les exceptions, quelles données/métriques l\'UI affiche.', lines: ['license_pa_premium'], status: 'retenu' },
    { id: 'cs_agent', title: 'Conversational Copilot Studio Agent', role: 'Dialogue nécessaire ? users, actions, connaissances, garde-fous.', lines: ['credits_tokens', 'license_m365', 'license_cs_maker'], status: 'retenu' },
    { id: 'mcp_dataverse', title: 'MCP Dataverse connector', role: 'Accès agent aux données Dataverse, opérations et permissions.', lines: [], status: 'à confirmer' },
    { id: 'workiq', title: 'WorkIQ connector', role: 'Accès contextuel Microsoft 365 ; offre/variante exacte et statut de disponibilité.', lines: [], status: 'à confirmer' },
    { id: 'todo', title: 'Microsoft To Do connector', role: 'Tâche personnelle utile ? outil de suivi approuvé pour ce processus ?', lines: [], status: 'écarté' },
    { id: 'rag', title: 'RAG knowledge source – SharePoint / OneDrive', role: 'Documents autorisés pour les réponses ; droits, fraîcheur, traçabilité (impacte les tokens RAG).', lines: [], status: 'à confirmer' },
    { id: 'teams', title: 'Microsoft Teams + M365 channel', role: 'Interface conversationnelle ou notifications ; canaux approuvés.', lines: [], status: 'à confirmer' },
    { id: 'dlp', title: 'DLP policy + connector allowlist', role: 'Politiques appliquées à l\'environnement et à chaque connecteur/outil/canal/source.', lines: [], status: 'retenu' },
    { id: 'copilot_credits', title: 'Copilot Credits capacity', role: 'Quels usages consomment des crédits, volume, allocation, suivi, limite budgétaire.', lines: ['payg_capacity'], status: 'retenu' }
  ];

  const SCENARIOS = [
    { id: 'low', label: 'Bas — volume × 0,5', volumeFactor: 0.5 },
    { id: 'base', label: 'Central — volume × 1', volumeFactor: 1 },
    { id: 'high', label: 'Haut — volume × 2', volumeFactor: 2 }
  ];

  function collectDefaults() {
    const p = {};
    for (const d of DRIVERS) p[d.id] = d.value;
    for (const pr of PRICES) p[pr.id] = pr.price;
    return p;
  }

  function driverById(id) { return DRIVERS.find(d => d.id === id); }
  function priceById(id) { return PRICES.find(x => x.id === id); }
  function lineById(id) { return LINES.find(l => l.id === id); }

  return { PRICE_GROUPS, PRICES, DRIVER_GROUPS, DRIVERS, LINES, COMPONENTS, SCENARIOS, collectDefaults, driverById, priceById, lineById };
});
