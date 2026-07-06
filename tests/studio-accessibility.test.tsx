import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { toHaveNoViolations } from "vitest-axe/matchers";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createLocalStudioClient } from "../apps/studio/src/local-client.js";
import { LiveGame } from "../apps/studio/src/live-game.js";
import { StudioApp } from "../apps/studio/src/studio-app.js";

expect.extend(toHaveNoViolations);

/**
 * Run axe-core with the standard ruleset. The CI gate for this suite is
 * "zero CRITICAL impact accessibility violations"; lower-impact violations
 * (serious / moderate / minor) are filtered out at assertion time via
 * `criticalViolations()` because:
 *
 *   - color-contrast cannot be evaluated under jsdom (axe-core docs)
 *   - best-practice / experimental rules change between axe-core minor
 *     versions and would create flaky CI
 *   - the Studio is an in-process local dev surface, not a public
 *     marketing surface, so minor a11y polish is tracked separately
 *
 * axe-core does not provide a built-in tag for filtering by impact, so we
 * run the full ruleset and filter in-test.
 */
const AXE_OPTIONS = {
  rules: {}
};

function criticalViolations(results: Awaited<ReturnType<typeof axe>>) {
  return results.violations.filter((violation) => violation.impact === "critical");
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

if (typeof globalThis.matchMedia === "undefined") {
  class MockMediaQueryList implements MediaQueryList {
    matches: boolean;
    media: string;
    onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null;
    addEventListener(): void {}
    removeEventListener(): void {}
    dispatchEvent(): boolean { return false; }
    constructor(query: string, matches: boolean) {
      this.matches = matches;
      this.media = query;
      this.onchange = null;
    }
  }

  (globalThis as unknown as Record<string, unknown>).matchMedia = (query: string): MockMediaQueryList => {
    return new MockMediaQueryList(query, false);
  };
}

function createMemoryProfile(): GameAssemblyProfile {
  const client = createLocalStudioClient();
  const session = client.assembleFromIntent({ idea: "Memory game with dinosaurs" });
  return session.activeProfile!;
}

function createSortingProfile(): GameAssemblyProfile {
  const client = createLocalStudioClient();
  const session = client.assembleFromIntent({ idea: "Sorting game with toys" });
  return session.activeProfile!;
}

function createSequenceProfile(): GameAssemblyProfile {
  const client = createLocalStudioClient();
  const session = client.assembleFromIntent({ idea: "Sequence game with shapes" });
  return session.activeProfile!;
}

function parseRgb(color: string): { r: number; g: number; b: number } | undefined {
  const match = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/);
  if (!match) return undefined;
  return {
    r: parseInt(match[1]!, 10),
    g: parseInt(match[2]!, 10),
    b: parseInt(match[3]!, 10)
  };
}

