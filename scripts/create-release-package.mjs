import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = await import("../package.json", { with: { type: "json" } });
const withData = process.argv.includes("--with-data");

const timestamp = new Date()
  .toISOString()
  .replaceAll("-", "")
  .replaceAll(":", "")
  .replace(/\.\d{3}Z$/, "");
const packageBaseName = `${packageJson.default.name}-${packageJson.default.version}-${timestamp}`;
const distRoot = resolve(projectRoot, "dist");
const releasesRoot = resolve(distRoot, "releases");
const stagingRoot = resolve(distRoot, "release-staging");
const packageRoot = resolve(stagingRoot, packageBaseName);

const includeEntries = [
  "app",
  "components",
  "db",
  "features",
  "lib",
  "scripts",
  "components.json",
  "drizzle.config.ts",
  "eslint.config.mjs",
  "LICENSE",
  "next-env.d.ts",
  "next.config.ts",
  "package-lock.json",
  "package.json",
  "postcss.config.mjs",
  "README.md",
  "tsconfig.json",
];

const optionalEntries = [".env.example"];

if (withData) {
  includeEntries.push("data");
}

function assertInside(parent, target) {
  const parentPath = resolve(parent);
  const targetPath = resolve(target);
  const targetRelative = relative(parentPath, targetPath);

  if (targetRelative.startsWith("..") || targetRelative === "" || targetRelative.includes(`..${pathSeparator()}`)) {
    throw new Error(`Refusing to operate outside ${parentPath}: ${targetPath}`);
  }
}

function pathSeparator() {
  return process.platform === "win32" ? "\\" : "/";
}

function copyEntry(entry) {
  const source = resolve(projectRoot, entry);
  const target = resolve(packageRoot, entry);

  if (!existsSync(source)) {
    throw new Error(`Required release entry is missing: ${entry}`);
  }

  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, {
    recursive: true,
    filter: (sourcePath) => {
      const name = basename(sourcePath);
      return ![
        ".next",
        ".git",
        "node_modules",
        "dist",
        "coverage",
        ".ui-screenshots",
        ".next-dev-logs",
      ].includes(name);
    },
  });
}

function copyOptionalEntry(entry) {
  if (existsSync(resolve(projectRoot, entry))) {
    copyEntry(entry);
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? projectRoot,
    shell: false,
    stdio: "inherit",
  });

  return result.status === 0;
}

function createArchive() {
  mkdirSync(releasesRoot, { recursive: true });

  if (process.platform === "win32") {
    const archivePath = resolve(releasesRoot, `${packageBaseName}.zip`);
    const psCommand = [
      "Compress-Archive",
      "-Path",
      JSON.stringify(join(packageRoot, "*")),
      "-DestinationPath",
      JSON.stringify(archivePath),
      "-Force",
    ].join(" ");

    if (run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psCommand])) {
      return archivePath;
    }
  }

  const zipPath = resolve(releasesRoot, `${packageBaseName}.zip`);
  if (run("zip", ["-qr", zipPath, packageBaseName], { cwd: stagingRoot })) {
    return zipPath;
  }

  const tarPath = resolve(releasesRoot, `${packageBaseName}.tar.gz`);
  if (run("tar", ["-czf", tarPath, packageBaseName], { cwd: stagingRoot })) {
    return tarPath;
  }

  throw new Error("Could not create archive. Install zip/tar, or run this script on Windows with PowerShell.");
}

function listTopLevelEntries(root) {
  return readdirSync(root).map((entry) => {
    const entryPath = join(root, entry);
    return statSync(entryPath).isDirectory() ? `${entry}/` : entry;
  });
}

assertInside(distRoot, stagingRoot);
rmSync(stagingRoot, { recursive: true, force: true });
mkdirSync(packageRoot, { recursive: true });

for (const entry of includeEntries) {
  copyEntry(entry);
}

for (const entry of optionalEntries) {
  copyOptionalEntry(entry);
}

const archivePath = createArchive();
const packageContents = listTopLevelEntries(packageRoot);
rmSync(stagingRoot, { recursive: true, force: true });

console.log("");
console.log(`Release package created: ${archivePath}`);
console.log(`Included data directory: ${withData ? "yes" : "no"}`);
console.log("Top-level package contents:");
for (const entry of packageContents) {
  console.log(`- ${entry}`);
}
