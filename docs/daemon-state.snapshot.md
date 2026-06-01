# ADD TO daemon-state.snapshot.md

## CURRENT_SERVICE_MANAGER_STATE

```txt
service-manager.js now supports:

- normalized service definitions
- policyFlag-based daemon policy gating
- stopWhenBlocked behavior
- duplicate process protection
- startup cooldown protection
- improved ns.exec failure diagnostics
- one-shot completion tracking
```

Current cooldown system:

```txt
FAILURE_CACHE implemented
30-second retry cooldown implemented
prevents infinite failed ns.exec spam loops
```

Current service policy architecture:

```txt
daemon policy is now the primary authority for:

- faction work
- faction donations
- faction joins
- augmentation purchases
- stock trading
```

Service registry now supports:

```txt
policyFlag
stopWhenBlocked
requiresSingularity
requiresTixApi
minMoney
minHomeRam
maxHomeRam
phase restrictions
```

## CURRENT_TARGET_STABILITY_STATE

```txt
target stability foundation implemented

daemon now tracks:
- targetSince
- targetStability
- blocked swaps
- target hold timers

manual --force-target overrides stability logic
```

Current hold timer:

```txt
5 minutes
```

Current limitation:

```txt
target proposals still come from target-service

daemon does not yet fully own strategic target generation
```

## CURRENT_NEXT_PRIORITY

```txt
daemon-owned strategic target selection
```

Goals:

```txt
replace target-service authority with daemon intelligence

future target selection should consider:
- ROI
- weaken time
- batch saturation
- target stability
- hacking level
- faction progression needs
- EXP bottlenecks
- money bottlenecks
- prep cost
```

## CURRENT_SERVICE_ARCHITECTURE_DIRECTION

```txt
services are becoming deterministic daemon-managed infrastructure

goal:
daemon becomes the operating system
services become gated subsystems
UHM becomes pure execution engine
```
