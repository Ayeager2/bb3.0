export const STATE_FILE = "/data/daemon-state.txt";

export const hackScript = "/workers/h1.js";
export const growScript = "/workers/g1.js";
export const weakenScript = "/workers/w1.js";
export const SHARE_WORKER = "/workers/share-worker.js";

export const scriptsToCopy = [
    hackScript,
    growScript,
    weakenScript,

    "/workers/share-worker.js",

    "/workers/exp-weaken.js",
    "/workers/exp-grow.js",
];

export const defaultHackPercent = 0.10;
export const expHackPercent = 0.02;

export const batchSpacingMs = 250;
export const rescanIntervalMs = 10000;
export const homeReserveRam = 64;
export const maxBatchesPerCycle = 25;
export const cycleDelayMs = 1000;