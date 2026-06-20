# Codex Handoff

## Current Focus

Bitburner daemon automation has moved from BN4 victory cleanup into BN9 Hacknet support.

BN9 current focus:

- bootstrap Hacknet growth before full daemon starts
- Hacknet server/node purchasing and upgrades
- hash spending policy
- BitNode-aware service capability gates
- preventing unavailable cloud/purchased-server logic from running in BN9

Older BN4 automation remains relevant for:

- money mode
- exp / leveling mode
- faction mode
- augmentation timing and buying
- clean daemon state resets
- bootstrap rebuild speed after a fresh start
- UHM final-leveling execution balance

`exp`, `leveling`, and `level` are intended to mean the same forced mode. `money` stays separate. `faction` is a forced mode for direct faction progression work.

## Important Discovery

The recent test issue was caused by Bitburner running files from an older folder after the project folder was converted/moved. The game was not using the updated files from this repo.

Signs that Bitburner is still running old files:

- `/tools/augmentation-status.js` does not print `Diagnostic Version`.
- `/tools/augmentation-status.js` does not print `Buyer Allowed`.
- `/tools/augmentation-status.js` does not print `Augmentation Buyer State`.
- `/data/augmentation-buyer-state.txt` is missing after daemon runs.
- `/tools/dev-refresh-state.js` only removes about five files.

## Latest Local Code Changes

Updated local project files:

- `/lib/daemon/bitnode-capabilities.js`
- `/lib/daemon/hacknet.js`
- `/economy/hacknet-buyer-service.js`
- `/economy/hacknet-hash-spender-service.js`
- `/tools/hacknet-status.js`
- `/bootstrap-daemon.js`
- `/controllers/uhm.js`
- `/lib/daemon/services.js`
- `/lib/daemon/state.js`
- `/lib/daemon/faction-progression.js`
- `/lib/daemon/progression-buyer.js`
- `/lib/uhm/modes/exp-sprint.js`
- `/tools/faction-donation-service.js`
- `/tools/dashboard-command-runner.js`
- `/tools/daemon-hud.js`
- `/tools/refresh-augmentation-plans.js`
- `/economy/server-purchaser-service.js`

What changed:

- BN9 Hacknet support added:
  - bootstrap starts Hacknet buyer/hash spender when current BitNode is 9
  - buyer can run without daemon-state in BN9 or with `--force true`
  - hash spender defaults to `auto` and uses `/lib/daemon/hacknet-hash-policy.js`
  - auto policy sells during bootstrap, improves studying only while actively studying, reduces/increases current money target when daemon-state is available, and falls back to selling hashes
  - `/data/hacknet-state.txt` and `/data/hacknet-hash-spender-state.txt` record live state
  - `/tools/hacknet-status.js` prints Hacknet status
- BitNode capability layer added:
  - BN9 marks cloud/purchased servers unavailable
  - BN9 marks Hacknet/hash spending as the primary economy path
  - daemon spending policy should set `allowServerPurchases=false`, `allowHacknet=true`, `hacknetPrimary=true`
  - cloud fleet reports blocked with the BN9 reason instead of trying cloud APIs
- Daemon session stats now update inside `/lib/daemon/state.js`; `/tools/daemon-session-service.js` is retired/disabled so it cannot race-write `/data/daemon-state.txt`.
- `daemon.js` now performs the dev state refresh on every startup before reading state or launching services.
- Service manager can still stop retired services that set `stopWhenBlocked`.
- World-daemon hacking requirement now comes from the live `w0r1d_d43m0n` server instead of hardcoded `3000`.
- Progression/darkweb/home upgrade buyers are Bitburner v3 API compatible.
- UHM EXP sprint no longer makes leveling hack-only.
- Final leveling/endgame EXP sprint should launch `exp-hack.js`, `exp-grow.js`, and `exp-weaken.js` together.
- EXP sprint rebalances stale single-role worker walls.
- Faction donation service now imports `logPurchase`, preventing a success-path crash.
- Dashboard command runner now reports failed command script launches instead of false success.
- Augmentation plan refresh waits for the augmentation data builder instead of blindly sleeping one second.
- Daemon HUD destroy-stage logic matches the actual destroy service: Red Pill + root + required hacking.
- Augmentation buyer reserve is 1m, not 100m/1b, when policy reserve is disabled.
- Fresh-start life service is daemon-launched without a daemon Singularity gate; it self-diagnoses BN/Singularity availability in `/data/fresh-start-life-state.txt`.

## Verification Commands In Bitburner

For BN9 fresh bootstrap:

```txt
killall
run startup.js
run /tools/hacknet-status.js
cat /data/hacknet-state.txt
cat /data/hacknet-hash-spender-state.txt
```

Expected BN9 bootstrap signs:

- Hacknet buyer is not blocked by missing daemon-state.
- `Allowed: YES` appears in `/tools/hacknet-status.js`.
- Hash spender says either `waiting-hashes` or `spent`.
- Cloud/server purchaser is not required during bootstrap.

After syncing the updated project files into the folder Bitburner actually watches, run:

```txt
killall
run daemon.js
```

Wait about 15-30 seconds, then run:

```txt
run /tools/augmentation-status.js
cat /data/augmentation-buyer-state.txt
```

Expected signs the new files are active:

- `cat /data/bootstrap-plan.txt` shows a `cycle` with hack/grow/weaken roles after `run startup.js` selects bootstrap under 64GB home RAM.
- `tail /controllers/uhm.js` during `run daemon.js --level` reports EXP sprint and process lists show all three EXP worker scripts.
- `/workers/exp-hack.js`, `/workers/exp-grow.js`, and `/workers/exp-weaken.js` all appear during final leveling.

## Quick File Checks In Bitburner

Use these to confirm the right in-game files were copied:

```txt
grep buildSprintCycle /lib/uhm/modes/exp-sprint.js
grep daemon-session /lib/daemon/services.js
grep getWorldDaemonStatus /lib/daemon/faction-progression.js
grep waitForProcess /tools/refresh-augmentation-plans.js
grep logPurchase /tools/faction-donation-service.js
grep DEFAULT_RESERVE_MONEY /tools/augmentation-buyer-service.js
grep getSingularityDiagnostics /tools/fresh-start-life-service.js
```

If any command has no match, that file is still old or copied to the wrong Bitburner path.

## Next Debug Target

Once the correct folder is synced, restart cleanly:

```txt
killall
run daemon.js
```

`daemon.js` performs the same refresh that `/tools/dev-refresh-state.js` used to require manually. Then inspect:

```txt
tail /controllers/uhm.js
ps
cat /data/daemon-state.txt
```

Expected process mix:

```txt
/workers/exp-hack.js
/workers/exp-grow.js
/workers/exp-weaken.js
```

Also verify `/data/daemon-state.txt` has live `sessionStats` without `/tools/daemon-session-service.js` running.

For fresh-start BN1/BN4 study/shoplift verification:

```txt
cat /data/fresh-start-life-state.txt
```

Expected path: `starting`, then `studying` until hacking 20, then `crime` with `Shoplift` until faction work handoff is ready. If it reports `unavailable`, inspect the embedded Singularity diagnostics.
