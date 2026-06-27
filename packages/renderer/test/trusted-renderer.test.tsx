import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PLAYCRAFT_SCHEMA_VERSION,
  type ComponentRenderRequest
} from "@playcraft/contracts";
import { replayProfile } from "@playcraft/core";
import {
  assembleMvpProfiles,
  createDefaultRegistries,
  registerPlaycraftTrustedComponents
} from "@playcraft/packs";

function firstRenderRequest(): { request: ComponentRenderRequest; assets: ReturnType<typeof assembleMvpProfiles>[number]["assets"] } {
  const profile = assembleMvpProfiles()[0];
  const replay = replayProfile(profile, createDefaultRegistries());
  return { request: replay.renderRequests[0], assets: profile.assets };
}

describe("trusted renderer", () => {
  it("renders registered components from validated manifests", () => {
    const registry = registerPlaycraftTrustedComponents();
    const { request, assets } = firstRenderRequest();
    const result = registry.render(request, assets);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(renderToStaticMarkup(result.element)).toContain("data-playcraft-component");
    }
  });

  it("rejects unknown components", () => {
    const registry = registerPlaycraftTrustedComponents();
    const { request, assets } = firstRenderRequest();
    const result = registry.render({ ...request, componentId: "component.unknown" }, assets);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("unknown-component");
    }
  });

  it("rejects unsupported capability requests", () => {
    const registry = registerPlaycraftTrustedComponents();
    const { request, assets } = firstRenderRequest();
    const result = registry.render({ ...request, componentCapability: "component:sort-bins" }, assets);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("unsupported-capability");
    }
  });

  it("rejects invalid props", () => {
    const registry = registerPlaycraftTrustedComponents();
    const { request, assets } = firstRenderRequest();
    const result = registry.render({ ...request, props: { title: "Only title" } }, assets);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("invalid-props");
    }
  });

  it("rejects missing assets", () => {
    const registry = registerPlaycraftTrustedComponents();
    const { request } = firstRenderRequest();
    const result = registry.render(request, []);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("missing-asset");
    }
  });

  it("rejects generated or executable code-shaped input", () => {
    const registry = registerPlaycraftTrustedComponents();
    const { request, assets } = firstRenderRequest();
    const result = registry.render({
      ...request,
      props: {
        ...request.props,
        cards: ["safe", "<script>alert(1)</script>"]
      }
    }, assets);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("unsafe-input");
    }
  });

  it("requires component identity or capability", () => {
    const registry = registerPlaycraftTrustedComponents();
    const { assets } = firstRenderRequest();
    const result = registry.render({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "render.invalid",
      version: "1.0.0",
      kind: "component-render-request",
      profileId: "profile.invalid",
      mechanicBindingId: "profile.invalid.mechanic.1",
      props: {},
      assetBindings: {},
      expectedEmittedEvents: [],
      fallbackPolicy: "fail-closed"
    }, assets);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("invalid-request");
    }
  });

  it("supports trusted interactions before and after preview updates", () => {
    const registry = registerPlaycraftTrustedComponents();
    const { request, assets } = firstRenderRequest();
    const emitted: Array<{ name: string; payload: unknown }> = [];
    const first = registry.render(request, assets, (name, payload) => emitted.push({ name, payload }));

    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    const view = render(first.element);
    fireEvent.click(screen.getByRole("button", { name: "cat-a" }));

    const updatedRequest: ComponentRenderRequest = {
      ...request,
      id: `${request.id}.updated`,
      props: {
        ...request.props,
        title: "Animal pairs updated"
      }
    };
    const second = registry.render(updatedRequest, assets, (name, payload) => emitted.push({ name, payload }));

    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }

    view.rerender(second.element);
    expect(screen.getByLabelText("Animal pairs updated")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "cat-a" }));

    expect(emitted).toEqual([
      {
        name: "tool:reveal-card",
        payload: { componentId: request.componentId, cardId: "cat-a" }
      },
      {
        name: "tool:reveal-card",
        payload: { componentId: request.componentId, cardId: "cat-a" }
      }
    ]);
  });
});
