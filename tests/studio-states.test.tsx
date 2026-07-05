import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { EmptyState, ErrorState, LoadingState } from "../apps/studio/src/states/index.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("studio states", () => {
  it("EmptyState renders title, description, and action", () => {
    const onClick = vi.fn();
    render(
      React.createElement(EmptyState, {
        icon: "🎮",
        title: "No game yet",
        description: "Assemble your first game to get started.",
        action: { label: "Assemble", onClick }
      })
    );

    expect(screen.getByText("No game yet")).toBeDefined();
    expect(screen.getByText("Assemble your first game to get started.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Assemble" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Assemble" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("LoadingState shows spinner and label", () => {
    render(React.createElement(LoadingState, { label: "Loading catalog." }));

    expect(screen.getByText("Loading catalog.")).toBeDefined();
    expect(screen.getByRole("status").getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
    expect(document.querySelector(".spinner")).toBeDefined();
  });

  it("LoadingState transitions to error state after 10s timeout", async () => {
    vi.useFakeTimers();
    render(React.createElement(LoadingState, { label: "Loading catalog." }));

    expect(screen.getByText("Loading catalog.")).toBeDefined();
    expect(screen.queryByText(/timed out/i)).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByText(/timed out/i)).toBeDefined();
    expect(screen.getByRole("alert").getAttribute("aria-live")).toBe("assertive");
  });

  it("ErrorState shows retry button when retry is provided", () => {
    const onRetry = vi.fn();
    render(
      React.createElement(ErrorState, {
        message: "Catalog failed to load.",
        retry: onRetry,
        details: "Timeout after 10000ms"
      })
    );

    expect(screen.getByText("Catalog failed to load.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
    expect(screen.getByRole("alert").getAttribute("aria-live")).toBe("assertive");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("ErrorState expands and collapses details", () => {
    render(
      React.createElement(ErrorState, {
        message: "Something went wrong.",
        details: "Stack trace line 1\nStack trace line 2"
      })
    );

    expect(screen.getByText("Show details")).toBeDefined();
    expect(screen.queryByText("Stack trace line 1")).toBeNull();

    fireEvent.click(screen.getByText("Show details"));

    expect(screen.getByText("Hide details")).toBeDefined();
    expect(screen.getByText(/Stack trace line 1/)).toBeDefined();
    const detailsPre = document.querySelector(".error-state-details-text");
    expect(detailsPre?.textContent).toContain("Stack trace line 2");

    fireEvent.click(screen.getByText("Hide details"));

    expect(screen.getByText("Show details")).toBeDefined();
    expect(screen.queryByText("Stack trace line 1")).toBeNull();
  });
});
