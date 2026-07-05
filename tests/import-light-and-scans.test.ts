import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as contracts from "@playcraft/contracts";
import * as core from "@playcraft/core";

const root = process.cwd();

function readSource(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function repoSourceFiles(directory = root): string[] {
  const ignoredDirectories = new Set([".git", ".omx", "dist", "node_modules", "web-dist"]);
  const sourceExtensions = new Set([".json", ".md", ".ts", ".tsx", ".yaml", ".yml"]);
  const output: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) {
      continue;
    }

    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...repoSourceFiles(absolutePath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const dotIndex = entry.name.lastIndexOf(".");
    const extension = dotIndex >= 0 ? entry.name.slice(dotIndex) : "";
    if (sourceExtensions.has(extension) && statSync(absolutePath).size < 1_000_000) {
      output.push(absolutePath.slice(root.length + 1));
    }
  }

  return output.sort();
}

describe("import-light boundaries and source scans", () => {
  it("imports contracts and core without app, third-party runtime, or native dependencies", () => {
    expect(contracts.PLAYCRAFT_SCHEMA_VERSION).toBe("playcraft.v1");
    expect(core.createEmptyRegistries().mechanics.all()).toEqual([]);
  });

  it("keeps contracts and core free of blocked imports, app-layer dependencies, and environment access", () => {
    const source = [
      readSource("packages/contracts/src/index.ts"),
      readSource("packages/core/src/index.ts")
    ].join("\n");

    expect(source).not.toMatch(/@playcraft\/builder|@playcraft\/studio|@ai-sdk|openai|next\/server|NextRequest|PrismaClient|NextAuth|Tauri|tauri|process\.env|OPENAI_API_KEY|TA[V]US|ta[v]us/u);
    expect(source).not.toMatch(/GameType|MEMORY_MATCH|PATTERN_MATCH|SORTING/u);
  });

  it("blocks source-name dispatch shortcuts and legacy game-type branching in core, assets, builder, and studio", () => {
    const source = [
      readSource("packages/core/src/index.ts"),
      readSource("packages/assets/src/index.ts"),
      readSource("packages/builder/src/index.ts"),
      readSource("packages/service/src/index.ts"),
      readSource("apps/studio/src/local-client.ts"),
      readSource("apps/studio/src/live-game.tsx"),
      readSource("apps/studio/src/studio-app.tsx"),
      readSource("apps/studio/src/trusted-preview.tsx"),
      readSource("apps/studio/src/App.tsx"),
      readSource("apps/studio/src/main.tsx")
    ].join("\n");

    const legacyDispatchPattern = new RegExp(
      [`provi${"derName"}`, `if\\s*\\(\\s*provi${"der"}`, `switch\\s*\\(\\s*provi${"der"}`].join("|"),
      "u"
    );

    expect(source).not.toMatch(legacyDispatchPattern);
    expect(source).not.toContain("as " + "BuilderTemplateId");
    expect(source).not.toMatch(/profile\.id\.includes/u);
    expect(source).not.toMatch(/\bGameType\b|\bMEMORY_MATCH\b|\bPATTERN_MATCH\b|\bSORTING\b/u);
    expect(source).not.toMatch(/Ta[v]us|ta[v]us|re[p]lica|C[V]I/u);
  });

  it("keeps repository source free of the removed hosted conversation stack", () => {
    const blockedTerms = ["Ta" + "vus", "ta" + "vus", "re" + "plica", "C" + "VI", "Geo" + "rgina"];
    const violations = repoSourceFiles().flatMap((path) => {
      const source = readSource(path);
      return blockedTerms.some((term) => source.includes(term)) ? [path] : [];
    });

    expect(violations).toEqual([]);
  });

  it("keeps AG-UI custom events run-owned without placeholder run ids", () => {
    const contractSource = readSource("packages/contracts/src/index.ts");
    const agUiSource = readSource("packages/ag-ui/src/index.ts");
    const agUiTestSource = readSource("packages/ag-ui/test/events.test.ts");

    expect(contractSource).toContain("runId: StableIdSchema");
    expect(agUiSource).toContain('return baseEvent("Custom", envelope.runId');
    expect(agUiTestSource).toContain("requires custom envelopes to declare run ids");
    expect(`${contractSource}\n${agUiSource}`).not.toContain("run.unspecified");
    expect(agUiSource).not.toContain('envelope.runId ??');
  });

  it("keeps public local asset source names free of stub terminology", () => {
    const blockedTerms = [
      "asset-source." + "stub-deterministic",
      "deterministic-" + "stub",
      "stub" + "://",
      "asset:" + "stub",
      "Deterministic " + "Stub",
      "stub " + "asset source",
      "stub " + "planner"
    ];
    const violations = repoSourceFiles().flatMap((path) => {
      const source = readSource(path);
      return blockedTerms.some((term) => source.includes(term)) ? [path] : [];
    });

    expect(violations).toEqual([]);
  });

  it("keeps public framework docs free of removed hosted-stack phrasing", () => {
    const blockedTerms = [
      "hosted " + "hosted",
      "SDK " + "SDK",
      "hosted-stack-" + "specific",
      "video-" + "avatar",
      "hosted " + "SDK",
      "Hosted " + "SDK",
      "hosted " + "provider",
      "hosted-" + "provider",
      "hosted " + "conversation",
      "hosted " + "audio",
      "vendor " + "conversation",
      "live " + "conversation",
      "conversation " + "runtime",
      "conversation " + "state",
      "conversation " + "stack",
      "avatar",
      "Open" + "AI",
      "Post" + "gres",
      "Prisma",
      "Next" + "Auth",
      "Next" + ".js",
      "Next" + "Request",
      "next" + "/server"
    ];
    const docs = repoSourceFiles()
      .filter((path) => path === "README.md" || path.startsWith("playcraft-agentic-framework/"));
    const violations = docs.flatMap((path) => {
      const source = readSource(path);
      return blockedTerms.some((term) => source.includes(term)) ? [path] : [];
    });

    expect(violations).toEqual([]);
  });

  it("keeps generic text resolution labels out of source and docs", () => {
    const blockedLabel = "text-" + "match";
    const checkedFiles = repoSourceFiles().filter((path) =>
      path === "MILESTONES.md" ||
      path === "README.md" ||
      path.startsWith("apps/") ||
      path.startsWith("packages/") ||
      path.startsWith("playcraft-agentic-framework/") ||
      path.startsWith("tests/")
    );
    const violations = checkedFiles.flatMap((path) => {
      const source = readSource(path);
      return source.includes(blockedLabel) ? [path] : [];
    });

    expect(violations).toEqual([]);
  });

  it("keeps registry compatibility selection contract-kind explicit", () => {
    const coreSource = readSource("packages/core/src/index.ts");
    const registryTestSource = readSource("packages/core/test/registries.test.ts");

    expect(coreSource).not.toContain("function " + "compatibilityStringArray");
    expect(coreSource).not.toContain("contractCompatibilityForEntry(entry,");
    expect(coreSource).toContain("function contractCompatibilityForEntry(entry: RegistryEntry): ContractCompatibilityFields | undefined");
    expect(coreSource).toContain("contractCompatibilityForEntry(entry)?.domainProfileIds");
    expect(coreSource).toContain("contractCompatibilityForEntry(entry)?.safetyPolicyIds");
    expect(coreSource).toContain("contractCompatibilityForEntry(entry)?.ageBands");
    expect(coreSource).toContain("contractCompatibilityForEntry(entry)?.modalities");
    expect(coreSource).toContain('entry.kind !== "mechanic" && entry.kind !== "rule-module"');
    expect(coreSource).toContain("function registrySelectionWarnings");
    expect(coreSource).toContain("function singleValue");
    expect(coreSource).toContain("return singleValue(matches);");
    expect(coreSource).toContain("matches.length === 1 ? matches[0] : null");
    expect(coreSource).toContain("has multiple versions for ${id}; pass version");
    expect(coreSource).not.toContain("Reflect.get");
    expect(registryTestSource).not.toContain("Reflect.get");
    expect(coreSource).not.toContain("selected: matches[0] ?? null");
    expect(coreSource).not.toContain("return this.all().find((entry) => entry.id === id)");
    expect(coreSource).not.toContain("return matches[0]");
    expect(registryTestSource).toContain("does not select the first matching registry candidate when matches are ambiguous");
    expect(registryTestSource).toContain("requires a version for unversioned registry gets with multiple versions");
    expect(registryTestSource).toContain("does not use partial compatibility objects from loose mechanic-shaped entries");
    expect(registryTestSource).not.toContain('supportedDomains: ["domain.alias"]');
    expect(registryTestSource).not.toContain('supportedAgeBands: ["adult"]');
    expect(registryTestSource).not.toContain('supportedModalities: ["audio"]');
  });

  it("keeps deterministic planner recipe selection fail-closed on equal scores", () => {
    const coreSource = readSource("packages/core/src/index.ts");
    const plannerTestSource = readSource("packages/core/test/planner.test.ts");

    expect(coreSource).toContain("const bestScore = Math.max(...candidates.map((candidate) => candidate.score));");
    expect(coreSource).toContain("const bestCandidates = candidates.filter((candidate) => candidate.score === bestScore);");
    expect(coreSource).toContain("ambiguous deterministic recipes matched requested capabilities");
    expect(coreSource).toContain("function requireSingleValue");
    expect(coreSource).toContain('return requireSingleValue(bestCandidates, "deterministic planner best candidate").recipe;');
    expect(coreSource).not.toContain(".sort((left, right) => right.score - left.score || left.index - right.index)[0]?.recipe");
    expect(coreSource).not.toContain("bestCandidates[0]");
    expect(plannerTestSource).toContain("rejects equal-score recipe matches instead of using recipe order");
  });

  it("keeps pack mechanic event bindings template-authored instead of emitted-event-order inferred", () => {
    const packSource = readSource("packages/packs/src/index.ts");
    const packTestSource = readSource("packages/packs/test/mvp-profiles.test.ts");

    expect(packSource).toContain("mechanicEventBindings: memoryMechanicEventBindings");
    expect(packSource).toContain("mechanicEventBindings: sortingMechanicEventBindings");
    expect(packSource).toContain("mechanicEventBindings: sequenceMechanicEventBindings");
    expect(packSource).toContain("requiredMechanicEventBindings(template, capability, selected.emitsEvents)");
    expect(packSource).not.toContain("selected.emitsEvents[0]");
    expect(packTestSource).toContain('primary: "rule:sequence-progressed"');
  });

  it("keeps memory template pair counts authored instead of truncating pair items", () => {
    const packSource = readSource("packages/packs/src/index.ts");
    const packTestSource = readSource("packages/packs/test/mvp-profiles.test.ts");

    expect(packSource).toContain("const cards = items.flatMap");
    expect(packSource).toContain('"number-3"');
    expect(packTestSource).toContain("keeps memory template card counts authored by pair items instead of truncating to two pairs");
    expect(packSource).not.toContain("items.slice(0, 2).flatMap");
  });

  it("keeps pack manifest capabilities complete instead of capped", () => {
    const packSource = readSource("packages/packs/src/index.ts");
    const packTestSource = readSource("packages/packs/test/mvp-profiles.test.ts");

    expect(packSource).toContain("function uniqueCapabilityTags");
    expect(packSource).toContain("providedCapabilities: uniqueCapabilityTags(providedCapabilities)");
    expect(packSource).not.toContain("providedCapabilities: [...new Set(providedCapabilities)].slice(0, 12)");
    expect(packSource).not.toContain(".slice(0, 12)");
    expect(packTestSource).toContain("keeps pack manifest capabilities complete instead of truncating advertised tags");
    expect(packTestSource).toContain("expectedMechanicCapabilities.length).toBeGreaterThan(12)");
  });

  it("keeps template requirement lookup exact instead of first pack match", () => {
    const coreSource = readSource("packages/core/src/index.ts");
    const packSource = readSource("packages/packs/src/index.ts");
    const packTestSource = readSource("packages/packs/test/mvp-profiles.test.ts");

    expect(coreSource).toContain("duplicate_rule_binding_id");
    expect(coreSource).toContain("const duplicateRuleBindingIds = duplicateStrings(profile.rules.map((rule) => rule.bindingId));");
    expect(readSource("packages/core/test/replay.test.ts")).toContain("fails closed when saved profile rules contain duplicate binding ids");
    expect(packSource).toContain("duplicate mechanic capability ${capability}");
    expect(packSource).toContain("duplicate rule category ${category}");
    expect(packSource).toContain("duplicate component capability ${capability}");
    expect(packSource).not.toContain("mechanicDefinitions.find((entry) => entry.capabilityTags.includes(capability))");
    expect(packSource).not.toContain("ruleModuleDefinitions.find((entry) => entry.category === category)");
    expect(packSource).not.toContain("componentManifests.find((entry) => entry.renderCapability === capability)");
    expect(packTestSource).toContain("resolves template requirements through exactly one authored pack entry");
  });

  it("keeps trusted component tool emission single-tool explicit", () => {
    const packSource = readSource("packages/packs/src/index.ts");
    const packTestSource = readSource("packages/packs/test/mvp-profiles.test.ts");

    expect(packSource).toContain("function emitSingleTrustedTool");
    expect(packSource).toContain("must declare exactly one emitted tool");
    expect(packSource).not.toContain("function emitFirstTool");
    expect(packSource).not.toContain("manifest.emittedTools[0]");
    expect(packTestSource).toContain("keeps trusted component interaction tools single-emitter");
  });

  it("keeps generated profile assets bound by request id instead of generation order", () => {
    const packSource = readSource("packages/packs/src/index.ts");
    const packTestSource = readSource("packages/packs/test/mvp-profiles.test.ts");

    expect(packSource).toContain("const illustrationRequestId");
    expect(packSource).toContain("requiredGeneratedAssetForRequestId");
    expect(packSource).toContain("received multiple generated assets for request");
    expect(packSource).not.toContain("const asset = assets.find((candidate) => candidate.requestId === requestId)");
    expect(packSource).not.toContain("const illustration = assets[0].assetId");
    expect(packTestSource).toContain("rejects duplicate generated assets for a request instead of binding asset order");
    expect(packTestSource).toContain("asset-request.profile.memory-match.mvp");
  });

  it("keeps component render mechanic bindings explicit instead of list-order inferred", () => {
    const contractSource = readSource("packages/contracts/src/index.ts");
    const coreSource = readSource("packages/core/src/index.ts");
    const packSource = readSource("packages/packs/src/index.ts");
    const packTestSource = readSource("packages/packs/test/mvp-profiles.test.ts");

    expect(contractSource).toContain("renderMechanicBindingId: StableIdSchema");
    expect(coreSource).toContain("mechanicBindingId: component.renderMechanicBindingId");
    expect(coreSource).not.toContain("mechanicBindingId: component.mechanicBindingIds[0]");
    expect(coreSource).toContain("render mechanic binding");
    expect(coreSource).toContain("duplicate_mechanic_binding_id");
    expect(coreSource).toContain("const duplicateMechanicBindingIds = duplicateStrings(profile.mechanics.map((mechanic) => mechanic.bindingId));");
    expect(packSource).toContain("componentMechanicCapabilities");
    expect(packSource).toContain("componentRenderMechanicCapabilities");
    expect(packSource).toContain("requiredComponentMechanicBindingIds");
    expect(packSource).toContain("requiredComponentRenderMechanicBindingId");
    expect(packSource).toContain("missing authored component mechanic capabilities");
    expect(packSource).not.toContain(".filter((binding) => selected.supportedMechanicIds.includes(binding.mechanicId))");
    expect(packSource).not.toContain(".slice(0, 2);");
    expect(packTestSource).toContain("renderMechanicBindingId");
    expect(packTestSource).toContain("mechanicBindingIds");
    expect(readSource("packages/core/test/replay.test.ts")).toContain("fails closed when saved profile mechanics contain duplicate binding ids");
  });

  it("keeps play input modalities separate from audio asset content", () => {
    const contractSource = readSource("packages/contracts/src/index.ts");
    const packSource = readSource("packages/packs/src/index.ts");
    const packTestSource = readSource("packages/packs/test/mvp-profiles.test.ts");

    expect(contractSource).toContain('InputModalitySchema = z.enum(["touch", "pointer", "keyboard"])');
    expect(contractSource).toContain('AssetContentTypeSchema = z.enum(["image", "audio", "animation", "text"])');
    expect(contractSource).not.toContain('InputModalitySchema = z.enum(["touch", "pointer", "keyboard", "audio"])');
    expect(packSource).not.toContain("mechanic.sound-matching");
    expect(packSource).not.toContain('supportedModalities: Array<"touch" | "pointer" | "keyboard" | "audio">');
    expect(packSource).not.toContain('["touch", "pointer", "audio"]');
    expect(packSource).not.toContain('["audio", "touch"]');
    expect(packSource).not.toContain("audio:prompted");
    expect(packSource).toContain("primaryInputModality: \"touch\"");
    expect(packSource).toContain("function requiredTemplateTargetModality");
    expect(packSource).toContain("requires target modality ${template.primaryInputModality}");
    expect(packSource).not.toContain("context.request.targetModalities[0]");
    expect(packTestSource).toContain("uses template-authored primary modality instead of target modality order");
  });

  it("keeps transcript input sources Moonshine-explicit", () => {
    const blockedTerms = [
      "speech" + "-transcript",
      "speech" + "Transcript",
      "Speech" + "TranscriptionConfig"
    ];
    const checkedFiles = [
      "packages/contracts/src/index.ts",
      "packages/builder/src/index.ts",
      "packages/service/src/index.ts",
      "packages/service/src/cli.ts",
      "apps/studio/src/local-client.ts",
      "apps/studio/src/studio-app.tsx",
      "apps/studio/src/types.ts",
      "README.md",
      "playcraft-agentic-framework/README.md",
      "playcraft-agentic-framework/PRD.md",
      "playcraft-agentic-framework/ARCHITECTURE.md",
      "playcraft-agentic-framework/DEV_GUIDE.md",
      "tests/studio-ui.test.ts",
      "tests/mobile-shell.test.tsx"
    ];
    const violations = checkedFiles.flatMap((path) => {
      const source = readSource(path);
      return blockedTerms.some((term) => source.includes(term)) ? [path] : [];
    });

    expect(readSource("packages/contracts/src/index.ts")).toContain('BuilderInputSourceSchema = z.enum(["text", "moonshine-transcript"])');
    expect(readSource("packages/contracts/src/index.ts")).toContain("MoonshineStreamingCpuConfigSchema");
    expect(readSource("packages/contracts/src/index.ts")).toContain("moonshineConfig: MoonshineStreamingCpuConfigSchema.optional()");
    expect(readSource("packages/contracts/src/index.ts")).not.toContain("MoonshineTranscriptionConfigSchema");
    expect(readSource("packages/contracts/src/index.ts")).not.toContain("transcription: MoonshineTranscriptionConfigSchema.optional()");
    expect(readSource("packages/contracts/src/index.ts")).toContain("moonshineTranscript: MoonshineTranscriptRecordSchema.optional()");
    expect(readSource("packages/contracts/src/index.ts")).toContain("defaultSource: BuilderInputSourceSchema");
    expect(readSource("packages/service/src/index.ts")).toContain("LOCAL_SERVICE_INPUT_POLICY");
    expect(readSource("packages/service/src/index.ts")).toContain("function sourceForServiceRequest");
    expect(readSource("packages/service/src/index.ts")).toContain("return request.source ?? inputPolicy.defaultSource;");
    expect(readSource("packages/service/src/index.ts")).not.toContain('input.source ?? "text"');
    expect(readSource("packages/service/src/index.ts")).not.toContain('request.source ?? "text"');
    expect(readSource("packages/service/src/cli.ts")).not.toContain('args.source ?? "text"');
    expect(readSource("packages/service/src/cli.ts")).not.toContain("const text = transcriptText || args.text?.trim()");
    expect(readSource("packages/service/src/cli.ts")).not.toContain("request.text = text || undefined");
    expect(readSource("apps/studio/src/local-client.ts")).not.toContain('input.source ?? "text"');
    expect(readSource("apps/studio/src/local-client.ts")).not.toContain('moonshineTranscript ? "moonshine-transcript"');
    expect(readSource("apps/studio/src/local-client.ts")).toContain('source: "moonshine-transcript"');
    expect(readSource("apps/studio/src/local-client.ts")).toContain("function serviceInputPayloadForClientInput");
    expect(readSource("apps/studio/src/local-client.ts")).toContain('input.source && input.source !== "moonshine-transcript"');
    expect(readSource("apps/studio/src/local-client.ts")).toContain("Moonshine transcript records require moonshine-transcript source");
    expect(readSource("apps/studio/src/local-client.ts")).not.toContain("text: moonshineTranscript?.text ?? input.idea");
    expect(readSource("apps/studio/src/local-client.ts")).not.toContain("text: moonshineTranscript?.text ?? input.changeRequest");
    expect(readSource("tests/studio-ui.test.ts")).toContain("rejects contradictory text source and Moonshine transcript records before transport");
    expect(readSource("packages/contracts/src/index.ts")).toContain("Moonshine transcript records require moonshine-transcript source");
    expect(readSource("packages/service/src/index.ts")).toContain("moonshineConfig: input.source === \"moonshine-transcript\"");
    expect(readSource("packages/service/src/index.ts")).toContain("MOONSHINE_STREAMING_CPU_CONFIG");
    expect(readSource("packages/service/src/index.ts")).not.toContain("MOONSHINE_STREAMING_CPU_TRANSCRIPTION");
    expect(readSource("packages/service/src/index.ts")).not.toContain("transcription: input.source === \"moonshine-transcript\"");
    expect(violations).toEqual([]);
  });

  it("keeps Studio input source controls catalog-owned", () => {
    const contractSource = readSource("packages/contracts/src/index.ts");
    const serviceSource = readSource("packages/service/src/index.ts");
    const studioSource = readSource("apps/studio/src/studio-app.tsx");

    expect(contractSource).toContain("BuilderInputSourceOptionSchema");
    expect(contractSource).toContain("noInputLabel: z.string()");
    expect(contractSource).toContain("sourceOptions: z.array(BuilderInputSourceOptionSchema)");
    expect(contractSource).toContain("inputSourceSummary: z.string()");
    expect(contractSource).toContain("argumentSummary: z.string()");
    expect(contractSource).not.toContain("BuilderToolPresentationSchema");
    expect(contractSource).not.toContain("toolPresentation");
    expect(serviceSource).toContain("sourceOptions");
    expect(serviceSource).toContain('noInputLabel: "none"');
    expect(serviceSource).toContain('displayLabel: "Text"');
    expect(serviceSource).toContain('displayLabel: "Transcript"');
    expect(serviceSource).not.toContain("LOCAL_SERVICE_TOOL_PRESENTATION_POLICY");
    expect(serviceSource).not.toContain("toolPresentation");
    expect(serviceSource).not.toContain("argumentsPrefix");
    expect(serviceSource).not.toContain("noArgumentsLabel");
    expect(studioSource).toContain("catalog?.input.sourceOptions");
    expect(studioSource).toContain("tool.inputSourceSummary");
    expect(studioSource).toContain("tool.argumentSummary");
    expect(studioSource).toContain("option.displayLabel");
    expect(studioSource).toContain("function inputSourceOptionsForCatalog");
    expect(studioSource).toContain("Studio catalog has duplicate input source options");
    expect(studioSource).toContain("selectedInputOption?.generatePlaceholder");
    expect(studioSource).toContain("selectedInputOption?.updatePlaceholder");
    expect(studioSource).not.toContain("const selectedInputOption = inputOptions.find((option) => option.source === inputSource);");
    expect(readSource("tests/studio-ui.test.ts")).toContain("rejects duplicate catalog input source options instead of using option order");
    expect(studioSource).not.toContain("requiredInputSourceOption");
    expect(studioSource).not.toContain("toolInputSourceSummary");
    expect(studioSource).not.toContain("toolArgumentsSummary");
    expect(studioSource).not.toContain("catalog.toolPresentation");
    expect(studioSource).not.toContain("presentation.noArgumentsLabel");
    expect(studioSource).not.toContain('sources.join(", ")');
    expect(studioSource).not.toContain('"input: none"');
    expect(studioSource).not.toContain('"no arguments"');
    expect(studioSource).not.toContain('onInputSourceChange("text")');
    expect(studioSource).not.toContain('onInputSourceChange("moonshine-transcript")');
    expect(studioSource).not.toContain("Moonshine transcript: memory game with dinosaurs");
    expect(studioSource).not.toContain("Change the game or replace assets...");
  });

  it("keeps local service CLI catalog summaries catalog-owned", () => {
    const cliSource = readSource("packages/service/src/cli.ts");

    expect(cliSource).toContain("template.displayLabel");
    expect(cliSource).toContain("template.exampleRequest");
    expect(cliSource).toContain("template.requestAliasSummary");
    expect(cliSource).toContain("tool.displayName");
    expect(cliSource).toContain("tool.inputSourceSummary");
    expect(cliSource).toContain("tool.argumentSummary");
    expect(cliSource).toContain("tool.requiredContracts.join");
    expect(cliSource).toContain("contracts:");
    expect(cliSource).toContain("catalog.assetEdit.availableThemes.map((entry) => `${entry.displayLabel} [folder: ${entry.localReplacementFolder}]`)");
    expect(cliSource).not.toContain("catalog.templates.map((template) => template.id)");
    expect(cliSource).not.toContain("catalog.tools.map((tool) => tool.toolName)");
    expect(cliSource).not.toContain("requestAliases.slice(0, 3)");
    expect(cliSource).not.toContain("requiredInputSourceOption");
    expect(cliSource).not.toContain("toolInputSourceSummary");
    expect(cliSource).not.toContain("toolArgumentsSummary");
    expect(cliSource).not.toContain("catalog.toolPresentation.argumentsPrefix");
    expect(cliSource).not.toContain("catalog.toolPresentation.noArgumentsLabel");
    expect(cliSource).not.toContain('sources.join(", ")');
  });

  it("keeps builder CLI catalog summaries contract-shaped", () => {
    const builderCliSource = readSource("packages/builder/src/cli.ts");
    const builderSource = readSource("packages/builder/src/index.ts");
    const builderTestSource = readSource("packages/builder/test/session-service.test.ts");
    const contractSource = readSource("packages/contracts/src/index.ts");
    const rootReadme = readSource("README.md");
    const architecture = readSource("playcraft-agentic-framework/ARCHITECTURE.md");
    const frameworkReadme = readSource("playcraft-agentic-framework/README.md");

    expect(contractSource).toContain("PublicContractNameSchema");
    expect(contractSource).toContain("requiredContracts: z.array(PublicContractNameSchema).min(1)");
    expect(contractSource).toContain("PublicContractSchemas: Record<PublicContractName, z.ZodTypeAny>");
    expect(contractSource).not.toContain("requiredContracts: z.array(z.string().min(1)).min(1)");
    expect(contractSource).toContain("argumentSummary: z.string()");
    expect(rootReadme).toContain("surfaced per-action required contracts");
    expect(architecture).toContain("surfaced per-action required contracts");
    expect(frameworkReadme).toContain("surfaced per-action required contracts");
    expect(builderSource).toContain("builderToolRequiredContracts");
    expect(builderSource).toContain('"export-profile": ["BuilderCommandSchema", "BuilderProfileExportSchema"]');
    expect(builderSource).toContain('"import-profile": ["BuilderCommandSchema", "GameAssemblyProfileSchema"]');
    expect(builderSource).toContain("builderToolArgumentSummary");
    expect(builderSource).toContain("BUILDER_ARGUMENT_SUMMARY_LABELS");
    expect(builderSource).not.toContain("BUILDER_TOOL_PRESENTATION_POLICY");
    expect(builderSource).not.toContain("BuilderToolPresentationSchema");
    expect(builderSource).not.toContain("BuilderToolPresentation");
    expect(builderSource).not.toContain("argumentsPrefix");
    expect(builderSource).not.toContain("noArgumentsLabel");
    expect(builderTestSource).toContain("keeps builder tool argument schemas aligned with the command schema");
    expect(builderTestSource).toContain('"get-session": ["BuilderCommandSchema", "BuilderSessionSnapshotSchema"]');
    expect(builderTestSource).toContain('"import-profile": ["BuilderCommandSchema", "GameAssemblyProfileSchema"]');
    expect(builderTestSource).toContain("ALL_BUILDER_COMMAND_PAYLOAD_FIELDS");
    expect(builderTestSource).toContain("BuilderCommandSchema.safeParse");
    expect(builderCliSource).toContain("tool.requiredContracts.join");
    expect(builderCliSource).toContain("writeCatalogSummary(handler.listTools(), handler.listTemplates(), io)");
    expect(builderCliSource).toContain("get-session|export-profile|import-profile");
    expect(builderCliSource).toContain('case "import-profile"');
    expect(builderCliSource).toContain("GameAssemblyProfileSchema.parse(JSON.parse(value))");
    expect(builderCliSource).toContain("import-profile requires --profile-json");
    expect(builderCliSource).toContain("tool.displayName");
    expect(builderCliSource).toContain("tool.argumentSummary");
    expect(builderCliSource).toContain("contracts:");
    expect(builderCliSource).toContain("template.displayLabel");
    expect(builderCliSource).toContain("template.exampleRequest");
    expect(builderCliSource).toContain("template.requestAliasSummary");
    expect(builderCliSource).toContain("if (!args.json)");
    expect(builderCliSource).not.toContain("toolArgumentsSummary");
    expect(builderCliSource).not.toContain("tool.argumentsSchema");
    expect(builderCliSource).not.toContain("presentation.argumentsPrefix");
    expect(builderCliSource).not.toContain("presentation.noArgumentsLabel");
    expect(builderCliSource).not.toContain('"args: none"');
    expect(builderCliSource).not.toContain("requestAliases.slice(0, 3)");
  });

  it("keeps Studio service event ingestion schema-backed", () => {
    const source = readSource("apps/studio/src/local-client.ts");

    expect(source).toContain("parseAgUiEvent");
    expect(source).not.toContain("Reflect.get");
    expect(source).not.toContain("agUiEventTypeFromString");
  });

  it("keeps Studio service execution responses session-owned", () => {
    const source = readSource("apps/studio/src/local-client.ts");
    const contractSource = readSource("packages/contracts/src/index.ts");
    const appSource = readSource("apps/studio/src/studio-app.tsx");
    const typesSource = readSource("apps/studio/src/types.ts");

    expect(contractSource).toContain("session snapshots with activeProfileId require an active profile payload");
    expect(contractSource).toContain("session snapshots with profile payloads require activeProfileId");
    expect(contractSource).toContain("session snapshots with profile payloads require activeTemplateId");
    expect(contractSource).toContain("session snapshot profile id must match activeProfileId");
    expect(contractSource).toContain("session snapshot template id must match profile template");
    expect(contractSource).toContain("session snapshot activeTemplateId must match preview activeTemplateId");
    expect(contractSource).toContain("command results with profile payloads require preview activeProfileId");
    expect(contractSource).toContain("command result profile id must match preview activeProfileId");
    expect(contractSource).toContain("profile exports require preview activeProfileId");
    expect(contractSource).toContain("profile export profile id must match preview activeProfileId");
    expect(contractSource).toContain("profile exports require profile template snapshot");
    expect(contractSource).toContain("profile export templateId must match profile template id");
    expect(contractSource).toContain("profile exports require preview activeTemplateId");
    expect(contractSource).toContain("profile export templateId must match preview activeTemplateId");
    expect(source).toContain("response did not include session snapshot");
    expect(source).toContain("response.session.activeProfileId");
    expect(source).toContain("function activeProfileFromResponse(response: BuilderServiceResponse): GameAssemblyProfile");
    expect(source).toContain("response session did not include activeProfileId");
    expect(source).toContain("response session did not include active profile");
    expect(source).toContain("did not match activeProfileId");
    expect(source).toContain("const activeProfile = activeProfileFromResponse(response)");
    expect(source).toContain("activeProfile,");
    expect(typesSource).toContain("activeProfile?: GameAssemblyProfile");
    expect(appSource).toContain("const activeProfile = session?.activeProfile");
    expect(appSource).toContain("function requireSessionActiveProfile");
    expect(appSource).toContain("response did not include active profile");
    expect(source).not.toContain("response.session?.activeProfileId");
    expect(source).not.toContain("response.execution.result.profile?.id");
    expect(source).not.toContain("const profiles");
    expect(source).not.toContain("profiles: Array.from");
    expect(source).not.toContain("profiles.clear()");
    expect(typesSource).not.toContain("profiles: GameAssemblyProfile[]");
    expect(appSource).not.toContain('profileName ?? "game"');
    expect(appSource).not.toContain('activeProfile?.profileName ?? "profile"');
    expect(appSource).not.toContain("function findActiveProfile");
    expect(appSource).not.toContain("session.profiles.find((profile) => profile.id === session.activeProfileId)");
    expect(appSource).not.toContain("session.profiles.at(-1)");
  });

  it("keeps Studio profile imports targeted to explicit active sessions", () => {
    const clientSource = readSource("apps/studio/src/local-client.ts");
    const appSource = readSource("apps/studio/src/studio-app.tsx");
    const typeSource = readSource("apps/studio/src/types.ts");

    expect(typeSource).toContain("profileExport: BuilderProfileExport; sessionId: string");
    expect(appSource).toContain("Import requires an active target session.");
    expect(clientSource).not.toContain("input.profileExport.sessionId");
    expect(clientSource).not.toContain("input.sessionId ?? input.profileExport");
    expect(appSource).not.toContain("sessionId: session?.sessionId");
  });

  it("keeps local asset edit theme metadata shared through the assets package", () => {
    const builderSource = readSource("packages/builder/src/index.ts");
    const contractSource = readSource("packages/contracts/src/index.ts");
    const assetSource = readSource("packages/assets/src/index.ts");
    const rootReadme = readSource("README.md");
    const devGuide = readSource("playcraft-agentic-framework/DEV_GUIDE.md");
    const serviceCliSource = readSource("packages/service/src/cli.ts");
    const serviceSource = readSource("packages/service/src/index.ts");
    const studioSource = readSource("apps/studio/src/studio-app.tsx");
    const studioAssetLibrarySource = readSource("apps/studio/src/asset-library.ts");

    expect(contractSource).toContain("localReplacementFolder: z.string().min");
    expect(assetSource).toContain("localReplacementFolder: input.localReplacementFolder ?? input.theme");
    expect(rootReadme).toContain("local replacement themes and folders");
    expect(devGuide).toContain("bundled local replacement themes/items/folders");
    expect(builderSource).toContain("localAssetEditCatalog");
    expect(builderSource).toContain("BuilderAssetEditSchema.parse(assetEdit)");
    expect(builderSource).toContain("assetEditCatalogEntryFor");
    expect(builderSource).toContain("maps to multiple builder asset edit catalog entries");
    expect(builderSource).toContain("catalogEntry?.suggestedItems");
    expect(readSource("packages/builder/test/session-service.test.ts")).toContain("rejects duplicate builder asset catalog aliases instead of using catalog order");
    expect(builderSource).not.toContain('"custom assets"');
    expect(builderSource).not.toContain("defaultItemsForTheme");
    expect(builderSource).not.toContain("return localAssetEditCatalog.find((entry)");
    expect(serviceSource).toContain('from "@playcraft/assets"');
    expect(serviceCliSource).toContain("entry.localReplacementFolder");
    expect(studioSource).toContain("entry.localReplacementFolder");
    expect(studioAssetLibrarySource).toContain('from "@playcraft/assets"');
    expect(studioAssetLibrarySource).toContain("entry.localReplacementFolder === theme");
    expect(studioAssetLibrarySource).toContain("function catalogEntryForReplacementTheme");
    expect(studioAssetLibrarySource).toContain("maps to multiple catalog entries");
    expect(readSource("tests/studio-asset-library.test.tsx")).toContain("rejects duplicate local replacement catalog themes instead of using catalog order");
    expect(studioAssetLibrarySource).toContain("request.metadata.assetEditTheme");
    expect(studioAssetLibrarySource).not.toContain("addMetadataValue(values, request.metadata.assetEditItems)");
    expect(studioAssetLibrarySource).not.toContain("values.add(request.prompt)");
    expect(studioAssetLibrarySource).not.toContain("Object.values(component.props)");
    expect(studioAssetLibrarySource).not.toContain("const aliases: Record");
    expect(studioAssetLibrarySource).not.toContain('dolphins: ["dolphin"');
  });

  it("keeps edit-aware card sprite matching explicit for paired-card IDs", () => {
    const assetLibrarySource = readSource("apps/studio/src/asset-library.ts");

    expect(assetLibrarySource).toContain("function singlePairedCardSpriteForPair");
    expect(assetLibrarySource).toContain("asset replacement pair ${pairKey} maps to multiple local sprites");
    expect(assetLibrarySource).toContain("asset replacement pair ${pairKey} is missing local sprites");
    expect(assetLibrarySource).toContain("function spriteForPairedCardIdentifier");
    expect(assetLibrarySource).toContain("maps to multiple paired local sprites");
    expect(assetLibrarySource).toContain("function pairedCardSpriteIdentifier");
    expect(assetLibrarySource).not.toContain("normalized.endsWith");
    expect(assetLibrarySource).not.toContain("return replacementSprites.find((sprite) => themeFolders.includes(sprite.theme) && sprite.id === pairedCardSpriteId)");
    expect(assetLibrarySource).not.toContain(".find((entry): entry is ReplacementSprite => Boolean(entry))");
    expect(assetLibrarySource).not.toContain("candidates[index % candidates.length]");
  });

  it("keeps imported profile template selection tied to assembly request contracts", () => {
    const builderSource = readSource("packages/builder/src/index.ts");
    const contractSource = readSource("packages/contracts/src/index.ts");
    const packSource = readSource("packages/packs/src/index.ts");
    const liveGameSource = readSource("apps/studio/src/live-game.tsx");
    const assetLibrarySource = readSource("apps/studio/src/asset-library.ts");

    expect(contractSource).toContain("template: GameProfileTemplateSnapshotSchema,");
    expect(contractSource).toContain("profile template snapshot must match assemblyRequestId");
    expect(contractSource).toContain("profile validation snapshot must match profile id");
    expect(readSource("packages/contracts/test/schemas.test.ts")).toContain("requires profiles to carry matching validation snapshots");
    expect(readSource("packages/builder/test/session-service.test.ts")).toContain('profileId: "profile.custom-memory"');
    expect(readSource("packages/service/test/local-service.test.ts")).toContain('profileId: "profile.service-custom-memory"');
    expect(builderSource).toContain("return profile.template");
    expect(builderSource).not.toContain("if (profile.template)");
    expect(builderSource).not.toContain("must carry a template snapshot");
    expect(builderSource).not.toContain("entry.assemblyRequestId === profile.assemblyRequestId");
    expect(liveGameSource).not.toContain("must carry a template snapshot");
    expect(assetLibrarySource).not.toContain("must carry a template snapshot");
    expect(liveGameSource).not.toContain("const liveSurface = template?.liveSurface");
    expect(assetLibrarySource).not.toContain("if (!template)");
    expect(packSource).toContain("template: templateSnapshotForProfileTemplate(template, context.request.id)");
    expect(packSource).toContain("function templateSnapshotForProfileTemplate");
    expect(packSource).toContain("GameProfileTemplateSnapshotSchema.parse");
    expect(builderSource).not.toContain("profileComponentIds");
    expect(builderSource).not.toContain("requiredComponentIds.every");
  });

  it("keeps retired sample memory-card IDs out of source and fixtures", () => {
    const blockedTerms = ["cat", "sun"].flatMap((item) => [`${item}-a`, `${item}-b`]);
    const checkedFiles = repoSourceFiles().filter((path) =>
      path === "MILESTONES.md" ||
      path.startsWith("apps/") ||
      path.startsWith("examples/") ||
      path.startsWith("packages/") ||
      path.startsWith("tests/")
    );
    const violations = checkedFiles.flatMap((path) => {
      const source = readSource(path);
      return blockedTerms.some((term) => source.includes(term)) ? [path] : [];
    });

    expect(violations).toEqual([]);
  });

  it("keeps preview surfaces free of placeholder component IDs", () => {
    const blockedTerms = [
      ["unknown", "component"].join("."),
      ["component", "unknown"].join("."),
      ["component", "unresolved"].join("."),
      ["component", "unresolved"].join(":"),
      `"${"unknown"}"`
    ];
    const checkedFiles = [
      "packages/builder/src/index.ts",
      "packages/service/src/index.ts",
      "apps/studio/src/trusted-preview.tsx"
    ];
    const violations = checkedFiles.flatMap((path) => {
      const source = readSource(path);
      return blockedTerms.some((term) => source.includes(term)) ? [path] : [];
    });

    expect(violations).toEqual([]);
  });

  it("keeps trusted preview selected component misses fail-closed", () => {
    const coreSource = readSource("packages/core/src/index.ts");
    const source = readSource("apps/studio/src/trusted-preview.tsx");
    const studioSource = readSource("apps/studio/src/studio-app.tsx");

    expect(coreSource).toContain("duplicate_component_binding_id");
    expect(coreSource).toContain("const duplicateComponentBindingIds = duplicateStrings(profile.components.map((component) => component.bindingId));");
    expect(source).toContain("selected trusted preview component");
    expect(source).toContain("function renderRequestKey(request: ComponentRenderRequest): string");
    expect(source).toContain("return request.id;");
    expect(source).toContain("function renderRequestForSelectedKey");
    expect(source).toContain("function singleValue");
    expect(source).toContain("renderRequests.filter((request) => renderRequestKey(request) === selectedComponentKey)");
    expect(source).toContain("has multiple trusted preview render requests for selected component");
    expect(source).toContain("function renderRequestForTemplatePrimary");
    expect(source).toContain("profile.template.liveSurface.componentCapabilities.primary");
    expect(source).toContain("const matches = renderRequests.filter((request) => request.componentCapability === primaryCapability);");
    expect(source).toContain("has multiple trusted preview primary render requests");
    expect(source).not.toContain("replay.renderRequests.find((candidate) => renderRequestKey(candidate) === selectedComponentKey)");
    expect(source).not.toContain("renderRequests.find((request) => request.componentCapability === primaryCapability)");
    expect(source).not.toContain("renderRequestKey(request, index)");
    expect(source).not.toContain("renderRequestKey(candidate, index)");
    expect(source).not.toContain("return `${request.componentId}.${index}`");
    expect(source).not.toContain("replay.renderRequests[0]");
    expect(source).not.toContain("return matches[0]");
    expect(studioSource).toContain("component.isPrimaryPreviewSurface");
    expect(studioSource).toContain("function primaryPreviewComponentKey");
    expect(studioSource).toContain("const primarySummaries = componentSummaries.filter((component) => component.isPrimaryPreviewSurface);");
    expect(studioSource).toContain("primarySummaries.length === 1 ? primarySummaries[0].componentKey : undefined");
    expect(studioSource).not.toContain("componentSummaries.find((component) => component.isPrimaryPreviewSurface)?.componentKey");
    expect(studioSource).not.toContain("componentSummaries[0]");
    expect(source).not.toContain("??\n        replay.renderRequests[0]");
    expect(source).not.toContain("?? replay.renderRequests[0]");
    expect(readSource("packages/core/test/replay.test.ts")).toContain("fails closed when saved profile components contain duplicate binding ids");
    expect(readSource("tests/studio-ui.test.ts")).toContain("fails closed when a selected trusted preview component key has duplicate component bindings");
  });

  it("keeps saved replay event identity unique instead of log-order trusted", () => {
    const coreSource = readSource("packages/core/src/index.ts");
    const replayTestSource = readSource("packages/core/test/replay.test.ts");

    expect(coreSource).toContain("duplicate_replay_event_id");
    expect(coreSource).toContain("const duplicateReplayEventIds = duplicateStrings(profile.replay.eventLog.map((event) => event.id));");
    expect(replayTestSource).toContain("fails closed when saved profile replay events contain duplicate event ids");
    expect(coreSource).toContain("duplicate_replay_event_sequence");
    expect(coreSource).toContain("const duplicateReplayEventSequences = duplicateStrings(profile.replay.eventLog.map((event) => String(event.sequence)));");
    expect(replayTestSource).toContain("fails closed when saved profile replay events contain duplicate event sequences");
    expect(coreSource).toContain("function replayEventSequencesAreAscending");
    expect(coreSource).toContain("unsorted_replay_event_sequence");
    expect(replayTestSource).toContain("fails closed when saved profile replay events are not in sequence order");
    expect(coreSource).not.toContain(".sort((left, right) => left.sequence - right.sequence)");
    expect(coreSource).not.toContain("profile.replay.eventLog[0]");
  });

  it("keeps component render fallback policy fail-closed only", () => {
    const contractSource = readSource("packages/contracts/src/index.ts");
    const coreSource = readSource("packages/core/src/index.ts");

    expect(contractSource).toContain('fallbackPolicy: z.literal("fail-closed")');
    expect(contractSource).not.toContain('"skip-component"');
    expect(coreSource).toContain('fallbackPolicy: "fail-closed"');
  });

  it("keeps builder command payload fields action-scoped", () => {
    const source = readSource("packages/contracts/src/index.ts");

    expect(source).toContain("template, input, and asset edit payloads are only accepted by assemble and update actions");
    expect(source).toContain("profile payloads are only accepted by import-profile actions");
    expect(source).toContain("preview actions require an interaction payload");
    expect(source).toContain("interaction payloads are only accepted by preview actions");
    expect(source).toContain("preview requests require an interaction payload");
    expect(source).toContain("interaction payloads are only accepted by preview requests");
  });

  it("keeps builder preview actions free of interaction defaulting", () => {
    const builderSource = readSource("packages/builder/src/index.ts");
    const builderCliSource = readSource("packages/builder/src/cli.ts");
    const contractSource = readSource("packages/contracts/src/index.ts");

    expect(builderSource).toContain("preview-action requires an interaction action");
    expect(builderSource).not.toContain('command.interaction?.action ?? "primary"');
    expect(builderSource).toContain("function requireSinglePreviewToolName");
    expect(builderSource).toContain("must declare exactly one emitted tool");
    expect(builderSource).not.toContain("renderRequest.expectedEmittedEvents[0]");
    expect(builderSource).toContain("function renderRequestForTemplatePrimary");
    expect(builderSource).toContain("profile.template.liveSurface.componentCapabilities.primary");
    expect(builderSource).toContain("const matches = replay.renderRequests.filter((request) => request.componentCapability === primaryCapability);");
    expect(builderSource).toContain("has multiple live-surface primary render requests");
    expect(builderSource).not.toContain("replay.renderRequests.find((request) => request.componentCapability === primaryCapability)");
    expect(builderSource).toContain("function requireSinglePreviewReplayEvent");
    expect(builderSource).toContain("preview requires exactly one replay event");
    expect(builderSource).toContain("function singleValue");
    expect(builderSource).toContain("function requireSingleValue");
    expect(builderSource).not.toContain("return matches[0]");
    expect(builderSource).not.toContain("session.profile.replay.eventLog[0]");
    expect(builderSource).toContain("function requireSessionTemplateId");
    expect(builderSource).not.toContain("interactiveRenderRequestForReplay");
    expect(builderSource).not.toContain("replay.renderRequests[0]");
    expect(builderSource).not.toContain('session.templateId ?? "preview"');
    expect(builderSource).toContain("const previewInteraction");
    expect(builderSource).toContain("interaction: previewInteraction");
    expect(builderCliSource).toContain("--interaction <primary>");
    expect(builderCliSource).toContain("preview requires --interaction primary");
    expect(builderCliSource).toContain("BuilderPreviewInteractionSchema.parse");
    expect(builderCliSource).not.toContain('mappedName === "preview-action" ? { action: "primary" } : undefined');
    expect(builderSource).toContain('allowedValues: ["primary"]');
    expect(contractSource).toContain('action: z.enum(["primary"])');
    expect(contractSource).not.toContain('action: z.enum(["primary"]).default("primary")');
  });

  it("keeps service preview actions caller-owned", () => {
    const serviceSource = readSource("packages/service/src/index.ts");
    const cliSource = readSource("packages/service/src/cli.ts");
    const studioSource = readSource("apps/studio/src/studio-app.tsx");

    expect(serviceSource).toContain("preview(sessionId: string, interaction: BuilderPreviewInteraction)");
    expect(serviceSource).toContain("this.preview(sessionId, request.interaction)");
    expect(serviceSource).not.toContain('interaction: { action: "primary" }');
    expect(cliSource).toContain("--interaction <primary>");
    expect(cliSource).toContain("preview requires --interaction primary");
    expect(studioSource).toContain("SERVICE_PREVIEW_INTERACTION");
  });

  it("keeps Studio timeline detail selection explicit instead of latest-event fallback", () => {
    const studioSource = readSource("apps/studio/src/studio-app.tsx");

    expect(studioSource).toContain("function selectedTimelineEntry");
    expect(studioSource).toContain("function latestTimelineEntryId");
    expect(studioSource).toContain("function initialTimelineEntryId");
    expect(studioSource).toContain("Selected timeline event is not available.");
    expect(studioSource).not.toContain("?? session?.timeline.at(-1)");
    expect(studioSource).not.toContain("timeline.at(-1)?.id");
    expect(studioSource).not.toContain("initialSession?.timeline[0]?.id");
  });

  it("keeps service event serialization schema-first and non-coercive", () => {
    const source = readSource("packages/service/src/index.ts");

    expect(source).toContain("function toJsonValue");
    expect(source).toContain("JsonValueSchema.parse(normalizeJsonValue(value))");
    expect(source).toContain("service event value contains a non-plain object");
    expect(source).not.toContain("JSON.parse(JSON.stringify");
  });

  it("keeps service input text normalization free of empty-string fallback", () => {
    const source = readSource("packages/service/src/index.ts");
    const serviceTestSource = readSource("packages/service/test/local-service.test.ts");
    const studioTestSource = readSource("tests/studio-ui.test.ts");

    expect(source).toContain("function textForServiceRequest(request: BuilderServiceRequest): string");
    expect(source).toContain("function textForBuilderInputSource");
    expect(source).toContain("throw new Error(`${request.actionName} requests require text or a Moonshine transcript record`)");
    expect(source).toContain("moonshine-transcript input requires a Moonshine transcript record");
    expect(source).toContain("text input must not include Moonshine transcript records");
    expect(serviceTestSource).toContain("keeps direct local input source ownership explicit");
    expect(source).not.toContain("request.moonshineTranscript?.text ?? request.text ?? \"\"");
    expect(source).not.toContain("moonshineTranscript?.text ?? input.text");
    expect(`${serviceTestSource}\n${studioTestSource}`).not.toContain("text: transcript.text");
  });

  it("keeps service execution results from preserving stale active template ids", () => {
    const source = readSource("packages/service/src/index.ts");

    expect(source).toContain("function requireResultTemplateId(result: BuilderExecutionResult[\"result\"]): BuilderTemplateId");
    expect(source).toContain("result preview requires activeTemplateId");
    expect(source).toContain("activeTemplateId: requireResultTemplateId(result)");
    expect(source).toContain("activeTemplateId: requireResultTemplateId(output.result)");
    expect(source).toContain("activeTemplateId: BuilderTemplateId;");
    expect(source).not.toContain("activeTemplateId: result.preview.activeTemplateId ?? existing?.activeTemplateId");
    expect(source).not.toContain("activeTemplateId: output.result.preview.activeTemplateId");
    expect(source).not.toContain("activeTemplateId: state?.activeTemplateId ?? snapshot.activeTemplateId");
  });

  it("keeps service updates from defaulting empty sessions to the catalog template", () => {
    const source = readSource("packages/service/src/index.ts");
    const serviceTestSource = readSource("packages/service/test/local-service.test.ts");

    expect(source).toContain("private requireActiveSessionForUpdate");
    expect(source).toContain("assemble a game before updating");
    expect(serviceTestSource).toContain("rejects updates for sessions without an active assembled game");
    expect(source).not.toContain("activeTemplateId: state?.activeTemplateId ?? catalog.defaultTemplateId");
  });

  it("keeps service CLI preview/get/export free of hidden assemble seeding", () => {
    const source = readSource("packages/service/src/cli.ts");

    expect(source).not.toContain("service.cli.preview.seed");
    expect(source).not.toContain("preview-with-assemble");
    expect(source).not.toContain('service.handle(serviceRequest("assemble", args');
    expect(source).toContain("does not accept input flags");
  });

  it("keeps service profile imports free of payload precedence fallbacks", () => {
    const contractSource = readSource("packages/contracts/src/index.ts");
    const serviceSource = readSource("packages/service/src/index.ts");
    const serviceTestSource = readSource("packages/service/test/local-service.test.ts");

    expect(contractSource).toContain("profileExport imports carry asset edits in the export");
    expect(contractSource).toContain("requests require sessionId");
    expect(serviceSource).toContain("function serviceRequestSessionId");
    expect(serviceTestSource).toContain("rejects stale profile export template metadata before import");
    expect(serviceTestSource).toContain("profile export templateId must match");
    expect(serviceSource).not.toContain("request.profile ?? profileExport?.profile");
    expect(serviceSource).not.toContain("request.assetEdit ?? profileExport?.assetEdit");
    expect(serviceSource).not.toContain("request.templateId ?? profileExport?.templateId");
    expect(serviceSource).not.toContain("request.sessionId ?? profileExport.sessionId");
  });

  it("keeps session-bound service methods free of default service sessions", () => {
    const serviceSource = readSource("packages/service/src/index.ts");

    expect(serviceSource).toContain("preview(sessionId: string, interaction: BuilderPreviewInteraction)");
    expect(serviceSource).toContain("getSession(sessionId: string)");
    expect(serviceSource).toContain("exportProfile(sessionId: string)");
    expect(serviceSource).toContain("sessionId: string }): BuilderExecutionResult");
    expect(serviceSource).toContain("LOCAL_SERVICE_SESSION_POLICY");
    expect(serviceSource).toContain("defaultAssembleSessionId");
    expect(serviceSource).toContain("this.catalog().sessions.defaultAssembleSessionId");
    expect(serviceSource).not.toContain('request.sessionId ?? "service.session"');
    expect(serviceSource).not.toContain('preview(sessionId = "service.session")');
    expect(serviceSource).not.toContain('getSession(sessionId = "service.session")');
    expect(serviceSource).not.toContain('exportProfile(sessionId = "service.session")');
    expect(serviceSource).not.toContain("sessionId?: string }): BuilderExecutionResult");
  });

  it("keeps session-bound builder CLI commands free of default sessions", () => {
    const builderCliSource = readSource("packages/builder/src/cli.ts");

    expect(builderCliSource).toContain("function requiredSessionId");
    expect(builderCliSource).toContain('throw new Error(`${commandName} requires --session`)');
    expect(builderCliSource).toContain('mappedName === "assemble-game"');
    expect(builderCliSource).toContain("BUILDER_SESSION_POLICY.defaultAssembleSessionId");
    expect(builderCliSource).toContain("BUILDER_SESSION_POLICY.defaultBatchSessionId");
    expect(builderCliSource).not.toContain('sessionId: args.sessionId ?? "builder.cli"');
    expect(builderCliSource).not.toContain('args.sessionId ?? "builder.batch"');
    expect(builderCliSource).not.toContain('id: `builder-command.${args.sessionId ?? "cli"}.${mappedName}`');
  });

  it("keeps CLI execution summaries explicit instead of preview fallback text", () => {
    const builderCliSource = readSource("packages/builder/src/cli.ts");
    const serviceCliSource = readSource("packages/service/src/cli.ts");

    expect(builderCliSource).toContain("function builderExecutionSummary");
    expect(builderCliSource).toContain("result.preview.activeComponentId");
    expect(serviceCliSource).toContain("function serviceExecutionSummary");
    expect(serviceCliSource).toContain("execution.result.preview.activeComponentId");
    expect(builderCliSource).not.toContain('?? "preview"');
    expect(serviceCliSource).not.toContain('?? "preview"');
  });

  it("keeps local service and builder timestamps contract-owned", () => {
    const contractSource = readSource("packages/contracts/src/index.ts");
    const builderSource = readSource("packages/builder/src/index.ts");
    const serviceSource = readSource("packages/service/src/index.ts");
    const localTimestamp = "2026-07-04T00:00:00.000Z";

    expect(contractSource).toContain("PLAYCRAFT_LOCAL_TIMESTAMP");
    expect(contractSource).toContain(localTimestamp);
    expect(builderSource).toContain("PLAYCRAFT_LOCAL_TIMESTAMP");
    expect(serviceSource).toContain("PLAYCRAFT_LOCAL_TIMESTAMP");
    expect(builderSource).not.toContain(`updatedAt: "${localTimestamp}"`);
    expect(serviceSource).not.toContain(`exportedAt: "${localTimestamp}"`);
    expect(serviceSource).not.toContain(`receivedAt: "${localTimestamp}"`);
    expect(serviceSource).not.toContain(`input.receivedAt ?? "${localTimestamp}"`);
  });

  it("keeps local HTTP service defaults policy-owned", () => {
    const source = readSource("packages/service/src/http-server.ts");

    expect(source).toContain("PLAYCRAFT_HTTP_SERVICE_POLICY");
    expect(source).toContain("PLAYCRAFT_SCHEMA_VERSION");
    expect(source).toContain("PLAYCRAFT_HTTP_SERVICE_POLICY.defaultRoute");
    expect(source).toContain("PLAYCRAFT_HTTP_SERVICE_POLICY.defaultHost");
    expect(source).toContain("PLAYCRAFT_HTTP_SERVICE_POLICY.defaultPort");
    expect(source).toContain("PLAYCRAFT_HTTP_SERVICE_POLICY.defaultMaxBodyBytes");
    expect(source).toContain("PLAYCRAFT_HTTP_SERVICE_POLICY.urlParseBase");
    expect(source).not.toContain('const DEFAULT_ROUTE = "/playcraft"');
    expect(source).not.toContain("const DEFAULT_MAX_BODY_BYTES");
    expect(source).not.toContain('input.host ?? "127.0.0.1"');
    expect(source).not.toContain("input.port ?? 8787");
    expect(source).not.toContain('schemaVersion: "playcraft.v1"');
  });

  it("keeps Studio client defaults policy-owned", () => {
    const source = readSource("apps/studio/src/local-client.ts");

    expect(source).toContain("STUDIO_CLIENT_POLICY");
    expect(source).toContain("STUDIO_CLIENT_POLICY.defaultSessionId");
    expect(source).toContain("STUDIO_CLIENT_POLICY.defaultTimelineIdPrefix");
    expect(source).not.toContain('options.defaultSessionId ?? "studio.session"');
    expect(source).not.toContain('options.timelineIdPrefix ?? "timeline"');
  });

  it("keeps app shell service endpoint env access policy-owned", () => {
    const studioAppSource = readSource("apps/studio/src/App.tsx");
    const mobileAppSource = readSource("apps/mobile-shell/src/App.tsx");
    const studioClientSource = readSource("apps/studio/src/local-client.ts");

    expect(studioClientSource).toContain("STUDIO_RUNTIME_POLICY");
    expect(studioClientSource).toContain('serviceEndpointEnvName: "VITE_PLAYCRAFT_SERVICE_URL"');
    expect(studioClientSource).toContain("studioRuntimeEnvFromServiceEndpoint");
    expect(studioClientSource).toContain("serviceEndpointFromStudioRuntimeEnv");
    expect(studioAppSource).toContain("studioRuntimeEnvFromServiceEndpoint(import.meta.env.VITE_PLAYCRAFT_SERVICE_URL)");
    expect(mobileAppSource).toContain("studioRuntimeEnvFromServiceEndpoint(import.meta.env.VITE_PLAYCRAFT_SERVICE_URL)");
    expect(studioAppSource).not.toContain("serviceEndpointFromStudioRuntimeEnv(import.meta.env)");
    expect(mobileAppSource).not.toContain("serviceEndpointFromStudioRuntimeEnv(import.meta.env)");
  });

  it("keeps Mobile shell client defaults policy-owned", () => {
    const source = readSource("apps/mobile-shell/src/mobile-client.ts");
    const mobileReadme = readSource("apps/mobile-shell/src-tauri/README.md");

    expect(source).toContain("MOBILE_SHELL_CLIENT_POLICY");
    expect(source).toContain("MOBILE_SHELL_CLIENT_POLICY.defaultSessionId");
    expect(source).toContain("MOBILE_SHELL_CLIENT_POLICY.defaultTimelineIdPrefix");
    expect(mobileReadme).toContain("profile export");
    expect(mobileReadme).toContain("profile import");
    expect(source).not.toContain('defaultSessionId: "mobile.session",\n    serviceEndpoint');
    expect(source).not.toContain('timelineIdPrefix: "mobile.timeline"');
  });

  it("keeps service CLI response output action-scoped instead of payload-precedence based", () => {
    const source = readSource("packages/service/src/cli.ts");

    expect(source).toContain("function payloadForResponse");
    expect(source).toContain("switch (response.actionName)");
    expect(source).not.toContain("response.catalog ?? response.profileExport");
    expect(source).not.toContain("response.execution ?? response.session");
  });

  it("keeps service CLI stateful examples on exact request batches", () => {
    const cliSource = readSource("packages/service/src/cli.ts");
    const contractSource = readSource("packages/contracts/src/index.ts");
    const rootReadme = readSource("README.md");
    const architecture = readSource("playcraft-agentic-framework/ARCHITECTURE.md");
    const devGuide = readSource("playcraft-agentic-framework/DEV_GUIDE.md");
    const frameworkReadme = readSource("playcraft-agentic-framework/README.md");
    const prd = readSource("playcraft-agentic-framework/PRD.md");
    const serviceSource = readSource("packages/service/src/index.ts");
    const serviceTestSource = readSource("packages/service/test/local-service.test.ts");
    const studioSource = readSource("apps/studio/src/studio-app.tsx");

    expect(contractSource).toContain("BuilderServiceCatalogSchema");
    expect(contractSource).toContain("BuilderServiceCatalogActionRequestSchema");
    expect(contractSource).toContain("BuilderServiceRequestFieldNameSchema");
    expect(contractSource).toContain('"BuilderServiceRequestBatchSchema"');
    expect(contractSource).toContain("requiredContracts: z.array(PublicContractNameSchema).min(2)");
    expect(contractSource).toContain("service: BuilderServiceCatalogSchema");
    expect(contractSource).toContain("exactEnvelope");
    expect(contractSource).toContain("requiredAnyOf");
    expect(contractSource).toContain("exclusiveAnyOf");
    expect(contractSource).toContain("forbiddenTogether");
    expect(contractSource).toContain("BuilderServiceRequestBatchSchema");
    expect(contractSource).toContain("z.array(BuilderServiceRequestSchema).min(1)");
    expect(serviceSource).toContain("LOCAL_SERVICE_CATALOG");
    expect(serviceSource).toContain("service: LOCAL_SERVICE_CATALOG");
    expect(serviceSource).toContain('acceptedFields: ["sessionId", "text", "source", "moonshineTranscript", "templateId", "assetEdit"]');
    expect(serviceSource).toContain('exclusiveAnyOf: [["text", "moonshineTranscript"]]');
    expect(serviceSource).toContain('exclusiveAnyOf: [["profile", "profileExport"]]');
    expect(serviceSource).toContain('forbiddenTogether: [["profileExport", "assetEdit"]]');
    expect(contractSource).toContain("service requests accept either text or a Moonshine transcript record, not both");
    expect(serviceSource).toContain("handleLocalServiceRequestBatch");
    expect(serviceSource).toContain("BuilderServiceRequestBatchSchema.parse");
    expect(serviceTestSource).toContain("keeps service catalog request metadata aligned with the request schema");
    expect(serviceTestSource).toContain("ALL_SERVICE_REQUEST_FIELDS");
    expect(serviceTestSource).toContain("BuilderServiceRequestSchema.safeParse");
    expect(cliSource).toContain("request-batch");
    expect(cliSource).toContain("parseServiceRequestBatchJson");
    expect(cliSource).toContain("rejectNonEnvelopeFlags");
    expect(cliSource).toContain("only accepts --request-json and --json");
    expect(cliSource).toContain("BuilderServiceRequestBatchSchema.parse");
    expect(cliSource).toContain("catalog.service.actions");
    expect(cliSource).toContain("catalog.service.exactEnvelope");
    expect(cliSource).toContain("catalog.service.exactEnvelope.requiredContracts.join");
    expect(cliSource).toContain("action.request.acceptedFields");
    expect(cliSource).toContain("action.request.requiredAnyOf");
    expect(cliSource).toContain("action.request.exclusiveAnyOf");
    expect(cliSource).toContain("action.request.forbiddenTogether");
    expect(studioSource).toContain("catalog.service.actions");
    expect(studioSource).toContain("catalog.service.exactEnvelope");
    expect(studioSource).toContain("catalog.service.exactEnvelope.requiredContracts.join");
    expect(studioSource).toContain("catalog.service.transports");
    expect(studioSource).toContain("action.request.acceptedFields");
    expect(studioSource).toContain("action.request.requiredAnyOf");
    expect(studioSource).toContain("action.request.exclusiveAnyOf");
    expect(studioSource).toContain("action.request.forbiddenTogether");
    expect(cliSource).not.toContain("BuilderServiceRequestSchema.array().min(1)");
    expect(rootReadme).toContain("playcraft-service request-batch");
    expect(rootReadme).toContain("handleLocalServiceRequestBatch");
    expect(rootReadme).toContain("exact-envelope required contracts");
    expect(devGuide).toContain("playcraft-service request-batch");
    expect(devGuide).toContain("BuilderServiceRequestBatchSchema");
    expect(devGuide).toContain("handleLocalServiceRequestBatch");
    expect(devGuide).toContain("exact-envelope required contracts");
    expect(devGuide).toContain("exact-envelope service helpers");
    expect(devGuide).toContain("request field summaries");
    expect(devGuide).toContain("exclusive and forbidden field groups");
    expect(rootReadme).toContain("service facade actions");
    expect(rootReadme).toContain("request field summaries");
    expect(rootReadme).toContain("exclusive and forbidden field groups");
    expect(architecture).toContain("service facade action summaries");
    expect(architecture).toContain("request field summaries");
    expect(architecture).toContain("exclusive and forbidden field groups");
    expect(frameworkReadme).toContain("service facade summaries");
    expect(frameworkReadme).toContain("request field summaries");
    expect(frameworkReadme).toContain("exclusive and forbidden field groups");
    expect(frameworkReadme).toContain("request batches");
    expect(architecture).toContain("same-process `BuilderServiceRequestBatchSchema` request batches");
    expect(architecture).toContain("BuilderServiceRequestBatchSchema");
    expect(`${rootReadme}\n${devGuide}`).not.toMatch(/export-profile\s+--(?:text|transcript|asset-theme|asset-item)/u);
    expect(`${frameworkReadme}\n${architecture}\n${devGuide}\n${prd}`).toContain("export-profile");
    expect(`${frameworkReadme}\n${architecture}\n${devGuide}\n${prd}`).toContain("import-profile");
    expect(`${frameworkReadme}\n${architecture}\n${devGuide}\n${prd}`).toContain("get-session");
    expect(devGuide).not.toContain("catalog, assemble, update, and preview actions");
    expect(frameworkReadme).not.toContain("previewing trusted interactions, and listing local tools/templates");
    expect(prd).not.toContain("assemble, update, preview, and catalog listing");
  });

  it("keeps Studio request tips catalog-owned instead of app-composed", () => {
    const studioSource = readSource("apps/studio/src/studio-app.tsx");
    const contractSource = readSource("packages/contracts/src/index.ts");
    const packSource = readSource("packages/packs/src/index.ts");
    const packTestSource = readSource("packages/packs/test/mvp-profiles.test.ts");
    const serviceSource = readSource("packages/service/src/index.ts");

    expect(contractSource).toContain("BuilderCatalogRequestTipsSchema");
    expect(contractSource).toContain("exampleRequest");
    expect(contractSource).toContain("featuredGames: z.array");
    expect(packSource).toContain("exampleRequest: input.exampleRequest");
    expect(packSource).toContain("requestAliasSummary: input.requestAliasSummary");
    expect(packSource).not.toContain("exampleRequest?: string");
    expect(packSource).not.toContain("sentenceCase");
    expect(packSource).not.toContain("input.aliases[0]");
    expect(packSource).not.toContain("function requestAliasSummary");
    expect(packSource).not.toContain("requestAliasSummary(input.aliases)");
    expect(packSource).not.toContain("aliases.slice(0, 3)");
    expect(packTestSource).toContain("template.shape-memory");
    expect(packTestSource).toContain("shape memory, shape match cards, matching shapes");
    expect(serviceSource).toContain("requestTipsForCatalog");
    expect(serviceSource).toContain("requestTips: requestTipsForCatalog");
    expect(serviceSource).toContain("LOCAL_SERVICE_REQUEST_TIP_EXAMPLES");
    expect(serviceSource).toContain("LOCAL_SERVICE_REQUEST_TIP_FEATURED_TEMPLATE_IDS");
    expect(serviceSource).toContain("requiredTemplateForRequestTip");
    expect(serviceSource).toContain('templateId: "template.memory-match"');
    expect(serviceSource).toContain('request: "Memory game with dinosaurs"');
    expect(serviceSource).not.toContain("availableGames.slice");
    expect(serviceSource).not.toContain("visibleGames");
    expect(serviceSource).not.toContain(".filter((entry) => templateIds.has(entry.templateId))");
    expect(serviceSource).not.toContain("assetEdits[index % Math.max(assetEdits.length, 1)]");
    expect(serviceSource).not.toContain("templates.slice(0, 3).map((template, index)");
    expect(serviceSource).not.toContain("function sentenceCase");
    expect(studioSource).toContain("catalog.requestTips.summaryLines");
    expect(studioSource).not.toContain("preferredTemplateAlias");
    expect(studioSource).not.toMatch(/requestAliases\)\)/u);
    expect(studioSource).not.toContain("catalog.templates.slice(0, 3)");
    expect(studioSource).not.toContain("Math.max(assetThemes.length");
  });

  it("keeps Studio game tip labels catalog-owned instead of suffix-stripped", () => {
    const studioSource = readSource("apps/studio/src/studio-app.tsx");
    const contractSource = readSource("packages/contracts/src/index.ts");
    const packSource = readSource("packages/packs/src/index.ts");

    expect(contractSource).toContain("displayLabel");
    expect(contractSource).toContain("requestAliasSummary");
    expect(packSource).toContain("displayLabel: template.displayLabel");
    expect(studioSource).toContain("catalog.requestTips.summaryLines");
    expect(studioSource).toContain("template.requestAliasSummary");
    expect(studioSource).not.toContain("displayGameName");
    expect(studioSource).not.toContain("replace(/\\s+MVP");
    expect(studioSource).not.toContain("requestAliases.slice(0, 3)");
    expect(packSource).not.toContain("displayLabelForTemplateName");
    expect(packSource).not.toContain("replace(/\\s+MVP");
  });

  it("keeps Studio asset tip labels catalog-owned instead of alias-inferred", () => {
    const studioSource = readSource("apps/studio/src/studio-app.tsx");
    const contractSource = readSource("packages/contracts/src/index.ts");

    expect(contractSource).toContain("displayLabel");
    expect(contractSource).toContain("aliasSummary");
    expect(contractSource).toContain("suggestedItemSummary");
    expect(studioSource).toContain("catalog.requestTips.summaryLines");
    expect(studioSource).toContain("entry.aliasSummary");
    expect(studioSource).toContain("entry.suggestedItemSummary");
    expect(studioSource).not.toContain("preferredAssetThemeLabel");
    expect(studioSource).not.toContain("alias.includes");
    expect(studioSource).not.toContain("entry.aliases.join");
    expect(studioSource).not.toContain("entry.suggestedItems.join");
  });

  it("keeps builder tool display names explicit instead of description-derived", () => {
    const builderSource = readSource("packages/builder/src/index.ts");

    expect(builderSource).toContain('"Assemble Game"');
    expect(builderSource).toContain('"Update Game"');
    expect(builderSource).toContain('"Preview Action"');
    expect(builderSource).toContain("displayName,");
    expect(builderSource).not.toContain("description.split");
    expect(builderSource).not.toContain("displayName: description");
  });

  it("keeps Studio chat asset summaries session-owned instead of prompt-parsed", () => {
    const source = readSource("apps/studio/src/studio-app.tsx");

    expect(source).toContain("session.activeAssetEdit");
    expect(source).not.toContain("assetThemeForProfile");
    expect(source).not.toContain("assetRequests[0]?.prompt");
    expect(source).not.toMatch(/memory card illustrations\|sorting game illustrations/u);
  });

  it("keeps service freeform asset folder names literal", () => {
    const source = readSource("packages/service/src/index.ts");
    const contractSource = readSource("packages/contracts/src/index.ts");
    const assetCatalogSource = readSource("packages/assets/src/index.ts");
    const serviceTestSource = readSource("packages/service/test/local-service.test.ts");

    expect(source).toContain("isGenericAssetTheme");
    expect(source).toContain("function assetIntentClauses");
    expect(source).toContain("function matchAssetThemes");
    expect(source).toContain("function uniqueAssetThemeMatches");
    expect(source).toContain("ambiguous asset request matched");
    expect(source).toContain("LOCAL_SERVICE_TEXT_ASSET_EDIT_MAX_ITEMS");
    expect(source).toContain("text asset requests accept at most ${LOCAL_SERVICE_TEXT_ASSET_EDIT_MAX_ITEMS} explicit items");
    expect(source).toContain("LOCAL_SERVICE_TEXT_ASSET_EDIT_MAX_THEME_LENGTH");
    expect(source).toContain("function requireTextAssetThemeWithinContract");
    expect(source).toContain("text asset requests accept asset themes up to ${LOCAL_SERVICE_TEXT_ASSET_EDIT_MAX_THEME_LENGTH} characters");
    expect(source).not.toContain(".slice(0, 12)");
    expect(source).not.toContain(".slice(0, 80)");
    expect(serviceTestSource).toContain("rejects text asset edits with too many explicit items instead of truncating them");
    expect(serviceTestSource).toContain("rejects text asset edit themes that exceed the contract instead of truncating them");
    expect(serviceTestSource).toContain("rejects ambiguous asset edit text instead of selecting the first match");
    expect(contractSource).toContain("genericThemeTokens");
    expect(contractSource).toContain("freeformItemSuffixes");
    expect(assetCatalogSource).toContain("localAssetEditGenericThemeTokens");
    expect(assetCatalogSource).toContain("localAssetEditFreeformItemSuffixes");
    expect(assetCatalogSource).toContain("localAssetEditIntentPatterns");
    expect(assetCatalogSource).not.toContain("[a-z0-9 ,.-]{1,80}");
    expect(source).toContain("localAssetEditGenericThemeTokens");
    expect(source).toContain("localAssetEditFreeformItemSuffixes");
    expect(source).toContain("localAssetEditIntentPatterns");
    expect(readSource("packages/builder/src/index.ts")).toContain("localAssetEditFreeformItemSuffixes.map");
    expect(readSource("packages/builder/src/index.ts")).not.toContain("function generatedItemsForTheme");
    expect(readSource("packages/builder/src/index.ts")).not.toContain('`${base}-1`, `${base}-2`, `${base}-3`');
    expect(source).not.toContain(".find((entry): entry is { source: TextAssetEdit[\"source\"]; theme: string } => Boolean(entry))");
    expect(source).not.toContain("GENERIC_ASSET_THEME_TOKENS");
    expect(source).not.toContain('new Set(["asset", "assets"');
    expect(source).not.toContain("matchCatalogAssetTheme");
    expect(source).not.toContain("replace\\\\s+");
    expect(source).not.toMatch(/replace\(\s*\/\\b\(\?:game\|profile\|challenge\|assets/u);
    expect(source).not.toMatch(/replace\(\s*\/\\b\(\?:assets\?\|cards/u);
  });

  it("keeps active asset edit inheritance scoped to the active template", () => {
    const source = readSource("packages/service/src/index.ts");
    const serviceTestSource = readSource("packages/service/test/local-service.test.ts");

    expect(source).toContain("allowActiveAssetEdit: templateDecision.templateId === input.activeTemplateId");
    expect(source).toContain("if (input.allowActiveAssetEdit && input.activeAssetEdit)");
    expect(serviceTestSource).toContain("does not inherit active asset edits when switching templates");
    expect(serviceTestSource).toContain("clears stale active asset edits when a session switches games without an asset request");
    expect(source).toContain("function singleValue");
    expect(source).toContain("function requireSingleValue");
    expect(source).not.toContain("matchedTemplateIds[0]");
    expect(source).not.toContain("const match = matches[0]");
    expect(source).not.toContain("if (input.activeAssetEdit) {\n    return {");
  });

  it("keeps the default builder template pack-owned", () => {
    const packSource = readSource("packages/packs/src/index.ts");
    const contractSource = readSource("packages/contracts/src/index.ts");
    const serviceSource = readSource("packages/service/src/index.ts");
    const serviceTestSource = readSource("packages/service/test/local-service.test.ts");

    expect(packSource).toContain("DEFAULT_GAME_TEMPLATE_ID");
    expect(serviceSource).toContain("DEFAULT_GAME_TEMPLATE_ID");
    expect(serviceSource).toContain("ambiguous template request matched");
    expect(serviceSource).toContain("use explicit templateId");
    expect(serviceSource).toContain("assemble requests require a game template id or a recognizable game request");
    expect(serviceTestSource).toContain("rejects ambiguous active-session template text instead of staying on the active template");
    expect(serviceTestSource).toContain("rejects ambiguous first-time template text instead of defaulting");
    expect(serviceTestSource).toContain("rejects vague first-run assemble requests instead of using the catalog default template");
    expect(contractSource).not.toContain('"default-template"');
    expect(contractSource).not.toContain('"ambiguous-template-match"');
    expect(serviceSource).not.toContain('source: "default-template"');
    expect(serviceSource).not.toContain("DEFAULT_TEMPLATE_ID");
    expect(serviceSource).not.toContain('BuilderTemplateIdSchema.parse("template.memory-match")');
    expect(serviceSource).not.toContain("input.activeTemplateId ?? DEFAULT_GAME_TEMPLATE_ID");
    expect(serviceSource).not.toContain("state?.activeTemplateId ?? this.catalog().defaultTemplateId");
  });

  it("keeps builder asset prompt wording template-owned instead of component-inferred", () => {
    const builderSource = readSource("packages/builder/src/index.ts");
    const builderTestSource = readSource("packages/builder/test/session-service.test.ts");
    const contractSource = readSource("packages/contracts/src/index.ts");
    const packSource = readSource("packages/packs/src/index.ts");

    expect(contractSource).toContain("assetPromptKind");
    expect(contractSource).toContain("GameTemplateAssetEditOperationSchema");
    expect(packSource).toContain("assetPromptKind: template.assetPromptKind");
    expect(packSource).toContain("assetEditOperations: template.assetEditOperations");
    expect(builderSource).toContain("template.assetPromptKind");
    expect(builderSource).toContain("template.assetEditOperations");
    expect(builderSource).toContain("function assetEditItemsForAssetRequests");
    expect(builderSource).toContain("function propsForAssetEditOperation");
    expect(builderSource).toContain("function assetEditOperationForComponent");
    expect(builderSource).toContain("has multiple asset edit operations for ${componentCapability}");
    expect(builderSource).not.toContain("return operations[0]");
    expect(builderSource).toContain("promptForAssetEdit(template, edit, assetRequestItems)");
    expect(builderSource).toContain("assetEditItems: assetRequestItems");
    expect(builderTestSource).toContain('not.toContain("dinosaur-3")');
    expect(builderTestSource).toContain('not.toContain("toy-3")');
    expect(builderTestSource).toContain("metadata.assetEditItems");
    expect(builderTestSource).toContain("rejects asset edit requests when imported templates duplicate component operations");
    expect(builderSource).not.toContain("hasComponentCapability");
    expect(builderSource).not.toContain("promptForAssetEdit(profile");
    expect(builderSource).not.toContain("assetEditItems: edit.items");
    expect(builderSource).not.toContain("promptForAssetEdit(template, edit)");
    expect(builderSource).not.toContain("template.assetEditOperations.find((operation) => operation.componentCapability === component.renderCapability)");
    expect(builderSource).not.toContain('case "component:reveal-card-grid"');
    expect(builderSource).not.toContain('case "component:choice-grid"');
    expect(builderSource).not.toContain('case "component:sort-bins"');
    expect(builderSource).not.toContain('case "component:sequence-pad"');
    expect(builderSource).not.toContain('case "component:celebration-overlay"');
    expect(builderSource).not.toContain('case "component:hint-bubble"');
  });

  it("keeps builder asset edit operations from inventing missing authored props", () => {
    const builderSource = readSource("packages/builder/src/index.ts");
    const builderTestSource = readSource("packages/builder/test/session-service.test.ts");

    expect(builderSource).toContain("asset edit operation ${operation} requires non-empty string array prop ${key}");
    expect(builderSource).toContain("asset edit operation ${operation} requires non-empty string record prop ${key}");
    expect(builderSource).toContain("asset edit operation ${operation} requires numeric prop ${key}");
    expect(builderSource).toContain("const components = profile.components.filter((entry) => entry.renderCapability === operation.componentCapability);");
    expect(builderSource).toContain("has multiple components for ${operation.componentCapability} ${operationKind} asset requests");
    expect(builderSource).not.toContain("const component = profile.components.find((entry) => entry.renderCapability === operation.componentCapability)");
    expect(builderSource).toContain("function requireMemoryPairCount");
    expect(builderSource).toContain("memory-pairs requires at least ${pairCount} asset edit items");
    expect(builderSource).toContain('itemsSource: "explicit" | "catalog" | "freeform"');
    expect(builderSource).toContain('itemsSource === "explicit" && edit.items.length !== pairCount');
    expect(builderSource).toContain("memory-pairs explicit asset edit items require exactly ${pairCount} items");
    expect(builderTestSource).toContain("updates imported memory profiles from authored pair counts instead of the bundled pair count");
    expect(builderTestSource).toContain("rejects memory asset edits that do not cover every authored pair");
    expect(builderTestSource).toContain("rejects explicit memory asset edits with unused extra items instead of dropping them");
    expect(builderSource).toContain("asset edit operation ${operation} requires non-empty string matrix prop ${key}");
    expect(builderSource).toContain('requireStringArrayProp(props, "bins", "sorting-items")');
    expect(builderSource).toContain("function requireAssetEditItemsForBins");
    expect(builderSource).toContain("sorting-items requires at least ${bins.length} asset edit items");
    expect(builderSource).toContain('itemsSource === "explicit" && edit.items.length !== bins.length');
    expect(builderSource).toContain("sorting-items explicit asset edit items require exactly ${bins.length} items");
    expect(builderTestSource).toContain("rejects explicit sorting asset edits with unused extra items instead of dropping them");
    expect(builderTestSource).toContain("rejects asset edit requests when imported profiles have duplicate operation components");
    expect(builderSource).toContain('requireStringArrayProp(props, "sequence", "sequence-items")');
    expect(builderSource).toContain('requireStringMatrixProp(props, "rounds", "sequence-items")');
    expect(builderSource).toContain("sequence-items requires at least ${uniqueTokens.length} asset edit items");
    expect(builderSource).toContain('edit.itemsSource === "explicit" && edit.items.length !== uniqueTokens.length');
    expect(builderSource).toContain("sequence-items explicit asset edit items require exactly ${uniqueTokens.length} items");
    expect(readSource("packages/builder/test/session-service.test.ts")).toContain("rejects sequence asset edits that do not cover every authored sequence token");
    expect(builderTestSource).toContain("rejects explicit sequence asset edits with unused extra items instead of dropping them");
    expect(builderSource).not.toContain('bins.length > 0 ? bins : ["red", "blue"]');
    expect(builderSource).not.toContain('activeBins.map((bin) => `${bin} ${edit.singularTheme}`)');
    expect(builderSource).not.toContain("columns: props.columns ?? 2");
    expect(builderSource).not.toContain("pairedCardIds(edit)");
    expect(builderSource).not.toContain("items[index % items.length]");
    expect(builderSource).not.toContain("remapSequenceTokens(tokens: string[], tokenMap: Map<string, string>, fallback");
    expect(builderSource).not.toContain("return [fallback]");
    expect(builderSource).not.toContain("rounds.length > 0 ? rounds : [sequence]");
  });

  it("publishes concrete preview interaction tool arguments", () => {
    const builderSource = readSource("packages/builder/src/index.ts");
    const contractSource = readSource("packages/contracts/src/index.ts");

    expect(contractSource).toContain("fields?: Record<string, JsonField>");
    expect(builderSource).toContain("const previewInteraction");
    expect(builderSource).toContain("required: true");
    expect(builderSource).toContain('allowedValues: ["primary"]');
    expect(builderSource).toContain("interaction: previewInteraction");
    expect(builderSource).not.toContain('"preview-action": {\n      interaction: optionalObject');
  });

  it("keeps Live App surface selection template-owned instead of component-priority inferred", () => {
    const liveGameSource = readSource("apps/studio/src/live-game.tsx");
    const contractSource = readSource("packages/contracts/src/index.ts");
    const architecture = readSource("playcraft-agentic-framework/ARCHITECTURE.md");
    const devGuide = readSource("playcraft-agentic-framework/DEV_GUIDE.md");
    const packSource = readSource("packages/packs/src/index.ts");

    expect(contractSource).toContain("GameTemplateLiveSurfaceSchema");
    expect(packSource).toContain("liveSurface: template.liveSurface");
    expect(liveGameSource).toContain("GameTemplateLiveSurface");
    expect(liveGameSource).toContain("const liveSurface = template.liveSurface");
    expect(liveGameSource).not.toContain("template?.liveSurface");
    expect(liveGameSource).not.toContain("liveSurface?.kind");
    expect(liveGameSource).toContain("liveSurface.componentCapabilities.primary");
    expect(liveGameSource).toContain("liveSurface.componentCapabilities.choice");
    expect(liveGameSource).toContain("const matches = profile.components.filter((component) => component.renderCapability === capability);");
    expect(liveGameSource).toContain("has multiple live surface components");
    expect(liveGameSource).toContain("function singleValue");
    expect(liveGameSource).toContain("function requireSingleValue");
    expect(liveGameSource).toContain("function memoryCardForDeckId");
    expect(liveGameSource).toContain("const matches = deck.filter((entry) => entry.id === cardId);");
    expect(liveGameSource).not.toContain("return matches[0]");
    expect(liveGameSource).not.toContain("deck.find((entry) => entry.id === next[0])");
    expect(liveGameSource).toContain("function LiveGameFailure");
    expect(liveGameSource).toContain('"data-testid": "live-game-error"');
    expect(liveGameSource).not.toContain("profile.components.find((component) => component.renderCapability === capability)");
    expect(contractSource).not.toContain("liveSurfaceKind");
    expect(packSource).not.toContain("liveSurfaceKind");
    expect(liveGameSource).not.toContain("liveSurfaceKind");
    expect(liveGameSource).not.toContain("type GameSurfaceKind");
    expect(liveGameSource).not.toContain("componentByCapability");
    expect(liveGameSource).not.toContain('"component:reveal-card-grid"');
    expect(liveGameSource).not.toContain('"component:sort-bins"');
    expect(liveGameSource).not.toContain('"component:sequence-pad"');
  });

  it("keeps Live App token styling template-owned", () => {
    const liveGameSource = readSource("apps/studio/src/live-game.tsx");
    const contractSource = readSource("packages/contracts/src/index.ts");
    const architecture = readSource("playcraft-agentic-framework/ARCHITECTURE.md");
    const devGuide = readSource("playcraft-agentic-framework/DEV_GUIDE.md");
    const packSource = readSource("packages/packs/src/index.ts");

    expect(contractSource).toContain("GameTemplateTokenStyleSchema");
    expect(contractSource).toContain("tokenStyles: z.array(GameTemplateTokenStyleSchema).min(1)");
    expect(contractSource).toContain("defaultTokenStyle: GameTemplateTokenStyleSchema");
    expect(contractSource).toContain("accent: z.string()");
    expect(packSource).toContain("memoryPairTokenStyles");
    expect(packSource).toContain("toddlerTokenStyles");
    expect(packSource).toContain("defaultMemoryTokenStyle");
    expect(packSource).toContain("defaultToddlerTokenStyle");
    expect(packSource).toContain("tokenStyles: memoryPairTokenStyles");
    expect(packSource).toContain("tokenStyles: toddlerTokenStyles");
    expect(packSource).toContain("defaultTokenStyle: defaultMemoryTokenStyle");
    expect(packSource).toContain("defaultTokenStyle: defaultToddlerTokenStyle");
    expect(architecture).toContain("default token style");
    expect(devGuide).toContain("default token style");
    expect(liveGameSource).toContain("GameTemplateTokenStyle");
    expect(liveGameSource).toContain("tokenStyleCatalogForSurface");
    expect(liveGameSource).toContain("function validateMemorySurfaceProps");
    expect(liveGameSource).toContain("memory cards contain duplicate card ids");
    expect(liveGameSource).toContain("memory cards are missing authored pairs");
    expect(liveGameSource).toContain("memory pairs reference missing cards");
    expect(liveGameSource).toContain("memory pair ${pairKey} must contain exactly 2 cards");
    expect(liveGameSource).toContain("function validateSortingSurfaceProps");
    expect(liveGameSource).toContain("sorting items contain duplicate item ids");
    expect(liveGameSource).toContain("sorting targets reference missing items");
    expect(liveGameSource).toContain("function validateSequenceSurfaceProps");
    expect(liveGameSource).toContain("sequence tokens are missing authored choices");
    expect(liveGameSource).toContain("function requiredSequenceChoiceComponent");
    expect(liveGameSource).toContain("sequence surface is missing required authored choice component capability");
    expect(liveGameSource).toContain("function validateTokenStylesForTokens");
    expect(liveGameSource).toContain("function tokenStyleMatchesForToken");
    expect(liveGameSource).toContain("maps to multiple token styles");
    expect(liveGameSource).toContain("const tokenStyle = singleValue(matches) ?? tokenStyleCatalog.defaultStyle;");
    expect(liveGameSource).toContain("liveSurface.defaultTokenStyle");
    expect(readSource("tests/studio-asset-library.test.tsx")).toContain("rejects duplicate Live App token styles instead of using style order");
    expect(readSource("tests/studio-asset-library.test.tsx")).toContain("rejects duplicate Live App memory card ids instead of using deck order");
    expect(readSource("tests/studio-asset-library.test.tsx")).toContain("rejects memory cards missing authored pairs instead of dropping deck cards");
    expect(readSource("tests/studio-asset-library.test.tsx")).toContain("rejects incomplete Live App memory pairs instead of making unwinnable decks");
    expect(readSource("tests/studio-asset-library.test.tsx")).toContain("rejects duplicate Live App sorting item ids instead of using placement keys");
    expect(readSource("tests/studio-asset-library.test.tsx")).toContain("rejects sorting target keys for missing items instead of ignoring hidden targets");
    expect(readSource("tests/studio-asset-library.test.tsx")).toContain("rejects sequence tokens missing from authored choices instead of inferring buttons");
    expect(readSource("tests/studio-asset-library.test.tsx")).toContain("rejects sequence surfaces without an authored choice component capability");
    expect(liveGameSource).not.toContain("tokenColorCatalog");
    expect(liveGameSource).not.toContain("memoryPairPalette");
    expect(liveGameSource).not.toContain("const palette =");
    expect(liveGameSource).not.toContain("fallbackIndex");
    expect(liveGameSource).not.toContain("uniqueStrings([...sequence, ...configuredRounds.flat()])");
    expect(liveGameSource).not.toContain(".filter((card): card is MemoryCard");
    expect(liveGameSource).not.toContain("tokenStyleCatalog.tokenStyles.find");
    expect(liveGameSource).not.toContain('aliases: ["red"]');
    expect(liveGameSource).not.toContain('aliases: ["blue"]');
    expect(liveGameSource).not.toContain('aliases: ["green"]');
    expect(liveGameSource).not.toContain('aliases: ["yellow"]');
  });

  it("keeps Studio library asset replacement sources template-owned", () => {
    const assetLibrarySource = readSource("apps/studio/src/asset-library.ts");
    const liveGameSource = readSource("apps/studio/src/live-game.tsx");
    const contractSource = readSource("packages/contracts/src/index.ts");
    const packSource = readSource("packages/packs/src/index.ts");

    expect(contractSource).toContain("GameTemplateAssetReplacementSourceSchema");
    expect(contractSource).toContain("GameProfileTemplateSnapshotSchema");
    expect(packSource).toContain("assetReplacementSources");
    expect(assetLibrarySource).toContain("return profile.template");
    expect(assetLibrarySource).not.toContain("@playcraft/packs");
    expect(assetLibrarySource).not.toContain("gameTemplateDefinitions.find");
    expect(liveGameSource).toContain("return profile.template");
    expect(liveGameSource).not.toContain("@playcraft/packs");
    expect(liveGameSource).not.toContain("gameTemplateDefinitions.find");
    expect(liveGameSource).toContain("function profileAssetById");
    expect(liveGameSource).toContain("function requireUniqueProfileAssetIds");
    expect(liveGameSource).toContain("duplicate generated asset ids");
    expect(readSource("packages/core/src/index.ts")).toContain("duplicate_asset_id");
    expect(readSource("packages/core/src/index.ts")).toContain("const duplicateAssetIds = duplicateStrings(profile.assets.map((asset) => asset.assetId));");
    expect(readSource("packages/core/test/replay.test.ts")).toContain("fails closed when saved profile assets contain duplicate generated asset ids");
    expect(readSource("packages/core/src/index.ts")).toContain("duplicate_asset_request_id");
    expect(readSource("packages/core/src/index.ts")).toContain("const duplicateAssetRequestIds = duplicateStrings(profile.assetRequests.map((request) => request.requestId));");
    expect(readSource("packages/core/test/replay.test.ts")).toContain("fails closed when saved profile asset requests contain duplicate request ids");
    expect(liveGameSource).toContain("const matches = profile.assets.filter((entry) => entry.assetId === assetId);");
    expect(liveGameSource).not.toContain("profile.assets.find((entry) => entry.assetId === assetId)");
    expect(readSource("tests/studio-asset-library.test.tsx")).toContain("rejects duplicate generated asset ids instead of using asset order");
    expect(assetLibrarySource).toContain("template.liveSurface.assetReplacementSources");
    expect(assetLibrarySource).toContain("componentForReplacementSource");
    expect(assetLibrarySource).toContain("const matches = profile.components.filter((component) => component.renderCapability === capability);");
    expect(assetLibrarySource).toContain("function singleValue");
    expect(assetLibrarySource).toContain("function requireSingleValue");
    expect(assetLibrarySource).toContain("asset replacement source ${source.componentRole}:${source.prop} is missing a live surface component capability");
    expect(assetLibrarySource).toContain("is missing asset replacement component for ${capability}");
    expect(assetLibrarySource).toContain("has multiple asset replacement components");
    expect(assetLibrarySource).toContain("asset replacement prop ${key} must be an authored string array");
    expect(assetLibrarySource).toContain("asset replacement prop ${key} contains non-string entries");
    expect(assetLibrarySource).toContain("asset replacement prop ${key} must be an authored string record");
    expect(assetLibrarySource).toContain("asset replacement prop ${key} contains non-string values");
    expect(assetLibrarySource).not.toContain("if (!component) {\n      continue;");
    expect(assetLibrarySource).not.toContain("return value.filter((entry): entry is string => typeof entry === \"string\");");
    expect(assetLibrarySource).not.toContain(".filter((entry): entry is [string, string] => typeof entry[1] === \"string\")");
    expect(assetLibrarySource).not.toContain("profile.components.find((component) => component.renderCapability === capability)");
    expect(readSource("tests/studio-asset-library.test.tsx")).toContain("rejects asset replacement sources without a declared live surface component capability");
    expect(readSource("tests/studio-asset-library.test.tsx")).toContain("rejects asset replacement sources whose component is missing from the profile");
    expect(readSource("tests/studio-asset-library.test.tsx")).toContain("rejects malformed asset replacement token arrays instead of filtering entries");
    expect(readSource("tests/studio-asset-library.test.tsx")).toContain("rejects malformed asset replacement pair maps instead of filtering values");
    expect(assetLibrarySource).toContain("const matches = sortingBinAssetCatalog.filter((entry)");
    expect(assetLibrarySource).toContain("maps to multiple local bin assets");
    expect(assetLibrarySource).not.toContain("const asset = sortingBinAssetCatalog.find((entry)");
    expect(readSource("tests/studio-asset-library.test.tsx")).toContain("rejects ambiguous sorting bin aliases instead of using catalog order");
    expect(assetLibrarySource).toContain("setReplacement(replacements, `${namespace}:${token}`, sprite);");
    expect(assetLibrarySource).toContain("setReplacement(replacements, `${source.namespace}:${token}`, sprite);");
    expect(assetLibrarySource).not.toContain("setReplacement(replacements, token, sprite);");
    expect(assetLibrarySource).not.toContain("setReplacement(replacements, pairKey, sprite);");
    expect(assetLibrarySource).toContain("const exactMatches = candidates.filter((sprite) => normalized === sprite.id);");
    expect(assetLibrarySource).toContain("maps to multiple local sprites");
    expect(assetLibrarySource).toContain("const ordinalMatches = candidates.filter((sprite) => ordinal !== undefined && ordinalForIdentifier(sprite.id) === ordinal);");
    expect(assetLibrarySource).toContain("maps to multiple ordinal local sprites");
    expect(assetLibrarySource).not.toContain("const exact = candidates.find((sprite) => normalized === sprite.id)");
    expect(assetLibrarySource).not.toContain("const ordinalMatch = candidates.find((sprite) => ordinal !== undefined && ordinalForIdentifier(sprite.id) === ordinal)");
    expect(assetLibrarySource).not.toContain("return matches[0]");
    expect(assetLibrarySource).not.toContain("return uniqueSprites[0]");
    expect(readSource("tests/studio-asset-library.test.tsx")).toContain("rejects item replacements that resolve to multiple ordinal local sprites");
    expect(liveGameSource).toContain("replacements.get(`card:${card.id}`)");
    expect(liveGameSource).toContain("return replacements?.get(`${namespace}:${token}`);");
    expect(liveGameSource).not.toContain("replacements.get(card.id)");
    expect(liveGameSource).not.toContain("replacements?.get(token)");
    expect(assetLibrarySource).not.toContain('component.renderCapability === "component:reveal-card-grid"');
    expect(assetLibrarySource).not.toContain('component.renderCapability === "component:sort-bins"');
    expect(assetLibrarySource).not.toContain('component.renderCapability === "component:choice-grid"');
    expect(assetLibrarySource).not.toContain('component.renderCapability === "component:sequence-pad"');
  });

  it("keeps live and asset token readers from stringifying malformed JSON props", () => {
    const tokenReaders = [
      readSource("apps/studio/src/live-game.tsx"),
      readSource("apps/studio/src/asset-library.ts"),
      readSource("packages/builder/src/index.ts"),
      readSource("packages/packs/src/index.ts")
    ].join("\n");
    const studioTestSource = readSource("tests/studio-ui.test.ts");

    expect(tokenReaders).toContain('value.filter((entry): entry is string => typeof entry === "string")');
    expect(tokenReaders).toContain('entry.filter((item): item is string => typeof item === "string")');
    expect(tokenReaders).toContain("live game prop ${key} must be an authored string array");
    expect(tokenReaders).toContain("live game prop ${key} contains non-string entries");
    expect(tokenReaders).toContain("live game prop ${key} must be an authored string matrix");
    expect(tokenReaders).toContain("live game prop ${key} contains non-array rows");
    expect(tokenReaders).toContain("live game prop ${key} must be an authored string record");
    expect(tokenReaders).toContain("live game prop ${key} contains non-string values");
    expect(tokenReaders).not.toContain('typeof entry === "string" ? entry : JSON.stringify(entry)');
    expect(tokenReaders).not.toContain('typeof item === "string" ? item : JSON.stringify(item)');
    expect(studioTestSource).toContain("rejects non-string live game token entries instead of filtering JSON labels");
    expect(studioTestSource).toContain("rejects non-string sorting bins instead of filtering malformed live props");
    expect(studioTestSource).toContain("rejects non-string sequence round entries instead of filtering malformed live props");
    expect(readSource("packages/builder/test/session-service.test.ts")).toContain("json-round");
  });

  it("keeps trusted rendering component-id concrete without capability fallback dispatch", () => {
    const contractSource = readSource("packages/contracts/src/index.ts");
    const coreSource = readSource("packages/core/src/index.ts");
    const rendererSource = readSource("packages/renderer/src/index.tsx");
    const previewSource = readSource("apps/studio/src/trusted-preview.tsx");

    expect(contractSource).toContain("componentId: StableIdSchema");
    expect(contractSource).toContain("componentVersion: VersionSchema");
    expect(contractSource).toContain("componentCapability: CapabilityTagSchema");
    expect(contractSource).not.toContain("componentId: StableIdSchema.optional()");
    expect(contractSource).not.toContain("componentVersion: VersionSchema.optional()");
    expect(contractSource).not.toContain("componentCapability: CapabilityTagSchema.optional()");
    expect(contractSource).not.toContain("componentId or componentCapability is required");
    expect(rendererSource).toContain("keyFor(request.componentId, request.componentVersion)");
    expect(rendererSource).toContain("entry.manifest.renderCapability !== request.componentCapability");
    expect(rendererSource).toContain("function duplicateGeneratedAssetIds");
    expect(rendererSource).toContain("duplicate generated asset ids");
    expect(previewSource).toContain("manifests.filter((candidate) => candidate.id === request.componentId && candidate.version === request.componentVersion)");
    expect(previewSource).toContain("has multiple registered entries");
    expect(previewSource).not.toContain("manifests.find((candidate)");
    expect(rendererSource).toContain("const duplicateAssetIds = duplicateGeneratedAssetIds(assetsParsed);");
    expect(readSource("packages/renderer/test/trusted-renderer.test.tsx")).toContain("rejects duplicate generated asset ids instead of binding asset order");
    expect(rendererSource).toContain("unknown asset bindings for ${manifest.id}");
    expect(rendererSource).toContain("const unknownBindings = Object.keys(request.assetBindings).filter");
    expect(readSource("packages/renderer/test/trusted-renderer.test.tsx")).toContain("rejects unknown asset bindings instead of ignoring extra profile data");
    expect(coreSource).toContain("unknown_asset_binding");
    expect(coreSource).toContain("const unknownAssetBindings = Object.keys(component.assetBindings).filter");
    expect(readSource("packages/core/test/replay.test.ts")).toContain("fails closed when saved component asset bindings include unknown manifest bindings");
    expect(rendererSource).not.toContain("entry.manifest.id === request.componentId");
    expect(rendererSource).not.toContain("entry.manifest.renderCapability === request.componentCapability");
    expect(previewSource).toContain("candidate.id === request.componentId && candidate.version === request.componentVersion");
    expect(previewSource).toContain("function requiredTrustedManifestForRenderRequest");
    expect(previewSource).toContain("trusted preview manifest ${request.componentId}@${request.componentVersion} is not registered");
    expect(previewSource).toContain("const emittedToolNames = manifest.emittedTools.map((tool) => tool.toolName)");
    expect(previewSource).not.toContain("manifest?.emittedTools");
    expect(previewSource).not.toContain("request.componentCapability ??");
    expect(previewSource).not.toContain("manifest?.renderCapability");
    expect(previewSource).not.toContain("candidate.renderCapability === request.componentCapability");
    expect(previewSource).not.toContain("request.componentCapability).");
  });

  it("keeps replay render request tool metadata fail-closed on component manifests", () => {
    const coreSource = readSource("packages/core/src/index.ts");
    const replayTestSource = readSource("packages/core/test/replay.test.ts");

    expect(coreSource).toContain("function requiredReplayComponentManifest");
    expect(coreSource).toContain("saved profile ${profile.id} cannot replay missing component manifest ${componentId}@${version}");
    expect(coreSource).toContain("expectedEmittedEvents: manifest.emittedTools.map");
    expect(coreSource).not.toContain("expectedEmittedEvents: manifest?.emittedTools.map");
    expect(coreSource).not.toContain("expectedEmittedEvents: manifest?.emittedTools.map((toolDefinition) => toolDefinition.toolName) ?? []");
    expect(replayTestSource).toContain("fails closed when replay cannot load a component manifest for emitted tool metadata");
  });

  it("keeps Studio trusted component interaction summaries replay-owned", () => {
    const appSource = readSource("apps/studio/src/studio-app.tsx");
    const previewSource = readSource("apps/studio/src/trusted-preview.tsx");

    expect(previewSource).toContain("interactionSummaryFor");
    expect(previewSource).toContain("expectedEmittedEvents.join");
    expect(appSource).toContain("component.interactionSummary");
    expect(appSource).not.toContain('"display-only"');
    expect(appSource).not.toContain("component.emittedToolNames.length > 0 ? component.emittedToolNames.join");
  });

  it("blocks generated runtime code execution in renderer, builder, and studio", () => {
    const source = [
      readSource("packages/renderer/src/index.tsx"),
      readSource("packages/builder/src/index.ts"),
      readSource("packages/service/src/index.ts"),
      readSource("apps/studio/src/local-client.ts"),
      readSource("apps/studio/src/live-game.tsx"),
      readSource("apps/studio/src/studio-app.tsx"),
      readSource("apps/studio/src/trusted-preview.tsx"),
      readSource("apps/studio/src/App.tsx"),
      readSource("apps/studio/src/main.tsx")
    ].join("\n");

    expect(source).not.toMatch(/eval\s*\(|new\s+Function|dangerouslySetInnerHTML/u);
  });

  it("keeps builder and studio free of third-party runtime, auth, db, and native-shell dependencies", () => {
    const source = [
      readSource("packages/builder/package.json"),
      readSource("packages/builder/src/index.ts"),
      readSource("packages/service/package.json"),
      readSource("packages/service/src/cli.ts"),
      readSource("packages/service/src/http-server.ts"),
      readSource("packages/service/src/index.ts"),
      readSource("apps/studio/package.json"),
      readSource("apps/studio/src/local-client.ts"),
      readSource("apps/studio/src/live-game.tsx"),
      readSource("apps/studio/src/studio-app.tsx"),
      readSource("apps/studio/src/trusted-preview.tsx"),
      readSource("apps/studio/src/App.tsx"),
      readSource("apps/studio/src/main.tsx"),
      readSource("apps/mobile-shell/package.json"),
      readSource("apps/mobile-shell/src/mobile-client.ts"),
      readSource("apps/mobile-shell/src/App.tsx"),
      readSource("apps/mobile-shell/src/main.tsx")
    ].join("\n");

    expect(source).not.toMatch(/openai|@ai-sdk|Prisma|NextAuth|next\/server|sqlite|postgres|mysql|mongodb|supabase|firebase|Ta[v]us|ta[v]us/u);
  });
});
