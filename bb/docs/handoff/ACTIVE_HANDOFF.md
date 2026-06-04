# ACTIVE HANDOFF

lastUpdated: 2026-06
project: Bitburner Daemon
status: ACTIVE_DEVELOPMENT

---

# CURRENT PRIORITY

```txt
1. faction-stage progression intelligence
2. stage-aware EXP caps
3. augmentation timing logic
4. adaptive lane affordability
5. EXP target separation
6. telemetry polish
```

---

# CURRENT NEXT TASK

```txt
Create:
/lib/daemon/faction-progression.js
```

Purpose:

```txt
Convert progression logic from:
    "money vs exp"

Into:
    "what currently blocks progression?"
```

Expected outputs:

```txt
currentFactionStage
currentBlocker
nextBestAction
recommendedMode
recommendedTarget
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
```

---

# CURRENT RISK AREAS

```txt
- adaptive lane affordability
- faction progression reasoning
- augmentation valuation timing
- EXP routing logic
- telemetry scaling
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
    level only as needed

After Red Pill:
    push toward 3000
    destroy node
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

# QUICK DEBUG

```txt
killall
run daemon.js
tail /controllers/uhm.js
cat /data/daemon-state.txt
ps
```