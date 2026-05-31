# bitburner-reference.md

# CORE COMMANDS

## Run daemon

```txt
run daemon.js
run daemon.js --force-mode exp
run daemon.js --force-mode faction
run daemon.js --force-mode reset-prep
Run UHM
run /controllers/uhm.js --tails
EXP Overdrive
run /controllers/uhm.js --tails --overdrive
EXP Overdrive Aggressive
run /controllers/uhm.js --tails --overdrive --cycle-delay 100 --max-batches 750 --exp-ram 1
Kill UHM / EXP workers
killall /controllers/uhm.js
killall /workers/exp-weaken.js
killall /workers/exp-grow.js
Rebuild augmentation cache
run /tools/augmentation-data-builder.js --force
Run augmentation planner only
run /tools/augmentation-buyer-service.js --force-buy false
Force augmentation buying (emergency/manual override only)
run /tools/augmentation-buyer-service.js --force-buy true
Show augmentation status
run /tools/augmentation-status.js
Show faction status
run /tools/faction-status.js
Generate next faction/backdoor path
run /tools/faction-next-path.js
CURRENT EXP ARCHITECTURE
persistent weaken/grow workers
NOT delayed HWGW explosions

Files:

/workers/exp-weaken.js
/workers/exp-grow.js

/lib/uhm/modes/exp-overdrive.js
/lib/uhm/modes/exp-targets.js
CURRENT FORCED EXP MODE
forced-exp-until-3000

Rules:

100% RAM -> EXP
0% share
0% money

persistent EXP workers only
process governor enabled
CURRENT EXP TARGETS
joesguns
nectar-net
hong-fang-tea
harakiri-sushi
phantasy
silver-helix
omega-net
CURRENT MAJOR ARCHITECTURE
daemon = orchestration
UHM = execution engine

workers = execution only

services = gated startup systems

persistent workers preferred over massive delayed HWGW explosions
CURRENT FACTION ARCHITECTURE
Faction progression spine implemented

Tracked factions:
- hacking factions
- city factions
- criminal factions
- megacorp factions
- endgame factions

Files:

/lib/daemon/factions.js
/lib/daemon/faction-profiles.js

/tools/faction-status.js
/tools/faction-next-path.js

Current faction systems:

joined faction tracking
next progression suggestion
backdoor-ready detection
future Singularity auto-backdoor architecture
toast + terminal notifications
CURRENT AUGMENTATION ARCHITECTURE

Files:

/lib/daemon/augmentations.js

/tools/augmentation-data-builder.js
/tools/augmentation-buyer-service.js
/tools/augmentation-status.js

Current augmentation systems:

augmentation cache generation
augmentation planning
weighted augmentation stat scoring
BitNode-specific purchase strategies
cheap-ready-first purchasing
daemon-controlled buy authority
future reset planning support
CURRENT BITNODE
BN4

Current BN4 focus:

hacking progression
faction automation
augmentation intelligence
Daedalus progression
future Red Pill orchestration
future reset-prep architecture
CURRENT SERVICE MODEL
daemon-owned orchestration

conditional services
one-shot services
service gating by:
- home RAM
- money
- Singularity access
- daemon policy
CURRENT POLICY RULES
daemon policy controls:
- server purchases
- home RAM upgrades
- darkweb purchases
- stock trading
- augmentation purchases

manual flags are emergency overrides only
IMPORTANT FILES
daemon.js

/controllers/uhm.js

/lib/daemon/*
/lib/uhm/*

/workers/*
/tools/*
DO NOT BREAK
do not reintroduce massive HWGW process explosions

do not merge daemon and UHM responsibilities

do not move share after money lanes

do not allow planner HUDs to become permanent forever-loop dashboards

do not spam Singularity APIs continuously

do not allow augmentation purchasing outside daemon policy

keep EXP mode persistent-worker based


