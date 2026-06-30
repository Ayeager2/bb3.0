// /lib/corp/config.js

export const CORP_STATE_FILE = "/data/corp-state.txt";

export const CORP_CONFIG = {
    name: "Limitless",
    selfFund: false,
    agriculture: "Agriculture",
    tobacco: "Tobacco",
    mainCity: "Sector-12",
    cities: ["Sector-12", "Aevum", "Chongqing", "New Tokyo", "Ishima", "Volhaven"],
    expansionCities: ["Aevum", "Chongqing", "New Tokyo", "Ishima", "Volhaven"],
    materialProducts: ["Food", "Plants"],
    startupJobs: [
        ["Operations", 1],
        ["Engineer", 1],
        ["Business", 1],
    ],
    growthJobs: [
        ["Operations", 2],
        ["Engineer", 2],
        ["Business", 1],
        ["Management", 2],
        ["Research & Development", 2],
        ["Training", 0],
    ],
    agricultureStartupMaterials: [
        ["Hardware", 12.5, 1],
        ["AI Cores", 7.5, 1],
        ["Real Estate", 2700, 1],
    ],
    agricultureRound1Materials: [
        ["Robots", 9.6, 96],
        ["Hardware", 265.7, 2800],
        ["AI Cores", 244.5, 2520],
        ["Real Estate", 11940, 146400],
    ],
    agricultureRound2Materials: [
        ["Robots", 63, 726],
        ["Hardware", 650, 9300],
        ["AI Cores", 375, 6270],
        ["Real Estate", 8400, 230400],
    ],
    firstOffer: 210_000_000_000,
    secondOffer: 4_900_000_000_000,
    startupUpgradeTargets: [
        ["FocusWires", 2],
        ["Neural Accelerators", 2],
        ["Speech Processor Implants", 2],
        ["Nuoptimal Nootropic Injector Implants", 2],
        ["Smart Factories", 2],
    ],
    round1UpgradeTargets: [
        ["Smart Factories", 12],
        ["Smart Storage", 10],
    ],
    tobaccoUpgradeTargets: [
        ["Wilson Analytics", 14],
        ["FocusWires", 18],
        ["Neural Accelerators", 18],
        ["Speech Processor Implants", 18],
        ["Nuoptimal Nootropic Injector Implants", 18],
    ],
    tobaccoAdVerts: 83,
    tobaccoProductBaseSpend: 10_000_000_000,
};
