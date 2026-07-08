// /lib/corp/actions.js

import { CORP_CONFIG } from '/lib/corp/config.js';
import {
  canCreateCorporation,
  corpApi,
  getCorporation,
  getDivision,
  getInvestmentOffer,
  getMaterial,
  getOffice,
  getProduct,
  getUpgradeLevel,
  hasUnlock,
  hasCity,
  hasCorporation,
  hasDivision,
  hasWarehouse,
  purchaseUnlock,
  safeCall,
} from '/lib/corp/safe.js';

export function runCorporationCycle(ns, options = {}) {
  const cfg = { ...CORP_CONFIG, ...options };
  const corp = corpApi(ns);
  const actions = [];
  const selfFund = cfg.selfFund === true;

  if (!corp) {
    return state('blocked', 'Corporation API is unavailable.', cfg, actions);
  }

  if (!hasCorporation(ns)) {
    if (!canCreateCorporation(ns, selfFund)) {
      return state('waiting-create', 'Cannot create corporation yet.', cfg, actions);
    }

    if (safeCall(() => corp.createCorporation(cfg.name, selfFund), false)) {
      actions.push(`Created corporation ${cfg.name}.`);
    }
  }

  ensureAgriculture(ns, cfg, actions);

  const offer = getInvestmentOffer(ns);
  const startupStatus = getMaterialWaveStatus(
    ns,
    cfg.agriculture,
    cfg.cities,
    cfg.agricultureStartupMaterials,
  );
  const round1Status = getMaterialWaveStatus(
    ns,
    cfg.agriculture,
    cfg.cities,
    cfg.agricultureRound1Materials,
  );
  const stage = chooseStage(ns, cfg, offer, startupStatus, round1Status);

  if (stage === 'agriculture-startup') {
    ensureMaterialWave(ns, cfg.agriculture, cfg.cities, cfg.agricultureStartupMaterials, actions);
    ensureUpgradeTargets(ns, cfg.startupUpgradeTargets, actions);
  } else if (stage === 'accept-round-1') {
    safeCall(() => corp.acceptInvestmentOffer(), false);
    actions.push(`Accepted first investment offer ${formatActionMoney(ns, offer?.funds)}.`);
  } else if (stage === 'agriculture-round-1') {
    ensureUpgradeTargets(ns, cfg.round1UpgradeTargets, actions);
    ensureOfficeGrowth(ns, cfg.agriculture, cfg.cities, 9, cfg.growthJobs, actions);
    ensureWarehouseLevels(ns, cfg.agriculture, cfg.cities, 10, actions);
    ensureMaterialWave(ns, cfg.agriculture, cfg.cities, cfg.agricultureRound1Materials, actions);
  } else if (stage === 'accept-round-2') {
    safeCall(() => corp.acceptInvestmentOffer(), false);
    actions.push(`Accepted second investment offer ${formatActionMoney(ns, offer?.funds)}.`);
  } else {
    ensureWarehouseLevels(ns, cfg.agriculture, cfg.cities, 19, actions);
    ensureMaterialWave(ns, cfg.agriculture, cfg.cities, cfg.agricultureRound2Materials, actions);
    ensureTobacco(ns, cfg, actions);
  }

  return state('running', `Corporation manager active: ${stage}.`, cfg, actions, {
    stage,
    corporation: summarizeCorporation(ns),
    agriculture: summarizeDivision(ns, cfg.agriculture, cfg),
    tobacco: summarizeDivision(ns, cfg.tobacco, cfg),
    investmentOffer: offer,
    materialWave: {
      agricultureStartup: startupStatus,
      agricultureRound1: round1Status,
      agricultureRound2: getMaterialWaveStatus(
        ns,
        cfg.agriculture,
        cfg.cities,
        cfg.agricultureRound2Materials,
      ),
    },
  });
}

function ensureAgriculture(ns, cfg, actions) {
  const corp = corpApi(ns);

  if (!hasDivision(ns, cfg.agriculture)) {
    if (safeCall(() => corp.expandIndustry('Agriculture', cfg.agriculture), false) !== false) {
      actions.push(`Expanded Agriculture division ${cfg.agriculture}.`);
    }
  }

  ensureUnlock(ns, 'Smart Supply', actions);

  for (const city of cfg.cities) {
    ensureCity(ns, cfg.agriculture, city, actions);
    ensureWarehouse(ns, cfg.agriculture, city, actions);
    safeCall(() => corp.setSmartSupply(cfg.agriculture, city, true), false);
    ensureOfficeGrowth(ns, cfg.agriculture, [city], 3, cfg.startupJobs, actions);
    for (const product of cfg.materialProducts) {
      safeCall(() => corp.sellMaterial(cfg.agriculture, city, product, 'MAX', 'MP'), false);
    }
  }

  ensureWarehouseLevels(ns, cfg.agriculture, cfg.cities, 3, actions);
}

