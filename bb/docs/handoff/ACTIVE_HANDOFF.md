# ACTIVE HANDOFF

lastUpdated: 2026-06
project: Bitburner Daemon
status: ACTIVE_DEVELOPMENT

---

# CURRENT PRIORITY

```txt
1. verify economy-first cloud buildout behavior
2. augmentation timing by faction stage
3. EXP target separation
4. dashboard rendering for progression calculations
5. telemetry polish
6. test pre-Red-Pill BitRunners NeuroFlux favor loop
7. replace server purchaser terminal spam with dashboard server ticker telemetry
```

---

# CURRENT NEXT TASK

```txt
Refine:
/lib/daemon/faction-progression.js
/lib/daemon/decision.js
/lib/daemon/state.js
/lib/daemon/augmentation-stage-policy.js
/lib/daemon/augmentations.js
/economy/server-purchaser-service.js
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

New user TODO from 2026-06-07:

- Pre-Red-Pill EXP still feels slow.
- Test a BitRunners-stage loop that repeatedly buys regular NeuroFlux Governor from BitRunners to build favor faster.
- Hypothesis: reaching roughly 40+ BitRunners favor may unlock donations sooner, allowing faster rep purchases and faster completion of higher-rep BitRunners augmentations.
- Keep cash/money favored during this loop so home RAM/core upgrades can continue while BitRunners rep and favor build.
- Do not rush Red Pill if BitRunners augmentations and low-trillion home upgrades are still useful.
- Quiet `/economy/server-purchaser-service.js` terminal spam by default.
- Add dashboard-facing server ticker telemetry showing purchased server name and RAM in a compact cyberpunk graphic.
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
expPolicy
progressionAction
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
- stage-aware EXP caps
- backdoor progression retry/rooting
```

---

# CURRENT RISK AREAS

```txt
- adaptive lane affordability
- faction progression refinement
- augmentation valuation timing
- EXP routing logic
- pre-Red-Pill NeuroFlux/favor loop may be good, but favor threshold is still experimental
- server purchaser currently `tprint`s purchases; desired future behavior is dashboard telemetry instead
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
    factionProgression.expPolicy explains whether EXP is useful now
    new hypothesis to test: during BitRunners stage, regular NeuroFlux Governor purchases may accelerate favor/donation unlock and make faction rep buying viable sooner
    keep money favored while useful BitRunners augmentations and home RAM/core upgrades remain attractive

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
