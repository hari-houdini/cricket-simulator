# AGENTS.md

Rules for AI agents and contributors working in this repository. Read this before changing code. `frontend/AGENTS.md` adds Next.js-specific rules and must be followed for anything under `frontend/`.

## Project

IPL cricket fantasy simulator. Guests own IPL franchises. Owners bid for 15 players in a live auction (₹100cr purse) and name an 11-player starting XI. The lobby then plays a 10-team league (double round-robin, 14 matches per team) and the IPL playoff format. Vocabulary is in `GLOSSARY.md`.

- Game rules: `README.md`, `docs/game-design.md`
- System design: `ARCHITECTURE.md`
- UI specs: `docs/ui/`
- Prior analysis: `research/` (reference only, do not edit casually)

## Repository layout

- `frontend/`: Next.js 16 + React 19 app using the App Router (`src/app/`). Package manager: pnpm.
- `backend/`: Rust service targeting Cloudflare Workers (see `ARCHITECTURE.md`). Currently empty.
- `docs/`, `research/`: design documents and analysis.
- `docs/adr/`: accepted architecture decisions. Check them before reversing a design choice.
- `GLOSSARY.md`: the project's domain vocabulary. Use its terms in code, comments and UI copy, and avoid the synonyms it lists.

## Commands

Frontend, run from `frontend/`:

| Task | Command |
|------|---------|
| Dev server | `pnpm dev` |
| Build | `pnpm build` |
| Lint and format check | `pnpm lint` |
| Lint and format fix | `pnpm format` |
| Type check | `pnpm exec tsc --noEmit` |
| Unit and component tests | `pnpm exec vitest run` |
| Storybook | `pnpm storybook` |
| Dependency audit | `pnpm audit` |

Backend, run from `backend/` once it has code:

| Task | Command |
|------|---------|
| Format check | `cargo fmt --check` |
| Lint | `cargo clippy -- -D warnings` |
| Tests | `cargo test` |
| Dependency audit | `cargo audit` |

After every change, `pnpm lint` and `pnpm exec tsc --noEmit` must pass in `frontend/`, and the Rust checks must pass in `backend/`. A task is not done until they do.

## Dependencies

- **Exact versions only.** No `^`, `~`, or `latest` in `package.json`. In `Cargo.toml`, use `=` requirements (for example `serde = "=1.0.217"`).
- **Commit lockfiles.** `pnpm-lock.yaml` and `Cargo.lock` are committed. Installs in CI use the frozen lockfile.
- **Approval for new packages.** Before adding a dependency, confirm all of the following:
  1. No built-in platform feature or already-approved package covers the need.
  2. The package has a commit in the last 6 months.
  3. The gzipped size is under 50 KB, and it adds few transitive dependencies, each reviewed.
  4. It is recorded in the approved list below.
- **Approved list (frontend, seeded from `frontend/package.json`):** `next`, `react`, `react-dom`, `@biomejs/biome`, `@types/node`, `@types/react`, `@types/react-dom`, `babel-plugin-react-compiler`, `typescript`, `storybook`, `@storybook/nextjs-vite`, `@chromatic-com/storybook`, `@storybook/addon-vitest`, `@storybook/addon-a11y`, `@storybook/addon-docs`, `@storybook/addon-mcp`, `vite`, `vitest`, `@vitest/browser-playwright`, `@vitest/coverage-v8`, `playwright`, `@stylexjs/stylex` (runtime, about 0.9 KB gzipped, transitive deps `styleq`, `invariant`, `css-mediaquery`), `@stylexjs/babel-plugin` and `@stylexjs/postcss-plugin` (build-time only), `zod` (about 25 KB gzipped with named imports), `@babel/core` 7.29.7 (build-time only; already in the tree through the StyleX plugins, pinned to the 7.x line they require, since 8.x is a separate major).
- **zod import style:** import the runtime functions by name (`import { object, string } from "zod"`). A namespace import (`import { z } from "zod"`) keeps every export alive and bundles to about 92 KB gzipped, over the 50 KB limit. Get types with a type-only import, `import type { z } from "zod"`, and `z.infer<typeof schema>`.
- **Audits:** `pnpm audit` and `cargo audit` run on every pull request. Findings at high or critical severity fail the check.
- **GitHub Actions** (none exist yet): pin every action to its full 40-character commit SHA, with a trailing `# vX.Y.Z` comment. Dependabot proposes SHA bumps.
- **Build scripts:** pnpm 12 blocks dependency build scripts unless allow-listed. Add a package to `allowBuilds` in `frontend/pnpm-workspace.yaml` only after checking it. The current list is `esbuild` (required by Vite), `sharp` (disabled), and `unrs-resolver` (disabled).

