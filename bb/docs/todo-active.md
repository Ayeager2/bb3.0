# CURRENT ACTIVE PRIORITIES

```txt
1. Verify bootstrap cheat-sheet flow on next fresh start:
   - run /tools/build-bootstrap-cheatsheet.js late-game with Formulas.exe
   - after reset, run bootstrap-daemon.js
   - confirm /data/bootstrap-plan.txt has a mixed H/G/W cycle
2. Verify UHM leveling/endgame H/G/W sprint under live RAM pressure:
   - forced --level and post-Red-Pill final leveling should not become hack-only
   - process list should show exp-hack.js, exp-grow.js, and exp-weaken.js together
3. Stage-aware progression calculations:
   - money and EXP requirements are part of faction progression state
   - calculation source is marked as fallback or Formulas.exe-backed
4. Economy-first cloud buildout:
   - cloud fleet server slot completion comes before EXP grinding
   - RAM upgrades now use time-aware balancing instead of forcing EXP to 0 forever
   - once all cloud slots are full, money stays favored while EXP keeps a lane unless the next upgrade is affordable now
5. Tune augmentation timing thresholds from live daemon-state output
6. Better EXP target separation
7. Formula-aware target telemetry polish
8. Test pre-Red-Pill BitRunners NeuroFlux favor loop in live BN4 state
9. Verify server ticker telemetry in dashboard after next server purchase/upgrade
10. Test Daedalus NeuroFlux donation-unlock loop:
   - before Red Pill, buy Daedalus NeuroFlux until projected favor reaches donation unlock
   - projection should come from formulas.reputation diagnostics
   - after projected favor is ready, donate for Red Pill rep, buy Red Pill first, then continue post-Red-Pill world-daemon readiness / destroy-node path
11. Live service-audit verification after next daemon restart:
   - confirm `run daemon.js` prints startup DEV REFRESH removals before services start
   - confirm /tools/daemon-session-service.js is not running
   - confirm /data/daemon-state.txt still updates sessionStats
   - confirm faction donation no longer crashes on successful donation
   - confirm dashboard commands report failure if helper scripts cannot start
   - confirm /tools/refresh-augmentation-plans.js waits for augmentation-data-builder
12. Remove stale checked-in runtime state after explicit approval:
   - /lib/daemon/daemon-state.txt appears to contain old joesguns/3000 data
```

# NEW TODO - 2026-06-07

```txt
Pre-Red-Pill BitRunners / EXP hypothesis:
- Current pre-Red-Pill EXP logic still feels slow.
- Investigate buying regular NeuroFlux Governor from BitRunners repeatedly during the BitRunners stage.
- Goal is to build BitRunners favor faster, possibly toward 40+ favor, so faction donation unlocks sooner.
- If donations unlock, daemon can buy missing BitRunners rep faster and finish higher-rep BitRunners augmentations sooner.
- Keep money/cash mode favored during this loop so home RAM/core upgrades can continue while BitRunners rep/favor builds.
- Do not rush Red Pill if BitRunners augmentations and low-trillion home upgrades are still valuable.
- Candidate implementation: a pre-Red-Pill BitRunners stage policy that treats NeuroFlux Governor as a repeatable favor/leveling accelerator, gated by cash reserve, current BitRunners rep, queued critical augments, favor progress, and reset timing.
- Needs testing: target favor threshold may be around 40+, but this is still experimental.

Server purchaser / dashboard ticker:
- Remove or gate terminal spam from /economy/server-purchaser-service.js.
- Current behavior: successful actions toast and tprint every purchase/upgrade.
- Desired behavior: keep optional toasts if useful, but stop noisy terminal prints by default.
- Add a dashboard-facing "server ticker" item instead.
- Server ticker should show purchased server name and RAM in a compact cyberpunk graphic.
- Likely data path: server purchaser writes latest action/fleet summary to /data/ui or daemon state, dashboard-state-writer/bridge exposes it, dashboard renders a small ticker/card.
```

# COMPLETED RECENTLY