function ensureTobacco(ns, cfg, actions) {
  const corp = corpApi(ns);

  if (!hasDivision(ns, cfg.tobacco)) {
    if (safeCall(() => corp.expandIndustry('Tobacco', cfg.tobacco), false) !== false) {
      actions.push(`Expanded Tobacco division ${cfg.tobacco}.`);
    }
  }

  for (const city of cfg.cities) {
    ensureCity(ns, cfg.tobacco, city, actions);
    ensureWarehouse(ns, cfg.tobacco, city, actions);
    ensureOfficeGrowth(
      ns,
      cfg.tobacco,
      [city],
      city === cfg.mainCity ? 51 : 9,
      cfg.growthJobs,
      actions,
    );
    safeCall(() => corp.setSmartSupply(cfg.tobacco, city, true), false);
  }

  ensureWarehouseLevels(ns, cfg.tobacco, cfg.cities, 14, actions);
  ensureUpgradeTargets(ns, cfg.tobaccoUpgradeTargets, actions);
  ensureAdVerts(ns, cfg.tobacco, cfg.tobaccoAdVerts, actions);
  manageTobaccoProducts(ns, cfg, actions);
}

function ensureCity(ns, division, city, actions) {
  if (hasCity(ns, division, city)) return;
  if (safeCall(() => corpApi(ns).expandCity(division, city), false) !== false) {
    actions.push(`Expanded ${division} to ${city}.`);
  }
}

function ensureWarehouse(ns, division, city, actions) {
  if (hasWarehouse(ns, division, city)) return;
  if (safeCall(() => corpApi(ns).purchaseWarehouse(division, city), false) !== false) {
    actions.push(`Purchased ${division} warehouse in ${city}.`);
  }
}

function ensureWarehouseLevels(ns, division, cities, targetLevel, actions) {
  const corp = corpApi(ns);

  for (const city of cities) {
    const warehouse = safeCall(() => corp.getWarehouse(division, city), null);
    if (!warehouse) continue;
    const level = Number(warehouse.level) || 0;
    const missing = Math.max(0, targetLevel - level);
    if (missing <= 0) continue;
    if (safeCall(() => corp.upgradeWarehouse(division, city, missing), false) !== false) {
      actions.push(`Upgraded ${division} warehouse in ${city} by ${missing}.`);
    }
  }
}

function ensureOfficeGrowth(ns, division, cities, targetSize, jobs, actions) {
  const corp = corpApi(ns);

  for (const city of cities) {
    const office = getOffice(ns, division, city);
    if (!office) continue;
    const size = Number(office.size) || 0;
    const employees = getEmployeeCount(office);
    if (size < targetSize) {
      safeCall(() => corp.upgradeOfficeSize(division, city, targetSize - size), false);
      actions.push(`Upgraded ${division} office in ${city} to ${targetSize}.`);
    }
    for (let i = employees; i < targetSize; i++) {
      safeCall(() => corp.hireEmployee(division, city, 'Operations'), false);
    }
    for (const [job, amount] of jobs) {
      assignJob(ns, division, city, job, amount);
    }
  }
}

function ensureUnlock(ns, upgrade, actions) {
  if (hasUnlock(ns, upgrade)) return true;
  if (purchaseUnlock(ns, upgrade)) {
    actions.push(`Purchased ${upgrade} unlock.`);
    return true;
  }
  return false;
}

function ensureUpgradeTargets(ns, targets, actions) {
  const corp = corpApi(ns);

  for (const [upgrade, targetLevel] of targets) {
    const current = getUpgradeLevel(ns, upgrade);
    const missing = Math.max(0, targetLevel - current);
    for (let i = 0; i < missing; i++) {
      if (safeCall(() => corp.levelUpgrade(upgrade), false) !== false) {
        actions.push(`Leveled ${upgrade} to ${current + i + 1}.`);
      }
    }
  }
}

function ensureAdVerts(ns, division, targetCount, actions) {
  const corp = corpApi(ns);
  const current = Number(safeCall(() => corp.getHireAdVertCount(division), 0)) || 0;
  const missing = Math.max(0, targetCount - current);

  for (let i = 0; i < missing; i++) {
    if (safeCall(() => corp.hireAdVert(division), false) !== false) {
      actions.push(`Hired AdVert for ${division}.`);
    }
  }
}

function ensureMaterialWave(ns, division, cities, materials, actions) {
  const corp = corpApi(ns);

  for (const city of cities) {
    for (const [material, rate, targetQty] of materials) {
      const qty = Number(getMaterial(ns, division, city, material)?.qty) || 0;
      if (qty >= targetQty) {
        safeCall(() => corp.buyMaterial(division, city, material, 0), false);
        continue;
      }
      safeCall(() => corp.buyMaterial(division, city, material, rate), false);
      actions.push(
        `Buying ${material} in ${division}/${city}: ${formatQty(qty)} / ${formatQty(targetQty)}.`,
      );
    }
  }
}

