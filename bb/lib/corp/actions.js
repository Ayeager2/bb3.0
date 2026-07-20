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
  getUnlockCost,
  getUpgradeCost,
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

  ensureAgricultureCore(ns, cfg, actions);
  ensureStrategicUnlocks(ns, cfg, actions);

  const corporation = getCorporation(ns);
  const offer = getInvestmentOffer(ns);
  const activeAgricultureCities = getAgricultureCities(ns, cfg);

  if (Number(corporation?.funds) < 0 && Number(offer?.funds) > 0) {
    safeCall(() => corp.acceptInvestmentOffer(), false);
    actions.push(`Accepted hard-rescue investment offer ${formatActionMoney(ns, offer?.funds)}.`);
    return state('running', 'Accepted hard-rescue investment offer because corporation funds were negative.', cfg, actions, {
      stage: 'accept-hard-rescue-offer',
      corporation: summarizeCorporation(ns),
      agriculture: summarizeDivision(ns, cfg.agriculture, cfg),
      tobacco: summarizeDivision(ns, cfg.tobacco, cfg),
      investmentOffer: getInvestmentOffer(ns),
    });
  }

  if (Number(corporation?.funds) < 0) {
    hardRescueAgriculture(ns, cfg, activeAgricultureCities, actions);
    return state('recovering', 'Corporation funds are negative; liquidating Agriculture inventory for cash.', cfg, actions, {
      stage: 'hard-rescue',
      corporation: summarizeCorporation(ns),
      agriculture: summarizeDivision(ns, cfg.agriculture, cfg),
      tobacco: summarizeDivision(ns, cfg.tobacco, cfg),
      investmentOffer: offer,
    });
  }

  const mainStartupStatus = getMaterialWaveStatus(
    ns,
    cfg.agriculture,
    [cfg.mainCity],
    cfg.agricultureStartupMaterials,
  );
  const startupStatus = getMaterialWaveStatus(
    ns,
    cfg.agriculture,
    activeAgricultureCities,
    cfg.agricultureStartupMaterials,
  );
  const nextExpansionCity = getNextExpansionCity(ns, cfg);
  const round1Status = getMaterialWaveStatus(
    ns,
    cfg.agriculture,
    activeAgricultureCities,
    cfg.agricultureRound1Materials,
  );

  if (hasUnhealthyOffice(ns, cfg.agriculture, activeAgricultureCities, cfg)) {
    maintainAgricultureSales(ns, cfg, activeAgricultureCities, actions, { preserveBoosters: true });
    return state('recovering', 'Agriculture office morale/energy is low; running office care before more build spending.', cfg, actions, {
      stage: 'office-recovery',
      corporation: summarizeCorporation(ns),
      agriculture: summarizeDivision(ns, cfg.agriculture, cfg),
      tobacco: summarizeDivision(ns, cfg.tobacco, cfg),
      investmentOffer: offer,
      materialWave: {
        agricultureStartup: startupStatus,
        agricultureMainStartup: mainStartupStatus,
        agricultureRound1: round1Status,
        agricultureRound2: getMaterialWaveStatus(
          ns,
          cfg.agriculture,
          activeAgricultureCities,
          cfg.agricultureRound2Materials,
        ),
      },
    });
  }

  if (
    Number(corporation?.funds) < (Number(cfg.cashRecoveryFloor) || 0) &&
    Number(offer?.round) <= 1 &&
    Number(offer?.funds) >= (Number(cfg.emergencyFirstOffer) || Infinity)
  ) {
    safeCall(() => corp.acceptInvestmentOffer(), false);
    actions.push(`Accepted emergency first investment offer ${formatActionMoney(ns, offer?.funds)} for cash recovery.`);
    return state('running', 'Accepted emergency first investment offer for cash recovery.', cfg, actions, {
      stage: 'accept-emergency-round-1',
      corporation: summarizeCorporation(ns),
      agriculture: summarizeDivision(ns, cfg.agriculture, cfg),
      tobacco: summarizeDivision(ns, cfg.tobacco, cfg),
      investmentOffer: getInvestmentOffer(ns),
      materialWave: {
        agricultureStartup: startupStatus,
        agricultureMainStartup: mainStartupStatus,
        agricultureRound1: round1Status,
        agricultureRound2: getMaterialWaveStatus(
          ns,
          cfg.agriculture,
          activeAgricultureCities,
          cfg.agricultureRound2Materials,
        ),
      },
    });
  }

  if (Number(corporation?.funds) < (Number(cfg.cashRecoveryFloor) || 0)) {
    maintainAgricultureSales(ns, cfg, activeAgricultureCities, actions);
    return state('recovering', 'Corporation cash is low; paused build spending and selling down Agriculture inventory.', cfg, actions, {
      stage: 'cash-recovery',
      corporation: summarizeCorporation(ns),
      agriculture: summarizeDivision(ns, cfg.agriculture, cfg),
      tobacco: summarizeDivision(ns, cfg.tobacco, cfg),
      investmentOffer: offer,
      materialWave: {
        agricultureStartup: startupStatus,
        agricultureMainStartup: mainStartupStatus,
        agricultureRound1: round1Status,
        agricultureRound2: getMaterialWaveStatus(
          ns,
          cfg.agriculture,
          activeAgricultureCities,
          cfg.agricultureRound2Materials,
        ),
      },
    });
  }

  if (Number(corporation?.funds) < (Number(cfg.cashStabilizeFloor) || 0)) {
    if (Number(offer?.funds) >= (Number(cfg.recoveryOfferMinimum) || Infinity)) {
      safeCall(() => corp.acceptInvestmentOffer(), false);
      actions.push(`Accepted recovery investment offer ${formatActionMoney(ns, offer?.funds)}.`);
      return state('running', 'Accepted recovery investment offer to break cash-stabilize stall.', cfg, actions, {
        stage: 'accept-recovery-offer',
        corporation: summarizeCorporation(ns),
        agriculture: summarizeDivision(ns, cfg.agriculture, cfg),
        tobacco: summarizeDivision(ns, cfg.tobacco, cfg),
        investmentOffer: getInvestmentOffer(ns),
        materialWave: {
          agricultureStartup: startupStatus,
          agricultureMainStartup: mainStartupStatus,
          agricultureRound1: round1Status,
          agricultureRound2: getMaterialWaveStatus(
            ns,
            cfg.agriculture,
            activeAgricultureCities,
            cfg.agricultureRound2Materials,
          ),
        },
      });
    }

    maintainAgricultureSales(ns, cfg, activeAgricultureCities, actions, { stabilize: true, liquidateBoosters: true });
    return state('recovering', 'Corporation cash is stabilizing; running lean Agriculture until funds recover.', cfg, actions, {
      stage: 'cash-stabilize',
      corporation: summarizeCorporation(ns),
      agriculture: summarizeDivision(ns, cfg.agriculture, cfg),
      tobacco: summarizeDivision(ns, cfg.tobacco, cfg),
      investmentOffer: offer,
      materialWave: {
        agricultureStartup: startupStatus,
        agricultureMainStartup: mainStartupStatus,
        agricultureRound1: round1Status,
        agricultureRound2: getMaterialWaveStatus(
          ns,
          cfg.agriculture,
          activeAgricultureCities,
          cfg.agricultureRound2Materials,
        ),
      },
    });
  }

  const stage = chooseStage(ns, cfg, offer, mainStartupStatus, startupStatus, round1Status, nextExpansionCity);

  if (stage === 'agriculture-main-startup') {
    ensureMaterialWave(ns, cfg.agriculture, [cfg.mainCity], cfg.agricultureStartupMaterials, actions);
    ensureUpgradeTargets(ns, cfg, cfg.startupUpgradeTargets, actions);
  } else if (stage === 'agriculture-expand-city') {
    ensureAgricultureCity(ns, cfg, nextExpansionCity, actions);
    ensureMaterialWave(ns, cfg.agriculture, [nextExpansionCity], cfg.agricultureStartupMaterials, actions);
    ensureUpgradeTargets(ns, cfg, cfg.startupUpgradeTargets, actions);
  } else if (stage === 'agriculture-startup') {
    ensureMaterialWave(ns, cfg.agriculture, activeAgricultureCities, cfg.agricultureStartupMaterials, actions);
    ensureUpgradeTargets(ns, cfg, cfg.startupUpgradeTargets, actions);
  } else if (stage === 'waiting-round-1-offer') {
    maintainAgricultureSales(ns, cfg, activeAgricultureCities, actions);
  } else if (stage === 'accept-round-1') {
    safeCall(() => corp.acceptInvestmentOffer(), false);
    actions.push(`Accepted first investment offer ${formatActionMoney(ns, offer?.funds)}.`);
  } else if (stage === 'agriculture-round-1') {
    ensureUpgradeTargets(ns, cfg, cfg.round1UpgradeTargets, actions);
    ensureOfficeGrowth(ns, cfg.agriculture, activeAgricultureCities, 9, cfg.growthJobs, actions);
    ensureWarehouseLevels(ns, cfg.agriculture, activeAgricultureCities, 10, actions);
    ensureWarehouseBreathingRoom(ns, cfg, cfg.agriculture, activeAgricultureCities, actions);
    if (canRunRound1MaterialWave(ns, cfg, activeAgricultureCities)) {
      ensureMaterialWave(ns, cfg.agriculture, activeAgricultureCities, cfg.agricultureRound1Materials, actions);
    } else {
      maintainAgricultureSales(ns, cfg, activeAgricultureCities, actions, { preserveBoosters: true });
      actions.push(
        `Deferred heavy round-1 booster wave until funds >= ${formatActionMoney(ns, cfg.round1MaterialFundsFloor)}, profit >= ${formatActionMoney(ns, cfg.round1MaterialProfitFloor)}/sec, and warehouse pressure is below ${Math.round((Number(cfg.round1MaterialPressureCeiling) || 0.7) * 100)}%.`,
      );
    }
  } else if (stage === 'accept-round-2') {
    safeCall(() => corp.acceptInvestmentOffer(), false);
    actions.push(`Accepted second investment offer ${formatActionMoney(ns, offer?.funds)}.`);
  } else if (stage === 'waiting-round-2-offer') {
    maintainAgricultureSales(ns, cfg, activeAgricultureCities, actions);
  } else {
    ensureWarehouseLevels(ns, cfg.agriculture, activeAgricultureCities, 19, actions);
    ensureMaterialWave(ns, cfg.agriculture, activeAgricultureCities, cfg.agricultureRound2Materials, actions);
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
      agricultureMainStartup: mainStartupStatus,
      agricultureRound1: round1Status,
      agricultureRound2: getMaterialWaveStatus(
        ns,
        cfg.agriculture,
        activeAgricultureCities,
        cfg.agricultureRound2Materials,
      ),
    },
  });
}

