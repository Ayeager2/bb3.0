# Bitburner Daemon — Active Handoff

*Last updated: June 2026*

---

# CURRENT ARCHITECTURE RULE

```txt
daemon = strategy / orchestration
UHM = execution engine only
workers = execution only
services = daemon-managed subsystems
```

Do not move progression, reset, faction, augmentation, or strategic target logic back into UHM or workers.

---

# CURRENT EXECUTION MODEL

```txt
daemon
    = orchestration brain

decision.js
    = policy authority

service-manager
    = lifecycle authority

target-intelligence.js
    = strategic target scoring

target-tiers.js
    = phase/lane target filtering

UHM
    = execution-only engine

workers
    = execution-only
```

---

# CURRENT RUNTIME STATE

The daemon now supports:

```txt
- service lifecycle management
- policy-gated services
- darkweb/TOR purchase completion tracking
- strategic target authority
- target stability timers
- formula-aware UHM batch planning
- formula-aware thread math
- formula-aware strategic target scoring
- multi-lane UHM execution
- share-aware lane budgeting
- best-effort prep degradation
- micro-batch degradation
- smarter EXP overdrive gating
- cleaner UHM dashboard
- reset planning framework
- augmentation scoring framework
- faction/backdoor automation foundation
- phase/lane-aware target blacklist filtering
- stale distributed share-worker cleanup
- EXP_RUNNING status handling
```

---

# COMPLETED RECENTLY

## Darkweb / Formulas

```txt
- Unified TOR + darkweb buyer is stable.
- Buyer is daemon-launched but self-managed.
- Buyer tracks persistent state in:
    /data/darkweb-purchase-state.txt

- Buyer writes completion marker:
    /data/darkweb-buyer-complete.txt

- Service manager respects completionFile.
- Formulas.exe purchase now unlocks formula-era behavior.
- Server purchases are capped before Formulas.exe to avoid runaway cloud spending.
```

---

## UHM Formula Era

UHM now has a dual path:

```txt
Before Formulas.exe:
    legacy math
    affordable fallback targeting

After Formulas.exe:
    formula-aware timing
    formula-aware thread math
    formula-aware daemon target authority
```

Implemented in:

```txt
/lib/uhm/batch.js
/controllers/uhm.js
/lib/uhm/targets.js
/lib/uhm/prep.js
/lib/uhm/dashboard.js
/lib/daemon/state.js
/lib/daemon/target-intelligence.js
/lib/daemon/targets.js
/lib/daemon/target-tiers.js
```

---

## Phase / Lane Target Intelligence

Completed:

```txt
- phase-aware target blacklist system
- lane-aware target filtering
- strategic daemon target authority
- formula-era lane orchestration split
- daemon-owned lane targets
```

Current target pipeline:

```txt
phase
    ->
lane
    ->
allowed target tiers
    ->
candidate filtering
    ->
strategic scoring
    ->
lane assignment
```

This replaced the older:

```txt
mode + hacking-level heuristic filtering
```

system.

---

## Share Worker Cleanup

Fixed:

```txt
stale distributed share workers
```

Issue:

```txt
share cleanup only killed home workers
cloud/server share workers stayed alive forever
consumed all execution RAM
caused false NO_RAM failures
```

Now:

```txt
/lib/daemon/control.js
```

cleans stale distributed share workers across:

```txt
home
purchased servers
cloud servers
rooted servers
```

Current ownership model:

```txt
daemon/control.js
    = stale worker cleanup authority

UHM/share.js
    = distributed share execution authority
```

---

## EXP Overdrive Status Fix

Fixed:

```txt
false NO_RAM status
```

Issue:

```txt
EXP workers already running
launcher launched 0 new workers
dashboard incorrectly displayed NO_RAM
```

Now:

```txt
EXP_OVERDRIVE
    = newly launched workers

EXP_RUNNING
    = workers already active

NO_RAM
    = truly unable to launch
```

---

# CURRENT ACTIVE PRIORITIES

```txt
1. Augmentation buying logic by faction stage
2. Better EXP target separation
3. Adaptive lane balancing / lane affordability
4. Formula-aware target telemetry polish
```

---

# CURRENT FORMULAS TRANSITION STATUS

