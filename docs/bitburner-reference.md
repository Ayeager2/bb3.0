# bitburner-reference.md

# USEFUL ALIASES

## Buy all openers

```txt
alias buyOpeners="buy BruteSSH.exe ; buy FTPCrack.exe ; buy relaySMTP.exe ; buy HTTPWorm.exe ; buy SQLInject.exe"
```

---

# CORE COMMANDS

## Run daemon

```txt
run daemon.js
run daemon.js --force-mode exp
run daemon.js --force-mode exp --force-target joesguns
```

## Run UHM directly

```txt
run /controllers/uhm.js --tails
```

## Run target service

```txt
run /tools/target-service.js
```

## Kill everything

```txt
killall
```

## View processes

```txt
ps home
ps HomeServer1
```

---

# CURRENT RUNTIME MODEL

```txt
target-service
→ computes targets/phases

daemon.js
→ orchestrates policies/services

services
→ perform specialized actions

UHM
→ executes batches

HUD
→ renders dashboard
```

---

# SHARE SYSTEM

## Share Worker

```txt
/workers/share-worker.js
```

Purpose:

* contributes faction reputation bonus
* distributed across purchased servers
* daemon-managed
* phase-aware RAM allocation

---

## Share APIs

```txt
ns.share()
ns.getSharePower()
```

Notes:

* share bonus is GLOBAL
* all rooted servers contribute
* diminishing returns apply
* share runs BEFORE money lanes currently

---

# TARGET SERVICE

## File

```txt
/tools/target-service.js
```

Purpose:

* network scanning
* rooted server discovery
* target selection
* mode selection
* writes target-state.txt

This was extracted from daemon.js to reduce daemon RAM usage.

---

# CURRENT ACTIVE SERVICES

```txt
/controllers/uhm.js
/tools/daemon-hud.js
/tools/target-service.js
/tools/daemon-telemetry-service.js
/tools/daemon-session-service.js
/economy/server-purchaser-service.js
/economy/progression-buyer-service.js
```

---

# CURRENT ARCHITECTURE DIRECTION

Transitioning from:

```txt
automation scripts
```

to:

```txt
runtime orchestration architecture
```

Daemon responsibilities:

* orchestration
* service lifecycle
* spending policy
* capability management
* shared state

UHM responsibilities:

* execution
* batching
* lane scheduling
* share allocation

Services responsibilities:

* specialized runtime systems

---

# IMPORTANT UHM FILES

## Core

```txt
daemon.js
/controllers/uhm.js
```

## Targeting

```txt
/tools/target-service.js
/lib/uhm/targets.js
/lib/uhm/lanes.js
```

## Modes

```txt
/lib/uhm/modes/share.js
/lib/uhm/modes/exp.js
```

## Runtime

```txt
/lib/uhm/runtime.js
/lib/uhm/dashboard.js
```

## Workers

```txt
/workers/h1.js
/workers/g1.js
/workers/w1.js
/workers/share-worker.js
```

---

# CURRENT PHASE MODEL

```txt
bootstrap
→ expansion
→ scaling
→ faction
→ reset-prep
```

---

# CURRENT SHARE STRATEGY

```txt
share reserves RAM first
money lanes consume leftovers
```

Future goal:

```txt
true phase-aware lane budgeting
```

---

# CLOUD SERVER SYSTEM

## APIs

```txt
ns.cloud.getServerNames()
ns.cloud.getServerLimit()
ns.cloud.getRamLimit()
ns.cloud.getServerCost(ram)
ns.cloud.upgradeServer(server, ram)
```

---

## Current Behavior

* daemon-managed
* conditional service
* upgrades weakest purchased server
* uses upgradeServer()
* avoids delete/rebuy loops

---

# OPTIONAL / MANUAL SCRIPTS

These should NOT remain persistent forever-loops.

```txt
/planners/flight-status.js
/planners/faction-planner.js
/controllers/backdoor-ai.js
/helpers/darknet-watch.js
/economy/justhacknet.js
```

Run manually or archive/refactor later.

---

# PERFORMANCE NOTES

## Heavy RAM usage usually comes from:

* repeated getServer scans
* Singularity calls
* stock APIs
* giant monolithic files
* dashboard rendering
* infinite-loop planners

---

# DESIGN GOALS

```txt
daemon = orchestration
UHM = execution
services = specialized runtime systems
helpers = temporary/manual
```

Goal:

```txt
small daemon core
large distributed runtime
```

---

# OFFICIAL DOCS

## Markdown API Source

https://github.com/bitburner-official/bitburner-src/tree/dev/markdown

## Main Netscript API

https://github.com/bitburner-official/bitburner-src/blob/dev/markdown/bitburner.ns.md
