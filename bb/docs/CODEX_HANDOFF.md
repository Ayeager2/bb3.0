# Codex Handoff

## Current Focus

Bitburner daemon automation for BN4 is being tuned around:

- money mode
- exp / leveling mode
- faction mode
- augmentation timing and buying
- clean daemon state resets

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

- `/lib/daemon/dev-reset.js`
- `/tools/dev-refresh-state.js`
- `/lib/daemon/augmentations.js`
- `/tools/augmentation-buyer-service.js`
- `/tools/augmentation-status.js`

What changed:

- Dev refresh now removes all `.txt` state files under `/data/`, not only an old hard-coded list.
- Augmentation plans now refresh live game values for price, required rep, faction rep, and owned/queued augmentations.
- Augmentation buyer now writes `/data/augmentation-buyer-state.txt` every cycle.
- Augmentation status now displays buyer policy and buyer state diagnostics.

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

- `augmentation-status.js` prints `Diagnostic Version: augmentation-status-policy-diagnostics-v2`.
- Status output includes `Buyer Allowed`.
- Status output includes `Augmentation Buyer Policy`.
- Status output includes `Augmentation Buyer State`.
- `/data/augmentation-buyer-state.txt` exists.
- Dev refresh removes more than the old small five-file list when more state files exist.

## Quick File Checks In Bitburner

Use these to confirm the right in-game files were copied:

```txt
grep Diagnostic /tools/augmentation-status.js
grep AUGMENTATION_BUYER_STATE_FILE /tools/augmentation-buyer-service.js
grep all-data-text /tools/dev-refresh-state.js
grep findDataTextFiles /lib/daemon/dev-reset.js
```

If any command has no match, that file is still old or copied to the wrong Bitburner path.

## Next Debug Target

Once the correct folder is synced, if augmentations still do not buy, inspect:

```txt
cat /data/augmentation-buyer-state.txt
```

That file should show whether buying is blocked by policy, plan readiness, live faction rep, live money, max price, or `purchaseAugmentation` returning false.
