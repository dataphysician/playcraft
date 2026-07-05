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
    expect(coreSource).toContain('entry.kind !== "mechanic" && entry.kind !== "rule-module"');
    expect(registryTestSource).not.toContain('supportedDomains: ["domain.alias"]');
    expect(registryTestSource).not.toContain('supportedAgeBands: ["adult"]');
    expect(registryTestSource).not.toContain('supportedModalities: ["audio"]');
  });

  it("keeps play input modalities separate from audio asset content", () => {
    const contractSource = readSource("packages/contracts/src/index.ts");
    const packSource = readSource("packages/packs/src/index.ts");

    expect(contractSource).toContain('InputModalitySchema = z.enum(["touch", "pointer", "keyboard"])');
    expect(contractSource).toContain('AssetContentTypeSchema = z.enum(["image", "audio", "animation", "text"])');
    expect(contractSource).not.toContain('InputModalitySchema = z.enum(["touch", "pointer", "keyboard", "audio"])');
    expect(packSource).not.toContain("mechanic.sound-matching");
    expect(packSource).not.toContain('supportedModalities: Array<"touch" | "pointer" | "keyboard" | "audio">');
    expect(packSource).not.toContain('["touch", "pointer", "audio"]');
    expect(packSource).not.toContain('["audio", "touch"]');
    expect(packSource).not.toContain("audio:prompted");
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
      "playcraft-agentic-framework/DEV_GUIDE.md"
    ];
    const violations = checkedFiles.flatMap((path) => {
      const source = readSource(path);
      return blockedTerms.some((term) => source.includes(term)) ? [path] : [];
    });

    expect(readSource("packages/contracts/src/index.ts")).toContain('BuilderInputSourceSchema = z.enum(["text", "moonshine-transcript"])');
    expect(readSource("packages/contracts/src/index.ts")).toContain("moonshineTranscript: MoonshineTranscriptRecordSchema.optional()");
    expect(readSource("packages/contracts/src/index.ts")).toContain("defaultSource: BuilderInputSourceSchema");
    expect(readSource("packages/service/src/index.ts")).toContain("LOCAL_SERVICE_INPUT_POLICY");
    expect(readSource("packages/service/src/index.ts")).not.toContain('input.source ?? "text"');
    expect(readSource("packages/service/src/index.ts")).not.toContain('request.source ?? "text"');
    expect(readSource("packages/service/src/cli.ts")).not.toContain('args.source ?? "text"');
    expect(readSource("apps/studio/src/local-client.ts")).not.toContain('input.source ?? "text"');
    expect(readSource("apps/studio/src/local-client.ts")).not.toContain('moonshineTranscript ? "moonshine-transcript"');
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
    expect(studioSource).toContain("selectedInputOption?.generatePlaceholder");
    expect(studioSource).toContain("selectedInputOption?.updatePlaceholder");
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
    expect(cliSource).toContain("catalog.assetEdit.availableThemes.map((entry) => entry.displayLabel)");
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
    const contractSource = readSource("packages/contracts/src/index.ts");

    expect(contractSource).toContain("argumentSummary: z.string()");
    expect(builderSource).toContain("builderToolArgumentSummary");
    expect(builderSource).toContain("BUILDER_ARGUMENT_SUMMARY_LABELS");
    expect(builderSource).not.toContain("BUILDER_TOOL_PRESENTATION_POLICY");
    expect(builderSource).not.toContain("BuilderToolPresentationSchema");
    expect(builderSource).not.toContain("BuilderToolPresentation");
    expect(builderSource).not.toContain("argumentsPrefix");
    expect(builderSource).not.toContain("noArgumentsLabel");
    expect(builderCliSource).toContain("writeCatalogSummary(handler.listTools(), handler.listTemplates(), io)");
    expect(builderCliSource).toContain("tool.displayName");
    expect(builderCliSource).toContain("tool.argumentSummary");
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
    const appSource = readSource("apps/studio/src/studio-app.tsx");
    const typesSource = readSource("apps/studio/src/types.ts");

    expect(source).toContain("response did not include session snapshot");
    expect(source).toContain("response.session.activeProfileId");
    expect(source).toContain("activeProfile: response.session.profile");
    expect(typesSource).toContain("activeProfile?: GameAssemblyProfile");
    expect(appSource).toContain("const activeProfile = session?.activeProfile");
    expect(source).not.toContain("response.session?.activeProfileId");
    expect(source).not.toContain("response.execution.result.profile?.id");
    expect(source).not.toContain("const profiles");
    expect(source).not.toContain("profiles: Array.from");
    expect(source).not.toContain("profiles.clear()");
    expect(typesSource).not.toContain("profiles: GameAssemblyProfile[]");
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
    const serviceSource = readSource("packages/service/src/index.ts");
    const studioAssetLibrarySource = readSource("apps/studio/src/asset-library.ts");

    expect(builderSource).toContain("localAssetEditCatalog");
    expect(builderSource).toContain("assetEditCatalogEntryFor");
    expect(builderSource).toContain("catalogEntry?.suggestedItems");
    expect(builderSource).not.toContain("defaultItemsForTheme");
    expect(serviceSource).toContain('from "@playcraft/assets"');
    expect(studioAssetLibrarySource).toContain('from "@playcraft/assets"');
    expect(studioAssetLibrarySource).toContain("request.metadata.assetEditTheme");
    expect(studioAssetLibrarySource).toContain("request.metadata.assetEditItems");
    expect(studioAssetLibrarySource).not.toContain("values.add(request.prompt)");
    expect(studioAssetLibrarySource).not.toContain("Object.values(component.props)");
    expect(studioAssetLibrarySource).not.toContain("const aliases: Record");
    expect(studioAssetLibrarySource).not.toContain('dolphins: ["dolphin"');
  });

  it("keeps edit-aware card sprite matching explicit for paired-card IDs", () => {
    const assetLibrarySource = readSource("apps/studio/src/asset-library.ts");

    expect(assetLibrarySource).toContain("function spriteForPairedCardIdentifier");
    expect(assetLibrarySource).toContain("function pairedCardSpriteIdentifier");
    expect(assetLibrarySource).not.toContain("normalized.endsWith");
  });

  it("keeps imported profile template selection tied to assembly request contracts", () => {
    const source = readSource("packages/builder/src/index.ts");

    expect(source).toContain("entry.assemblyRequestId === profile.assemblyRequestId");
    expect(source).not.toContain("profileComponentIds");
    expect(source).not.toContain("requiredComponentIds.every");
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
    const source = readSource("apps/studio/src/trusted-preview.tsx");

    expect(source).toContain("selected trusted preview component");
    expect(source).not.toContain("??\n        replay.renderRequests[0]");
    expect(source).not.toContain("?? replay.renderRequests[0]");
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
  });

  it("keeps builder preview actions free of interaction defaulting", () => {
    const builderSource = readSource("packages/builder/src/index.ts");
    const contractSource = readSource("packages/contracts/src/index.ts");

    expect(builderSource).toContain("preview-action requires an interaction action");
    expect(builderSource).not.toContain('command.interaction?.action ?? "primary"');
    expect(builderSource).toContain("const previewInteraction");
    expect(builderSource).toContain("interaction: previewInteraction");
    expect(builderSource).toContain('allowedValues: ["primary"]');
    expect(contractSource).toContain('action: z.enum(["primary"])');
    expect(contractSource).not.toContain('action: z.enum(["primary"]).default("primary")');
  });

  it("keeps service event serialization schema-first and non-coercive", () => {
    const source = readSource("packages/service/src/index.ts");

    expect(source).toContain("function toJsonValue");
    expect(source).toContain("JsonValueSchema.parse(normalizeJsonValue(value))");
    expect(source).toContain("service event value contains a non-plain object");
    expect(source).not.toContain("JSON.parse(JSON.stringify");
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

    expect(contractSource).toContain("profileExport imports carry asset edits in the export");
    expect(contractSource).toContain("requests require sessionId");
    expect(serviceSource).toContain("function serviceRequestSessionId");
    expect(serviceSource).not.toContain("request.profile ?? profileExport?.profile");
    expect(serviceSource).not.toContain("request.assetEdit ?? profileExport?.assetEdit");
    expect(serviceSource).not.toContain("request.templateId ?? profileExport?.templateId");
    expect(serviceSource).not.toContain("request.sessionId ?? profileExport.sessionId");
  });

  it("keeps session-bound service methods free of default service sessions", () => {
    const serviceSource = readSource("packages/service/src/index.ts");

    expect(serviceSource).toContain("preview(sessionId: string)");
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
    expect(studioClientSource).toContain("serviceEndpointFromStudioRuntimeEnv");
    expect(studioAppSource).toContain("serviceEndpointFromStudioRuntimeEnv(import.meta.env)");
    expect(mobileAppSource).toContain("serviceEndpointFromStudioRuntimeEnv(import.meta.env)");
    expect(studioAppSource).not.toContain("import.meta.env.VITE_PLAYCRAFT_SERVICE_URL");
    expect(mobileAppSource).not.toContain("import.meta.env.VITE_PLAYCRAFT_SERVICE_URL");
  });

  it("keeps Mobile shell client defaults policy-owned", () => {
    const source = readSource("apps/mobile-shell/src/mobile-client.ts");

    expect(source).toContain("MOBILE_SHELL_CLIENT_POLICY");
    expect(source).toContain("MOBILE_SHELL_CLIENT_POLICY.defaultSessionId");
    expect(source).toContain("MOBILE_SHELL_CLIENT_POLICY.defaultTimelineIdPrefix");
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

  it("keeps Studio request tips catalog-owned instead of app-composed", () => {
    const studioSource = readSource("apps/studio/src/studio-app.tsx");
    const contractSource = readSource("packages/contracts/src/index.ts");
    const serviceSource = readSource("packages/service/src/index.ts");

    expect(contractSource).toContain("BuilderCatalogRequestTipsSchema");
    expect(contractSource).toContain("exampleRequest");
    expect(serviceSource).toContain("requestTipsForCatalog");
    expect(serviceSource).toContain("requestTips: requestTipsForCatalog");
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

    expect(source).toContain("isGenericAssetTheme");
    expect(contractSource).toContain("genericThemeTokens");
    expect(assetCatalogSource).toContain("localAssetEditGenericThemeTokens");
    expect(assetCatalogSource).toContain("localAssetEditIntentPatterns");
    expect(source).toContain("localAssetEditGenericThemeTokens");
    expect(source).toContain("localAssetEditIntentPatterns");
    expect(source).not.toContain("GENERIC_ASSET_THEME_TOKENS");
    expect(source).not.toContain('new Set(["asset", "assets"');
    expect(source).not.toContain("matchCatalogAssetTheme");
    expect(source).not.toContain("replace\\\\s+");
    expect(source).not.toMatch(/replace\(\s*\/\\b\(\?:game\|profile\|challenge\|assets/u);
    expect(source).not.toMatch(/replace\(\s*\/\\b\(\?:assets\?\|cards/u);
  });

  it("keeps the default builder template pack-owned", () => {
    const packSource = readSource("packages/packs/src/index.ts");
    const serviceSource = readSource("packages/service/src/index.ts");

    expect(packSource).toContain("DEFAULT_GAME_TEMPLATE_ID");
    expect(serviceSource).toContain("DEFAULT_GAME_TEMPLATE_ID");
    expect(serviceSource).not.toContain("DEFAULT_TEMPLATE_ID");
    expect(serviceSource).not.toContain('BuilderTemplateIdSchema.parse("template.memory-match")');
  });

  it("keeps builder asset prompt wording template-owned instead of component-inferred", () => {
    const builderSource = readSource("packages/builder/src/index.ts");
    const contractSource = readSource("packages/contracts/src/index.ts");
    const packSource = readSource("packages/packs/src/index.ts");

    expect(contractSource).toContain("assetPromptKind");
    expect(contractSource).toContain("GameTemplateAssetEditOperationSchema");
    expect(packSource).toContain("assetPromptKind: template.assetPromptKind");
    expect(packSource).toContain("assetEditOperations: template.assetEditOperations");
    expect(builderSource).toContain("template.assetPromptKind");
    expect(builderSource).toContain("template.assetEditOperations");
    expect(builderSource).not.toContain("hasComponentCapability");
    expect(builderSource).not.toContain("promptForAssetEdit(profile");
    expect(builderSource).not.toContain('case "component:reveal-card-grid"');
    expect(builderSource).not.toContain('case "component:choice-grid"');
    expect(builderSource).not.toContain('case "component:sort-bins"');
    expect(builderSource).not.toContain('case "component:sequence-pad"');
    expect(builderSource).not.toContain('case "component:celebration-overlay"');
    expect(builderSource).not.toContain('case "component:hint-bubble"');
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
    const packSource = readSource("packages/packs/src/index.ts");

    expect(contractSource).toContain("GameTemplateLiveSurfaceSchema");
    expect(packSource).toContain("liveSurface: template.liveSurface");
    expect(liveGameSource).toContain("GameTemplateLiveSurface");
    expect(liveGameSource).toContain("template?.liveSurface");
    expect(liveGameSource).toContain("liveSurface.componentCapabilities.primary");
    expect(liveGameSource).toContain("liveSurface.componentCapabilities.choice");
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
    const packSource = readSource("packages/packs/src/index.ts");

    expect(contractSource).toContain("GameTemplateTokenStyleSchema");
    expect(contractSource).toContain("tokenStyles: z.array(GameTemplateTokenStyleSchema)");
    expect(contractSource).toContain("accent: z.string()");
    expect(packSource).toContain("memoryPairTokenStyles");
    expect(packSource).toContain("toddlerTokenStyles");
    expect(packSource).toContain("tokenStyles: memoryPairTokenStyles");
    expect(packSource).toContain("tokenStyles: toddlerTokenStyles");
    expect(liveGameSource).toContain("GameTemplateTokenStyle");
    expect(liveGameSource).toContain("liveSurface.tokenStyles");
    expect(liveGameSource).not.toContain("tokenColorCatalog");
    expect(liveGameSource).not.toContain("memoryPairPalette");
    expect(liveGameSource).not.toContain('aliases: ["red"]');
    expect(liveGameSource).not.toContain('aliases: ["blue"]');
    expect(liveGameSource).not.toContain('aliases: ["green"]');
    expect(liveGameSource).not.toContain('aliases: ["yellow"]');
  });

  it("keeps Studio library asset replacement sources template-owned", () => {
    const assetLibrarySource = readSource("apps/studio/src/asset-library.ts");
    const contractSource = readSource("packages/contracts/src/index.ts");
    const packSource = readSource("packages/packs/src/index.ts");

    expect(contractSource).toContain("GameTemplateAssetReplacementSourceSchema");
    expect(packSource).toContain("assetReplacementSources");
    expect(assetLibrarySource).toContain("template.liveSurface.assetReplacementSources");
    expect(assetLibrarySource).toContain("componentForReplacementSource");
    expect(assetLibrarySource).not.toContain('component.renderCapability === "component:reveal-card-grid"');
    expect(assetLibrarySource).not.toContain('component.renderCapability === "component:sort-bins"');
    expect(assetLibrarySource).not.toContain('component.renderCapability === "component:choice-grid"');
    expect(assetLibrarySource).not.toContain('component.renderCapability === "component:sequence-pad"');
  });

  it("keeps trusted rendering component-id concrete without capability fallback dispatch", () => {
    const contractSource = readSource("packages/contracts/src/index.ts");
    const rendererSource = readSource("packages/renderer/src/index.tsx");
    const previewSource = readSource("apps/studio/src/trusted-preview.tsx");

    expect(contractSource).toContain("componentId: StableIdSchema");
    expect(contractSource).toContain("componentCapability: CapabilityTagSchema");
    expect(contractSource).not.toContain("componentId: StableIdSchema.optional()");
    expect(contractSource).not.toContain("componentCapability: CapabilityTagSchema.optional()");
    expect(contractSource).not.toContain("componentId or componentCapability is required");
    expect(rendererSource).toContain("entry.manifest.id === request.componentId");
    expect(rendererSource).toContain("entry.manifest.renderCapability !== request.componentCapability");
    expect(rendererSource).not.toContain("entry.manifest.renderCapability === request.componentCapability");
    expect(previewSource).toContain("candidate.id === request.componentId");
    expect(previewSource).not.toContain("request.componentCapability ??");
    expect(previewSource).not.toContain("manifest?.renderCapability");
    expect(previewSource).not.toContain("candidate.renderCapability === request.componentCapability");
    expect(previewSource).not.toContain("request.componentCapability).");
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
