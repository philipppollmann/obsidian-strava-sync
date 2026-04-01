# Building & Contributing

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18 or later |
| npm | 9 or later |

---

## Setup

```bash
git clone https://github.com/philipppollmann/obsidian-strava-sync.git
cd obsidian-strava-sync
npm install
```

---

## Development Build

```bash
npm run dev
```

esbuild starts in **watch mode** — it rebuilds `main.js` every time you save `main.ts`. There is no hot-reload in Obsidian; you need to reload the plugin manually after each build.

### Reload the plugin without restarting Obsidian

1. Open the Command Palette (`Cmd/Ctrl+P`)
2. Run **Reload app without saving**

Or install the [Hot Reload](https://github.com/pjeby/hot-reload) community plugin for automatic reloads.

---

## Linking the Plugin to a Vault

During development it's convenient to build directly into your vault's plugin folder.

**Option A — Symlink**

```bash
ln -s /path/to/obsidian-strava-sync \
      /path/to/your-vault/.obsidian/plugins/obsidian-strava-sync
```

**Option B — Copy script**

```bash
# Add to package.json scripts:
"deploy": "cp main.js manifest.json /path/to/vault/.obsidian/plugins/obsidian-strava-sync/"
```

---

## Production Build

```bash
npm run build
```

Runs the TypeScript type-checker (`tsc -noEmit`) first, then builds an optimised production bundle. The build fails on type errors.

---

## Project Structure

```
main.ts                 # All plugin code — edit this file
manifest.json           # Plugin id, name, version, minAppVersion
package.json            # Dependencies and build scripts
tsconfig.json           # TypeScript config
esbuild.config.mjs      # Build pipeline
docs/                   # MkDocs documentation source
  mkdocs.yml
  docs/
    index.md
    user/
    dev/
    stylesheets/
    assets/
```

---

## Making Changes

### Adding a new template variable

1. Add the field to `StravaActivity` interface if it's a new API field
2. Add the formatted value to the `vars` object in `createActivityFile()`
3. Add it to the frontmatter block if appropriate
4. Document it in `docs/user/template-reference.md`

### Adding a new sport icon

Add an entry to the `SPORT_ICONS` constant in `main.ts`:

```typescript
const SPORT_ICONS: Record<string, string> = {
    // ...existing entries...
    Badminton: "🏸",  // add here
};
```

The key must match Strava's `sport_type` field exactly (PascalCase).

### Changing the map style

Edit `renderLeafletMap()` in `main.ts`. Leaflet tile provider can be swapped by changing the URL template:

```typescript
// OpenStreetMap (default)
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png")

// OpenTopoMap (terrain)
L.tileLayer("https://tile.opentopomap.org/{z}/{x}/{y}.png")

// CartoDB Positron (minimal)
L.tileLayer("https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png")
```

---

## Docs

The documentation uses [MkDocs](https://www.mkdocs.org/) with the [Material theme](https://squidfunk.github.io/mkdocs-material/).

```bash
pip install mkdocs-material
mkdocs serve       # live preview at http://127.0.0.1:8000
mkdocs build       # build static site to ./site/
```

---

## Release Checklist

- [ ] Bump `version` in `manifest.json` and `package.json`
- [ ] Run `npm run build` — must complete with no errors
- [ ] Test: connect to Strava, sync a few activities, verify notes and maps
- [ ] Commit: `feat: vX.Y.Z — <short description>`
- [ ] Tag: `git tag vX.Y.Z && git push --tags`
- [ ] Create GitHub release, attach `main.js` and `manifest.json`
