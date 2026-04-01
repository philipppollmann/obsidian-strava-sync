<div class="hero">
  <h1>🏃 Obsidian Strava Sync</h1>
  <p>Sync every Strava activity into your Obsidian vault as a Markdown note — complete with an interactive OpenStreetMap route, full stats, and a customisable template.</p>
  <div class="badge-row">
    <span class="hero-badge">🗺️ Interactive Maps</span>
    <span class="hero-badge">⚡ OAuth2 Auth</span>
    <span class="hero-badge">📝 Custom Templates</span>
    <span class="hero-badge">🔄 Smart Sync</span>
  </div>
</div>

<div class="feature-grid">
  <div class="feature-card">
    <span class="icon">🗺️</span>
    <h3>Live Route Maps</h3>
    <p>Every activity renders an interactive OpenStreetMap with your exact route, start/end markers, and full zoom & pan support.</p>
  </div>
  <div class="feature-card">
    <span class="icon">🔐</span>
    <h3>One-click Auth</h3>
    <p>Full OAuth2 flow — click <em>Connect with Strava</em>, authorise in your browser, and you're done. No manual token copying.</p>
  </div>
  <div class="feature-card">
    <span class="icon">📁</span>
    <h3>Flexible Filing</h3>
    <p>Configure folder and filename patterns using <code>{{start_date}}</code>, <code>{{id}}</code>, and <code>{{name}}</code> placeholders.</p>
  </div>
  <div class="feature-card">
    <span class="icon">📝</span>
    <h3>Custom Templates</h3>
    <p>Full control over your note layout. Use any of 17 activity variables and conditional <code>{{#if}}</code> blocks.</p>
  </div>
  <div class="feature-card">
    <span class="icon">🔄</span>
    <h3>Smart Sync</h3>
    <p>No internal ID list to maintain — the plugin reads your vault folder and only syncs what's missing.</p>
  </div>
  <div class="feature-card">
    <span class="icon">⏳</span>
    <h3>Rate-limit Safe</h3>
    <p>Automatic retry with exponential backoff when Strava's API rate limit is hit. Never loses an activity.</p>
  </div>
</div>

---

## Quick start

=== "1. Create Strava API app"

    Go to [strava.com/settings/api](https://www.strava.com/settings/api) and create an application.
    Set the **Authorization Callback Domain** to `localhost`.
    Copy your **Client ID** and **Client Secret**.

=== "2. Install plugin"

    Build the plugin or grab the latest release, then copy `main.js` and `manifest.json` to:

    ```
    <your-vault>/.obsidian/plugins/obsidian-strava-sync/
    ```

    Enable it in **Settings → Community Plugins**.

=== "3. Connect & sync"

    Open **Settings → Strava Sync**, paste your credentials, and click **Connect with Strava**.
    Then hit **Sync** — your activities will start appearing in your vault.

---

[Get started :fontawesome-solid-arrow-right:](user/getting-started.md){ .md-button .md-button--primary }
[Developer docs :fontawesome-solid-code:](dev/architecture.md){ .md-button }
