# Bitburner Tactical Dashboard + Bridge Progress Recap

## Current Pause Note - 2026-06-07

The current source-of-truth handoff is:

```txt
../../docs/handoff-2026-06-07.md
```

Recent completed work includes:

* consolidated inspector tabs
* polished daemon reasoning panel
* improved service health display
* hardened Ctrl+K command palette
* condensed one-third-width topology card
* topology tactical overlays for faction servers, backdoor-needed routes, daemon focus, and richer hover telemetry

Next planned work is World Daemon mission mode.

## Overview

The project has evolved from:

```txt
simple React dashboard prototype
```

into:

```txt
modular tactical mission-control shell
```

The architecture is now strong, modular, scalable, and moving toward a true cyberdeck-style observability/control platform.

---

# COMPLETED SYSTEMS

## 1. Vite + React Dashboard Foundation

### Completed

* Vite setup
* React app structure
* modular component layout
* reusable shared UI components
* clean folder hierarchy
* hot reload dev environment

### Current Structure Direction

```txt
src/
├─ api/
├─ components/
│  ├─ cards/
│  ├─ events/
│  ├─ graphs/
│  ├─ inspector/
│  ├─ layout/
│  ├─ notifications/
│  ├─ settings/
│  ├─ shared/
│  └─ views/
├─ styles/
├─ utils/
```

---

## 2. External Bitburner Bridge

### Completed

* Node bridge server
* WebSocket connection to Bitburner Remote API
* polling system
* live JSON export
* static hosting
* Vite proxy integration
* command push support using Remote API `pushFile`

### Bridge Endpoints

```txt
/state
/events
/topology
/command
/command/status
/test-theme/:accent
/live
```

### Bridge Features

* test mode
* live mode
* no-cache serving
* topology export
* event export
* command dispatch
* command status polling
* bridge timestamps

---

## 3. Live Dashboard State System

### Completed

* daemon state pipeline
* schema-driven dashboard state
* progression state
* readiness state
* policy state
* victory state
* capabilities state
* share state
* lane state
* theme state
* command runner status state
* topology state

### Dashboard Reflects

* daemon mode
* target
* progression phase
* readiness
* faction progression
* policies
* capabilities
* topology
* command runner status
* bridge/game/daemon timestamps

---

## 4. Card + View Architecture

### Completed

* reusable Card shell
* reusable pure View components
* cards now wrap views
* inspector can use views directly
* collapsible cards
* movable cards
* persistent layout order
* persistent collapse state
* persistent visibility state
* shared row/progress/chip components

### Implemented Cards

```txt
CoreStateCard
PlayerCard
TargetIntelCard
BN4ReadinessCard
VictoryPlanCard
LaneAllocationCard
PolicyCard
ServerSummaryCard
CapabilitiesCard
WidgetResolverCard
EventFeedCard
ServiceHealthCard
TargetStabilityCard
NetworkMapCard
NetworkTopologyCard
```

### Implemented Views

```txt
CoreStateView
TargetIntelView
TargetStabilityView
VictoryPlanView
BN4ReadinessView
PolicyView
CapabilitiesView
LaneAllocationView
ServiceHealthView
EventFeedView
```

---

## 5. Local Storage Persistence

### Completed

* card order persistence
* collapse persistence
* visibility persistence
* reset layout support
* inspector open/closed persistence
* toast settings persistence
* workspace settings persistence

---

## 6. Cyberpunk Theme Engine

### Completed

* tactical dark theme
* neon accents
* animated glow/shimmer
* accent switching
* theme testing endpoint

### Theme States

```txt
singularity_purple
money_green
danger/reset modes
```

---

## 7. Dashboard Control Panel

### Completed

* settings gear
* dashboard side panel
* icon tab system
* widget visibility settings
* layout reset settings
* theme settings
* data settings
* debug action settings
* toast notification settings
* workspace mode settings

### Architectural Direction

* settings/control belongs in the gear panel
* mission details belong in the right inspector
* main dashboard stays clean and tactical

---

## 8. Event Feed System

### Completed

