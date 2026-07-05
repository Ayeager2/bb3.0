// /tools/dashboard-command-runner.js

import { writeUiEvent } from "/lib/ui/event-log.js";

const COMMAND_FILE = "/data/ui/dashboard-command.txt";
const STATUS_FILE = "/data/ui/dashboard-command-status.txt";
const GANG_MODE_FILE = "/data/gang-mode.txt";
const GANG_TASK_OVERRIDE_FILE = "/data/gang-task-overrides.txt";
const GANG_ASCEND_REQUEST_FILE = "/data/gang-ascend-request.txt";

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

            ns.write(GANG_MODE_FILE, JSON.stringify({
                updatedAt: Date.now(),
                updatedAtText: new Date().toLocaleTimeString(),
                source: "dashboard-command-runner",
                mode,
                label: getGangModeLabel(mode),
                commandId: command.id,
            }, null, 2), "w");

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

            ns.write(GANG_TASK_OVERRIDE_FILE, JSON.stringify({
                updatedAt: Date.now(),
                updatedAtText: new Date().toLocaleTimeString(),
                source: "dashboard-command-runner",
                overrides,
                lastChange: {
                    member,
                    task: task || null,
                    commandId: command.id,
                },
            }, null, 2), "w");

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

            ns.write(GANG_ASCEND_REQUEST_FILE, JSON.stringify({
                id: command.id,
                updatedAt: Date.now(),
                updatedAtText: new Date().toLocaleTimeString(),
                source: "dashboard-command-runner",
                member,
            }, null, 2), "w");

            complete(ns, command, `Ascend request queued for ${member}.`, "success");
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

function normalizeGangMode(mode) {
    const text = String(mode ?? "").trim().toLowerCase();

    if (["old", "oldlogic", "old-logic", "legacy"].includes(text)) return "old-logic";
    if (["balanced", "current", "train", "training"].includes(text)) return "balanced";
    if (["money", "money-only", "pure-money", "cash"].includes(text)) return "money-only";
    if (["combat", "combat-train", "combat-train-only", "train-combat", "train-combat-only"].includes(text)) return "combat-train-only";
    if (["custom", "manual", "override", "overrides"].includes(text)) return "custom";
    return null;
}

function getGangModeLabel(mode) {
    if (mode === "old-logic") return "Old Logic";
    if (mode === "money-only") return "Money Only";
    if (mode === "combat-train-only") return "Combat Train Only";
    if (mode === "custom") return "Custom";
    return "Balanced";
}

function writeGangMode(ns, mode, commandId) {
    ns.write(GANG_MODE_FILE, JSON.stringify({
        updatedAt: Date.now(),
        updatedAtText: new Date().toLocaleTimeString(),
        source: "dashboard-command-runner",
        mode,
        label: getGangModeLabel(mode),
        commandId,
    }, null, 2), "w");
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
