# daemon-todo.md

# P0 — STABILIZATION

* [x] Process governor
* [x] EXP overdrive
* [x] Persistent EXP workers
* [x] EXP telemetry
* [x] Dynamic EXP target selection
* [x] Share disabled during forced EXP mode
* [x] Service registry
* [x] Bootstrap gating
* [x] Target-service extraction
* [x] Purchased server scaling restored
* [x] Conditional service startup
* [x] Home RAM policy integration
* [x] Darkweb/TOR buyer stabilization
* [x] Server purchaser recovery handling
* [x] Lean daemon state architecture
* [x] Purchase audit logging
* [x] Purchase state snapshots
* [x] Dynamic reserve handling for purchased servers
* [x] Early-game reserve freeze fix
* [x] Stale faction plan cleanup system
* [x] Service normalization pipeline
* [x] Service startup cooldown system
* [x] Duplicate process protection
* [x] stopWhenBlocked lifecycle behavior
* [x] PolicyFlag daemon service gating
* [x] Improved ns.exec failure diagnostics
* [x] FAILURE_CACHE retry protection
* [x] Daemon-owned target stability foundation
* [x] Minimum target hold timer
* [x] buildGlobalState() integration
* [x] Progression priority phase cleanup
* [x] Separate faction work / donation / augmentation policies
* [x] Reset blocking during progression actions

# P1 — TRUE EXP MODE

* [x] Forced EXP override
* [x] Overdrive controls
* [x] Process governor
* [x] EXP overdrive execution path
* [x] Persistent weaken/grow EXP workers
* [x] Dynamic EXP target scaling
* [x] EXP telemetry
* [ ] Replace remaining EXP fallback HWGW logic
* [ ] Add adaptive EXP worker scaling
* [ ] Add EXP efficiency metrics
* [ ] Add EXP/sec tracking
* [ ] Add RAM saturation tracking
* [ ] Add EXP target intelligence scoring
* [ ] Add forced EXP auto-exit logic
* [ ] Add hacking-level-aware EXP routing
* [ ] Add EXP mode soft-cap intelligence

# P2 — BOOTSTRAP / REBUILD SPEED

* [x] Bootstrap worker
* [x] Bootstrap-money mode
* [x] Staged service thresholds
* [x] Lightweight rebuild ladder
* [x] Automatic bootstrap -> daemon transition logic
* [x] Purchased server snowball logic
* [x] Dynamic RAM tier scaling
* [x] Upgrade pacing controls
* [x] Shortened bootstrap handoff
* [x] Early UHM handoff at 64GB+
* [x] Money-first BN4 rebuild strategy
* [ ] Adaptive bootstrap target selection
* [ ] Bootstrap telemetry
* [ ] Bootstrap lane budgeting
* [ ] Bootstrap host reservation logic
* [ ] Bootstrap faction targeting
* [ ] Bootstrap smart reserve tuning

# P3 — FACTION AUTOMATION

* [x] Create `/lib/daemon/factions.js`
* [x] Track invitations
* [x] Track joined factions
* [x] Track faction progression spine
* [x] Track reputation requirements
* [x] Track augmentation sources
* [x] Suggest next progression action
* [x] Build `faction-profiles.js`
* [x] Add city factions
* [x] Add hacking factions
* [x] Add criminal factions
* [x] Add megacorp factions
* [x] Add endgame factions
* [x] Add future placeholders for Bladeburners / Church / Shadows
* [x] Add faction-next-path helper
* [x] Add faction status helper
* [x] Merge backdoor observer into faction observer
* [x] Add toast + terminal notifications
* [x] Add future Singularity auto-backdoor architecture
* [x] Add auto-join support
* [x] Add faction work orchestration
* [x] Add faction reputation target planner
* [x] Add faction donation planner
* [x] Add faction donation service
* [x] Add faction work stop logic
* [x] Add faction stale-plan cleanup
* [x] Add faction progress one-shot status tool
* [x] Add progression status aggregation tool
* [x] Add CyberSec progression validation
* [ ] Add auto-travel support
* [ ] Add faction favor intelligence
* [ ] Add faction augmentation routing
* [ ] Add company faction automation
* [ ] Add criminal faction automation
* [ ] Add endgame faction orchestration
* [ ] Add multi-faction priority scoring
* [ ] Add faction switching intelligence
* [ ] Add faction donation optimization
* [ ] Add faction work efficiency scoring

