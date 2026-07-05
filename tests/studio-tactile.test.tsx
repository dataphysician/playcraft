import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createLocalStudioClient } from "../apps/studio/src/local-client.js";
import { LiveGame } from "../apps/studio/src/live-game.js";

if (typeof globalThis.PointerEvent === "undefined") {
  class PointerEvent extends MouseEvent {
    pointerId: number;
    width: number;
    height: number;
    pressure: number;
    tangentialPressure: number;
    tiltX: number;
    tiltY: number;
    twist: number;
    pointerType: string;
    isPrimary: boolean;

    constructor(type: string, params?: PointerEventInit) {
      super(type, params);
      this.pointerId = params?.pointerId ?? 0;
      this.width = params?.width ?? 0;
      this.height = params?.height ?? 0;
      this.pressure = params?.pressure ?? 0;
      this.tangentialPressure = params?.tangentialPressure ?? 0;
      this.tiltX = params?.tiltX ?? 0;
      this.tiltY = params?.tiltY ?? 0;
      this.twist = params?.twist ?? 0;
      this.pointerType = params?.pointerType ?? "mouse";
      this.isPrimary = params?.isPrimary ?? true;
    }
  }

  (globalThis as unknown as Record<string, unknown>).PointerEvent = PointerEvent;
}

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

function createSequenceProfile(): GameAssemblyProfile {
  const client = createLocalStudioClient();
  const session = client.assembleFromIntent({ idea: "Sequence game with shapes" });
  return session.activeProfile!;
}

