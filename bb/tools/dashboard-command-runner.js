// /tools/dashboard-command-runner.js

import { writeUiEvent } from "/lib/ui/event-log.js";
import { logPurchase } from "/lib/daemon/purchase-log.js";
import {
    describeStockLiquidation,
    liquidateAllStocks,
} from "/lib/daemon/stock-liquidation.js";

const COMMAND_FILE = "/data/ui/dashboard-command.txt";
const STATUS_FILE = "/data/ui/dashboard-command-status.txt";
const GANG_MODE_FILE = "/data/gang-mode.txt";
const GANG_TASK_OVERRIDE_FILE = "/data/gang-task-overrides.txt";
const GANG_ASCEND_REQUEST_FILE = "/data/gang-ascend-request.txt";
const HACKNET_CONTROL_FILE = "/data/hacknet-control.txt";
const CHARACTER_ACTION_OVERRIDE_FILE = "/data/character-action-override.txt";
const STOCK_CONTROL_FILE = "/data/stock-control.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 1000],
        ["heartbeat", 30000],
    ]);

    const refreshMs = Number(flags.refresh) || 1000;
    const heartbeatMs = Number(flags.heartbeat) || 30000;

    let lastCommandId = null;
    let lastHeartbeat = 0;

    writeStatus(ns, {
        running: true,
        status: "ready",
        message: "Dashboard command runner online.",
        lastHeartbeatAt: Date.now(),
    });

    writeUiEvent(ns, "command", "Dashboard command runner online.", {
        level: "success",
    });

    while (true) {
        const now = Date.now();

        if (now - lastHeartbeat >= heartbeatMs) {
            lastHeartbeat = now;

            writeStatus(ns, {
                running: true,
                status: "ready",
                message: "Dashboard command runner heartbeat.",
                lastHeartbeatAt: now,
            });
        }

        const command = readJson(ns, COMMAND_FILE, null);

        if (command?.id && command.id !== lastCommandId) {
            lastCommandId = command.id;
            await handleCommand(ns, command);
        }

        await ns.sleep(refreshMs);
    }
}

