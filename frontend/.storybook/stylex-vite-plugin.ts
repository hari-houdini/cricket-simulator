import { transformAsync } from "@babel/core";
import type { Plugin } from "vite";

import babelConfig from "../babel.config.js";

/**
 * Runs the StyleX Babel plugin inside Storybook's Vite build.
 *
 * Storybook's Vite pipeline does not apply the project's Babel config, so
 * `stylex.create` and `stylex.defineVars` would reach the browser uncompiled and
 * throw at runtime. This plugin applies only the StyleX entry from
 * `babel.config.js`, so the options stay in one place.
 *
 * Only `src/` TypeScript files that import StyleX are transformed, which keeps
 * the rest of the build unchanged. The plugin runs before Vite's own TypeScript
 * stripping, so the parser is given the TypeScript and JSX syntax plugins.
 *
 * @returns A Vite plugin that compiles StyleX in `src/` files.
 */
export function stylexVitePlugin(): Plugin {
  const stylexPlugins = babelConfig.plugins.filter(
    (plugin) => Array.isArray(plugin) && plugin[0] === "@stylexjs/babel-plugin",
  );

  return {
    name: "stylex-babel",
    enforce: "pre",
    async transform(code, id) {
      const file = id.split("?")[0] ?? id;
      if (
        !/\/src\/.*\.tsx?$/.test(file) ||
        !code.includes("@stylexjs/stylex")
      ) {
        return null;
      }

      const result = await transformAsync(code, {
        filename: file,
        babelrc: false,
        configFile: false,
        parserOpts: { plugins: ["typescript", "jsx"] },
        plugins: stylexPlugins,
        sourceMaps: true,
      });

      if (!result?.code) {
        return null;
      }
      return { code: result.code, map: result.map };
    },
  };
}