```txt
- Pre-Red-Pill BitRunners NeuroFlux favor-loop first pass:
  - BitRunners NeuroFlux has a dedicated augmentation stage policy
  - augmentation planner allows NeuroFlux only for joined BitRunners before Red Pill
  - NeuroFlux is opportunistic only: it must already have rep and be affordable
  - money mode can allow only this specific ready NeuroFlux purchase
  - normal EXP/progression mode is not forced just because NeuroFlux is ready
  - buyer diagnostics include repeatable/favorLoop metadata
  - user decided not to broaden BitRunners NFG after Daedalus join
  - correction: Red Pill remains the first Daedalus purchase priority and masks other Daedalus candidates while unowned
  - post-Red-Pill logic remains the normal level-to-live-world-daemon-requirement / destroy world daemon path

- Pre-Red-Pill Daedalus NeuroFlux donation-unlock loop:
  - Daedalus NeuroFlux can now be selected before Red Pill only while projected Daedalus favor is below donation unlock
  - favor projection uses formulas.reputation when available
  - buyer can bypass the normal max-price cap for this exact Daedalus NeuroFlux favor loop
  - once projected favor reaches donation unlock, Red Pill returns as the forced first Daedalus purchase
  - normal Daedalus augmentations still do not jump ahead of Red Pill

- Server purchaser ticker first pass:
  - /economy/server-purchaser-service.js no longer tprints purchase spam by default
  - --terminal true can re-enable terminal prints for debugging
  - --toast controls upgrade toasts
  - writes /data/ui/server-ticker.txt every cycle
  - dashboard-state-writer exposes servers.serverTicker
  - dashboard bridge UI includes Server Ticker card

- Bootstrap formula cheat-sheet first pass:
  - /tools/build-bootstrap-cheatsheet.js generates /lib/bootstrap/formula-cheatsheet.js while Formulas.exe is available
  - bootstrap-daemon imports the cheat sheet for early target ordering
  - bootstrap-daemon writes /data/bootstrap-plan.txt with target, money ratio, security gap, hack odds, and H/G/W cycle
  - tiny-worker accepts explicit hack/grow/weaken roles
  - bootstrap-money now uses /workers/tiny-worker.js instead of missing /workers/bootstrap-worker.js
  - bootstrap launch logic avoids one giant fixed-size worker shape and repeats a logical H/G/W cycle across available RAM

- UHM leveling/endgame H/G/W sprint first pass:
  - /lib/uhm/modes/exp-sprint.js no longer special-cases leveling into EXP_HACK only
  - EXP sprint builds a live H/G/W cycle from hackAnalyze, growthAnalyze, weakenAnalyze, money ratio, and security gap
  - final leveling should launch exp-hack.js, exp-grow.js, and exp-weaken.js together
  - sprint rebalancer kills/reduces stale single-role or heavily dominated worker sets

- Faction progression foundation created:
  - /lib/daemon/faction-progression.js
  - emits currentFactionStage/currentBlocker/nextBestAction/recommendedMode
  - includes calculations.exp, calculations.money, calculations.augmentation
  - uses fallback estimates before Formulas.exe and formulas-backed estimates after
  - wired into /lib/daemon/decision.js
  - exposed in /lib/daemon/state.js
  - copied into dashboard state as progression.faction/factionProgression

- Economy-first cloud fleet gate added:
  - /lib/daemon/cloud-fleet.js reports count/RAM max status
  - decision.js keeps mode/priority on money while server slots are missing or the next cloud action is immediately affordable
  - state.js gives money lanes 100% of lane RAM while cloud server slots are incomplete
  - when all slots are full but RAM upgrades remain, state.js uses time-aware money/EXP lane balancing
  - /data/daemon-state.txt includes cloudEconomyTiming for the next cloud action cost and estimated timing
  - dashboard state exposes servers.cloudFleet
  - manual daemon overrides can bypass this, including run daemon.js --level

- Stage-aware EXP caps added:
  - factionProgression.expPolicy says whether EXP is useful right now
  - factionProgression.progressionAction exposes the current blocker/action pair
  - decision.js uses expPolicy before entering automatic EXP mode
  - pre-Red-Pill leveling only happens for an active hacking blocker
  - post-Red-Pill leveling still targets w0r1d_d43m0n readiness
  - dashboard state exposes expPolicy and progressionAction

- Background faction work during money mode added:
  - money/income policy can allow faction work when a useful reputation plan exists
  - daemon stays in money mode while server buildout remains the main priority
  - full faction/progression mode waits until the basic server gate is complete
  - dashboard state exposes allowFactionWork/backgroundFactionWork/backgroundFactionReason

- Forced faction mode added:
  - run daemon.js --faction forces mode=faction and priority=faction
  - --force-mode faction and --force-priority faction are supported
  - rep/reputation aliases normalize to faction
  - forced modes are now money, exp/leveling, and faction

- Augmentation timing score first pass added:
  - /lib/daemon/augmentation-timing.js compares augmentation value, rep gap, money gap, and cloud upgrade pressure
  - augmentationTiming.recommendation can be money-heavy, background-faction, full-faction, donate-now, buy-now, or wait
  - decision.js uses augmentationTiming.shouldFullFaction before fully switching from money to faction work
  - money mode uses augmentationTiming.allowBackgroundFaction for background rep work
  - daemon/dashboard state expose augmentationTiming for testing
  - thresholds are named in AUGMENTATION_TIMING_THRESHOLDS and emitted into augmentationTiming
  - /tools/augmentation-status.js prints timing recommendation and bucket details

- Progression-stage target blacklist system
- Phase/lane-aware target filtering
- Daemon-owned lane target authority
- Stale distributed share-worker cleanup
- EXP overdrive false NO_RAM status fix
- EXP_RUNNING status added for active EXP workers
- Share worker cleanup now kills stale workers across home/cloud/rooted hosts
- Darkweb buyer stale completion bug fixed:
  - live state now overrides TXT state
  - stale completion marker removed when items are missing
  - runtime state file cleaned on verified completion

- Backdoor progression service now retries rooting continuously:
  - progression servers are rooted before backdoor readiness check
  - fixed stall where unrooted faction servers never became recommended

- Daemon/UHM and daemon-managed service audit:
  - session stats moved into /lib/daemon/state.js
  - /tools/daemon-session-service.js disabled/retired to avoid racing /data/daemon-state.txt
  - service manager can still stop retired services with stopWhenBlocked
  - world-daemon hacking requirement uses live w0r1d_d43m0n required level
  - faction-donation-service imports logPurchase
  - dashboard-command-runner reports ns.run failure instead of false success
  - refresh-augmentation-plans waits for augmentation-data-builder
  - server ticker RAM lookup handles server/serverName/item
  - daemon-hud destroy-stage display no longer requires backdoor when destroy service does not
  - broad node --check sweep passed for daemon, UHM, services, economy, tools, and workers

- Daemon startup refresh:
  - daemon.js now calls refreshDaemonState on every startup
  - manual run /tools/dev-refresh-state.js is no longer required before run daemon.js
  - startup refresh happens after killing duplicate daemon instances and before reading cached state or launching services

- Augmentation buyer reserve corrected:
  - daemon-managed /tools/augmentation-buyer-service.js now uses --reserve 1_000_000
  - the service default fallback reserve is also 1_000_000
  - this should display as Reserve: 1.000m in the buyer tail

- BN1/BN4 fresh-start life bridge corrected:
  - /tools/fresh-start-life-service.js is the active early Singularity bridge
  - daemon starts it without pre-blocking on requiresSingularity so the service can self-diagnose
  - /data/fresh-start-life-state.txt now reports BN gate and Singularity API availability
  - studies Computer Science at Rothman University until hacking 20
  - then goes to Slums and runs Shoplift for quick cash until faction handoff is ready
  - old crime-bootstrap service is retired so it cannot compete with the study/shoplift loop
```

