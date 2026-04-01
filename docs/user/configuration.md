# Configuration

All settings are found under **Settings → Strava Sync**.

---

## Folder

Controls where activity notes are created in your vault.

| Setting | Default | Description |
|---|---|---|
| **Folder** | `Sports/Strava` | Path inside your vault. Supports `{{start_date}}` |
| **Folder date format** | `YYYY-MM-DD` | [moment.js format](https://momentjs.com/docs/#/displaying/format/) for `{{start_date}}` |

### Examples

| Folder setting | Result |
|---|---|
| `Sports/Strava` | All notes in one flat folder |
| `Sports/Strava/{{start_date}}` | One subfolder per day: `Sports/Strava/2026-03-25/` |
| `Journal/{{start_date}}/Strava` | Nested inside daily note folder |

---

## Filename

Controls the name of each activity note.

| Setting | Default | Description |
|---|---|---|
| **Filename** | `{{id}} {{name}}` | Supports `{{id}}`, `{{name}}`, `{{start_date}}` |
| **Filename date format** | `YYYY-MM-DD` | moment.js format for `{{start_date}}` in the filename |

### Examples

| Filename setting | Result |
|---|---|
| `{{id}} {{name}}` | `17930701177 Morning Run.md` |
| `{{start_date}} {{name}}` | `2026-03-25 Morning Run.md` |
| `{{name}}` | `Morning Run.md` *(may collide if names repeat)* |

!!! tip "Use the ID"
    Including `{{id}}` in the filename guarantees uniqueness — Strava activity IDs never repeat.

---

## Activity Date Format

Controls how `{{start_date}}` is formatted **inside the note body** (the template).

| Setting | Default |
|---|---|
| **Activity date format** | `YYYY-MM-DD HH:mm:ss` |

This is separate from the folder and filename date formats so you can have a human-readable date in the note while using a sortable format in the filename.

---

## Date Format Reference

All date formats use [moment.js](https://momentjs.com/docs/#/displaying/format/) tokens.

| Token | Output | Example |
|---|---|---|
| `YYYY` | 4-digit year | `2026` |
| `MM` | Month, zero-padded | `03` |
| `MMMM` | Full month name | `March` |
| `DD` | Day, zero-padded | `25` |
| `HH` | Hour (24h) | `07` |
| `mm` | Minutes | `42` |
| `ss` | Seconds | `05` |
| `ddd` | Short weekday | `Tue` |

### Common patterns

| Format string | Example output |
|---|---|
| `YYYY-MM-DD` | `2026-03-25` |
| `YYYY-MM-DD HH:mm:ss` | `2026-03-25 07:42:05` |
| `DD.MM.YYYY` | `25.03.2026` |
| `MMMM D, YYYY` | `March 25, 2026` |