async function handleCommand(ns, command) {
    const name = command.command;

    writeStatus(ns, {
        running: true,
        status: "running",
        command: name,
        commandId: command.id,
        startedAt: Date.now(),
        message: `Running command: ${name}`,
    });

    writeUiEvent(ns, "command", `Received dashboard command: ${name}`, {
        level: "info",
    });

    try {
        if (name === "refreshTopology") {
            const pid = ns.run("/tools/network-topology-writer.js", 1, "--once");
            if (pid === 0) {
                fail(ns, command, "Failed to start topology refresh.");
                return;
            }

            complete(ns, command, "Triggered topology refresh.", "success");
            return;
        }

        if (name === "forceBackdoor") {
            const target = String(command.target ?? "").trim();
            if (!target) {
                fail(ns, command, "Force backdoor command missing target.");
                return;
            }

            const pid = ns.run("/tools/backdoor-route.js", 1, "--target", target, "--execute");
            if (pid === 0) {
                fail(ns, command, `Failed to start forced backdoor for ${target}.`);
                return;
            }

            complete(ns, command, `Forced backdoor route started for ${target}.`, "success");
            return;
        }

        if (name === "setGangMode") {
            const mode = normalizeGangMode(command.mode ?? command.target);
            if (!mode) {
                fail(ns, command, "Gang mode command missing valid mode.");
                return;
            }

            writeGangMode(ns, mode, command.id);

            if (mode !== "custom") {
                clearGangTaskOverrides(ns, command.id, mode);
            }

            complete(ns, command, `Gang mode switched to ${getGangModeLabel(mode)}.`, "success");
            return;
        }

        if (name === "setGangMemberTask") {
            const member = String(command.member ?? command.target ?? "").trim();
            const task = String(command.task ?? "").trim();

            if (!member) {
                fail(ns, command, "Gang task command missing member.");
                return;
            }

            const state = readJson(ns, GANG_TASK_OVERRIDE_FILE, {});
            const overrides = {
                ...(state?.overrides && typeof state.overrides === "object" ? state.overrides : {}),
            };

            if (task) {
                overrides[member] = task;
            } else {
                delete overrides[member];
            }

            ns.write(
                GANG_TASK_OVERRIDE_FILE,
                JSON.stringify(
                    {
                        updatedAt: Date.now(),
                        updatedAtText: new Date().toLocaleTimeString(),
                        source: "dashboard-command-runner",
                        overrides,
                        lastChange: {
                            member,
                            task: task || null,
                            commandId: command.id,
                        },
                    },
                    null,
                    2,
                ),
                "w",
            );

            if (task) {
                writeGangMode(ns, "custom", command.id);
                complete(ns, command, `${member} override set to ${task}; gang mode switched to Custom.`, "success");
            } else {
                complete(ns, command, `${member} override cleared.`, "warning");
            }
            return;
        }

        if (name === "ascendGangMember") {
            const member = String(command.member ?? command.target ?? "").trim();

            if (!member) {
                fail(ns, command, "Ascend command missing gang member.");
                return;
            }

            ns.write(
                GANG_ASCEND_REQUEST_FILE,
                JSON.stringify(
                    {
                        id: command.id,
                        updatedAt: Date.now(),
                        updatedAtText: new Date().toLocaleTimeString(),
                        source: "dashboard-command-runner",
                        member,
                    },
                    null,
                    2,
                ),
                "w",
            );

            complete(ns, command, `Ascend request queued for ${member}.`, "success");
            return;
        }

        if (name === "setHacknetProductionTarget") {
            const target = normalizeHacknetProductionTarget(command.productionTarget ?? command.target ?? command.mode);
            const purchaseBatch = normalizeHacknetPurchaseBatch(command.purchaseBatch ?? command.batch);

            if (!target) {
                fail(ns, command, "Hacknet production command missing valid target.");
                return;
            }

            ns.write(
                HACKNET_CONTROL_FILE,
                JSON.stringify(
                    {
                        updatedAt: Date.now(),
                        updatedAtText: new Date().toLocaleTimeString(),
                        source: "dashboard-command-runner",
                        productionTarget: target.value,
                        minProduction: target.value,
                        purchaseBatch,
                        mode: target.value > 0 ? "production-floor" : "unlimited",
                        label: target.label,
                        commandId: command.id,
                    },
                    null,
                    2,
                ),
                "w",
            );

            complete(ns, command, `Hacknet production target set to ${target.label}.`, "success");
            return;
        }

        if (name === "setCharacterAction") {
            const override = normalizeCharacterAction(command);

            if (!override) {
                fail(ns, command, "Character action command missing valid action details.");
                return;
            }

            ns.write(
                CHARACTER_ACTION_OVERRIDE_FILE,
                JSON.stringify(
                    {
                        schemaVersion: 1,
                        updatedAt: Date.now(),
                        updatedAtText: new Date().toLocaleTimeString(),
                        source: "dashboard-command-runner",
                        enabled: true,
                        commandId: command.id,
                        ...override,
                    },
                    null,
                    2,
                ),
                "w",
            );

            complete(ns, command, `Character override set: ${override.label}.`, "success");
            return;
        }

        if (name === "clearCharacterActionOverride") {
            ns.write(
                CHARACTER_ACTION_OVERRIDE_FILE,
                JSON.stringify(
                    {
                        schemaVersion: 1,
                        updatedAt: Date.now(),
                        updatedAtText: new Date().toLocaleTimeString(),
                        source: "dashboard-command-runner",
                        enabled: false,
                        mode: "daemon",
                        commandId: command.id,
                    },
                    null,
                    2,
                ),
                "w",
            );

            stopCurrentWork(ns);
            complete(ns, command, "Character override cleared; daemon automation may resume.", "warning");
            return;
        }

        if (name === "buyMaxNeuroFlux") {
            const faction = String(command.faction ?? command.target ?? "").trim();

            if (!faction) {
                fail(ns, command, "Buy NeuroFlux command missing faction.");
                return;
            }

            const result = buyMaxNeuroFlux(ns, faction);

            if (result.bought > 0) {
                complete(
                    ns,
                    command,
                    `Bought ${result.bought} NeuroFlux Governor level(s) from ${faction} for ${formatMoney(ns, result.spent)}.`,
                    "success",
                );
            } else {
                fail(ns, command, result.reason);
            }
            return;
        }

        if (name === "donateFactionRep") {
            const faction = String(command.faction ?? command.target ?? "").trim();
            const amount = normalizeDonationAmount(command.donationAmount ?? command.amount ?? command.mode, ns.getPlayer().money);

            if (!faction) {
                fail(ns, command, "Faction donation command missing faction.");
                return;
            }

            if (!Number.isFinite(amount) || amount <= 0) {
                fail(ns, command, "Faction donation command missing valid amount.");
                return;
            }

            const result = donateFactionRep(ns, faction, amount);

            if (result.donated) {
                complete(ns, command, `Donated ${formatMoney(ns, result.spent)} to ${faction} for reputation.`, "success");
            } else {
                fail(ns, command, result.reason);
            }
            return;
        }

        if (name === "startStockTrading") {
            ns.write(
                STOCK_CONTROL_FILE,
                JSON.stringify(
                    {
                        schemaVersion: 1,
                        updatedAt: Date.now(),
                        updatedAtText: new Date().toLocaleTimeString(),
                        source: "dashboard-command-runner",
                        enabled: true,
                        mode: "manual",
                        commandId: command.id,
                    },
                    null,
                    2,
                ),
                "w",
            );

            const running = ns.ps("home").some(process => process.filename === "/economy/stock-trader.js" || process.filename === "economy/stock-trader.js");

            if (!running) {
                const pid = ns.run("/economy/stock-trader.js", 1);
                if (pid === 0) {
                    fail(ns, command, "Stock trading override saved, but failed to start /economy/stock-trader.js.");
                    return;
                }
            }

            complete(ns, command, "Stock trading service enabled in manual dashboard mode.", "success");
            return;
        }

        if (name === "stopStockTrading") {
            ns.write(
                STOCK_CONTROL_FILE,
                JSON.stringify(
                    {
                        schemaVersion: 1,
                        updatedAt: Date.now(),
                        updatedAtText: new Date().toLocaleTimeString(),
                        source: "dashboard-command-runner",
                        enabled: false,
                        mode: "manual",
                        commandId: command.id,
                    },
                    null,
                    2,
                ),
                "w",
            );

            const liquidation = liquidateAllStocks(ns, "dashboard-stop-stock-trading");
            const processes = ns.ps("home")
                .filter(process => process.filename === "/economy/stock-trader.js" || process.filename === "economy/stock-trader.js");

            for (const process of processes) {
                ns.kill(process.pid);
            }

            const message = `${describeStockLiquidation(liquidation)} Stock trading service stopped.`;
            complete(ns, command, message, liquidation.errors.length > 0 ? "warning" : "success");
            return;
        }

        if (name === "startDarknetService") {
            if (!ns.fileExists("DarkscapeNavigator.exe", "home")) {
                fail(ns, command, "DarkscapeNavigator.exe is not owned yet. Let the darkweb buyer finish first.");
                return;
            }

            const service = "/tools/darknet-service.js";
            const worker = "/tools/darknet-worker.js";

            if (!ns.fileExists(service, "home") || !ns.fileExists(worker, "home")) {
                fail(ns, command, "Darknet service files are missing. Sync /tools/darknet-service.js and /tools/darknet-worker.js.");
                return;
            }

            const running = ns.ps("home").some(process => process.filename === service || process.filename === service.slice(1));
            if (running) {
                complete(ns, command, "Darknet service is already running.", "success");
                return;
            }

            const pid = ns.run(
                service,
                1,
                "--refresh", 60000,
                "--depth", 4,
                "--realloc", true,
                "--cache", true,
                "--phish", true,
                "--spread", true,
                "--stasis", false,
                "--migrate", false,
                "--freeze", false,
            );

            if (pid === 0) {
                fail(ns, command, "Failed to start /tools/darknet-service.js.");
                return;
            }

            complete(ns, command, `Darknet service started with pid ${pid}.`, "success");
            return;
        }

        if (name === "clearEvents") {
            ns.write("/data/ui/event-log.txt", "", "w");

            complete(ns, command, "Cleared event log.", "warning");
            return;
        }

        if (name === "eventTest") {
            complete(ns, command, "Dashboard command event test.", "success");
            return;
        }

        if (name === "debugSnapshot") {
            const pid = ns.run("/tools/dashboard-state-writer.js", 1, "--once");
            if (pid === 0) {
                fail(ns, command, "Failed to start dashboard state snapshot.");
                return;
            }

            complete(ns, command, "Triggered dashboard state snapshot.", "success");
            return;
        }

        fail(ns, command, `Unknown dashboard command: ${name}`);
    } catch (error) {
        fail(ns, command, String(error?.message ?? error));
    }
}

