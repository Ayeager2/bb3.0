# daemon-state.snapshot.md

## CURRENT_RUNTIME_STATE

```json
{
  "project": "Bitburner daemon + modular UHM automation",
  "architecture": "daemon-owned orchestration",
  "daemon_status": "stable",
  "uhm_status": "stable",
  "bootstrap_mode": "implemented",
  "service_registry": "implemented",
  "service_thresholds": "implemented",
  "share_system": "working",
  "target_service": "implemented",
  "cloud_scaling": "working",
  "progression_service_split": "in-progress",
  "singularity_unlocked": true,
  "red_pill_owned": true,
  "current_focus": "bootstrap refinement + true EXP mode"
}
```

---

## CURRENT_ARCHITECTURE_RULES

```txt
daemon.js = orchestration only
UHM = execution engine only
services.js = runtime registry
service-manager.js = lifecycle + gating
target-service.js = daemon target selection
bootstrap-money.js = ultra-light bootstrap money engine
libraries = reusable daemon/UHM logic
controllers = only true runtime systems
helpers/planners = manual or archived unless daemon-gated
no forever-loop HUDs unless core runtime
daemon owns lifecycle, progression, purchases, and orchestration
```

---

## BOOTSTRAP ARCHITECTURE

```txt
bootstrap-money (<64GB)
    ↓
UHM unlock (64GB)
    ↓
HUD unlock (64GB)
    ↓
telemetry/session unlock (128GB)
    ↓
progression buyers unlock (256GB+)
    ↓
server purchaser unlock (500M+)
    ↓
full scaling/faction phases
```

---

## CURRENT_SERVICE_MODEL

```txt
daemon.js
    orchestration only

services.js
    service registry + lifecycle metadata

service-manager.js
    gating + startup + persistence

target-service.js
    daemon target selection

controllers/uhm.js
    execution engine only

tools/bootstrap-money.js
    ultra-light fresh-run money engine

economy/home-ram-buyer-service.js
    bootstrap-safe home RAM growth

economy/darkweb-buyer-service.js
    TOR automation

economy/exe-buyer-service.js
    program purchasing automation
```

---

## ACTIVE_DAEMON_FILES

```txt
daemon.js

/controllers/uhm.js

/lib/daemon/*
/lib/uhm/*

/tools/bootstrap-money.js
/tools/target-service.js
/tools/daemon-hud.js
/tools/daemon-telemetry-service.js
/tools/daemon-session-service.js

/economy/home-ram-buyer-service.js
/economy/darkweb-buyer-service.js
/economy/exe-buyer-service.js
/economy/server-purchaser-service.js

/workers/h1.js
/workers/g1.js
/workers/w1.js
/workers/share-worker.js
/workers/bootstrap-worker.js
```

---

## CURRENT_PHASE_MODEL

```json
{
  "bootstrap": {
    "money": 0.95,
    "share": 0.00,
    "exp": 0.05
  },
  "expansion": {
    "money": 0.85,
    "share": 0.05,
    "exp": 0.10
  },
  "scaling": {
    "money": 0.70,
    "share": 0.10,
    "exp": 0.20
  },
  "faction": {
    "money": 0.35,
    "share": 0.55,
    "exp": 0.10
  },
  "reset-prep": {
    "money": 0.20,
    "share": 0.70,
    "exp": 0.10
  }
}
```

---

## CURRENT_UHM_STATE

```json
{
  "modular": true,
  "distributed_batching": true,
  "share_before_money": true,
  "phase_aware_share": true,
  "service_registry_driven": true,
  "target_service_driven": true,
  "bootstrap_thresholds": true,
  "compact_dashboard": true,
  "known_good": true
}
```

---

## CURRENT_EXP_MODE_STATE

```txt
Forced EXP override implemented.

Current limitations:
- EXP still uses HWGW batch architecture.
- Delayed worker explosion can still occur under extreme overdrive.
- Process governor added to prevent million-process crashes.

Current protection:
- active process cap
- adjustable batch cap
- adjustable cycle delay
- overdrive controls

Future goal:
true low-process-count EXP flood mode
using large weaken/grow workers
instead of delayed HWGW batching
```

---

## CLEANUP_DECISIONS

```json
{
  "/planners/flight-status.js": "manual_or_archive",
  "/planners/faction-planner.js": "archive_refactor_later",
  "/controllers/backdoor-ai.js": "archive_future_backdoors_lib",
  "/helpers/darknet-watch.js": "archive_or_experimental",
  "/darknet-auto.js": "experimental_archive",
  "/economy/justhacknet.js": "archive_future_hacknet_module",
  "/economy/scaleingServerPurchase.js": "replaced_by_server_purchaser_service",
  "/controllers/progression-buyer.js": "replaced_by_service_split",
  "/economy/stock-trader.js": "conditional_daemon_later",
  "/planners/augmentation-planner.js": "future_augmentations_module"
}
```

---

## CURRENT_NEXT_TOPICS

```txt
1. True EXP execution mode
2. Faction automation
3. Backdoor orchestration
4. Augmentation intelligence
5. Reset-prep orchestration
6. Bootstrap refinement
7. Final progression-buyer removal
```

---

## DO_NOT_BREAK

```txt
do not move share after money lanes
do not merge daemon and UHM responsibilities
do not remove active process governor
do not reintroduce infinite HUD loops
do not auto-install augmentations yet
do not allow EXP overdrive to create unbounded delayed workers
do not let bootstrap phase launch heavy services early
```
