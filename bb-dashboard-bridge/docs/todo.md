# Bitburner Dashboard Bridge Todo

Last updated: June 7, 2026

## Pause Handoff

- [x] Capture current dashboard bridge state in `docs/handoff-2026-06-07.md`.
- [x] Document recent inspector, service health, reasoning, command palette, and topology tactical overlay work.
- [x] Leave World Daemon mission mode as the next planned project item.

## Immediate Bugs

- [x] Fix bridge crash: `OUT_REASONING_FILE is not defined`.
  - Add `/data/ui/daemon-reasoning.txt` and `public/daemon-reasoning.json` constants in `bridge.js`.
- [x] Add root `npm run dev` script.
  - Current root package only had `npm start`, so running `npm run dev` from `bb-dashboard-bridge` failed.
- [x] Confirm bridge startup after storm/power interruption.
  - Run `npm run dev` from `bb-dashboard-bridge`.
  - Expected: bridge stays alive after Bitburner connects and reasoning polling starts.
- [x] Confirm UI startup path.
  - Run `npm run ui` from `bb-dashboard-bridge`, or run `npm run dev` inside `dashboard-ui`.
  - Expected: Vite dashboard starts on `http://127.0.0.1:5173`.

## High Priority

- [x] Surface new daemon target telemetry in React.
  - Show formula math source.
  - Show best candidate, current candidate, score, estimated money/sec, and target reason.
  - Best first target: `TargetIntelView`.
  - Note: requires updated `/tools/dashboard-state-writer.js` to be synced into Bitburner so `targetAnalysis` is present in `/data/ui/dashboard-state.txt`.
- [x] Verify daemon reasoning panel end to end.
  - Bridge should serve `/reasoning`.
  - Bridge should serve `/reasoning/history`.
  - Inspector Reasoning tab should show current and historical reasoning.
  - Polished Reasoning tab with freshness, level counts, current items, and compact history.
- [x] Add a better root README for how to run the whole system.
  - Bridge command.
  - UI command.
  - Bitburner Remote API requirement.
  - Expected ports: `12525`, `31337`, `5173`.

## Medium Priority

- [x] Improve service health display.
  - Running/stopped/error state.
  - Host, threads, script name.
  - Policy-block reason.
  - Restart/failure count if exposed by daemon later.
  - Added supervisor summary, explicit blocked/completed/running/failed states, policy-block labels, and optional restart/failure counters.
- [x] Expand command palette safely.
  - Open inspector tabs.
  - Switch workspace mode.
  - Refresh topology.
  - Clear events.
  - Debug snapshot.
  - Later: force target, force mode, daemon explain.
  - Hardened Ctrl-K focus, keyboard selection, Escape close, and header button fallback.
- [x] Add topology tactical overlays.
  - Faction server overlay.
  - Backdoor-needed path action.
  - Current daemon focus marker.
  - Expanded hover telemetry.
  - Added tactical legend counts, next backdoor action, faction/backdoor node labels, compact one-third legend layout, and richer hover roles/path details.

## Long Term

- [ ] World daemon mission mode.
  - Route banner.
  - Readiness warnings.
  - Sticky danger toast when ready.
  - Point-of-no-return display.
  - Start from `docs/handoff-2026-06-07.md`.
- [ ] Workspace preset polish.
  - Tactical.
  - Debug.
  - Progression.
  - Faction.
  - Reset prep.
- [ ] True cyberdeck shell experiments.
  - Detachable panels.
  - Resizable workspaces.
  - Tactical overlays.
  - Plugin-style command/view registry.

## Guardrail

The daemon remains the automation brain. The dashboard remains the observability and safe-control shell.
