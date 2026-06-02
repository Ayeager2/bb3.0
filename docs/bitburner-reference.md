# Bitburner Daemon Architecture Handoff

## Current State — Reset Intelligence & Augmentation Scoring Milestone

Date: June 2026

---

# Major Milestone Completed

The daemon has evolved beyond simple automation scripting into a true orchestration system with:

* lifecycle management
* strategic planning
* augmentation intelligence
* reset readiness analysis
* policy-driven progression
* persistent planning state

The architecture is now transitioning from:

```txt
automation scripts
```

toward:

```txt
AI-driven progression orchestration
```

The daemon is now responsible for:

* progression state
* service orchestration
* reset planning
* augmentation scoring
* spending policy
* target stability
* strategic execution priorities

UHM remains execution-only.

Workers remain execution-only.

---

# Current Architecture

```txt
daemon.js
    = orchestration brain

decision.js
    = strategic planning + policies

state.js
    = global state builder

service-manager.js
    = lifecycle engine

services.js
    = declarative registry

UHM
    = execution engine only

workers
    = execution-only scripts
```

---

# Major Systems Completed

# 1. Service Registry & Lifecycle Stabilization

Files:

```txt
/lib/daemon/services.js
/lib/daemon/service-manager.js
```

Completed:

* service normalization
* duplicate process protection
* startup cooldowns
* policy gating
* RAM gating
* Singularity gating
* lifecycle cleanup
* blocked-service auto-stop
* failed exec diagnostics

Result:

* daemon no longer enters recursive startup spam loops
* services stabilize automatically
* orchestration is now centralized

---

# 2. Global State Refactor

Files:

```txt
daemon.js
/lib/daemon/state.js
```

State now includes:

```txt
phase
target stability
session stats
telemetry
controller reasoning
share policy
multi-target policy
BN4 readiness
reset plan
augmentation state
```

This is now the foundation for:

* future AI planning
* telemetry history
* strategic target intelligence
* autonomous progression systems

---

# 3. Target Stability & Strategic Selection

Files:

```txt
/lib/daemon/target-intelligence.js
/tools/target-service.js
```

Completed:

* strategic money target scoring
* beginner target escape logic
* target hold timers
* target swap stabilization
* strategic target overrides

Daemon now avoids:

```txt
n00dles traps
foodnstuff traps
constant target thrashing
```

Current stability hold timer:

```txt
5 minutes
```

---

# 4. UHM Lane Architecture

Files:

```txt
/lib/uhm/lanes.js
/lib/uhm/runner.js
/lib/uhm/prep.js
```

Completed:

* multi-lane RAM allocation
* primary money lane
* secondary money lane
* EXP fallback lane
* prep orchestration
* proto-batching stabilization
* plan-too-large protection
* NO-RAM fallback behavior

Current RAM policy:

```txt
Primary Money: 75%
Secondary Money: 20%
EXP: 5%
```

Current lane architecture:

```txt
HIGH / MONEY
MID / SECONDARY
LOW / EXP
```

---

# 5. Darkweb Purchase Intelligence

Files:

```txt
/economy/darkweb-buyer-service.js
/data/darkweb-purchase-state.txt
```

Completed:

* state-driven purchase tracking
* persistent item ownership tracking
* purchase ordering
* affordability tracking
* automatic TOR purchase
* automatic program purchasing
* utility purchasing
* Formulas.exe tracking
* persistent purchase state

Current purchase model:

```txt
state-driven progression purchasing
```

instead of:

```txt
blind purchase attempts
```

Current tracked purchases:

```txt
TOR
BruteSSH
FTPCrack
relaySMTP
HTTPWorm
SQLInject
ServerProfiler
DeepscanV1
DeepscanV2
AutoLink
DarkscapeNavigator
Formulas.exe
```

---

# 6. Reset Planner System

Files:

```txt
/lib/daemon/reset-planner.js
/tools/reset-executor-service.js
```

Major milestone completed.

Current capabilities:

* pending augmentation detection
* NeuroFlux-safe pending tracking
* reset readiness scoring
* reset blockers
* reset arming
* startup auto-relaunch
* augmentation install orchestration
* dry-run safety mode

Current reset protections:

```txt
minimum augmentations
minimum score
minimum runtime
manual armed flag
```

Current reset flow:

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

---

# 7. Startup Auto-Relaunch

Files:

```txt
/startup.js
/tools/reset-executor-service.js
```

Completed:

```txt
installAugmentations("/startup.js")
```

Now after reset:

```txt
game restarts
    ->
startup.js launches daemon.js automatically
```

No manual keyboard interaction required after augmentation installs.

---

# 8. Augmentation Intelligence System

Files:

