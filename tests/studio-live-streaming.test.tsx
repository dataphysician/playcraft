import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup } from "@testing-library/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createLocalStudioClient } from "../apps/studio/src/local-client.js";
import { LiveGame } from "../apps/studio/src/live-game.js";

afterEach(() => cleanup());

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

function timelineEntry(overrides: Partial<StudioTimelineEntry> = {}): StudioTimelineEntry {
  return {
    id: "timeline.0001",
    kind: "lifecycle",
    title: "RunStarted",
    detail: "",
    timestamp: "",
    profileId: "profile.test",
    rawEvent: { type: "RunStarted" },
    ...overrides
  };
}

describe("studio live streaming", () => {
  it("frames update progress text", async () => {
    const profile = createMemoryProfile();
    const runStarted = timelineEntry({ id: "timeline.0001", title: "RunStarted", kind: "lifecycle", rawEvent: { type: "RunStarted" } });
    const toolCall = timelineEntry({ id: "timeline.0002", kind: "tool", title: "ToolCall", rawEvent: { type: "ToolCall" } });
    const runFinished = timelineEntry({ id: "timeline.0003", title: "RunFinished", kind: "lifecycle", rawEvent: { type: "RunFinished" } });

    const { rerender } = render(
      React.createElement(LiveGame, {
        profile,
        timeline: [runStarted],
        activeProfileId: profile.id
      })
    );

    await waitFor(() => expect(screen.getByText("Assembling...")).toBeDefined());

    rerender(
      React.createElement(LiveGame, {
        profile,
        timeline: [runStarted, toolCall],
        activeProfileId: profile.id
      })
    );

    await waitFor(() => expect(screen.getByText("Generating assets...")).toBeDefined());

    rerender(
      React.createElement(LiveGame, {
        profile,
        timeline: [runStarted, toolCall, runFinished],
        activeProfileId: profile.id
      })
    );

    await waitFor(() => expect(screen.getByText("Ready")).toBeDefined());
  });

  it("profile-swap clears state (no leftover cards/items from previous profile)", async () => {
    const profileA = createMemoryProfile();
    const profileB = createSortingProfile();

    const { rerender } = render(
      React.createElement(LiveGame, {
        profile: profileA,
        activeProfileId: profileA.id
      })
    );

    expect(screen.getAllByRole("button", { name: /dinosaur/ }).length).toBeGreaterThan(0);

    rerender(
      React.createElement(LiveGame, {
        profile: profileB,
        activeProfileId: profileB.id
      })
    );

    expect(screen.getByText("Loading new game...")).toBeDefined();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    expect(screen.queryByRole("button", { name: /dinosaur/ })).toBeNull();
    expect(screen.queryByText("Loading new game...")).toBeNull();
  });

  it("RunError shows friendly error, not raw exception", () => {
    const profile = createMemoryProfile();
    const onRetry = () => {};

    render(
      React.createElement(LiveGame, {
        profile,
        streamError: "Assembly service unavailable. Please try again.",
        onRetry
      })
    );

    const errorSection = screen.getByTestId("live-game-error");
    expect(errorSection).toBeDefined();
    expect(screen.getByText("Assembly service unavailable. Please try again.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();

    expect(errorSection.textContent).not.toContain("Error:");
    expect(errorSection.textContent).not.toContain("at ");
  });
});