function ensureAgricultureCore(ns, cfg, actions) {
  const corp = corpApi(ns);

  if (!hasDivision(ns, cfg.agriculture)) {
    if (safeCall(() => corp.expandIndustry('Agriculture', cfg.agriculture), false) !== false) {
      actions.push(`Expanded Agriculture division ${cfg.agriculture}.`);
    }
  }

  ensureUnlock(ns, 'Smart Supply', actions);

  ensureAgricultureCity(ns, cfg, cfg.mainCity, actions);
  ensureWarehouseLevels(ns, cfg.agriculture, [cfg.mainCity], 3, actions);
}

function ensureAgricultureCity(ns, cfg, city, actions) {
  if (!city) return;
  const corp = corpApi(ns);
  ensureCity(ns, cfg.agriculture, city, actions);
  ensureWarehouse(ns, cfg.agriculture, city, actions);
  safeCall(() => corp.setSmartSupply(cfg.agriculture, city, true), false);
  ensureOfficeGrowth(ns, cfg.agriculture, [city], 3, cfg.startupJobs, actions);
  for (const product of cfg.materialProducts) {
    safeCall(() => corp.sellMaterial(cfg.agriculture, city, product, 'MAX', 'MP'), false);
  }
  ensureWarehouseLevels(ns, cfg.agriculture, [city], 3, actions);
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
  ensureUpgradeTargets(ns, cfg, cfg.tobaccoUpgradeTargets, actions);
  ensureAdVerts(ns, cfg.tobacco, cfg.tobaccoAdVerts, actions);
  manageTobaccoProducts(ns, cfg, actions);
}