# P4 — BACKDOOR ORCHESTRATION

* [x] Create `/lib/daemon/backdoors.js`
* [x] Auto-pathfinding
* [x] Faction server progression
* [x] Backdoor eligibility detection
* [x] Auto-terminal routing generation
* [x] Auto-backdoor execution
* [x] Create `/tools/backdoor-route.js`
* [x] Add Singularity-aware backdoor execution
* [x] Add progression route generation
* [x] Add backdoor-state integration into daemon state
* [x] Add backdoor target visibility to controller state
* [x] Add future-safe missing-server handling
* [ ] Daemon-owned backdoor orchestration
* [ ] Backdoor telemetry/history
* [ ] Auto-toast + terminal notifications
* [ ] Future world daemon orchestration
* [ ] Integrate faction progression spine
* [ ] Add world_daemon routing preparation
* [ ] Add daemon-owned backdoor execution policies
* [ ] Add backdoor retry protection
* [ ] Add automatic faction-server rooting pipeline
* [ ] Add progression-aware backdoor prioritization

# P5 — AUGMENTATION INTELLIGENCE

* [x] Create `/lib/daemon/augmentations.js`
* [x] Create augmentation cache builder
* [x] Create augmentation buyer service
* [x] Create augmentation status helper
* [x] Create augmentation debug helper
* [x] Create progression-status helper
* [x] Build `/data/augmentation-state.txt`
* [x] Build `/data/augmentation-plan.txt`
* [x] Add daemon-controlled buy policy
* [x] Add BitNode purchase strategies
* [x] Add weighted augmentation stat scoring
* [x] Add cheap-ready-first purchase logic
* [x] Add readiness gating
* [x] Add prerequisite validation
* [x] Add faction/theme scoring
* [x] Add cache rebuild after purchase
* [x] Add future-proof force-buy override
* [x] Add stale faction plan clearing after purchases
* [x] Add faction-work shutdown after augmentation purchases
* [x] Add manual refresh-augmentation-plans tool
* [x] Ignore NeuroFlux Governor during normal progression
* [x] Use joined factions as augmentation source validation
* [ ] Add augmentation batching strategy
* [ ] Add augmentation synergy scoring
* [ ] Add augmentation set planning
* [ ] Add augmentation ROI calculations
* [ ] Add install timing intelligence
* [ ] Add NeuroFlux scaling logic
* [ ] Add augmentation blacklist support
* [ ] Add augmentation whitelist support
* [ ] Add BitNode-specific augmentation templates
* [ ] Add faction rep grind planner
* [ ] Add augmentation shopping cart planner
* [ ] Add augmentation purchase forecasting
* [ ] Add money-vs-rep-vs-exp bottleneck intelligence
* [ ] Add augmentation progression phase scoring

# P6 — RESET PREP

* [x] Add allowAugmentPurchases policy
* [ ] Spending shutdown logic
* [ ] Share-maximization phase
* [ ] Stock liquidation planning
* [ ] Reset-prep orchestration
* [ ] Install readiness detection
* [ ] Augmentation threshold planning
* [ ] Future auto-install support
* [ ] Future post-install bootstrap handoff
* [ ] Daemon reset countdown state
* [ ] NeuroFlux dump phase
* [ ] Reset ROI analysis
* [ ] Post-reset automation sequencing

# P7 — OPTIONAL SYSTEMS

* [ ] Conditional stock trader
* [ ] Future Hacknet daemon module
* [x] Telemetry persistence/history
* [x] Target swap telemetry/history
* [x] Service failure telemetry/history
* [x] Telemetry deduplication layer
* [ ] Backdoor telemetry/history
* [ ] Phase transition telemetry/history
* [ ] Lane heatmaps
* [ ] Runtime analytics
* [ ] Dashboard event feed
* [ ] Share effectiveness analytics
* [ ] Faction reputation analytics
* [ ] Augmentation history tracking
* [ ] Batch failure analytics
* [ ] Money/sec historical tracking
* [ ] Augmentation purchase replay/history
* [ ] Full progression timeline
* [ ] Economic phase analytics
* [ ] RAM growth forecasting
* [ ] Strategic target scoring history
* [ ] Target ROI trend tracking
* [ ] Target lifetime analytics
* [ ] Service lifecycle analytics

