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
- money, EXP, and augmentation calculation payloads
- fallback estimates before Formulas.exe
- formulas-backed estimates after Formulas.exe
- stage-aware EXP policy
- structured progression action output
- background faction work during money mode
- augmentation timing score first pass
```

Planned:

```txt id="9ev0l0"
- augmentation timing threshold tuning
- faction-stage reasoning refinement
- dashboard rendering for calculation details
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
expPolicy
progressionAction
calculations.exp
calculations.money
calculations.augmentation
augmentationTiming
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

Current refinement:

```txt
expPolicy prevents blind pre-Red-Pill EXP grinding. EXP mode now activates
automatically only when the current progression blocker is a hacking level.
Post-Red-Pill EXP still targets w0r1d_d43m0n readiness.
```

Augmentation timing:

```txt
augmentationTiming compares augmentation value, missing reputation, missing
money, and cloud upgrade pressure. It recommends money-heavy,
background-faction, full-faction, donate-now, buy-now, or wait.
```

Next refinement:

```txt
Tune augmentationTiming thresholds from live daemon-state output.
```

Money mode note:

```txt
When a useful faction reputation plan exists, money mode may allow faction work
in the background. The daemon should not switch fully from money/income to
faction/progression until the basic server buildout gate is complete.
```
