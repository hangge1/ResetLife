import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const staticDir = resolve(projectRoot, "web", "dist");
const portArgIndex = process.argv.indexOf("--port");
const port = portArgIndex >= 0 ? process.argv[portArgIndex + 1] : "";
const defaultAddr = port ? `0.0.0.0:${port}` : "127.0.0.1:8080";

if (!existsSync(resolve(staticDir, "index.html"))) {
  console.error("Missing Astro build output: web/dist/index.html");
  console.error("Run npm run build before npm run start.");
  process.exit(1);
}

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

const goCommand = resolveCommand(resolveGoCommand(), ["run", "./cmd/api"]);
const child = spawn(goCommand.command, goCommand.args, {
  cwd: resolve(projectRoot, "server"),
  env: {
    ...process.env,
    API_ADDR: process.env.API_ADDR ?? defaultAddr,
    DATA_DIR: process.env.DATA_DIR ?? resolve(projectRoot, "server", "data"),
    STATIC_DIR: process.env.STATIC_DIR ?? staticDir,
  },
  shell: false,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());
