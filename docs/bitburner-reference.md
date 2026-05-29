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
```

## Run UHM

```txt
run controllers/uhm.js --tails
```

## Kill everything

```txt
killall
```

## View processes

```txt
ps home
ps pserv-0
```

---

# SHARE SYSTEM

## Share Worker

```txt
/workers/share-worker.js
```

Purpose:

* contribute faction reputation bonus
* distributed across purchased servers

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

---

# OFFICIAL DOCS

## Markdown API Source

https://github.com/bitburner-official/bitburner-src/tree/dev/markdown

## Main Netscript API

https://github.com/bitburner-official/bitburner-src/blob/dev/markdown/bitburner.ns.md

---

# IMPORTANT UHM FILES

## Core

```txt
daemon.js
/controllers/uhm.js
```

## Modes

```txt
/lib/uhm/modes/share.js
/lib/uhm/modes/exp.js
```

## Logic

```txt
/lib/uhm/progression.js
/lib/uhm/targets.js
/lib/uhm/lanes.js
```

## Runtime

```txt
/lib/uhm/runtime.js
/lib/uhm/dashboard.js
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
share runs BEFORE money lanes
```

Meaning:

* share reserves RAM first
* money lanes consume leftovers

Current future goal:

* intentional lane budgeting instead of leftovers

---

# CURRENT KNOWN ARCHITECTURE DIRECTION

Transitioning from:

```txt
batcher
```

to:

```txt
progression-aware controller AI
```

Future direction:

* singularity orchestration
* faction automation
* reset automation
* telemetry-driven decisions
* adaptive target selection

---

# OPTIONAL / MANUAL SCRIPTS

These should NOT stay running forever.

```txt
planners/flight-status.js
helpers/servers.js
darknet-watch.js
faction-planner.js
backdoor-ai.js
```

Run manually when needed.

---

# PERFORMANCE NOTES

## Heavy RAM usage usually comes from:

* infinite loops
* Singularity calls
* stock APIs
* repeated getServer() scans
* excessive HUD rendering

## Keep persistent systems lightweight.

Goal:

```txt
daemon = orchestration
uhm = execution
helpers = temporary/manual
```
