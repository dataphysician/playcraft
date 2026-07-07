import { z } from "zod";
import {
  BuilderInputSourceSchema,
  BuilderServiceActionNameSchema
} from "./base.js";
import type {
  BuilderInputSource,
  BuilderServiceActionName,
  BuilderServiceCatalog,
  BuilderServiceCatalogAction,
  BuilderServiceRequestFieldName,
  BuilderToolDefinition
} from "./base.js";

export function validateBuilderToolDefinition(
  value: BuilderToolDefinition,
  context: z.RefinementCtx
): void {
  addDuplicateBuilderInputSourceIssues(context, value.acceptedInputSources, ["acceptedInputSources"]);

  const acceptsInput = builderActionAcceptsInput(value.actionName);
  if (acceptsInput) {
    for (const source of BuilderInputSourceSchema.options) {
      if (!value.acceptedInputSources.includes(source)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `builder input action ${value.actionName} must accept ${source}`,
          path: ["acceptedInputSources"]
        });
      }
    }
  } else if (value.acceptedInputSources.length > 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `builder action ${value.actionName} must not accept text or transcript input`,
      path: ["acceptedInputSources"]
    });
  }

  const expectedSummary = builderToolInputSourceSummaryFor(value.acceptedInputSources);
  if (value.inputSourceSummary !== expectedSummary) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `builder tool input source summary must be ${expectedSummary}`,
      path: ["inputSourceSummary"]
    });
  }
}

export function validateBuilderServiceCatalogAction(
  value: BuilderServiceCatalogAction,
  context: z.RefinementCtx
): void {
  const expectedRequiresSession = serviceActionRequiresSession(value.actionName);
  if (value.requiresSession !== expectedRequiresSession) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `service action ${value.actionName} requiresSession must be ${String(expectedRequiresSession)}`,
      path: ["requiresSession"]
    });
  }

  const expectedAcceptsInput = serviceActionAcceptsInput(value.actionName);
  if (value.acceptsInput !== expectedAcceptsInput) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `service action ${value.actionName} acceptsInput must be ${String(expectedAcceptsInput)}`,
      path: ["acceptsInput"]
    });
  }

  const expectedResponsePayload = serviceActionResponsePayload(value.actionName);
  if (value.responsePayload !== expectedResponsePayload) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `service action ${value.actionName} responsePayload must be ${expectedResponsePayload}`,
      path: ["responsePayload"]
    });
  }

  addDuplicateServiceRequestFieldIssues(context, value.request.acceptedFields, ["request", "acceptedFields"]);
  addDuplicateServiceRequestFieldIssues(context, value.request.requiredFields, ["request", "requiredFields"]);

  for (const field of value.request.requiredFields) {
    if (!value.request.acceptedFields.includes(field)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `required field ${field} must be accepted by service action ${value.actionName}`,
        path: ["request", "requiredFields"]
      });
    }
  }

  for (const group of [
    ...value.request.requiredAnyOf,
    ...value.request.exclusiveAnyOf,
    ...value.request.forbiddenTogether
  ]) {
    addDuplicateServiceRequestFieldIssues(context, group, ["request"]);
    for (const field of group) {
      if (!value.request.acceptedFields.includes(field)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `request group field ${field} must be accepted by service action ${value.actionName}`,
          path: ["request", "acceptedFields"]
        });
      }
    }
  }

  if (expectedRequiresSession && !value.request.requiredFields.includes("sessionId")) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `service action ${value.actionName} must require sessionId`,
      path: ["request", "requiredFields"]
    });
  }

  if (
    !expectedRequiresSession &&
    value.actionName !== "assemble" &&
    value.actionName !== "execute-workflow" &&
    value.request.acceptedFields.includes("sessionId")
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `service action ${value.actionName} must not accept sessionId`,
      path: ["request", "acceptedFields"]
    });
  }

  const inputFields: BuilderServiceRequestFieldName[] = ["text", "source", "moonshineTranscript", "templateId"];
  if (expectedAcceptsInput) {
    for (const field of ["text", "source", "moonshineTranscript"] as const) {
      if (!value.request.acceptedFields.includes(field)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `input service action ${value.actionName} must accept ${field}`,
          path: ["request", "acceptedFields"]
        });
      }
    }
    if (!serviceRequestFieldGroupIncludes(value.request.requiredAnyOf, ["text", "moonshineTranscript"])) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `input service action ${value.actionName} must require text or moonshineTranscript`,
        path: ["request", "requiredAnyOf"]
      });
    }
    if (!serviceRequestFieldGroupIncludes(value.request.exclusiveAnyOf, ["text", "moonshineTranscript"])) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `input service action ${value.actionName} must make text and moonshineTranscript exclusive`,
        path: ["request", "exclusiveAnyOf"]
      });
    }
  } else {
    for (const field of inputFields) {
      if (value.request.acceptedFields.includes(field)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `non-input service action ${value.actionName} must not accept ${field}`,
          path: ["request", "acceptedFields"]
        });
      }
    }
  }
}

