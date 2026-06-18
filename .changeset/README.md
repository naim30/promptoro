# Changesets

This folder is the staging area for the next npm release of `promptoro`. Each `.md` file in here describes one change that hasn't been released yet. When you merge to `main`, GitHub Actions reads these files, bumps the version, writes `CHANGELOG.md`, and publishes to npm — automatically.

You don't write these files by hand. The `changeset` CLI walks you through it.

## Adding a changeset (the only command you run regularly)

```sh
npx changeset
```

The CLI will ask:

1. **Which packages are affected?** — just `promptoro` (single-package repo).
2. **What kind of version bump?**
   - `patch` → bug fix, doc update, internal refactor. No API change.
   - `minor` → new feature, additive API. Backwards-compatible.
   - `major` → breaking change. Removed/renamed an export, changed a function signature, changed YAML schema.
3. **One-line summary** — what users will see in the changelog. Write it from the user's perspective.

A new file like `.changeset/quiet-monkeys-spin.md` shows up. Commit it alongside your code change.

## What happens on merge to `main`

The `release.yml` workflow (in `.github/workflows/`) does this automatically:

1. Sees one or more pending changesets.
2. Opens a **"Version Packages"** pull request that:
   - Bumps `package.json` version based on the highest-severity changeset.
   - Writes/updates `CHANGELOG.md` with the summaries.
   - Deletes the consumed `.md` files from `.changeset/`.
3. When **you** merge that PR, the workflow runs `npx changeset publish`, which pushes the new version to npm with provenance.

No manual `npm version`, no manual `npm publish`, no tagging.

## Less-common commands

| Command | What it does |
|---|---|
| `npx changeset status` | Lists pending changesets and what bump they imply. |
| `npx changeset version` | Bumps `package.json` + writes changelog **locally** (CI runs this for you — only use locally if debugging). |
| `npx changeset publish` | Publishes to npm (CI runs this for you). |
| `npx changeset add --empty` | Adds an empty changeset — useful when CI complains about a PR with no changeset but the change is trivial. |

## Config

The behavior knobs live in `.changeset/config.json`. For a single-package library like this one, the defaults are correct and you shouldn't need to touch it.

## Reference

- Changesets docs: https://github.com/changesets/changesets
- The GitHub Action used by `release.yml`: https://github.com/changesets/action
