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
* [x] Unified TOR + darkweb buyer
* [x] Persistent TOR ownership tracking
* [x] Darkweb purchase deduplication
* [x] Self-terminating darkweb buyer
* [x] Utility-first darkweb purchase ordering
* [x] API-fallback-safe darkweb purchasing
* [x] Local reserve-only darkweb spending model

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
* [x] Bootstrap daemon architecture
* [x] Tiny-worker rebuild pipeline
* [x] Automatic TOR/program bootstrap purchasing
* [x] Bootstrap home RAM auto-scaling
* [x] Bootstrap rooting pipeline
* [x] Bootstrap target scoring
* [x] Automatic bootstrap -> daemon readiness detection
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
* [x] Auto-toast + terminal notifications
* [ ] Daemon-owned backdoor orchestration
* [ ] Backdoor telemetry/history
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
* [ ] Pre-reset service drain/shutdown sequencing

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
* [ ] Telemetry-driven strategic decisions
* [ ] Historical target confidence scoring
* [ ] Failed target suppression
* [ ] Service reliability scoring
* [ ] Reset outcome analysis

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
