#!/usr/bin/env node
/*
 * Task runner for the cricket simulator. It uses only Node built-ins, so it runs the same
 * on macOS and Windows with the Node and pnpm the project already needs.
 *
 * Run `node scripts/tasks.mjs help` for the list of targets.
 */

import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendDir = path.join(root, "frontend");
const backendDir = path.join(root, "backend");
const isWindows = process.platform === "win32";

/** The worker-build version AGENTS.md approves. `install` installs only this version. */
const WORKER_BUILD_VERSION = "0.8.7";
const FRONTEND_PORT = 3000;
const WORKER_PORT = 8787;
const WORKER_URL = `http://localhost:${WORKER_PORT}`;

/**
 * Runs a command to completion, with its output shown in the terminal.
 *
 * @param {string} command - The program to run.
 * @param {string[]} args - Its arguments.
 * @param {string} cwd - The directory to run in.
 * @param {Record<string, string>} [env] - Extra environment variables.
 * @returns {Promise<void>} Resolves on exit code 0, and rejects otherwise.
 */
function run(command, args, cwd, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: "inherit",
      shell: isWindows,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`\`${[command, ...args].join(" ")}\` exited with ${code}.`));
      }
    });
  });
}

/**
 * Starts a long-running command. On macOS it gets its own process group, so stopping it also
 * stops the children it spawns (wrangler starts workerd). On Windows, `stop` uses taskkill.
 *
 * @param {string} label - The name shown in the output.
 * @param {string[]} args - The pnpm arguments.
 * @param {string} cwd - The directory to run in.
 * @param {Record<string, string>} [env] - Extra environment variables.
 * @returns {{ label: string, child: import("node:child_process").ChildProcess }}
 */
function start(label, args, cwd, env = {}) {
  const child = spawn("pnpm", args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit",
    shell: isWindows,
    detached: !isWindows,
  });
  return { label, child };
}

/**
 * Stops a started command and everything it spawned. Does nothing if it has already exited.
 *
 * @param {import("node:child_process").ChildProcess} child - The process to stop.
 */
function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  if (isWindows) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // The group has already gone.
    }
  }
}

/**
 * Keeps several started commands running together. When one exits, or the user presses
 * Ctrl-C, every other one is stopped too, so no process keeps a port.
 *
 * @param {{ label: string, child: import("node:child_process").ChildProcess }[]} processes
 * @returns {Promise<number>} The exit code to use.
 */
function supervise(processes) {
  return new Promise((resolve) => {
    let finished = false;
    const shutdown = (code) => {
      if (finished) {
        return;
      }
      finished = true;
      for (const { child } of processes) {
        stop(child);
      }
      resolve(code);
    };
    for (const { label, child } of processes) {
      child.on("exit", (code) => {
        console.log(`[${label}] exited with ${code}. Stopping the others.`);
        shutdown(code ?? 1);
      });
    }
    process.on("SIGINT", () => shutdown(0));
    process.on("SIGTERM", () => shutdown(0));
  });
}

/**
 * Checks whether a TCP port can be bound, which means nothing else is using it.
 *
 * @param {number} port - The port to check.
 * @returns {Promise<boolean>} True when the port is free.
 */
function portIsFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port);
  });
}

/**
 * Fails with a clear message when a port is taken. The script never picks another port,
 * because the frontend's CORS origin and API URL depend on fixed ones.
 *
 * @param {number} port - The port that must be free.
 * @throws {Error} When something already uses the port.
 */
async function requirePortFree(port) {
  if (!(await portIsFree(port))) {
    throw new Error(
      `Port ${port} is already in use. Stop the process using it and try again.`,
    );
  }
}

/**
 * Whether anything answers on the Worker's port. Any HTTP response counts, since the
 * Worker answers unknown routes with a JSON refusal.
 *
 * @returns {Promise<boolean>} True when the Worker is answering.
 */
