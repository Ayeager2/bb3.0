# Bitburner Command Cheat Sheet

lastUpdated: 2026-06

This is the practical "what do I run, and what am I looking at?" sheet.

---

# Main Commands

## Start The Daemon

```txt
run daemon.js
```

Starts the central automation brain.

What it does:

```txt
- chooses money / exp / progression / reset / destroy-node mode
- starts and stops services
- chooses targets
- writes /data/daemon-state.txt
- keeps UHM and helper services aligned with policy
```

Check it with:

```txt
cat /data/daemon-state.txt
```

---

## Force Money Mode

```txt
run daemon.js --force-mode money
```

Forces the daemon to focus on income.

Use when:

```txt
- you want cash first
- cloud servers are not maxed
- you want to rebuild the economy after reset
```

Expected signs:

```txt
"mode": "money"
"priority": "income"
```

---

## Force Leveling / EXP Mode

These all mean the same thing:

```txt
run daemon.js --level
run daemon.js --leveling
run daemon.js --exp
```

They force:

```txt
mode = exp
priority = leveling
```

Also supported:

```txt
run daemon.js --force-mode exp
run daemon.js --force-mode leveling
run daemon.js --force-priority exp
```

What it does:

```txt
- bypasses the economy-first cloud gate
- gives EXP mode priority
- routes UHM toward EXP lanes
```

Check it with:

```txt
cat /data/daemon-state.txt
```

Look for:

```txt
"mode": "exp"
"priority": "leveling"
"overrides": {
  "level": true
}
```

---

## Force A Target

```txt
run daemon.js --force-target phantasy
```

Forces the daemon to use a specific target when that target is valid.

Use when:

```txt
- testing target logic
- comparing two servers
- trying to stabilize a known-good target
```

---

## Open The Daemon HUD

```txt
run /tools/daemon-hud.js
```

Shows a tail window with the current daemon mode, target, policy, services, reset plan, lanes, and telemetry.

Usually the daemon starts this for you.

---

## Run UHM Directly

```txt
run /controllers/uhm.js
```

Runs the execution engine directly.

Usually you do not need this because the daemon starts UHM.

Useful manual test:

```txt
run /controllers/uhm.js --overdrive
```

That forces EXP overdrive for testing.

---

# Most Useful `cat` Files

## Daemon State

```txt
cat /data/daemon-state.txt
```

Most important state file.

Contains:

```txt
- current mode
- current phase
- target
- spending policy
- lane RAM allocation
- cloud fleet status
- faction progression
- money/EXP/augmentation calculations
- service status
- reset plan
- session stats
- telemetry counts
```

Good things to check:

```txt
"mode"
"spendingPolicy"
"multiTargetPolicy"
"servers.cloudFleet"
"factionProgression"
"services"
```

---

## Dashboard State

```txt
cat /data/ui/dashboard-state.txt
```

The simplified state used by the local dashboard bridge/UI.

Contains:

```txt
- bitnode summary
- mode / phase / priority
- player money and hacking
- target stats
- policy flags
- cloud fleet summary
- faction progression summary
- lane percentages
- widgets/theme hints
```

If the dashboard looks wrong, check this first.

---

## Target State

```txt
cat /data/target-state.txt
```

Written by:

```txt
/tools/target-service.js
```

Contains:

```txt
- rooted servers
- target service scan results
- target metadata used by daemon target selection
```

Use when:

```txt
- daemon has stale rooted server info
- target list seems wrong
- newly rooted servers are not showing up
```

---

## Reset Plan

```txt
cat /data/reset-plan.txt
```

Contains:

```txt
- whether reset is ready
- reset blockers
- pending augmentation count
- installed augmentation count
- pending augmentation score
- armed flag state
```

Related command:

```txt
run /tools/create-reset-arm.js
```

That writes:

```txt
/data/reset-armed.txt
```

---

## Faction State

```txt
cat /data/faction-state.txt
```

Written by:

```txt
/tools/faction-observer-service.js
```

Contains:

```txt
- joined factions
- faction progression spine
- hacking readiness
- backdoor/root status for faction servers
```

Useful companion:

```txt
run /tools/faction-status.js
```

---

## Backdoor State

