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

  "faction_observer": "implemented",
  "augmentation_cache": "implemented",
  "augmentation_planner": "implemented",
  "augmentation_buyer": "implemented",

  "current_focus": "BN4 rebuild + faction automation + augmentation intelligence"
}
CURRENT_ARCHITECTURE_RULES
daemon.js = orchestration/decision layer
/controllers/uhm.js = execution engine

libraries = reusable logic
workers = execution only

persistent workers preferred over delayed process explosions

EXP mode should avoid massive HWGW spam

share runs BEFORE money lanes

service registry controls startup gating

augmentation APIs should build cache files, not run continuously in hot loops

augmentation purchasing authority belongs to daemon policy, not manual scripts

tags are secondary metadata only
augmentation scoring should primarily use actual augmentation stat multipliers
ACTIVE_DAEMON_FILES
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

/tools/faction-status.js
/tools/faction-next-path.js

/tools/augmentation-data-builder.js
/tools/augmentation-buyer-service.js
/tools/augmentation-status.js
CURRENT_EXP_ARCHITECTURE
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
CURRENT_PHASE_MODEL
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
  },

  "forced-exp-until-3000": {
    "money": 0.00,
    "share": 0.00,
    "exp": 1.00
  }
}
CURRENT_BOOTSTRAP_STATE
bootstrap-money.js exists
bootstrap worker exists

service gating exists

Current thresholds:

16GB+ = UHM
32GB+ = dashboard stable
64GB+ = telemetry/session
128GB+ = faction + augmentation systems
500m+ = server purchaser
CURRENT_FACTION_ARCHITECTURE
/lib/daemon/factions.js exists

ALL_FACTION_PROFILES implemented

Faction groups:
- hacking factions
- early factions
- city factions
- criminal factions
- megacorp factions
- endgame factions

Future placeholders:
- Bladeburners
- Church of the Machine God
- Shadows of Anarchy
CURRENT_AUGMENTATION_ARCHITECTURE
augmentation-data-builder.js:
- builds augmentation cache once
- writes /data/augmentation-state.txt
- avoids continuous Singularity API spam

augmentation planner:
- reads cached augmentation state
- scores augmentations using weighted stat scoring
- supports BitNode-specific purchase strategies
- supports cheap-ready-first purchasing
- supports prerequisite validation
- supports readiness gating

augmentation buyer:
- daemon-policy controlled
- force-buy is emergency override only
- rebuilds cache after purchases

status helper:
- augmentation-status.js exists
CURRENT_BITNODE_STRATEGY_MODEL
BitNode strategies influence:
- hacking weight
- combat weight
- crime weight
- faction rep weight
- money weight
- company weight
- charisma weight

Current implemented strategies:
- BN4 Singularity/Hacking
- BN2 Crime/Gang
- Default Balanced
CURRENT_NEXT_MAJOR_SYSTEMS
/lib/daemon/backdoors.js

Goals:

daemon-owned backdoor orchestration
auto-pathfinding
auto-terminal routing
auto-backdoor execution
world daemon progression
/lib/daemon/reset-planner.js

Goals:

augmentation install planning
reset timing
reset readiness scoring
augmentation batching logic
post-reset bootstrap orchestration
/lib/daemon/faction-work.js

Goals:

auto faction work
reputation targeting
augmentation unlock planning
company/crime grind routing

# DO_NOT_BREAK

```txt
do not reintroduce million-process HWGW explosions

do not merge daemon and UHM responsibilities

do not move share after money lanes

do not make planner HUDs persistent forever-loops

do not auto-reset/install augmentations yet

keep EXP mode persistent-worker based

keep augmentation APIs cached and not continuously spammed

keep daemon policy as the sole authority for augmentation purchases