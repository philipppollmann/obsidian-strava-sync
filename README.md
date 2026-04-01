# Obsidian Strava Sync

Sync your Strava activities into Obsidian as Markdown notes — including a route map rendered directly in the note.

## Features

- OAuth2 authentication with Strava (no manual token copying)
- One Markdown note per activity with configurable folder/filename templates
- Inline SVG route map generated from the GPS polyline — no external services required
- YAML frontmatter with all activity fields for Dataview queries
- Conditional blocks in templates (`{{#if private_note}}`)
- Syncs only new activities (tracks already-synced IDs)
- Re-sync command to refresh all notes

## Setup

### 1. Create a Strava API application

1. Go to [https://www.strava.com/settings/api](https://www.strava.com/settings/api)
2. Create an application (name/website can be anything)
3. Set **Authorization Callback Domain** to `localhost`
4. Copy your **Client ID** and **Client Secret**

### 2. Configure the plugin

Open **Settings → Strava Sync**:

1. Paste your Client ID and Client Secret
2. Click **Connect with Strava** — a browser window will open
3. Authorize the app; the browser will show a success page
4. Return to Obsidian and click **Sync** (or use the ribbon icon / command palette)

## Template variables

| Variable | Description |
|---|---|
| `{{id}}` | Strava activity ID |
| `{{name}}` | Activity name |
| `{{icon}}` | Sport emoji (🏃 🚴 🏊 …) |
| `{{sport_type}}` | Sport type string |
| `{{start_date}}` | Formatted start date |
| `{{moving_time}}` | Moving time (h:mm:ss) |
| `{{elapsed_time}}` | Elapsed time (h:mm:ss) |
| `{{distance}}` | Distance (km or m) |
| `{{total_elevation_gain}}` | Elevation gain in meters |
| `{{elev_low}}` / `{{elev_high}}` | Min/max elevation |
| `{{average_speed}}` / `{{max_speed}}` | Speed in km/h |
| `{{max_heart_rate}}` | Max heart rate |
| `{{calories}}` | Calories |
| `{{description}}` | Activity description |
| `{{private_note}}` | Private note |
| `{{map}}` | Inline SVG route map |

Use `{{#if private_note}}…{{/if}}` for conditional sections.

## Default output

```
Sports/Strava/2024-01-15/12345678 Morning Run.md
```

The note includes YAML frontmatter with all fields for use with Dataview.

## Installation

> Manual install until available in the community plugins directory.

1. Build: `npm install && npm run build`
2. Copy `main.js`, `manifest.json` to your vault's `.obsidian/plugins/obsidian-strava-sync/`
3. Enable the plugin in Obsidian settings