function stabilizeAgriculture(ns, cfg, actions) {
  const corp = corpApi(ns);
  const materials = [
    ...cfg.materialProducts,
    'Robots',
    'Hardware',
    'AI Cores',
    'Real Estate',
  ];

  for (const city of cfg.cities) {
    for (const material of materials) {
      safeCall(() => corp.buyMaterial(cfg.agriculture, city, material, 0), false);
    }

    for (const product of cfg.materialProducts) {
      safeCall(() => corp.sellMaterial(cfg.agriculture, city, product, 'MAX', 'MP'), false);
    }
  }

  actions.push('Recovery mode: stopped Agriculture buy orders and reset Food/Plants sales.');
}

function hardRescueAgriculture(ns, cfg, cities, actions) {
  const corp = corpApi(ns);
  const materials = [
    ...cfg.materialProducts,
    'Water',
    'Chemicals',
    'Robots',
    'Hardware',
    'AI Cores',
    'Real Estate',
  ];

  for (const city of cities) {
    fillExistingAgricultureOffice(ns, cfg, city, actions, cfg.hardRescueJobs);

    for (const material of materials) {
      safeCall(() => corp.buyMaterial(cfg.agriculture, city, material, 0), false);
      safeCall(() => corp.sellMaterial(cfg.agriculture, city, material, 'MAX', 'MP*0.1'), false);
    }

    actions.push(`Hard rescue liquidation configured for Agriculture/${city}.`);
  }
}