```txt
Completed:
- formula-aware thread math
- formula-aware weaken timing
- formula-aware target scoring
- formulas-aware dashboard telemetry
- formulas-aware lane planning
- pre/post formulas orchestration split
- formula-era daemon target authority
- phase/lane target blacklist filtering

Current rule:

Before Formulas:
    affordable bootstrap fallback behavior
    no forced EXP overdrive

After Formulas:
    strategic daemon authority
    formula-aware scoring
    optional EXP overdrive
    stage-aware progression foundation active
    stage-aware EXP caps active
    next: refine augmentation timing
```

---

# CURRENT STABILIZATION STATUS

```txt
Stable:
- service-manager lifecycle system
- darkweb purchasing
- purchased server scaling
- daemon-owned lane targets
- EXP overdrive gating
- EXP_RUNNING status reporting
- target stability
- reset planner foundation
- faction progression foundation
- stale share-worker cleanup
- phase/lane target blacklist system

Current remaining risk areas:
- lane affordability / adaptive lane balancing
- faction-stage progression refinement
- augmentation buying timing
- adaptive EXP routing
- telemetry scaling
- dashboard reasoning bridge constants
```

---

# CURRENT KNOWN WATCH POINTS

## 1. Early Game

After any change touching UHM mode logic, verify early game does not collapse into:

```txt
all servers running only exp-weaken.js
```

If that happens, inspect:

```txt
shouldForceExpMode()
```

inside:

```txt
/controllers/uhm.js
```

---

## 2. Target Authority

Before Formulas.exe:

```txt
UHM may use affordable fallback targets.
```

After Formulas.exe:

```txt
UHM should respect daemon lane targets.
Use micro/proto fallback instead of junk-target swapping.
```

---

## 3. Share Worker Cleanup

Verify:

```txt
sharePolicy.enabled false
```

correctly removes:

```txt
/workers/share-worker.js
```

from:

```txt
home
cloud servers
rooted servers
```

Otherwise stale share workers can silently consume all RAM.

---

## 4. Lane Affordability

Current remaining weakness:

```txt
strategic target chosen
but lane may not afford ideal batch plan
```

Future improvement:

```txt
lane-aware affordable target refinement
adaptive lane degradation
```

---

# CURRENT PROGRESSION MODEL (NEXT MAJOR FEATURE)

The daemon should stop asking:

```txt
Should I do money or EXP?
```

and start asking:

```txt
What is the next faction/augmentation goal,
and what currently blocks it?
```

---

# FUTURE FACTION-STAGE MODEL

```txt
CyberSec
    ->
NiteSec
    ->
The Black Hand
    ->
BitRunners
    ->
Daedalus / Red Pill
    ->
Destroy Node
```

Each stage should track:

```txt
required hacking level
required backdoor
joined faction status
useful augmentations remaining
reputation requirements
money requirements
```

---

# FUTURE BLOCKER-BASED DECISION MODEL

```txt
If hacking level blocks progression:
    mode = exp

Else if server not backdoored:
    mode = progression/backdoor

Else if faction not joined:
    mode = progression/faction-join

Else if useful augmentations need reputation:
    mode = faction work

Else if useful augmentations need money:
    mode = money

Else if useful augmentation affordable:
    mode = augmentation buying

Else:
    advance to next faction stage
```

---

# UPDATED EXP RULE

```txt
Before Red Pill:
    do not blindly grind to 3000
    level only as needed for faction progression
    likely soft cap around 2500

After Red Pill:
    enter destroy-node / kill-node mode
    push hacking to 3000
    hack w0r1d_d43m0n
```

---

# NEXT CODING TASK

Refine:

```txt
/lib/daemon/faction-progression.js
/lib/daemon/decision.js
/lib/daemon/state.js
```

Goal:

```txt
augmentation timing by faction stage
money vs reputation urgency
dashboard rendering for progression calculations
```

Already implemented and wired:

```txt
currentFactionStage
currentBlocker
nextBestAction
recommendedMode
calculations.exp
calculations.money
calculations.augmentation
expPolicy
progressionAction
```

---

# FUTURE HUD ADDITIONS

Add to daemon HUD:

```txt
Current faction stage
Current blocker
Next best action
Useful augmentation target
Current progression bottleneck
```

---

# QUICK DEBUG COMMANDS

```txt
killall
run daemon.js
tail /controllers/uhm.js
cat /data/daemon-state.txt
ps
```

Manual EXP overdrive test:

```txt
killall
run /controllers/uhm.js --overdrive
```

Normal daemon test:

```txt
killall
run daemon.js
```
