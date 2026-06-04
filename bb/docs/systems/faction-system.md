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
```

Planned:

```txt id="9ev0l0"
- blocker analysis
- augmentation valuation
- reputation urgency
- money urgency
- faction-stage reasoning
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

# FUTURE faction-progression.js

Expected outputs:

```txt id="t9r9vc"
currentFactionStage
currentBlocker
nextBestAction
recommendedMode
requiredHackLevel
missingRep
missingMoney
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

# FUTURE DECISION FLOW

```txt id="jlwm2t"
Analyze current stage
    ->
Determine blocker
    ->
Recommend action
    ->
decision.js selects mode
```