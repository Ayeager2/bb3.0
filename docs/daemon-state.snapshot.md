# daemon-state.snapshot.md

# CURRENT_RUNTIME_STATE

```json
{
  "project": "Bitburner daemon + modular UHM automation",
  "bitnode": 4,
  "active_runtime": [
    "daemon.js",
    "/controllers/uhm.js"
  ],
  "architecture": "daemon-owned orchestration",
  "uhm_status": "stable",
  "daemon_status": "stable",
  "share_system": "stable",
  "exp_overdrive": "implemented",
  "persistent_exp_workers": "implemented",
  "exp_target_selection": "implemented",
  "progression_phases": "implemented",
  "service_registry": "implemented",
  "bootstrap_mode": "implemented",
  "compact_dashboard": "implemented",
  "current_focus": "BN4 rebuild + faction automation"
}
```

# CURRENT_ARCHITECTURE_RULES

```txt
daemon.js = orchestration/decision layer
/controllers/uhm.js = execution engine
libraries = reusable logic
workers = execution only
persistent workers preferred over delayed process explosions
EXP mode should avoid massive HWGW spam
share runs BEFORE money lanes
service registry controls startup gating
```

# ACTIVE_DAEMON_FILES

```txt
daemon.js
/controllers/uhm.js

/lib/daemon/*
/lib/uhm/*

/workers/h1.js
/workers/g1.js
/workers/w1.js

/workers/share-worker.js
/workers/exp-weaken.js
/workers/exp-grow.js
```

# CURRENT_EXP_ARCHITECTURE

```json
{
  "forced_exp_mode": true,
  "persistent_workers": true,
  "target_selection": true,
  "process_governor": true,
  "exp_telemetry": true,
  "share_disabled_during_exp": true,
  "max_process_cap": 250,
  "dynamic_exp_targeting": true
}
```

# CURRENT_PHASE_MODEL

```json
{
  "bootstrap": { "money": 0.95, "share": 0.00, "exp": 0.05 },
  "expansion": { "money": 0.85, "share": 0.05, "exp": 0.10 },
  "scaling": { "money": 0.70, "share": 0.10, "exp": 0.20 },
  "faction": { "money": 0.35, "share": 0.55, "exp": 0.10 },
  "reset-prep": { "money": 0.20, "share": 0.70, "exp": 0.10 },
  "forced-exp-until-3000": {
    "money": 0.00,
    "share": 0.00,
    "exp": 1.00
  }
}
```

# CURRENT_BOOTSTRAP_STATE

```txt
bootstrap-money.js exists
bootstrap worker exists
service gating exists

Current thresholds:
16GB+ = UHM
32GB+ = dashboard stable
64GB+ = telemetry/session
128GB+ = progression buyer
500m+ = server purchaser
```

# CURRENT_NEXT_MAJOR_SYSTEM

```txt
/lib/daemon/factions.js
```

Goals:

* track faction progression
* faction spine awareness
* invitations
* reputation goals
* augmentation planning
* future auto-join support
* future augmentation intelligence

````

# DO_NOT_BREAK

```txt
do not reintroduce million-process HWGW explosions
do not merge daemon and UHM responsibilities
do not move share after money lanes
do not make planner HUDs persistent forever-loops
do not auto-reset/install augmentations yet
keep EXP mode persistent-worker based
````
