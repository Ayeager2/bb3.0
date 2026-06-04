# TELEMETRY SYSTEM

---

# PURPOSE

Telemetry exists to provide:

```txt id="j4pb9t"
- debugging
- progression visibility
- overlay support
- historical analysis
- daemon introspection
```

---

# CURRENT STATUS

Implemented:

```txt id="j7pqdr"
- dashboard telemetry
- formula-aware target telemetry
- lane telemetry
- EXP_RUNNING reporting
```

Planned:

```txt id="n6my4d"
- event history
- target history
- mode history
- progression history
- lane saturation metrics
- RAM pressure metrics
- share efficiency metrics
```

---

# FUTURE EVENT TYPES

```txt id="k9tywi"
MODE_SWITCH
PHASE_SWITCH
TARGET_SWITCH
SERVICE_FAILURE
SERVICE_RECOVERY
AUGMENTATION_PURCHASE
FACTION_ADVANCEMENT
RESET_READY
RESET_TRIGGERED
```

---

# FUTURE DATA LOCATIONS

```txt id="1vt3j0"
/data/telemetry/
/data/history/
/data/ui/
```

---

# OVERLAY SUPPORT

Telemetry should eventually support:

```txt id="7a7v9x"
- live overlay widgets
- historical charts
- lane heatmaps
- RAM usage views
- target efficiency graphs
```

---

# IMPORTANT RULE

Telemetry must remain:

```txt id="fc3o8o"
read-only
non-authoritative
low-overhead
```

Telemetry should never become required for daemon execution.