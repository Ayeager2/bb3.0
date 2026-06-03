# Bitburner Daemon — Architecture Archive

_Last updated: June 2026_

This archive preserves completed architecture milestones and background context. Keep the active handoff lean; move older completed sections here.

---

## Architecture Direction

The project evolved from isolated automation scripts into daemon-owned orchestration.

```txt
Old:
    helper scripts make local decisions

New:
    daemon owns strategy
    services obey daemon policy
    UHM executes lanes
    workers execute actions
```

Core rule:

```txt
Do not move strategic authority back into UHM, workers, helper scripts, or one-off planners.
```

---

## Core File Roles

```txt
daemon.js
    main orchestration loop

/lib/daemon/decision.js
    policy and progression decisions

/lib/daemon/state.js
    global daemon state builder

/lib/daemon/services.js
    declarative service registry

/lib/daemon/service-manager.js
    service lifecycle engine

/lib/daemon/target-intelligence.js
    strategic target scoring and stability

/lib/daemon/targets.js
    operational reusable target helpers

/controllers/uhm.js
    execution controller

/lib/uhm/batch.js
    batch planning and launch reservation

/lib/uhm/runner.js
    lane execution

/lib/uhm/lanes.js
    lane construction

/lib/uhm/prep.js
    target prep execution

workers
    execution-only scripts
```

---

## Service Manager Milestone

Implemented:

- normalized service definitions
- policyFlag-based daemon policy gating
- stopWhenBlocked behavior
- duplicate process protection
- startup cooldown protection
- improved ns.exec failure diagnostics
- one-shot completion tracking
- completionFile lifecycle gates
- telemetry-integrated service failures
- telemetry-integrated blocked-service history
- deduplicated telemetry throttling
- cooldown-aware service retry suppression
- policy-aware lifecycle stabilization
- reset-prep aware shutdown behavior

Current service policy authority includes:

```txt
faction work
faction donations
faction joins
augmentation purchases
stock trading
backdoor orchestration
reset execution
darkweb completion
server purchases
home RAM
home cores
```

Major win:

```txt
daemon is no longer vulnerable to uncontrolled failed service spam loops
```

---

## Darkweb Buyer Milestone

Completed:

- unified TOR + darkweb buyer
- removed competing exe-buyer flow
- daemon launches buyer only
- buyer owns purchase logic
- local reserve model
- persistent purchase state
- persistent TOR ownership tracking
- duplicate purchase suppression
- API fallback safety
- self-terminating completion behavior
- service manager completion file gate

Files:

```txt
/economy/darkweb-buyer-service.js
/data/darkweb-purchase-state.txt
/data/darkweb-buyer-complete.txt
/lib/daemon/services.js
/lib/daemon/service-manager.js
```

Tracked purchases:

```txt
TOR
BruteSSH.exe
FTPCrack.exe
relaySMTP.exe
HTTPWorm.exe
SQLInject.exe
ServerProfiler.exe
DeepscanV1.exe
DeepscanV2.exe
AutoLink.exe
DarkscapeNavigator.exe
Formulas.exe
```

Important behavior:

```txt
Purchased state never downgrades.
The buyer exits once everything is owned.
The daemon does not relaunch it after completion.
```

---

## Cloud / Formulas Economy Milestone

Before Formulas.exe:

```txt
cloud server scaling is allowed
but expensive single upgrades are capped
```

After Formulas.exe:

```txt
cloud upgrade cap is removed
formula-era targeting and batch math become available
```

Primary files:

```txt
/economy/server-purchaser-service.js
/lib/daemon/server-purchases.js
```

Intent:

```txt
Do not starve cloud growth for Formulas.exe.
Do not let cloud growth delay Formulas.exe forever.
```

---

## Target Intelligence Milestone

Completed:

- strategic money target scoring
- beginner-target escape
- target hold timer
- target stability metadata
- target swap blocking
- candidate ranking
- daemon-published laneTargets
- progression-stage target tiers
- secondary target beginner-trash filtering
- formula-aware strategic scoring first pass

Files:

```txt
/lib/daemon/target-intelligence.js
/lib/daemon/targets.js
/lib/daemon/target-tiers.js
/tools/target-service.js
```

Current hold timer:

```txt
5 minutes
```

Known limitation:

```txt
target-service still exists as a passive observer / compatibility layer
```

---

## UHM Lane Architecture Milestone

Completed:

- primary money lane
- secondary money lane
- EXP lane
- share-aware lane budgeting
- daemon-published lane target consumption
- target authority split:
  - pre-Formulas: affordable fallback allowed
  - post-Formulas: daemon targets respected
- plan-too-large protection
- micro-batch degradation
- best-effort prep degradation
- compact dashboard

Files:

```txt
/controllers/uhm.js
/lib/uhm/lanes.js
/lib/uhm/targets.js
/lib/uhm/runner.js
/lib/uhm/batch.js
/lib/uhm/prep.js
/lib/uhm/dashboard.js
```

---

## Formula-Aware UHM Milestone

Implemented:

### Daemon state

```txt
formulasUnlocked
```

Added in:

```txt
/lib/daemon/state.js
```

### UHM propagation

```txt
daemonState.formulasUnlocked
    ->
lane.formulasUnlocked
    ->
getBatchPlan(..., { formulasUnlocked })
```

### Formula-aware timing

Uses:

```txt
ns.formulas.hacking.hackTime
ns.formulas.hacking.growTime
ns.formulas.hacking.weakenTime
```

