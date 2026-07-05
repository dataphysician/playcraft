import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GameAssemblyProfileSchema } from "@playcraft/contracts";
import { localAssetEditCatalog } from "@playcraft/assets";
import {
  createProfileLibraryAssetReplacements,
  sortingBinAssetCatalog,
  sortingBinAssetFor
} from "../apps/studio/src/asset-library.js";
import { LiveGame } from "../apps/studio/src/live-game.js";
import { createLocalStudioClient } from "../apps/studio/src/local-client.js";
import { StudioApp } from "../apps/studio/src/studio-app.js";

afterEach(() => cleanup());

describe("studio asset library", () => {
  it("maps local edit-aware sprites from profile themes", () => {
    const client = createLocalStudioClient();
    const oceanSession = client.assembleFromIntent({ idea: "Memory game with ocean animals" });
    const oceanProfile = oceanSession.activeProfile;
    const fruitSession = client.requestChange({ sessionId: oceanSession.sessionId, changeRequest: "Change the memory game to fruit" });
    const fruitProfile = fruitSession.activeProfile;

    expect(oceanProfile).toBeDefined();
    expect(fruitProfile).toBeDefined();
    expect(createProfileLibraryAssetReplacements(oceanProfile!)["card:dolphin-1-a"]?.altText).toBe("dolphin 1 sprite");
    expect(createProfileLibraryAssetReplacements(fruitProfile!)["card:fruit-1-a"]?.altText).toBe("fruit 1 sprite");
  });

  it("does not map stale indirect paired-card IDs through sprite suffixes", () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Memory game with ocean animals" });
    const profile = session.activeProfile;

    expect(profile).toBeDefined();
    const staleProfile = {
      ...profile!,
      components: profile!.components.map((component) =>
        component.renderCapability === "component:reveal-card-grid"
          ? {
              ...component,
              props: {
                ...component.props,
                cards: ["ocean-animal-1-a", "ocean-animal-1-b"],
                pairs: {
                  "ocean-animal-1-a": "pair-1",
                  "ocean-animal-1-b": "pair-1"
                }
              }
            }
          : component
      )
    };

    expect(createProfileLibraryAssetReplacements(staleProfile)["card:ocean-animal-1-a"]).toBeUndefined();
  });

  it("rejects paired card replacements that resolve to multiple local sprites", () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Memory game with toys" });
    const profile = session.activeProfile;

    expect(profile).toBeDefined();
    const conflictingPairProfile = {
      ...profile!,
      components: profile!.components.map((component) =>
        component.renderCapability === "component:reveal-card-grid"
          ? {
              ...component,
              props: {
                ...component.props,
                cards: ["toy-1-a", "toy-2-b"],
                pairs: {
                  "toy-1-a": "pair-conflict",
                  "toy-2-b": "pair-conflict"
                }
              }
            }
          : component
      )
    };

    expect(() => createProfileLibraryAssetReplacements(conflictingPairProfile)).toThrow(
      /asset replacement pair pair-conflict maps to multiple local sprites/u
    );
  });

  it("rejects paired card replacements with partial local sprite coverage", () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Memory game with toys" });
    const profile = session.activeProfile;

    expect(profile).toBeDefined();
    const partiallyMissingProfile = {
      ...profile!,
      components: profile!.components.map((component) =>
        component.renderCapability === "component:reveal-card-grid"
          ? {
              ...component,
              props: {
                ...component.props,
                cards: ["toy-1-a", "toybox-1-b"],
                pairs: {
                  "toy-1-a": "pair-partial",
                  "toybox-1-b": "pair-partial"
                }
              }
            }
          : component
      )
    };

    expect(() => createProfileLibraryAssetReplacements(partiallyMissingProfile)).toThrow(
      /asset replacement pair pair-partial is missing local sprites for toybox-1-b/u
    );
  });

  it("rejects ambiguous asset replacement components instead of using profile order", () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Memory game with toys" });
    const profile = session.activeProfile;

    expect(profile).toBeDefined();
    const duplicateProfile = {
      ...profile!,
      components: [
        ...profile!.components,
        {
          ...profile!.components[0],
          bindingId: `${profile!.components[0].bindingId}.duplicate`,
          componentId: `${profile!.components[0].componentId}.duplicate`
        }
      ]
    };

    expect(() => createProfileLibraryAssetReplacements(duplicateProfile)).toThrow(/multiple asset replacement components/u);
  });

  it("exposes validated local sprite URLs through profile replacements", () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Memory game with toys" });
    const profile = session.activeProfile;

    expect(profile).toBeDefined();
    expect(profile!.assetRequests[0]?.metadata.assetEditItems).toEqual(["toy-1", "toy-2"]);
    const replacements = createProfileLibraryAssetReplacements(profile!);
    expect(replacements["card:toy-1-a"]?.altText).toBe("toy 1 sprite");
    expect(replacements["toy-1-a"]).toBeUndefined();
    expect(typeof replacements["card:toy-1-a"]?.uri).toBe("string");
    expect(replacements["card:toy-1-a"]?.uri.length).toBeGreaterThan(0);
  });

  it("maps sorting item sprites from explicit asset item IDs instead of item order", () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Sorting game with toys" });
    const profile = session.activeProfile;

    expect(profile).toBeDefined();
    const replacements = createProfileLibraryAssetReplacements(profile!);
    expect(replacements["item:toy-1"]?.altText).toBe("toy 1 sprite");
    expect(replacements["item:toy-2"]?.altText).toBe("toy 2 sprite");
    expect(replacements["item:red toy"]).toBeUndefined();
  });

  it("rejects item replacements that resolve to multiple ordinal local sprites", () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Sorting game with toys" });
    const profile = session.activeProfile;

    expect(profile).toBeDefined();
    const ambiguousOrdinalProfile = {
      ...profile!,
      assetRequests: profile!.assetRequests.map((request) => ({
        ...request,
        metadata: {
          ...request.metadata,
          assetEditTheme: ["toys", "dinosaurs"]
        }
      })),
      components: profile!.components.map((component) =>
        component.renderCapability === "component:sort-bins"
          ? {
              ...component,
              props: {
                ...component.props,
                items: ["item-1"],
                targets: {
                  "item-1": "red"
                }
              }
            }
          : component
      )
    };

    expect(() => createProfileLibraryAssetReplacements(ambiguousOrdinalProfile)).toThrow(
      /asset replacement token item-1 maps to multiple ordinal local sprites/u
    );
  });

  it("ignores bare token asset replacements in the Live App renderer", async () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Memory game with dinosaurs" });
    const profile = session.activeProfile;

    expect(profile).toBeDefined();
    render(React.createElement(LiveGame, {
      assetReplacements: {
        "dinosaur-1-a": {
          altText: "bare dinosaur replacement",
          uri: "data:image/png;base64,AAAA"
        }
      },
      profile: profile!
    }));

    fireEvent.click(await screen.findByRole("button", { name: "dinosaur-1-a" }));

    expect(screen.queryByRole("img", { name: "bare dinosaur replacement" })).toBeNull();
    expect(await screen.findByRole("img", { name: "dinosaur 1 sprite" })).toBeDefined();
  });

  it("rejects ambiguous Live App components instead of using profile order", () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Memory game with dinosaurs" });
    const profile = session.activeProfile;

    expect(profile).toBeDefined();
    const duplicateProfile = {
      ...profile!,
      template: {
        ...profile!.template,
        liveSurface: {
          ...profile!.template.liveSurface,
          assetReplacementSources: []
        }
      },
      components: [
        ...profile!.components,
        {
          ...profile!.components[0],
          bindingId: `${profile!.components[0].bindingId}.duplicate`,
          componentId: `${profile!.components[0].componentId}.duplicate`
        }
      ]
    };

    render(React.createElement(LiveGame, { profile: duplicateProfile }));

    expect(screen.getByTestId("live-game-error").textContent).toContain("multiple live surface components");
  });

  it("rejects duplicate generated asset ids instead of using asset order", () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Memory game with dinosaurs" });
    const profile = session.activeProfile;

    expect(profile).toBeDefined();
    const duplicateAssetProfile = {
      ...profile!,
      assets: [
        ...profile!.assets,
        {
          ...profile!.assets[0]
        }
      ]
    };

    render(React.createElement(LiveGame, { profile: duplicateAssetProfile }));

    expect(screen.getByTestId("live-game-error").textContent).toContain("duplicate generated asset ids");
    expect(screen.getByTestId("live-game-error").textContent).toContain(profile!.assets[0]!.assetId);
  });

  it("rejects duplicate Live App token styles instead of using style order", () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Memory game with dinosaurs" });
    const profile = session.activeProfile;

    expect(profile).toBeDefined();
    const duplicateStyleProfile = {
      ...profile!,
      template: {
        ...profile!.template,
        liveSurface: {
          ...profile!.template.liveSurface,
          tokenStyles: [
            ...profile!.template.liveSurface.tokenStyles,
            {
              ...profile!.template.liveSurface.tokenStyles[0]!,
              background: "#ffffff"
            }
          ]
        }
      }
    };

    render(React.createElement(LiveGame, { profile: duplicateStyleProfile }));

    expect(screen.getByTestId("live-game-error").textContent).toContain("live token pair-1 maps to multiple token styles");
    expect(screen.queryByTestId("trusted-preview-surface")).toBeNull();
  });

  it("rejects duplicate Live App memory card ids instead of using deck order", () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Memory game with dinosaurs" });
    const profile = session.activeProfile;

    expect(profile).toBeDefined();
    const duplicateCardProfile = {
      ...profile!,
      components: profile!.components.map((component) =>
        component.renderCapability === "component:reveal-card-grid"
          ? {
              ...component,
              props: {
                ...component.props,
                cards: ["dinosaur-1-a", "dinosaur-1-a", "dinosaur-2-a", "dinosaur-2-b"],
                pairs: {
                  "dinosaur-1-a": "pair-1",
                  "dinosaur-2-a": "pair-2",
                  "dinosaur-2-b": "pair-2"
                }
              }
            }
          : component
      )
    };

    render(React.createElement(LiveGame, { profile: duplicateCardProfile }));

    expect(screen.getByTestId("live-game-error").textContent).toContain("memory cards contain duplicate card ids: dinosaur-1-a");
    expect(screen.queryByRole("button", { name: "dinosaur-1-a" })).toBeNull();
  });

  it("does not substitute unrelated local sprites when a requested theme has no local folder", () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Memory game with toybox" });
    const profile = session.activeProfile;

    expect(profile).toBeDefined();
    expect(createProfileLibraryAssetReplacements(profile!)["card:toybox-1-a"]).toBeUndefined();
  });

  it("requires builder-authored asset edit metadata before mapping local replacement folders", () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Memory game with toys" });
    const profile = session.activeProfile;

    expect(profile).toBeDefined();
    const staleProfile = {
      ...profile!,
      assetRequests: profile!.assetRequests.map((request) => ({
        ...request,
        metadata: {}
      }))
    };

    expect(staleProfile.assetRequests.some((request) => request.prompt.includes("toys"))).toBe(true);
    expect(createProfileLibraryAssetReplacements(staleProfile)["card:toy-1-a"]).toBeUndefined();
  });

  it("rejects duplicate local replacement catalog themes instead of using catalog order", () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Memory game with toys" });
    const profile = session.activeProfile;

    expect(profile).toBeDefined();
    localAssetEditCatalog.push({
      aliases: ["toy duplicate"],
      aliasSummary: "toy duplicate",
      displayLabel: "duplicate toys",
      localReplacementFolder: "toys",
      suggestedItems: ["duplicate-toy-1"],
      suggestedItemSummary: "duplicate-toy-1",
      theme: "duplicate-toys"
    });

    try {
      expect(() => createProfileLibraryAssetReplacements(profile!)).toThrow(
        /local asset replacement theme toys maps to multiple catalog entries: toys, duplicate-toys/u
      );
    } finally {
      localAssetEditCatalog.pop();
    }
  });

  it("rejects snapshotless asset replacement profiles at the contract boundary", () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Memory game with toys" });
    const profile = session.activeProfile;

    expect(profile).toBeDefined();
    const snapshotlessProfile = {
      ...profile!,
      template: undefined
    };

    expect(GameAssemblyProfileSchema.safeParse(snapshotlessProfile).success).toBe(false);
  });

  it("maps local sprites through profile-carried custom template snapshots", () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Memory game with toys" });
    const profile = session.activeProfile;

    expect(profile).toBeDefined();
    const customProfile = {
      ...profile!,
      assemblyRequestId: "request.custom-toy-memory",
      template: {
        schemaVersion: profile!.schemaVersion,
        id: "template.custom-toy-memory",
        version: "1.0.0",
        kind: "game-template-snapshot",
        displayName: "Custom Toy Memory",
        displayLabel: "Custom Toy Memory",
        assetPromptKind: "memory-cards",
        assetEditOperations: [
          {
            componentCapability: "component:reveal-card-grid",
            operation: "memory-pairs"
          }
        ],
        liveSurface: {
          kind: "memory",
          componentCapabilities: {
            primary: "component:reveal-card-grid"
          },
          assetReplacementSources: [
            {
              componentRole: "primary",
              prop: "cards",
              namespace: "card",
              pairMapProp: "pairs"
            }
          ],
          tokenStyles: [
            {
              tokens: ["pair-1"],
              background: "#fee2e2",
              border: "#ef4444",
              foreground: "#7f1d1d",
              accent: "#fecaca"
            }
          ],
          defaultTokenStyle: {
            tokens: ["default"],
            background: "#fce7f3",
            border: "#db2777",
            foreground: "#831843",
            accent: "#fbcfe8"
          }
        },
        assemblyRequestId: "request.custom-toy-memory"
      }
    };

    expect(createProfileLibraryAssetReplacements(customProfile)["card:toy-1-a"]?.altText).toBe("toy 1 sprite");
  });

  it("renders the Playcraft card back and replacement card sprites", async () => {
    const client = createLocalStudioClient();
    const session = client.assembleFromIntent({ idea: "Memory game with dinosaurs" });
    const profile = session.activeProfile;
    expect(profile).toBeDefined();
    render(React.createElement(LiveGame, { profile: profile! }));

    const dinosaurCards = await screen.findAllByRole("button", { name: /dinosaur-\d-[ab]/u });
    const dinosaurCard = dinosaurCards[0];
    if (!dinosaurCard) {
      throw new Error("No rendered dinosaur card was available.");
    }
    const cardLabel = dinosaurCard.getAttribute("aria-label");
    const pairOrdinal = cardLabel?.match(/^dinosaur-(\d)-[ab]$/u)?.[1];
    if (!pairOrdinal) {
      throw new Error("Rendered dinosaur card did not expose an accessible card label.");
    }
    expect(screen.getAllByTestId("playcraft-card-back").length).toBeGreaterThan(0);

    fireEvent.click(dinosaurCard);
    expect(await screen.findByRole("img", { name: `dinosaur ${pairOrdinal} sprite` })).toBeDefined();
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

  it("rejects ambiguous sorting bin aliases instead of using catalog order", () => {
    sortingBinAssetCatalog.push({
      aliases: ["blue bin"],
      altText: "duplicate blue sorting bin",
      id: "duplicate-blue",
      uri: "data:image/png;base64,AAAA"
    });

    try {
      expect(() => sortingBinAssetFor("blue bin")).toThrow(/sorting bin blue bin maps to multiple local bin assets: blue, duplicate-blue/u);
    } finally {
      sortingBinAssetCatalog.pop();
    }
  });
});
