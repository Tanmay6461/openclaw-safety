#!/usr/bin/env bash
# Builds a self-contained, path-loadable plugin directory: the adapter, core, and core's only
# runtime dependency (tldts). Usage: bundle.sh <outDir>
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
OUT=${1:?usage: bundle.sh <outDir>}
(cd "$ROOT" && npm run build >/dev/null)
rm -rf "$OUT"
mkdir -p "$OUT/node_modules/@provenance-guard"
cp "$ROOT/packages/openclaw/openclaw.plugin.json" "$ROOT/packages/openclaw/package.json" "$OUT/"
cp -R "$ROOT/packages/openclaw/dist" "$OUT/dist"
mkdir -p "$OUT/node_modules/@provenance-guard/core"
cp "$ROOT/packages/core/package.json" "$OUT/node_modules/@provenance-guard/core/"
cp -R "$ROOT/packages/core/dist" "$OUT/node_modules/@provenance-guard/core/dist"
for dep in tldts tldts-core; do cp -R "$ROOT/node_modules/$dep" "$OUT/node_modules/$dep"; done
find "$OUT" -name "*.map" -delete
echo "bundle: $OUT ($(du -sh "$OUT" | cut -f1))"