function maintainAgricultureSales(ns, cfg, cities, actions, options = {}) {
  const corp = corpApi(ns);

  for (const city of cities) {
    safeCall(() => corp.setSmartSupply(cfg.agriculture, city, true), false);
    fillExistingAgricultureOffice(ns, cfg, city, actions);
    careForOffice(ns, cfg.agriculture, city, cfg, actions);
    maintainAgricultureOutputSales(ns, cfg, city, actions);
    ensureWarehouseBreathingRoom(ns, cfg, cfg.agriculture, [city], actions);
    if (options.liquidateBoosters) liquidateExcessBoosters(ns, cfg, city, actions);
    maintainAgricultureInputs(ns, cfg, city, actions, options);
  }

  actions.push('Maintaining Agriculture production and sales while waiting for investment offer.');
}

function fillExistingAgricultureOffice(ns, cfg, city, actions, jobOverride = null) {
  const office = getOffice(ns, cfg.agriculture, city);
  const targetSize = Number(office?.size) || 3;
  const jobs = jobOverride ?? (targetSize >= 9 ? cfg.growthJobs : cfg.startupJobs);
  ensureOfficeGrowth(ns, cfg.agriculture, [city], targetSize, jobs, actions);
}

function hasUnhealthyOffice(ns, division, cities, cfg) {
  const energyFloor = Number(cfg.officeCareEnergyFloor) || 80;
  const moraleFloor = Number(cfg.officeCareMoraleFloor) || 80;

  for (const city of cities) {
    const office = getOffice(ns, division, city);
    if (!office || getEmployeeCount(office) <= 0) continue;
    if ((Number(office.avgEnergy) || 0) < energyFloor) return true;
    if ((Number(office.avgMorale) || 0) < moraleFloor) return true;
  }

  return false;
}

function careForOffice(ns, division, city, cfg, actions) {
  const corp = corpApi(ns);
  const office = getOffice(ns, division, city);
  if (!office || getEmployeeCount(office) <= 0) return;

  const funds = Number(getCorporation(ns)?.funds) || 0;
  const reserve = Number(cfg.officeCareReserve) || 0;
  if (funds <= reserve) {
    actions.push(`Deferred office care in ${division}/${city}: preserving cash reserve.`);
    return;
  }

  const energy = Number(office.avgEnergy) || 0;
  const morale = Number(office.avgMorale) || 0;
  const employees = getEmployeeCount(office);

  if (energy < (Number(cfg.officeCareEnergyFloor) || 80)) {
    if (safeCall(() => corp.buyTea(division, city), false) !== false) {
      actions.push(`Bought tea for ${division}/${city}: energy ${energy.toFixed(1)}.`);
    }
  }

  if (morale < (Number(cfg.officeCareMoraleFloor) || 80)) {
    const spend = Math.max(0, Math.min(
      funds - reserve,
      employees * (Number(cfg.officeCarePartySpendPerEmployee) || 1_000_000),
    ));
    if (spend > 0 && safeCall(() => corp.throwParty(division, city, spend / Math.max(1, employees)), false) !== false) {
      actions.push(`Threw party for ${division}/${city}: morale ${morale.toFixed(1)}.`);
    }
  }
}

