import fs from "fs";
import path from "path";
import express from "express";
import { WebSocketServer } from "ws";

const REMOTE_API_PORT = 12525;
const DASHBOARD_HTTP_PORT = 31337;

const BITBURNER_STATE_FILE = "/data/ui/dashboard-state.txt";
const OUT_DIR = path.resolve("./public");
const OUT_FILE = path.join(OUT_DIR, "dashboard-state.json");

fs.mkdirSync(OUT_DIR, { recursive: true });

let bitburnerSocket = null;
let rpcId = 1;
const pending = new Map();

const app = express();

app.use(express.static(OUT_DIR));

app.get("/state", (_req, res) => {
    try {
        const raw = fs.readFileSync(OUT_FILE, "utf8");
        res.type("json").send(raw);
    } catch {
        res.status(404).json({ error: "No dashboard state written yet." });
    }
});

app.listen(DASHBOARD_HTTP_PORT, () => {
    console.log(`[DASHBOARD] http://localhost:${DASHBOARD_HTTP_PORT}`);
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
    if (!bitburnerSocket) return;

    try {
        const content = await rpc("getFile", {
            filename: BITBURNER_STATE_FILE,
            server: "home"
        });

        const parsed = JSON.parse(content);

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

setInterval(pollDashboardState, 3000);

console.log(`[REMOTE API] Waiting for Bitburner on ws://localhost:${REMOTE_API_PORT}`);