* Bitburner event log writer
* bridge polling
* reusable `EventFeedView`
* event drawer refactored away from duplicated rendering
* inspector Events tab uses `EventFeedView`
* live updates

### Current Use

* daemon/system events
* debug events
* command events
* topology events
* state transitions

---

## 9. Notification / Toast System

### Completed

* floating toast host
* event-to-toast bridge
* severity styling
* auto-dismiss support
* sticky/manual-close support
* per-level filtering
* per-event-type filtering
* toast settings panel

### Supported Toast Controls

```txt
enabled / disabled
info
success
warning
danger
error
command
topology
reset
world
backdoor
faction
services
daemon
system
```

### TTL Rules

```txt
toastTtl: 3000      auto-dismiss after 3 seconds
toastTtl: "close"  sticky until manually closed
toastTtl: 0        sticky until manually closed
```

---

## 10. Graph Shell System

### Completed

* reusable `GraphCard`
* reusable graph utility layer
* node generation helpers
* edge generation helpers
* dedupe systems
* graph reuse architecture
* floating graph tooltips
* tooltip container-relative positioning fix

### Major Architectural Milestone

Reusable graph infrastructure now exists and can support future tactical overlays and telemetry systems.

---

## 11. Network Topology System

### Completed

* topology writer
* server scanning
* edge discovery
* topology bridge
* React topology rendering
* active-target-centered layout
* topology node classification
* legend/stats panel
* refresh topology command button
* prep warning markers
* faction server markers
* backdoor-needed markers

### Node Types

```txt
home
rooted
locked
purchased
backdoored
faction server
world daemon
```

---

## 12. Pathfinding Overlay

### Completed

* path generation
* home route discovery
* clickable nodes
* highlighted route chain
* animated path edges
* copyable terminal connect chain
* selected route overlay
* world daemon route panel
* world daemon route emphasis

### Current Purpose

* debugging tool
* navigation helper
* world daemon traversal prep
* backdoor/faction visibility

---

## 13. Debug Action System

### Completed

### Goal

Dashboard buttons trigger approved daemon debug actions.

### Architecture

```txt
Dashboard Button
→ Bridge POST /command
→ pushFile Remote API
→ /data/ui/dashboard-command.txt
→ Bitburner command runner
→ allowlisted actions
→ status file
→ bridge /command/status
→ dashboard status display
```

### Implemented Actions

* refresh topology
* force state snapshot
* clear events
* event test

### Command Runner

Completed:

* `/tools/dashboard-command-runner.js`
* command heartbeat
* command status file
* success/error status
* service registry integration
* auto-launch via daemon service layer

---

## 14. Right Inspector Drawer

### Completed

* right-side shell drawer
* icon tabs
* Core tab
* Victory tab
* Policy tab
* Services tab
* Events tab
* pure view composition
* scrollable detail sections

### Current Tabs

```txt
Core
- Core State
- Target Intel
- Target Stability

Victory
- Victory Plan
- BN4 Readiness

Policy
- Spending Policy
- Capabilities
- Lane Allocation

Services
- Service Health
- Debug Actions

Events
- Event Feed
```

---

## 15. Dashboard Cockpit Header

### Completed

* money moved to top header
* hacking moved to top header
* mode moved to top header
* phase moved to top header
* target moved to top header
* command runner status moved to top header
* bridge/game/daemon timestamps displayed

### Result

The main dashboard is now a cockpit:

```txt
Header = essential live stats
Center = topology / tactical view
Right Inspector = details
Gear Panel = settings/control
Toasts = urgent awareness
```

---

## 16. Workspace Mode System

### Completed

* workspace settings
* workspace presets
* localStorage persistence
* settings panel integration
* topology panel visibility controls

### Workspace Modes

```txt
Tactical
Debug
Progression
Minimal
```

### Toggleable Panels

```txt
showLegend
showWorldPanel
showPathPanel
showTopologyStats
```

---

## 17. CSS Architecture Cleanup

### Completed

