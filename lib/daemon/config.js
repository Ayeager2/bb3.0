export const STATE_FILE = "/data/daemon-state.txt";

export const CONFIG = {
    refreshMs: 10000,
    decisionRefreshMs: 5000,
    scanRefreshMs: 60000,

    minReserveMoney: 1_000_000_000,
    midReserveMoney: 5_000_000_000,
    highReserveMoney: 25_000_000_000,

    expUntilHackingLevel: 2500,
    moneyUntilAmount: 5_000_000_000,

    maxPrepNeedForMoneyTarget: 0.85,
    maxSecurityDiffForMoneyTarget: 15,
    maxWeakenTimeForMoneyTargetMs: 10 * 60 * 1000,
    prepModeNeedThreshold: 1.50,
    prepTargetMaxWeakenTimeMs: 8 * 60 * 1000,

    protoBatching: {
        enabled: true,
        fastScriptCopy: true,
        workerScripts: ["/workers/h1.js", "/workers/g1.js", "/workers/w1.js"],
        copyRetryMs: 2000,
        rescanIntervalMs: 10000,
        cycleDelayMs: 100,
    },

    multiTargetPolicy: {
        enabled: true,
        primaryMoneyRamPercent: 0.60,
        secondaryMoneyRamPercent: 0.30,
        expRamPercent: 0.10,
        minBatchesPerLane: 1,
        showSkippedLanes: true,
    },

    bn4Plan: {
        targetBitNode: 4,
        goal: "Unlock Source-File 4",
        minHackingLevel: 2500,
        minMoney: 100_000_000_000,
        desiredAugmentCount: 30,
        desiredHomeRamGb: 1024,
    },

    sellHashes: {
        enabled: true,
        upgradeName: "Sell for Money",
        reserveHashes: 0,
        minHashesToSpend: 4,
        maxSpendsPerCycle: 25,
    },
};