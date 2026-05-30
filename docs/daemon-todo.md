# daemon-todo.md

# P0 — CURRENT CORE EVOLUTION

* [ ] Build bootstrap mode.
* [ ] Add lightweight fresh-node startup logic.
* [ ] Delay heavy services until RAM thresholds are met.
* [ ] Continue daemon RAM reduction.
* [ ] Split progression-buyer into smaller services.

---

# P1 — SERVICE REGISTRY EVOLUTION

* [x] Build service registry.
* [x] Add service lifecycle ownership.
* [x] Add conditional service gating.
* [x] Add target-service extraction.
* [ ] Add one-shot completion tracking.
* [ ] Add automatic stale service cleanup.
* [ ] Add service restart telemetry.
* [ ] Add service crash tracking.

---

# P2 — BOOTSTRAP / EARLY GAME

* [ ] Fresh-node lightweight bootstrap mode.
* [ ] Tiny-script startup phase.
* [ ] Early money-only mode.
* [ ] Automatic TOR/openers progression.
* [ ] Automatic home RAM growth.
* [ ] Delayed heavy service startup.
* [ ] Phase-aware service unlocking.

---

# P3 — DAEMON-OWNED PURCHASE SYSTEMS

* [x] Refactor progression buyer into service.
* [x] Refactor cloud server purchasing.
* [x] Move target logic into target-service.
* [ ] Split progression-buyer into:

  * home-ram-buyer-service.js
  * darkweb-buyer-service.js
  * exe-buyer-service.js
* [ ] Add throttled purchase intervals.
* [ ] Add purchase telemetry/history.

---

# P4 — FACTION / BACKDOOR / AUGMENTATION INTELLIGENCE

* [ ] Future /lib/daemon/factions.js
* [ ] Future /lib/daemon/backdoors.js
* [ ] Future /lib/daemon/augmentations.js
* [ ] Track faction progression spine:

  * CyberSec
  * NiteSec
  * The Black Hand
  * BitRunners
  * Daedalus
* [ ] Auto-root/backdoor faction servers.
* [ ] Auto-join factions.
* [ ] Strategy-aware augmentation purchasing.
* [ ] Explicit reset-prep augmentation policies.

---

# P5 — TRUE PHASE-AWARE BUDGETING

* [ ] Replace leftover-based lane allocation.
* [ ] Implement intentional RAM budgeting.
* [ ] Cap money lanes during faction phase.
* [ ] Reserve EXP/share intentionally.
* [ ] Move more strategy into daemon decision systems.

---

# P6 — TARGET INTELLIGENCE

* [x] Target-service extraction.
* [x] Basic target hold timers.
* [ ] Improve target stability telemetry.
* [ ] Add ROI target scoring.
* [ ] Add saturation tracking.
* [ ] Add prep-cost awareness.
* [ ] Add target history weighting.
* [ ] Add adaptive target switching.

---

# P7 — CONDITIONAL STOCK TRADER

* [ ] Conditional daemon-managed stock trader.
* [ ] Requires TIX API.
* [ ] Optional 4S gating.
* [ ] Bootstrap disables trading.
* [ ] Reset-prep liquidates holdings.
* [ ] Add stop-loss/take-profit logic.
* [ ] Add portfolio telemetry.

---

# P8 — HACKNET / HASHNET

* [ ] Refactor justhacknet.js into daemon-owned service.
* [ ] Add ROI-aware Hacknet buying.
* [ ] Add hash spending strategy.
* [ ] Add BitNode-aware hash behavior.

---

# P9 — LONG-TERM DAEMON EVOLUTION

* [ ] Multi-target strategic execution.
* [ ] Dynamic lane balancing.
* [ ] Cross-target execution scaling.
* [ ] Full Singularity orchestration.
* [ ] Sleeve automation.
* [ ] Corporation automation.
* [ ] Reset/install orchestration.
* [ ] Telemetry-driven adaptive AI.

---

# COMPLETED

* [x] Modular UHM architecture.
* [x] Distributed batching restored.
* [x] Share worker orchestration.
* [x] Dynamic progression phases.
* [x] Share-before-money strategy.
* [x] Compact dashboard.
* [x] Service registry system.
* [x] HUD separation.
* [x] Session separation.
* [x] Telemetry separation.
* [x] Target-service extraction.
* [x] Cloud server scaling via ns.cloud.
* [x] Lean daemon refactor.
* [x] Conditional service gating.
