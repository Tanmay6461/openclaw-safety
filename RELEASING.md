# Releasing

Nothing in this repo publishes automatically. Each step below is run by hand, by the maintainer.

## Checklist
1. `npm ci && npm run typecheck && npm test`. Everything must pass.
2. Bump `version` in:
   - `packages/core/package.json`;
   - `packages/openclaw/package.json`, including its `@provenance-guard/core` dependency;
   - `packages/openclaw/openclaw.plugin.json`.

   Then update `CHANGELOG.md`.
3. If a new OpenClaw version was tested, update `openclaw.compat`, `openclaw.build` and `peerDependencies` in `packages/openclaw/package.json`.
4. Check what will ship: `npm run build`, then `(cd packages/core && npm pack --dry-run)` and `(cd packages/openclaw && npm pack --dry-run)`.
5. Publish core first, then the plugin. Both packages set `publishConfig.provenance`, so publish from CI with an OIDC-capable runner, or pass `--provenance` from a supported environment.

   ```bash
   (cd packages/core && npm publish)
   (cd packages/openclaw && npm publish)
   ```

   The `@provenance-guard` npm scope must be owned by the publishing account.
6. ClawHub: the plugin package already declares what OpenClaw's docs require for external publishes:
   - `openclaw.compat`, `openclaw.build` and `runtimeExtensions` in `package.json`;
   - `categories: ["security"]` in the manifest.

   Follow OpenClaw's plugin publishing docs (`docs/plugins/sdk-setup.md`) for the publish command.

## Notes
- **OpenClaw peer:** the peer dependency is marked optional (`peerDependenciesMeta`). Installing this repo never pulls OpenClaw itself into `node_modules`.
- **Test harnesses stay out of the repo:** the benchmark (`bench/`) and the Phase 0 cluster harnesses (`phase0/`) are kept on the maintainer's machine and the test cluster.
