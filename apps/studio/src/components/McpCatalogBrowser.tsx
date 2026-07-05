import React from "react";
import { createMcpManifest } from "@playcraft/mcp";
import { builderToolDefinitions } from "@playcraft/builder";
import type { BuilderCatalog, JsonValue, McpTool, WorkflowGraph, BuilderServiceActionName } from "@playcraft/contracts";
import type { StudioClient } from "../types.js";
import { ErrorState, LoadingState } from "../states/index.js";

export interface McpCatalogBrowserProps {
  catalog: BuilderCatalog | undefined;
  catalogError: string | null;
  onRetry: () => void;
  client: StudioClient;
  onRunWorkflow?: (graph: WorkflowGraph) => void;
}

export function McpCatalogBrowser({
  catalog,
  catalogError,
  onRetry,
  onRunWorkflow
}: McpCatalogBrowserProps): React.ReactElement {
  const [search, setSearch] = React.useState("");
  const [expandedTool, setExpandedTool] = React.useState<string | undefined>(undefined);
  const [workflowTool, setWorkflowTool] = React.useState<{ name: string; actionName: string; args: Record<string, unknown> } | undefined>(undefined);
  const [workflowArgs, setWorkflowArgs] = React.useState<Record<string, JsonValue>>({});

  const manifest = React.useMemo(() => {
    if (!catalog) return null;
    return createMcpManifest(builderToolDefinitions, catalog.service);
  }, [catalog]);

  const filteredTools = React.useMemo(() => {
    if (!manifest) return [];
    const query = search.toLowerCase().trim();
    if (!query) return manifest.tools;
    return manifest.tools.filter(
      (tool: McpTool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query)
    );
  }, [manifest, search]);

  const templates = React.useMemo(() => {
    if (!catalog) return [];
    const query = search.toLowerCase().trim();
    if (!query) return catalog.templates;
    return catalog.templates.filter(
      (template) =>
        template.displayName.toLowerCase().includes(query) ||
        template.id.toLowerCase().includes(query)
    );
  }, [catalog, search]);

  const serviceActions = React.useMemo(() => {
    if (!catalog) return [];
    const query = search.toLowerCase().trim();
    if (!query) return catalog.service.actions;
    return catalog.service.actions.filter(
      (action) =>
        action.displayName.toLowerCase().includes(query) ||
        action.actionName.toLowerCase().includes(query)
    );
  }, [catalog, search]);

  function handleRunWith(toolName: string, actionName: string, args: Record<string, JsonValue>) {
    setWorkflowTool({ name: toolName, actionName, args });
    setWorkflowArgs(args);
  }

  function handleWorkflowSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workflowTool) return;

    const nodeId = `node.run.${workflowTool.actionName}`;
    const graph = {
      schemaVersion: "playcraft.v1" as const,
      id: "workflow.run-tool",
      version: "1.0.0" as const,
      kind: "workflow-graph" as const,
      nodes: [
        {
          id: nodeId,
          actionName: workflowTool.actionName as BuilderServiceActionName,
          payload: workflowArgs,
          dependsOn: [],
          parallel: false,
          cascade: true,
          continueOnError: false
        },
        {
          id: "node.get-session",
          actionName: "get-session" as BuilderServiceActionName,
          payload: {},
          dependsOn: [nodeId],
          parallel: false,
          cascade: true,
          continueOnError: false
        }
      ],
      edges: [{ from: nodeId, to: "node.get-session" }],
      startNodeId: nodeId
    };

    onRunWorkflow?.(graph);
    setWorkflowTool(undefined);
    setWorkflowArgs({});
  }

  if (catalogError) {
    return React.createElement(
      "section",
      { "aria-label": "MCP catalog browser", className: "catalog-column", style: shellStyles.catalogPanel },
      React.createElement("h3", null, "MCP Catalog"),
      React.createElement(ErrorState, { message: catalogError, retry: onRetry })
    );
  }

  if (!catalog) {
    return React.createElement(
      "section",
      { "aria-label": "MCP catalog browser", className: "catalog-column", style: shellStyles.catalogPanel },
      React.createElement("h3", null, "MCP Catalog"),
      React.createElement(LoadingState, { label: "Loading catalog." })
    );
  }

  return React.createElement(
    "section",
    { "aria-label": "MCP catalog browser", className: "catalog-column", style: shellStyles.catalogPanel },
    React.createElement("h3", null, "MCP Catalog"),
    React.createElement("style", null, mcpA11yCss),
    React.createElement("input", {
      type: "search",
      placeholder: "Search tools, templates, actions...",
      className: "mcp-catalog-search",
      "aria-label": "Search MCP catalog",
      value: search,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)
    }),
    React.createElement(
      "div",
      { style: shellStyles.catalogGrid },
      React.createElement(
        "section",
        { style: shellStyles.catalogColumn },
        React.createElement("h4", { style: shellStyles.catalogHeading }, "Tools"),
        React.createElement(
          "ol",
          { style: shellStyles.catalogList },
          ...filteredTools.map((tool: McpTool) =>
            React.createElement(
              "li",
              { key: tool.name, style: shellStyles.catalogItem },
              React.createElement(
                "button",
                {
                  type: "button",
                  className: "mcp-catalog-button",
                  "aria-label": `Tool ${tool.name}`,
                  role: "button",
                  onClick: () => setExpandedTool(expandedTool === tool.name ? undefined : tool.name),
                  style: shellStyles.catalogItemButton
                },
                React.createElement("strong", null, tool.name),
                React.createElement("span", { style: shellStyles.catalogMeta }, tool.description)
              ),
              expandedTool === tool.name
                ? React.createElement(
                    "div",
                    { style: shellStyles.catalogItemDetails },
                    React.createElement("p", null, tool.description),
                    React.createElement("pre", { style: shellStyles.catalogItemPre }, JSON.stringify(tool.parameters, null, 2)),
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        className: "mcp-catalog-button",
                        onClick: () => handleRunWith(tool.name, tool.name.replace("tool:", ""), Object.fromEntries(Object.entries(tool.parameters).map(([k, v]) => [k, ""]))),
                        style: shellStyles.catalogItemButton
                      },
                      "Run with..."
                    )
                  )
                : null
            )
          )
        )
      ),
      React.createElement(
        "section",
        { style: shellStyles.catalogColumn },
        React.createElement("h4", { style: shellStyles.catalogHeading }, "Templates"),
        React.createElement(
          "ol",
          { style: shellStyles.catalogList },
          ...templates.map((template) =>
            React.createElement(
              "li",
              { key: template.id, style: shellStyles.catalogItem },
              React.createElement("strong", null, template.displayName),
              React.createElement("span", { style: shellStyles.catalogMeta }, template.id),
              React.createElement("span", { style: shellStyles.catalogMeta }, template.exampleRequest)
            )
          )
        )
      ),
      React.createElement(
        "section",
        { style: shellStyles.catalogColumn },
        React.createElement("h4", { style: shellStyles.catalogHeading }, "Service actions"),
        React.createElement(
          "ol",
          { style: shellStyles.catalogList },
          ...serviceActions.map((action) =>
            React.createElement(
              "li",
              { key: action.actionName, style: shellStyles.catalogItem },
              React.createElement("strong", null, action.displayName),
              React.createElement("span", { style: shellStyles.catalogMeta }, action.actionName)
            )
          )
        )
      )
    ),
    workflowTool
      ? React.createElement(
          "div",
          { style: shellStyles.workflowBuilderOverlay },
          React.createElement("h4", null, `Run ${workflowTool.name}`),
          React.createElement(
            "form",
            { onSubmit: handleWorkflowSubmit },
            React.createElement(
              "label",
              { style: shellStyles.workflowField },
              React.createElement("span", null, "Args (JSON)"),
              React.createElement("textarea", {
                value: JSON.stringify(workflowArgs, null, 2),
                onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => {
                  try {
                    const parsed = JSON.parse(event.target.value);
                    if (isRecord(parsed)) {
                      setWorkflowArgs(parsed);
                    }
                  } catch {
                    void 0;
                  }
                },
                rows: 5,
                style: shellStyles.portabilityTextarea
              })
            ),
            React.createElement(
              "span",
              { style: shellStyles.workflowActions },
              React.createElement(
                "button",
                { type: "submit", className: "mcp-catalog-button", style: shellStyles.primaryButton },
                "Run workflow"
              ),
              React.createElement(
                "button",
                { type: "button", className: "mcp-catalog-button", onClick: () => setWorkflowTool(undefined), style: shellStyles.secondaryButton },
                "Cancel"
              )
            )
          )
        )
      : null
  );
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const mcpA11yCss = `
.mcp-catalog-button:focus-visible,
.mcp-catalog-input:focus-visible {
  outline: 2px solid #4A90E2 !important;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .mcp-catalog-button,
  .mcp-catalog-input {
    transition: none !important;
  }
}
`;

