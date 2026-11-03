# Releasing

Publishing starts only when the maintainer pushes a version tag (npm) or runs the ClawHub publish by hand.

## Checklist
1. `npm ci && npm run typecheck && npm test`. Everything must pass.
2. Bump `version` in:
   - `packages/core/package.json`;
   - `packages/openclaw/package.json`, including its `@provenance-guard/core` dependency;
   - `packages/openclaw/openclaw.plugin.json`.

   Then update `CHANGELOG.md`.
3. If a new OpenClaw version was tested, update `openclaw.compat`, `openclaw.build` and `peerDependencies` in `packages/openclaw/package.json`.
4. Check what will ship: `npm run build`, then `(cd packages/core && npm pack --dry-run)` and `(cd packages/openclaw && npm pack --dry-run)`.
5. npm: commit, then push a tag matching the version (`git tag v0.1.0-beta.0 && git push origin v0.1.0-beta.0`). The `Release` workflow (`.github/workflows/release.yml`) checks the tag against every version, runs the tests, publishes core and then the plugin with npm provenance, and creates a GitHub release. Prereleases go to the `beta` dist-tag, and `latest` points at the newest beta until a stable release exists.
   - Needs the repo secret `NPM_TOKEN`: an npm granular access token with read and write access to the `@provenance-guard` scope.
6. ClawHub, from `packages/openclaw` after the build, with the standalone `clawhub` CLI (`npm i -g clawhub`, then `clawhub login`):

   ```bash
   clawhub package publish packages/openclaw --family code-plugin --version <version> --source-repo Tanmay6461/openclaw-safety --source-commit <sha> --dry-run
   ```

   Then run it again without `--dry-run`. The package already declares what ClawHub requires: `openclaw.compat`, `openclaw.build` and `runtimeExtensions` in `package.json`, and `categories` in the manifest.

## Notes
- **OpenClaw peer:** the peer dependency is marked optional (`peerDependenciesMeta`). Installing this repo never pulls OpenClaw itself into `node_modules`.
- **Test harnesses stay out of the repo:** the benchmark (`bench/`) and the Phase 0 cluster harnesses (`phase0/`) are kept on the maintainer's machine and the test cluster.
