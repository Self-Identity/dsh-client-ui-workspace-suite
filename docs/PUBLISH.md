# Release guide

How to cut a release of this package for the DSH client plugin market and, optionally, npm.

## 1. Pre-flight checks

```powershell
node tools/build.mjs          # rebuild lib/client.js from src/ and commit the result
npm test                      # manifest / styles / host / util / i18n / smoke
node tools/release.mjs --check
```

`--check` validates: package name, exact SemVer version, `private` not `true`, presence of `engines.dsh`, a real `dsh.bundle.patch`, the built `lib/index.js` and `lib/client.js`, `files` containing `lib`, README and LICENSE, the icon size (≤24 KiB raw, ≤32 KiB after base64), and that the build output is not older than `src/`.

## 2. Version and tag

1. Update `package.json` `version` and add the matching entry to `CHANGELOG.md`.
2. Commit, then tag the release commit:

```powershell
git tag -a v1.2.0 -m "dsh-client-ui-workspace-suite 1.2.0"
git push origin master
git push origin v1.2.0
```

Keep tags annotated and never move a tag that was already pushed; publish a new version instead.

## 3. Market index

The client plugin market (`@deepseek-ai/dsh-plugin-market`) reads a JSON index in **format 1** from the URL you configure. Each version entry points at a git commit or at npm.

Generate or merge an entry for the current commit:

```powershell
# git source only
node tools/release.mjs --index --repo https://github.com/<account>/dsh-client-ui-workspace-suite

# git source plus an npm entry
node tools/release.mjs --index --repo https://github.com/<account>/dsh-client-ui-workspace-suite --npm `
  --write market/plugin-market.json
```

Other options: `--commit <40-hex SHA>`, `--timestamp <unix seconds>`, `--version <semver>`. `--write` merges into the index file and keeps earlier version entries.

## 4. Hosting the index

- It must be a direct `http`/`https` URL that does not redirect (the client fetches with `redirect: "error"`).
- GitHub Pages (`https://<account>.github.io/<repo>/plugin-market.json`) or a `raw.githubusercontent.com` link both work.
- `title` is required; `plugins[].versions` must not be empty; `version` is exact SemVer; `publishTimestamp` is Unix **seconds**.

## 5. Adding the index in the client

- Plugins → **Discover / Market** → add the index URL, or
- configure the `plugin-market` row in the profile: `config.indexes: ["https://…/plugin-market.json"]`.

Git sources are installed at the exact commit, so do not rewrite a published commit.

## 6. npm (optional)

```powershell
npm login
npm publish --access public
```

- Check that the name is free first (`npm view <name>`).
- The generated index entry uses `{ "type": "npm" }` for the npm source.
- For a private registry, add `"registry": "https://…"` to the index entry.

## 7. Release checklist

- [ ] `npm test` is green
- [ ] `lib/` rebuilt and committed
- [ ] `node tools/release.mjs --check` passes
- [ ] version bumped and recorded in `CHANGELOG.md`
- [ ] `v<version>` tag pushed
- [ ] index entry updated to the new commit and pushed
- [ ] installed once from a clean state in the client and confirmed it runs
