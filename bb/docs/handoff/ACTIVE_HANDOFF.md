# ACTIVE HANDOFF

lastUpdated: 2026-06
project: Bitburner Daemon
status: ACTIVE_DEVELOPMENT

---

# CURRENT PRIORITY

```txt
1. live verify daemon-managed service audit after next restart
2. verify bootstrap cheat-sheet flow after the next fresh start
3. verify UHM leveling/endgame H/G/W sprint mix under live RAM pressure
4. tune augmentation timing by faction stage
5. dashboard rendering for progression calculations
6. telemetry polish
7. tune pre-Red-Pill BitRunners/Daedalus NeuroFlux favor loops from live state
```

---

# CURRENT NEXT TASK

```txt
Refine:
/data/daemon-state.txt
/data/ui/server-ticker.txt
/data/ui/dashboard-command-status.txt
/data/augmentation-buyer-state.txt
/data/faction-donation-plan.txt
```

Purpose:

```txt
The daemon/UHM service audit has been implemented. Next step is live
verification after a clean daemon restart:

- `/tools/daemon-session-service.js` should not be running.
- `/data/daemon-state.txt` should still include `sessionStats`.
- faction donation should not crash on successful donation.
- dashboard commands should report failed helper launches honestly.
- `/tools/refresh-augmentation-plans.js` should wait for augmentation data builder.
- `/data/ui/server-ticker.txt` should show server/fleet telemetry after purchaser cycles.
- `run daemon.js` should print startup DEV REFRESH removals before services start.
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
- daemon-owned session stats
- daemon startup state refresh
- retired service shutdown through stopWhenBlocked
- server ticker telemetry
- dashboard command runner launch verification
- live world-daemon hacking requirement
```

---

# CURRENT RISK AREAS

```txt
- adaptive lane affordability
- faction progression refinement
- augmentation valuation timing
- EXP routing logic, especially any collapse into a single hack/grow/weaken role
- pre-Red-Pill NeuroFlux/favor loop may be good, but favor threshold is still experimental
- telemetry scaling
- dashboard reasoning bridge constants
- stale checked-in `lib/daemon/daemon-state.txt` should be removed after explicit approval
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
    push toward live w0r1d_d43m0n required hacking level
    prepare and destroy w0r1d_d43m0n
```

---

# BOOTSTRAP CHEAT SHEET

Late-game, while Formulas.exe is available, rebuild the early-game target cheat sheet:

```txt
run /tools/build-bootstrap-cheatsheet.js
```

This writes:

```txt
/lib/bootstrap/formula-cheatsheet.js
```

Fresh-start bootstrap uses:

```txt
run bootstrap-daemon.js
cat /data/bootstrap-plan.txt
```

The bootstrap plan should show a mixed H/G/W cycle. Bootstrap should not fill hosts with one giant repeated hack process.

---

# KNOWN WATCH POINTS

## EXP collapse risk

If daemon changes cause:

```txt
all servers running only exp-hack.js
all servers running only exp-grow.js
all servers running only exp-weaken.js
one role dominating nearly all EXP sprint processes
```

inspect:

```txt
/lib/uhm/modes/exp-sprint.js
/lib/uhm/runner.js
```

Expected behavior:

```txt
EXP sprint / final leveling uses a live H/G/W cycle.
It should launch exp-hack.js, exp-grow.js, and exp-weaken.js together.
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

`daemon.js` now performs the dev state refresh automatically on startup.
