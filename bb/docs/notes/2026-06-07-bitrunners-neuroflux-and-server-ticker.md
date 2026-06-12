# 2026-06-07 Notes - BitRunners NeuroFlux Loop And Server Ticker

## BitRunners NeuroFlux / Favor Hypothesis

Implementation status:

- First pass implemented.
- NeuroFlux Governor is allowed into the augmentation plan only when:
  - faction is `BitRunners`
  - BitRunners is joined
  - `The Red Pill` is not owned/queued
  - NeuroFlux already has enough live BitRunners rep
  - NeuroFlux is affordable after reserve
- Money mode can allow augmentation buying only for this exact ready BitRunners NeuroFlux candidate.
- This should not force the daemon out of cash mode just because NeuroFlux is ready.

2026-06-07 correction:

- Red Pill must be the first Daedalus purchase priority.
- Once Daedalus is joined and Red Pill is not owned, Red Pill should mask all other Daedalus candidates.
- After Red Pill is bought, use the normal post-Red-Pill leveling mode to reach hacking 3000 and destroy world daemon.
- Do not delay Red Pill for normal Daedalus augmentations or NeuroFlux.

2026-06-08 update:

- Daedalus NeuroFlux Governor is now a deliberate exception before Red Pill, but only for donation unlock prep.
- If Daedalus is joined, Red Pill is not owned, and projected Daedalus favor is still below `ns.singularity.getFavorToDonate()`, the planner may select Daedalus `NeuroFlux Governor` before Red Pill.
- The favor projection uses `ns.formulas.reputation.calculateRepToFavor(currentRep)` and reports the rep required for the favor target with `ns.formulas.reputation.calculateFavorToRep(missingFavor)`.
- Once projected Daedalus favor reaches the donation threshold, the NeuroFlux exception turns off and Red Pill becomes the forced goal again.
- After donation unlock, the intended path is: donate for Red Pill rep, buy Red Pill first, then let the normal post-Red-Pill level-to-live-world-daemon-requirement / destroy-node flow take over.
- Normal Daedalus augmentations still do not jump ahead of Red Pill.

Problem:

- Pre-Red-Pill EXP and progression still feel slow.
- The daemon currently avoids blind EXP grinding before Red Pill, which is good, but the BitRunners stage may need a better acceleration loop.

Hypothesis:

- During the BitRunners stage, buying regular `NeuroFlux Governor` from BitRunners repeatedly may build enough BitRunners favor to unlock donations sooner.
- Early testing target is roughly `40+` favor, but this threshold is not confirmed.
- Once donations unlock, the daemon can buy BitRunners reputation faster and finish higher-rep BitRunners augmentations sooner.

Desired policy shape:

- Keep money/cash mode favored while this loop runs.
- Continue allowing background BitRunners work if the next useful augmentation is rep-blocked.
- Opportunistically buy BitRunners NeuroFlux Governor when it is affordable and does not violate reserve/cloud/home-upgrade pressure.
- Do not rush Red Pill if:
  - useful BitRunners augmentations are still missing
  - home RAM/core upgrades are still attractive and only low-trillion cost
  - cash income can support another round of infrastructure growth

Likely files:

```txt
/lib/daemon/augmentation-stage-policy.js
/lib/daemon/augmentations.js
/lib/daemon/augmentation-decision.js
/lib/daemon/augmentation-timing.js
/lib/daemon/faction-progression.js
/tools/augmentation-buyer-service.js
```

Testing signals:

```txt
/tools/augmentation-status.js
/data/augmentation-buyer-state.txt
/data/faction-work-plan.txt
/data/daemon-state.txt
/tools/faction-donation-status.js
```

Questions to answer before final tuning:

- What BitRunners favor value actually unlocks donation in the current BN/multipliers?
- How many NeuroFlux levels are worth buying before the install/reset timing becomes better than waiting?
- Should the loop force install after a favor target, or only recommend install timing?
- What reserve should protect home RAM/core upgrades during this stage?

## Server Purchaser Spam / Server Ticker

Implementation status:

- First pass implemented.
- `/economy/server-purchaser-service.js` no longer sends terminal `tprint` purchase spam by default.
- Use `--terminal true` to restore terminal prints while debugging.
- The service writes `/data/ui/server-ticker.txt`.
- `/tools/dashboard-state-writer.js` exposes this as `servers.serverTicker`.
- The dashboard bridge UI now has a `Server Ticker` card.

Problem:

- `/economy/server-purchaser-service.js` currently sends terminal output for every server purchase/upgrade:

```txt
ns.toast(result.message, "success", 8000)
ns.tprint("[SERVER PURCHASER] ...")
```

Desired behavior:

- Remove or gate terminal spam by default.
- Keep optional toast behavior if useful.
- Replace terminal spam with dashboard telemetry.

Dashboard idea:

- Add a compact cyberpunk `Server Ticker`.
- Show recent purchased server action:
  - server name
  - RAM
  - action type
  - cost
  - timestamp/freshness
- Optionally show fleet summary:
  - purchased server count
  - smallest RAM
  - largest RAM
  - next upgrade cost if exposed

Likely data path:

```txt
server-purchaser-service
-> /data/ui/server-ticker.txt or daemon state servers.cloudFleet.latestAction
-> dashboard-state-writer
-> bb-dashboard-bridge /state
-> dashboard card/view
```

Likely files:

```txt
/economy/server-purchaser-service.js
/lib/daemon/server-purchases.js
/lib/daemon/state.js
/tools/dashboard-state-writer.js
bb-dashboard-bridge/dashboard-ui/src/components/cards/*
```

Implementation guardrail:

- The daemon remains the authority.
- Dashboard ticker is display-only unless a future safe command path is explicitly added.

## Test Commands

In Bitburner, after syncing files:

```txt
kill /economy/server-purchaser-service.js
run /economy/server-purchaser-service.js --refresh 10000
run /tools/dashboard-state-writer.js --once
cat /data/ui/server-ticker.txt
cat /data/ui/dashboard-state.txt
```

Expected:

- server purchaser no longer prints purchase spam to terminal unless run with `--terminal true`
- `/data/ui/server-ticker.txt` exists
- dashboard state includes `servers.serverTicker`
- dashboard UI shows the Server Ticker card

For NeuroFlux diagnostics:

```txt
run /tools/augmentation-status.js
cat /data/augmentation-plan.txt
cat /data/augmentation-buyer-state.txt
```

Expected when BitRunners NeuroFlux is ready:

- `nextGoal.name` can be `NeuroFlux Governor`
- `nextGoal.faction` is `BitRunners`
- `stagePolicy.stage` is `bitrunners-neuroflux`
- buyer state includes `repeatable: true`
- buyer state includes `favorLoop`
- daemon stays money/income unless another progression condition overrides it

Expected when Daedalus NeuroFlux donation-unlock prep is active:

- `nextGoal.name` can be `NeuroFlux Governor`
- `nextGoal.faction` is `Daedalus`
- `stagePolicy.stage` is `daedalus-neuroflux`
- `favorLoop.favorState.formulaSource` is `formulas.reputation`
- `favorLoop.favorState.projectedFavor` is below `favorLoop.favorState.favorToDonate`
- once projected favor reaches the threshold, `nextGoal.name` should switch back to `The Red Pill`
