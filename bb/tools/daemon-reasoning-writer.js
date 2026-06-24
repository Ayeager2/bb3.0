// /tools/daemon-reasoning-writer.js

const OUT_FILE = "/data/ui/daemon-reasoning.txt";
const HISTORY_FILE = "/data/ui/daemon-reasoning-history.txt";
const STATE_FILE = "/data/ui/dashboard-state.txt";
const HACKNET_STATE_FILE = "/data/hacknet-state.txt";
const HASH_SPENDER_STATE_FILE = "/data/hacknet-hash-spender-state.txt";
const STOCK_TRADER_STATE_FILE = "/data/stock-trader-state.txt";
const AUGMENTATION_PLAN_FILE = "/data/augmentation-plan.txt";
const FACTION_WORK_PLAN_FILE = "/data/faction-work-plan.txt";
const MAX_HISTORY = 50;

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["once", false],
        ["refresh", 5000],
    ]);

    const refreshMs = Number(flags.refresh) || 5000;

    let lastFingerprint = "";

    while (true) {
        const state = readJson(ns, STATE_FILE, {});
        const context = {
            currentBitNode: getCurrentBitNode(ns),
            hacknet: readJson(ns, HACKNET_STATE_FILE, null),
            hashSpender: readJson(ns, HASH_SPENDER_STATE_FILE, null),
            stockTrader: readJson(ns, STOCK_TRADER_STATE_FILE, null),
            augmentationPlan: readJson(ns, AUGMENTATION_PLAN_FILE, null),
            factionWorkPlan: readJson(ns, FACTION_WORK_PLAN_FILE, null),
        };
        const reasoning = buildReasoning(state, context);
        const fingerprint = buildFingerprint(reasoning);

        ns.write(OUT_FILE, JSON.stringify(reasoning, null, 2), "w");

        if (fingerprint !== lastFingerprint) {
            lastFingerprint = fingerprint;
            appendHistory(ns, reasoning);
        }

        if (flags.once) {
            ns.tprint(`Wrote ${OUT_FILE}`);
            return;
        }

        await ns.sleep(refreshMs);
    }
}

function buildReasoning(state, context = {}) {
    const progression = state?.progression ?? {};
    const daemon = state?.daemon ?? {};
    const target = state?.target ?? {};
    const policy = state?.policy ?? {};
    const readiness = state?.readiness ?? {};
    const victory = state?.victory ?? {};
    const bitNode = Number(context?.currentBitNode ?? state?.bitnode?.number ?? context?.augmentationPlan?.bitNode ?? 0);
    const stateAge = Date.now() - Number(state?.updatedAt ?? 0);
    const stale = !Number.isFinite(stateAge) || stateAge > 30_000;

    const items = [];

    if (stale) {
        items.push(reason(
            "stale",
            "Telemetry Freshness",
            "Dashboard state is stale.",
            `Last dashboard state update was ${formatAge(state?.updatedAt)}. Restart /tools/dashboard-state-writer.js or daemon.js if this does not refresh.`,
            "warning",
            { updatedAt: state?.updatedAt, stateAge }
        ));
    }

    items.push(
        reason("mode", "Current Mode", `Daemon is running in ${progression.mode ?? "unknown"} mode.`, progression.nextAction ?? "No next action published.", "info", {
            phase: progression.phase,
            priority: progression.priority,
            posture: progression.posture,
        }),

        reason("target", "Current Target", `Current target is ${daemon.target ?? target.name ?? "unknown"}.`, explainTarget(target), Number(target.prepNeed ?? 0) > 0.25 ? "warning" : "success", {
            moneyPercent: target.moneyPercent,
            securityDiff: target.securityDiff,
            prepNeed: target.prepNeed,
            weakenTime: target.weakenTime,
        }),

        reason("policy", "Spending Policy", "Current policy controls what automation is allowed to buy or trigger.", explainPolicy(policy, bitNode), "info", policy),
    );

    if (bitNode === 9) {
        items.push(...buildBn9Items(context, policy));
    } else {
        items.push(
            reason("readiness", "BN4 Readiness", readiness.ready
                ? "BN4 readiness checks are complete."
                : `BN4 readiness is incomplete: ${readiness.readyCount ?? 0}/${readiness.totalChecks ?? 0}.`,
                explainReadiness(readiness),
                readiness.ready ? "success" : "warning",
                readiness
            ),

            reason("victory", "Victory Plan", `Current victory stage is ${victory.stage ?? "unknown"}.`, victory.nextAction ?? "No victory next action available.", victory.canUseWorldDaemon ? "danger" : "info", victory)
        );
    }

    return {
        schemaVersion: 2,
        updatedAt: Date.now(),
        source: "daemon-reasoning-writer",
        summary: buildSummary(items),
        fingerprint: buildFingerprint({ items }),
        items,
    };
}

