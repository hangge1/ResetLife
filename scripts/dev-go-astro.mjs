import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const children = [];

function resolveGoCommand() {
  if (process.env.GO_BINARY) return process.env.GO_BINARY;
  if (process.platform !== "win32") return "go";

  const candidates = [
    resolve(process.env.USERPROFILE ?? "", "go", "bin", "go.cmd"),
    resolve(process.env.USERPROFILE ?? "", "sdk", "go-current", "bin", "go.exe"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? "go";
}

function resolveCommand(command, args) {
  if (process.platform === "win32" && command.endsWith(".cmd")) {
    return { command: "cmd.exe", args: ["/d", "/s", "/c", command, ...args] };
  }
  return { command, args };
}

function spawnProcess(label, command, args, options = {}) {
  const resolved = resolveCommand(command, args);
  const child = spawn(resolved.command, resolved.args, {
    cwd: options.cwd ?? projectRoot,
    env: { ...process.env, ...options.env },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);

  child.stdout.on("data", (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`[${label}] exited with ${signal ?? code}`);
    shutdown(code ?? 1);
  });

  return child;
}

let shuttingDown = false;
function shutdown(code = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
  setTimeout(() => process.exit(code), 300);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

spawnProcess("api", resolveGoCommand(), ["run", "./cmd/api"], {
  cwd: resolve(projectRoot, "server"),
  env: {
    API_ADDR: process.env.API_ADDR ?? "127.0.0.1:8080",
    DATA_DIR: process.env.DATA_DIR ?? resolve(projectRoot, "server", "data"),
  },
});

spawnProcess("web", process.platform === "win32" ? "npm.cmd" : "npm", ["--prefix", "web", "run", "dev"]);
