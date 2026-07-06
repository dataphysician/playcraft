import {
  BuilderTemplateIdSchema,
  BuilderTemplateNamespaceSchema,
  GameAssemblyProfileSchema,
  type BuilderCommand,
  type BuilderTemplateId,
  type GameAssemblyProfile,
  type GameProfileTemplateSnapshot,
  type GameTemplateDefinition,
  type PlaycraftAssemblyRequest
} from "@playcraft/contracts";
import { gameTemplateDefinitions, mvpAssemblyRequests } from "@playcraft/packs";
import type { BuilderSessionRecord } from "./ownership.js";

const TEMPLATE_BY_ID = new Map(gameTemplateDefinitions.map((template) => [template.id, template]));
const REQUEST_BY_ID = new Map(mvpAssemblyRequests.map((request) => [request.id, request]));

export function requestForTemplate(templateIdInput: BuilderTemplateId): PlaycraftAssemblyRequest {
  const templateId = BuilderTemplateIdSchema.parse(templateIdInput);
  const template = templateForId(templateId);
  const request = REQUEST_BY_ID.get(template.assemblyRequestId);
  if (!request) {
    throw new Error(`template ${templateId} references missing request ${template.assemblyRequestId}`);
  }
  return request;
}

export function templateForId(templateId: BuilderTemplateId): GameTemplateDefinition {
  const template = TEMPLATE_BY_ID.get(templateId);
  if (!template) {
    throw new Error(`unknown game template ${templateId}`);
  }
  return template;
}

export function templateForProfile(profile: GameAssemblyProfile): GameProfileTemplateSnapshot {
  return profile.template;
}

export function customTemplateSnapshotFor(profile: GameAssemblyProfile): GameProfileTemplateSnapshot {
  const parsed = GameAssemblyProfileSchema.parse(profile);
  return parsed.template;
}

export function validateTemplateForImport(profile: GameAssemblyProfile): void {
  const snapshot = profile.template;
  const parsedSnapshotId = BuilderTemplateIdSchema.parse(snapshot.id);

  if (parsedSnapshotId.startsWith("template.custom.")) {
    BuilderTemplateNamespaceSchema.parse(parsedSnapshotId);
    return;
  }

  const bundled = TEMPLATE_BY_ID.get(parsedSnapshotId);
  if (bundled) {
    if (bundled.assemblyRequestId !== profile.assemblyRequestId || bundled.assemblyRequestId !== snapshot.assemblyRequestId) {
      throw new Error(
        `${parsedSnapshotId} collides with bundled template ${bundled.id}; re-imported profiles must reuse the bundled assemblyRequestId ${bundled.assemblyRequestId}`
      );
    }
    return;
  }

  throw new Error(`${parsedSnapshotId} must start with template.custom. to import as a custom template`);
}

export function cloneGameAssemblyProfile(profile: GameAssemblyProfile): GameAssemblyProfile {
  const cloned = structuredClone(profile) as GameAssemblyProfile;
  return GameAssemblyProfileSchema.parse(cloned);
}

export function templateForBuildOrUpdate(
  session: BuilderSessionRecord,
  actionName: Extract<BuilderCommand["actionName"], "assemble-game" | "update-game">,
  templateId: BuilderTemplateId
): GameTemplateDefinition | GameProfileTemplateSnapshot {
  if (actionName === "update-game" && session.profile && session.templateId === templateId) {
    return templateForProfile(session.profile);
  }

  const bundled = TEMPLATE_BY_ID.get(templateId);
  if (bundled) {
    return bundled;
  }

  if (session.profile && session.templateId === templateId) {
    return templateForProfile(session.profile);
  }

  throw new Error(`unknown game template ${templateId}`);
}

export function requireBuildOrUpdateCommand(command: BuilderCommand): BuildOrUpdateCommand {
  if (command.actionName === "assemble-game" || command.actionName === "update-game") {
    return command as BuildOrUpdateCommand;
  }

  throw new Error(`command ${command.actionName} is not a build or update command`);
}

export type BuildOrUpdateCommand = BuilderCommand & {
  actionName: Extract<BuilderCommand["actionName"], "assemble-game" | "update-game">;
};
