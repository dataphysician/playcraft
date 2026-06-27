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

function setElementRect(
  element: Element,
  rect: { bottom: number; height: number; left: number; right: number; top: number; width: number }
): void {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      ...rect,
      x: rect.left,
      y: rect.top,
      toJSON: () => rect
    })
  });
}

describe("studio UI", () => {
  it("shows available games and asset edits in the request tips tooltip", () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    expect(screen.queryByText("Generate a game to play it here.")).toBeNull();
    expect(screen.getByRole("img", { name: "Children playing a colorful game together" })).toBeDefined();
    expect(screen.queryByLabelText("Chat history")).toBeNull();
    expect(screen.queryByText("Available games: Memory Match, Sorting, Sequence Repeat.")).toBeNull();

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Request tips" }));

    expect(screen.getByRole("tooltip")).toBeDefined();
    expect(screen.getByText("Available games: Memory Match, Sorting, Sequence Repeat.")).toBeDefined();
    expect(screen.getByText("Asset edits: with dinosaurs, with toys, assets with ocean animals, cards with fruit.")).toBeDefined();
  });

  it("keeps the command bar in the viewport after game generation", async () => {
    const view = render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Memory game with dinosaurs" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    expect(await screen.findByRole("button", { name: "dinosaur-1-a" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Update Game" })).toBeDefined();
    expect(screen.queryByLabelText("Chat history")).toBeNull();
    const appRoot = view.container.querySelector("main");
    expect(appRoot?.getAttribute("style")).toContain("height: 100vh");
    expect(appRoot?.getAttribute("style")).toContain("overflow: hidden");
  });

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

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Build a memory game for kids" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    await waitFor(() => expect(assembleFromIntent).toHaveBeenCalledWith({ idea: "Build a memory game for kids", sessionId: undefined }));
    expect(await screen.findByText(profileA.profileName)).toBeDefined();
    expect(screen.getByRole("button", { name: "cat-a" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "cat-a" }));
    fireEvent.click(screen.getByRole("tab", { name: "Developer" }));
    expect((await screen.findAllByText((text) => text.startsWith("Preview interaction:"))).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Validation: valid")).toBeDefined();
    expect(screen.getByRole("button", { name: /component\.reveal-card-grid/u })).toBeDefined();
    expect(screen.getByRole("button", { name: /component\.celebration-overlay/u })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /component\.celebration-overlay/u }));
    expect(await screen.findByText("You found every pair.")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Switch it to a sorting challenge" } });
    fireEvent.click(screen.getByRole("button", { name: "Update Game" }));

    await waitFor(() => expect(requestChange).toHaveBeenCalledWith({ changeRequest: "Switch it to a sorting challenge", sessionId: "session.demo" }));
    expect(await screen.findByText(profileB.profileName)).toBeDefined();
    expect(screen.getByRole("button", { name: /component\.sort-bins/u })).toBeDefined();

    fireEvent.click(await screen.findByRole("button", { name: "red circle" }));
    const interactions = await screen.findAllByText((text) => text.startsWith("Preview interaction:"));
    expect(interactions.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps the memory game selected while swapping requested card assets", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Memory game with dinosaurs" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    expect(await screen.findByText("Memory Match MVP")).toBeDefined();
    expect(await screen.findByRole("button", { name: "dinosaur-1-a" })).toBeDefined();
    expect(screen.getByRole("button", { name: "dinosaur-1-b" })).toBeDefined();

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Change the memory game to toys" } });
    fireEvent.click(screen.getByRole("button", { name: "Update Game" }));

    const toy1A = await screen.findByRole("button", { name: "toy-1-a" });
    const toy1B = screen.getByRole("button", { name: "toy-1-b" });
    const toy2A = screen.getByRole("button", { name: "toy-2-a" });
    const toy2B = screen.getByRole("button", { name: "toy-2-b" });
    expect(toy1A).toBeDefined();
    expect(toy1B).toBeDefined();
    expect(screen.queryByRole("button", { name: "dinosaur-1-a" })).toBeNull();
    expect(screen.queryByLabelText("Chat history")).toBeNull();

    fireEvent.click(toy1A);
    fireEvent.click(toy1B);
    fireEvent.click(toy2A);
    fireEvent.click(toy2B);
    await waitFor(() => expect(toy1A.style.background).toBe(toy1B.style.background));
    expect(toy1A.style.borderColor).toBe(toy1B.style.borderColor);
    expect(toy2A.style.background).toBe(toy2B.style.background);
    expect(toy2A.style.borderColor).toBe(toy2B.style.borderColor);
    expect(toy1A.style.background).not.toBe(toy2A.style.background);
    expect(toy1A.textContent).toContain("T1");
    expect(toy2A.textContent).toContain("T2");

    fireEvent.click(screen.getByRole("tab", { name: "Developer" }));
    expect(await screen.findByLabelText("Chat history")).toBeDefined();
    expect(screen.getByText("Generated Memory Match MVP with dinosaurs assets.")).toBeDefined();
    expect(screen.getByText("Updated Memory Match MVP with toys assets.")).toBeDefined();
  });

  it("plays the sorting profile with bin validation", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Sort shapes by color" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    expect(await screen.findByText("Sorting MVP")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "red circle" }));
    const blueBin = screen.getByRole("button", { name: "blue bin" });
    fireEvent.click(blueBin);
    expect(await screen.findByText("red circle does not belong in blue.")).toBeDefined();
    expect(blueBin.getAttribute("style")).toContain("rgb(239, 68, 68)");

    const redBin = screen.getByRole("button", { name: "red bin" });
    fireEvent.click(redBin);
    expect(await screen.findByText("red circle belongs in red.")).toBeDefined();
    expect(redBin.getAttribute("style")).toContain("rgb(22, 163, 74)");
    expect(screen.getByText("1 / 3")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "blue square" }));
    fireEvent.click(screen.getByRole("button", { name: "blue bin" }));
    fireEvent.click(screen.getByRole("button", { name: "red triangle" }));
    fireEvent.click(screen.getByRole("button", { name: "red bin" }));

    expect(await screen.findByText("Sort complete")).toBeDefined();
    expect(screen.getByText("3 items sorted with 1 miss.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Play Again" })).toBeDefined();
  });

  it("supports drag/drop sorting with ghost and target feedback", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Sort shapes by color" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    const item = await screen.findByRole("button", { name: "red circle" });
    const redBin = screen.getByRole("button", { name: "red bin" });
    setElementRect(item, { left: 10, top: 10, right: 190, bottom: 58, width: 180, height: 48 });
    setElementRect(redBin, { left: 240, top: 80, right: 430, bottom: 270, width: 190, height: 190 });

    fireEvent.mouseDown(item, { clientX: 30, clientY: 30, button: 0 });
    fireEvent.mouseMove(item, { clientX: 300, clientY: 140, buttons: 1 });

    expect((await screen.findByTestId("sort-drag-ghost")).textContent).toContain("red circle");
    expect(redBin.getAttribute("style")).toContain("rgb(249, 115, 22)");

    fireEvent.mouseUp(item, { clientX: 300, clientY: 140, button: 0 });

    expect(await screen.findByText("red circle belongs in red.")).toBeDefined();
    expect(redBin.getAttribute("style")).toContain("rgb(22, 163, 74)");
    expect(screen.queryByTestId("sort-drag-ghost")).toBeNull();
  });

  it("plays the sequence profile through completion", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Repeat a friendly light pattern" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    expect(await screen.findByText("Sequence Repeat MVP")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Start Round" }));
    fireEvent.click(screen.getByRole("button", { name: "blue" }));
    expect(await screen.findByText("Not blue. Try green next; watch the pattern again.")).toBeDefined();
    expect(screen.getByRole("button", { name: "blue" }).getAttribute("style")).toContain("rgb(239, 68, 68)");
    expect(screen.getByLabelText("Sequence pattern").getAttribute("style")).toContain("rgb(239, 68, 68)");

    fireEvent.click(screen.getByRole("button", { name: "Start Round" }));
    fireEvent.click(screen.getByRole("button", { name: "green" }));
    expect(await screen.findByText("Correct.")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "yellow" }));
    fireEvent.click(screen.getByRole("button", { name: "green" }));
    expect(await screen.findByText("Round 2 unlocked. Watch the next pattern.")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "green" }));
    fireEvent.click(screen.getByRole("button", { name: "yellow" }));
    fireEvent.click(screen.getByRole("button", { name: "green" }));
    fireEvent.click(screen.getByRole("button", { name: "blue" }));
    expect(await screen.findByText("Round 3 unlocked. Watch the next pattern.")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "yellow" }));
    fireEvent.click(screen.getByRole("button", { name: "green" }));
    fireEvent.click(screen.getByRole("button", { name: "blue" }));
    fireEvent.click(screen.getByRole("button", { name: "green" }));
    fireEvent.click(screen.getByRole("button", { name: "yellow" }));

    expect(await screen.findByText("Sequence complete.")).toBeDefined();
    expect(screen.getByText("Sequence master")).toBeDefined();
    expect(screen.getByRole("button", { name: "Play Again" })).toBeDefined();
  });

  it("resets the local session from the shared command bar", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Memory game with toys" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));
    expect(await screen.findByRole("button", { name: "toy-1-a" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Start Over" }));
    expect(screen.getByRole("button", { name: "Generate Game" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "toy-1-a" })).toBeNull();
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