```txt
/lib/daemon/augmentation-scoring.js
/lib/daemon/augmentations.js
/lib/daemon/augmentation-decision.js
/tools/augmentation-status.js
/tools/augmentation-debug.js
```

This is now the beginning of true progression AI.

Completed:

* reusable augmentation scoring engine
* BitNode-specific weighting
* hacking-focused BN4 strategy
* stat category analysis
* strategic augmentation bonuses
* priority classification
* pending augmentation scoring
* high-impact augmentation detection
* reset score analysis

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

Current strategic weighting:

```txt
BN4 heavily favors:
- hacking
- hacking exp
- faction rep
```

Special strategic augmentation bonuses:

```txt
Red Pill
BitWire
Cranial
Synaptic
DataJack
Neurotrainer
```

---

# 9. NeuroFlux Handling Fix

Critical issue resolved.

Problem:

```txt
NeuroFlux Governor
```

was not appearing as pending after purchase because installed/purchased arrays matched names.

Solution:

```txt
count-based pending augmentation detection
```

Reset planner now correctly detects:

```txt
multiple NeuroFlux levels
```

as pending installs.

---

# Current Reset Planner Example

Current reset state now supports:

```json
{
  "pendingCount": 1,
  "pendingScore": 798,
  "highImpactScore": 798,
  "scoredPending": [...]
}
```

This is now score-driven rather than purely count-driven.

---

# Current Roadmap

# P0 — Augmentation Intelligence Expansion

Next major milestone.

Current system understands:

```txt
What augmentations exist
```

Next evolution:

```txt
Which augmentations are strategically valuable
```

Future goals:

* augmentation synergy scoring
* ROI-aware augmentation value
* progression acceleration analysis
* faction path optimization
* reset timing intelligence
* NeuroFlux scaling logic
* Red Pill priority escalation

---

# P1 — Reset-Prep Staging

Current reset flow is binary:

```txt
ready / not ready
```

Future:

```txt
reset-ready
reset-liquidation
reset-finalization
reset-execution
```

Future reset-prep goals:

* stock liquidation
* hash spending
* faction donation closure
* server purchase shutdown
* home RAM shutdown
* augmentation finalization
* strategic spend-down

---

# P2 — Telemetry Foundation

Needed before advanced AI behavior.

Add:

```txt
target swap history
service failure history
batch failure history
income spikes
phase transitions
share efficiency
augmentation purchase history
reset history
```

Persist to:

```txt
/data/telemetry/
```

---

# P3 — Backdoor Orchestration

Future daemon-owned progression automation.

Planned file:

```txt
/lib/daemon/backdoors.js
```

Responsibilities:

* faction progression servers
* pathfinding
* Singularity-aware automation
* auto-backdoor installation
* progression notifications

---

# P4 — Faction Spine Intelligence

Future progression spine:

```txt
CyberSec
-> NiteSec
-> Black Hand
-> BitRunners
-> Daedalus
```

Track:

* invites
* joins
* root access
* backdoors
* required hacking level
* augmentation value
* faction reputation
* favor
* reset readiness impact

---

# P5 — Multi-Target Orchestration Expansion

Current UHM is lane-aware.

Future:

* simultaneous high-value money targets
* dedicated prep lanes
* share lanes
* weighted lane balancing
* adaptive RAM allocation
* lane ROI analysis

Goal:

```txt
true distributed orchestration
```

---

# Current Stability Status

Current daemon state:

```txt
stable enough for long-session progression
```

Major infinite-loop risks have been reduced substantially.

Current strongest systems:

```txt
service-manager
augmentation intelligence
reset planner
state architecture
```

Most dangerous future complexity areas:

```txt
reset staging
telemetry persistence
multi-target balancing
faction AI
```

---

# Important Development Rules

## Keep daemon authoritative

Never move orchestration ownership back into:

* workers
* UHM
* helper scripts
* planners

---

## UHM remains execution-only

Do not move into UHM:

* progression logic
* reset logic
* augmentation logic
* faction logic
* strategic orchestration

UHM should only:

* execute lanes
* schedule batches
* coordinate timing

---

## Prefer telemetry before AI complexity

Before adding:

* autonomous resets
* faction AI
* dynamic multi-target balancing

first add:

* visibility
* telemetry
* historical analysis

Otherwise debugging future AI behavior becomes extremely difficult.

---

# Immediate Next Session Focus

Recommended next implementation order:

1. Augmentation synergy scoring
2. Reset-prep staging system
3. Target swap telemetry/history
4. Service failure telemetry
5. Backdoor orchestration scaffolding
6. Faction progression intelligence
7. True multi-target orchestration
8. Adaptive lane balancing

Current architecture direction is strong, scalable, and now approaching true autonomous progression orchestration.
