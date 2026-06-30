# BN3 Corporation Notes

## Migration Notes

Old scripts imported the corporation API with `eval("ns.corporation")`.
Bitburner 3.0 exposes it directly as `ns.corporation`.

Important 3.0 naming changes:

- Use `ns.corporation.setJobAssignment(...)`; old `setAutoJobAssignment(...)` was renamed.
- Use `ns.corporation.hireEmployee(division, city, job)` when assigning a new hire directly.
- Use `ns.corporation.upgradeWarehouse(division, city, amount)` for multi-level warehouse upgrades.
- Corporation APIs live under `ns.corporation`; Office/Warehouse are API groups, not separate namespaces.

## New Files

- `/lib/corp/config.js` - corp plan constants from the old Agriculture/Tobacco scripts.
- `/lib/corp/safe.js` - small 3.0-safe corporation helpers.
- `/lib/corp/actions.js` - restart-safe Agriculture -> investment -> Tobacco progression logic.
- `/tools/corp-manager-service.js` - service loop that writes `/data/corp-state.txt`.
- `/tools/corp-status.js` - readable terminal report for the state file.

## First Test

```txt
run /tools/corp-manager-service.js --once
cat /data/corp-state.txt
run /tools/corp-status.js
```

Once the one-cycle output looks sane:

```txt
run /tools/corp-manager-service.js
```

## Current Strategy

1. Create `Limitless` with the old BN3 seed-money path (`selfFund=false`).
2. Start Agriculture.
3. Expand Agriculture to all cities.
4. Unlock Smart Supply.
5. Sell `Food` and `Plants`.
6. Buy the old material booster waves.
7. Accept investment offers at the old thresholds.
8. Expand Tobacco.
9. Grow Tobacco products and support upgrades.

This is intentionally conservative and state-file driven so it can be inspected before being wired into daemon startup.
