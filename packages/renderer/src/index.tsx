import React from "react";
import {
  ComponentManifestSchema,
  ComponentRenderRequestSchema,
  GeneratedAssetRecordSchema,
  type ComponentManifest,
  type ComponentRenderRequest,
  type GeneratedAssetRecord,
  type JsonValue
} from "@playcraft/contracts";

export interface TrustedComponentRuntimeProps {
  props: Record<string, JsonValue>;
  assets: Record<string, GeneratedAssetRecord>;
  emit: (eventName: string, payload: JsonValue) => void;
}

export type TrustedReactComponent = (props: TrustedComponentRuntimeProps) => React.ReactElement;

export interface TrustedRenderSuccess {
  ok: true;
  manifest: ComponentManifest;
  element: React.ReactElement;
}

export interface TrustedRenderFailure {
  ok: false;
  error: {
    code:
      | "invalid-request"
      | "unknown-component"
      | "unsupported-capability"
      | "invalid-props"
      | "missing-asset"
      | "unsafe-input";
    message: string;
  };
}

export type TrustedRenderResult = TrustedRenderSuccess | TrustedRenderFailure;

export class TrustedComponentRegistry {
  private readonly components = new Map<string, { manifest: ComponentManifest; component: TrustedReactComponent }>();

  register(manifestInput: ComponentManifest, component: TrustedReactComponent): this {
    const manifest = ComponentManifestSchema.parse(manifestInput);
    this.components.set(keyFor(manifest.id, manifest.version), { manifest, component });
    return this;
  }

  manifests(): ComponentManifest[] {
    return [...this.components.values()].map((entry) => entry.manifest);
  }

  render(
    requestInput: unknown,
    assetRecords: GeneratedAssetRecord[],
    emit: (eventName: string, payload: JsonValue) => void = () => undefined
  ): TrustedRenderResult {
    const requestParsed = ComponentRenderRequestSchema.safeParse(requestInput);
    if (!requestParsed.success) {
      return failure("invalid-request", requestParsed.error.issues.map((issue) => issue.message).join("; "));
    }

    const request = requestParsed.data;
    const unsafeReason = findUnsafeInput(request.props);
    if (unsafeReason) {
      return failure("unsafe-input", unsafeReason);
    }

    const entry = this.findEntry(request);
    if (!entry) {
      return failure("unknown-component", "no registered trusted component matched the request");
    }

    if (entry.manifest.renderCapability !== request.componentCapability) {
      return failure("unsupported-capability", `component ${entry.manifest.id} does not support ${request.componentCapability}`);
    }

    const propsErrors = validateProps(entry.manifest, request.props);
    if (propsErrors.length > 0) {
      return failure("invalid-props", propsErrors.join("; "));
    }

    const assetsParsed = assetRecords.map((asset) => GeneratedAssetRecordSchema.parse(asset));
    const boundAssets = bindAssets(entry.manifest, request, assetsParsed);
    if (!boundAssets.ok) {
      return boundAssets;
    }

    return {
      ok: true,
      manifest: entry.manifest,
      element: entry.component({ props: request.props, assets: boundAssets.assets, emit })
    };
  }

  renderOrThrow(
    requestInput: unknown,
    assetRecords: GeneratedAssetRecord[],
    emit?: (eventName: string, payload: JsonValue) => void
  ): React.ReactElement {
    const result = this.render(requestInput, assetRecords, emit);
    if (!result.ok) {
      throw new Error(`${result.error.code}: ${result.error.message}`);
    }

    return result.element;
  }

  private findEntry(request: ComponentRenderRequest): { manifest: ComponentManifest; component: TrustedReactComponent } | undefined {
    return [...this.components.values()].find((entry) => entry.manifest.id === request.componentId);
  }
}

function validateProps(manifest: ComponentManifest, props: Record<string, JsonValue>): string[] {
  const errors: string[] = [];
  const fields = manifest.propsSchema.fields;

  for (const [fieldName, descriptor] of Object.entries(fields)) {
    const value = props[fieldName];
    if (descriptor.required && value === undefined) {
      errors.push(`required prop ${fieldName} is missing`);
      continue;
    }

    if (value === undefined) {
      continue;
    }

    if (!matchesDescriptor(value, descriptor.type)) {
      errors.push(`prop ${fieldName} must be ${descriptor.type}`);
    }

    if (descriptor.type === "array" && descriptor.minItems !== undefined && Array.isArray(value) && value.length < descriptor.minItems) {
      errors.push(`prop ${fieldName} requires at least ${descriptor.minItems} items`);
    }

    if (descriptor.allowedValues && !descriptor.allowedValues.some((allowed) => allowed === value)) {
      errors.push(`prop ${fieldName} is not an allowed value`);
    }
  }

  if (!manifest.propsSchema.allowUnknown) {
    for (const fieldName of Object.keys(props)) {
      if (!fields[fieldName]) {
        errors.push(`unknown prop ${fieldName}`);
      }
    }
  }

  return errors;
}

function matchesDescriptor(value: JsonValue, type: string): boolean {
  if (type === "array") {
    return Array.isArray(value);
  }
  if (type === "object") {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  if (type === "record") {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  return typeof value === type;
}

function bindAssets(
  manifest: ComponentManifest,
  request: ComponentRenderRequest,
  assetRecords: GeneratedAssetRecord[]
): { ok: true; assets: Record<string, GeneratedAssetRecord> } | TrustedRenderFailure {
  const byId = new Map(assetRecords.map((asset) => [asset.assetId, asset]));
  const assets: Record<string, GeneratedAssetRecord> = {};

  for (const requirement of manifest.requiredAssets) {
    const assetId = request.assetBindings[requirement.binding];
    if (!assetId) {
      if (requirement.required) {
        return failure("missing-asset", `missing asset binding ${requirement.binding}`);
      }
      continue;
    }

    const asset = byId.get(assetId);
    if (!asset) {
      return failure("missing-asset", `asset ${assetId} is not present in the saved profile`);
    }

    if (!requirement.contentTypes.includes(asset.contentType)) {
      return failure("missing-asset", `asset ${assetId} has unsupported content type ${asset.contentType}`);
    }

    assets[requirement.binding] = asset;
  }

  return { ok: true, assets };
}

function findUnsafeInput(value: JsonValue): string | null {
  if (typeof value === "string") {
    const unsafePattern = /<\s*script|function\s+\w|\([^)]*\)\s*=>|\bimport\s*\(|\brequire\s*\(|\beval\s*\(/iu;
    return unsafePattern.test(value) ? "props contain executable-looking input" : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const reason = findUnsafeInput(item);
      if (reason) {
        return reason;
      }
    }
  }

  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (/source.?code|runtime.?code|component.?code/iu.test(key)) {
        return `prop key ${key} is not accepted`;
      }
      const reason = findUnsafeInput(item);
      if (reason) {
        return reason;
      }
    }
  }

  return null;
}

function keyFor(id: string, version: string): string {
  return `${id}@${version}`;
}

function failure(code: TrustedRenderFailure["error"]["code"], message: string): TrustedRenderFailure {
  return { ok: false, error: { code, message } };
}
