# Bitburner Tactical Dashboard + Bridge Progress Recap

## Overview

The project has evolved from:

```txt
simple React dashboard prototype
```

into:

```txt
modular tactical overlay platform
```

The architecture is now strong, modular, and scalable.

---

# COMPLETED SYSTEMS

---

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
│  ├─ graphs/
│  ├─ layout/
│  ├─ settings/
│  └─ shared/
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

### Bridge Endpoints

```txt
/state
/events
/topology
/test-theme/:accent
/live
```

### Bridge Features

* test mode
* live mode
* no-cache serving
* topology export
* event export
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

### Dashboard Reflects

* daemon mode
* target
* progression phase
* readiness
* faction progression
* policies
* capabilities
* topology

---

## 4. Card Architecture

### Completed

* reusable Card shell
* collapsible cards
* movable cards
* persistent layout order
* persistent collapse state
* persistent visibility state
* shared row/progress components

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

---

## 5. Local Storage Layout Persistence

### Completed

* card order persistence
* collapse persistence
* visibility persistence
* reset layout support

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
* visibility toggles
* switch-based UI
* reset controls

### Architectural Direction

* shell-style overlay panels
* icon tab system
* future expandable control system

---

## 8. Event Feed System

### Completed

* Bitburner event log writer
* bridge polling
* frontend event feed
* live updates

### Current Use

* daemon/system events
* debug events
* state transitions

---

## 9. Graph Shell System

### Completed

* reusable GraphCard
* reusable graph utility layer
* node generation helpers
* edge generation helpers
* dedupe systems
* graph reuse architecture

### Major Architectural Milestone

Reusable graph infrastructure now exists and can support future tactical overlays and telemetry systems.

---

## 10. Network Topology System

### Completed

* topology writer
* server scanning
* edge discovery
* topology bridge
* React topology rendering
* ring layout engine
* topology node classification

### Node Types

```txt
home
rooted
locked
purchased
backdoored
world daemon
```

---

## 11. Pathfinding Overlay

### Completed

* path generation
* home route discovery
* clickable nodes
* highlighted route chain
* animated path edges
* copyable terminal connect chain
* selected route overlay

### Current Purpose

* debugging tool
* navigation helper
* world daemon traversal prep

---

## 12. Development / Infrastructure Lessons Learned

### Completed / Fixed

* Vite proxy setup
* stale cache issues
* bridge overwrite issues
* topology endpoint issues
* React prop flow debugging
* ESLint conflicts
* live/test mode separation
* graph refresh stability

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

NOT:

* manual gameplay micromanagement

That distinction is extremely important.

---

# CURRENT BEST NEXT STEPS

# HIGH PRIORITY

---

## 1. Debug Action System

### Goal

Dashboard buttons trigger approved daemon debug actions.

### Architecture

```txt
Dashboard Button
→ Bridge POST /command
→ Command queue file
→ Bitburner command runner
→ allowlisted actions
```

### Planned Actions

* refresh topology
* force state snapshot
* dump daemon reasoning
* clear events
* health check
* test notifications

### Notes

This is currently the strongest next evolution path.

---

## 2. Topology Tactical Improvements

### Keep Minimal + Useful

### Add

* active target highlighting
* world daemon route emphasis
* backdoor-needed markers
* stuck/prep warnings
* current daemon focus marker

### Avoid

* excessive animations
* overcomplicated lane heatmaps
* unnecessary manual controls

---

## 3. Tooltip System

### Add Hover Telemetry

```txt
money %
security
prep score
RAM
hack req
batch count
income/sec
```

### Notes

This would provide a massive usability improvement.

---

## 4. World Daemon Mission Mode

### Goal

Special overlay mode for endgame progression.

### Features

* highlighted daemon path
* readiness warnings
* breadcrumb route
* mission-style UI mode

---

# MID PRIORITY TODO

---

## UI / SHELL

### Shell-style Sidebars

* left utilities bar
* right telemetry/event drawer
* detachable panels later

### Notification System

* toast notifications
* daemon alerts
* readiness alerts
* danger alerts

### Workspace Presets

* compact
* tactical
* graph-heavy
* debug
* faction mode

---

# LONG TERM TODO

---

## Command Palette

### VSCode-style Overlay

```txt
Ctrl + K
```

### Commands

* force target
* reset prep
* share aggressive
* debug snapshot
* refresh topology
* daemon explain

### Long-term Purpose

This evolves into:

```txt
tactical AI interaction layer
```

---

# VERY LONG TERM

---

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

The most important architectural realization was:

```txt
automation should remain the brain
dashboard should become the observability/control shell
```

That is the correct long-term direction.

Following that principle will keep the project powerful, maintainable, and scalable instead of turning into UI spaghetti.
