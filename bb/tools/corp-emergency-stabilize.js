// /tools/corp-emergency-stabilize.js

const DIVISION = "Agriculture";
const CITIES = ["Sector-12", "Aevum", "Chongqing", "New Tokyo", "Ishima", "Volhaven"];
const OUTPUTS = ["Food", "Plants"];
const CLEAR_MATERIALS = ["Robots", "Hardware", "AI Cores"];
const HOLD_MATERIALS = ["Real Estate"];

/** @param {NS} ns **/
export async function main(ns) {
  const corp = ns.corporation;
  if (!corp?.hasCorporation()) {
    ns.tprint("[CORP EMERGENCY] No corporation exists.");
    return;
  }

  for (const city of CITIES) {
    for (const material of [...OUTPUTS, ...CLEAR_MATERIALS, ...HOLD_MATERIALS]) {
      try {
        corp.buyMaterial(DIVISION, city, material, 0);
      } catch {
        // City/material may not exist yet.
      }
    }

    for (const product of OUTPUTS) {
      try {
        corp.sellMaterial(DIVISION, city, product, "MAX", "MP");
      } catch {
        // City/product may not exist yet.
      }
    }

    for (const material of CLEAR_MATERIALS) {
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

  ns.tprint("[CORP EMERGENCY] Buy orders stopped; Agriculture sales reset to MP.");
}