```txt
cat /data/backdoor-state.txt
```

Written by:

```txt
/tools/faction-observer-service.js
```

Contains:

```txt
- progression server paths
- whether servers exist
- root status
- backdoor status
- next backdoor target
```

Useful commands:

```txt
run /tools/backdoor-status.js
run /tools/backdoor-route.js
run /tools/backdoor-service.js
```

---

## Augmentation State

```txt
cat /data/augmentation-state.txt
```

Written by:

```txt
/tools/augmentation-data-builder.js
```

Contains:

```txt
- faction augmentation data
- owned/queued/installed status
- prices
- reputation requirements
- faction reputation
- augmentation stats/tags
```

Refresh it with:

```txt
run /tools/augmentation-data-builder.js --force
```

---

## Augmentation Plan

```txt
cat /data/augmentation-plan.txt
```

Written by:

```txt
/lib/daemon/augmentations.js
/tools/refresh-augmentation-plans.js
/tools/augmentation-buyer-service.js
```

Contains:

```txt
- next augmentation goal
- faction
- price
- rep requirement
- whether it is affordable
- whether rep is ready
- blocked reason
```

Useful status command:

```txt
run /tools/augmentation-status.js
```

---

## Faction Work Plan

```txt
cat /data/faction-work-plan.txt
```

Contains:

```txt
- whether faction work is active
- target faction
- target augmentation
- missing reputation
- work type
- reason
```

Useful commands:

```txt
run /tools/faction-work-status.js
run /tools/faction-progress-watch.js
```

---

## Faction Donation Plan

```txt
cat /data/faction-donation-plan.txt
```

Contains:

```txt
- whether donation is useful
- target faction
- target augmentation
- missing rep
- favor status
- estimated donation
```

Useful command:

```txt
run /tools/faction-donation-status.js
```

---

## Purchase Log

```txt
cat /data/purchases.log.txt
```

Contains a running text log of purchases.

Useful command:

```txt
run /tools/purchase-log-status.js
```

Also check latest purchase:

```txt
cat /data/purchases-state.txt
```

---

## Darkweb Purchase State

```txt
cat /data/darkweb-purchase-state.txt
```

Contains:

```txt
- TOR/program purchase status
- remaining darkweb items
- buyer runtime status
```

Completion marker:

```txt
cat /data/darkweb-buyer-complete.txt
```

---

## Cloud / Server Buildout

Cloud fleet status now appears inside:

```txt
cat /data/daemon-state.txt
```

Look for:

```txt
"servers": {
  "cloudFleet": {
    "maxed": false,
    "reason": "..."
  }
}
```

If `maxed` is false, daemon should prefer money before normal EXP/progression.

Important detail:

```txt
If cloud server slots are not full:
    money lanes take almost everything until more servers are bought

If cloud server slots are full but RAM upgrades remain:
    daemon uses time-aware balancing
    money stays favored
    EXP still gets a lane unless the next RAM upgrade is affordable right now
```

Extra timing info appears as:

```txt
"cloudEconomyTiming": {
  "nextActionCost": 123,
  "nextActionAffordable": false,
  "estimatedSecondsToNextAction": 456,
  "timeBucket": "medium"
}
```

---

## Event Log

```txt
cat /data/ui/event-log.txt
```

Contains UI-facing events for the dashboard.

Clear it from dashboard command runner or manually if needed.

---

## Network Topology

```txt
cat /data/ui/network-topology.txt
```

Written by:

```txt
/tools/network-topology-writer.js
```

Contains graph data for the dashboard network map.

Refresh manually:

```txt
run /tools/network-topology-writer.js --once
```

---

## Daemon Reasoning

```txt
cat /data/ui/daemon-reasoning.txt
cat /data/ui/daemon-reasoning-history.txt
```

Written by:

```txt
/tools/daemon-reasoning-writer.js
```

Contains:

```txt
- human-readable daemon reasons
- target explanation
- policy explanation
- readiness explanation
- history of recent reasoning snapshots
```

Note:

```txt
The bridge currently has a watch point around reasoning file constants.
If the local dashboard reasoning pane does not work, check bridge.js.
```

---

# Status Commands

## Full Progression Status