## Architecture and layers

Frontend (`frontend/src/`), listed from innermost to outermost:

```
shared/types/    TypeScript types. Imports nothing from src/.
shared/const/    Constants. Imports shared/types only.
shared/utils/    Pure functions. Imports shared/types and shared/const.
components/      React components. Imports shared/ only, plus its own feature folder.
services/        Server-side code and API clients. Imports shared/ only.
app/             Routes and layouts. Imports everything.
```

- Dependencies point inward only. No circular imports.
- Services never import components, and components never import services.
- Feature components may compose each other within the same feature folder.
- Logic shared between features moves to `shared/utils/`.
- No barrel files. Never add an `index.ts` that re-exports other modules.

Backend (`backend/`): follow the service split in `ARCHITECTURE.md` (match simulator, season manager, awards, API). Keep the simulator free of I/O so it stays deterministic and testable.

## File naming

- Route files use Next.js conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`.
- Components are PascalCase: `Button.tsx`, `SquadPicker.tsx`.
- Non-component modules use a type suffix and sit next to what they support: `<name>.types.ts`, `<name>.schema.ts`, `<name>.styles.ts`, `<name>.const.ts`, `<name>.mock.ts`, `<name>.test.ts`.
- Schemas are zod (`<name>.schema.ts`). Types are derived from them with `z.infer` in `<name>.types.ts`, never declared by hand.
- Rust files use snake_case, matching `ARCHITECTURE.md` (`match_simulator.rs`).

## TypeScript

- Keep these `tsconfig.json` flags on: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`. Do not weaken them.
- Never use `any`. Use `unknown` and narrow it.
- Add `@ts-ignore` only with a comment explaining why. Prefer `@ts-expect-error` with the reason.
- Prefer `type` over `interface` unless declaration merging is needed.
- Use `import type` for type-only imports. Split value and type exports into separate statements.
- Use `as const` for literal constant objects and `satisfies` to check object literals without widening.

## React and Next.js

- Read the relevant guide in `frontend/node_modules/next/dist/docs/` before writing Next.js code. APIs have changed from older versions.
- Server Components are the default. Add `"use client"` only where state, effects, or browser APIs are needed.
- Never use `dangerouslySetInnerHTML`, `eval`, `new Function`, `document.write`, or string arguments to `setTimeout`/`setInterval`.
- Server-only HTTP endpoints go in Route Handlers under `src/app/`. The game API is served by the Rust backend (see `ARCHITECTURE.md`).
- Use `next/link` and Next.js navigation. Any view-transition code must degrade to normal navigation when the browser does not support it.

## Styling

- StyleX is the styling system (`ARCHITECTURE.md`). Component styles live in `<name>.styles.ts` using `stylex.create`.
- Tailwind is not used. Do not add it or utility-class markup.
- Define design tokens (colors, spacing, radius, shadows, durations) once, with `stylex.defineVars` in `frontend/src/shared/const/tokens.stylex.ts`. Do not hard-code color, spacing, or font values elsewhere.
- The palette is dark-only, from `docs/ui/design-system.md`. There is no light theme, so the `prefers-color-scheme` split does not apply.
- Fonts are Bodoni Moda (headings) and DM Sans (body), loaded with `next/font/google`.
- Target breakpoints from `ARCHITECTURE.md`: 320px to 768px mobile, 768px to 1024px tablet, 1024px and up desktop.

