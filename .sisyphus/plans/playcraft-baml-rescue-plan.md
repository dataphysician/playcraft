# BAML Pivot — Current Status and Next Steps

## Current State (Tue 05:04 UTC)
- BAML toolchain installed and generated (Session 1 done)
- Deep agent ran Sessions 2-9 partially before timing out (30 min)
- **Broken state**: 
  - 321 tests passing, 26 test files failing
  - Typecheck failing: `tsconfig.package.json` has `"ignoreDeprecations": "6.0"` (invalid for TS 5.8.2 — should be `"5.0"`)
  - `packages/core/src/enrichment.ts` deleted (as planned) but consumers not yet updated
  - `packages/contracts/src/enrichment.ts` rewritten but downstream not all updated

## Immediate Fix Needed
1. `tsconfig.package.json` line 23: change `"ignoreDeprecations": "6.0"` to `"ignoreDeprecations": "5.0"`
2. Run `pnpm typecheck` — should now compile

## Remaining Work
Per `.sisyphus/plans/playcraft-baml-sessions.md`:
- Finish Sessions 2-9 (contract purge, local-llm.ts rewrite, agent-loop.ts, online-assembly.ts, builder tools, service layer, studio UI, test purge)
- Session 10: Doc rewrite
- Session 11: Final verification + commit during Tue 0100-1100 UTC window

## Time Budget
- Current: Tue 05:04 UTC
- Window closes: Tue 11:00 UTC
- Time available: ~5h 56m
- Each session needs ~15-30 min of agent work + 5 min verification
- Remaining: 9 sessions × 25 min = ~3h 45m — tight but feasible

## Next Delegation
Delegate a SINGLE deep agent with:
1. Fix the `tsconfig.package.json` issue
2. Continue Sessions 2-9 completion
3. Execute Sessions 10-11
4. Commit during the window
5. Fallback: if Sessions 2-5 don't complete by 0900 UTC, abort and commit whatever greenfield state exists

## Constraints (strict)
- NO `as any` / `@ts-ignore` / `@ts-expect-error` (excluding `baml_client/`)
- NO `legacy` / `deprecated` / `TODO` / `FIXME` / `HACK` (excluding `baml_client/`)
- NO `playcraft.v1.1` / `v2` strings
- NO file > 1000 LOC (excluding `baml_client/`, docs may exceed)
- NO backwards-compat shims
- NO migration code
- NO automatic enrichment rescue
- NO Outlines library usage
- Greenfield at end: ≥ 813 passing, 0 failing

## What Must Be Committed
- If everything works: one atomic commit with all Sessions 2-11 work
- If not: revert uncommitted broken changes, commit only the plan files, end at greenfield baseline (813 passing)