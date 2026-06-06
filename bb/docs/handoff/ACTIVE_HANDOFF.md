# ACTIVE HANDOFF

lastUpdated: 2026-06
project: Bitburner Daemon
status: ACTIVE_DEVELOPMENT

---

# CURRENT PRIORITY

```txt
1. verify economy-first cloud buildout behavior
2. refine stage-aware EXP caps
3. augmentation timing by faction stage
4. EXP target separation
5. dashboard rendering for progression calculations
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

It now includes money/EXP/augmentation calculation payloads with a
fallback-vs-Formulas.exe source marker. Next step is to refine those
recommendations enough to avoid unnecessary pre-Red-Pill EXP grinding
and to guide augmentation timing.
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
calculations.exp
calculations.money
calculations.augmentation
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
- progression money/EXP calculations
- economy-first cloud fleet gate
- time-aware cloud RAM upgrade balancing
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
Before cloud server slots are full:
    prioritize money
    keep EXP lane allocation at 0%
    buy cloud servers first

After cloud server slots are full:
    money remains favored for RAM upgrades
    EXP keeps a lane unless the next upgrade is affordable right now
    /data/daemon-state.txt shows cloudEconomyTiming for cost/time context

Manual override:
    run daemon.js --level forces leveling mode
    run daemon.js --leveling does the same thing
    run daemon.js --exp does the same thing

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

Full command/cat reference:

```txt
/docs/COMMAND_CHEATSHEET.md
```

```txt
killall
run daemon.js
tail /controllers/uhm.js
cat /data/daemon-state.txt
ps
```
