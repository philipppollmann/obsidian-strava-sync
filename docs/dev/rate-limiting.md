# Rate Limiting

---

## Strava API Limits

| Window | Limit |
|---|---|
| Per 15 minutes | 100 requests |
| Per day | 1 000 requests |

Exceeding either limit returns **HTTP 429 Too Many Requests**.

The plugin makes two types of requests per new activity:

1. **List request** — `GET /athlete/activities?page=N` (100 activities per page, 1 request per 100 activities)
2. **Detail request** — `GET /activities/{id}` (1 request per new activity)

For a first sync with 200 activities: ~2 list requests + 200 detail requests = **202 requests total** — exceeds the 15-minute window.

---

## Retry Strategy

The `fetchWithRetry()` wrapper handles 429 responses with exponential backoff:

```typescript
private async fetchWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    const backoff = [60_000, 120_000, 300_000]; // 1 min, 2 min, 5 min

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (e) {
            const is429 = e?.status === 429 || String(e?.message).includes("429");

            if (is429 && attempt < maxRetries) {
                const waitMs = backoff[attempt];
                new Notice(`⏳ Rate limit hit — waiting ${waitMs / 1000}s…`, waitMs);
                await sleep(waitMs);
            } else {
                throw e; // non-429 error, or all retries exhausted
            }
        }
    }
}
```

| Attempt | Wait | Total elapsed |
|---|---|---|
| Initial | — | 0 |
| 1st retry | 60 s | 1 min |
| 2nd retry | 120 s | 3 min |
| 3rd retry | 300 s | 8 min |
| Fail / fallback | — | 8 min |

A user-visible notice shows the wait countdown for each retry.

---

## Fallback Behaviour

If all retries are exhausted for a **detail** request, the plugin falls back to the **list-endpoint data** for that activity. The note is still created — it simply won't have `description`, `private_note`, or the full-resolution polyline (it will use `summary_polyline` instead).

```typescript
let detailed: StravaActivity;
try {
    detailed = await this.fetchWithRetry(() =>
        this.fetchActivityDetail(activity.id, token)
    );
} catch (e) {
    console.warn(`Rate-limit fallback for activity ${activity.id}: using list data`);
    detailed = activity; // list data used instead
}
```

The activity ID is still written to the note filename, so on the next sync (after the rate limit resets) it will be skipped — not re-fetched. To refresh these notes with full data, use **Re-sync all**.

---

## Base Delay

In addition to the retry logic, there is a 1-second `sleep()` between each activity detail fetch:

```typescript
await sleep(1000); // 1 req/s = 60 req/min = within 100 req/15 min
```

At 1 req/s, the plugin can process up to ~85 new activities before hitting the 15-minute limit (accounting for the list page requests). For larger initial syncs, the retry backoff takes over automatically.

---

## Adding Custom Retry Logic

To adjust backoff timings, modify the `backoff` array in `fetchWithRetry()`:

```typescript
const backoff = [
    30_000,   // 30 s  — more aggressive
    90_000,   // 90 s
    180_000,  // 3 min
];
```

To change the base delay between requests, modify the `sleep` call in `syncActivities()`:

```typescript
await sleep(2000); // 2 s between requests = more conservative
```