function buildBn9Items(context, policy) {
    const hacknet = context.hacknet ?? {};
    const hashSpender = context.hashSpender ?? {};
    const stock = context.stockTrader ?? {};
    const augPlan = context.augmentationPlan ?? {};
    const factionWork = context.factionWorkPlan ?? {};

    const items = [
        reason(
            "bn9-hacknet",
            "BN9 Hacknet",
            `Hacknet is ${hacknet.status ?? "unknown"}.`,
            explainHacknet(hacknet),
            getHacknetLevel(hacknet),
            hacknet
        ),
        reason(
            "bn9-hashes",
            "Hash Spending",
            `Hash policy: ${hashSpender.hashPolicy?.upgradeName ?? hashSpender.upgradeName ?? "unknown"}.`,
            hashSpender.message ?? hashSpender.hashPolicy?.reason ?? "No hash spender telemetry.",
            hashSpender.acted ? "success" : "info",
            hashSpender
        ),
        reason(
            "bn9-stocks",
            "Stock Trader",
            `Stock trader is ${stock.mode ?? "offline"}.`,
            explainStocks(stock, policy),
            stock.daemonAllowed === false ? "warning" : "info",
            stock
        ),
        reason(
            "bn9-augmentations",
            "Augmentation Path",
            augPlan.nextGoal?.name
                ? `Next augmentation is ${augPlan.nextGoal.name}.`
                : "No augmentation goal published.",
            explainAugmentation(augPlan, factionWork),
            augPlan.ready ? "success" : "warning",
            {
                augmentationPlan: augPlan,
                factionWork,
            }
        ),
    ];

    return items;
}

function appendHistory(ns, reasoning) {
    const history = readJson(ns, HISTORY_FILE, []);

    const entry = {
        ts: Date.now(),
        summary: reasoning.summary,
        fingerprint: reasoning.fingerprint,
        levels: countLevels(reasoning.items),
        items: reasoning.items.map(item => ({
            id: item.id,
            title: item.title,
            summary: item.summary,
            detail: item.detail,
            level: item.level,
        })),
    };

    const next = [entry, ...history]
        .filter(Boolean)
        .slice(0, MAX_HISTORY);

    ns.write(HISTORY_FILE, JSON.stringify(next, null, 2), "w");
}

function countLevels(items) {
    return {
        info: items.filter(i => i.level === "info").length,
        success: items.filter(i => i.level === "success").length,
        warning: items.filter(i => i.level === "warning").length,
        danger: items.filter(i => i.level === "danger").length,
        error: items.filter(i => i.level === "error").length,
    };
}

function buildFingerprint(reasoning) {
    const items = Array.isArray(reasoning?.items) ? reasoning.items : [];

    return items
        .map(item => `${item.id}:${item.level}:${item.summary}:${item.detail}`)
        .join("|");
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

    if (prepNeed > 0.25) return "Target likely needs prep work before it becomes efficient.";
    if (moneyPercent < 0.8) return "Target money is below ideal level, so grow support may be needed.";
    if (securityDiff > 5) return "Target security is elevated, so weaken support may be needed.";

    return "Target appears stable enough for current automation.";
}

function explainPolicy(policy, bitNode = 0) {
    const blocked = [];

    if (!policy.allowServerPurchases && bitNode !== 9) blocked.push("server purchases");
    if (!policy.allowStockTrading) blocked.push("stock trading");
    if (!policy.allowAugmentPurchases) blocked.push("augmentation purchases");
    if (!policy.allowReset) blocked.push("reset execution");

    if (bitNode === 9 && !policy.allowServerPurchases) {
        blocked.push("cloud servers blocked by BN9");
    }

    if (!blocked.length) return "Major automation policy gates are open.";

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

function getCurrentBitNode(ns) {
    try {
        return ns.getResetInfo()?.currentNode ?? ns.getPlayer()?.bitNodeN ?? 0;
    } catch {
        return 0;
    }
}

function explainHacknet(hacknet) {
    if (!hacknet?.updatedAt) return "No Hacknet buyer telemetry is available.";

    const next = hacknet.nextAction ?? hacknet.roi?.bestCandidate ?? null;
    const production = formatNumber(hacknet.totalProduction ?? 0);
    const nodes = `${hacknet.nodeCount ?? 0}/${hacknet.maxNodes ?? hacknet.targetNodes ?? "?"}`;

    if (next?.label) {
        return `${nodes} nodes producing ${production} hashes/sec. Next: ${next.label} for ${formatMoney(next.cost)}.`;
    }

    return `${nodes} nodes producing ${production} hashes/sec. ${hacknet.message ?? "No next action published."}`;
}

function getHacknetLevel(hacknet) {
    if (!hacknet?.updatedAt) return "warning";
    if (hacknet.acted) return "success";
    if (hacknet.status === "roi-blocked" || hacknet.status === "waiting-money") return "info";
    if (hacknet.status === "blocked") return "warning";
    return "info";
}

function explainStocks(stock, policy) {
    if (!stock?.updatedAt) return "No stock trader telemetry is available.";
    if (stock.daemonAllowed === false || policy.allowStockTrading === false) {
        return stock.marketAccess?.blockedReason ?? "Trading is disabled by daemon policy.";
    }

    const holdings = Number(stock.holdings ?? 0);
    const profit = formatMoney(stock.totalProfit ?? 0);

    return `${holdings} positions held. Portfolio ${formatMoney(stock.portfolioValue ?? 0)}. Total P/L ${profit}.`;
}

function explainAugmentation(plan, factionWork) {
    if (!plan?.updatedAt) return "No augmentation plan telemetry is available.";
    if (plan.ready) return "Next augmentation is ready to buy when policy allows purchases.";
    if (factionWork?.active) {
        return `${plan.blockedReason ?? "Plan is blocked."} Working ${factionWork.targetFaction ?? "unknown"} for ${factionWork.targetAugmentation ?? "an augmentation"}.`;
    }

    return plan.blockedReason ?? "No augmentation blocker reason published.";
}

function formatAge(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return "never";

    const seconds = Math.max(0, Math.round((Date.now() - n) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
    return `${Math.round(seconds / 3600)}h ago`;
}

function formatMoney(value) {
    return "$" + formatNumber(value);
}

function formatNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "unknown";
    if (Math.abs(n) >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(2)}t`;
    if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}b`;
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}m`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(2)}k`;
    return n.toFixed(0);
}
