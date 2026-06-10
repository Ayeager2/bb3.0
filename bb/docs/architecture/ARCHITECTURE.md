# ARCHITECTURE

---

# CORE PHILOSOPHY

```txt
daemon decides
UHM executes
workers obey
services self-manage through policy + lifecycle
```

The daemon is the orchestration layer.

Execution systems should remain dumb.

---

# SYSTEM RESPONSIBILITIES

## daemon.js

Primary orchestration loop.

Owns:

* strategic mode selection
* phase progression
* target authority
* service policy
* reset planning
* state generation

---

## decision.js

Strategic reasoning authority.

Determines:

* current mode
* progression priorities
* strategic posture
* spending policy
* faction direction
* reset readiness

Consumes:

* faction progression state
* target intelligence
* augmentation analysis

---

## service-manager.js

Lifecycle authority.

Responsible for:

* starting services
* stopping blocked services
* completion-file gating
* cooldowns
* duplicate prevention
* daemon policy enforcement

---

## UHM

Execution engine only.

Responsible for:

* launching batches
* weaken/grow/hack execution
* RAM usage
* thread planning
* timing

UHM should NOT own:

* progression
* faction logic
* augmentation strategy
* lifecycle authority

---

## workers/

Pure execution scripts.

No strategic reasoning allowed.

Workers may accept a role or target argument from the daemon/UHM, but they should not choose progression strategy, faction priorities, reset timing, or target policy.

---

# TARGET PIPELINE

```txt
phase
    ->
lane
    ->
tier filtering
    ->
candidate filtering
    ->
strategic scoring
    ->
lane assignment
```

Implemented through:

```txt
target-tiers.js
target-intelligence.js
targets.js
```

---

# FORMULA ERA SPLIT

Before Formulas.exe:

```txt
fallback targeting
legacy math
safe bootstrap behavior
optional prebuilt bootstrap cheat sheet
```

After Formulas.exe:

```txt
formula-aware timing
formula-aware scoring
daemon target authority
bootstrap cheat-sheet generation for the next fresh start
```

---

# BOOTSTRAP MODEL

The bootstrap daemon is a temporary rebuild helper, not the long-term strategy brain.

Late-game, while Formulas.exe exists:

```txt
run /tools/build-bootstrap-cheatsheet.js
```

This updates:

```txt
/lib/bootstrap/formula-cheatsheet.js
```

Fresh-start bootstrap then uses that static cheat sheet plus live fallback math to choose early targets and publish:

```txt
/data/bootstrap-target.txt
/data/bootstrap-plan.txt
```

Bootstrap workers should run a mixed hack/grow/weaken cycle. They should not fill RAM with one oversized one-role process.

---

# EXP / LEVELING EXECUTION RULE

UHM may run EXP sprint during forced leveling or post-Red-Pill world-daemon readiness.

That sprint must remain hack/grow/weaken balanced:

```txt
exp-hack.js
exp-grow.js
exp-weaken.js
```

The endgame leveling path must not special-case into hack-only execution. If target money or security drifts, the sprint math should repair it with grow/weaken work while still gaining EXP.

---

# FUTURE OVERLAY RULE

Overlay must remain:

```txt
optional
read-only first
state-driven
```

Overlay should never directly manipulate critical runtime behavior.

Use command/state files as API boundaries.