function maintainAgricultureOutputSales(ns, cfg, city, actions) {
  const corp = corpApi(ns);
  const warehouse = safeCall(() => corp.getWarehouse(cfg.agriculture, city), null);
  const pressure = getWarehousePressure(warehouse);
  const price = pressure >= (Number(cfg.pressureSellThreshold) || 0.85) ? 'MP*0.5' : 'MP';

  for (const product of cfg.materialProducts) {
    safeCall(() => corp.sellMaterial(cfg.agriculture, city, product, 'MAX', price), false);
  }

  if (pressure >= (Number(cfg.pressureSellThreshold) || 0.85)) {
    actions.push(`Warehouse pressure ${Math.round(pressure * 100)}% in ${city}; discount-selling Food/Plants.`);
  }
}

function maintainAgricultureInputs(ns, cfg, city, actions, options = {}) {
  const corp = corpApi(ns);
  const warehouse = safeCall(() => corp.getWarehouse(cfg.agriculture, city), null);
  const pressure = getWarehousePressure(warehouse);
  const funds = Number(getCorporation(ns)?.funds) || 0;

  for (const material of ['Hardware', 'AI Cores', 'Real Estate', 'Robots']) {
    safeCall(() => corp.buyMaterial(cfg.agriculture, city, material, 0), false);
  }

  if (funds < (Number(cfg.cashRecoveryFloor) || 0)) {
    clearBoosterOverflow(ns, cfg, city, actions);
    for (const [material] of cfg.agricultureInputs ?? []) {
      safeCall(() => corp.buyMaterial(cfg.agriculture, city, material, 0), false);
    }
    actions.push(`Cash recovery in ${city}: paused input buying until funds recover.`);
    return;
  }

  if (pressure >= (Number(cfg.criticalPressureSellThreshold) || 0.95)) {
    clearBoosterOverflow(ns, cfg, city, actions);
    return;
  }

  stopBoosterSales(ns, cfg, city);

  const inputPlan = options.stabilize ? cfg.agricultureStabilizeInputs : cfg.agricultureInputBuffers;
  for (const [material, rate, targetQty] of inputPlan ?? []) {
    const qty = getMaterialQty(getMaterial(ns, cfg.agriculture, city, material));
    safeCall(() => corp.buyMaterial(cfg.agriculture, city, material, qty < targetQty ? rate : 0), false);
  }

  actions.push(`${options.stabilize ? 'Lean-feeding' : 'Feeding'} Agriculture inputs in ${city}: Water/Chemicals.`);
}

function liquidateExcessBoosters(ns, cfg, city, actions) {
  const corp = corpApi(ns);
  const keep = new Map(cfg.boosterKeep ?? []);
  let liquidating = false;

  for (const [material, keepQty] of keep.entries()) {
    const qty = getMaterialQty(getMaterial(ns, cfg.agriculture, city, material));
    if (qty <= Number(keepQty)) {
      safeCall(() => corp.sellMaterial(cfg.agriculture, city, material, '0', '0'), false);
      continue;
    }

    const sellAmount = Math.max(0, qty - Number(keepQty));
    safeCall(() => corp.buyMaterial(cfg.agriculture, city, material, 0), false);
    safeCall(() => corp.sellMaterial(cfg.agriculture, city, material, sellAmount, 'MP'), false);
    liquidating = true;
  }

  if (liquidating) {
    actions.push(`Liquidating excess Agriculture boosters in ${city} for cash.`);
  }
}

function canRunRound1MaterialWave(ns, cfg, cities) {
  const corporation = getCorporation(ns);
  const funds = Number(corporation?.funds) || 0;
  const profit = Number(corporation?.revenue ?? 0) - Number(corporation?.expenses ?? 0);
  const minFunds = Number(cfg.round1MaterialFundsFloor) || 0;
  const minProfit = Number(cfg.round1MaterialProfitFloor) || 0;
  const pressureCeiling = Number(cfg.round1MaterialPressureCeiling) || 0.7;

  if (funds < minFunds || profit < minProfit) return false;

  for (const city of cities) {
    const warehouse = safeCall(() => corpApi(ns).getWarehouse(cfg.agriculture, city), null);
    if (getWarehousePressure(warehouse) > pressureCeiling) return false;
  }

  return true;
}

