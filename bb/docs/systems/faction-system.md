# FACTION SYSTEM

---

# PURPOSE

The faction system manages:

```txt id="15fxnr"
- progression stages
- faction advancement
- backdoor progression
- augmentation progression
- reputation goals
- progression blockers
```

---

# CURRENT STATUS

Implemented:

```txt id="h0s3tz"
- faction progression foundation
- backdoor retry logic
- progression-stage roadmap
- current stage detection
- blocker analysis for hacking, root/backdoor, faction join, Red Pill, world daemon
- recommendedMode emission for decision.js
```

Planned:

```txt id="9ev0l0"
- augmentation valuation
- reputation urgency
- money urgency
- faction-stage reasoning refinement
- stage-aware EXP caps
```

---

# TARGET PROGRESSION PATH

```txt id="7m0y6z"
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
```

---

# CURRENT faction-progression.js

Current outputs:

```txt id="t9r9vc"
currentFactionStage
currentBlocker
nextBestAction
recommendedMode
requiredHackLevel
targetFaction
targetServer
hasRedPill
```

---

# BLOCKER TYPES

Possible blockers:

```txt id="rzqitw"
HACK_LEVEL
BACKDOOR
FACTION_JOIN
REPUTATION
MONEY
AUGMENTATION
RED_PILL
WORLD_DAEMON
```

---

# CURRENT DECISION FLOW

```txt id="jlwm2t"
Analyze current stage
    ->
Determine blocker
    ->
Recommend action
    ->
decision.js selects mode
```

Next refinement:

```txt
Add augmentation valuation, missing reputation, missing money, and stage-aware
EXP caps so pre-Red-Pill leveling only happens when the current blocker needs it.
```
