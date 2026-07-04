import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  createProfileLibraryAssetReplacements,
  sortingBinAssetCatalog,
  sortingBinAssetFor
} from "../apps/studio/src/asset-library.js";
import { createLocalStudioClient } from "../apps/studio/src/local-client.js";
import { StudioApp } from "../apps/studio/src/studio-app.js";

afterEach(() => cleanup());

describe("studio asset library", () => {
  it("maps local edit-aware sprites from profile themes", () => {
    const client = createLocalStudioClient();
    const oceanSession = client.assembleFromIntent({ idea: "Memory game with ocean animals" });
    const oceanProfile = oceanSession.profiles.at(-1);
    const fruitSession = client.requestChange({ sessionId: oceanSession.sessionId, changeRequest: "Change the memory game to fruit" });
    const fruitProfile = fruitSession.profiles.at(-1);

    expect(oceanProfile).toBeDefined();
    expect(fruitProfile).toBeDefined();
    expect(createProfileLibraryAssetReplacements(oceanProfile!)["card:ocean-animal-1-a"]?.altText).toBe("dolphin 1 sprite");
    expect(createProfileLibraryAssetReplacements(fruitProfile!)["card:fruit-1-a"]?.altText).toBe("fruit 1 sprite");
  });

  it("renders the Playcraft card back and replacement card sprites", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Memory game with dinosaurs" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    expect(await screen.findByRole("button", { name: "dinosaur-1-a" })).toBeDefined();
    expect(screen.getAllByTestId("playcraft-card-back").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "dinosaur-1-a" }));
    expect(await screen.findByRole("img", { name: "dinosaur 1 sprite" })).toBeDefined();
  });

  it("renders generated sorting bin assets", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Sort shapes by color" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    expect(await screen.findByText("Sorting MVP")).toBeDefined();
    expect(screen.getByRole("img", { name: "red sorting bin" })).toBeDefined();
    expect(screen.getByRole("img", { name: "blue sorting bin" })).toBeDefined();
  });

  it("maps sorting bin sprites from an explicit local catalog instead of substring guesses", () => {
    expect(sortingBinAssetCatalog.map((entry) => entry.id)).toEqual(["red", "blue", "green"]);
    expect(sortingBinAssetFor("blue bin")?.altText).toBe("blue sorting bin");
    expect(sortingBinAssetFor("blueberry")).toBeUndefined();
    expect(sortingBinAssetFor("greenhouse")).toBeUndefined();
  });
});