function clearBoosterOverflow(ns, cfg, city, actions) {
  const corp = corpApi(ns);
  const boosterTargets = new Map(
    (cfg.agricultureStartupMaterials ?? []).map(([material, , targetQty]) => [material, targetQty]),
  );
  let cleared = false;

  for (const material of ['Hardware', 'AI Cores', 'Real Estate', 'Robots']) {
    const qty = getMaterialQty(getMaterial(ns, cfg.agriculture, city, material));
    const targetQty = Number(boosterTargets.get(material) ?? 0);
    if (qty <= targetQty) {
      safeCall(() => corp.sellMaterial(cfg.agriculture, city, material, '0', '0'), false);
      continue;
    }

    safeCall(() => corp.buyMaterial(cfg.agriculture, city, material, 0), false);
    safeCall(() => corp.sellMaterial(cfg.agriculture, city, material, 'MAX', 'MP*0.5'), false);
    cleared = true;
  }

  for (const [material] of cfg.agricultureInputs ?? []) {
    safeCall(() => corp.buyMaterial(cfg.agriculture, city, material, 0), false);
  }

  if (cleared) {
    actions.push(`Warehouse full in ${city}; clearing booster overflow before buying inputs.`);
  }
}

function stopBoosterSales(ns, cfg, city) {
  const corp = corpApi(ns);
  for (const material of ['Hardware', 'AI Cores', 'Real Estate', 'Robots']) {
    safeCall(() => corp.sellMaterial(cfg.agriculture, city, material, '0', '0'), false);
  }
}

function ensureCity(ns, division, city, actions) {
  if (hasCity(ns, division, city)) return;
  if (safeCall(() => corpApi(ns).expandCity(division, city), false) !== false) {
    actions.push(`Expanded ${division} to ${city}.`);
  }
}

function ensureWarehouse(ns, division, city, actions) {
  if (hasWarehouse(ns, division, city)) return;
  if (attemptCall(() => corpApi(ns).purchaseWarehouse(division, city))) {
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
    if (attemptCall(() => corp.upgradeWarehouse(division, city, missing))) {
      actions.push(`Upgraded ${division} warehouse in ${city} by ${missing}.`);
    }
  }
}

function ensureWarehouseBreathingRoom(ns, cfg, division, cities, actions) {
  const corp = corpApi(ns);
  const threshold = Number(cfg.warehouseUpgradePressure) || 0.75;

  for (const city of cities) {
    const warehouse = safeCall(() => corp.getWarehouse(division, city), null);
    const pressure = getWarehousePressure(warehouse);
    if (!warehouse || pressure < threshold) continue;

    const cost = getWarehouseUpgradeCost(ns, division, city, 1);
    if (!canAffordWarehouseUpgrade(ns, cfg, cost)) {
      actions.push(
        `Warehouse pressure ${Math.round(pressure * 100)}% in ${division}/${city}; deferred upgrade to preserve cash.`,
      );
      continue;
    }

    if (attemptCall(() => corp.upgradeWarehouse(division, city, 1))) {
      actions.push(`Expanded ${division}/${city} warehouse breathing room at ${Math.round(pressure * 100)}% pressure.`);
    }
  }
}

function ensureOfficeGrowth(ns, division, cities, targetSize, jobs, actions) {
  const corp = corpApi(ns);

  for (const city of cities) {
    let office = getOffice(ns, division, city);
    if (!office) continue;
    const size = Number(office.size) || 0;
    if (size < targetSize) {
      if (attemptCall(() => corp.upgradeOfficeSize(division, city, targetSize - size))) {
        actions.push(`Upgraded ${division} office in ${city} to ${targetSize}.`);
      }
    }

    office = getOffice(ns, division, city) ?? office;
    let employees = getEmployeeCount(office);
    for (let i = employees; i < targetSize; i++) {
      const hireJob = getNextHireJob(jobs, i);
      const hired = safeCall(() => corp.hireEmployee(division, city, hireJob), false);
      if (hired === false) break;
      actions.push(`Hired ${hireJob} employee in ${division}/${city}.`);
    }

    office = getOffice(ns, division, city) ?? office;
    employees = getEmployeeCount(office);
    if (employees < targetSize) {
      actions.push(`Could not finish hiring in ${division}/${city}: ${employees}/${targetSize}.`);
    }

    rebalanceOfficeJobs(ns, division, city, jobs, employees, actions);
  }
}

