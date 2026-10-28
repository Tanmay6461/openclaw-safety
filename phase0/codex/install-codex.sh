#!/usr/bin/env bash
# Installs @openclaw/codex@2026.10.8 (pins @openai/codex 0.160.0) beside openclaw in /pg/oc and checks
# that the Codex binary resolves the way OpenClaw resolves it (managed-binary.ts:216-234). Run where
# setup.sh ran (needs the npm registry): bash /scratch/$USER/pg/codex/install-codex.sh
#
# The /pg/oc copy is for this check, the npm cache, and inner.sh's CODEX_INSTALL=link fallback. It
# cannot be loaded through plugins.load.paths (NOTES.md §2), so the script also runs a throwaway
# `openclaw plugins install` (the path inner.sh uses by default) and shows its origin. MANAGED_CHECK=0 skips it.
#
# --ignore-scripts would not break the binary: neither @openai/codex nor its platform packages have
# install scripts (the binary ships inside the os/cpu-gated optional dependency
# @openai/codex-linux-x64), and OpenClaw's own managed installs always pass --ignore-scripts
# (docs/cli/plugins/install.md:215). What does break it: --omit=optional / --no-optional, or
# installing on a different OS/arch than the one that runs it.
set -euo pipefail
PG=${PG:-/scratch/$USER/pg}
SPEC=${CODEX_SPEC:-@openclaw/codex@2026.10.8}
OC=/pg/oc/node_modules/.bin/openclaw

run() {
  apptainer exec --containall --cleanenv \
    --home "$PG/home:/home/pg" --workdir "$PG/apptainer-work" --bind "$PG":/pg --pwd /pg \
    --env npm_config_cache=/pg/npm-cache \
    "$PG/images/node24.sif" "$@"
}

echo "== npm install $SPEC into /pg/oc"
run bash -c "cd /pg/oc && npm install --no-audit --no-fund $SPEC"
echo "== openclaw still $(run bash -c 'cd /pg/oc && npx --no-install openclaw --version')"

# Same resolution as OpenClaw: @openai/codex/bin/codex.js from the plugin root (must be executable),
# then codex.js picks @openai/codex-<os>-<arch>/vendor/<triple>/bin/codex (codex-cli/bin/codex.js:79-110).
read -r -d '' CHECK <<'JS' || true
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const root = process.argv.slice(1).find((a) => a !== "--");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const launcher = createRequire(path.join(root, "package.json")).resolve("@openai/codex/bin/codex.js");
const codexPkg = JSON.parse(fs.readFileSync(path.join(path.dirname(launcher), "..", "package.json"), "utf8"));
const target = `${process.platform}-${process.arch}`;
const triple = { "linux-x64": "x86_64-unknown-linux-musl", "linux-arm64": "aarch64-unknown-linux-musl" }[target];
const platformPkg = `@openai/codex-${target}`;
let vendor;
try {
  vendor = path.join(path.dirname(createRequire(launcher).resolve(`${platformPkg}/package.json`)), "vendor");
} catch {
  vendor = path.join(path.dirname(launcher), "..", "vendor");
}
const bin = path.join(vendor, triple ?? "unknown-triple", "bin", "codex");
const executable = (p) => {
  try {
    fs.accessSync(p, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
};
const report = {
  plugin: `${pkg.name}@${pkg.version}`,
  pluginExtensions: pkg.openclaw?.extensions,
  pluginScripts: pkg.scripts ?? null,
  codexPackage: `${codexPkg.name}@${codexPkg.version}`,
  codexScripts: codexPkg.scripts ?? null,
  launcher,
  launcherExecutable: executable(launcher),
  platformPkg,
  binary: bin,
  binaryExists: fs.existsSync(bin),
  binaryExecutable: executable(bin),
};
console.error(JSON.stringify(report, null, 2));
if (!report.binaryExists || !report.launcherExecutable) process.exit(1);
console.log(bin);
JS

echo "== binary check"
BIN=$(run node -e "$CHECK" /pg/oc/node_modules/@openclaw/codex)
echo "== $(run "$BIN" --version)   (expected: codex-cli 0.160.0)"

if [ "${MANAGED_CHECK:-1}" = 1 ]; then
  echo "== managed install check in a throwaway state dir (/pg/codex-install-check)"
  rm -rf "$PG/codex-install-check" && mkdir -p "$PG/codex-install-check/state"
  echo '{}' > "$PG/codex-install-check/state/openclaw.json"
  run env OPENCLAW_STATE_DIR=/pg/codex-install-check/state OPENCLAW_CONFIG_PATH=/pg/codex-install-check/state/openclaw.json \
    bash -c "$OC plugins install $SPEC --pin || $OC plugins install npm:$SPEC --pin --force; $OC plugins inspect codex --json"
  echo "== managed copy of the binary:"
  run bash -c 'find /pg/codex-install-check/state \( -path "*node_modules/@openai/codex/bin/codex.js" -o -path "*/vendor/*/bin/codex" \) -print | head -5'
fi
echo "== done"