# CURRENT FORMULAS TRANSITION STATUS

```txt
Completed:
- formula-aware thread math
- formula-aware weaken timing
- formula-aware target scoring
- formulas-aware dashboard telemetry
- formulas-aware lane planning
- pre/post formulas orchestration split
- formula-era daemon target authority
- phase/lane-aware target blacklist filtering

Current rule:
Before Formulas:
    affordable bootstrap fallback behavior
    fallback money/EXP estimates in faction progression
    no forced EXP overdrive

After Formulas:
    strategic daemon authority
    formula-aware scoring
    formulas-backed money/EXP estimates in faction progression
    optional EXP overdrive
    stage-aware progression logic foundation active
    stage-aware EXP caps active
    augmentation timing first pass active
    next: tune thresholds from live augmentation-status output
```

# CURRENT STABILIZATION STATUS

```txt
Stable:
- service-manager lifecycle system
- darkweb purchasing
- purchased server scaling
- daemon-owned lane targets
- EXP overdrive gating
- EXP_RUNNING status reporting
- target stability
- reset planner foundation
- faction progression foundation
- progression money/EXP calculation payload
- economy-first cloud fleet gate
- time-aware cloud RAM upgrade balancing
- stage-aware EXP caps
- augmentation timing score
- stale share-worker cleanup
- phase/lane target blacklist system

Current remaining risk areas:
- lane affordability / adaptive lane balancing
- faction-stage progression refinement
- augmentation buying timing
- adaptive EXP routing
- telemetry scaling
- dashboard reasoning bridge constants
```

