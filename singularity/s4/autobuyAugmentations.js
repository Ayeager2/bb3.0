/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  const flags = ns.flags([
    ["tails", false],
  ]);
  if (flags.tails) {
    ns.ui.openTail();
  }
  const reserveMoney = 10_000_000;
  const refreshMs = 5000;

  // Safety: this script only buys. It does NOT install/reset.
  while (true) {
    ns.clearLog();

    const best = getBestAffordableAug(ns, reserveMoney);

    printStatus(ns, best, reserveMoney);

    if (best) {
      const bought = ns.singularity.purchaseAugmentation(best.faction, best.aug);

      if (bought) {
        ns.tprint(`Bought ${best.aug} from ${best.faction} for $${ns.format.number(best.price)}`);
      }
    }

    await ns.sleep(refreshMs);
  }
}

function getBestAffordableAug(ns, reserveMoney) {
  const owned = new Set(ns.singularity.getOwnedAugmentations(true));
  const factions = ns.getPlayer().factions;

  const options = [];

  for (const faction of factions) {
    const factionRep = ns.singularity.getFactionRep(faction);
    const augs = ns.singularity.getAugmentationsFromFaction(faction);

    for (const aug of augs) {
      if (owned.has(aug)) continue;

      const price = ns.singularity.getAugmentationPrice(aug);
      const repReq = ns.singularity.getAugmentationRepReq(aug);

      if (factionRep < repReq) continue;
      if (ns.getPlayer().money - reserveMoney < price) continue;

      options.push({
        faction,
        aug,
        price,
        repReq,
      });
    }
  }

  return options.sort((a, b) => a.price - b.price)[0];
}

function printStatus(ns, best, reserveMoney) {
  ns.print("Auto Augmentation Buyer");
  ns.print("=".repeat(60));
  ns.print(`Money: $${ns.format.number(ns.getPlayer().money)}`);
  ns.print(`Reserve: $${ns.format.number(reserveMoney)}`);
  ns.print(`Factions: ${ns.getPlayer().factions.join(", ")}`);
  ns.print("-".repeat(60));

  if (!best) {
    ns.print("No affordable augmentation available right now.");
    return;
  }

  ns.print(`Next purchase: ${best.aug}`);
  ns.print(`Faction: ${best.faction}`);
  ns.print(`Price: $${ns.format.number(best.price)}`);
  ns.print(`Rep required: ${ns.format.number(best.repReq)}`);
}