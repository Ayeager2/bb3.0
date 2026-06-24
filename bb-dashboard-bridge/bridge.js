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
const BITBURNER_REASONING_HISTORY_FILE = "/data/ui/daemon-reasoning-history.txt";
const OUT_REASONING_HISTORY_FILE = path.join(OUT_DIR, "daemon-reasoning-history.json");
const BITBURNER_STOCK_TRADER_FILE = "/data/stock-trader-state.txt";
const OUT_STOCK_TRADER_FILE = path.join(OUT_DIR, "stock-trader-state.json");
const BITBURNER_HACKNET_FILE = "/data/hacknet-state.txt";
const OUT_HACKNET_FILE = path.join(OUT_DIR, "hacknet-state.json");
const BITBURNER_HASH_SPENDER_FILE = "/data/hacknet-hash-spender-state.txt";
const OUT_HASH_SPENDER_FILE = path.join(OUT_DIR, "hacknet-hash-spender-state.json");
const BITBURNER_PURCHASE_LOG_FILE = "/data/purchases.log.txt";
const BITBURNER_PURCHASE_LEDGER_FILE = "/data/purchase-ledger.txt";
const OUT_PURCHASE_LOG_FILE = path.join(OUT_DIR, "purchase-log.json");
const BITBURNER_AUGMENTATION_STATE_FILE = "/data/augmentation-state.txt";
const OUT_AUGMENTATION_STATE_FILE = path.join(OUT_DIR, "augmentation-state.json");
const BITBURNER_AUGMENTATION_PLAN_FILE = "/data/augmentation-plan.txt";
const OUT_AUGMENTATION_PLAN_FILE = path.join(OUT_DIR, "augmentation-plan.json");
const BITBURNER_AUGMENTATION_BUYER_FILE = "/data/augmentation-buyer-state.txt";
const OUT_AUGMENTATION_BUYER_FILE = path.join(OUT_DIR, "augmentation-buyer-state.json");
const BITBURNER_FACTION_WORK_PLAN_FILE = "/data/faction-work-plan.txt";
const OUT_FACTION_WORK_PLAN_FILE = path.join(OUT_DIR, "faction-work-plan.json");
const BITBURNER_FACTION_STATE_FILE = "/data/faction-state.txt";
const OUT_FACTION_STATE_FILE = path.join(OUT_DIR, "faction-state.json");

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

