# Bitburner Dashboard Bridge

Local bridge and React dashboard for watching the Bitburner daemon from outside the game.

## What Runs Where

- Bitburner Remote API: `ws://localhost:12525`
- Bridge server: `http://localhost:31337`
- Vite dashboard UI: `http://127.0.0.1:5173`

The data path is:

```txt
Bitburner /data/ui/*.txt
-> Remote API bridge
-> bb-dashboard-bridge/public/*.json
-> React dashboard
```

## Start The Dashboard

Open two PowerShell terminals in:

```powershell
cd C:\Users\AnnaN\Documents\bb3.0\bb-dashboard-bridge
```

Terminal 1, start the bridge:

```powershell
npm run dev
```

Expected bridge output:

```txt
[REMOTE API] Waiting for Bitburner on ws://localhost:12525
[DASHBOARD] http://localhost:31337
[BITBURNER] Connected
```

Terminal 2, start the React UI:

```powershell
npm run ui
```

Open:

```txt
http://127.0.0.1:5173
```

## Required Bitburner Side Services

The daemon should keep these alive, but they can also be run manually for testing:

```txt
run /tools/dashboard-state-writer.js
run /tools/network-topology-writer.js
run /tools/daemon-reasoning-writer.js
run /tools/dashboard-command-runner.js
```

One-shot checks:

```txt
run /tools/dashboard-state-writer.js --once
run /tools/network-topology-writer.js --once
run /tools/daemon-reasoning-writer.js --once
```

## Quick Health Checks

Bridge/API:

```txt
http://localhost:31337/state
http://localhost:31337/topology
http://localhost:31337/reasoning
http://localhost:31337/reasoning/history
http://localhost:31337/command/status
```

Dashboard UI:

```txt
http://127.0.0.1:5173
```

Expected in the UI:

- Network topology renders in the left column.
- Topology is a narrow, full-height tactical map with a compact Topology/Focus/Keys legend.
- Topology highlights faction servers, backdoor-needed servers, current daemon focus, and world route.
- Inspector Core shows target intel with candidate telemetry.
- Inspector Reasoning shows current reasoning and history.
- Inspector Victory, Policy, and Services combine related diagnostics to avoid stale/repeated data.
- Services shows running, policy-blocked, completed, and failed service states.
- Ctrl+K opens the command palette.

## Current Pause Point

Current handoff:

```txt
docs/handoff-2026-06-07.md
```

The latest completed work is dashboard UI polish around the inspector, reasoning panel, service health, and topology tactical overlays. The next planned feature is World Daemon mission mode.

## If Something Is Blank

- Blank dashboard: make sure `npm run ui` is running.
- `/state` is missing: make sure `npm run dev` is running and Bitburner Remote API is connected.
- No topology: run `/tools/network-topology-writer.js --once` in Bitburner.
- No reasoning: run `/tools/daemon-reasoning-writer.js --once` in Bitburner.
- Command buttons do nothing: make sure `/tools/dashboard-command-runner.js` is running.
- Data looks stale: restart `npm run dev`, then run the one-shot Bitburner writer checks above.

## Useful Local Commands

```powershell
npm run dev
npm run ui
npm run build
node --check bridge.js
```

## Notes

The daemon remains the automation brain. The dashboard is the observability and safe-control shell.
