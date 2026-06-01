````md
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
````

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

manual --force-target overrides stability logic
```

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

implemented systems:
- target swap telemetry
- service failure telemetry
- telemetry deduplication
- strategic target scoring
- candidate comparison tracking

current limitations:
- target-service still partially authoritative
- multi-target orchestration not yet integrated
- scoring history persistence still limited
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

implemented systems:
- auto-pathfinding
- manual terminal route generation
- Singularity-aware backdoor execution
- daemon-integrated backdoor state
- progression-aware server tracking

verified:
- Singularity auto-backdoor execution works correctly
- route traversal works correctly
- missing future servers no longer crash daemon state
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
```

---

# CURRENT_SERVICE_ARCHITECTURE_DIRECTION

```txt
services are becoming deterministic daemon-managed infrastructure

goal:
daemon becomes the operating system
services become gated subsystems
UHM becomes pure execution engine
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

---

# CURRENT_MAJOR_TECHNICAL_WIN

```txt
daemon is no longer vulnerable to uncontrolled failed service spam loops during:
- RAM starvation
- missing requirements
- blocked policies
- failed exec attempts

service startup behavior is now stabilizing instead of recursively amplifying failures
```

---

# CURRENT_PRIORITY_ORDER

```txt
1. Full daemon-owned strategic target authority
2. Backdoor telemetry/history
3. Faction intelligence refinement
4. Augmentation progression intelligence
5. Reset-prep intelligence
6. Telemetry/history expansion
7. EXP optimization cleanup
8. Dashboard/analytics cosmetics
```

```
```
