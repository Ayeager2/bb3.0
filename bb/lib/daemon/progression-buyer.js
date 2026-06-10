const PROGRAMS = [
  { name: "BruteSSH.exe", cost: 500_000 },
  { name: "FTPCrack.exe", cost: 1_500_000 },
  { name: "relaySMTP.exe", cost: 5_000_000 },
  { name: "HTTPWorm.exe", cost: 30_000_000 },
  { name: "SQLInject.exe", cost: 250_000_000 },
];

export function runProgressionBuyer(ns, policy = {}) {
  const reserveMoney = policy.reserveMoney ?? 1_000_000_000;
  const allowExePurchases = policy.allowExePurchases !== false;
  const allowHomeRam = policy.allowHomeRam !== false;

  if (allowExePurchases) {
    const exeResult = buyTorAndPrograms(ns, reserveMoney);
    if (exeResult.bought) return exeResult;
  }

  if (allowHomeRam) {
    const ramResult = buyHomeRam(ns, reserveMoney);
    if (ramResult.bought) return ramResult;
  }

  return {
    bought: false,
    message: "No progression purchase made.",
  };
}

function buyTorAndPrograms(ns, reserveMoney) {
  const money = ns.getPlayer().money;
  const spendable = Math.max(0, money - reserveMoney);

  if (!hasTorOrDarkweb(ns) && money > 450_000) {
    try {
      if (purchaseTor(ns)) {
        return {
          bought: true,
          type: "tor",
          message: "Purchased TOR router",
        };
      }
    } catch (error) {
    console.error(error);
}
  }

  if (!hasTorOrDarkweb(ns)) {
    return { bought: false };
  }

  for (const program of PROGRAMS) {
    if (ns.fileExists(program.name, "home")) continue;
    if (spendable < program.cost) continue;

    try {
      if (purchaseProgram(ns, program.name)) {
        return {
          bought: true,
          type: "program",
          message: `Purchased ${program.name}`,
        };
      }
    } catch (error) {
    console.error(error);
}
  }

  return { bought: false };
}

function buyHomeRam(ns, reserveMoney) {
  const spendable = Math.max(0, ns.getPlayer().money - reserveMoney);

  let cost = Infinity;
  try {
    cost = ns.singularity.getUpgradeHomeRamCost();
  } catch {
    return { bought: false };
  }

  if (spendable < cost) return { bought: false };

  try {
    if (ns.singularity.upgradeHomeRam()) {
      return {
        bought: true,
        type: "homeRam",
        message: `Upgraded home RAM to ${ns.format.ram(ns.getServerMaxRam("home"))}`,
      };
    }
  } catch (error) {
    console.error(error);
}

  return { bought: false };
}

function hasTorOrDarkweb(ns) {
  try {
    if (ns.hasTorRouter()) return true;
  } catch {
    // Bitburner v3 may only expose darkweb through Singularity.
  }

  try {
    if (ns.scan("home").includes("darkweb")) return true;
  } catch {
    // Fall back to program ownership below.
  }

  return PROGRAMS.some(p => ns.fileExists(p.name, "home"));
}

function purchaseTor(ns) {
  try {
    if (ns.singularity?.purchaseTor()) return true;
  } catch {
    // Fall back to legacy API below.
  }

  try {
    return typeof ns.purchaseTor === "function" && ns.purchaseTor();
  } catch {
    return false;
  }
}

function purchaseProgram(ns, program) {
  try {
    if (ns.singularity?.purchaseProgram(program)) return true;
  } catch {
    // Fall back to legacy API below.
  }

  try {
    return typeof ns.purchaseProgram === "function" && ns.purchaseProgram(program);
  } catch {
    return false;
  }
}
