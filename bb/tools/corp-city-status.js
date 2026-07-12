// /tools/corp-city-status.js

/** @param {NS} ns **/
export async function main(ns) {
  const division = String(ns.args[0] ?? "Agriculture");
  const city = String(ns.args[1] ?? "Sector-12");
  const corp = ns.corporation;

  if (!corp?.hasCorporation()) {
    ns.tprint("[CORP CITY] No corporation exists.");
    return;
  }

  const c = safe(() => corp.getCorporation(), null);
  const office = safe(() => corp.getOffice(division, city), null);
  const warehouse = safe(() => corp.getWarehouse(division, city), null);
  const food = safe(() => corp.getMaterial(division, city, "Food"), null);
  const plants = safe(() => corp.getMaterial(division, city, "Plants"), null);
  const hardware = safe(() => corp.getMaterial(division, city, "Hardware"), null);
  const aiCores = safe(() => corp.getMaterial(division, city, "AI Cores"), null);
  const realEstate = safe(() => corp.getMaterial(division, city, "Real Estate"), null);

  ns.tprint(`[CORP CITY] ${c?.name ?? "corp"} funds=${fmt(c?.funds)} rev=${fmt(c?.revenue)} exp=${fmt(c?.expenses)} profit=${fmt((c?.revenue ?? 0) - (c?.expenses ?? 0))}`);
  ns.tprint(`[CORP CITY] ${division}/${city}`);
  ns.tprint(`[CORP CITY] office size=${office?.size ?? "?"} employees=${employeeCount(office)} morale=${num(office?.avgMorale)} energy=${num(office?.avgEnergy)}`);
  ns.tprint(`[CORP CITY] warehouse level=${warehouse?.level ?? "?"} size=${num(warehouse?.size)} used=${num(warehouse?.sizeUsed)}`);
  printMaterial(ns, "Food", food);
  printMaterial(ns, "Plants", plants);
  printMaterial(ns, "Hardware", hardware);
  printMaterial(ns, "AI Cores", aiCores);
  printMaterial(ns, "Real Estate", realEstate);
}

function printMaterial(ns, name, material) {
  if (!material) {
    ns.tprint(`[CORP CITY] ${name}: unavailable`);
    return;
  }

  ns.tprint(
    `[CORP CITY] ${name}: qty=${num(getMaterialQty(material))} prod=${num(material.productionAmount)} sell=${String(material.desiredSellAmount ?? material.sellAmount ?? "?")} price=${String(material.desiredSellPrice ?? "?")} actual=${num(material.actualSellAmount)} buy=${String(material.buyAmount ?? "?")} market=${num(material.marketPrice)} keys=${Object.keys(material).join("/")}`,
  );
}

function safe(fn, fallback = null) {
  try {
    const value = fn();
    return value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

function employeeCount(office) {
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
    material?.size;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function fmt(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(3)}b`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(3)}m`;
  return `$${n.toFixed(3)}`;
}

function num(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "?";
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(3)}b`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(3)}m`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(3)}k`;
  return n.toFixed(3);
}
