# CURRENT ACTIVE PRIORITIES

```txt
1. Faction-stage-driven progression intelligence
2. Stage-aware EXP caps:
   - pre-Red-Pill: level only as needed for faction progression
   - likely soft cap around 2500 before Red Pill
   - post-Red-Pill: push to 3000 for world daemon
3. Augmentation buying logic by faction stage
4. Better EXP target separation
5. Adaptive lane balancing / lane affordability
6. Formula-aware target telemetry polish
```

# COMPLETED RECENTLY

```txt
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
    no forced EXP overdrive

After Formulas:
    strategic daemon authority
    formula-aware scoring
    optional EXP overdrive
    stage-aware progression logic next
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
- stale share-worker cleanup
- phase/lane target blacklist system

Current remaining risk areas:
- lane affordability / adaptive lane balancing
- faction-stage progression intelligence
- augmentation buying timing
- adaptive EXP routing
- telemetry scaling
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
Create:
/lib/daemon/faction-progression.js
```

Goal:

```txt
currentFactionStage
currentBlocker
nextBestAction
```

Then wire into:

```txt
/lib/daemon/decision.js
```

Decision model:

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
Before Red Pill:
    do not blindly grind to 3000
    level only as needed for faction progression
    likely cap around 2500 unless a faction blocker requires more

After Red Pill:
    enter destroy-node / kill-node mode
    push hacking to 3000
    hack w0r1d_d43m0n
```