function donateFactionRep(ns, faction, amount) {
    if (!hasDonationApi(ns)) {
        return {
            donated: false,
            spent: 0,
            reason: "Faction donation API is unavailable.",
        };
    }

    const favor = safeFactionFavor(ns, faction);
    const favorToDonate = safeFavorToDonate(ns);

    if (Number.isFinite(favorToDonate) && Number.isFinite(favor) && favor < favorToDonate) {
        return {
            donated: false,
            spent: 0,
            reason: `${faction} needs ${formatNumber(ns, favorToDonate - favor)} more favor before donations unlock.`,
        };
    }

    const money = ns.getPlayer().money;
    const spend = Math.min(amount, money);

    if (spend <= 0) {
        return {
            donated: false,
            spent: 0,
            reason: "Not enough money to donate.",
        };
    }

    const repBefore = safeFactionRep(ns, faction);
    const moneyBefore = ns.getPlayer().money;
    const donated = safeDonateToFaction(ns, faction, spend);
    const moneyAfter = ns.getPlayer().money;
    const repAfter = safeFactionRep(ns, faction);
    const spent = Math.max(0, moneyBefore - moneyAfter);

    if (!donated) {
        return {
            donated: false,
            spent: 0,
            reason: `donateToFaction returned false for ${faction}.`,
        };
    }

    const message =
        `[DASHBOARD] Donated ${formatMoney(ns, spent || spend)} to ${faction} for ${formatNumber(ns, Math.max(0, repAfter - repBefore))} reputation.`;

    ns.tprint(message);
    ns.toast(message, "success", 8000);

    logPurchase(ns, {
        source: "dashboard-command-runner",
        type: "faction-donation",
        category: "factions",
        item: `${faction} reputation`,
        cost: spent || spend,
        moneyBefore,
        moneyAfter,
        message,
        details: {
            faction,
            repBefore,
            repAfter,
            repGain: Math.max(0, repAfter - repBefore),
            favor,
            favorToDonate,
        },
    });

    return {
        donated: true,
        spent: spent || spend,
        repGain: Math.max(0, repAfter - repBefore),
    };
}

