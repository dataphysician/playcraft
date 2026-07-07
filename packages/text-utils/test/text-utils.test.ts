import { describe, expect, it } from "vitest";
import {
  articleFor,
  cleanLabel,
  normalizedTokens,
  singularize,
  slugLabel,
  titleCase,
  tokenSequenceIncludes
} from "@playcraft/text-utils";

describe("normalizedTokens", () => {
  it("lowercases the input", () => {
    expect(normalizedTokens("Hello WORLD")).toEqual(["hello", "world"]);
  });

  it("replaces non-alphanumeric runs with single spaces", () => {
    expect(normalizedTokens("hello,  world!!")).toEqual(["hello", "world"]);
  });

  it("treats hyphens as separators", () => {
    expect(normalizedTokens("blue-bin")).toEqual(["blue", "bin"]);
  });

  it("trims surrounding whitespace and drops empty tokens", () => {
    expect(normalizedTokens("   leading trailing   ")).toEqual(["leading", "trailing"]);
    expect(normalizedTokens("  ")).toEqual([]);
  });

  it("returns an empty array for an empty string", () => {
    expect(normalizedTokens("")).toEqual([]);
  });
});

describe("tokenSequenceIncludes", () => {
  it("returns false for an empty sequence", () => {
    expect(tokenSequenceIncludes(["a", "b"], [])).toBe(false);
  });

  it("returns false when the sequence is longer than the haystack", () => {
    expect(tokenSequenceIncludes(["a"], ["a", "b"])).toBe(false);
  });

  it("returns true for an exact match", () => {
    expect(tokenSequenceIncludes(["a", "b", "c"], ["a", "b", "c"])).toBe(true);
  });

  it("returns true when the sequence appears as a contiguous subsequence", () => {
    expect(tokenSequenceIncludes(["a", "b", "c", "d"], ["b", "c"])).toBe(true);
  });

  it("returns false when the sequence tokens are split", () => {
    expect(tokenSequenceIncludes(["a", "b", "c"], ["a", "c"])).toBe(false);
  });

  it("returns false for an empty haystack and a single-token sequence", () => {
    expect(tokenSequenceIncludes([], ["a"])).toBe(false);
  });

  it("respects token order", () => {
    expect(tokenSequenceIncludes(["b", "a"], ["a", "b"])).toBe(false);
  });
});

describe("cleanLabel", () => {
  it("lowercases and normalizes whitespace", () => {
    expect(cleanLabel("  Dinosaurs   ")).toBe("dinosaurs");
  });

  it("preserves hyphens", () => {
    expect(cleanLabel("dolphin-1")).toBe("dolphin-1");
  });

  it("replaces punctuation with spaces and collapses them", () => {
    expect(cleanLabel("Hello, World!!")).toBe("hello world");
  });

  it("returns an empty string when only punctuation is supplied", () => {
    expect(cleanLabel("!!!")).toBe("");
  });
});

describe("slugLabel", () => {
  it("produces a URL-friendly slug from a phrase", () => {
    expect(slugLabel("Memory Game With Dinosaurs")).toBe("memory-game-with-dinosaurs");
  });

  it("collapses runs of punctuation and whitespace", () => {
    expect(slugLabel("  Hello,   World!!  ")).toBe("hello-world");
  });

  it("preserves existing hyphens", () => {
    expect(slugLabel("dolphin-1")).toBe("dolphin-1");
  });
});

describe("singularize", () => {
  it("strips trailing 'ies' to 'y'", () => {
    expect(singularize("dolphins")).toBe("dolphin");
  });

  it("strips trailing 's' (except 'ss')", () => {
    expect(singularize("toys")).toBe("toy");
    expect(singularize("fruits")).toBe("fruit");
  });

  it("leaves short words intact", () => {
    expect(singularize("is")).toBe("is");
  });

  it("preserves words ending in 'ss'", () => {
    expect(singularize("dress")).toBe("dress");
  });

  it("applies per word on a multi-word string", () => {
    expect(singularize("dolphins toy")).toBe("dolphin toy");
  });
});

describe("titleCase", () => {
  it("uppercases the first letter of each word", () => {
    expect(titleCase("dinosaurs pairs")).toBe("Dinosaurs Pairs");
  });

  it("preserves existing uppercase characters", () => {
    expect(titleCase("ABc def")).toBe("ABc Def");
  });

  it("only acts on word boundaries", () => {
    expect(titleCase("3little-pigs")).toBe("3little-Pigs");
  });
});

describe("articleFor", () => {
  it("returns 'an' for vowel-initial values", () => {
    expect(articleFor("apple")).toBe("an");
    expect(articleFor("elephant")).toBe("an");
    expect(articleFor("igloo")).toBe("an");
    expect(articleFor("octopus")).toBe("an");
    expect(articleFor("umbrella")).toBe("an");
  });

  it("returns 'a' for consonant-initial values", () => {
    expect(articleFor("bear")).toBe("a");
    expect(articleFor("dinosaur")).toBe("a");
  });
});
