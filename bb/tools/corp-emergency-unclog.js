// /tools/corp-emergency-unclog.js

const DIVISION = "Agriculture";
const CITIES = ["Sector-12", "Aevum", "Chongqing", "New Tokyo", "Ishima", "Volhaven"];
const OUTPUTS = ["Food", "Plants"];
const CLOG_MATERIALS = ["Robots", "Hardware", "AI Cores"];
const HOLD_MATERIALS = ["Real Estate"];

/** @param {NS} ns **/
export async function main(ns) {
  const corp = ns.corporation;
  if (!corp?.hasCorporation()) {
    ns.tprint("[CORP UNCLOG] No corporation exists.");
    return;
  }

  const acceptInvestment = ns.args.includes("--accept-investment");
  const corporation = safe(() => corp.getCorporation(), {});
  const funds = Number(corporation?.funds) || 0;
  const offer = safe(() => corp.getInvestmentOffer(), null);
  const offerFunds = Number(offer?.funds) || 0;

  if (acceptInvestment && funds < 0 && offerFunds > Math.abs(funds)) {
    try {
      corp.acceptInvestmentOffer();
      ns.tprint(`[CORP UNCLOG] Accepted rescue investment offer: ${formatMoney(offerFunds)}.`);
    } catch {
      ns.tprint(`[CORP UNCLOG] Rescue investment offer exists but acceptance failed.`);
    }
  }

  for (const city of CITIES) {
    for (const material of [...OUTPUTS, ...CLOG_MATERIALS, ...HOLD_MATERIALS]) {
      try {
        corp.buyMaterial(DIVISION, city, material, 0);
      } catch {
        // City/material may not exist yet.
      }
    }

    for (const material of OUTPUTS) {
      try {
        corp.sellMaterial(DIVISION, city, material, "MAX", "MP");
      } catch {
        // City/material may not exist yet.
      }
    }

    for (const material of CLOG_MATERIALS) {
      try {
        corp.sellMaterial(DIVISION, city, material, "MAX", "0");
      } catch {
        // City/material may not exist yet.
      }
    }

    for (const material of HOLD_MATERIALS) {
      try {
        corp.sellMaterial(DIVISION, city, material, "0", "0");
      } catch {
        // City/material may not exist yet.
      }
    }
  }

  ns.tprint("[CORP UNCLOG] Emergency unclog orders set. Hardware/AI/Robots are being dumped at 0.");
}

function safe(fn, fallback) {
  try {
    const value = fn();
    return value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

function formatMoney(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}t`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}b`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}m`;
  return `$${n.toFixed(0)}`;
}
