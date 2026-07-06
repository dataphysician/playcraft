import React from "react";
import type { BuilderCatalog, BuilderInputSource, BuilderInputSourceOption } from "@playcraft/contracts";
import type { PendingCommand } from "../studio-app.js";
import { shellStyles } from "../studio/shell-styles.js";

export function CommandBar({
  commandText,
  catalog,
  inputSource,
  hasSession,
  pending,
  error,
  onChange,
  onInputSourceChange,
  onSubmit,
  onStartOver
}: {
  commandText: string;
  catalog: BuilderCatalog | undefined;
  inputSource: BuilderInputSource;
  hasSession: boolean;
  pending: PendingCommand | null;
  error: string | null;
  onChange: (value: string) => void;
  onInputSourceChange: (value: BuilderInputSource) => void;
  onSubmit: (event?: React.FormEvent<HTMLFormElement>) => void;
  onStartOver: () => void;
}): React.ReactElement {
  const buttonLabel = hasSession ? "Update Game" : "Generate Game";
  const [tipsOpen, setTipsOpen] = React.useState(false);
  const tips = React.useMemo(() => requestTipLines(catalog), [catalog]);
  const inputOptionsResult = React.useMemo(() => inputSourceOptionsForCatalog(catalog), [catalog]);
  const inputOptions = inputOptionsResult.ok ? inputOptionsResult.value : [];
  const selectedInputOption = selectedInputSourceOption(inputOptions, inputSource);
  const placeholder = hasSession ? selectedInputOption?.updatePlaceholder : selectedInputOption?.generatePlaceholder;
  const commandError = error ?? (inputOptionsResult.ok ? null : inputOptionsResult.message);

  return React.createElement(
    "footer",
    { style: shellStyles.commandBar },
    React.createElement(
      "form",
      { onSubmit: (event: React.FormEvent<HTMLFormElement>) => onSubmit(event), style: shellStyles.commandForm },
      React.createElement(
        "span",
        { style: shellStyles.commandLabelGroup },
        React.createElement("label", { htmlFor: "studio-command", style: shellStyles.commandLabel }, "Request"),
        React.createElement(
          "span",
          {
            style: shellStyles.tipAnchor,
            onMouseEnter: () => setTipsOpen(true),
            onMouseLeave: () => setTipsOpen(false),
            onFocus: () => setTipsOpen(true),
            onBlur: () => setTipsOpen(false)
          },
          React.createElement(
            "button",
            {
              type: "button",
              "aria-label": "Request tips",
              "aria-describedby": tipsOpen ? "game-request-tips" : undefined,
              "aria-expanded": tipsOpen,
              onClick: () => setTipsOpen(true),
              style: shellStyles.tipButton
            },
            "i"
          ),
          tipsOpen
            ? React.createElement(
                "div",
                { id: "game-request-tips", role: "tooltip", style: shellStyles.tipPanel },
                ...tips.map((line) => React.createElement("p", { key: line, style: shellStyles.tipLine }, line))
              )
            : null
        )
      ),
      React.createElement("input", {
        id: "studio-command",
        value: commandText,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
        placeholder,
        style: shellStyles.commandInput
      }),
      React.createElement(
        "span",
        { role: "group", "aria-label": "Input source", style: shellStyles.inputSourceGroup },
        ...inputOptions.map((option) => React.createElement(InputSourceButton, {
          key: option.source,
          option,
          selected: inputSource === option.source,
          onSelect: onInputSourceChange
        }))
      ),
      React.createElement(
        "button",
        { type: "submit", className: "command-bar-button", disabled: pending !== null, style: shellStyles.primaryButton },
        pending === "generate" ? "Generating..." : pending === "update" ? "Updating..." : buttonLabel
      ),
      React.createElement(
        "button",
        { type: "button", className: "command-bar-button", onClick: onStartOver, disabled: pending !== null, style: shellStyles.secondaryButton },
        "Start Over"
      )
    ),
    commandError ? React.createElement("div", { role: "alert", style: shellStyles.error }, commandError) : null
  );
}

export function inputSourceOptionsForCatalog(catalog: BuilderCatalog | undefined): { ok: true; value: BuilderInputSourceOption[] } | { ok: false; message: string } {
  const options = catalog?.input.sourceOptions ?? [];
  const seen = new Set<BuilderInputSource>();
  const duplicates = new Set<BuilderInputSource>();

  for (const option of options) {
    if (seen.has(option.source)) {
      duplicates.add(option.source);
      continue;
    }

    seen.add(option.source);
  }

  if (duplicates.size > 0) {
    return {
      ok: false,
      message: `Studio catalog has duplicate input source options: ${[...duplicates].join(", ")}`
    };
  }

  return { ok: true, value: options };
}

export function selectedInputSourceOption(
  options: BuilderInputSourceOption[],
  inputSource: BuilderInputSource
): BuilderInputSourceOption | undefined {
  for (const option of options) {
    if (option.source === inputSource) {
      return option;
    }
  }

  return undefined;
}

export function InputSourceButton({
  option,
  selected,
  onSelect
}: {
  option: BuilderInputSourceOption;
  selected: boolean;
  onSelect: (value: BuilderInputSource) => void;
}): React.ReactElement {
  return React.createElement(
    "button",
    {
      type: "button",
      className: "input-source-button",
      "aria-pressed": selected,
      onClick: () => onSelect(option.source),
      style: selected ? shellStyles.inputSourceButtonActive : shellStyles.inputSourceButton
    },
    option.displayLabel
  );
}

export function requestTipLines(catalog: BuilderCatalog | undefined): string[] {
  if (!catalog) {
    return ["Available games: loading catalog.", "Asset edits: loading catalog.", "Try: loading catalog."];
  }

  return catalog.requestTips.summaryLines;
}