````md
# CURRENT_PRIORITY_ORDER

1. Full daemon-owned strategic target authority
2. Backdoor telemetry/history
3. Faction intelligence refinement
4. Augmentation progression intelligence
5. Reset-prep intelligence
6. Telemetry/history expansion
7. EXP optimization cleanup
8. Dashboard/analytics cosmetics

# CURRENT_SERVICE_MANAGER_STATE

```txt
service-manager.js now supports:

- normalized service definitions
- policyFlag-based daemon policy gating
- stopWhenBlocked behavior
- duplicate process protection
- startup cooldown protection
- improved ns.exec failure diagnostics
- one-shot completion tracking
- telemetry-integrated service failures
- telemetry-integrated blocked-service history
- deduplicated telemetry throttling
- cooldown-aware service retry suppression
- policy-aware lifecycle stabilization
````

Current cooldown system:

```txt
FAILURE_CACHE implemented
30-second retry cooldown implemented
prevents infinite failed ns.exec spam loops
```

Current service policy architecture:

```txt
daemon policy is now the primary authority for:

- faction work
- faction donations
- faction joins
- augmentation purchases
- stock trading
- backdoor orchestration
```

Service registry now supports:

```txt
policyFlag
stopWhenBlocked
requiresSingularity
requiresTixApi
minMoney
minHomeRam
maxHomeRam
phase restrictions
```

# CURRENT_TARGET_STABILITY_STATE

```txt
target stability foundation implemented

daemon now tracks:
- targetSince
- targetStability
- blocked swaps
- target hold timers

manual --force-target overrides stability logic
```

Current hold timer:

```txt
5 minutes
```

Current limitation:

```txt
target proposals still partially come from target-service

daemon does not yet fully own strategic target generation
```

# CURRENT_TARGET_INTELLIGENCE_STATE

```txt
daemon-owned strategic target planning partially implemented

daemon now tracks:
- bestCandidate
- currentCandidate
- target scoring
- target stability
- target hold timers
- swap blocking
- target age
- strategic target reasons

implemented systems:
- target swap telemetry
- service failure telemetry
- telemetry deduplication
- strategic target scoring
- candidate comparison tracking

current limitations:
- target-service still partially authoritative
- multi-target orchestration not yet integrated
- scoring history persistence still limited
```

# CURRENT_BACKDOOR_STATE

```txt
backdoor intelligence foundation implemented

daemon now tracks:
- progression faction servers
- rooted state
- hacking eligibility
- backdoor status
- route paths
- next progression target

implemented systems:
- auto-pathfinding
- manual terminal route generation
- Singularity-aware backdoor execution
- daemon-integrated backdoor state
- progression-aware server tracking

verified:
- Singularity auto-backdoor execution works correctly
- route traversal works correctly
- missing future servers no longer crash daemon state
```

# CURRENT_ARCHITECTURE_DIRECTION

```txt
Early BN4:
money > exp

EXP exists to unlock:
- factions
- servers
- progression gates

Progression mode handles:
- faction joins
- faction work
- donations
- augment purchases
- future reset prep

Daemon should increasingly behave like:
a progression AI
not just a batch launcher
```

# CURRENT_SERVICE_ARCHITECTURE_DIRECTION

```txt
services are becoming deterministic daemon-managed infrastructure

goal:
daemon becomes the operating system
services become gated subsystems
UHM becomes pure execution engine
```

# CURRENT_IMPORTANT_ARCHITECTURE_RULES

```txt
UHM must NOT regain orchestration authority.

workers must remain execution-only.

service-manager owns lifecycle.

decision.js owns policy.

daemon owns strategic planning.

services.js remains declarative infrastructure only.
```

# CURRENT_MAJOR_TECHNICAL_WIN

```txt
daemon is no longer vulnerable to uncontrolled failed service spam loops during:
- RAM starvation
- missing requirements
- blocked policies
- failed exec attempts

service startup behavior is now stabilizing instead of recursively amplifying failures
```

```
```
