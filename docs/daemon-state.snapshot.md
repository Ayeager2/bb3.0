# daemon-state.snapshot.md

## CURRENT_RUNTIME_STATE

```json
{
  "project": "Bitburner daemon + modular UHM automation",
  "active_runtime": ["daemon.js", "/controllers/uhm.js"],
  "architecture": "daemon-owned orchestration",
  "uhm_status": "working",
  "daemon_status": "working",
  "share_system": "working",
  "progression_phases": "implemented",
  "compact_dashboard": "implemented",
  "singularity_unlocked": false,
  "current_focus": "cleanup before service registry/bootstrap"
}
```

## CURRENT_ARCHITECTURE_RULES

```txt
daemon.js = central decision/orchestration layer
/controllers/uhm.js = persistent execution/batching/share engine
libraries = reusable logic called by daemon
controllers = only long-running runtime systems
helpers/planners = manual or archived unless daemon-gated
no forever-loop HUDs unless they are core runtime
daemon should own purchases, progression, and lifecycle decisions
```

## ACTIVE_DAEMON_FILES

```txt
daemon.js
/controllers/uhm.js
/lib/daemon/*
/lib/uhm/*
/workers/h1.js
/workers/g1.js
/workers/w1.js
/workers/share-worker.js
```

## CURRENT_UHM_STATE

```json
{
  "modular": true,
  "share_before_money": true,
  "phase_aware_share": true,
  "share_multiplier_observed": "1.6x+",
  "dashboard": "compact",
  "known_good": true
}
```

## CURRENT_PHASE_MODEL

```json
{
  "bootstrap": { "money": 0.95, "share": 0.00, "exp": 0.05 },
  "expansion": { "money": 0.85, "share": 0.05, "exp": 0.10 },
  "scaling": { "money": 0.70, "share": 0.10, "exp": 0.20 },
  "faction": { "money": 0.35, "share": 0.55, "exp": 0.10 },
  "reset-prep": { "money": 0.20, "share": 0.70, "exp": 0.10 }
}
```

## CLEANUP_DECISIONS

```json
{
  "/planners/flight-status.js": "manual_or_archive",
  "/planners/faction-planner.js": "archive_refactor_later",
  "/controllers/backdoor-ai.js": "delete_archive_logic_to_future_backdoors_lib",
  "/helpers/darknet-watch.js": "archive_or_experimental",
  "/darknet-auto.js": "experimental_archive",
  "/economy/justhacknet.js": "archive_refactor_later_to_lib_daemon_hacknet",
  "/economy/scaleingServerPurchase.js": "refactor_to_lib_daemon_server_purchases",
  "/controllers/progression-buyer.js": "replaced_by_lib_daemon_progression_buyer",
  "/economy/stock-trader.js": "conditional_daemon_later",
  "/planners/augmentation-planner.js": "keep_as_reference_refactor_later_to_lib_daemon_augmentations"
}
```

## CURRENT_NEXT_TOPIC

```txt
Stop feature expansion temporarily.
Finish daemon cleanup.
Verify remaining scripts are either:
KEEP_ACTIVE
CONDITIONAL_DAEMON
MANUAL_ONLY
ARCHIVE
DELETE
```

## DO_NOT_BREAK

```txt
do not move share after money lanes
do not make planner HUDs persistent again
do not merge daemon and UHM responsibilities
do not add Singularity automation until service gating exists
do not auto-install/reset augmentations until explicit reset-prep policy exists
```