function manageTobaccoProducts(ns, cfg, actions) {
  const corp = corpApi(ns);
  const division = getDivision(ns, cfg.tobacco);
  if (!division) return;

  const products = Array.isArray(division.products) ? division.products : [];
  const active = products
    .map((name) => getProduct(ns, cfg.tobacco, cfg.mainCity, name))
    .filter(Boolean);
  const developing = active.find((product) => Number(product.developmentProgress) < 100);

  for (const product of active.filter((p) => Number(p.developmentProgress) >= 100)) {
    safeCall(
      () => corp.sellProduct(cfg.tobacco, cfg.mainCity, product.name, 'MAX', 'MP', true),
      false,
    );
  }

  if (developing) return;

  if (products.length >= 3) {
    const oldest = products[0];
    safeCall(() => corp.discontinueProduct(cfg.tobacco, oldest), false);
    actions.push(`Discontinued old Tobacco product ${oldest}.`);
  }

  const nextVersion = getNextProductVersion(products, 'Tobacco v');
  const name = `Tobacco v${nextVersion}`;
  const spend = cfg.tobaccoProductBaseSpend;
  if (
    safeCall(() => corp.makeProduct(cfg.tobacco, cfg.mainCity, name, spend, spend), false) !== false
  ) {
    actions.push(`Started product ${name}.`);
  }
}

function chooseStage(ns, cfg, offer, startupStatus, round1Status) {
  const round = Number(offer?.round) || 1;
  const funds = Number(offer?.funds) || 0;

  if (!startupStatus.complete) return 'agriculture-startup';
  if (round <= 1 && funds >= cfg.firstOffer) return 'accept-round-1';
  if (round <= 2 && !round1Status.complete) return 'agriculture-round-1';
  if (round <= 2 && funds >= cfg.secondOffer) return 'accept-round-2';
  return 'tobacco-growth';
}

function getMaterialWaveStatus(ns, division, cities, materials) {
  const missing = [];

  for (const city of cities) {
    for (const [material, , targetQty] of materials) {
      const qty = Number(getMaterial(ns, division, city, material)?.qty) || 0;
      if (qty < targetQty) {
        missing.push({ city, material, qty, targetQty });
      }
    }
  }

  return {
    complete: missing.length === 0,
    missing,
  };
}

function summarizeCorporation(ns) {
  const corp = getCorporation(ns);
  if (!corp) return null;
  return {
    name: corp.name,
    funds: corp.funds,
    revenue: corp.revenue,
    expenses: corp.expenses,
    profit: Number(corp.revenue ?? 0) - Number(corp.expenses ?? 0),
    divisions: corp.divisions,
    public: corp.public,
    sharePrice: corp.sharePrice,
  };
}

function assignJob(ns, division, city, job, amount) {
  const corp = corpApi(ns);
  if (safeCall(() => corp.setJobAssignment(division, city, job, amount), false)) {
    return true;
  }
  return safeCall(() => corp.setAutoJobAssignment(division, city, job, amount), false);
}

function summarizeDivision(ns, divisionName, cfg) {
  const division = getDivision(ns, divisionName);
  if (!division) return null;

  return {
    name: division.name,
    type: division.type,
    cities: division.cities,
    products: division.products,
    research: division.research,
    awareness: division.awareness,
    popularity: division.popularity,
    offices: cfg.cities.map((city) => {
      const office = getOffice(ns, divisionName, city);
      const warehouse = safeCall(() => corpApi(ns).getWarehouse(divisionName, city), null);
      return {
        city,
        officeSize: office?.size ?? 0,
        employees: office ? getEmployeeCount(office) : 0,
        warehouseLevel: warehouse?.level ?? 0,
        warehouseSize: warehouse?.size ?? 0,
        warehouseUsed: warehouse?.sizeUsed ?? 0,
      };
    }),
  };
}

function state(status, message, cfg, actions = [], extra = {}) {
  return {
    updatedAt: Date.now(),
    updatedAtText: new Date().toLocaleTimeString(),
    source: 'corp-manager-service',
    status,
    message,
    config: {
      name: cfg.name,
      agriculture: cfg.agriculture,
      tobacco: cfg.tobacco,
      mainCity: cfg.mainCity,
    },
    actions: actions.slice(-20),
    ...extra,
  };
}

function getNextProductVersion(products, prefix) {
  let max = 0;
  for (const product of products) {
    const version = Number(String(product).replace(prefix, ''));
    if (Number.isFinite(version)) max = Math.max(max, version);
  }
  return max + 1;
}

function formatQty(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}m`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(2)}k`;
  return n.toFixed(2);
}

function formatActionMoney(ns, value) {
  try {
    return `$${ns.format.number(Number(value) || 0)}`;
  } catch {
    return `$${Math.round(Number(value) || 0).toLocaleString()}`;
  }
}

function getEmployeeCount(office) {
  if (Number.isFinite(Number(office?.numEmployees))) return Number(office.numEmployees);
  if (Array.isArray(office?.employees)) return office.employees.length;
  return 0;
}
