import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { assembleMvpProfiles } from "@playcraft/packs";
import { createLocalStudioClient } from "../apps/studio/src/local-client.js";
import { StudioApp } from "../apps/studio/src/studio-app.js";
import { TrustedPreview } from "../apps/studio/src/trusted-preview.js";
import type { StudioClient, StudioSessionSnapshot, StudioTimelineEntry } from "../apps/studio/src/types.js";

const [profileA, profileB] = assembleMvpProfiles();

afterEach(() => cleanup());

function timelineEntry(id: string, title: string, kind: StudioTimelineEntry["kind"], profileId?: string): StudioTimelineEntry {
  return {
    id,
    kind,
    title,
    detail: `${title} detail`,
    timestamp: "2026-06-27T00:00:00.000Z",
    profileId
  };
}

describe("studio UI", () => {
  it("assembles a profile, shows trusted preview metadata, updates it, and records preview interactions", async () => {
    const assembleFromIntent = vi.fn<StudioClient["assembleFromIntent"]>().mockResolvedValue({
      sessionId: "session.demo",
      activeProfileId: profileA.id,
      profiles: [profileA],
      timeline: [
        timelineEntry("timeline.1", "Run started", "lifecycle"),
        timelineEntry("timeline.2", "Profile A assembled", "activity", profileA.id)
      ]
    } satisfies StudioSessionSnapshot);

    const requestChange = vi.fn<StudioClient["requestChange"]>().mockResolvedValue({
      sessionId: "session.demo",
      activeProfileId: profileB.id,
      profiles: [profileA, profileB],
      timeline: [
        timelineEntry("timeline.1", "Run started", "lifecycle"),
        timelineEntry("timeline.2", "Profile A assembled", "activity", profileA.id),
        timelineEntry("timeline.3", "Profile B assembled", "activity", profileB.id)
      ]
    } satisfies StudioSessionSnapshot);

    render(React.createElement(StudioApp, { client: { assembleFromIntent, requestChange } }));

    fireEvent.change(screen.getByLabelText("Game idea"), { target: { value: "Build a memory game for kids" } });
    fireEvent.click(screen.getByRole("button", { name: "Assemble profile" }));

    await waitFor(() => expect(assembleFromIntent).toHaveBeenCalledWith({ idea: "Build a memory game for kids", sessionId: undefined }));
    expect(await screen.findByText(profileA.profileName)).toBeDefined();
    expect(screen.getByText("Validation: valid")).toBeDefined();
    expect(screen.getByRole("button", { name: /component\.reveal-card-grid/u })).toBeDefined();
    expect(screen.getByRole("button", { name: /component\.celebration-overlay/u })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "cat-a" }));
    expect((await screen.findAllByText((text) => text.startsWith("Preview interaction:"))).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole("button", { name: /component\.celebration-overlay/u }));
    expect(await screen.findByText("You found every pair.")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Change request"), { target: { value: "Switch it to a sorting challenge" } });
    fireEvent.click(screen.getByRole("button", { name: "Request update" }));

    await waitFor(() => expect(requestChange).toHaveBeenCalledWith({ changeRequest: "Switch it to a sorting challenge", sessionId: "session.demo" }));
    expect(await screen.findByText(profileB.profileName)).toBeDefined();
    expect(screen.getByRole("button", { name: /component\.sort-bins/u })).toBeDefined();

    fireEvent.click(await screen.findByRole("button", { name: "red circle" }));
    const interactions = await screen.findAllByText((text) => text.startsWith("Preview interaction:"));
    expect(interactions.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps the memory game selected while swapping requested card assets", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Game idea"), { target: { value: "Memory game with dinosaurs" } });
    fireEvent.click(screen.getByRole("button", { name: "Assemble profile" }));

    expect(await screen.findByText("Memory Match MVP")).toBeDefined();
    expect(await screen.findByRole("button", { name: "dinosaur-1-a" })).toBeDefined();
    expect(screen.getByRole("button", { name: "dinosaur-1-b" })).toBeDefined();

    fireEvent.change(screen.getByLabelText("Change request"), { target: { value: "Memory game with toys" } });
    fireEvent.click(screen.getByRole("button", { name: "Request update" }));

    expect(await screen.findByRole("button", { name: "toy-1-a" })).toBeDefined();
    expect(screen.getByRole("button", { name: "toy-1-b" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "dinosaur-1-a" })).toBeNull();
  });

  it("surfaces trusted preview failures instead of suppressing them", () => {
    const invalidProfile = {
      ...profileA,
      components: profileA.components.map((component, index) =>
        index === 0 ? { ...component, componentId: "component.unknown" } : component
      )
    };

    render(React.createElement(TrustedPreview, { profile: invalidProfile }));

    expect(screen.getByTestId("trusted-preview-error").textContent).toContain("invalid-request");
    expect(screen.getByTestId("trusted-preview-error").textContent).toContain("component.unknown");
  });
});