function buyMaxNeuroFlux(ns, faction) {
    const augmentation = "NeuroFlux Governor";
    const maxPurchases = 500;

    if (!hasSingularity(ns)) {
        return {
            bought: 0,
            spent: 0,
            reason: "Singularity API is unavailable.",
        };
    }

    const available = getFactionAugmentations(ns, faction);

    if (!available.includes(augmentation)) {
        return {
            bought: 0,
            spent: 0,
            reason: `${faction} does not offer ${augmentation}.`,
        };
    }

    let bought = 0;
    let spent = 0;
    let lastReason = "Not enough money or faction reputation.";

    for (let i = 0; i < maxPurchases; i += 1) {
        const repReq = safeAugRepReq(ns, augmentation);
        const price = safeAugPrice(ns, augmentation);
        const factionRep = safeFactionRep(ns, faction);
        const money = ns.getPlayer().money;

        if (!Number.isFinite(repReq) || !Number.isFinite(price)) {
            lastReason = `Could not read live ${augmentation} price or reputation requirement.`;
            break;
        }

        if (factionRep < repReq) {
            lastReason = `Need ${formatNumber(ns, repReq - factionRep)} more ${faction} reputation for next ${augmentation}.`;
            break;
        }

        if (money < price) {
            lastReason = `Need ${formatMoney(ns, price - money)} more for next ${augmentation}.`;
            break;
        }

        const moneyBefore = ns.getPlayer().money;
        const purchased = safePurchaseAug(ns, faction, augmentation);
        const moneyAfter = ns.getPlayer().money;

        if (!purchased) {
            lastReason = `purchaseAugmentation returned false for ${augmentation} from ${faction}.`;
            break;
        }

        bought += 1;
        spent += Math.max(0, moneyBefore - moneyAfter);
    }

    if (bought > 0) {
        const message = `[DASHBOARD] Bought ${bought} ${augmentation} level(s) from ${faction} for ${formatMoney(ns, spent)}.`;

        ns.tprint(message);
        ns.toast(message, "success", 8000);

        logPurchase(ns, {
            source: "dashboard-command-runner",
            type: "augmentation",
            category: "augmentations",
            item: augmentation,
            cost: spent,
            moneyBefore: ns.getPlayer().money + spent,
            moneyAfter: ns.getPlayer().money,
            message,
            details: {
                faction,
                repeatable: true,
                count: bought,
                stopReason: lastReason,
            },
        });
    }

    return {
        bought,
        spent,
        reason: bought > 0 ? lastReason : `${faction}: ${lastReason}`,
    };
}

