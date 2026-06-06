# CURRENT STATE

lastUpdated: 2026-06

---

# CURRENT ARCHITECTURE STATUS

```txt id="v4trfj"
daemon
    = orchestration brain

decision.js
    = strategic authority

service-manager
    = lifecycle authority

target-intelligence.js
    = strategic scoring

target-tiers.js
    = target filtering

UHM
    = execution engine only

workers
    = execution only
```

---

# CURRENT CAPABILITIES

Implemented:

```txt id="y96tnn"
- daemon-owned target authority
- formula-aware scoring
- formula-aware thread planning
- phase/lane-aware filtering
- multi-lane execution
- share-aware lane budgeting
- target stability timers
- reset planning framework
- augmentation scoring framework
- faction progression foundation
- progression money/EXP calculation payloads
- economy-first cloud fleet gate
- time-aware cloud RAM upgrade balancing
- stage-aware EXP caps
- augmentation timing score
- darkweb purchasing
- distributed share execution
- stale share-worker cleanup
```

---

# FORMULAS TRANSITION STATUS

Before Formulas.exe:

```txt id="uh6x9j"
- fallback target logic
- safe bootstrap behavior
- no forced EXP overdrive
```

After Formulas.exe:

```txt id="f3vs8d"
- strategic daemon target authority
- formula-aware scoring
- formula-aware batch math
- optional EXP overdrive
- faction-stage progression foundation
- fallback-vs-Formulas.exe progression calculations
```

---

# CURRENT STABLE SYSTEMS

```txt id="0mn4z6"
- lifecycle manager
- purchased-server scaling
- darkweb buyer
- formula-aware scoring
- target stability
- EXP_RUNNING reporting
- faction progression foundation
- dashboard state exposes progression.faction/factionProgression
- dashboard state exposes servers.cloudFleet
- daemon state exposes cloudEconomyTiming
- dashboard state exposes faction expPolicy/progressionAction
- daemon/dashboard state exposes augmentationTiming
- share-worker cleanup
- reset planner foundation
```

---

# CURRENT RISK AREAS

```txt id="az0lzi"
- adaptive lane affordability
- faction-stage progression refinement
- augmentation timing threshold tuning
- EXP routing
- telemetry scaling
- dashboard reasoning bridge constants
```

---

# CURRENT STATE FILES

```txt id="x8h5vf"
/data/daemon-state.txt
/data/ui/dashboard-state.txt
/data/ui/event-log.txt
/data/ui/network-topology.txt
/data/darkweb-purchase-state.txt
/data/darkweb-buyer-complete.txt
```

Future:

```txt id="we7lf9"
/data/control/
/data/telemetry/
```

---

# CURRENT EXECUTION FLOW

```txt id="zcvn4u"
daemon
    ->
decision.js
    ->
target selection
    ->
lane assignment
    ->
UHM execution
    ->
workers
```

---

# CURRENT PROGRESSION MODEL

```txt id="mofwlu"
pre-Red-Pill:
    faction-stage blocker detection
    progression-aware leveling
    avoid blind grinding to 3000
    EXP mode only activates for an active hacking blocker

post-Red-Pill:
    push hacking toward world-daemon readiness
    world-daemon preparation
```

---

# CURRENT SHARE MODEL

```txt id="g7fudl"
daemon/control.js
    = stale cleanup authority

UHM/share.js
    = distributed share execution
```

---

# CURRENT SERVICE MODEL

```txt id="a7weom"
service-manager.js
    owns:
        startup
        cooldowns
        completion gating
        duplicate prevention
        policy enforcement
```

---

# CURRENT KNOWN WATCH POINTS

## EXP collapse risk

Symptom:

```txt id="2sr4w9"
all servers running exp-weaken.js
```

Inspect:

```txt id="t0fkpq"
shouldForceExpMode()
```

---

## Share RAM starvation

Verify stale share workers are cleaned from:

```txt id="ktuj6d"
home
purchased servers
rooted servers
```

---

## Target authority drift

After Formulas.exe:

```txt id="joh1k2"
UHM should obey daemon targets.
```

---

## Dashboard reasoning bridge

Verify bridge constants before relying on daemon reasoning UI:

```txt
OUT_REASONING_FILE
BITBURNER_REASONING_FILE
```
