# daemon-todo.md

## P0 — CURRENT CLEANUP

* [ ] Finish reviewing non-core scripts.
* [ ] Keep only `daemon.js` and `/controllers/uhm.js` active by default.
* [ ] Remove redundant persistent HUD/planner scripts from daemon auto-start.
* [ ] Archive old standalone scripts whose logic will be reused later.
* [ ] Convert useful forever-loop scripts into daemon-called libraries.

## P1 — SERVICE REGISTRY / LIFECYCLE

* [ ] Build daemon service registry.
* [ ] Add service fields:

  * `keepAlive`
  * `minHomeRam`
  * `minMoney`
  * `requiresSingularity`
  * `requiresTixApi`
  * `requires4SApi`
  * `disabledPhases`
  * `purpose`
* [ ] Add daemon logic:

  * can start service?
  * should keep running?
  * has completed purpose?
  * should kill service?
* [ ] Add one-shot cleanup tracking.

## P2 — EARLY BOOTSTRAP / HOME RAM GROWTH

* [ ] Fresh run starts tiny.
* [ ] Start lightweight UHM/bootstrap money mode first.
* [ ] Buy TOR/openers through daemon-owned progression buyer.
* [ ] Buy home RAM as soon as policy/threshold allows.
* [ ] Slowly unlock heavier scripts as money/RAM improves.
* [ ] Avoid launching heavy planners/controllers early.

## P3 — DAEMON-OWNED PURCHASE MODULES

* [x] Refactor progression buyer into `/lib/daemon/progression-buyer.js`.
* [ ] Refactor server purchasing into `/lib/daemon/server-purchases.js`.
* [ ] Later refactor Hacknet into `/lib/daemon/hacknet.js`.
* [ ] Add throttling so purchase checks do not run every daemon loop.

## P4 — FACTION / BACKDOOR / AUGMENTATION INTELLIGENCE

* [ ] Future `/lib/daemon/factions.js`.
* [ ] Future `/lib/daemon/backdoors.js`.
* [ ] Future `/lib/daemon/augmentations.js`.
* [ ] Track faction spine:

  * CyberSec
  * NiteSec
  * The Black Hand
  * BitRunners
  * Daedalus
* [ ] Root/backdoor faction servers when eligible.
* [ ] Auto-join factions when Singularity allows.
* [ ] Buy augmentations based on BitNode strategy.
* [ ] Do not auto-install/reset until reset-prep policy exists.

## P5 — PHASE-AWARE LANE BUDGETING

* [ ] Move from “share reserves first, money uses leftovers” to true lane budgets.
* [ ] Cap money lanes during faction phase.
* [ ] Reserve share/EXP percentages intentionally.
* [ ] Implement first in `/lib/uhm/lanes.js`.
* [ ] Later move strategy to `/lib/uhm/decision.js`.

## P6 — TARGET STABILITY / TARGET INTELLIGENCE

* [x] Basic target hold timer added.
* [ ] Improve blocked target swap telemetry.
* [ ] Add smarter target scoring:

  * income/sec
  * prep cost
  * security drift
  * batch saturation
  * ROI
  * history

## P7 — CONDITIONAL STOCK TRADER

* [ ] Keep `/economy/stock-trader.js` as `CONDITIONAL_DAEMON`.
* [ ] Start only with TIX API and money threshold.
* [ ] Prefer 4S mode.
* [ ] Treat trend-only mode as risky/optional.
* [ ] Phase exposure:

  * bootstrap: 0%
  * expansion: 10–20%
  * scaling: 40%
  * faction: ~20%
  * reset-prep: sell all
* [ ] Add stop-loss/take-profit.
* [ ] Add trade cooldown.
* [ ] Emit stock summary to daemon state/dashboard later.

## P8 — HACKNET / HASHNET LATER

* [ ] Archive current `justhacknet.js`.
* [ ] Later create `/lib/daemon/hacknet.js`.
* [ ] Use ROI/payoff logic.
* [ ] Use daemon phase/spending policy.
* [ ] Add hash selling/spending strategy for hash-focused BitNodes.

## COMPLETED

* [x] Modular UHM architecture.
* [x] Distributed batching restored.
* [x] Share worker created.
* [x] Share runs on purchased servers.
* [x] Dynamic progression phases created.
* [x] Share runs before money lanes.
* [x] Compact UHM dashboard.
* [x] Removed/archived several redundant persistent HUD concepts.
