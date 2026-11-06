import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { STAGE_PALETTE } from "./stage-palette.const";

/**
 * Each stage colour and the StyleX token it must match. The token file is read as
 * text, because `defineVars` returns CSS variable references at run time, not the
 * hex values.
 */
const MIRRORED_TOKENS = {
  chalk: "colorText",
  ochre: "colorGoldPrimary",
  ochreBright: "colorGoldSecondary",
  turfNight: "colorMid",
  turfDeep: "colorBase",
} as const;

const tokenSource = readFileSync(
  path.resolve(__dirname, "tokens.stylex.ts"),
  "utf8",
);

/**
 * Reads one colour token's hex value out of the token source.
 *
 * @param name - The token's name in `tokens.stylex.ts`.
 * @returns The hex value, or `undefined` when the token is not a hex colour there.
 */
function tokenHex(name: string): string | undefined {
  const match = new RegExp(`${name}:\\s*"(#[0-9a-fA-F]{6})"`).exec(tokenSource);
  return match?.[1];
}

describe("STAGE_PALETTE", () => {
  it.each(
    Object.entries(MIRRORED_TOKENS),
  )("%s matches the %s token", (key, token) => {
    expect(tokenHex(token)).toBeDefined();
    expect(STAGE_PALETTE[key as keyof typeof STAGE_PALETTE].toLowerCase()).toBe(
      tokenHex(token),
    );
  });
});
