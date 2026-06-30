// /tools/corp-status.js

import { CORP_STATE_FILE } from "/lib/corp/config.js";
import { readJson, formatMoney } from "/lib/corp/safe.js";

/** @param {NS} ns **/
export async function main(ns) {
    const state = readJson(ns, CORP_STATE_FILE, null);

    ns.tprint("Corporation Status");
    ns.tprint("=".repeat(70));

    if (!state) {
        ns.tprint(`No corp state found at ${CORP_STATE_FILE}.`);
        ns.tprint("Run /tools/corp-manager-service.js --once for a dry first pass.");
        return;
    }

    ns.tprint(`Status: ${state.status} | Stage: ${state.stage ?? "unknown"}`);
    ns.tprint(`Message: ${state.message}`);

    const corp = state.corporation;
    if (corp) {
        ns.tprint("-".repeat(70));
        ns.tprint(`${corp.name}: funds ${formatMoney(ns, corp.funds)} | profit ${formatMoney(ns, corp.profit)}`);
        ns.tprint(`Divisions: ${(corp.divisions ?? []).join(", ") || "none"}`);
    }

    printDivision(ns, state.agriculture);
    printDivision(ns, state.tobacco);

    const offer = state.investmentOffer;
    if (offer) {
        ns.tprint("-".repeat(70));
        ns.tprint(`Investment Offer: round ${offer.round ?? "?"} | ${formatMoney(ns, offer.funds)}`);
    }

    if (state.actions?.length) {
        ns.tprint("-".repeat(70));
        ns.tprint("Recent Actions");
        for (const action of state.actions.slice(-10)) ns.tprint(action);
    }
}

function printDivision(ns, division) {
    if (!division) return;
    ns.tprint("-".repeat(70));
    ns.tprint(`${division.name} (${division.type ?? "unknown"}) | products: ${(division.products ?? []).join(", ") || "none"}`);

    for (const office of division.offices ?? []) {
        ns.tprint(
            `${office.city}: office ${office.employees}/${office.officeSize} | ` +
            `warehouse L${office.warehouseLevel} ${formatNumber(office.warehouseUsed)}/${formatNumber(office.warehouseSize)}`
        );
    }
}

function formatNumber(value) {
    const n = Number(value) || 0;
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}m`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(2)}k`;
    return n.toFixed(2);
}