function rebalanceOfficeJobs(ns, division, city, jobs, employees, actions) {
  const corp = corpApi(ns);
  const jobNames = ['Operations', 'Engineer', 'Business', 'Management', 'Research & Development', 'Intern'];

  for (const job of jobNames) {
    safeCall(() => corp.setAutoJobAssignment(division, city, job, 0), false);
    safeCall(() => corp.setJobAssignment(division, city, job, 0), false);
  }

  let remaining = employees;
  let assigned = 0;
  for (const [job, requested] of jobs) {
    const amount = Math.max(0, Math.min(Number(requested) || 0, remaining));
    remaining -= amount;
    if (amount <= 0) continue;

    if (assignJob(ns, division, city, job, amount)) {
      assigned += amount;
    } else {
      actions.push(`Could not assign ${amount} ${job} in ${division}/${city}.`);
    }
  }

  if (remaining > 0 && assignJob(ns, division, city, 'Operations', remaining)) {
    assigned += remaining;
  }

  if (assigned !== employees) {
    actions.push(`Assigned ${assigned}/${employees} employees in ${division}/${city}.`);
  }
}

function getNextHireJob(jobs, hiredSoFar) {
  let cursor = 0;
  for (const [job, requested] of jobs) {
    cursor += Math.max(0, Number(requested) || 0);
    if (hiredSoFar < cursor) return job;
  }
  return 'Operations';
}

function getWarehouseUpgradeCost(ns, division, city, amount) {
  const corp = corpApi(ns);
  const cost = safeCall(() => corp.getUpgradeWarehouseCost(division, city, amount), null);
  const n = Number(cost);
  return Number.isFinite(n) ? n : Infinity;
}

function canAffordWarehouseUpgrade(ns, cfg, cost) {
  const funds = Number(getCorporation(ns)?.funds) || 0;
  const reserve = Number(cfg.warehouseUpgradeReserve) || 0;
  if (funds <= reserve) return false;

  const price = Number(cost);
  if (!Number.isFinite(price) || price <= 0) return funds >= (Number(cfg.cashStabilizeFloor) || 0);

  const maxFraction = Number(cfg.warehouseUpgradeMaxSpendFraction) || 1;
  return funds - price >= reserve && price <= funds * maxFraction;
}

