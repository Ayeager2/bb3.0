import fs from "fs";
import path from "path";
import express from "express";
import { WebSocketServer } from "ws";

const REMOTE_API_PORT = 12525;
const DASHBOARD_HTTP_PORT = 31337;

const BITBURNER_STATE_FILE = "/data/ui/dashboard-state.txt";
const OUT_DIR = path.resolve("./public");
const OUT_FILE = path.join(OUT_DIR, "dashboard-state.json");

const BITBURNER_EVENT_FILE = "/data/ui/event-log.txt";
const OUT_EVENT_FILE = path.join(OUT_DIR, "event-log.json");
const BITBURNER_TOPOLOGY_FILE = "/data/ui/network-topology.txt";
const OUT_TOPOLOGY_FILE = path.join(OUT_DIR, "network-topology.json");
const BITBURNER_COMMAND_FILE = "/data/ui/dashboard-command.txt";
const BITBURNER_COMMAND_STATUS_FILE = "/data/ui/dashboard-command-status.txt";
const OUT_COMMAND_STATUS_FILE = path.join(OUT_DIR, "dashboard-command-status.json");
const BITBURNER_REASONING_FILE = "/data/ui/daemon-reasoning.txt";
const OUT_REASONING_FILE = path.join(OUT_DIR, "daemon-reasoning.json");

fs.mkdirSync(OUT_DIR, { recursive: true });

let bitburnerSocket = null;
let rpcId = 1;
const pending = new Map();

const app = express();

let testMode = false;

app.use(express.json());

app.post("/command", async (req, res) => {
    if (!bitburnerSocket) {
        return res.status(503).json({ ok: false, error: "Bitburner not connected." });
    }

    const command = String(req.body?.command ?? "");
    const allowed = new Set([
        "refreshTopology",
        "clearEvents",
        "debugSnapshot",
        "eventTest",
    ]);

    if (!allowed.has(command)) {
        return res.status(400).json({ ok: false, error: `Command not allowed: ${command}` });
    }

    const payload = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: Date.now(),
        command,
    };

    try {
        await rpc("pushFile", {
            filename: BITBURNER_COMMAND_FILE,
            server: "home",
            content: JSON.stringify(payload, null, 2),
        });

        res.json({ ok: true, command, payload });
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: String(error?.message ?? error),
        });
    }
});

app.get("/command/status", (_req, res) => {
    try {
        const raw = fs.readFileSync(OUT_COMMAND_STATUS_FILE, "utf8");
        res.setHeader("Cache-Control", "no-store");
        res.type("json").send(raw);
    } catch {
        res.json({
            running: false,
            status: "unknown",
            message: "No command status written yet.",
        });
    }
});

app.use(express.static(OUT_DIR));

app.get("/state", (_req, res) => {
    try {
        const raw = fs.readFileSync(OUT_FILE, "utf8");
        const parsed = JSON.parse(raw);

        parsed.servedFrom = OUT_FILE;
        parsed.servedAt = new Date().toLocaleTimeString();

        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        res.json(parsed);
    } catch {
        res.status(404).json({ error: "No dashboard state written yet." });
    }
});

app.get("/events", (_req, res) => {
    try {
        const raw = fs.readFileSync(OUT_EVENT_FILE, "utf8");
        res.type("json").send(raw);
    } catch {
        res.json([]);
    }
});

app.get("/topology", (_req, res) => {
    try {
        const raw = fs.readFileSync(OUT_TOPOLOGY_FILE, "utf8");
        res.setHeader("Cache-Control", "no-store");
        res.type("json").send(raw);
    } catch {
        res.json({ nodes: [], edges: [] });
    }
});

app.get("/reasoning", (_req, res) => {
    try {
        const raw = fs.readFileSync(OUT_REASONING_FILE, "utf8");
        res.setHeader("Cache-Control", "no-store");
        res.type("json").send(raw);
    } catch {
        res.json({
            schemaVersion: 1,
            updatedAt: Date.now(),
            summary: "No daemon reasoning available yet.",
            items: [],
        });
    }
});

app.listen(DASHBOARD_HTTP_PORT, () => {
    console.log(`[DASHBOARD] http://localhost:${DASHBOARD_HTTP_PORT}`);
});

