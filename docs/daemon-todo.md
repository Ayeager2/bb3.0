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
* [x] Reset-prep policy integration
* [x] Autonomous startup relaunch after augmentation install
* [x] NeuroFlux-safe pending augmentation detection
* [x] Shared augmentation scoring engine
* [x] Persistent darkweb purchase orchestration

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
* [ ] Add EXP ROI intelligence
* [ ] Add adaptive EXP lane balancing

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
* [ ] Bootstrap augmentation prioritization

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
* [ ] Add faction-to-augmentation synergy analysis

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
* [ ] Add augmentation-aware backdoor priorities

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
* [x] Create `/lib/daemon/augmentation-scoring.js`
* [x] Add reusable augmentation scoring engine
* [x] Add BitNode-aware augmentation scoring
* [x] Add pending augmentation scoring
* [x] Add high-impact augmentation detection
* [x] Add score-driven reset readiness
* [x] Add NeuroFlux-safe pending detection
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
* [ ] Add augmentation synergy trees
* [ ] Add progression acceleration analysis
* [ ] Add reset-value forecasting

# P6 — RESET PREP

* [x] Add allowAugmentPurchases policy
* [x] Add reset planner
* [x] Add reset executor service
* [x] Add reset readiness detection
* [x] Add score-driven reset gating
* [x] Add startup auto-relaunch after install
* [x] Add dry-run reset execution mode
* [x] Add manual armed reset protection
* [x] Add reset-prep policy integration
* [ ] Spending shutdown logic refinement
* [ ] Share-maximization phase
* [ ] Stock liquidation planning
* [ ] Reset-prep orchestration staging
* [ ] Install timing intelligence
* [ ] Augmentation threshold planning
* [ ] Full autonomous install execution
* [ ] Future post-install bootstrap handoff
* [ ] Daemon reset countdown state
* [ ] NeuroFlux dump phase
* [ ] Reset ROI analysis
* [ ] Post-reset automation sequencing
* [ ] Reset liquidation stage
* [ ] Reset finalization stage
* [ ] Autonomous reset timing intelligence

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
* [ ] Reset history analytics
* [ ] Augmentation synergy analytics
* [ ] Reset ROI historical analysis

# CURRENT_PRIORITY_ORDER

1. Full daemon-owned strategic target authority
2. Augmentation synergy scoring
3. Reset-prep staging system
4. Backdoor telemetry/history
5. Faction intelligence refinement
6. Telemetry/history expansion
7. Multi-target orchestration expansion
8. EXP optimization cleanup
9. Dashboard/analytics cosmetics

# CURRENT_SERVICE_MANAGER_STATE

```txt id="y8h05u"
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
- reset-prep aware service shutdown
- daemon-owned reset executor integration
```

Current cooldown system:

```txt id="7u6k2z"
FAILURE_CACHE implemented
30-second retry cooldown implemented
prevents infinite failed ns.exec spam loops
```

Current service policy architecture:

```txt id="y6i0kt"
daemon policy is now the primary authority for:

- faction work
- faction donations
- faction joins
- augmentation purchases
- stock trading
- backdoor orchestration
- reset-prep orchestration
- reset execution gating
```

Service registry now supports:

```txt id="v5dwwu"
policyFlag
stopWhenBlocked
requiresSingularity
requiresTixApi
minMoney
minHomeRam
maxHomeRam
phase restrictions
reset-prep shutdown behavior
```

# CURRENT_TARGET_STABILITY_STATE

```txt id="1ctjlwm"
target stability foundation implemented

daemon now tracks:
- targetSince
- targetStability
- blocked swaps
- target hold timers
- target proposal reasons
- strategic target scoring
```

manual --force-target overrides stability logic

Current hold timer:

```txt id="uw1t0l"
5 minutes
```

Current limitation:

```txt id="t30jz7"
target proposals still partially come from target-service

daemon does not yet fully own strategic target generation
```

# CURRENT_TARGET_INTELLIGENCE_STATE

```txt id="t90dr4"
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
- prep penalties
- weaken-time penalties
- target efficiency weighting
```

implemented systems:

```txt id="dofp4z"
- target swap telemetry
- service failure telemetry
- telemetry deduplication
- strategic target scoring
- candidate comparison tracking
- beginner-target escape logic
- proto multi-target planning
```

current limitations:

```txt id="mg9zwo"
- target-service still partially authoritative
- multi-target orchestration not yet integrated
- scoring history persistence still limited
- lane ROI analysis not yet implemented
```

# CURRENT_BACKDOOR_STATE

```txt id="hf5g6k"
backdoor intelligence foundation implemented

daemon now tracks:
- progression faction servers
- rooted state
- hacking eligibility
- backdoor status
- route paths
- next progression target
```

implemented systems:

```txt id="1g8rww"
- auto-pathfinding
- manual terminal route generation
- Singularity-aware backdoor execution
- daemon-integrated backdoor state
- progression-aware server tracking
```

verified:

```txt id="mrj9oz"
- Singularity auto-backdoor execution works correctly
- route traversal works correctly
- missing future servers no longer crash daemon state
```

# CURRENT_AUGMENTATION_INTELLIGENCE_STATE

```txt id="zq5d02"
augmentation intelligence foundation implemented

daemon now supports:
- reusable augmentation scoring
- BitNode-specific weighting
- strategic augmentation bonuses
- stat-category analysis
- pending augmentation scoring
- high-impact augmentation detection
- reset score evaluation
```

# CURRENT_RESET_PREP_STATE

```txt id="n7i1ui"
reset-prep intelligence foundation implemented

daemon now supports:
- reset planner
- reset executor
- autonomous startup relaunch
- score-driven reset readiness
- NeuroFlux-safe pending detection
- armed reset protection
- dry-run reset execution
```

# CURRENT_ARCHITECTURE_DIRECTION

```txt id="y6d2hu"
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
- reset prep
- future autonomous resets

Daemon should increasingly behave like:
a progression AI
not just a batch launcher
```

# CURRENT_SERVICE_ARCHITECTURE_DIRECTION

```txt id="3k6hwh"
services are becoming deterministic daemon-managed infrastructure

goal:
daemon becomes the operating system
services become gated subsystems
UHM becomes pure execution engine
workers remain execution-only
```

# CURRENT_IMPORTANT_ARCHITECTURE_RULES

```txt id="i0d4jw"
UHM must NOT regain orchestration authority.

workers must remain execution-only.

service-manager owns lifecycle.

decision.js owns policy.

daemon owns strategic planning.

services.js remains declarative infrastructure only.
```

Additional important rule:

```txt id="f4gh6l"
augmentation intelligence must remain centralized.

reset readiness must remain score-driven.

future AI systems should consume shared scoring/state layers
instead of duplicating progression logic.
```

# CURRENT_MAJOR_TECHNICAL_WIN

```txt id="v27jlwm"
daemon is no longer vulnerable to uncontrolled failed service spam loops during:
- RAM starvation
- missing requirements
- blocked policies
- failed exec attempts
- reset-prep transitions
- augmentation planning refreshes
```

service startup behavior is now:

```txt id="m84frc"
stabilizing instead of recursively amplifying failures
```

Additional major win:

```txt id="h0vwzo"
reset orchestration is now autonomous.

after augmentation installation:
startup.js relaunches daemon automatically.

manual keyboard interaction is no longer required after reset.
```
