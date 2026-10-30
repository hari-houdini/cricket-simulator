/*
 * Babel config shared by Next.js, the PostCSS StyleX plugin, and Storybook.
 *
 * This must be `babel.config.js` as CommonJS. Next.js reads only `.babelrc` and
 * `babel.config.js`. It rejects `.mjs` and `.cjs`, and it silently ignores a
 * `babel.config.ts`, which is why StyleX never compiled in the app before.
 */

const path = require("node:path");

const dev = process.env.NODE_ENV !== "production";

/**
 * The shared Babel options. The StyleX plugin reads them from here, so the
 * app, the PostCSS step and Storybook compile styles the same way.
 */
const config = {
  presets: ["next/babel"],
  plugins: [
    [
      "@stylexjs/babel-plugin",
      {
        dev,
        runtimeInjection: false,
        enableInlinedConditionalMerge: true,
        treeshakeCompensation: true,
        aliases: { "@/*": [path.join(__dirname, "*")] },
        // Resolve extensionless imports such as `../shared/const/tokens.stylex`.
        // The default ESM resolution needs a full file extension, and StyleX
        // then fails to find the theme file that `defineVars` lives in.
        unstable_moduleResolution: { type: "commonJS" },
      },
    ],
  ],
};

module.exports = config;