app.get("/test-theme/:accent", (req, res) => {
    testMode = true;
    const accent = req.params.accent;

    const fake = {
        schemaVersion: 2,
        updatedAt: Date.now(),
        daemonUpdatedAt: Date.now(),
        bitnode: {
            number: 4,
            name: "The Singularity",
            strategy: "theme-test",
        },
        progression: {
            phase: accent,
            mode: accent,
            priority: accent,
            posture: "THEME_TEST",
            nextAction: `Testing theme: ${accent}`,
        },
        daemon: {
            target: "theme-test-target",
            status: "running",
        },
        player: {
            money: 123456789,
            hacking: 777,
        },
        target: {
            name: "theme-test-target",
            maxMoney: 100000000,
            money: 75000000,
            moneyPercent: 0.75,
            minSecurity: 5,
            security: 5.2,
            securityDiff: 0.2,
            weakenTime: 5000,
            prepNeed: 0.25,
        },
        policy: {
            reserveMoney: 1000000,
            allowServerPurchases: true,
            allowStockTrading: accent.includes("money"),
            allowHacknet: true,
            allowHomeRam: true,
            allowExePurchases: true,
            allowAugmentPurchases: accent.includes("faction"),
            allowReset: accent.includes("reset"),
            allowIntTravel: false,
        },
        servers: {
            rootedCount: 99,
            purchasedCount: 25,
            cloudCount: 25,
        },
        readiness: {
            goal: "Theme test",
            ready: accent.includes("reset"),
            readyCount: accent.includes("reset") ? 4 : 2,
            totalChecks: 4,
            hackingReady: true,
            moneyReady: true,
            homeRamReady: true,
            augReady: accent.includes("reset"),
            hacking: 777,
            hackingTarget: 1000,
            money: 123456789,
            moneyTarget: 1000000000,
            augmentCount: 12,
            augmentTarget: 30,
        },
        victory: {
            stage: accent,
            nextAction: `Testing ${accent}`,
            hackingTarget: 3000,
            hasDaedalus: accent.includes("singularity"),
            hasRedPill: accent.includes("singularity"),
            worldDaemon: "w0r1d_d43m0n",
            canUseWorldDaemon: accent.includes("reset"),
        },
        capabilities: {
            singularity: true,
            stocks: accent.includes("money"),
            gangs: accent.includes("gang"),
            corporation: accent.includes("corp"),
            bladeburner: false,
            sleeves: false,
            hacknet: true,
            stanek: false,
        },
        share: {
            enabled: accent.includes("faction"),
            aggressive: false,
            reserveRamPercent: 0.25,
        },
        lanes: {
            multiTargetEnabled: true,
            primaryMoneyRamPercent: 0.45,
            secondaryMoneyRamPercent: 0.2,
            expRamPercent: 0.35,
            adaptive: true,
            reason: `Theme test lane policy: ${accent}`,
        },
        widgets: {
            visible: [
                "daemonHeader",
                "coreState",
                "targetIntel",
                "playerStats",
                "policy",
                "serverSummary",
                "laneAllocation",
            ],
            emphasized: ["targetIntel"],
            hidden: [],
        },
        theme: {
            base: "dark_tactical",
            accent,
            dangerLevel: accent.includes("danger") || accent.includes("reset") ? "high" : "normal",
        },

    };

    fs.writeFileSync(OUT_FILE, JSON.stringify(fake, null, 2));
    res.json(fake);
});

app.get("/live", async (_req, res) => {
    testMode = false;
    await pollDashboardState();
    res.json({ ok: true, mode: "live" });
});



const wss = new WebSocketServer({ port: REMOTE_API_PORT });

wss.on("connection", socket => {
    console.log("[BITBURNER] Connected");
    bitburnerSocket = socket;

    socket.on("message", raw => {
        let msg;

        try {
            msg = JSON.parse(String(raw));
        } catch {
            return;
        }

        if (msg.id && pending.has(msg.id)) {
            const { resolve, reject } = pending.get(msg.id);
            pending.delete(msg.id);

            if (msg.error) reject(msg.error);
            else resolve(msg.result);
        }
    });

    socket.on("close", () => {
        console.log("[BITBURNER] Disconnected");
        bitburnerSocket = null;
    });
});

