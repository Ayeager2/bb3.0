# ROADMAP

lastUpdated: 2026-06

---

# PRIMARY STRATEGIC GOAL

Transform the daemon from:

```txt id="tzkz7x"
resource scheduler
```

into:

```txt id="yxsm1e"
progression-aware strategic automation AI
```

The daemon should eventually reason about:

```txt id="h1eiv7"
- progression blockers
- faction advancement
- augmentation ordering
- reset timing
- Singularity progression
- BitNode strategy
- resource allocation
- world-daemon readiness
```

---

# CURRENT PRIORITIES

```txt id="m1jlwm"
1. faction-stage progression intelligence
2. stage-aware EXP caps
3. augmentation timing logic
4. adaptive lane balancing
5. better EXP routing
6. telemetry scaling
```

---

# NEXT MAJOR SYSTEM

## faction-progression.js

Goal:

```txt id="4gbn5n"
Analyze:
- current faction stage
- progression blocker
- required action
- recommended mode
```

Expected outputs:

```txt id="4y1ft5"
currentFactionStage
currentBlocker
nextBestAction
recommendedMode
recommendedTarget
```

---

# FUTURE PROGRESSION MODEL

```txt id="7tuhlb"
CyberSec
    ->
NiteSec
    ->
The Black Hand
    ->
BitRunners
    ->
Daedalus
    ->
Red Pill
    ->
Destroy Node
```

Each stage should track:

```txt id="m5c8lx"
required hacking level
required backdoor
joined faction status
rep requirements
money requirements
useful augmentations
```

---

# FUTURE DECISION MODEL

Replace:

```txt id="vkg6ol"
money vs exp
```

with:

```txt id="hy7k9g"
What currently blocks progression?
```

Desired logic:

```txt id="ftj8g4"
If hacking blocked:
    mode = exp

Else if server not backdoored:
    mode = progression/backdoor

Else if faction not joined:
    mode = faction-join

Else if augmentations require reputation:
    mode = faction-work

Else if augmentations require money:
    mode = money

Else if augmentation affordable:
    mode = augmentation-buy

Else:
    advance progression stage
```

---

# ADAPTIVE LANE BALANCING

Future goals:

```txt id="d07cnr"
- lane affordability awareness
- target affordability refinement
- adaptive degradation
- lane saturation analysis
- RAM pressure balancing
- phase-aware budgeting
```

---

# TELEMETRY EXPANSION

Planned telemetry:

```txt id="e6ywte"
- mode switches
- phase switches
- target switches
- failed launches
- RAM starvation
- augmentation purchases
- faction progression
- reset readiness
- lane saturation
- share efficiency
```

---

# OVERLAY ROADMAP

## Phase 0

Stabilize daemon state contracts.

---

## Phase 1

Read-only F12 overlay.

Display:

* daemon state
* lanes
* services
* phase
* targets
* progression blockers

---

## Phase 2

Modular widgets.

Possible widgets:

```txt id="e3s3y7"
- daemon status
- lane visualization
- RAM allocation
- target intelligence
- faction progression
- augmentation planner
- reset planner
- telemetry feed
```

---

## Phase 3

Text-file command bridge.

Suggested control files:

```txt id="6hbr0l"
/data/control/daemon-command.txt
/data/control/force-mode.txt
/data/control/target-override.txt
/data/control/reset-armed.txt
```

---

## Phase 4

Safe overlay controls.

```txt id="2m4w2m"
- force mode
- force target
- toggle share
- pause services
- arm reset
- augmentation dry-run
```

---

# LONG-TERM GOALS

```txt id="7rj9n6"
- full Singularity automation
- augmentation optimization
- faction automation
- BitNode-specific strategy
- intelligent reset timing
- autonomous progression AI
- optional custom dashboard
- advanced telemetry analysis
```