Fallback:

```txt
ns.getHackTime
ns.getGrowTime
ns.getWeakenTime
```

### Formula-aware thread math

Uses:

```txt
ns.formulas.hacking.hackPercent
ns.formulas.hacking.growThreads
```

Fallback:

```txt
ns.hackAnalyzeThreads
ns.growthAnalyze
```

Safety condition:

```js
options.formulasUnlocked === true &&
ns.fileExists("Formulas.exe", "home") &&
!!ns.formulas?.hacking
```

---

## EXP Overdrive Safety Milestone

Problem fixed:

```txt
daemon mode=exp caused every server to run only exp-weaken.js
```

New behavior:

```txt
Manual --overdrive:
    always allowed

Auto forced EXP:
    requires Formulas.exe
    requires daemon mode exp
    requires darkweb completion
    requires non-bootstrap
    blocks upgrade priority
    requires spendable money
    stops at hacking target
```

Primary file:

```txt
/controllers/uhm.js
```

Key helper:

```txt
shouldForceExpMode()
```

---

## Reset Planner Milestone

Completed:

- pending augmentation detection
- NeuroFlux-safe pending tracking
- score-driven reset readiness
- reset blockers
- reset arming
- startup auto-relaunch
- augmentation install orchestration
- dry-run safety mode

Files:

```txt
/lib/daemon/reset-planner.js
/tools/reset-executor-service.js
/startup.js
```

Reset flow:

```txt
reset planner
    ->
decision.js enters reset-prep
    ->
spending locks down
    ->
executor installs augmentations
    ->
startup.js relaunches daemon
```

Protections:

```txt
minimum augment count
minimum augment score
minimum runtime
manual armed flag
dry-run default
```

---

## Augmentation Intelligence Milestone

Completed:

- reusable augmentation scoring engine
- BitNode-specific weighting
- hacking-focused BN4 strategy
- stat category analysis
- strategic augmentation bonuses
- priority classification
- pending augmentation scoring
- high-impact augmentation detection
- reset score analysis
- NeuroFlux count-based pending detection

Files:

```txt
/lib/daemon/augmentation-scoring.js
/lib/daemon/augmentations.js
/lib/daemon/augmentation-decision.js
/tools/augmentation-status.js
/tools/augmentation-debug.js
```

Current scoring categories:

```txt
hacking
hacking_exp
faction_rep
money
company_rep
charisma
combat
crime
hacknet
bladeburner
misc
```

BN4 strongly favors:

```txt
hacking
hacking_exp
faction_rep
```

Strategic bonuses include:

```txt
Red Pill
BitWire
Cranial
Synaptic
DataJack
Neurotrainer
```

---

## Backdoor / Faction Foundation

Completed:

- progression faction server tracking
- rooted state
- hacking eligibility
- backdoor status
- pathfinding
- route generation
- Singularity-aware backdoor execution
- daemon-integrated backdoor state
- missing future server safety

Future direction:

```txt
daemon-owned faction spine orchestration
```

Faction spine:

```txt
CyberSec
-> NiteSec
-> The Black Hand
-> BitRunners
-> Daedalus
```

---

## Telemetry Foundation

Completed:

- basic telemetry counts
- service failure telemetry
- blocked service telemetry
- target swap telemetry
- deduped telemetry throttling

Future:

```txt
/data/telemetry/
```

Should eventually track:

- target ROI history
- lane performance
- service reliability
- phase transitions
- reset outcomes
- augmentation purchase history
- income/sec history
- batch failure history

---

## Archived Roadmap

```txt
1. Formula-aware candidate display / telemetry
2. Adaptive prep throughput scaling
3. Formula-aware ROI per RAM
4. Formula-aware lane budget policy
5. Target history / ROI persistence
6. Augmentation synergy scoring
7. Reset-prep staging
8. Backdoor/faction telemetry
9. Faction progression intelligence
10. True multi-target orchestration
11. Adaptive lane balancing
12. Dashboard/analytics cosmetics
```

---

## Development Rules

```txt
daemon owns strategy
decision.js owns policy
state.js owns global state
service-manager owns lifecycle
services.js remains declarative
UHM executes only
workers execute only
telemetry before complex AI
```

# FORMULAS TRANSITION MILESTONE

Major architecture transition completed:

```txt
PRE-FORMULAS ERA
    ->
FORMULAS-AWARE ORCHESTRATION ERA
```

Completed systems:

```txt
- formula-aware batch thread math
- formula-aware weaken timing
- formula-aware strategic target scoring
- formula-aware lane planning
- formulas-aware dashboard telemetry
- strategic daemon target authority
- affordable fallback preservation
- forced EXP overdrive gating
```

Key stabilization lesson:

```txt
pre-formulas progression cannot use the same orchestration rules
as post-formulas orchestration.

early-game bootstrap requires:
- affordable targets
- money snowball preservation
- no forced all-RAM EXP behavior

post-formulas progression can support:
- strategic authority
- advanced target scoring
- formula-aware ROI logic
- adaptive lane orchestration
```

Important architectural outcome:

```txt
daemon intelligence is now phase-aware.

progression phase now materially changes:
- targeting behavior
- EXP orchestration
- lane behavior
- RAM allocation logic
- target fallback behavior
```

This was the first major transition from:

```txt
generic automation
```

toward:

```txt
context-aware orchestration intelligence
```
