# bitburner-reference.md

# CORE COMMANDS

## Run daemon

```txt
run daemon.js
run daemon.js --force-mode exp
```

## Run UHM

```txt
run /controllers/uhm.js --tails
```

## EXP Overdrive

```txt
run /controllers/uhm.js --tails --overdrive
```

## EXP Overdrive Aggressive

```txt
run /controllers/uhm.js --tails --overdrive --cycle-delay 100 --max-batches 750 --exp-ram 1
```

## Kill UHM / EXP workers

```txt
killall /controllers/uhm.js
killall /workers/exp-weaken.js
killall /workers/exp-grow.js
```

# CURRENT EXP ARCHITECTURE

```txt
persistent weaken/grow workers
NOT delayed HWGW explosions
```

Files:

```txt
/workers/exp-weaken.js
/workers/exp-grow.js
/lib/uhm/modes/exp-overdrive.js
/lib/uhm/modes/exp-targets.js
```

# CURRENT FORCED EXP MODE

```txt
forced-exp-until-3000
```

Rules:

```txt
100% RAM -> EXP
0% share
0% money
persistent EXP workers only
```

# CURRENT EXP TARGETS

```txt
joesguns
nectar-net
hong-fang-tea
harakiri-sushi
phantasy
silver-helix
omega-net
```

# CURRENT MAJOR ARCHITECTURE

```txt
daemon = orchestration
UHM = execution engine
workers = execution only
services = gated startup systems
```

# CURRENT BITNODE

```txt
BN4
```

Current focus:

```txt
Faction automation
Backdoor orchestration
Augmentation intelligence
Reset-prep architecture
```
