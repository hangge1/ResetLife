import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const defaultRoot = "/www/wwwroot";

const args = new Set(process.argv.slice(2));
const skipRelease = args.has("--skip-release");
const dryRun = args.has("--dry-run");

const host = readRequiredEnv("DEPLOY_HOST", "cloud server host or public IP");
const user = readRequiredEnv("DEPLOY_USER", "SSH login username");
const deployRoot = process.env.DEPLOY_ROOT ?? defaultRoot;
const identityFile = process.env.DEPLOY_IDENTITY_FILE;
const sshPort = process.env.DEPLOY_PORT;
const explicitArchive = process.env.DEPLOY_ARCHIVE;
const currentLink = process.env.DEPLOY_CURRENT_LINK ?? `${deployRoot}/slimming-assistant-current`;
const appPort = process.env.DEPLOY_APP_PORT ?? "3000";
const restartApp = process.env.DEPLOY_RESTART !== "0";
const startScript = process.env.DEPLOY_START_SCRIPT ?? `start:bt:${appPort}`;
const dataRoot = process.env.DEPLOY_DATA_ROOT ?? `${deployRoot}/slimming-assistant-data`;
const sqlitePath = process.env.DEPLOY_SQLITE_PATH ?? `${dataRoot}/slimming-assistant.sqlite`;
const keepReleaseCount = readPositiveIntegerEnv("DEPLOY_KEEP_RELEASES", "3");
const ensureBtProject = restartApp && process.env.DEPLOY_BT_PROJECT !== "0";
const commandTimeoutMs = readPositiveIntegerEnv("DEPLOY_COMMAND_TIMEOUT_MS", "1800000");
const remotePrepareTimeoutSeconds = readPositiveIntegerEnv("DEPLOY_PREPARE_TIMEOUT_SECONDS", "900");
const remoteRestartTimeoutSeconds = readPositiveIntegerEnv("DEPLOY_RESTART_TIMEOUT_SECONDS", "120");

if (!/^\d{2,5}$/.test(appPort)) {
  throw new Error(`DEPLOY_APP_PORT must be a port number, received: ${appPort}`);
}

function readRequiredEnv(name, description) {
  const value = process.env[name]?.trim();

  if (value) {
    return value;
  }

  console.error(`Missing required environment variable: ${name}`);
  console.error(`Set ${name} to the ${description}.`);
  console.error("");
  console.error("PowerShell example:");
  console.error(`  $env:${name}=\"...\"`);
  console.error("");
  console.error("Bash example:");
  console.error(`  export ${name}=\"...\"`);
  console.error("");
  console.error("Do not commit server usernames, passwords, or private keys.");
  process.exit(1);
}

