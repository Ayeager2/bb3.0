# CURRENT ACTIVE PRIORITIES

```txt
1. Stage-aware progression calculations:
   - money and EXP requirements are part of faction progression state
   - calculation source is marked as fallback or Formulas.exe-backed
2. Economy-first cloud buildout:
   - cloud fleet server slot completion comes before EXP grinding
   - RAM upgrades now use time-aware balancing instead of forcing EXP to 0 forever
   - once all cloud slots are full, money stays favored while EXP keeps a lane unless the next upgrade is affordable now
3. Augmentation buying logic by faction stage
4. Better EXP target separation
5. Formula-aware target telemetry polish
```

# COMPLETED RECENTLY

```txt
- Faction progression foundation created:
  - /lib/daemon/faction-progression.js
  - emits currentFactionStage/currentBlocker/nextBestAction/recommendedMode
  - includes calculations.exp, calculations.money, calculations.augmentation
  - uses fallback estimates before Formulas.exe and formulas-backed estimates after
  - wired into /lib/daemon/decision.js
  - exposed in /lib/daemon/state.js
  - copied into dashboard state as progression.faction/factionProgression

- Economy-first cloud fleet gate added:
  - /lib/daemon/cloud-fleet.js reports count/RAM max status
  - decision.js keeps mode/priority on money while server slots are missing or the next cloud action is immediately affordable
  - state.js gives money lanes 100% of lane RAM while cloud server slots are incomplete
  - when all slots are full but RAM upgrades remain, state.js uses time-aware money/EXP lane balancing
  - /data/daemon-state.txt includes cloudEconomyTiming for the next cloud action cost and estimated timing
  - dashboard state exposes servers.cloudFleet
  - manual daemon overrides can bypass this, including run daemon.js --level

- Stage-aware EXP caps added:
  - factionProgression.expPolicy says whether EXP is useful right now
  - factionProgression.progressionAction exposes the current blocker/action pair
  - decision.js uses expPolicy before entering automatic EXP mode
  - pre-Red-Pill leveling only happens for an active hacking blocker
  - post-Red-Pill leveling still targets w0r1d_d43m0n readiness
  - dashboard state exposes expPolicy and progressionAction

- Progression-stage target blacklist system
- Phase/lane-aware target filtering
- Daemon-owned lane target authority
- Stale distributed share-worker cleanup
- EXP overdrive false NO_RAM status fix
- EXP_RUNNING status added for active EXP workers
- Share worker cleanup now kills stale workers across home/cloud/rooted hosts
- Darkweb buyer stale completion bug fixed:
  - live state now overrides TXT state
  - stale completion marker removed when items are missing
  - runtime state file cleaned on verified completion

- Backdoor progression service now retries rooting continuously:
  - progression servers are rooted before backdoor readiness check
  - fixed stall where unrooted faction servers never became recommended
```

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
- phase/lane-aware target blacklist filtering

Current rule:
Before Formulas:
    affordable bootstrap fallback behavior
    fallback money/EXP estimates in faction progression
    no forced EXP overdrive

After Formulas:
    strategic daemon authority
    formula-aware scoring
    formulas-backed money/EXP estimates in faction progression
    optional EXP overdrive
    stage-aware progression logic foundation active
    stage-aware EXP caps active
    next: refine augmentation timing
```

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
- progression money/EXP calculation payload
- economy-first cloud fleet gate
- time-aware cloud RAM upgrade balancing
- stage-aware EXP caps
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

# NEXT MAJOR CODING TASK

```txt
Refine augmentation timing across:
/lib/daemon/faction-progression.js
/lib/daemon/decision.js
/lib/daemon/state.js
```

Goal:

```txt
- Daedalus/Red Pill augmentation timing
- money vs reputation vs join/backdoor recommendations using calculations
- richer dashboard rendering for progression calculations
```

Current implementation already provides:

```txt
currentFactionStage
currentBlocker
nextBestAction
recommendedMode
targetFaction
targetServer
requiredHack
calculations.exp
calculations.money
calculations.augmentation
expPolicy
progressionAction
```

Target decision model:

```txt
If next faction stage is hacking-level blocked:
    mode = exp

Else if required server is not backdoored:
    mode = progression/backdoor

Else if faction is not joined:
    mode = progression/faction-join

Else if useful augmentations need reputation:
    mode = progression/faction-work

Else if useful augmentations need money:
    mode = money

Else if useful augmentation is affordable:
    mode = buy-augmentation

Else:
    advance to next faction stage
```

# WATCH POINT FOUND IN CURRENT CODE

```txt
bb-dashboard-bridge/bridge.js references:
OUT_REASONING_FILE
BITBURNER_REASONING_FILE

Those constants should be verified/defined before relying on:
/reasoning
pollDaemonReasoning()
```

# UPDATED PROGRESSION MODEL

```txt
CyberSec
    -> NiteSec
        -> The Black Hand
            -> BitRunners
                -> Daedalus / Red Pill
                    -> Destroy Node
```

# UPDATED EXP RULE

```txt
Manual override:
    run daemon.js --level forces mode=exp and priority=leveling
    run daemon.js --leveling does the same thing
    run daemon.js --exp does the same thing
    --force-mode leveling is normalized to exp
    --force-priority exp is normalized to leveling
    run daemon.js --force-mode exp remains supported

Before Red Pill:
    do not blindly grind to 3000
    level only as needed for faction progression
    likely cap around 2500 unless a faction blocker requires more

After Red Pill:
    enter destroy-node / kill-node mode
    push hacking to 3000
    hack w0r1d_d43m0n
```