* component-specific CSS split
* graph CSS moved to `GraphCard.css`
* topology CSS moved to `NetworkTopologyCard.css`
* info panel CSS moved to `InfoPanel.css`
* event feed CSS moved to `EventFeedView.css`
* event drawer CSS separated
* toast CSS separated
* workspace settings CSS separated
* debug actions CSS separated

### Direction

Avoid giant global CSS files. Keep global CSS for tokens/themes/layout only.

---

## 18. Development / Infrastructure Lessons Learned

### Completed / Fixed

* Vite proxy setup
* stale cache issues
* bridge overwrite issues
* topology endpoint issues
* React prop flow debugging
* ESLint conflicts
* live/test mode separation
* graph refresh stability
* Remote API method mismatch fixed: `writeFile` → `pushFile`
* floating tooltip viewport offset bug fixed
* drawer/card/view separation clarified

---

# CURRENT ARCHITECTURE DIRECTION

The dashboard is no longer:

```txt
static UI
pretty cards
simple telemetry
```

It is becoming:

```txt
Bitburner mission-control shell
```

The dashboard is now primarily:

* observability
* debugging
* tactical visibility
* automation introspection
* daemon diagnostics
* safe command dispatch

NOT:

* manual gameplay micromanagement

That distinction is still the most important architectural guardrail.

---

# CURRENT BEST NEXT STEPS

# HIGH PRIORITY

## 1. Command Palette

### Goal

VSCode-style tactical command overlay.

```txt
Ctrl + K
```

### Commands

* refresh topology
* clear events
* debug snapshot
* event test
* open inspector tab
* switch workspace mode
* later: force target
* later: reset prep
* later: share aggressive
* later: daemon explain

### Notes

This should call the existing safe command system instead of inventing another control path.

---

## 2. World Daemon Mission Mode

### Goal

Special UI mode for endgame progression.

### Features

* highlighted daemon path
* readiness warnings
* breadcrumb route
* mission-style banner
* sticky danger toast when world daemon is ready
* “point of no return” state display

---

## 3. Service Health Improvements

### Add

* better service status schema
* running/stopped/error states
* script name
* host
* thread count
* last start time
* last error
* restart count
* policy-blocked reason

---

## 4. Daemon Reasoning / Explain Panel

### Goal

Add a panel that answers:

```txt
Why is daemon doing this?
Why this target?
Why this mode?
What is blocked?
What is next?
```

### Data Needed

* current decision reason
* mode reason
* target reason
* blocked services
* policy restrictions
* next action

---

## 5. Topology Tactical Improvements

### Remaining Useful Items

* current daemon focus marker refinement
* backdoor path action button
* faction overlay mode
* server hover telemetry expansion
* batch/worker activity if exposed by daemon later

### Avoid

* excessive animations
* noisy heatmaps
* unnecessary manual controls

---

# MID PRIORITY TODO

## UI / SHELL

### Shell-style Sidebars

* optional left utility rail
* inspector tab persistence
* detachable panels later

### Notification System Polish

* toast history
* pause notifications
* danger-only mode
* sound hook later
* notification test command

### Workspace Presets

Already started. Improve later with:

* compact
* tactical
* debug
* progression
* faction
* reset-prep
* graph-heavy

---

# LONG TERM TODO

## Command Palette Expansion

### Long-term Commands

* force target
* force mode
* reset prep
* share aggressive
* daemon explain
* launch/stop service
* switch workspace
* open inspector tab
* copy world daemon path

### Long-term Purpose

This evolves into:

```txt
tactical AI interaction layer
```

---

# VERY LONG TERM

## True Cyberdeck UI

### Potential Systems

* floating windows
* detachable graphs
* draggable/resizable workspaces
* overlay rendering engine
* tactical overlays
* notification bus
* workspace manager
* plugin architecture

### Important Note

Only worth pursuing after:

* automation stabilizes
* debugging tools mature
* daemon intelligence deepens

---

# MOST IMPORTANT INSIGHT SO FAR

The most important architectural realization remains:

```txt
automation should remain the brain
dashboard should become the observability/control shell
```

That is the correct long-term direction.

Following that principle will keep the project powerful, maintainable, and scalable instead of turning into UI spaghetti.