function attemptCall(fn) {
  try {
    fn();
    return true;
  } catch {
    return false;
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

function ensureStrategicUnlocks(ns, cfg, actions) {
  const offer = getInvestmentOffer(ns);
  const round = Number(offer?.round) || 1;
  const stage = String(getDivision(ns, cfg.tobacco) ? 'product' : 'early');
  const planned = [
    ...(cfg.earlyUnlocks ?? []),
    ...(round > 1 ? cfg.postRound1Unlocks ?? [] : []),
    ...(stage === 'product' ? cfg.productUnlocks ?? [] : []),
  ];
  const seen = new Set();

  for (const unlock of planned) {
    if (!unlock || seen.has(unlock) || hasUnlock(ns, unlock)) continue;
    seen.add(unlock);

    if (unlock === 'Smart Supply') {
      ensureUnlock(ns, unlock, actions);
      continue;
    }

    const corporation = getCorporation(ns);
    const funds = Number(corporation?.funds) || 0;
    const cost = getUnlockCost(ns, unlock);
    if (!Number.isFinite(cost) || cost <= 0) {
      actions.push(`Cannot price ${unlock} unlock yet.`);
      continue;
    }

    const priority = Array.isArray(cfg.priorityUnlocks) && cfg.priorityUnlocks.includes(unlock);
    if (!canAffordUnlock(ns, cost, cfg, priority)) {
      actions.push(
        `Deferred ${unlock} unlock: cost ${formatActionMoney(ns, cost)} with ${formatActionMoney(ns, funds)} funds.`,
      );
      continue;
    }

    if (!ensureUnlock(ns, unlock, actions)) {
      actions.push(`Tried ${unlock} unlock but purchase did not complete.`);
    }
  }
}

function canAffordUnlock(ns, cost, cfg, priority = false) {
  const funds = Number(getCorporation(ns)?.funds) || 0;
  const price = Number(cost);
  if (!Number.isFinite(price) || price <= 0) return false;
  if (funds - price < (Number(cfg.unlockReserve) || 0)) return false;
  if (priority) return true;
  return price <= funds * (Number(cfg.unlockMaxSpendFraction) || 1);
}

function ensureUpgradeTargets(ns, cfg, targets, actions) {
  const corp = corpApi(ns);

  for (const [upgrade, targetLevel] of targets) {
    const current = getUpgradeLevel(ns, upgrade);
    const missing = Math.max(0, targetLevel - current);
    for (let i = 0; i < missing; i++) {
      if (!canAffordCorpPurchase(ns, getUpgradeCost(ns, upgrade), cfg)) {
        actions.push(`Deferred ${upgrade} upgrade: preserving corporation reserve.`);
        break;
      }
      if (safeCall(() => corp.levelUpgrade(upgrade), false) !== false) {
        actions.push(`Leveled ${upgrade} to ${current + i + 1}.`);
      }
    }
  }
}

function canAffordCorpPurchase(ns, cost, cfg) {
  const funds = Number(getCorporation(ns)?.funds) || 0;
  const price = Number(cost);
  if (!Number.isFinite(price) || price <= 0) return false;
  if (funds - price < (Number(cfg.unlockReserve) || 0)) return false;
  return price <= funds * (Number(cfg.unlockMaxSpendFraction) || 1);
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
      const qty = getMaterialQty(getMaterial(ns, division, city, material));
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

function chooseStage(ns, cfg, offer, mainStartupStatus, startupStatus, round1Status, nextExpansionCity) {
  const round = Number(offer?.round) || 1;
  const funds = Number(offer?.funds) || 0;
  const corp = getCorporation(ns);
  const corpFunds = Number(corp?.funds) || 0;
  const profit = Number(corp?.revenue ?? 0) - Number(corp?.expenses ?? 0);

  if (!mainStartupStatus.complete) return 'agriculture-main-startup';
  if (round <= 1 && funds >= cfg.firstOffer) return 'accept-round-1';
  if (round <= 1) return 'waiting-round-1-offer';
  if (!startupStatus.complete) return 'agriculture-startup';
  if (
    round > 1 &&
    nextExpansionCity &&
    corpFunds >= cfg.agricultureExpansionFundsFloor &&
    profit >= cfg.agricultureExpansionProfitFloor
  ) {
    return 'agriculture-expand-city';
  }
  if (round <= 2 && !round1Status.complete) return 'agriculture-round-1';
  if (round <= 2 && funds >= cfg.secondOffer) return 'accept-round-2';
  if (round <= 2) return 'waiting-round-2-offer';
  return 'tobacco-growth';
}

function getAgricultureCities(ns, cfg) {
  const division = getDivision(ns, cfg.agriculture);
  const cities = Array.isArray(division?.cities) ? division.cities : [];
  return cfg.cities.filter((city) => cities.includes(city));
}

function getNextExpansionCity(ns, cfg) {
  const active = new Set(getAgricultureCities(ns, cfg));
  return cfg.expansionCities.find((city) => !active.has(city)) ?? null;
}

function getMaterialWaveStatus(ns, division, cities, materials) {
  const missing = [];

  for (const city of cities) {
    for (const [material, , targetQty] of materials) {
      const qty = getMaterialQty(getMaterial(ns, division, city, material));
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
    type: division.industry ?? division.type,
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

function getMaterialQty(material) {
  const value =
    material?.qty ??
    material?.stored ??
    material?.amount ??
    material?.quantity ??
    0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getWarehousePressure(warehouse) {
  const size = Number(warehouse?.size) || 0;
  const used = Number(warehouse?.sizeUsed) || 0;
  if (size <= 0) return 0;
  return used / size;
}
