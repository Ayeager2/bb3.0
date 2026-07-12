// /tools/corp-office-repair.js

const JOBS = ["Operations", "Engineer", "Business", "Management", "Research & Development", "Intern"];

/** @param {NS} ns **/
export async function main(ns) {
  const division = String(ns.args[0] ?? "Agriculture");
  const city = String(ns.args[1] ?? "Sector-12");
  const corp = ns.corporation;

  if (!corp?.hasCorporation()) {
    ns.tprint("[CORP OFFICE] No corporation exists.");
    return;
  }

  const office = safe(() => corp.getOffice(division, city), null);
  if (!office) {
    ns.tprint(`[CORP OFFICE] No office found for ${division}/${city}.`);
    return;
  }

  const size = Number(office.size) || 0;
  let employees = getEmployeeCount(office);
  const plan = buildPlan(size);

  ns.tprint(`[CORP OFFICE] Repairing ${division}/${city}: size=${size} employees=${employees}`);

  while (employees < size) {
    const nextJob = getNextHireJob(plan, employees);
    const hired = await safeAsync(() => corp.hireEmployee(division, city, nextJob), false);
    if (hired === false) {
      ns.tprint(`[CORP OFFICE] Could not hire more employees at ${employees}/${size}.`);
      break;
    }
    employees += 1;
    ns.tprint(`[CORP OFFICE] Hired ${nextJob}: ${employees}/${size}.`);
  }

  for (const job of JOBS) {
    await safeAsync(() => corp.setJobAssignment(division, city, job, 0), false);
  }

  let assigned = 0;
  for (const [job, amount] of plan) {
    if (amount <= 0) continue;
    const ok = await safeAsync(() => corp.setJobAssignment(division, city, job, amount), false);
    ns.tprint(`[CORP OFFICE] ${ok === false ? "Failed" : "Set"} ${job}=${amount}.`);
    if (ok !== false) assigned += amount;
  }

  const after = safe(() => corp.getOffice(division, city), null);
  ns.tprint(`[CORP OFFICE] Done. assignedRequested=${assigned}/${employees} officeEmployees=${getEmployeeCount(after)} size=${after?.size ?? "?"}`);
}

function buildPlan(size) {
  if (size >= 9) {
    return [
      ["Operations", 3],
      ["Engineer", 2],
      ["Business", 2],
      ["Management", 1],
      ["Research & Development", 1],
      ["Intern", 0],
    ];
  }

  return [
    ["Operations", 1],
    ["Engineer", 1],
    ["Business", Math.max(0, size - 2)],
    ["Management", 0],
    ["Research & Development", 0],
    ["Intern", 0],
  ];
}

function getNextHireJob(plan, hiredSoFar) {
  let cursor = 0;
  for (const [job, amount] of plan) {
    cursor += amount;
    if (hiredSoFar < cursor) return job;
  }
  return "Operations";
}

function getEmployeeCount(office) {
  if (Number.isFinite(Number(office?.numEmployees))) return Number(office.numEmployees);
  if (Array.isArray(office?.employees)) return office.employees.length;
  return 0;
}

function safe(fn, fallback = null) {
  try {
    const value = fn();
    return value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

async function safeAsync(fn, fallback = null) {
  try {
    const value = await fn();
    return value === undefined ? true : value;
  } catch {
    return fallback;
  }
}
