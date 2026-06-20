// /lib/daemon/cloud-fleet.js
import { getBitNodeCapabilities } from "/lib/daemon/bitnode-capabilities.js";

export function getCloudFleetStatus(ns) {
    const bitNodeCapabilities =
        getBitNodeCapabilities(ns);

    if (bitNodeCapabilities.cloud.allowed !== true) {
        return {
            available: false,
            maxed: true,
            countMaxed: true,
            ramMaxed: true,
            ownedCount: 0,
            serverLimit: bitNodeCapabilities.cloud.limit ?? 0,
            maxRam: bitNodeCapabilities.cloud.maxRam ?? 0,
            minRam: 0,
            maxedCount: 0,
            totalRam: 0,
            nextAction: {
                type: "none",
                server: null,
                ram: 0,
                cost: 0,
                reason: bitNodeCapabilities.cloud.reason,
            },
            nextPurchaseCost: 0,
            nextUpgradeCost: 0,
            nextUpgradeRam: 0,
            nextActionAffordable: false,
            reason: bitNodeCapabilities.cloud.reason,
            bitNodeBlocked: true,
        };
    }

    if (!ns.cloud) {
        return {
            available: false,
            maxed: true,
            ownedCount: 0,
            serverLimit: 0,
            maxRam: 0,
            minRam: 0,
            maxedCount: 0,
            totalRam: 0,
            reason: "Cloud API unavailable.",
        };
    }

    try {
        const servers = ns.cloud.getServerNames();
        const serverLimit = ns.cloud.getServerLimit();
        const maxRam = ns.cloud.getRamLimit();
        const ramByServer = servers.map(name => ({
            name,
            ram: ns.getServerMaxRam(name),
        }));

        const ownedCount = servers.length;
        const minRam =
            ramByServer.length > 0
                ? Math.min(...ramByServer.map(server => server.ram))
                : 0;
        const totalRam =
            ramByServer.reduce((sum, server) => sum + server.ram, 0);
        const maxedCount =
            ramByServer.filter(server => server.ram >= maxRam).length;
        const weakestServer =
            ramByServer
                .slice()
                .sort((a, b) => a.ram - b.ram)[0] ?? null;

        const countMaxed = ownedCount >= serverLimit;
        const ramMaxed = countMaxed && maxedCount >= serverLimit;
        const maxed = countMaxed && ramMaxed;
        const nextAction = getNextCloudAction(ns, {
            countMaxed,
            ramMaxed,
            ownedCount,
            serverLimit,
            maxRam,
            weakestServer,
        });

        return {
            available: true,
            maxed,
            countMaxed,
            ramMaxed,
            ownedCount,
            serverLimit,
            maxRam,
            minRam,
            maxedCount,
            totalRam,
            weakestServer,
            nextAction,
            nextPurchaseCost:
                nextAction.type === "purchase"
                    ? nextAction.cost
                    : 0,
            nextUpgradeCost:
                nextAction.type === "upgrade"
                    ? nextAction.cost
                    : 0,
            nextUpgradeRam: nextAction.type === "upgrade" ? nextAction.ram : 0,
            nextActionAffordable:
                nextAction.cost > 0 &&
                ns.getPlayer().money >= nextAction.cost,
            reason: getCloudFleetReason({
                maxed,
                countMaxed,
                ramMaxed,
                ownedCount,
                serverLimit,
                minRam,
                maxRam,
                nextAction,
            }),
        };
    } catch (error) {
        return {
            available: false,
            maxed: true,
            ownedCount: 0,
            serverLimit: 0,
            maxRam: 0,
            minRam: 0,
            maxedCount: 0,
            totalRam: 0,
            reason: `Cloud fleet check failed: ${String(error)}`,
        };
    }
}

function getNextCloudAction(ns, status) {
    if (status.ramMaxed) {
        return {
            type: "none",
            server: null,
            ram: 0,
            cost: 0,
            reason: "Cloud fleet already maxed.",
        };
    }

    if (!status.countMaxed) {
        const ram = Math.min(
            Math.max(8, status.weakestServer?.ram ?? 8),
            status.maxRam
        );

        return {
            type: "purchase",
            server: null,
            ram,
            cost: safeGetServerCost(ns, ram),
            reason: `Next cloud action: buy another ${formatRam(ram)} server.`,
        };
    }

    const weakest = status.weakestServer;
    const ram = getNextRamTier(weakest?.ram ?? 0, status.maxRam);

    if (!weakest || ram <= weakest.ram) {
        return {
            type: "none",
            server: null,
            ram: 0,
            cost: 0,
            reason: "No cloud RAM upgrade target found.",
        };
    }

    return {
        type: "upgrade",
        server: weakest.name,
        ram,
        cost: safeGetServerUpgradeCost(ns, weakest.name, ram),
        reason: `Next cloud action: upgrade ${weakest.name} to ${formatRam(ram)}.`,
    };
}

function getNextRamTier(currentRam, maxRam) {
    const current = Math.max(0, Number(currentRam) || 0);
    const max = Math.max(0, Number(maxRam) || 0);

    if (max <= 0 || current >= max) return 0;
    if (current <= 0) return Math.min(8, max);

    return Math.min(current * 2, max);
}

function safeGetServerCost(ns, ram) {
    try {
        return ns.cloud.getServerCost(ram);
    } catch {
        return 0;
    }
}

function safeGetServerUpgradeCost(ns, server, ram) {
    try {
        return ns.cloud.getServerUpgradeCost(server, ram);
    } catch {
        return 0;
    }
}

function getCloudFleetReason(status) {
    if (status.maxed) {
        return `Cloud fleet maxed: ${status.ownedCount}/${status.serverLimit} servers at max RAM.`;
    }

    if (!status.countMaxed) {
        return (
            `Cloud fleet needs more servers: ${status.ownedCount}/${status.serverLimit}. ` +
            `${status.nextAction?.reason ?? ""}`
        ).trim();
    }

    if (!status.ramMaxed) {
        return (
            `Cloud fleet needs RAM upgrades: weakest ${formatRam(status.minRam)} / ` +
            `max ${formatRam(status.maxRam)}. ${status.nextAction?.reason ?? ""}`
        ).trim();
    }

    return "Cloud fleet status unknown.";
}

function formatRam(value) {
    const n = Number(value);

    if (!Number.isFinite(n) || n <= 0) return "0GB";
    if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)}PB`;
    if (n >= 1024) return `${(n / 1024).toFixed(2)}TB`;

    return `${n.toFixed(0)}GB`;
}