const shellStyles = {
  catalogPanel: {
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    padding: "1rem",
    background: "#ffffff",
    display: "grid",
    gap: "0.75rem"
  },
  catalogGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13rem), 1fr))",
    gap: "0.75rem"
  },
  catalogColumn: {
    display: "grid",
    gap: "0.45rem",
    alignContent: "start"
  },
  catalogHeading: {
    margin: 0,
    fontSize: "0.92rem",
    color: "#3f3f46"
  },
  catalogList: {
    display: "grid",
    gap: "0.4rem",
    listStyle: "none",
    margin: 0,
    padding: 0
  },
  catalogItem: {
    display: "grid",
    gap: "0.2rem",
    minHeight: "4.3rem",
    border: "1px solid #e4e4e7",
    borderRadius: "8px",
    padding: "0.55rem",
    background: "#fafafa",
    color: "#18181b"
  },
  catalogItemButton: {
    background: "transparent",
    border: 0,
    padding: 0,
    textAlign: "left" as const,
    cursor: "pointer",
    display: "grid",
    gap: "0.2rem"
  },
  catalogItemDetails: {
    display: "grid",
    gap: "0.35rem",
    padding: "0.5rem",
    background: "#ffffff",
    borderRadius: "6px",
    border: "1px solid #d4d4d8"
  },
  catalogMeta: {
    fontSize: "0.78rem",
    color: "#52525b",
    overflowWrap: "anywhere" as const
  },
  catalogItemPre: {
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
    fontSize: "0.78rem",
    background: "#f4f4f5",
    padding: "0.5rem",
    borderRadius: "4px"
  },
  workflowBuilderOverlay: {
    border: "1px solid #0f766e",
    borderRadius: "8px",
    padding: "1rem",
    background: "#ecfdf5",
    display: "grid",
    gap: "0.75rem"
  },
  workflowField: {
    display: "grid",
    gap: "0.35rem"
  },
  workflowActions: {
    display: "flex",
    gap: "0.5rem"
  },
  primaryButton: {
    borderRadius: "8px",
    border: 0,
    padding: "0.75rem 1rem",
    background: "#0f766e",
    color: "#ffffff",
    fontWeight: 700,
    whiteSpace: "nowrap" as const
  },
  secondaryButton: {
    borderRadius: "8px",
    border: "1px solid #d97706",
    padding: "0.75rem 1rem",
    background: "#fff7ed",
    color: "#92400e",
    fontWeight: 700,
    whiteSpace: "nowrap" as const
  },
  portabilityTextarea: {
    width: "100%",
    boxSizing: "border-box" as const,
    minHeight: "7rem",
    resize: "vertical" as const,
    border: "1px solid #a1a1aa",
    borderRadius: "8px",
    padding: "0.65rem",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.78rem",
    lineHeight: 1.35,
    color: "#18181b",
    background: "#fafafa"
  }
} satisfies Record<string, React.CSSProperties>;
