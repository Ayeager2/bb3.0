// /tools/dashboard-command-runner.js

import { writeUiEvent } from "/lib/ui/event-log.js";

const COMMAND_FILE = "/data/ui/dashboard-command.txt";
const STATUS_FILE = "/data/ui/dashboard-command-status.txt";

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