async function pollCommandStatus() {
    if (!bitburnerSocket) return;

    try {
        const content = await rpc("getFile", {
            filename: BITBURNER_COMMAND_STATUS_FILE,
            server: "home"
        });

        const parsed = JSON.parse(content || "{}");
        parsed.bridgeUpdatedAt = Date.now();

        fs.writeFileSync(OUT_COMMAND_STATUS_FILE, JSON.stringify(parsed, null, 2));
    } catch {
        fs.writeFileSync(
            OUT_COMMAND_STATUS_FILE,
            JSON.stringify({
                running: false,
                status: "unavailable",
                message: "Could not read command runner status.",
                bridgeUpdatedAt: Date.now(),
            }, null, 2)
        );
    }
}

function rpc(method, params) {
    if (!bitburnerSocket || bitburnerSocket.readyState !== bitburnerSocket.OPEN) {
        return Promise.reject(new Error("Bitburner is not connected."));
    }

    const id = rpcId++;

    bitburnerSocket.send(JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params
    }));

    return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });

        setTimeout(() => {
            if (!pending.has(id)) return;
            pending.delete(id);
            reject(new Error(`RPC timeout: ${method}`));
        }, 5000);
    });
}

async function pollDashboardState() {
    if (testMode) return;
    if (!bitburnerSocket) return;

    try {
        const content = await rpc("getFile", {
            filename: BITBURNER_STATE_FILE,
            server: "home"
        });

        const parsed = JSON.parse(content);

        parsed.bridgeUpdatedAt = Date.now();
        parsed.bridgeUpdatedAtText = new Date().toLocaleTimeString();

        console.log("[DEBUG] Writing OUT_FILE:", OUT_FILE);
        console.log("[DEBUG] Bridge time:", parsed.bridgeUpdatedAtText);

        fs.writeFileSync(OUT_FILE, JSON.stringify(parsed, null, 2));

        console.log(
            `[STATE] ${new Date().toLocaleTimeString()} ` +
            `BN${parsed?.bitnode?.number ?? "?"} ` +
            `${parsed?.progression?.mode ?? "?"} ` +
            `${parsed?.daemon?.target ?? "no-target"}`
        );
    } catch (error) {
        console.log(`[STATE] ${String(error?.message ?? error)}`);
    }
}

async function pollEventLog() {
    if (!bitburnerSocket) return;

    try {
        const content = await rpc("getFile", {
            filename: BITBURNER_EVENT_FILE,
            server: "home"
        });

        const events = String(content || "")
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => JSON.parse(line));

        fs.writeFileSync(OUT_EVENT_FILE, JSON.stringify(events, null, 2));
    } catch {
        fs.writeFileSync(OUT_EVENT_FILE, JSON.stringify([], null, 2));
    }
}

async function pollNetworkTopology() {
    if (!bitburnerSocket) return;

    try {
        const content = await rpc("getFile", {
            filename: BITBURNER_TOPOLOGY_FILE,
            server: "home"
        });

        const parsed = JSON.parse(content || "{}");
        parsed.bridgeUpdatedAt = Date.now();

        fs.writeFileSync(OUT_TOPOLOGY_FILE, JSON.stringify(parsed, null, 2));
    } catch {
        fs.writeFileSync(
            OUT_TOPOLOGY_FILE,
            JSON.stringify({ nodes: [], edges: [] }, null, 2)
        );
    }
}

async function pollDaemonReasoning() {
    if (!bitburnerSocket) return;

    try {
        const content = await rpc("getFile", {
            filename: BITBURNER_REASONING_FILE,
            server: "home"
        });

        const parsed = JSON.parse(content || "{}");
        parsed.bridgeUpdatedAt = Date.now();

        fs.writeFileSync(OUT_REASONING_FILE, JSON.stringify(parsed, null, 2));
    } catch {
        fs.writeFileSync(
            OUT_REASONING_FILE,
            JSON.stringify({
                schemaVersion: 1,
                updatedAt: Date.now(),
                summary: "Could not read daemon reasoning.",
                items: [],
                bridgeUpdatedAt: Date.now(),
            }, null, 2)
        );
    }
}

setInterval(pollDashboardState, 3000);
setInterval(pollEventLog, 3000);
setInterval(pollNetworkTopology, 10000);
setInterval(pollCommandStatus, 3000);
setInterval(pollDaemonReasoning, 5000);

console.log(`[REMOTE API] Waiting for Bitburner on ws://localhost:${REMOTE_API_PORT}`);