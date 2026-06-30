///lib/uhm/config.js
export const STATE_FILE = "/data/daemon-state.txt";

export const hackScript = "/workers/h1.js";
export const growScript = "/workers/g1.js";
export const weakenScript = "/workers/w1.js";
export const SHARE_WORKER = "/workers/share-worker.js";
export const expHackScript = "/workers/exp-hack.js";
export const expGrowScript = "/workers/exp-grow.js";
export const expWeakenScript = "/workers/exp-weaken.js";

export const scriptsToCopy = [
    hackScript,
    growScript,
    weakenScript,

    "/workers/share-worker.js",

    expHackScript,
    expWeakenScript,
    expGrowScript,
];

export const defaultHackPercent = 0.01;

export const batchSpacingMs = 250;
export const rescanIntervalMs = 10000;
export const homeReserveRam = 64;
export const maxBatchesPerCycle = 25;
export const cycleDelayMs = 1000;

export const maxWorkerThreadsPerProcess = 256;
export const maxLevelingWorkerThreadsPerProcess = 65536;
export const maxLevelingBatchesPerCycle = 500;
export const maxLevelingActiveProcesses = 8000;
export const maxPrepThreadsPerProcess = 256;
export const maxExpThreadsPerProcess = 256;