export function validateBuilderServiceCatalog(
  value: BuilderServiceCatalog,
  context: z.RefinementCtx
): void {
  const actionNames = value.actions.map((action) => action.actionName);
  addDuplicateServiceActionIssues(context, actionNames, ["actions"]);

  for (const actionName of BuilderServiceActionNameSchema.options) {
    if (!actionNames.includes(actionName)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `service catalog must include action ${actionName}`,
        path: ["actions"]
      });
    }
  }
}

function builderActionAcceptsInput(actionName: BuilderToolDefinition["actionName"]): boolean {
  return actionName === "assemble-game" || actionName === "update-game";
}

function builderToolInputSourceSummaryFor(sources: BuilderInputSource[]): string {
  if (sources.length === 0) {
    return "input: none";
  }

  const labels: Record<BuilderInputSource, string> = {
    text: "Text",
    "moonshine-transcript": "Transcript"
  };
  return `input: ${sources.map((source) => labels[source]).join(", ")}`;
}

export function addDuplicateBuilderInputSourceIssues(
  context: z.RefinementCtx,
  sources: BuilderInputSource[],
  path: Array<string | number>
): void {
  const seen = new Set<BuilderInputSource>();
  const duplicates = new Set<BuilderInputSource>();

  for (const source of sources) {
    if (seen.has(source)) {
      duplicates.add(source);
    }
    seen.add(source);
  }

  for (const duplicate of duplicates) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `catalog input source ${duplicate} must be unique`,
      path
    });
  }
}

function serviceActionRequiresSession(actionName: BuilderServiceActionName): boolean {
  return (
    actionName === "update" ||
    actionName === "preview" ||
    actionName === "get-session" ||
    actionName === "export-profile" ||
    actionName === "import-profile"
  );
}

function serviceActionAcceptsInput(actionName: BuilderServiceActionName): boolean {
  return actionName === "assemble" || actionName === "update";
}

function serviceActionResponsePayload(
  actionName: BuilderServiceActionName
): "catalog" | "execution" | "session" | "profileExport" | "reset" {
  const responsePayloadByAction: Record<
    BuilderServiceActionName,
    "catalog" | "execution" | "session" | "profileExport" | "reset"
  > = {
    assemble: "execution",
    catalog: "catalog",
    "execute-workflow": "execution",
    "export-profile": "profileExport",
    "get-session": "session",
    "import-profile": "execution",
    preview: "execution",
    reset: "reset",
    update: "execution"
  };

  return responsePayloadByAction[actionName];
}

function serviceRequestFieldGroupIncludes(
  groups: Array<BuilderServiceRequestFieldName[]>,
  expectedFields: BuilderServiceRequestFieldName[]
): boolean {
  return groups.some(
    (group) => group.length === expectedFields.length && expectedFields.every((field) => group.includes(field))
  );
}

function addDuplicateServiceRequestFieldIssues(
  context: z.RefinementCtx,
  fields: BuilderServiceRequestFieldName[],
  path: Array<string | number>
): void {
  const seen = new Set<BuilderServiceRequestFieldName>();
  const duplicates = new Set<BuilderServiceRequestFieldName>();

  for (const field of fields) {
    if (seen.has(field)) {
      duplicates.add(field);
    }
    seen.add(field);
  }

  for (const duplicate of duplicates) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `service request field ${duplicate} must be unique`,
      path
    });
  }
}

function addDuplicateServiceActionIssues(
  context: z.RefinementCtx,
  actionNames: BuilderServiceActionName[],
  path: Array<string | number>
): void {
  const seen = new Set<BuilderServiceActionName>();
  const duplicates = new Set<BuilderServiceActionName>();

  for (const actionName of actionNames) {
    if (seen.has(actionName)) {
      duplicates.add(actionName);
    }
    seen.add(actionName);
  }

  for (const duplicate of duplicates) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `service catalog action ${duplicate} must be unique`,
      path
    });
  }
}