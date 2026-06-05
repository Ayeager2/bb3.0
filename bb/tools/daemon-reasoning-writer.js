// /tools/daemon-reasoning-writer.js

const OUT_FILE = "/data/ui/daemon-reasoning.txt";
const STATE_FILE = "/data/ui/dashboard-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["once", false],
        ["refresh", 5000],
    ]);

    const refreshMs = Number(flags.refresh) || 5000;

    while (true) {
        const state = readJson(ns, STATE_FILE, {});
        const reasoning = buildReasoning(ns, state);

        ns.write(OUT_FILE, JSON.stringify(reasoning, null, 2), "w");

        if (flags.once) {
            ns.tprint(`Wrote ${OUT_FILE}`);
            return;
        }

        await ns.sleep(refreshMs);
    }
}

function buildReasoning(ns, state) {
    const progression = state?.progression ?? {};
    const daemon = state?.daemon ?? {};
    const target = state?.target ?? {};
    const policy = state?.policy ?? {};
    const readiness = state?.readiness ?? {};
    const victory = state?.victory ?? {};

    const items = [];

    items.push(reason(
        "mode",
        "Current Mode",
        `Daemon is running in ${progression.mode ?? "unknown"} mode.`,
        progression.nextAction ?? "No next action published.",
        "info",
        {
            phase: progression.phase,
            priority: progression.priority,
            posture: progression.posture,
        }
    ));

    items.push(reason(
        "target",
        "Current Target",
        `Current target is ${daemon.target ?? target.name ?? "unknown"}.`,
        explainTarget(target),
        target.prepNeed > 0.25 ? "warning" : "success",
        {
            moneyPercent: target.moneyPercent,
            securityDiff: target.securityDiff,
            prepNeed: target.prepNeed,
            weakenTime: target.weakenTime,
        }
    ));

    items.push(reason(
        "policy",
        "Spending Policy",
        "Current policy controls what automation is allowed to buy or trigger.",
        explainPolicy(policy),
        "info",
        policy
    ));

    items.push(reason(
        "readiness",
        "BN4 Readiness",
        readiness.ready
            ? "BN4 readiness checks are complete."
            : `BN4 readiness is incomplete: ${readiness.readyCount ?? 0}/${readiness.totalChecks ?? 0}.`,
        explainReadiness(readiness),
        readiness.ready ? "success" : "warning",
        readiness
    ));

    items.push(reason(
        "victory",
        "Victory Plan",
        `Current victory stage is ${victory.stage ?? "unknown"}.`,
        victory.nextAction ?? "No victory next action available.",
        victory.canUseWorldDaemon ? "danger" : "info",
        victory
    ));

    return {
        schemaVersion: 1,
        updatedAt: Date.now(),
        source: "daemon-reasoning-writer",
        summary: buildSummary(items),
        items,
        historyHint: "Current snapshot only. History can be appended later.",
    };
}

function reason(id, title, summary, detail, level = "info", data = {}) {
    return {
        id,
        title,
        summary,
        detail,
        level,
        data,
        ts: Date.now(),
    };
}

function explainTarget(target) {
    if (!target?.name) return "No target data is available.";

    const moneyPercent = Number(target.moneyPercent ?? 0);
    const securityDiff = Number(target.securityDiff ?? 0);
    const prepNeed = Number(target.prepNeed ?? 0);

    if (prepNeed > 0.25) {
        return "Target likely needs prep work before it becomes efficient.";
    }

    if (moneyPercent < 0.8) {
        return "Target money is below ideal level, so grow support may be needed.";
    }

    if (securityDiff > 5) {
        return "Target security is elevated, so weaken support may be needed.";
    }

    return "Target appears stable enough for current automation.";
}

function explainPolicy(policy) {
    const blocked = [];

    if (!policy.allowServerPurchases) blocked.push("server purchases");
    if (!policy.allowStockTrading) blocked.push("stock trading");
    if (!policy.allowAugmentPurchases) blocked.push("augmentation purchases");
    if (!policy.allowReset) blocked.push("reset execution");

    if (!blocked.length) {
        return "Major automation policy gates are open.";
    }

    return `Policy currently blocks: ${blocked.join(", ")}.`;
}

function explainReadiness(readiness) {
    const missing = [];

    if (!readiness.hackingReady) missing.push("hacking level");
    if (!readiness.moneyReady) missing.push("money");
    if (!readiness.homeRamReady) missing.push("home RAM");
    if (!readiness.augReady) missing.push("augmentations");

    if (!missing.length) return "All readiness checks appear complete.";

    return `Still waiting on: ${missing.join(", ")}.`;
}

function buildSummary(items) {
    const warnings = items.filter(item => item.level === "warning").length;
    const dangers = items.filter(item => item.level === "danger").length;

    if (dangers > 0) return "Critical endgame or reset condition detected.";
    if (warnings > 0) return `${warnings} warning item(s) need attention.`;

    return "Daemon reasoning snapshot looks stable.";
}

function readJson(ns, file, fallback = null) {
    try {
        if (!ns.fileExists(file, "home")) return fallback;

        const raw = ns.read(file);
        if (!raw.trim()) return fallback;

        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}