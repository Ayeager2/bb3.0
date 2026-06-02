# CURRENT_SERVICE_MANAGER_STATE

```txt
service-manager.js now supports:

- normalized service definitions
- policyFlag-based daemon policy gating
- stopWhenBlocked behavior
- duplicate process protection
- startup cooldown protection
- improved ns.exec failure diagnostics
- one-shot completion tracking
- telemetry-integrated service failures
- telemetry-integrated blocked-service history
- deduplicated telemetry throttling
- cooldown-aware service retry suppression
- policy-aware lifecycle stabilization
- reset-prep aware service shutdown
- daemon-owned reset executor integration
```

Current cooldown system:

```txt
FAILURE_CACHE implemented
30-second retry cooldown implemented
prevents infinite failed ns.exec spam loops
```

Current service policy architecture:

```txt
daemon policy is now the primary authority for:

- faction work
- faction donations
- faction joins
- augmentation purchases
- stock trading
- backdoor orchestration
- reset-prep orchestration
- reset execution gating
```

Service registry now supports:

```txt
policyFlag
stopWhenBlocked
requiresSingularity
requiresTixApi
minMoney
minHomeRam
maxHomeRam
phase restrictions
reset-prep shutdown behavior
```

Current reset-prep behavior:

```txt
when reset-prep activates:

- stock trading disabled
- server purchases disabled
- home RAM upgrades disabled
- Hacknet spending disabled
- darkweb purchases disabled
- augmentation buying paused
- faction work paused
```

---

# CURRENT_TARGET_STABILITY_STATE

```txt
target stability foundation implemented

daemon now tracks:
- targetSince
- targetStability
- blocked swaps
- target hold timers
- target proposal reasons
- strategic target scoring
```

manual --force-target overrides stability logic

Current hold timer:

```txt
5 minutes
```

Current limitation:

```txt
target proposals still partially come from target-service

daemon does not yet fully own strategic target generation
```

---

# CURRENT_TARGET_INTELLIGENCE_STATE

```txt
daemon-owned strategic target planning partially implemented

daemon now tracks:
- bestCandidate
- currentCandidate
- target scoring
- target stability
- target hold timers
- swap blocking
- target age
- strategic target reasons
- prep penalties
- weaken-time penalties
- target efficiency weighting
```

Implemented systems:

```txt
- target swap telemetry
- service failure telemetry
- telemetry deduplication
- strategic target scoring
- candidate comparison tracking
- beginner-target escape logic
- proto multi-target planning
```

Current limitations:

```txt
- target-service still partially authoritative
- multi-target orchestration not yet integrated
- scoring history persistence still limited
- lane ROI analysis not yet implemented
```

Current strategic scoring considers:

```txt
- max money
- growth
- hack chance
- weaken time
- prep penalty
- security drift
- hacking requirement
```

---

# CURRENT_BACKDOOR_STATE

```txt
backdoor intelligence foundation implemented

daemon now tracks:
- progression faction servers
- rooted state
- hacking eligibility
- backdoor status
- route paths
- next progression target
```

Implemented systems:

```txt
- auto-pathfinding
- manual terminal route generation
- Singularity-aware backdoor execution
- daemon-integrated backdoor state
- progression-aware server tracking
```

Verified:

```txt
- Singularity auto-backdoor execution works correctly
- route traversal works correctly
- missing future servers no longer crash daemon state
```

Future direction:

```txt
backdoor logic should eventually become:
- daemon-owned progression orchestration
- faction spine aware
- augmentation-aware
- reset-aware
```

---

# CURRENT_AUGMENTATION_INTELLIGENCE_STATE

```txt
augmentation intelligence foundation implemented

daemon now supports:
- reusable augmentation scoring
- BitNode-specific weighting
- strategic augmentation bonuses
- stat-category analysis
- pending augmentation scoring
- high-impact augmentation detection
- reset score evaluation
```

Current augmentation scoring categories:

```txt
- hacking
- hacking_exp
- faction_rep
- money
- company_rep
- charisma
- combat
- crime
- hacknet
- bladeburner
- misc
```

Current BN4 weighting strongly favors:

```txt
- hacking
- hacking exp
- faction reputation
```

Current strategic augmentation bonuses:

```txt
- Red Pill
- BitWire
- Cranial
- Synaptic
- DataJack
- Neurotrainer
```

Current augmentation systems:

```txt
/tools/augmentation-status.js
/tools/augmentation-debug.js
/lib/daemon/augmentation-scoring.js
/lib/daemon/augmentation-decision.js
```

