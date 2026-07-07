# BAML Pivot — Session Execution

## Current Session: Session 1 (BAML toolchain)

### Status
- BAML installed: `@boundaryml/baml ^0.223.0` added to root devDependencies
- BAML client generated to `packages/core/baml_client/baml_client/` (14 files, 1717 LOC total)
- BAML source files at `baml_src/` (assemble_game.baml, online_assembly.baml, clients.baml, generators.baml)
- Generated code uses `// @ts-nocheck` (BAML convention)

### What needs to happen next (Sessions 2-11)

Per `.sisyphus/plans/playcraft-baml-sessions.md`:
- Session 2: Contract purge (agent.ts, enrichment.ts, asset.ts, game-template.ts, game-bundle.ts, base.ts, builder.ts, manifest.ts, index.ts)
- Session 3: local-llm.ts rewrite (BAML bridge, delete Outlines/StubLocalInferenceEngine/MOONSHINE_STREAMING_CPU_ENGINE_ID)
- Session 4: agent-loop.ts (pure local, no enrichment rescue, delete enrichment.ts)
- Session 5: online-assembly.ts (paid engine)
- Session 6: builder/src/index.ts (4 new tools)
- Session 7: service (request-paid-online-assembly action)
- Session 8: studio-app.tsx (paid button)
- Session 9: test purge
- Session 10: doc rewrite
- Session 11: final verification + commit

### Guardrail script update needed
- `scripts/check-guardrails.mjs` must exclude `baml_client/` directory (generated code has `// @ts-nocheck` and `@deprecated` markers that would trigger false positives)

### Process
Delegate Sessions 2-11 as a single coordinated delegation to a deep agent with the full plan as context. The agent should:
1. Update guardrail script first (exclude baml_client)
2. Execute Sessions 2-11 in order with verification between each
3. Final atomic commit during Tue 0100-1100 UTC window

### Constraints
- NO `as any` / `@ts-ignore` / `@ts-expect-error`
- NO `legacy` / `deprecated` / `TODO` / `FIXME` / `HACK` in source (excluding baml_client/)
- NO `playcraft.v1.1` / `v2` strings
- NO file > 1000 LOC (excluding baml_client/, docs may exceed)
- NO backwards-compat shims
- NO migration code
- NO automatic enrichment rescue
- NO Outlines library usage
- Working tree greenfield at end: 813+ passing, 0 failing

### Current time
- Tue 04:30 UTC (within allowed commit window 0100-1100)