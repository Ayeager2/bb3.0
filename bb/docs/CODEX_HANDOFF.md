# Codex Handoff

## Current Focus

Bitburner daemon automation for BN4 is being tuned around:

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

## Verification Commands In Bitburner

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

- `cat /data/bootstrap-plan.txt` shows a `cycle` with hack/grow/weaken roles after `run bootstrap-daemon.js`.
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
