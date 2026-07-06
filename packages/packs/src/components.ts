import React from "react";
import {
  ComponentManifestSchema,
  FrontendToolDefinitionSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type ComponentManifest,
  type FrontendToolDefinition,
  type JsonValue
} from "@playcraft/contracts";
import {
  type TrustedComponentRuntimeProps,
  type TrustedReactComponent
} from "@playcraft/renderer";
import { DEFAULT_DOMAIN_ID, DEFAULT_SAFETY_POLICY_ID } from "./mechanics.js";

const textField = { type: "string", required: true } as const;
const optionalTextField = { type: "string", required: false } as const;
const numberField = { type: "number", required: true } as const;
const arrayField = { type: "array", required: true, minItems: 1 } as const;
const recordField = { type: "record", required: true } as const;

const selectItemTool = tool("tool.select-item", "tool:select-item", ["frontend:selected"], {
  itemId: textField
});
const revealCardTool = tool("tool.reveal-card", "tool:reveal-card", ["frontend:revealed"], {
  cardId: textField
});
const moveItemTool = tool("tool.move-item", "tool:move-item", ["frontend:selected"], {
  itemId: textField,
  targetId: textField
});
const repeatSequenceTool = tool("tool.repeat-sequence", "tool:repeat-sequence", ["frontend:selected"], {
  sequence: arrayField
});

export function component(
  id: string,
  displayName: string,
  renderCapability: string,
  supportedMechanicIds: string[],
  emittedTools: FrontendToolDefinition[],
  fields: Record<string, { type: "string" | "number" | "boolean" | "object" | "array" | "record"; required: boolean; minItems?: number }>,
  requiredAssets: Array<{ binding: string; contentTypes: Array<"image" | "audio" | "animation" | "text">; required: boolean }>
): ComponentManifest {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind: "component",
    displayName,
    renderCapability,
    supportedMechanicIds,
    supportedDomains: [DEFAULT_DOMAIN_ID],
    supportedAgeBands: ["2-3", "4-6", "7-9"],
    propsSchema: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      type: "object",
      fields,
      allowUnknown: false
    },
    requiredAssets,
    emittedTools,
    accessibility: {
      labelRequired: true,
      reducedMotionSafe: true,
      keyboardReachable: true
    },
    safetyPolicyIds: [DEFAULT_SAFETY_POLICY_ID],
    replayBehavior: "state-derived"
  };
}

export function tool(
  id: string,
  toolName: string,
  emittedEvents: string[],
  fields: Record<string, { type: "string" | "number" | "boolean" | "object" | "array" | "record"; required: boolean; minItems?: number }>
): FrontendToolDefinition {
  return FrontendToolDefinitionSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind: "frontend-tool",
    toolName,
    description: `Frontend tool ${toolName}`,
    argumentsSchema: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      type: "object",
      fields,
      allowUnknown: false
    },
    emittedEvents
  });
}

export const componentManifests: ComponentManifest[] = [
  component("component.choice-grid", "ChoiceGrid", "component:choice-grid", ["mechanic.tap-to-select", "mechanic.choose-one"], [selectItemTool], { title: textField, items: arrayField, prompt: optionalTextField }, [{ binding: "illustration", contentTypes: ["image"], required: true }]),
  component("component.reveal-card-grid", "RevealCardGrid", "component:reveal-card-grid", ["mechanic.tap-to-reveal", "mechanic.match-pairs"], [revealCardTool], { title: textField, cards: arrayField, pairs: recordField, columns: numberField }, [{ binding: "illustration", contentTypes: ["image"], required: true }]),
  component("component.pair-match-board", "PairMatchBoard", "component:pair-match-board", ["mechanic.match-pairs"], [selectItemTool], { title: textField, pairs: arrayField }, [{ binding: "illustration", contentTypes: ["image"], required: true }]),
  component("component.sort-bins", "SortBins", "component:sort-bins", ["mechanic.sort-into-bins"], [moveItemTool], { title: textField, items: arrayField, bins: arrayField, targets: recordField }, [{ binding: "illustration", contentTypes: ["image"], required: true }]),
  component("component.sequence-pad", "SequencePad", "component:sequence-pad", ["mechanic.sequence-repeat", "mechanic.tap-to-select"], [repeatSequenceTool], { title: textField, sequence: arrayField, rounds: arrayField, prompt: optionalTextField }, [{ binding: "illustration", contentTypes: ["image"], required: true }]),
  component("component.trace-canvas", "TraceCanvas", "component:trace-canvas", ["mechanic.trace-path"], [moveItemTool], { title: textField, path: arrayField }, []),
  component("component.celebration-overlay", "CelebrationOverlay", "component:celebration-overlay", ["mechanic.timed-celebration"], [], { message: textField }, []),
  component("component.hint-bubble", "HintBubble", "component:hint-bubble", ["mechanic.hint-prompt"], [], { hint: textField }, [])
].map((entry) => ComponentManifestSchema.parse(entry));