Current augmentation planner behavior:

```txt
daemon now evaluates:
- score
- affordability
- rep requirements
- faction alignment
- prerequisite ownership
- strategic progression value
```

---

# CURRENT_RESET_PLANNER_STATE

```txt
reset planner architecture implemented

daemon now supports:
- pending augmentation detection
- score-driven reset readiness
- NeuroFlux-safe pending detection
- startup auto-relaunch after install
- reset-prep orchestration
- dry-run reset execution
- armed reset protection
```

Current reset protections:

```txt
- minimum augment count
- minimum augment score
- minimum runtime
- manual armed flag
```

Current reset flow:

```txt
reset planner
    ->
decision.js enters reset-prep
    ->
spending locks down
    ->
reset executor installs augmentations
    ->
startup.js relaunches daemon automatically
```

Current reset planner now tracks:

```txt
- pendingCount
- pendingScore
- highImpactScore
- scoredPending
- blockers
- armed state
- reset readiness reason
```

Current NeuroFlux handling:

```txt
NeuroFlux Governor is now properly handled
using count-based pending augmentation detection.

repeat NeuroFlux levels no longer disappear
from pending augmentation calculations.
```

Current reset executor behavior:

```txt
default behavior:
DRY RUN ONLY

real reset execution requires:
- execute=true
- reset armed file
```

---

# CURRENT_DARKWEB_STATE

```txt
darkweb purchase intelligence implemented

system now tracks:
- TOR ownership
- darkweb purchase progression
- utility ownership
- purchase affordability
- remaining purchases
- persistent purchase state
```

Current darkweb architecture:

```txt
state-driven purchase orchestration
```

instead of:

```txt
blind purchase retry loops
```

Current tracked purchases:

```txt
- TOR
- BruteSSH
- FTPCrack
- relaySMTP
- HTTPWorm
- SQLInject
- ServerProfiler
- DeepscanV1
- DeepscanV2
- AutoLink
- DarkscapeNavigator
- Formulas.exe
```

Current persistent state file:

```txt
/data/darkweb-purchase-state.txt
```

---

# CURRENT_NEXT_PRIORITY

```txt
full daemon-owned strategic target authority
```

Goals:

```txt
replace remaining target-service authority with daemon intelligence

future target selection should consider:
- ROI
- weaken time
- batch saturation
- target stability
- hacking level
- faction progression needs
- EXP bottlenecks
- money bottlenecks
- prep cost
- long-term target efficiency
- lane saturation
- augmentation progression needs
```

---

# CURRENT_SERVICE_ARCHITECTURE_DIRECTION

```txt
services are becoming deterministic daemon-managed infrastructure

goal:
daemon becomes the operating system
services become gated subsystems
UHM becomes pure execution engine
workers remain execution-only
```

---

# CURRENT_IMPORTANT_ARCHITECTURE_RULES

```txt
UHM must NOT regain orchestration authority.

workers must remain execution-only.

service-manager owns lifecycle.

decision.js owns policy.

daemon owns strategic planning.

services.js remains declarative infrastructure only.
```

Additional important rule:

```txt
augmentation intelligence must remain centralized.

reset readiness must remain score-driven.

future AI systems should consume shared scoring/state layers
instead of duplicating progression logic.
```

---

# CURRENT_MAJOR_TECHNICAL_WIN

```txt
daemon is no longer vulnerable to uncontrolled failed service spam loops during:
- RAM starvation
- missing requirements
- blocked policies
- failed exec attempts
- reset-prep transitions
- augmentation planning refreshes
```

Service startup behavior is now:

```txt
stabilizing instead of recursively amplifying failures
```

Additional major win:

```txt
reset orchestration is now autonomous.

after augmentation installation:
startup.js relaunches daemon automatically.

manual keyboard interaction is no longer required after reset.
```

---

# CURRENT_PRIORITY_ORDER

```txt
1. Full daemon-owned strategic target authority
2. Augmentation synergy scoring
3. Reset-prep staging system
4. Backdoor telemetry/history
5. Faction intelligence refinement
6. Telemetry/history expansion
7. Multi-target orchestration expansion
8. EXP optimization cleanup
9. Dashboard/analytics cosmetics
```

---

# CURRENT_LONG_TERM_DIRECTION

```txt
daemon is evolving toward:

AI-driven autonomous progression orchestration

future systems should eventually support:
- intelligent reset timing
- faction spine progression
- strategic augmentation planning
- adaptive lane balancing
- telemetry-informed target selection
- autonomous BitNode completion
```