```txt
run /tools/progression-status.js
```

Shows:

```txt
- daemon mode/priority
- current work
- augmentation goal
- faction work target
- donation plan
- latest purchase
```

---

## Augmentation Status

```txt
run /tools/augmentation-status.js
```

Shows:

```txt
- next augmentation goal
- faction
- price
- rep requirement
- affordable/ready state
```

---

## Faction Status

```txt
run /tools/faction-status.js
```

Shows:

```txt
- joined factions
- faction path
- server/root/hack readiness
- next faction goal
```

---

## Backdoor Status

```txt
run /tools/backdoor-status.js
```

Shows:

```txt
- progression backdoor targets
- which are ready/done/blocked
- next target
```

---

## Player Debug

```txt
run /tools/player-debug.js
```

Shows player stats/debug info.

---

## Path Finder

```txt
run /tools/path-finder.js target-server
```

Finds a path from home to a server.

Example:

```txt
run /tools/path-finder.js run4theh111z
```

---

# Services The Daemon Starts

You usually do not run these manually. The daemon manages them.

## Execution

```txt
/controllers/uhm.js
```

Main execution engine. Runs hack/grow/weaken/EXP/share lanes.

---

## Economy

```txt
/economy/server-purchaser-service.js
/economy/home-ram-buyer-service.js
/economy/home-core-buyer-service.js
/economy/darkweb-buyer-service.js
/economy/progression-buyer-service.js
/economy/stock-trader.js
```

What they do:

```txt
- buy/upgrade cloud servers
- buy home RAM
- buy home CPU cores
- buy TOR/programs
- handle larger progression purchases
- trade stocks when enabled and TIX is available
```

---

## Factions / Augmentations

```txt
/tools/faction-observer-service.js
/tools/faction-join-service.js
/tools/faction-work-service.js
/tools/faction-donation-service.js
/tools/augmentation-data-builder.js
/tools/augmentation-buyer-service.js
```

What they do:

```txt
- observe faction state
- join invitations
- start/stop faction work
- donate when useful
- build augmentation data
- plan and buy augmentations when policy allows
```

---

## Backdoors / Destroy Node

```txt
/tools/backdoor-service.js
/tools/destroy-node-service.js
```

What they do:

```txt
- root/backdoor progression servers
- eventually destroy the BitNode when ready
```

---

## Dashboard / Telemetry

```txt
/tools/daemon-hud.js
/tools/dashboard-state-writer.js
/tools/dashboard-command-runner.js
/tools/network-topology-writer.js
/tools/daemon-reasoning-writer.js
/tools/daemon-session-service.js
/tools/daemon-telemetry-service.js
```

What they do:

```txt
- draw in-game daemon HUD
- write dashboard JSON state
- accept dashboard commands
- write network topology
- write daemon reasoning summaries
- track session stats
- track telemetry/history
```

---

# Workers

These are low-level execution scripts. You normally do not run them manually.

```txt
/workers/h1.js
/workers/g1.js
/workers/w1.js
```

Money batch workers:

```txt
h1 = hack
g1 = grow
w1 = weaken
```

EXP workers:

```txt
/workers/exp-hack.js
/workers/exp-grow.js
/workers/exp-weaken.js
```

Other workers:

```txt
/workers/share-worker.js
/workers/tiny-worker.js
```

---

# Quick Debug Flow

Use this when something feels off:

```txt
ps
cat /data/daemon-state.txt
run /tools/progression-status.js
run /tools/faction-status.js
run /tools/augmentation-status.js
run /tools/backdoor-status.js
cat /data/ui/dashboard-state.txt
```

If it still looks wrong:

```txt
killall
run daemon.js
```

For money-first behavior, check:

```txt
cat /data/daemon-state.txt
```

Look for:

```txt
"servers.cloudFleet.maxed": false
"mode": "money"
"cloudEconomyTiming"
```

If cloud slots are still missing, `expRamPercent` should be `0`.
If slots are full and only RAM upgrades remain, `expRamPercent` should usually be above `0` unless the next upgrade is already affordable.

For forced leveling, run:

```txt
run daemon.js --level
```

Look for:

```txt
"mode": "exp"
"priority": "leveling"
```