function hasDonationApi(ns) {
    return !!(
        ns.singularity &&
        typeof ns.singularity.donateToFaction === "function"
    );
}

function hasSingularity(ns) {
    return !!(
        ns.singularity &&
        typeof ns.singularity.purchaseAugmentation === "function" &&
        typeof ns.singularity.getAugmentationsFromFaction === "function"
    );
}

function safeDonateToFaction(ns, faction, amount) {
    try {
        return ns.singularity.donateToFaction(faction, amount);
    } catch {
        return false;
    }
}

function getFactionAugmentations(ns, faction) {
    try {
        return ns.singularity.getAugmentationsFromFaction(faction) ?? [];
    } catch {
        return [];
    }
}

function safePurchaseAug(ns, faction, augmentation) {
    try {
        return ns.singularity.purchaseAugmentation(faction, augmentation);
    } catch {
        return false;
    }
}

function safeAugPrice(ns, augmentation) {
    try {
        return ns.singularity.getAugmentationPrice(augmentation);
    } catch {
        return Infinity;
    }
}

function safeAugRepReq(ns, augmentation) {
    try {
        return ns.singularity.getAugmentationRepReq(augmentation);
    } catch {
        return Infinity;
    }
}

function safeFactionRep(ns, faction) {
    try {
        return ns.singularity.getFactionRep(faction);
    } catch {
        return 0;
    }
}

function safeFactionFavor(ns, faction) {
    try {
        return ns.singularity.getFactionFavor(faction);
    } catch {
        return NaN;
    }
}

function safeFavorToDonate(ns) {
    try {
        return ns.singularity.getFavorToDonate();
    } catch {
        return NaN;
    }
}

function normalizeDonationAmount(value, maxMoney) {
    const text = String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[$,\s]/g, "");

    if (!text) return NaN;
    if (["max", "all"].includes(text)) return Math.max(0, Number(maxMoney) || 0);

    const match = text.match(/^([0-9]*\.?[0-9]+)([kmbtq])?$/);
    if (!match) return NaN;

    const base = Number(match[1]);
    const suffix = match[2] ?? "";
    const multiplier = {
        k: 1_000,
        m: 1_000_000,
        b: 1_000_000_000,
        t: 1_000_000_000_000,
        q: 1_000_000_000_000_000,
    }[suffix] ?? 1;

    return Math.floor(base * multiplier);
}

