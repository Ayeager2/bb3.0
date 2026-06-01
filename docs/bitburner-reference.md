# Tonight's Completed Daemon Cleanup

## Service Registry Cleanup

Completed cleanup in `/lib/daemon/services.js`.

Current service model now supports:

* `policyFlag`
* `stopWhenBlocked`
* daemon-controlled service gating
* cleaned duplicate service entries
* faction service gating through daemon policy
* augmentation buyer gating through daemon policy

Important policy-gated services:

```txt
stock-trader -> allowStockTrading
faction-work -> allowFactionWork
faction-donation -> allowFactionDonation
faction-join -> allowFactionJoin
augmentation-buyer -> allowAugmentPurchases
```

## Service Manager Improvements

Completed cleanup in `/lib/daemon/service-manager.js`.

New behavior:

```txt
- services are normalized before execution
- service gates check script existence, Singularity, money, RAM, phase, and policy
- failed ns.exec calls now report useful RAM/script reasons
- failed service starts enter a 30-second cooldown
- duplicate running services are detected and extras are killed
- blocked services can stop automatically when stopWhenBlocked is true
```

This prevents daemon spam loops when RAM is tight or a service cannot start.

## Daemon State Cleanup

`daemon.js` now uses `/lib/daemon/state.js` through `buildGlobalState()` instead of manually building the entire state object.

This restores richer daemon state output:

```txt
- phase
- target stability
- targetSince
- multiTargetPolicy
- sharePolicy
- sessionStats
- telemetry
- controller reason
- bootstrap status
```

## Target Stability Foundation

Initial target stability was added to `daemon.js`.

Current behavior:

```txt
- manual --force-target overrides target stability
- daemon tracks active target age
- target swaps can be blocked by minimum hold timer
- targetStability is written into daemon state
```

Current hold time:

```txt
5 minutes
```

Next evolution:

```txt
daemon-owned proposed target generation
target swap telemetry
target lifetime tracking
blocked swap history
```

## Decision / Policy Cleanup

`decision.js` now treats progression actions separately:

```txt
faction work
faction donation
augmentation buying
```

Fixed behavior:

```txt
allowFactionWork only follows shouldWorkFaction
allowFactionDonation only follows shouldDonateFaction
allowAugmentPurchases only follows shouldBuyAugment
allowReset is blocked while work/donation/buy actions are active
```

## Phase / Progression Cleanup

`phase.js` now recognizes the modern `"progression"` priority instead of only the old `"faction"` naming.

This lets share and lane policy respond correctly to progression mode.

## Current Architecture Direction

```txt
daemon = orchestration brain
service-manager = gated process lifecycle
services.js = service registry
state.js = global state builder
decision.js = policy/mode brain
UHM = execution engine
workers = execution only
```

Do not move orchestration logic back into UHM.

## Next Priorities

1. Daemon-owned strategic target selection
2. Target stability telemetry
3. Service failure count/history tracking
4. Backdoor orchestration foundation
5. Faction progression intelligence refinement
6. Reset-prep planner foundation
7. Multi-target lane intelligence