export function componentForManifest(manifest: ComponentManifest): TrustedReactComponent {
  const displayName = manifest.displayName;
  return ({ props, assets, emit }: TrustedComponentRuntimeProps) => {
    const label = typeof props.title === "string" ? props.title : typeof props.message === "string" ? props.message : displayName;
    const prompt = typeof props.prompt === "string" ? props.prompt : typeof props.hint === "string" ? props.hint : undefined;
    const cards = stringArrayProp(props, "cards");
    const pairs = stringArrayProp(props, "pairs");
    const items = stringArrayProp(props, "items");
    const bins = stringArrayProp(props, "bins");
    const sequence = stringArrayProp(props, "sequence");
    const path = stringArrayProp(props, "path");
    const assetNodes = Object.entries(assets).map(([binding, asset]) =>
      React.createElement("img", {
        key: binding,
        src: asset.uri,
        alt: asset.altText,
        "data-playcraft-asset": binding,
        style: trustedComponentStyles.image
      })
    );

    return React.createElement(
      "section",
      {
        "data-playcraft-component": manifest.id,
        "aria-label": label,
        style: trustedComponentStyles.surface
      },
      React.createElement(
        "div",
        { style: assetNodes.length > 0 ? trustedComponentStyles.header : trustedComponentStyles.headerWithoutAsset },
        ...assetNodes,
        React.createElement(
          "div",
          null,
          React.createElement("h2", { style: trustedComponentStyles.title }, label),
          prompt ? React.createElement("p", { style: trustedComponentStyles.prompt }, prompt) : null
        )
      ),
      renderTrustedControls(manifest, { cards, pairs, items, bins, sequence, path }, emit)
    );
  };
}

function renderTrustedControls(
  manifest: ComponentManifest,
  props: {
    cards: string[];
    pairs: string[];
    items: string[];
    bins: string[];
    sequence: string[];
    path: string[];
  },
  emit: TrustedComponentRuntimeProps["emit"]
): React.ReactElement | null {
  if (props.cards.length > 0) {
    return renderButtonGrid(
      props.cards,
      (cardId) => emitSingleTrustedTool(manifest, emit, { cardId }),
      `${manifest.id}.cards`
    );
  }

  if (props.pairs.length > 0) {
    return renderButtonGrid(
      props.pairs,
      (itemId) => emitSingleTrustedTool(manifest, emit, { itemId }),
      `${manifest.id}.pairs`
    );
  }

  if (props.items.length > 0 && props.bins.length > 0) {
    return React.createElement(
      "div",
      { style: trustedComponentStyles.grid },
      ...props.items.flatMap((itemId) =>
        props.bins.map((targetId) =>
          React.createElement(
            "button",
            {
              key: `${itemId}.${targetId}`,
              type: "button",
              onClick: () => emitSingleTrustedTool(manifest, emit, { itemId, targetId }),
              style: trustedComponentStyles.button
            },
            `${itemId} -> ${targetId}`
          )
        )
      )
    );
  }

  if (props.items.length > 0) {
    return renderButtonGrid(
      props.items,
      (itemId) => emitSingleTrustedTool(manifest, emit, { itemId }),
      `${manifest.id}.items`
    );
  }

  if (props.sequence.length > 0) {
    return React.createElement(
      "div",
      { style: trustedComponentStyles.sequence },
      React.createElement(
        "div",
        { style: trustedComponentStyles.steps },
        ...props.sequence.map((step, index) =>
          React.createElement("span", { key: `${step}.${index}`, style: trustedComponentStyles.step }, step)
        )
      ),
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => emitSingleTrustedTool(manifest, emit, { sequence: props.sequence }),
          style: trustedComponentStyles.button
        },
        "Submit sequence"
      )
    );
  }

  if (props.path.length > 0) {
    return React.createElement(
      "button",
      {
        type: "button",
        onClick: () => emitSingleTrustedTool(manifest, emit, { itemId: "path", targetId: props.path.join(" ") }),
        style: trustedComponentStyles.button
      },
      "Trace path"
    );
  }

  return null;
}

function renderButtonGrid(items: string[], onSelect: (item: string) => void, keyPrefix: string): React.ReactElement {
  return React.createElement(
    "div",
    { style: trustedComponentStyles.grid },
    ...items.map((item) =>
      React.createElement(
        "button",
        {
          key: `${keyPrefix}.${item}`,
          type: "button",
          onClick: () => onSelect(item),
          style: trustedComponentStyles.button
        },
        item
      )
    )
  );
}

function stringArrayProp(props: Record<string, JsonValue>, key: string): string[] {
  const value = props[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function emitSingleTrustedTool(
  manifest: ComponentManifest,
  emit: TrustedComponentRuntimeProps["emit"],
  payload: Record<string, JsonValue>
): void {
  if (manifest.emittedTools.length !== 1) {
    throw new Error(`trusted component ${manifest.id} must declare exactly one emitted tool before it can emit interactions`);
  }

  const tool = manifest.emittedTools.at(0)!;
  emit(tool.toolName, {
    componentId: manifest.id,
    ...payload
  });
}

const trustedComponentStyles = {
  surface: {
    display: "grid",
    gap: "1rem"
  },
  header: {
    display: "grid",
    gridTemplateColumns: "minmax(4rem, 8rem) minmax(0, 1fr)",
    gap: "1rem",
    alignItems: "center"
  },
  headerWithoutAsset: {
    display: "grid",
    gap: "0.5rem"
  },
  image: {
    width: "100%",
    aspectRatio: "1",
    objectFit: "cover" as const,
    borderRadius: "8px",
    border: "1px solid #d4d4d8",
    background: "#f4f4f5"
  },
  title: {
    margin: 0,
    fontSize: "1.25rem"
  },
  prompt: {
    margin: "0.5rem 0 0",
    color: "#52525b"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
    gap: "0.5rem"
  },
  button: {
    minHeight: "3rem",
    borderRadius: "8px",
    border: "1px solid #0f766e",
    background: "#ecfdf5",
    color: "#064e3b",
    fontWeight: 700,
    padding: "0.625rem",
    overflowWrap: "anywhere" as const
  },
  sequence: {
    display: "grid",
    gap: "0.75rem"
  },
  steps: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.5rem"
  },
  step: {
    borderRadius: "8px",
    border: "1px solid #d4d4d8",
    background: "#fafafa",
    padding: "0.5rem 0.75rem"
  }
} satisfies Record<string, React.CSSProperties>;