# CURRENT EXECUTION MODEL

```txt
daemon
    = orchestration brain

decision.js
    = policy authority

service-manager
    = lifecycle authority

target-intelligence.js
    = strategic target scoring

target-tiers.js
    = phase/lane target filtering

UHM
    = execution-only engine

workers
    = execution-only
```

# NEXT MAJOR CODING TASK

```txt
Tune augmentation timing thresholds using:
/data/daemon-state.txt
/data/augmentation-plan.txt
/data/faction-work-plan.txt
/tools/augmentation-status.js
```

Goal:

```txt
- verify cloudBucket matches real upgrade timing
- verify repBucket feels right for faction work time
- adjust valueBucket thresholds for hacking/money/faction multiplier quality
- make full-faction vs background-faction choices match live gameplay
```

Current implementation already provides:

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
augmentationTiming
```

Target decision model:

```txt
If next faction stage is hacking-level blocked:
    mode = exp

Else if required server is not backdoored:
    mode = progression/backdoor

Else if faction is not joined:
    mode = progression/faction-join

Else if useful augmentations need reputation:
    mode = progression/faction-work

Else if useful augmentations need money:
    mode = money

Else if useful augmentation is affordable:
    mode = buy-augmentation

Else:
    advance to next faction stage
```

# WATCH POINT FOUND IN CURRENT CODE

```txt
bb-dashboard-bridge/bridge.js references:
OUT_REASONING_FILE
BITBURNER_REASONING_FILE

Those constants should be verified/defined before relying on:
/reasoning
pollDaemonReasoning()
```

# UPDATED PROGRESSION MODEL

```txt
CyberSec
    -> NiteSec
        -> The Black Hand
            -> BitRunners
                -> Daedalus / Red Pill
                    -> Destroy Node
```

# UPDATED EXP RULE

```txt
Manual override:
    run daemon.js --money forces mode=money and priority=income
    run daemon.js --level forces mode=exp and priority=leveling
    run daemon.js --leveling does the same thing
    run daemon.js --exp does the same thing
    run daemon.js --faction forces mode=faction and priority=faction
    --force-mode leveling is normalized to exp
    --force-priority exp is normalized to leveling
    --force-mode rep/reputation is normalized to faction
    --force-priority rep/reputation is normalized to faction
    run daemon.js --force-mode exp remains supported

Before Red Pill:
    do not blindly grind to 3000
    level only as needed for faction progression
    likely cap around 2500 unless a faction blocker requires more

After Red Pill:
    enter destroy-node / kill-node mode
    push hacking to live w0r1d_d43m0n required hacking level
    hack w0r1d_d43m0n
```
