import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = path.resolve(__dirname, "../..");

/**
 * The only properties a default transition may animate (`AGENTS.md`, Animation).
 * Layout properties are excluded on purpose: animating them forces reflow.
 */
const ALLOWED_TRANSITION_PROPERTIES = new Set([
  // `none` switches transitions off, so it animates nothing.
  "none",
  "transform",
  "opacity",
  "color",
  "background-color",
  "border-color",
  "box-shadow",
]);

/**
 * Lists every `*.styles.ts` file under a directory, recursively.
 *
 * @param dir - Directory to search.
 * @returns Absolute paths of the style modules found.
 */
function stylesFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return stylesFilesUnder(full);
    return entry.name.endsWith(".styles.ts") ? [full] : [];
  });
}

/**
 * Pulls the properties out of every `transitionProperty` value in a style module.
 *
 * @param source - Source text of a `*.styles.ts` file.
 * @returns Property names, in the order they appear.
 */
function transitionedProperties(source: string): string[] {
  const values = [...source.matchAll(/transitionProperty:\s*"([^"]+)"/g)];
  return values.flatMap((match) =>
    (match[1] ?? "").split(",").map((property) => property.trim()),
  );
}

describe("transition properties in style modules", () => {
  it("animate only the allowed properties", () => {
    const offenders = stylesFilesUnder(SRC_DIR).flatMap((file) =>
      transitionedProperties(readFileSync(file, "utf8"))
        .filter((property) => !ALLOWED_TRANSITION_PROPERTIES.has(property))
        .map((property) => `${path.relative(SRC_DIR, file)}: ${property}`),
    );

    expect(offenders).toEqual([]);
  });
});
