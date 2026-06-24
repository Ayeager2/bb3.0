# Codex Handoff

## Current Focus

Bitburner daemon automation has moved from BN4 victory cleanup into BN9 Hacknet support.

BN9 current focus:

- bootstrap Hacknet growth before full daemon starts
- Hacknet server/node purchasing and upgrades
- hash spending policy
- BitNode-aware service capability gates
- preventing unavailable cloud/purchased-server logic from running in BN9
- preserving Hacknet server RAM for hash production instead of UHM worker scripts

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
  - buyer has no daemon min-money gate; it should stay ready even when broke
  - hash spender is gated on the buyer running, so it should not run by itself
  - buyer uses ROI/payback scoring instead of cheapest-first
  - buyer can now chain multiple affordable ROI-good purchases per cycle:
    - default service/bootstrap value: `--max-purchases 50`
    - default service/bootstrap payback gate is unlimited with `--max-payback 0`
    - purchase toast/log message is one cycle summary instead of one popup per individual buy
    - purchase log entries include `category`, `details`, and bundled `purchases` for dashboard spend analysis
  - production ROI uses a default `$2m` Sell for Money value assumption and the live hash cost
  - cache upgrades are handled by capacity policy, not ROI:
    - default target cache: 8
    - default hash buffer: 120 minutes of current production
  - low-return Hacknet actions are skipped by the payback gate so home RAM/cores can compete
  - hash spender defaults to `auto` and uses `/lib/daemon/hacknet-hash-policy.js`
  - auto policy is BN9-aware:
    - active studying uses `Improve Studying`
    - cash ignition sells hashes until cash/hash production are stable
    - Hacknet snowball sells hashes while Hacknet buyer is not complete
    - target boost waits until Hacknet buyer is complete, then spends a small slice on `Reduce Minimum Security` or `Increase Maximum Money`
    - target boost sells leftover hashes in the same cycle
    - fallback sells hashes for augments/home/stocks/Hacknet growth
  - bootstrap starts the hash spender with priority RAM and `--max-spends 500` so banked hashes become cash quickly
  - `/data/hacknet-state.txt` and `/data/hacknet-hash-spender-state.txt` record live state
  - `/tools/hacknet-status.js` prints Hacknet status, hash policy source/phase, fallback action, and last-cycle primary/fallback spend counts
  - `/data/purchases.log.txt` is the authoritative buyer ledger consumed by the dashboard bridge
- BitNode capability layer added:
  - BN9 marks cloud/purchased servers unavailable
  - BN9 marks Hacknet/hash spending as the primary economy path
  - daemon spending policy should set `allowServerPurchases=false`, `allowHacknet=true`, `hacknetPrimary=true`
  - daemon spending policy sets `allowHacknetExecution=false`
  - stock trader can run once TIX API exists, but it is not expected to help bootstrap
  - cloud fleet reports blocked with the BN9 reason instead of trying cloud APIs
  - server-purchaser is policy-gated by `allowServerPurchases`; in BN9 it should not keep running just to report blocked
- UHM no longer treats Hacknet servers as normal execution hosts when policy blocks Hacknet execution.
- UHM cleans old `/workers/...` processes off blocked Hacknet hosts so hashes recover without manual cleanup.
- BN9 faction path changes:
  - Netburners has BN9 priority 1000 in faction profiles
  - faction observer now calculates Hacknet level/RAM/core readiness instead of always blocking Hacknet requirements
  - faction join service sorts invitations by BitNode-specific profile priority, putting Netburners first in BN9
  - BN9 augmentation scoring/stage policy strongly favors Netburners Hacknet augmentations
  - BN9 daemon policy allows faction work and augmentation buying when Singularity is available, so Netburners rep/augs can actually progress
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
- Hash policy should show `bn9-cash-ignition`, `bn9-hacknet-snowball`, `bn9-target-security`, `bn9-target-money`, or a BN9 fallback source.
- Bootstrap tail says `Hacknet RAM : reserved for hash production`.
- `hacknet-server-*` hosts should not be running `/workers/tiny-worker.js`.
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