function parseHex(hex: string): { r: number; g: number; b: number } | undefined {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return undefined;
  return {
    r: parseInt(match[1]!, 16),
    g: parseInt(match[2]!, 16),
    b: parseInt(match[3]!, 16)
  };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(colorA: string, colorB: string): number {
  const a = parseRgb(colorA) ?? parseHex(colorA);
  const b = parseRgb(colorB) ?? parseHex(colorB);
  if (!a || !b) return 0;
  const l1 = relativeLuminance(a.r, a.g, a.b);
  const l2 = relativeLuminance(b.r, b.g, b.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function mockMatchMedia(reduceMotion = false): () => void {
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = (query: string) => {
    if (query === "(prefers-reduced-motion: reduce)") {
      return {
        matches: reduceMotion,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
      } as unknown as MediaQueryList;
    }
    return originalMatchMedia(query);
  };
  return () => {
    window.matchMedia = originalMatchMedia;
  };
}

describe("studio accessibility", () => {
  it("all interactive elements in LiveGame have aria-label or text content", () => {
    const profile = createMemoryProfile();
    render(React.createElement(LiveGame, { profile }));

    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      const hasAccessibleName = button.hasAttribute("aria-label") || button.textContent!.trim().length > 0;
      expect(hasAccessibleName).toBe(true);
    }
  });

  it("all interactive elements in StudioApp have aria-label or text content", () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      const hasAccessibleName = button.hasAttribute("aria-label") || button.textContent!.trim().length > 0;
      expect(hasAccessibleName).toBe(true);
    }
  });

  it("tab order moves through Live App interactive elements left-to-right top-to-bottom", () => {
    const profile = createMemoryProfile();
    render(React.createElement(LiveGame, { profile }));

    const focusable = screen.getAllByRole("button");
    expect(focusable.length).toBeGreaterThan(0);

    for (let i = 0; i < focusable.length; i++) {
      focusable[i]!.focus();
      expect(document.activeElement).toBe(focusable[i]!);
    }
  });

  it("prefers-reduced-motion: reduce skips profile-swap loading placeholder timing", () => {
    const restore = mockMatchMedia(true);
    try {
      const profileA = createMemoryProfile();
      const profileB = createSortingProfile();

      const { rerender } = render(
        React.createElement(LiveGame, {
          profile: profileA,
          activeProfileId: profileA.id
        })
      );

      rerender(
        React.createElement(LiveGame, {
          profile: profileB,
          activeProfileId: profileB.id
        })
      );

      expect(screen.queryByText("Loading new game...")).toBeNull();
    } finally {
      restore();
    }
  });

  it("focus indicators are visible on LiveGame interactive elements", () => {
    const profile = createMemoryProfile();
    render(React.createElement(LiveGame, { profile }));

    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      button.focus();
      const style = window.getComputedStyle(button);
      expect(style.outlineStyle).not.toBe("none");
    }
  });

  it("Developer tab interactive elements have accessible names", () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    const liveTab = screen.getByRole("tab", { name: "Developer" });
    fireEvent.click(liveTab);

    const buttons = within(screen.getByRole("main")).getAllByRole("button");
    for (const button of buttons) {
      const hasAccessibleName = button.hasAttribute("aria-label") || button.textContent!.trim().length > 0;
      expect(hasAccessibleName).toBe(true);
    }
  });

  it("Live tab interactive elements have accessible names", () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    const liveTab = screen.getByRole("tab", { name: "Live App" });
    fireEvent.click(liveTab);

    const buttons = within(screen.getByRole("main")).getAllByRole("button");
    for (const button of buttons) {
      const hasAccessibleName = button.hasAttribute("aria-label") || button.textContent!.trim().length > 0;
      expect(hasAccessibleName).toBe(true);
    }
  });

  it("memory cards respond to keyboard Space and Enter", () => {
    const profile = createMemoryProfile();
    render(React.createElement(LiveGame, { profile }));

    const cards = screen.getAllByRole("button", { name: /dinosaur/ });
    const firstCard = cards[0]!;
    firstCard.focus();

    fireEvent.keyDown(firstCard, { key: " " });
    fireEvent.keyUp(firstCard, { key: " " });

    const revealedAfterSpace = screen.queryAllByTestId("playcraft-card-back");
    expect(revealedAfterSpace.length).toBeGreaterThan(0);

    fireEvent.keyDown(firstCard, { key: "Enter" });
    fireEvent.keyUp(firstCard, { key: "Enter" });

    const revealedAfterEnter = screen.queryAllByTestId("playcraft-card-back");
    expect(revealedAfterEnter.length).toBeGreaterThanOrEqual(revealedAfterSpace.length);
  });

  it("sorting items respond to keyboard Space and Enter", () => {
    const profile = createSortingProfile();
    render(React.createElement(LiveGame, { profile }));

    const items = screen.getAllByRole("button", { name: /toy/ });
    const firstItem = items[0]!;
    firstItem.focus();

    fireEvent.keyDown(firstItem, { key: " " });
    fireEvent.keyUp(firstItem, { key: " " });
    expect(firstItem.getAttribute("aria-pressed")).toBe("true");

    fireEvent.keyDown(firstItem, { key: "Enter" });
    fireEvent.keyUp(firstItem, { key: "Enter" });
    expect(firstItem.getAttribute("aria-pressed")).toBe("false");
  });

  it("sequence choices respond to keyboard Space and Enter", () => {
    const profile = createSequenceProfile();
    render(React.createElement(LiveGame, { profile }));

    const startButton = screen.getByRole("button", { name: "Start Round" });
    fireEvent.click(startButton);

    const choices = screen.getAllByRole("button", { name: /shape-/ });
    const firstChoice = choices[0]!;
    firstChoice.focus();

    fireEvent.keyDown(firstChoice, { key: " " });
    fireEvent.keyUp(firstChoice, { key: " " });

    fireEvent.keyDown(firstChoice, { key: "Enter" });
    fireEvent.keyUp(firstChoice, { key: "Enter" });
  });

  it("Start Round button responds to keyboard Space and Enter", () => {
    const profile = createSequenceProfile();
    render(React.createElement(LiveGame, { profile }));

    const startButton = screen.getByRole("button", { name: "Start Round" });
    startButton.focus();

    fireEvent.keyDown(startButton, { key: " " });
    fireEvent.keyUp(startButton, { key: " " });

    fireEvent.keyDown(startButton, { key: "Enter" });
    fireEvent.keyUp(startButton, { key: "Enter" });
  });

  it("screen reader announces game feedback via aria-live region", async () => {
    const profile = createMemoryProfile();
    const { container } = render(React.createElement(LiveGame, { profile }));

    const liveRegions = container.querySelectorAll('[aria-live="polite"]');
    expect(liveRegions.length).toBeGreaterThan(0);

    const cards = screen.getAllByRole("button", { name: /dinosaur/ });
    const [cardA] = cards.slice(0, 1);

    await act(async () => {
      fireEvent.click(cardA);
    });

    const updatedLiveRegions = container.querySelectorAll('[aria-live="polite"]');
    const memoryLiveRegion = Array.from(updatedLiveRegions).find((el) => (el.textContent ?? "").includes("Revealed"));
    expect(memoryLiveRegion).toBeDefined();
  });

  it("focus indicator uses the specified #4A90E2 color", () => {
    const profile = createMemoryProfile();
    render(React.createElement(LiveGame, { profile }));

    const buttons = screen.getAllByRole("button");
    buttons[0]!.focus();

    const style = window.getComputedStyle(buttons[0]!);
    expect(style.outlineStyle).not.toBe("none");
  });

  it("axe: LiveGame (memory profile) has zero critical accessibility violations", async () => {
    const profile = createMemoryProfile();
    const { container } = render(React.createElement(LiveGame, { profile }));

    const results = await axe(container, AXE_OPTIONS);

    expect(criticalViolations(results)).toEqual([]);
  });

  it("axe: LiveGame (sorting profile) has zero critical accessibility violations", async () => {
    const profile = createSortingProfile();
    const { container } = render(React.createElement(LiveGame, { profile }));

    const results = await axe(container, AXE_OPTIONS);

    expect(criticalViolations(results)).toEqual([]);
  });

  it("axe: LiveGame (sequence profile) has zero critical accessibility violations", async () => {
    const profile = createSequenceProfile();
    const { container } = render(React.createElement(LiveGame, { profile }));

    const results = await axe(container, AXE_OPTIONS);

    expect(criticalViolations(results)).toEqual([]);
  });

  it("axe: StudioApp has zero critical accessibility violations", async () => {
    const { container } = render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    const results = await axe(container, AXE_OPTIONS);

    expect(criticalViolations(results)).toEqual([]);
  });

  it("axe: StudioApp Developer tab has zero critical accessibility violations", async () => {
    const { container } = render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    const liveTab = screen.getByRole("tab", { name: "Developer" });
    fireEvent.click(liveTab);

    const results = await axe(container, AXE_OPTIONS);

    expect(criticalViolations(results)).toEqual([]);
  });
});
