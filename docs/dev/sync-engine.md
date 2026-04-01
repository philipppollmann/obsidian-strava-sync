# Sync Engine

---

## Design Philosophy

The sync engine is intentionally **stateless** — it derives what needs syncing by looking at the vault filesystem rather than maintaining an internal list of seen IDs. This makes it resilient:

- Delete a note → it re-syncs on the next run
- Rename a note (removing the leading ID) → it re-syncs
- Wipe the folder → full re-sync happens automatically

---

## `syncActivities(force?: boolean)`

The main orchestration method.

```typescript
async syncActivities(force = false) {
    const token = await this.getValidAccessToken();

    // Fetch in parallel: Strava list + vault scan
    const [activities, existingIds] = await Promise.all([
        this.fetchActivities(token),
        this.getExistingActivityIds(),
    ]);

    // Empty folder = full sync; otherwise filter to new only
    const toSync = force || existingIds.size === 0
        ? activities
        : activities.filter(a => !existingIds.has(a.id));

    for (const activity of toSync) {
        let detailed: StravaActivity;
        try {
            detailed = await this.fetchWithRetry(() =>
                this.fetchActivityDetail(activity.id, token)
            );
        } catch {
            detailed = activity; // fallback to list data
        }
        await this.createActivityFile(detailed);
        await sleep(1000); // ~1 req/s stays within 100 req/15 min
    }
}
```

The Strava list and vault scan are kicked off **in parallel** (`Promise.all`) to avoid sequential latency.

---

## `getExistingActivityIds()`

Scans the configured vault folder and extracts Strava IDs from filenames.

```typescript
private async getExistingActivityIds(): Promise<Set<number>> {
    const ids = new Set<number>();

    // Strip template placeholders to get the base folder
    // "Sports/Strava/{{start_date}}" → "Sports/Strava"
    const baseFolder = normalizePath(
        this.settings.folder.split("{{")[0].replace(/\/+$/, "") || "/"
    );

    if (!(await this.app.vault.adapter.exists(baseFolder))) {
        return ids; // folder doesn't exist → treat as empty
    }

    const prefix = baseFolder === "/" ? "" : baseFolder + "/";
    for (const file of this.app.vault.getMarkdownFiles()) {
        if (!file.path.startsWith(prefix)) continue;
        const match = file.basename.match(/^(\d+)/);
        if (match) ids.add(Number(match[1]));
    }

    return ids;
}
```

**ID extraction rule:** the leading digit sequence of the filename basename is the Strava activity ID. This relies on the default filename pattern `{{id}} {{name}}` or any pattern that starts with `{{id}}`.

!!! warning "Custom filename patterns"
    If you use a filename pattern that does not start with `{{id}}` (e.g. `{{start_date}} {{name}}`), the sync engine cannot detect existing files and will re-sync every activity on every run.

---

## `fetchActivities(token)`

Paginates through `GET /athlete/activities` (100 per page) until an empty page is returned.

```typescript
private async fetchActivities(token: string): Promise<StravaActivity[]> {
    const all: StravaActivity[] = [];
    let page = 1;
    while (true) {
        const response = await requestUrl({
            url: `https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}`,
            headers: { Authorization: `Bearer ${token}` },
        });
        const batch = response.json as StravaActivity[];
        if (!batch || batch.length === 0) break;
        all.push(...batch);
        if (batch.length < 100) break;
        page++;
    }
    return all;
}
```

Note that the list endpoint returns `summary_polyline` but not `description`, `private_note`, or the full-resolution `polyline`. These require a detail fetch.

---

## `createActivityFile(activity)`

Builds the YAML frontmatter + rendered template and writes the file to the vault.

```
start_date_local
    └─ moment.js format → folderDate, filenameDate, activityDate

polyline / summary_polyline
    └─ strava-map code block

template vars
    └─ renderTemplate()
        └─ {{#if}} blocks
        └─ {{variable}} substitution

YAML frontmatter + rendered template
    └─ vault.create() or vault.modify()
```

The folder is created with `vault.createFolder()` if it doesn't exist yet. If the target file already exists, it is updated with `vault.modify()`.