## Security

- Security headers and the Content-Security-Policy live in `frontend/next.config.ts`. Keep the CSP and the rest of the headers in step with each other.
- The `'unsafe-inline'` script exception in that CSP is temporary and documented there. Remove it once nonces are wired.
- Validate all external input (URL params, request bodies, query strings) before use. Never pass raw external strings to SQL, file paths, or the DOM.
- Never log secrets or tokens.
- Read environment variables through `process.env`. Only variables prefixed `NEXT_PUBLIC_` reach the browser.

## Accessibility and performance

These are targets. Check them by hand until CI enforces them.

- **Accessibility (WCAG 2.2 AA):** every interactive element is keyboard-reachable with a visible focus indicator. Images have meaningful `alt` text, or `alt=""` if decorative. Color is never the only signal. Contrast is at least 4.5:1 for body text and 3:1 for large text and UI components. Dynamic content uses `aria-live` where it matters. Each page has `<main>`, `<nav>`, and `<header>`/`<footer>` landmarks and a skip link. Never use `tabindex` greater than 0.
- **Performance:** JS per page at most 150 KB gzipped, CSS at most 30 KB gzipped, at most 2 font families, LCP at most 2.5 s, CLS at most 0.1. Images are at most 500 KB, use WebP or AVIF, and are lazy-loaded.
- **Animation:** animate only `transform` and `opacity`. Do not read layout inside an animation frame. Keep `will-change` only while an animation runs. Wrap non-trivial motion in `@media (prefers-reduced-motion: reduce)` with a static fallback.

## Documentation

- Every exported function, class, method, type, interface, constant, and component has a JSDoc comment.
- Use `@param`, `@returns`, and `@throws` where they apply, and `{@link Name}` for cross-references.
- Explain the why and any non-obvious constraint. Do not restate what the name already says.

## Testing

- Unit and component tests use Vitest and sit next to their source file as `<name>.test.ts(x)`.
- Storybook's Vitest addon runs the story tests.
- Every exported function in `frontend/src/shared/utils/` has 100% branch coverage.
- Do not write snapshot tests.
- Rust unit tests live in the same module as the code. Run them with `cargo test`.

## Commits

Use Conventional Commits: `type(scope): subject`. Common types are `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, and `ci`. Use a scope such as `cricket`, `frontend`, or `backend`.

## Domain glossary

`GLOSSARY.md` holds the full definitions and banned synonyms. This section is a summary.

- **Lobby:** a multiplayer room. Guests join a lobby to play a season together.
- **Squad:** 15 players drafted at auction with a ₹100cr purse. The starting XI is 11 of them. Roles are Batter, Bowler, All-rounder, and Wicket-keeper.
- **League:** 10 IPL franchises in a double round-robin, 14 matches per team. Win is 2 points, a tie is 1 point each, a loss is 0.
- **Playoffs:** IPL format: Qualifier 1, Eliminator, Qualifier 2, Final (rounds 15–18).
- **Awards:** Man of the Match (per match), Orange Cap, Purple Cap, Most Valuable Player, Emerging Player, and Fair Play. Definitions are in `docs/game-design.md` section 8.

## Quick reference: what not to do

| Do not | Do instead |
|--------|------------|
| Use `dangerouslySetInnerHTML`, `eval`, or `document.write` | Build DOM through React, or use DOM APIs with `textContent` |
| Use `^`, `~`, or `latest` in a manifest | Pin the exact version |
| Add an `index.ts` barrel file | Import from the file directly |
| Use `any` | Use `unknown` and narrow it |
| Reference an action by tag such as `@v4` | Pin the full commit SHA with a `# vX.Y.Z` comment |
| Add Tailwind or utility-class styling | Use StyleX `stylex.create` with `defineVars` tokens |
| Commit a dependency change without its lockfile | Commit `pnpm-lock.yaml` or `Cargo.lock` together with the manifest |
| Weaken a `tsconfig` strict flag to silence an error | Fix the type |
