# ACTIVE HANDOFF

lastUpdated: 2026-06
project: Bitburner Daemon
status: ACTIVE_DEVELOPMENT

---

# CURRENT PRIORITY

```txt
1. stage-aware EXP caps
2. augmentation timing by faction stage
3. adaptive lane affordability
4. EXP target separation
5. dashboard reasoning bridge health
6. telemetry polish
```

---

# CURRENT NEXT TASK

```txt
Refine:
/lib/daemon/faction-progression.js
/lib/daemon/decision.js
/lib/daemon/state.js
```

Purpose:

```txt
Faction progression foundation exists and is wired into:
    decision.js
    state.js

Next step is to make its recommendations stage-aware enough to avoid
unnecessary pre-Red-Pill EXP grinding and to guide augmentation timing.
```

Current outputs:

```txt
currentFactionStage
currentBlocker
nextBestAction
recommendedMode
targetFaction
targetServer
requiredHack
```

---

# CURRENT EXECUTION MODEL

```txt
daemon
    = orchestration brain

decision.js
    = strategic authority

service-manager
    = lifecycle authority

target-intelligence.js
    = scoring authority

target-tiers.js
    = filtering authority

UHM
    = execution engine only

workers
    = execution only
```

---

# CURRENT STABLE SYSTEMS

```txt
- service lifecycle system
- daemon-owned targets
- formula-aware scoring
- formula-aware batch planning
- share-worker cleanup
- darkweb purchasing
- purchased-server scaling
- EXP overdrive gating
- target stability timers
- reset planning foundation
- faction progression foundation
- backdoor progression retry/rooting
```

---

# CURRENT RISK AREAS

```txt
- adaptive lane affordability
- faction progression refinement
- augmentation valuation timing
- EXP routing logic
- telemetry scaling
- dashboard reasoning bridge constants
```

---

# IMPORTANT ARCHITECTURE RULES

```txt
Never move strategic logic into:
- UHM
- workers
- execution scripts

Daemon owns:
- strategy
- progression
- lifecycle
- target authority
- faction reasoning
```

---

# CURRENT PROGRESSION MODEL

```txt
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

---

# CURRENT EXP RULE

```txt
Before Red Pill:
    level only as needed for the current faction blocker
    avoid blind grinding to 3000
    likely soft cap near 2500 unless a stage requires more

After Red Pill:
    push toward 3000
    prepare and destroy w0r1d_d43m0n
```

---

# KNOWN WATCH POINTS

## EXP collapse risk

If daemon changes cause:

```txt
all servers running exp-weaken.js
```

inspect:

```txt
shouldForceExpMode()
```

inside:

```txt
/controllers/uhm.js
```

---

## Share cleanup risk

Verify stale workers are removed from:

```txt
home
purchased servers
rooted servers
```

Otherwise RAM starvation occurs silently.

---

## Dashboard reasoning bridge risk

The dashboard bridge references:

```txt
OUT_REASONING_FILE
BITBURNER_REASONING_FILE
```

Verify those constants are defined before relying on:

```txt
/reasoning
pollDaemonReasoning()
```

---

# QUICK DEBUG

```txt
killall
run daemon.js
tail /controllers/uhm.js
cat /data/daemon-state.txt
ps
```
