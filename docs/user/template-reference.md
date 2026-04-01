# Template Reference

The activity template controls exactly what goes into each Markdown note. Edit it under **Settings → Strava Sync → Template**.

---

## Default Template

```markdown
# {{icon}} {{name}}

[https://www.strava.com/activities/{{id}}](https://www.strava.com/activities/{{id}})

| | |
|---|---|
| 📅 Datum | {{start_date}} |
| ⏱ Zeit  | {{moving_time}} |
| 📏 Distanz | {{distance}} |
| ⛰ Höhenmeter | {{total_elevation_gain}}m |
| ❤️ Max HR | {{max_heart_rate}} |
| 🔥 Kalorien | {{calories}} |

{{#if private_note}}
> [!NOTE] Private note
> {{private_note}}
{{/if}}

{{map}}

#Strava
```

---

## All Variables

### Core

| Variable | Type | Example |
|---|---|---|
| `{{id}}` | Number | `17930701177` |
| `{{name}}` | Text | `Morning Run` |
| `{{icon}}` | Emoji | `🏃` |
| `{{sport_type}}` | Text | `Run` |
| `{{start_date}}` | Formatted date | `2026-03-25 07:42:05` |

### Time

| Variable | Type | Example |
|---|---|---|
| `{{moving_time}}` | `h:mm:ss` | `0:42:17` |
| `{{elapsed_time}}` | `h:mm:ss` | `0:45:03` |

### Distance & Elevation

| Variable | Type | Example |
|---|---|---|
| `{{distance}}` | Formatted | `10.23 km` |
| `{{total_elevation_gain}}` | Metres (number) | `128` |
| `{{elev_low}}` | Metres (number) | `312` |
| `{{elev_high}}` | Metres (number) | `440` |

### Speed

| Variable | Type | Example |
|---|---|---|
| `{{average_speed}}` | km/h | `14.5 km/h` |
| `{{max_speed}}` | km/h | `22.1 km/h` |

### Health

| Variable | Type | Example |
|---|---|---|
| `{{max_heart_rate}}` | BPM | `178` |
| `{{calories}}` | kcal | `512` |

### Text

| Variable | Type | Example |
|---|---|---|
| `{{description}}` | Text | `Easy recovery run` |
| `{{private_note}}` | Text | `Felt tired` |

### Map

| Variable | Type | Description |
|---|---|---|
| `{{map}}` | Code block | Renders an interactive OpenStreetMap route |

!!! info "Missing values"
    If Strava doesn't return a value for a field (e.g. `max_heart_rate` for an activity without a heart rate monitor), the variable is replaced with `—`.

---

## Conditional Blocks

Use `{{#if variable}}...{{/if}}` to show a section only when a variable has a value.

```markdown
{{#if private_note}}
> [!NOTE] Private note
> {{private_note}}
{{/if}}

{{#if description}}
**Description:** {{description}}
{{/if}}
```

The block is removed entirely (including whitespace) when the variable is empty.

---

## Sport Icons

The `{{icon}}` variable maps Strava's `sport_type` to an emoji:

| Sport type | Icon |
|---|---|
| Run, TrailRun, VirtualRun | 🏃 |
| Walk | 🚶 |
| Hike | 🥾 |
| Ride, GravelRide, VirtualRide, EBikeRide | 🚴 |
| MountainBikeRide, EMountainBikeRide | 🚵 |
| Swim, OpenWaterSwim | 🏊 |
| WeightTraining, CrossFit | 🏋️ |
| Yoga | 🧘 |
| Workout | 💪 |
| RockClimbing | 🧗 |
| Kayaking, Canoeing | 🛶 |
| Rowing | 🚣 |
| Skiing, BackcountrySki, NordicSki | ⛷️ |
| Snowboard | 🏂 |
| IceSkate | ⛸️ |
| Surfing, Windsurf | 🏄 |
| Soccer | ⚽ |
| Tennis | 🎾 |
| Golf | ⛳ |
| *Other / unknown* | 🏅 |

---

## Frontmatter

Every note also gets a YAML frontmatter block with all available raw values — useful for [Dataview](https://blacksmithgu.github.io/obsidian-dataview/) queries:

```yaml
---
id: 17930701177
name: "Morning Run"
start_date: "2026-03-25 07:42:05"
sport_type: Run
description: ""
private_note: ""
elapsed_time: 2703
moving_time: 2537
distance: 10234.5
total_elevation_gain: 128
elev_low: 312
elev_high: 440
average_speed: 4.033
max_speed: 5.8
max_heart_rate: 178
calories: 512
strava_icon: "🏃"
---
```

### Example Dataview query

```dataview
TABLE start_date, distance, total_elevation_gain, calories
FROM "Sports/Strava"
WHERE sport_type = "Run"
SORT start_date DESC
```
