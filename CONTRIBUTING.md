# Contributing

This guide gets you from a fresh clone to a running game, with tests passing, on macOS or Windows. Read [AGENTS.md](AGENTS.md) before changing code: it sets the rules every change must follow.

## 1. Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| Git | any recent | Clone the repo |
| Node.js | 20.9 or newer (developed on 24) | Next.js 16 and Wrangler |
| pnpm | 12 (pinned by `frontend/package.json`) | Frontend and Worker tooling |
| Rust | 1.85 or newer, via [rustup](https://rustup.rs) | The `cricket-core` and `cricket-worker` crates use edition 2024 |

You don't need a Cloudflare account to run the game locally. Wrangler runs the Worker on your machine.

Install pnpm with `corepack enable` (Node ships corepack), or with `npm install -g pnpm`.

On Windows, use PowerShell or Windows Terminal. The task runner doesn't need `make`, `bash`, or WSL.

## 2. Clone and set up

```bash
git clone https://github.com/hari-houdini/cricket-simulator.git
cd cricket-simulator
node scripts/tasks.mjs install
```

`install` does three things:

- runs `pnpm install` in `frontend/`
- runs `pnpm install` in `backend/`, which brings in Wrangler
- installs `worker-build` 0.8.7 with `cargo install --locked` if it's missing. This step can take a few minutes the first time.

It never upgrades a `worker-build` you already have.

## 3. Run the game

From the repo root:

| What you want | Command | Open |
|---------------|---------|------|
| The whole game, live (frontend and Worker) | `node scripts/tasks.mjs dev` | http://localhost:3000 |
| Frontend only, on mock data (no backend needed) | `node scripts/tasks.mjs dev-mock` | http://localhost:3000 |
| Worker only | `node scripts/tasks.mjs backend-dev` | http://localhost:8787 |
| Frontend pointed at a Worker you already started | `node scripts/tasks.mjs frontend-dev` | http://localhost:3000 |

Press Ctrl-C in the terminal to stop. `dev` stops both processes together.

Use `dev-mock` for UI work. The mock keeps lobbies in memory, so a page refresh resets them. Use `dev` when you need the Rust rules or the real API.

## 4. Test and check

```bash
node scripts/tasks.mjs test            # Vitest and cargo test
node scripts/tasks.mjs check           # everything AGENTS.md requires, stops at the first failure
node scripts/tasks.mjs test-contract   # the API contract suite against the Worker
node scripts/tasks.mjs build           # production frontend build
```

Run `check` before you open a pull request. A change isn't done until it passes. `check` runs:

- `pnpm lint` (Biome)
- `pnpm exec tsc --noEmit`
- `cargo fmt --check`
- `cargo clippy -- -D warnings`
- `cargo test`
- `pnpm exec vitest run`

`test-contract` runs the same API scenarios against the mock and against the Worker. If a Worker is already running on port 8787, it uses that one. Otherwise it starts one and stops it afterwards.

To see every target, run `node scripts/tasks.mjs help`.

## 5. Ports

- `dev`, `dev-mock` and `frontend-dev` need port **3000**.
- `dev`, `backend-dev` and `test-contract` need port **8787**.

If a port is busy, the script stops and says which one. It never picks another, because the Worker's allowed origin and the frontend's API URL depend on these numbers.

## 6. Troubleshooting

- **`worker-build is not installed`**: run `node scripts/tasks.mjs install`.
- **`Port 3000 is already in use`** (or 8787): something else is running on that port. Find it, stop it, and run the command again. On macOS, `lsof -nP -iTCP:3000 -sTCP:LISTEN` shows the process. On Windows, `netstat -ano | findstr :3000` does.
- **Stale or odd Worker behaviour after a Rust change**: stop `dev`, then start it again. Wrangler rebuilds the Worker on each start.
- **pnpm skips a build script in `backend/`**: `workerd` is allowed in `backend/pnpm-workspace.yaml`, and Wrangler needs it. Don't remove it.
- **Lobbies vanish when you refresh**: that's expected in `dev-mock`, where state lives in memory. `dev` keeps lobbies in Durable Objects.

## 7. Making a change

1. Create a branch from `main`.
2. Make the change, following [AGENTS.md](AGENTS.md) and the design docs it names.
3. Run `node scripts/tasks.mjs check` until it passes.
4. Commit with a Conventional Commits message, such as `feat(frontend): ...` or `fix(cricket): ...`.
5. Open a pull request against `main`.

Domain terms come from [GLOSSARY.md](GLOSSARY.md). Use them in code, comments and UI copy, and avoid the synonyms it lists.

## Where things are

- `frontend/`: Next.js app, shared types, services, and the mock API
- `backend/`: Rust crates and the Wrangler config
- `scripts/tasks.mjs`: the task runner
- `docs/`: game design, specs, ADRs, UI specs
- `ARCHITECTURE.md`: system design