function normalizeCharacterAction(command) {
    const action = normalizeCharacterActionName(command.action ?? command.mode ?? command.target);
    const focus = normalizeBoolean(command.focus, false);

    if (action === "study") {
        const course = String(command.course ?? command.target ?? "Algorithms").trim() || "Algorithms";
        const university = String(command.university ?? "Rothman University").trim() || "Rothman University";
        const city = String(command.city ?? "Sector-12").trim() || "Sector-12";

        return {
            action,
            label: `Study ${course}`,
            course,
            university,
            city,
            focus,
        };
    }

    if (action === "crime") {
        const crime = String(command.crime ?? command.target ?? "Mug").trim() || "Mug";

        return {
            action,
            label: `Commit ${crime}`,
            crime,
            city: String(command.city ?? "Sector-12").trim() || "Sector-12",
            location: "The Slums",
            focus,
        };
    }

    if (action === "faction") {
        const faction = String(command.faction ?? command.target ?? "").trim();
        const workType = normalizeFactionWorkType(command.workType ?? command.task ?? command.mode);

        if (!faction || !workType) return null;

        return {
            action,
            label: `${getFactionWorkLabel(workType)} for ${faction}`,
            faction,
            workType,
            focus,
        };
    }

    if (action === "gym") {
        const stat = normalizeGymStat(command.stat ?? command.target ?? "strength");
        const gym = String(command.gym ?? "Powerhouse Gym").trim() || "Powerhouse Gym";
        const city = String(command.city ?? "Sector-12").trim() || "Sector-12";

        return {
            action,
            label: `Train ${stat}`,
            stat,
            gym,
            city,
            focus,
        };
    }

    return null;
}

function normalizeCharacterActionName(value) {
    const text = String(value ?? "").trim().toLowerCase();

    if (["study", "class", "course", "university"].includes(text)) return "study";
    if (["crime", "crimes", "slums"].includes(text)) return "crime";
    if (["faction", "faction-work", "work"].includes(text)) return "faction";
    if (["gym", "train", "workout"].includes(text)) return "gym";

    return null;
}

function normalizeFactionWorkType(value) {
    const text = String(value ?? "").trim().toLowerCase();

    if (text.includes("hack")) return "hacking";
    if (text.includes("field")) return "field";
    if (text.includes("security")) return "security";

    return null;
}

function getFactionWorkLabel(workType) {
    if (workType === "hacking") return "Hacking contracts";
    if (workType === "field") return "Field work";
    if (workType === "security") return "Security work";
    return workType;
}

function normalizeGymStat(value) {
    const text = String(value ?? "").trim().toLowerCase();

    if (["str", "strength"].includes(text)) return "strength";
    if (["def", "defense"].includes(text)) return "defense";
    if (["dex", "dexterity"].includes(text)) return "dexterity";
    if (["agi", "agility"].includes(text)) return "agility";

    return "strength";
}

function normalizeBoolean(value, fallback = false) {
    if (value === true || value === "true" || value === "1" || value === 1) return true;
    if (value === false || value === "false" || value === "0" || value === 0) return false;
    return fallback;
}

function formatMoney(ns, value) {
    try {
        return `$${ns.format.number(value)}`;
    } catch {
        return `$${Number(value || 0).toFixed(0)}`;
    }
}

function formatNumber(ns, value) {
    try {
        return ns.format.number(value);
    } catch {
        return `${Number(value || 0).toFixed(0)}`;
    }
}

