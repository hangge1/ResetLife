import { spawn } from "node:child_process";

process.env.SECURE_COOKIES ??= "false";

const child = spawn(
  "npx",
  ["next", "start", "-H", "0.0.0.0", "-p", "3000"],
  {
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
