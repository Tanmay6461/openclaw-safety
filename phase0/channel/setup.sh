#!/usr/bin/env bash
# Phase 0 channel setup: builds the private qa-channel plugin from a v2026.10.8 source checkout as an
# "installed-candidate fixture" (docs/channels/qa-channel.md) for the npm install at /pg/oc, and bundles
# qa-lab's QA bus server as a standalone script. Nothing is installed globally; all state is in $PG.
#
#   login node:   bash setup.sh clone
#   compute node: srun --jobid=<id> --overlap -n1 bash setup.sh install|fixture|bus   (each runs in Apptainer)
set -euo pipefail
PG=${PG:-/scratch/$USER/pg}
STAGE=${1:?stage: clone|install|fixture|bus}
TAG=v2026.10.8

# Same isolation as phase0/cluster/run-phase0.sh. Explorer's http(s)_proxy leaks through --cleanenv;
# it is kept for downloads (corepack, pnpm), with loopback excluded.
run() {
  apptainer exec --containall --cleanenv \
    --home "$PG/home:/home/pg" --workdir "$PG/apptainer-work" --bind "$PG":/pg --pwd /pg/src \
    --env npm_config_cache=/pg/npm-cache --env COREPACK_ENABLE_STRICT=0 --env CI=1 \
    --env NO_PROXY=127.0.0.1,localhost,::1 --env no_proxy=127.0.0.1,localhost,::1 \
    "$PG/images/node24.sif" bash -c "$1"
}
# corepack's fetch ignores http(s)_proxy here (connect timeout), so pnpm comes from npm, which honors it.
PNPM=/pg/tools/node_modules/.bin/pnpm

case "$STAGE" in
  clone)
    # Shallow checkout of the tag (≈1 GB on scratch; the checkout itself takes ~40 min on this FS).
    [ -d "$PG/src/.git" ] || git clone --depth 1 --branch "$TAG" https://github.com/openclaw/openclaw.git "$PG/src"
    git -C "$PG/src" log -1 --format='%H %s'
    ;;
  install)
    run "mkdir -p /pg/tools && cd /pg/tools && { [ -f package.json ] || npm init -y >/dev/null; } && \
      npm install --no-audit --no-fund pnpm@12.15.0 >/dev/null && $PNPM --version"
    # Dependencies for the root package, qa-channel and qa-lab only (and their workspace deps).
    # --ignore-scripts: no lifecycle scripts (git hooks, native postinstalls) are needed for the build.
    run "$PNPM --version && $PNPM install --frozen-lockfile --ignore-scripts --store-dir /pg/pnpm-store \
      --filter openclaw... --filter @openclaw/qa-channel... --filter @openclaw/qa-lab... 2>&1 | tail -40"
    ;;
  fixture)
    # docs/channels/qa-channel.md "Installed-candidate fixtures", for qa-channel only (qa-lab's Gateway
    # plugin is not needed; its bus server is bundled separately below). The fixture is extracted under
    # /pg/oc so the plugin's peer import of openclaw/plugin-sdk/* resolves to the installed candidate.
    run '
      set -euo pipefail
      fixture_root=/pg/work/qa-fixture
      rm -rf "$fixture_root" && mkdir -p "$fixture_root/artifacts"
      git archive HEAD extensions/qa-channel | tar -x -C "$fixture_root"
      node scripts/lib/plugin-npm-runtime-build.mjs "$fixture_root/extensions/qa-channel" --qa-gateway-fixture
      OPENCLAW_PLUGIN_NPM_BUNDLE_DEPENDENCIES=1 node scripts/lib/plugin-npm-package-manifest.mjs \
        --run "$fixture_root/extensions/qa-channel" --qa-gateway-fixture -- \
        npm pack --pack-destination "$fixture_root/artifacts"
      ls -la "$fixture_root/artifacts"
      dest=/pg/oc/fixtures/qa-channel
      rm -rf "$dest" && mkdir -p "$dest"
      tar -xzf "$fixture_root"/artifacts/*.tgz -C "$dest" --strip-components=1
      ls "$dest" && cat "$dest/package.json" | head -40
    '
    ;;
  bus)
    # qa-lab's in-repo QA bus (extensions/qa-lab/src/bus-server.ts) bundled into one ESM file with the
    # repo's esbuild. The plugin-sdk subpaths the installed candidate exports stay external and resolve to
    # /pg/oc; qa-channel-protocol (excluded from the npm package) is bundled from source.
    run '
      set -euo pipefail
      cat > /pg/work/qa-bus-entry.ts <<EOF
import { createQaBusState, startQaBusServer } from "/pg/src/extensions/qa-lab/bus-api.ts";
const port = Number(process.env.QA_BUS_PORT ?? 0);
const bus = await startQaBusServer({ state: createQaBusState(), port });
console.log(JSON.stringify({ ready: true, baseUrl: bus.baseUrl }));
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, async () => { await bus.stop(); process.exit(0); });
EOF
      ESBUILD=$(node -e "console.log(require.resolve(\"esbuild/bin/esbuild\", {paths:[\"/pg/src\"]}))" 2>/dev/null || find /pg/src/node_modules/.pnpm -path "*esbuild@*/node_modules/esbuild/bin/esbuild" | head -1)
      "$ESBUILD" /pg/work/qa-bus-entry.ts --bundle --platform=node --format=esm --target=node24 \
        --tsconfig=/pg/src/tsconfig.json --external:zod \
        $(for m in error-runtime number-runtime string-coerce-runtime webhook-ingress webhook-request-guards; do printf -- "--external:openclaw/plugin-sdk/%s " $m; done) \
        --outfile=/pg/oc/fixtures/qa-bus.mjs \
        --banner:js="import{createRequire as __cr}from\"node:module\";const require=__cr(import.meta.url);"
      ls -la /pg/oc/fixtures/qa-bus.mjs
    '
    ;;
  *) echo "unknown stage $STAGE" >&2; exit 2 ;;
esac
