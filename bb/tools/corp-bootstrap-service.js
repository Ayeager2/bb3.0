// /tools/corp-bootstrap-service.js

const STATE_FILE = "/data/corp-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const flags = ns.flags([
    ["name", "Limitless"],
    ["division", "Agriculture"],
    ["industry", "Agriculture"],
  ]);

  const name = String(flags.name || "Limitless");
  const division = String(flags.division || "Agriculture");
  const industry = String(flags.industry || "Agriculture");
  const actions = [];

  if (!ns.corporation) {
    return writeState(ns, {
      status: "blocked",
      message: "Corporation API is unavailable.",
      actions,
    });
  }

  if (!hasCorporation(ns)) {
    if (!canCreateCorporation(ns, false)) {
      return writeState(ns, {
        status: "waiting-create",
        message: "Cannot create corporation with BN3 seed money yet.",
        actions,
      });
    }

    if (safe(() => ns.corporation.createCorporation(name, false), false)) {
      actions.push(`Created corporation ${name} with BN3 seed money.`);
    }
  }

  if (!hasDivision(ns, division)) {
    if (safe(() => ns.corporation.expandIndustry(industry, division), false) !== false) {
      actions.push(`Expanded ${industry} division ${division}.`);
    }
  }

  const corp = safe(() => ns.corporation.getCorporation(), null);
  writeState(ns, {
    status: corp ? "bootstrapped" : "blocked",
    message: corp
      ? "Corporation bootstrap complete. Full corp manager can take over when home RAM is large enough."
      : "Corporation bootstrap did not create a corporation.",
    corporation: corp ? {
      name: corp.name,
      funds: corp.funds,
      revenue: corp.revenue,
      expenses: corp.expenses,
      profit: Number(corp.revenue ?? 0) - Number(corp.expenses ?? 0),
      divisions: corp.divisions,
    } : null,
    actions,
  });
}

function hasCorporation(ns) {
  return safe(() => ns.corporation.hasCorporation(), false) === true;
}

function canCreateCorporation(ns, selfFund) {
  return safe(() => ns.corporation.canCreateCorporation(selfFund), false) === true;
}

function hasDivision(ns, division) {
  return !!safe(() => ns.corporation.getDivision(division), null);
}

function safe(fn, fallback = null) {
  try {
    const value = fn();
    return value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

function writeState(ns, state) {
  const payload = {
    updatedAt: Date.now(),
    updatedAtText: new Date().toLocaleTimeString(),
    source: "corp-bootstrap-service",
    ...state,
  };
  ns.write(STATE_FILE, JSON.stringify(payload, null, 2), "w");
  ns.tprint(`[CORP BOOTSTRAP] ${payload.message}`);
}