function normalizeGangMode(mode) {
    const text = String(mode ?? "")
        .trim()
        .toLowerCase();

    if (["old", "oldlogic", "old-logic", "legacy"].includes(text)) return "old-logic";
    if (["balanced", "current", "train", "training"].includes(text)) return "balanced";
    if (["money", "money-only", "pure-money", "cash"].includes(text)) return "money-only";
    if (["combat", "combat-train", "combat-train-only", "train-combat", "train-combat-only"].includes(text)) return "combat-train-only";
    if (["custom", "manual", "override", "overrides"].includes(text)) return "custom";
    return null;
}

function normalizeHacknetProductionTarget(value) {
    const text = String(value ?? "")
        .trim()
        .toLowerCase();

    if (!text || ["unlimited", "unlimit", "none", "off", "0"].includes(text)) {
        return {
            value: 0,
            label: "Unlimited",
        };
    }

    const shortcuts = {
        "100k": 100_000,
        100000: 100_000,
        "200k": 200_000,
        200000: 200_000,
        "500k": 500_000,
        500000: 500_000,
        "1m": 1_000_000,
        "1000k": 1_000_000,
        1000000: 1_000_000,
    };

    const valueNumber = shortcuts[text] ?? Number(text.replace(/,/g, ""));

    if (!Number.isFinite(valueNumber) || valueNumber < 0) return null;

    return {
        value: Math.floor(valueNumber),
        label: `${formatCompactNumber(valueNumber)} / sec`,
    };
}

function normalizeHacknetPurchaseBatch(value) {
    const n = Number(String(value ?? "").replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) return 10;
    return Math.max(1, Math.min(1000, Math.floor(n)));
}

function formatCompactNumber(value) {
    const n = Number(value) || 0;
    if (n >= 1_000_000) return `${n / 1_000_000}m`;
    if (n >= 1_000) return `${n / 1_000}k`;
    return `${n}`;
}

function getGangModeLabel(mode) {
    if (mode === "old-logic") return "Old Logic";
    if (mode === "money-only") return "Money Only";
    if (mode === "combat-train-only") return "Combat Train Only";
    if (mode === "custom") return "Custom";
    return "Balanced";
}

function writeGangMode(ns, mode, commandId) {
    ns.write(
        GANG_MODE_FILE,
        JSON.stringify(
            {
                updatedAt: Date.now(),
                updatedAtText: new Date().toLocaleTimeString(),
                source: "dashboard-command-runner",
                mode,
                label: getGangModeLabel(mode),
                commandId,
            },
            null,
            2,
        ),
        "w",
    );
}

function clearGangTaskOverrides(ns, commandId, mode) {
    ns.write(
        GANG_TASK_OVERRIDE_FILE,
        JSON.stringify(
            {
                updatedAt: Date.now(),
                updatedAtText: new Date().toLocaleTimeString(),
                source: "dashboard-command-runner",
                overrides: {},
                lastChange: {
                    member: null,
                    task: null,
                    commandId,
                    reason: `Cleared manual overrides for ${getGangModeLabel(mode)} mode.`,
                },
            },
            null,
            2,
        ),
        "w",
    );
}

function stopCurrentWork(ns) {
    try {
        return ns.singularity.stopAction();
    } catch {
        // Try alternate API below.
    }

    try {
        return ns.singularity.stopWork();
    } catch {
        return false;
    }
}

function complete(ns, command, message, level = "success") {
    writeStatus(ns, {
        running: true,
        status: "success",
        command: command.command,
        commandId: command.id,
        completedAt: Date.now(),
        message,
    });

    writeUiEvent(ns, "command", message, { level });
}

function fail(ns, command, message) {
    writeStatus(ns, {
        running: true,
        status: "error",
        command: command.command,
        commandId: command.id,
        completedAt: Date.now(),
        message,
    });

    writeUiEvent(ns, "command", message, {
        level: "danger",
    });
}

function writeStatus(ns, patch) {
    const previous = readJson(ns, STATUS_FILE, {});

    const next = {
        schemaVersion: 1,
        updatedAt: Date.now(),
        ...previous,
        ...patch,
    };

    ns.write(STATUS_FILE, JSON.stringify(next, null, 2), "w");
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