app.get("/state", async (_req, res) => {
    try {
        await pollEconomyTelemetry();
        await pollDashboardState();

        const raw = fs.readFileSync(OUT_FILE, "utf8");
        const parsed = normalizeDashboardState(JSON.parse(raw));

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

app.get("/reasoning/history", (_req, res) => {
    try {
        const raw = fs.readFileSync(OUT_REASONING_HISTORY_FILE, "utf8");
        res.setHeader("Cache-Control", "no-store");
        res.type("json").send(raw);
    } catch {
        res.json([]);
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

        const parsed = normalizeDashboardState(JSON.parse(content));

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

function normalizeDashboardState(state = {}) {
    const plan =
        state?.targetAnalysis?.plan ??
        state?.strategicTargetPlan ??
        state?.targetPlan ??
        state?.controller?.strategicTargetPlan ??
        {};

    const target = state?.target?.name ?? state?.daemon?.target ?? plan?.target ?? null;

    const economy = {
        ...(state.economy ?? {}),
        stockTrader: readLocalJson(OUT_STOCK_TRADER_FILE, null),
        hacknet: readLocalJson(OUT_HACKNET_FILE, null),
        hashSpender: readLocalJson(OUT_HASH_SPENDER_FILE, null),
        purchaseLog: readLocalJson(OUT_PURCHASE_LOG_FILE, {
            entries: [],
            totals: { spent: 0, count: 0 },
            byCategory: [],
            bySource: [],
        }),
    };
    const augmentationIntel = {
        state: readLocalJson(OUT_AUGMENTATION_STATE_FILE, null),
        plan: readLocalJson(OUT_AUGMENTATION_PLAN_FILE, null),
        buyer: readLocalJson(OUT_AUGMENTATION_BUYER_FILE, null),
        factionWork: readLocalJson(OUT_FACTION_WORK_PLAN_FILE, null),
        factionState: readLocalJson(OUT_FACTION_STATE_FILE, null),
    };

    return {
        ...state,
        economy,
        augmentationIntel,
        strategicTargetPlan: state?.strategicTargetPlan ?? plan,
        targetAnalysis: normalizeTargetAnalysis({
            existing: state?.targetAnalysis,
            target,
            targetReason:
                state?.targetAnalysis?.reason ??
                state?.targetReason ??
                state?.strategicTargetReason ??
                state?.controller?.strategicTargetReason ??
                plan?.reason ??
                null,
            targetStability:
                state?.targetAnalysis?.targetStability ??
                state?.targetStability ??
                plan?.targetStability ??
                {},
            plan,
        }),
    };
}

function readLocalJson(file, fallback) {
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
        const status = String(parsed?.status ?? "").toLowerCase();

        if (status === "unavailable" || status === "missing") {
            return fallback;
        }

        return parsed;
    } catch {
        return fallback;
    }
}

function normalizeTargetAnalysis({ existing = {}, target, targetReason, targetStability, plan }) {
    return {
        ...existing,
        target: existing?.target ?? target ?? null,
        reason: targetReason ?? null,
        changed: Boolean(existing?.changed ?? plan?.changed),
        blockedSwap: Boolean(existing?.blockedSwap ?? plan?.blockedSwap),
        blockedTarget: existing?.blockedTarget ?? plan?.blockedTarget ?? null,
        targetStability: targetStability ?? {},
        bestCandidate: normalizeTargetCandidate(existing?.bestCandidate ?? plan?.bestCandidate),
        currentCandidate: normalizeTargetCandidate(existing?.currentCandidate ?? plan?.currentCandidate),
        candidates: Array.isArray(existing?.candidates) && existing.candidates.length > 0
            ? existing.candidates.slice(0, 5).map(normalizeTargetCandidate)
            : Array.isArray(plan?.candidates)
                ? plan.candidates.slice(0, 5).map(normalizeTargetCandidate)
                : [],
    };
}

function normalizeTargetCandidate(candidate = null) {
    if (!candidate) return null;

    return {
        server: candidate.server ?? null,
        score: candidate.score ?? 0,
        scoreSource: candidate.scoreSource ?? null,
        reason: candidate.reason ?? null,
        maxMoney: candidate.maxMoney ?? 0,
        money: candidate.money ?? 0,
        moneyRatio: candidate.moneyRatio ?? 0,
        weakenTime: candidate.weakenTime ?? 0,
        chance: candidate.chance ?? 0,
        hackPercent: candidate.hackPercent ?? 0,
        estimatedMoneyPerSecond: candidate.estimatedMoneyPerSecond ?? 0,
        requiredHacking: candidate.requiredHacking ?? 0,
        minSecurity: candidate.minSecurity ?? 0,
        security: candidate.security ?? 0,
        securityDelta: candidate.securityDelta ?? 0,
        growth: candidate.growth ?? 0,
    };
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
            JSON.stringify({
                source: "network-topology",
                status: "unavailable",
                message: `Could not read ${BITBURNER_TOPOLOGY_FILE}. Is /tools/network-topology-writer.js running?`,
                updatedAt: Date.now(),
                bridgeUpdatedAt: Date.now(),
                nodes: [],
                edges: [],
            }, null, 2)
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

async function pollDaemonReasoningHistory() {
    if (!bitburnerSocket) return;

    try {
        const content = await rpc("getFile", {
            filename: BITBURNER_REASONING_HISTORY_FILE,
            server: "home"
        });

        const parsed = JSON.parse(content || "[]");

        fs.writeFileSync(OUT_REASONING_HISTORY_FILE, JSON.stringify(parsed, null, 2));
    } catch {
        fs.writeFileSync(OUT_REASONING_HISTORY_FILE, JSON.stringify([], null, 2));
    }
}

async function pollJsonFile(bitburnerFile, outFile, fallback) {
    if (!bitburnerSocket) return;

    try {
        const content = await rpc("getFile", {
            filename: bitburnerFile,
            server: "home"
        });

        const parsed = JSON.parse(content || "{}");
        parsed.bridgeUpdatedAt = Date.now();

        fs.writeFileSync(outFile, JSON.stringify(parsed, null, 2));
    } catch {
        fs.writeFileSync(
            outFile,
            JSON.stringify({
                ...fallback,
                bridgeUpdatedAt: Date.now(),
            }, null, 2)
        );
    }
}

async function pollPurchaseLog() {
    if (!bitburnerSocket) return;

    try {
        const [sessionContent, ledgerContent] = await Promise.all([
            readBitburnerFile(BITBURNER_PURCHASE_LOG_FILE),
            readBitburnerFile(BITBURNER_PURCHASE_LEDGER_FILE),
        ]);

        const parsed =
            normalizePurchaseLog({
                sessionContent,
                ledgerContent,
            });

        fs.writeFileSync(OUT_PURCHASE_LOG_FILE, JSON.stringify(parsed, null, 2));
    } catch {
        fs.writeFileSync(
            OUT_PURCHASE_LOG_FILE,
            JSON.stringify({
                source: "purchase-log",
                status: "unavailable",
                message: `Could not read ${BITBURNER_PURCHASE_LOG_FILE}. Purchases will appear after the next buyer logs an action.`,
                updatedAt: Date.now(),
                entries: [],
                totals: { spent: 0, count: 0 },
                byCategory: [],
                bySource: [],
            }, null, 2)
        );
    }
}

async function readBitburnerFile(filename) {
    try {
        return await rpc("getFile", {
            filename,
            server: "home"
        });
    } catch {
        return "";
    }
}

function normalizePurchaseLog({ sessionContent = "", ledgerContent = "" } = {}) {
    const sessionEntries =
        parsePurchaseLines(sessionContent);
    const ledgerEntries =
        parsePurchaseLines(ledgerContent);
    const lifetimeEntries =
        ledgerEntries.length > 0
            ? mergePurchaseEntries(ledgerEntries, sessionEntries)
            : sessionEntries;
    const totals =
        summarizePurchases(lifetimeEntries);
    const sessionTotals =
        summarizePurchases(sessionEntries);

    return {
        source: "purchase-log",
        status: lifetimeEntries.length > 0 ? "ready" : "empty",
        scope: "lifetime",
        updatedAt: Date.now(),
        entries: lifetimeEntries.slice(0, 500),
        sessionEntries: sessionEntries.slice(0, 250),
        totals,
        sessionTotals,
        byCategory: groupPurchases(lifetimeEntries, "category"),
        sessionByCategory: groupPurchases(sessionEntries, "category"),
        bySource: groupPurchases(lifetimeEntries, "source"),
        sessionBySource: groupPurchases(sessionEntries, "source"),
        files: {
            session: BITBURNER_PURCHASE_LOG_FILE,
            lifetime: BITBURNER_PURCHASE_LEDGER_FILE,
        },
    };
}

function parsePurchaseLines(content = "") {
    return String(content)
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => safeParseJson(line))
        .filter(Boolean)
        .map(normalizePurchaseEntry)
        .sort((a, b) => Number(b.time) - Number(a.time));
}

function mergePurchaseEntries(primary = [], secondary = []) {
    const seen =
        new Set();
    const merged = [];

    for (const entry of [...primary, ...secondary]) {
        const key =
            entry.id ?? `${entry.time}-${entry.source}-${entry.type}-${entry.item}-${entry.cost}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(entry);
    }

    return merged.sort((a, b) => Number(b.time) - Number(a.time));
}

function safeParseJson(line) {
    try {
        return JSON.parse(line);
    } catch {
        return null;
    }
}

function normalizePurchaseEntry(entry = {}) {
    const cost =
        Number(entry.cost);
    const category =
        entry.category ?? inferPurchaseCategory(entry);

    return {
        ...entry,
        category,
        cost: Number.isFinite(cost) ? cost : 0,
        purchases: Array.isArray(entry.purchases) ? entry.purchases : [],
    };
}

function inferPurchaseCategory(entry = {}) {
    const source =
        String(entry.source ?? "").toLowerCase();
    const type =
        String(entry.type ?? "").toLowerCase();
    const item =
        String(entry.item ?? "").toLowerCase();

    if (source.includes("augment") || type.includes("augment")) return "augmentations";
    if (source.includes("hacknet") || type.includes("hacknet") || item.includes("hacknet")) return "hacknet";
    if (source.includes("stock") || type.includes("stock") || type.includes("market")) return "stocks";
    if (source.includes("darkweb") || type.includes("program") || item.endsWith(".exe")) return "programs";
    if (source.includes("home") || item.includes("home ram") || item.includes("home core")) return "home";
    if (source.includes("server") || type.includes("server")) return "servers";
    if (source.includes("faction") || type.includes("donation")) return "factions";

    return "other";
}

function summarizePurchases(entries) {
    const spent =
        entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.cost) || 0), 0);

    return {
        spent,
        count: entries.length,
        latestAt: entries[0]?.time ?? null,
        latestText: entries[0]?.timeText ?? null,
    };
}

function groupPurchases(entries, key) {
    const groups =
        new Map();
    const totalSpent =
        entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.cost) || 0), 0);

    for (const entry of entries) {
        const id =
            String(entry[key] ?? "unknown");
        const current =
            groups.get(id) ?? { id, label: id, spent: 0, count: 0 };

        current.spent += Math.max(0, Number(entry.cost) || 0);
        current.count += 1;
        groups.set(id, current);
    }

    return [...groups.values()]
        .map(group => ({
            ...group,
            percent: totalSpent > 0 ? group.spent / totalSpent : 0,
        }))
        .sort((a, b) => b.spent - a.spent);
}

async function pollEconomyTelemetry() {
    await Promise.all([
        pollPurchaseLog(),
        pollJsonFile(BITBURNER_STOCK_TRADER_FILE, OUT_STOCK_TRADER_FILE, {
            source: "stock-trader",
            status: "unavailable",
            message: `Could not read ${BITBURNER_STOCK_TRADER_FILE}. Is /economy/stock-trader.js running?`,
            rows: [],
            recentActions: [],
        }),
        pollJsonFile(BITBURNER_HACKNET_FILE, OUT_HACKNET_FILE, {
            source: "hacknet-buyer",
            status: "unavailable",
            message: `Could not read ${BITBURNER_HACKNET_FILE}. Is /economy/hacknet-buyer-service.js running?`,
            nodes: [],
        }),
        pollJsonFile(BITBURNER_HASH_SPENDER_FILE, OUT_HASH_SPENDER_FILE, {
            source: "hacknet-hash-spender",
            status: "unavailable",
            message: `Could not read ${BITBURNER_HASH_SPENDER_FILE}. Is /economy/hacknet-hash-spender-service.js running?`,
        }),
        pollJsonFile(BITBURNER_AUGMENTATION_STATE_FILE, OUT_AUGMENTATION_STATE_FILE, {
            source: "augmentation-data-builder",
            status: "unavailable",
            message: `Could not read ${BITBURNER_AUGMENTATION_STATE_FILE}. Is /tools/augmentation-data-builder.js running?`,
            factions: [],
            uniqueAugmentations: [],
        }),
        pollJsonFile(BITBURNER_AUGMENTATION_PLAN_FILE, OUT_AUGMENTATION_PLAN_FILE, {
            source: "augmentation-plan",
            status: "unavailable",
            message: `Could not read ${BITBURNER_AUGMENTATION_PLAN_FILE}. Is /tools/augmentation-buyer-service.js running?`,
            candidates: [],
        }),
        pollJsonFile(BITBURNER_AUGMENTATION_BUYER_FILE, OUT_AUGMENTATION_BUYER_FILE, {
            source: "augmentation-buyer",
            status: "unavailable",
            message: `Could not read ${BITBURNER_AUGMENTATION_BUYER_FILE}. Is /tools/augmentation-buyer-service.js running?`,
        }),
        pollJsonFile(BITBURNER_FACTION_WORK_PLAN_FILE, OUT_FACTION_WORK_PLAN_FILE, {
            source: "faction-work-plan",
            status: "unavailable",
            message: `Could not read ${BITBURNER_FACTION_WORK_PLAN_FILE}. Is /tools/faction-work-service.js running?`,
        }),
        pollJsonFile(BITBURNER_FACTION_STATE_FILE, OUT_FACTION_STATE_FILE, {
            source: "faction-observer",
            status: "unavailable",
            message: `Could not read ${BITBURNER_FACTION_STATE_FILE}. Is /tools/faction-observer-service.js running?`,
            profiles: [],
        }),
    ]);
}

setInterval(pollDashboardState, 3000);
setInterval(pollEventLog, 3000);
setInterval(pollNetworkTopology, 10000);
setInterval(pollCommandStatus, 3000);
setInterval(pollDaemonReasoning, 5000);
setInterval(pollDaemonReasoningHistory, 5000);
setInterval(pollEconomyTelemetry, 3000);

console.log(`[REMOTE API] Waiting for Bitburner on ws://localhost:${REMOTE_API_PORT}`);