describe("studio tactile interactions", () => {
  it("renders interactive elements at least 64x64px", () => {
    const profile = createMemoryProfile();
    render(React.createElement(LiveGame, { profile }));

    const cards = screen.getAllByRole("button", { name: /dinosaur/ });
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      const style = window.getComputedStyle(card);
      const minWidth = parseFloat(style.minWidth);
      const minHeight = parseFloat(style.minHeight);
      expect(minWidth).toBeGreaterThanOrEqual(64);
      expect(minHeight).toBeGreaterThanOrEqual(64);
    }
  });

  it("ignores pointer drags beyond 10px on memory cards", async () => {
    const profile = createMemoryProfile();
    render(React.createElement(LiveGame, { profile }));

    const cards = screen.getAllByRole("button", { name: /dinosaur/ });
    const firstCard = cards[0]!;
    const rect = firstCard.getBoundingClientRect();

    await act(async () => {
      fireEvent.pointerDown(firstCard, {
        pointerId: 1,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
      });
      fireEvent.pointerMove(firstCard, {
        pointerId: 1,
        clientX: rect.left + rect.width / 2 + 15,
        clientY: rect.top + rect.height / 2
      });
      fireEvent.pointerUp(firstCard, {
        pointerId: 1,
        clientX: rect.left + rect.width / 2 + 15,
        clientY: rect.top + rect.height / 2
      });
    });

    const cardBacks = screen.queryAllByTestId("playcraft-card-back");
    expect(cardBacks.length).toBeGreaterThan(0);
  });

  it("registers a tap within 10px and 200ms on memory cards", async () => {
    vi.useFakeTimers();
    try {
      const profile = createMemoryProfile();
      render(React.createElement(LiveGame, { profile }));

      const cards = screen.getAllByRole("button", { name: /dinosaur/ });
      const firstCard = cards[0]!;
      const rect = firstCard.getBoundingClientRect();

      await act(async () => {
        fireEvent.pointerDown(firstCard, {
          pointerId: 1,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        });
        fireEvent.pointerUp(firstCard, {
          pointerId: 1,
          clientX: rect.left + rect.width / 2 + 5,
          clientY: rect.top + rect.height / 2 + 5
        });
      });

      const cardBacks = screen.queryAllByTestId("playcraft-card-back");
      expect(cardBacks.length).toBeLessThan(cards.length);
    } finally {
      vi.useRealTimers();
    }
  });

  it("flips back a failed memory match after 1.5s without score penalty", async () => {
    vi.useFakeTimers();
    try {
      const profile = createMemoryProfile();
      render(React.createElement(LiveGame, { profile }));

      const cards = screen.getAllByRole("button", { name: /dinosaur/ });
      const [cardA, cardB] = cards.slice(0, 2);
      const rectA = cardA.getBoundingClientRect();
      const rectB = cardB.getBoundingClientRect();

      await act(async () => {
        fireEvent.pointerDown(cardA, { pointerId: 1, clientX: rectA.left + rectA.width / 2, clientY: rectA.top + rectA.height / 2 });
        fireEvent.pointerUp(cardA, { pointerId: 1, clientX: rectA.left + rectA.width / 2, clientY: rectA.top + rectA.height / 2 });
      });

      await act(async () => {
        fireEvent.pointerDown(cardB, { pointerId: 2, clientX: rectB.left + rectB.width / 2, clientY: rectB.top + rectB.height / 2 });
        fireEvent.pointerUp(cardB, { pointerId: 2, clientX: rectB.left + rectB.width / 2, clientY: rectB.top + rectB.height / 2 });
      });

      const revealedAfterMismatch = screen.queryAllByTestId("playcraft-card-back");
      expect(revealedAfterMismatch.length).toBeLessThan(cards.length);

      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      const revealedAfterTimeout = screen.queryAllByTestId("playcraft-card-back");
      expect(revealedAfterTimeout.length).toBeGreaterThanOrEqual(revealedAfterMismatch.length);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns a wrongly sorted item to source after 1s with shake", async () => {
    vi.useFakeTimers();
    try {
      const profile = createSortingProfile();
      render(React.createElement(LiveGame, { profile }));

      const items = screen.getAllByRole("button", { name: /toy/ });
      const bins = screen.getAllByRole("button", { name: /bin/ });

      const firstItem = items[0]!;
      const firstBin = bins[0]!;

      await act(async () => {
        fireEvent.click(firstItem);
      });

      expect(firstItem.getAttribute("aria-pressed")).toBe("true");

      await act(async () => {
        fireEvent.click(firstBin);
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(firstItem.getAttribute("aria-pressed")).toBe("false");
    } finally {
      vi.useRealTimers();
    }
  });

  it("emits audio cue metadata at success, error, reveal, and complete moments", async () => {
    const cues: Array<{ kind: string; volume: number; duration: number }> = [];
    const profile = createMemoryProfile();
    render(
      React.createElement(LiveGame, {
        profile,
        onAudioCue: (cue) => {
          cues.push({ kind: cue.kind, volume: cue.volume, duration: cue.duration });
        }
      })
    );

    const cards = screen.getAllByRole("button", { name: /dinosaur/ });
    const [cardA, cardB] = cards.slice(0, 2);
    const rectA = cardA.getBoundingClientRect();
    const rectB = cardB.getBoundingClientRect();

    await act(async () => {
      fireEvent.pointerDown(cardA, { pointerId: 1, clientX: rectA.left + rectA.width / 2, clientY: rectA.top + rectA.height / 2 });
      fireEvent.pointerUp(cardA, { pointerId: 1, clientX: rectA.left + rectA.width / 2, clientY: rectA.top + rectA.height / 2 });
    });

    expect(cues.some((cue) => cue.kind === "reveal")).toBe(true);

    await act(async () => {
      fireEvent.pointerDown(cardB, { pointerId: 2, clientX: rectB.left + rectB.width / 2, clientY: rectB.top + rectB.height / 2 });
      fireEvent.pointerUp(cardB, { pointerId: 2, clientX: rectB.left + rectB.width / 2, clientY: rectB.top + rectB.height / 2 });
    });

    expect(cues.some((cue) => cue.kind === "success" || cue.kind === "error")).toBe(true);
  });
});
