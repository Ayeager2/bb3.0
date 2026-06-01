# Bitburner Daemon Architecture Handoff

## Current State — Daemon Cleanup Milestone

Date: June 2026

---

# Major Milestone Completed

Core daemon orchestration cleanup and lifecycle stabilization are now largely complete.

The architecture is transitioning from:

* script-driven orchestration
  to:
* daemon-owned orchestration and policy control.

The daemon is now the authoritative controller for:

* progression state
* policy decisions
* service gating
* lifecycle management
* strategic execution planning

UHM remains the execution engine only.

Workers remain execution-only scripts.

---

# Completed Systems

## 1. Service Registry Cleanup

File:

```txt
/lib/daemon/services.js
```

Completed:

* duplicate registry cleanup
* policyFlag support
* stopWhenBlocked support
* daemon-controlled gating
* faction-related service separation
* augmentation buyer gating

Important gated services:

```txt
stock-trader          -> allowStockTrading
faction-work          -> allowFactionWork
faction-donation      -> allowFactionDonation
faction-join          -> allowFactionJoin
augmentation-buyer    -> allowAugmentPurchases
```

Architecture intent:

* registry defines WHAT exists
* daemon policy defines WHAT is allowed
* service-manager controls WHEN services run

---

## 2. Service Manager Cleanup

File:

```txt
/lib/daemon/service-manager.js
```

Completed:

* service normalization before execution
* startup validation:

  * script existence
  * Singularity requirements
  * RAM requirements
  * money requirements
  * phase requirements
  * policy requirements
* failed exec diagnostics
* 30-second cooldown after failed starts
* duplicate process cleanup
* blocked-service auto-stop support

Result:

* daemon no longer enters RAM starvation spam loops
* failed services self-stabilize instead of recursively retrying forever

---

## 3. Global State Refactor

Files:

```txt
daemon.js
/lib/daemon/state.js
```

daemon.js now delegates state creation to:

```txt
buildGlobalState()
```

Restored richer daemon state:

```txt
phase
target stability
targetSince
multiTargetPolicy
sharePolicy
sessionStats
telemetry
controllerReason
bootstrapStatus
```

This is now the foundation for:

* telemetry
* dashboard evolution
* strategic planning
* long-term automation memory

---

## 4. Target Stability Foundation

Initial stabilization logic added.

Current behavior:

* --force-target bypasses stability
* daemon tracks target lifetime
* minimum target hold timer exists
* blocked swaps are possible
* stability info written to daemon state

Current hold time:

```txt
5 minutes
```

Purpose:

* prevent target thrashing
* improve lane efficiency
* improve batch consistency
* stabilize prep/income cycles

Future evolution:

* proposed target generation
* swap telemetry
* target lifetime history
* blocked swap history
* ROI-aware stability weighting

---

## 5. Decision / Policy Cleanup

File:

```txt
/lib/daemon/decision.js
```

Completed:

* faction work separated from donation logic
* augmentation buying separated from progression work
* reset gating stabilized

Current policy relationships:

```txt
allowFactionWork       <- shouldWorkFaction
allowFactionDonation   <- shouldDonateFaction
allowAugmentPurchases  <- shouldBuyAugment
```

Important:

```txt
allowReset
```

is blocked while:

* faction work
* donation
* augmentation buying
  are active.

This prevents premature resets during progression actions.

---

## 6. Phase Cleanup

File:

```txt
/lib/daemon/phase.js
```

Completed:

* recognizes modern "progression" priority
* no longer tied only to old "faction" terminology

Impact:

* share policy responds correctly
* lane budgeting responds correctly
* progression-aware orchestration now behaves consistently

---

# Current Architecture Direction

## Final Direction

```txt
daemon
    = orchestration brain

service-manager
    = lifecycle engine

services.js
    = service registry

decision.js
    = policy/mode/planning brain

state.js
    = global state builder

UHM
    = execution engine only

workers
    = execution-only scripts
```

Important rule:

```txt
DO NOT move orchestration logic back into UHM.
```

UHM should never become:

* policy brain
* progression controller
* lifecycle manager
* strategic planner

It should only:

* execute lanes
* schedule batches
* coordinate execution timing

---

# Current High Priority Roadmap

## P0 — Strategic Target Intelligence

Next major milestone.

Daemon should evolve from:

```txt
"choose best target right now"
```

to:

```txt
"maintain strategic target plans over time"
```

Goals:

* daemon-owned target proposal system
* ROI-aware target scoring
* target lifetime telemetry
* target confidence/stability weighting
* swap reasoning
* prep/income balance analysis

---

## P1 — Telemetry Foundation

Needed before advanced AI behavior.

Add:

```txt
service failure counts
blocked service history
target swap history
phase transition history
share efficiency history
income spikes
batch failure ratios
```

Persist useful telemetry to:

```txt
/data/telemetry/
```

---

## P2 — Backdoor Orchestration

Daemon-owned progression automation.

Future:

```txt
/lib/daemon/backdoors.js
```

Responsibilities:

* faction server progression tracking
* root eligibility detection
* Singularity-aware automation
* pathfinding
* auto-backdoor installation
* progression notifications

Persistent controllers should eventually disappear.

---

## P3 — Faction Progression Intelligence

Future daemon faction spine:

```txt
CyberSec
-> NiteSec
-> Black Hand
-> BitRunners
-> Daedalus
```

Track:

* joined
* invited
* rooted
* backdoored
* required hacking level
* required port openers
* augmentation value
* rep progress
* favor

---

## P4 — Reset-Prep Planner

Daemon-controlled reset planning.

Future goals:

* augmentation timing
* donation timing
* stock liquidation
* faction shutdown prep
* share prioritization
* reset readiness scoring

Eventually:

```txt
daemon decides WHEN to reset
```

---

## P5 — Multi-Target Lane Intelligence

Current UHM is still mostly target-centric.

Future:

* simultaneous money targets
* prep lane isolation
* EXP lanes
* share lanes
* weighted RAM allocation
* dynamic lane balancing

Goal:
true distributed orchestration.

---

# Current Stability Status

Current daemon state:

```txt
stable enough for long-session progression testing
```

Major infinite-loop risks have been reduced substantially.

Most dangerous remaining areas:

* strategic target swapping
* future telemetry persistence growth
* future multi-target RAM balancing
* reset-prep orchestration

---

# Important Development Rules

## Keep daemon authoritative

Do not allow:

* controllers
* planners
* workers
  to regain orchestration ownership.

---

## Service registry remains declarative

services.js should define:

```txt
what exists
```

not:

```txt
how strategy works
```

---

## Keep UHM execution-focused

Do not embed:

* progression logic
* faction strategy
* stock strategy
* reset planning
  inside UHM.

---

## Prefer telemetry before automation complexity

Before adding:

* autonomous resets
* advanced faction AI
* dynamic multi-target balancing

first add:

* visibility
* telemetry
* historical tracking

Otherwise debugging becomes impossible later.

---

# Immediate Next Session Focus

Recommended next implementation order:

1. Target swap telemetry
2. Strategic target proposal system
3. Service failure telemetry/history
4. Backdoor orchestration scaffolding
5. Faction progression intelligence
6. Reset-prep planning system
7. Multi-target orchestration expansion

Current project direction is strong and scalable.
