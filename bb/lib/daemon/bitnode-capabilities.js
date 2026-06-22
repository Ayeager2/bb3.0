export function getBitNodeCapabilities(ns) {
    const bitNode =
        getCurrentBitNode(ns);
    const cloud =
        getCloudServerCapability(ns, bitNode);
    const hacknet =
        getHacknetCapability(ns, bitNode);

    return {
        bitNode,
        roadmap: getRoadmap(bitNode),
        cloud,
        hacknet,
        services: {
            serverPurchaser: cloud.allowed,
            hacknetBuyer: hacknet.allowed,
            hacknetHashSpender: hacknet.hashes,
        },
        reasons: [
            cloud.reason,
            hacknet.reason,
        ].filter(Boolean),
    };
}

function getCurrentBitNode(ns) {
    try {
        return ns.getResetInfo()?.currentNode ?? 1;
    } catch {
        return 1;
    }
}

function getRoadmap(bitNode) {
    const roadmaps = {
        1: "standard-growth",
        2: "crime-gang",
        3: "corporation",
        4: "singularity",
        5: "intelligence",
        6: "bladeburner",
        7: "bladeburner-singularity",
        8: "stock-market",
        9: "hacknet",
        10: "sleeves",
        11: "company",
        12: "challenge-repeat",
        13: "stanek",
        14: "go",
    };

    return roadmaps[bitNode] ?? "unknown";
}

function getCloudServerCapability(ns, bitNode) {
    if (bitNode === 9) {
        return {
            allowed: false,
            reason: "BN9 Hacktocracy does not allow additional cloud/purchased servers.",
            source: "bitnode-rule",
        };
    }

    if (!ns.cloud) {
        return {
            allowed: false,
            reason: "Cloud API unavailable.",
            source: "api",
        };
    }

    try {
        const limit =
            ns.cloud.getServerLimit();

        return {
            allowed: limit > 0,
            limit,
            maxRam: ns.cloud.getRamLimit(),
            reason:
                limit > 0
                    ? "Cloud servers are available."
                    : "Cloud server limit is 0 in this BitNode.",
            source: "api",
        };
    } catch (error) {
        return {
            allowed: false,
            reason: `Cloud capability check failed: ${String(error)}`,
            source: "api-error",
        };
    }
}

function getHacknetCapability(ns, bitNode) {
    if (!ns.hacknet) {
        return {
            allowed: false,
            hashes: false,
            primary: false,
            reason: "Hacknet API unavailable.",
            source: "api",
        };
    }

    return {
        allowed: true,
        hashes: bitNode === 9 || hasHacknetHashes(ns),
        primary: bitNode === 9,
        useAsExecutionHosts: bitNode !== 9,
        reason:
            bitNode === 9
                ? "BN9 Hacktocracy: Hacknet servers and hashes are the primary economy path."
                : "Hacknet is available as a supporting economy system.",
        source: bitNode === 9 ? "bitnode-rule" : "api",
    };
}

function hasHacknetHashes(ns) {
    try {
        ns.hacknet.numHashes();
        ns.hacknet.hashCapacity();
        return true;
    } catch {
        return false;
    }
}
