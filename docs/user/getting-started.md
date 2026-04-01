# Getting Started

This guide walks you through installing **Obsidian Strava Sync** and running your first sync in under five minutes.

---

## Prerequisites

| Requirement | Details |
|---|---|
| Obsidian | Version 0.15.0 or later (desktop only) |
| Strava account | Any account — free or paid |
| Internet connection | Required for Strava API calls and map tile loading |

!!! info "Desktop only"
    This plugin uses Node.js APIs (local HTTP server for OAuth) and is therefore only available on the Obsidian desktop app (Windows, macOS, Linux). It will not run on mobile.

---

## Step 1 — Create a Strava API Application

The plugin authenticates via Strava's official OAuth2 API. You need to register a free application to get credentials.

1. Log in to Strava and go to [strava.com/settings/api](https://www.strava.com/settings/api)
2. Fill in the form:

    | Field | Value |
    |---|---|
    | **Application Name** | Obsidian Strava Sync (or anything you like) |
    | **Category** | Other |
    | **Club** | *(leave empty)* |
    | **Website** | `http://localhost` |
    | **Authorization Callback Domain** | `localhost` |

3. Click **Create** and note down your **Client ID** and **Client Secret**

!!! warning "Callback domain"
    The **Authorization Callback Domain** must be set to exactly `localhost`. Without this, Strava will reject the OAuth redirect and authentication will fail.

---

## Step 2 — Install the Plugin

### Manual installation (current)

1. [Download the latest release](https://github.com/philipppollmann/obsidian-strava-sync/releases) or build from source (see [Building & Contributing](../dev/contributing.md))
2. In your vault, open the folder `.obsidian/plugins/` (create it if it doesn't exist)
3. Create a subfolder `obsidian-strava-sync/`
4. Copy `main.js` and `manifest.json` into that folder

### Enable in Obsidian

1. Open **Settings → Community Plugins**
2. Disable **Safe Mode** if prompted
3. Find **Strava Sync** in the list and toggle it **on**

---

## Step 3 — Connect to Strava

1. Open **Settings → Strava Sync**
2. Paste your **Client ID** and **Client Secret**
3. Click **Connect with Strava** — your browser will open Strava's authorisation page
4. Click **Authorise** on the Strava page
5. The browser tab will show **✅ Connected to Strava!** — you can close it and return to Obsidian

---

## Step 4 — Run Your First Sync

Click the **🏃 ribbon icon** in the left sidebar, or open the **Command Palette** (`Cmd/Ctrl+P`) and run:

```
Strava Sync: Sync new Strava activities
```

The first sync will fetch all your activities. Progress is shown in a notification at the bottom of the screen.

!!! tip "First sync with many activities"
    Strava limits API requests to 100 per 15 minutes. If you have a large activity history, the initial sync will automatically pause and retry when the rate limit is hit — just leave Obsidian open and it will complete on its own.

---

## What Gets Created

For each activity, one Markdown file is created in your configured folder:

```
Sports/Strava/
  17930701177 Morning Run.md
  17850234810 Evening Ride.md
  ...
```

Each file contains:

- YAML frontmatter with all activity stats (usable with Dataview)
- A formatted stats table
- An interactive OpenStreetMap route
- Your private note (if any)
- A `#Strava` tag

---

## Next Steps

- [Configure folder and filename patterns](configuration.md)
- [Customise your activity template](template-reference.md)
- [Learn how syncing works](syncing.md)
