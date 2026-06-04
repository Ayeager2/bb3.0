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
```

After Formulas.exe:

```txt
formula-aware timing
formula-aware scoring
daemon target authority
```

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