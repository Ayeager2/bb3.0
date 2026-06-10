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

- `/tools/build-bootstrap-cheatsheet.js`
- `/lib/bootstrap/formula-cheatsheet.js`
- `/bootstrap-daemon.js`
- `/workers/tiny-worker.js`
- `/tools/bootstrap-money.js`
- `/lib/uhm/modes/exp-sprint.js`

What changed:

- Late-game Formulas.exe can generate a bootstrap cheat sheet for the next fresh start.
- Bootstrap daemon now writes `/data/bootstrap-plan.txt`.
- Bootstrap workers can run explicit hack/grow/weaken roles.
- Bootstrap launch logic repeats a logical H/G/W cycle instead of one oversized one-role process.
- `/tools/bootstrap-money.js` now uses `/workers/tiny-worker.js`; the old `/workers/bootstrap-worker.js` file does not exist.
- UHM EXP sprint no longer makes leveling hack-only.
- Final leveling/endgame EXP sprint should launch `exp-hack.js`, `exp-grow.js`, and `exp-weaken.js` together.
- EXP sprint rebalances stale single-role worker walls.

## Verification Commands In Bitburner

After syncing the updated project files into the folder Bitburner actually watches, run:

```txt
killall
run /tools/dev-refresh-state.js
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
grep bootstrap-plan /bootstrap-daemon.js
grep BOOTSTRAP_FORMULA_CHEATSHEET /lib/bootstrap/formula-cheatsheet.js
grep build-bootstrap-cheatsheet /tools/build-bootstrap-cheatsheet.js
```

If any command has no match, that file is still old or copied to the wrong Bitburner path.

## Next Debug Target

Once the correct folder is synced, if leveling/endgame still collapses into hack-only, inspect:

```txt
tail /controllers/uhm.js
ps
```

Expected process mix:

```txt
/workers/exp-hack.js
/workers/exp-grow.js
/workers/exp-weaken.js
```
