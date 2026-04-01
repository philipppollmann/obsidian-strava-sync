# Map Rendering

---

## Overview

Routes are rendered as **interactive Leaflet maps** using OpenStreetMap tiles. The plugin uses a custom Markdown code block processor to handle a `strava-map` fence:

````markdown
```strava-map
encoded_polyline_string_here
```
````

When Obsidian renders a note in Reading View, the plugin intercepts this block and replaces it with a live Leaflet map.

---

## How the Polyline Gets Into the File

`createActivityFile()` stores the raw Strava encoded polyline directly in the code block:

```typescript
const polyline = activity.map?.polyline || activity.map?.summary_polyline || "";
const mapBlock = polyline ? `\`\`\`strava-map\n${polyline}\n\`\`\`` : "";
```

- `map.polyline` — full-resolution GPS track, only available from the detail endpoint
- `map.summary_polyline` — simplified version, available from the list endpoint (fallback)

The raw polyline is stored in the file (not decoded) to keep file sizes small and the data portable.

---

## Polyline Decoding

Strava uses [Google's Encoded Polyline Algorithm](https://developers.google.com/maps/documentation/utilities/polylinealgorithm).

```typescript
private decodePolyline(encoded: string): [number, number][] {
    const points: [number, number][] = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
        // Decode variable-length integers for lat delta and lng delta
        let shift = 0, result = 0, b: number;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lat += result & 1 ? ~(result >> 1) : result >> 1;

        // ... same for lng

        points.push([lat / 1e5, lng / 1e5]); // divide by 1e5 to get decimal degrees
    }
    return points;
}
```

The algorithm uses variable-length integer encoding where each coordinate delta is stored in chunks of 5 bits.

---

## Leaflet Integration

### Loading Leaflet

Leaflet is **not bundled** with the plugin. It is loaded lazily from the unpkg CDN the first time a `strava-map` block is rendered. Subsequent maps reuse the already-loaded global `window.L`.

```typescript
private async ensureLeafletLoaded(): Promise<void> {
    if ((window as any).L) return; // already loaded

    // Inject CSS
    const link = document.createElement("link");
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    // Inject JS
    await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.head.appendChild(script);
    });
}
```

!!! info "CDN dependency"
    Loading the map requires internet access — both for the Leaflet library (once, then cached by the browser) and for OpenStreetMap tile images. Offline use will show an empty map container.

### Code Block Processor

Registered in `onload()`:

```typescript
this.registerMarkdownCodeBlockProcessor(
    "strava-map",
    (source, el) => this.renderLeafletMap(source.trim(), el)
);
```

### `renderLeafletMap(polyline, container)`

```typescript
private async renderLeafletMap(polyline: string, container: HTMLElement) {
    // 1. Create a 400px div for the map
    const mapEl = container.createDiv({ attr: { style: "height:400px;..." } });

    // 2. Load Leaflet from CDN (no-op if already loaded)
    await this.ensureLeafletLoaded();
    const L = (window as any).L;

    // 3. Create Leaflet map with OSM tiles
    const map = L.map(mapEl);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // 4. Decode polyline and draw the route
    const latLngs = this.decodePolyline(polyline);
    const poly = L.polyline(latLngs, { color: "#fc4c02", weight: 4 }).addTo(map);

    // 5. Start (green) and end (orange) markers
    L.circleMarker(latLngs[0], { fillColor: "#22c55e", ... }).addTo(map);
    L.circleMarker(latLngs[latLngs.length - 1], { fillColor: "#fc4c02", ... }).addTo(map);

    // 6. Fit map to route bounds
    map.fitBounds(poly.getBounds(), { padding: [24, 24] });

    // 7. Fix Leaflet dimension bug after DOM settles
    setTimeout(() => map.invalidateSize(), 150);
}
```

### Why `invalidateSize()`?

Leaflet calculates the map's pixel dimensions on creation. If the container is not yet fully laid out by the browser at that moment, the map renders incorrectly (grey tiles, wrong zoom). The 150ms `setTimeout` gives Obsidian's rendering pipeline time to finish before Leaflet re-measures the container.

---

## Visual Design

| Element | Colour | Notes |
|---|---|---|
| Route line | `#fc4c02` (Strava orange) | 4px, rounded joins |
| Start marker | `#22c55e` (green) | 7px circle, white border |
| End marker | `#fc4c02` (orange) | 7px circle, white border |
| Map tiles | OpenStreetMap default | Full street-level detail |
