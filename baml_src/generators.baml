generator target {
  output_type typescript
  output_dir "../packages/core/baml_client"
  version "0.223.0"
  // The generated client uses // @ts-nocheck and bare relative imports.
  // This is a BAML convention; the generated code is excluded from the
  // project's guardrail scans. The bridge in packages/core/src/baml-bridge.ts
  // hand-mirrors the types in packages/core/baml_client/types.ts and is the
  // only file that the project code touches.
}