function readPositiveIntegerEnv(name, defaultValue) {
  const rawValue = process.env[name]?.trim() || defaultValue;

  if (!/^\d+$/.test(rawValue)) {
    throw new Error(`${name} must be a positive integer, received: ${rawValue}`);
  }

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be greater than or equal to 1, received: ${rawValue}`);
  }

  return value;
}

function resolveLocalCommand(command, commandArgs) {
  if (process.platform === "win32" && command === "npm") {
    return {
      executable: "cmd.exe",
      args: ["/d", "/s", "/c", command, ...commandArgs],
    };
  }

  return { executable: command, args: commandArgs };
}

function run(command, commandArgs, options = {}) {
  const printable = [command, ...commandArgs].join(" ");
  console.log(`\n$ ${printable}`);

  if (dryRun) {
    return;
  }

  const { executable, args } = resolveLocalCommand(command, commandArgs);
  const result = spawnSync(executable, args, {
    cwd: options.cwd ?? projectRoot,
    shell: false,
    stdio: "inherit",
    timeout: options.timeoutMs ?? commandTimeoutMs,
  });

  if (result.error) {
    console.error(result.error.message);
  }

  if (result.signal) {
    console.error(`${printable} was terminated by ${result.signal}.`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function getLatestReleaseArchive() {
  if (explicitArchive) {
    const archive = resolve(projectRoot, explicitArchive);
    if (!existsSync(archive)) {
      throw new Error(`DEPLOY_ARCHIVE does not exist: ${archive}`);
    }

    return archive;
  }

  const releasesRoot = resolve(projectRoot, "dist", "releases");
  if (!existsSync(releasesRoot)) {
    throw new Error("No release directory found. Run npm run release first.");
  }

  const archives = readdirSync(releasesRoot)
    .filter((name) => name.endsWith(".tar.gz") || name.endsWith(".zip"))
    .map((name) => {
      const path = resolve(releasesRoot, name);
      return { path, mtimeMs: statSync(path).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (archives.length === 0) {
    throw new Error("No release archive found. Run npm run release first.");
  }

  return archives[0].path;
}

function sshBaseArgs() {
  const base = [
    "-o",
    "ConnectTimeout=20",
    "-o",
    "ServerAliveInterval=10",
    "-o",
    "ServerAliveCountMax=3",
  ];

  if (identityFile) {
    base.push("-i", identityFile);
  }

  if (sshPort) {
    base.push("-p", sshPort);
  }

  return base;
}

function scpBaseArgs() {
  const base = [
    "-o",
    "ConnectTimeout=20",
    "-o",
    "ServerAliveInterval=10",
    "-o",
    "ServerAliveCountMax=3",
  ];

  if (identityFile) {
    base.push("-i", identityFile);
  }

  if (sshPort) {
    base.push("-P", sshPort);
  }

  return base;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

if (!skipRelease) {
  run("npm", ["run", "release"]);
}

const archivePath = getLatestReleaseArchive();
const archiveName = basename(archivePath);
const packageName = archiveName.replace(/\.tar\.gz$|\.zip$/u, "");
const remoteArchive = `${deployRoot}/${archiveName}`;
const remotePackageRoot = `${deployRoot}/${packageName}`;
const remote = `${user}@${host}`;

console.log("");
console.log(`Deploy target: ${remote}:${remotePackageRoot}`);
console.log(`Current link: ${currentLink}`);
console.log(`SQLite path: ${sqlitePath}`);
console.log(`Restart app: ${restartApp ? `yes, port ${appPort}` : "no"}`);
console.log(`Ensure BT project: ${ensureBtProject ? "yes" : "no"}`);
console.log(`Keep releases: ${keepReleaseCount}`);
console.log(`Archive: ${archivePath}`);
console.log(`Command timeout: ${commandTimeoutMs}ms`);

run("ssh", [...sshBaseArgs(), remote, `mkdir -p ${shellQuote(deployRoot)}`]);
run("scp", [...scpBaseArgs(), archivePath, `${remote}:${remoteArchive}`]);

const extractCommand = archiveName.endsWith(".tar.gz")
  ? `tar -xzf ${shellQuote(remoteArchive)} -C ${shellQuote(deployRoot)}`
  : `unzip -q -o ${shellQuote(remoteArchive)} -d ${shellQuote(deployRoot)}`;

const remoteCommand = [
  `set -e`,
  `echo "[deploy] extract archive"`,
  extractCommand,
  `rm -f ${shellQuote(remoteArchive)}`,
  `previous_release=$(readlink -f ${shellQuote(currentLink)} 2>/dev/null || true)`,
  `mkdir -p ${shellQuote(dataRoot)}`,
  `[ -f ${shellQuote(sqlitePath)} ] || ([ -f ${shellQuote(`${remotePackageRoot}/data/slimming-assistant.sqlite`)} ] && cp -p ${shellQuote(`${remotePackageRoot}/data/slimming-assistant.sqlite`)} ${shellQuote(sqlitePath)} || true)`,
  `if [ -n "$previous_release" ] && [ -d "$previous_release/node_modules" ] && [ ! -e ${shellQuote(`${remotePackageRoot}/node_modules`)} ]; then echo "[deploy] reuse node_modules from $previous_release"; cp -a "$previous_release/node_modules" ${shellQuote(`${remotePackageRoot}/node_modules`)}; else echo "[deploy] node_modules reuse skipped"; fi`,
  `cd ${shellQuote(remotePackageRoot)}`,
  `echo "[deploy] prepare runtime dependencies and database"`,
  `SQLITE_PATH=${shellQuote(sqlitePath)} timeout ${remotePrepareTimeoutSeconds}s npm run prepare:bt`,
  `echo "[deploy] switch current link"`,
  `ln -sfn ${shellQuote(remotePackageRoot)} ${shellQuote(currentLink)}`,
  `touch ${shellQuote(remotePackageRoot)}`,
  ...(restartApp
    ? [
        `echo "[deploy] stop existing app on port ${appPort}"`,
        `port_pids=$(ss -ltnp 2>/dev/null | sed -n 's/.*:${appPort} .*pid=\\([0-9][0-9]*\\).*/\\1/p' | sort -u)`,
        `for pid in $port_pids; do parent=$(ps -o ppid= -p "$pid" | tr -d ' '); kill "$pid" 2>/dev/null || true; if [ -n "$parent" ] && [ "$parent" != "1" ]; then kill "$parent" 2>/dev/null || true; fi; done`,
        `sleep 2`,
        `echo "[deploy] start app"`,
        `cd ${shellQuote(currentLink)}`,
        `(SQLITE_PATH=${shellQuote(sqlitePath)} nohup npm run ${shellQuote(startScript)} > .next-start.log 2>&1 &)`,
        `sleep 3`,
        `timeout ${remoteRestartTimeoutSeconds}s bash -lc "until ss -ltnp 2>/dev/null | grep -q ':${appPort}'; do sleep 2; done" || (tail -80 .next-start.log; exit 1)`,
      ]
    : []),
  `echo "[deploy] clean release archives and old directories"`,
  `find ${shellQuote(deployRoot)} -maxdepth 1 -type f \\( -name 'slimming-assistant-*.tar.gz' -o -name 'slimming-assistant-*.zip' \\) -delete`,
  `find ${shellQuote(deployRoot)} -maxdepth 1 -type d -name 'slimming-assistant-[0-9]*' -printf '%T@ %p\\n' | sort -rn | awk 'NR > ${keepReleaseCount} { sub(/^[^ ]+ /, ""); print }' | while IFS= read -r old_dir; do rm -rf -- "$old_dir"; done`,
  `echo`,
  `echo "Deployment prepared at ${remotePackageRoot}"`,
  `echo "Current link points to ${currentLink}"`,
  `echo "SQLite path is ${sqlitePath}"`,
  `echo "Kept latest ${keepReleaseCount} release directories under ${deployRoot}"`,
  restartApp
    ? `echo "App restarted on port ${appPort} with npm run ${startScript}"`
    : `echo "App restart skipped because DEPLOY_RESTART=0"`,
].join(" && ");

run("ssh", [...sshBaseArgs(), remote, remoteCommand]);

if (ensureBtProject) {
  run(process.execPath, ["scripts/ensure-bt-node-project.mjs"]);
}
