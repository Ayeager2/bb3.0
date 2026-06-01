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

* [ ] Create `/lib/daemon/backdoors.js`
* [ ] Auto-pathfinding
* [ ] Faction server progression
* [ ] Backdoor eligibility detection
* [ ] Auto-terminal routing generation
* [ ] Auto-backdoor execution
* [ ] Daemon-owned backdoor orchestration
* [ ] Auto-toast + terminal notifications
* [ ] Future world daemon orchestration
* [ ] Integrate faction progression spine
* [ ] Add world_daemon routing preparation

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
* [ ] Telemetry persistence/history
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

# CURRENT_PRIORITY_ORDER

1. Faction intelligence refinement
2. Augmentation progression intelligence
3. Backdoor orchestration
4. Reset-prep intelligence
5. EXP optimization cleanup
6. Telemetry/history systems
7. Dashboard/analytics cosmetics

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
