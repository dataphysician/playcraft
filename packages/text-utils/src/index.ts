/**
 * Lowercases the input, replaces any run of non-alphanumeric characters with a
 * single space, trims, and splits on whitespace into non-empty tokens.
 *
 * Used for matching user-typed requests against catalog aliases, asset edit
 * themes, and template request aliases.
 */
export function normalizedTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

/**
 * Returns true when `sequence` appears as a contiguous subsequence of
 * `tokens`. Empty sequences and sequences longer than the haystack return
 * false. Token order matters.
 */
export function tokenSequenceIncludes(tokens: string[], sequence: string[]): boolean {
  if (sequence.length === 0 || sequence.length > tokens.length) {
    return false;
  }

  return tokens.some((_, index) =>
    sequence.every((token, offset) => tokens[index + offset] === token)
  );
}

/**
 * Normalizes a label for matching: lowercases, replaces any character outside
 * `[a-z0-9 -]` with a single space, collapses runs of whitespace, and trims.
 * Spaces and hyphens are preserved so labels can be compared verbatim and
 * later slugified.
 */
export function cleanLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 -]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Produces a URL-friendly slug from a label by normalizing via `cleanLabel`
 * and replacing internal whitespace with hyphens.
 */
export function slugLabel(value: string): string {
  return cleanLabel(value).replace(/\s+/gu, "-");
}

/**
 * Applies a lightweight English singularization heuristic to each whitespace-
 * separated word. Words ending in "ies" become "y", words ending in a non-"ss"
 * "s" drop the trailing "s", and short words are left intact.
 */
export function singularize(value: string): string {
  return value
    .split(" ")
    .map((word) => {
      if (word.endsWith("ies") && word.length > 3) {
        return `${word.slice(0, -3)}y`;
      }
      if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) {
        return word.slice(0, -1);
      }
      return word;
    })
    .join(" ");
}

/**
 * Title-cases a string by uppercasing the first alphabetical character of
 * each whitespace-delimited word. Existing uppercase characters are preserved.
 */
export function titleCase(value: string): string {
  return value.replace(/\b[a-z]/gu, (match) => match.toUpperCase());
}

/**
 * Picks the English indefinite article for a value: "an" when the first
 * character is a vowel, otherwise "a".
 */
export function articleFor(value: string): "a" | "an" {
  return /^[aeiou]/u.test(value) ? "an" : "a";
}