async function workerIsAnswering() {
  try {
    await fetch(WORKER_URL, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
}

/**
 * Waits for a started Worker to answer, and fails early if it exits first.
 *
 * @param {import("node:child_process").ChildProcess} child - The wrangler process.
 * @param {number} timeoutMs - How long to wait before giving up.
 * @throws {Error} When the Worker exits or does not answer in time.
 */
async function waitForWorker(child, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`The Worker exited before it answered (exit ${child.exitCode}).`);
    }
    if (await workerIsAnswering()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("The Worker did not answer within two minutes.");
}

/**
 * Fails with the fix when `worker-build` is missing, since wrangler needs it to build.
 *
 * @throws {Error} When `worker-build` is not on the PATH.
 */
function requireWorkerBuild() {
  const probe = spawnSync("worker-build", ["--version"], {
    shell: isWindows,
    encoding: "utf8",
  });
  if (probe.status !== 0) {
    throw new Error("worker-build is not installed. Run `node scripts/tasks.mjs install` first.");
  }
}

/** Installs dependencies, and worker-build at the pinned version if it is missing. */
async function install() {
  await run("pnpm", ["install"], frontendDir);
  await run("pnpm", ["install"], backendDir);
  const probe = spawnSync("worker-build", ["--version"], {
    shell: isWindows,
    encoding: "utf8",
  });
  if (probe.status === 0) {
    console.log(`worker-build is already installed (${probe.stdout.trim()}). Leaving it alone.`);
  } else {
    await run(
      "cargo",
      ["install", "worker-build", "--version", WORKER_BUILD_VERSION, "--locked"],
      backendDir,
    );
  }
  return 0;
}

/** Runs the Worker and the frontend against it, live. Ctrl-C stops both. */
async function dev() {
  await requirePortFree(FRONTEND_PORT);
  await requirePortFree(WORKER_PORT);
  requireWorkerBuild();
  const worker = start("worker", ["exec", "wrangler", "dev"], backendDir);
  const frontend = start("frontend", ["dev"], frontendDir, {
    NEXT_PUBLIC_API_MODE: "http",
    NEXT_PUBLIC_API_URL: WORKER_URL,
  });
  console.log(`Frontend: http://localhost:${FRONTEND_PORT}  Worker: ${WORKER_URL}`);
  return supervise([worker, frontend]);
}

/** Runs the frontend alone, on mock data. */
async function devMock() {
  await requirePortFree(FRONTEND_PORT);
  const frontend = start("frontend", ["dev"], frontendDir, {
    NEXT_PUBLIC_API_MODE: "mock",
  });
  console.log(`Frontend (mock data): http://localhost:${FRONTEND_PORT}`);
  return supervise([frontend]);
}

/** Runs the Worker alone. */
async function backendDev() {
  await requirePortFree(WORKER_PORT);
  requireWorkerBuild();
  return supervise([start("worker", ["exec", "wrangler", "dev"], backendDir)]);
}

/** Runs the frontend alone, pointed at the Worker. */
async function frontendDev() {
  await requirePortFree(FRONTEND_PORT);
  const frontend = start("frontend", ["dev"], frontendDir, {
    NEXT_PUBLIC_API_MODE: "http",
    NEXT_PUBLIC_API_URL: WORKER_URL,
  });
  return supervise([frontend]);
}

/** Runs every unit test: the frontend's Vitest suite and the Rust tests. */
async function test() {
  await run("pnpm", ["exec", "vitest", "run"], frontendDir);
  await run("cargo", ["test"], backendDir);
  return 0;
}

/**
 * Runs every check AGENTS.md requires before a task is done. It stops at the first failure.
 */
async function check() {
  await run("pnpm", ["lint"], frontendDir);
  await run("pnpm", ["exec", "tsc", "--noEmit"], frontendDir);
  await run("cargo", ["fmt", "--check"], backendDir);
  await run("cargo", ["clippy", "--", "-D", "warnings"], backendDir);
  await run("cargo", ["test"], backendDir);
  await run("pnpm", ["exec", "vitest", "run"], frontendDir);
  return 0;
}

/**
 * Runs the contract suite against the Worker. It reuses a Worker that is already answering,
 * and otherwise starts its own and stops it afterwards.
 */
async function testContract() {
  const contract = () =>
    run(
      "pnpm",
      ["exec", "vitest", "run", "src/services/game-api"],
      frontendDir,
      { API_CONTRACT_URL: WORKER_URL },
    );

  if (await workerIsAnswering()) {
    console.log(`Reusing the Worker already running on ${WORKER_URL}.`);
    await contract();
    return 0;
  }

  await requirePortFree(WORKER_PORT);
  requireWorkerBuild();
  const worker = start("worker", ["exec", "wrangler", "dev"], backendDir);
  try {
    await waitForWorker(worker.child, 120_000);
    await contract();
    return 0;
  } finally {
    stop(worker.child);
  }
}

/** Builds the frontend for production. */
async function build() {
  await run("pnpm", ["build"], frontendDir);
  return 0;
}

/** Lists the targets. */
function help() {
  console.log(`Usage: node scripts/tasks.mjs <target>

Setup
  install          Install frontend and backend dependencies, and worker-build if missing

Run
  dev              Frontend and Worker together, live (Ctrl-C stops both)
  dev-mock         Frontend alone, on mock data
  backend-dev      The Worker alone
  frontend-dev     The frontend alone, pointed at the Worker

Check
  test             Vitest and cargo test
  check            Every check AGENTS.md requires (lint, types, fmt, clippy, tests)
  test-contract    The contract suite against the Worker

Build
  build            Production build of the frontend
  help             This list`);
  return 0;
}

const targets = new Map([
  ["install", install],
  ["dev", dev],
  ["dev-mock", devMock],
  ["backend-dev", backendDev],
  ["frontend-dev", frontendDev],
  ["test", test],
  ["check", check],
  ["test-contract", testContract],
  ["build", build],
  ["help", help],
]);

const name = process.argv[2] ?? "help";
const target = targets.get(name);
if (!target) {
  console.error(`Unknown target "${name}". Run: node scripts/tasks.mjs help`);
  process.exit(2);
}

try {
  process.exit(await target());
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
