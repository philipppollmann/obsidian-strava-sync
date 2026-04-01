import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	normalizePath,
	requestUrl,
} from "obsidian";

// ============================================================
// TYPES
// ============================================================

interface StravaSettings {
	clientId: string;
	clientSecret: string;
	accessToken: string;
	refreshToken: string;
	tokenExpiresAt: number;
	folder: string;
	folderDateFormat: string;
	filename: string;
	filenameDateFormat: string;
	activityTemplate: string;
	activityDateFormat: string;
}

interface StravaActivity {
	id: number;
	name: string;
	sport_type: string;
	type: string;
	start_date: string;
	start_date_local: string;
	description: string | null;
	private_note: string | null;
	elapsed_time: number;
	moving_time: number;
	distance: number;
	total_elevation_gain: number;
	elev_low: number | null;
	elev_high: number | null;
	average_speed: number;
	max_speed: number;
	max_heartrate: number | null;
	calories: number | null;
	map: {
		id: string;
		polyline: string | null;
		summary_polyline: string | null;
	};
	has_heartrate: boolean;
}

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_TEMPLATE = `# {{icon}} {{name}}

[https://www.strava.com/activities/{{id}}](https://www.strava.com/activities/{{id}})

| | |
|---|---|
| 📅 Datum | {{start_date}} |
| ⏱ Zeit | {{moving_time}} |
| 📏 Distanz | {{distance}} |
| ⛰ Höhenmeter | {{total_elevation_gain}}m |
| ❤️ Max HR | {{max_heart_rate}} |
| 🔥 Kalorien | {{calories}} |

{{#if private_note}}
> [!NOTE] Private note
> {{private_note}}
{{/if}}

{{map}}

#Strava`;

const DEFAULT_SETTINGS: StravaSettings = {
	clientId: "",
	clientSecret: "",
	accessToken: "",
	refreshToken: "",
	tokenExpiresAt: 0,
	folder: "Sports/Strava/{{start_date}}",
	folderDateFormat: "YYYY-MM-DD",
	filename: "{{id}} {{name}}",
	filenameDateFormat: "YYYY-MM-DD",
	activityTemplate: DEFAULT_TEMPLATE,
	activityDateFormat: "YYYY-MM-DD HH:mm:ss",
};

const SPORT_ICONS: Record<string, string> = {
	Run: "🏃",
	TrailRun: "🏃",
	VirtualRun: "🏃",
	Walk: "🚶",
	Hike: "🥾",
	Ride: "🚴",
	MountainBikeRide: "🚵",
	GravelRide: "🚴",
	VirtualRide: "🚴",
	EBikeRide: "🚴",
	EMountainBikeRide: "🚵",
	Swim: "🏊",
	OpenWaterSwim: "🏊",
	WeightTraining: "🏋️",
	Yoga: "🧘",
	Workout: "💪",
	CrossFit: "🏋️",
	Elliptical: "🏃",
	StairStepper: "🪜",
	RockClimbing: "🧗",
	Kayaking: "🛶",
	Rowing: "🚣",
	Skiing: "⛷️",
	BackcountrySki: "⛷️",
	NordicSki: "⛷️",
	Snowboard: "🏂",
	IceSkate: "⛸️",
	Soccer: "⚽",
	Tennis: "🎾",
	Badminton: "🏸",
	Basketball: "🏀",
	Golf: "⛳",
	Surfing: "🏄",
	Windsurf: "🏄",
	Canoeing: "🛶",
	default: "🏅",
};

const OAUTH_PORT = 8090;

// ============================================================
// PLUGIN
// ============================================================

export default class StravaSyncPlugin extends Plugin {
	settings: StravaSettings;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private oauthServer: any = null;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon("activity", "Sync Strava Activities", async () => {
			await this.syncActivities();
		});

		this.addCommand({
			id: "sync-strava-activities",
			name: "Sync new Strava activities",
			callback: () => this.syncActivities(),
		});

		this.addCommand({
			id: "sync-strava-all",
			name: "Re-sync all Strava activities (overwrite existing)",
			callback: () => this.syncActivities(true),
		});

		this.addSettingTab(new StravaSyncSettingTab(this.app, this));

		// Render strava-map code blocks as interactive Leaflet maps
		this.registerMarkdownCodeBlockProcessor(
			"strava-map",
			(source, el) => this.renderLeafletMap(source.trim(), el)
		);
	}

	async onunload() {
		this.stopOAuthServer();
	}

	// ============================================================
	// OAUTH
	// ============================================================

	async connectToStrava() {
		if (!this.settings.clientId || !this.settings.clientSecret) {
			new Notice("Please enter your Strava Client ID and Client Secret first.");
			return;
		}

		const redirectUri = `http://localhost:${OAUTH_PORT}/callback`;
		const authUrl =
			`https://www.strava.com/oauth/authorize` +
			`?client_id=${this.settings.clientId}` +
			`&redirect_uri=${encodeURIComponent(redirectUri)}` +
			`&response_type=code` +
			`&scope=activity:read_all,read`;

		try {
			await this.startOAuthServer();
			window.open(authUrl);
			new Notice("Opening Strava in browser — authorize the app and return here.");
		} catch (e) {
			new Notice(`Could not start OAuth server on port ${OAUTH_PORT}: ${e.message}`);
		}
	}

	private startOAuthServer(): Promise<void> {
		return new Promise((resolve, reject) => {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const http = require("http");

			this.oauthServer = http.createServer(
				async (req: { url: string }, res: { writeHead: Function; end: Function }) => {
					try {
						const url = new URL(req.url, `http://localhost:${OAUTH_PORT}`);
						if (url.pathname !== "/callback") return;

						const code = url.searchParams.get("code");
						const error = url.searchParams.get("error");

						if (error || !code) {
							res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
							res.end(
								"<html><body style='font-family:sans-serif;padding:2em'>" +
								"<h2>❌ Authorization failed</h2>" +
								"<p>You can close this window.</p></body></html>"
							);
							this.stopOAuthServer();
							new Notice("Strava authorization failed: " + (error ?? "no code"));
							return;
						}

						res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
						res.end(
							"<html><body style='font-family:sans-serif;padding:2em'>" +
							"<h2>✅ Connected to Strava!</h2>" +
							"<p>You can close this window and return to Obsidian.</p></body></html>"
						);
						this.stopOAuthServer();
						await this.exchangeCodeForTokens(code);
					} catch (e) {
						console.error("OAuth callback error:", e);
					}
				}
			);

			this.oauthServer.on("error", (err: Error) => reject(err));
			this.oauthServer.listen(OAUTH_PORT, () => resolve());
		});
	}

	private stopOAuthServer() {
		if (this.oauthServer) {
			this.oauthServer.close();
			this.oauthServer = null;
		}
	}

	private async exchangeCodeForTokens(code: string) {
		try {
			const response = await requestUrl({
				url: "https://www.strava.com/oauth/token",
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					client_id: this.settings.clientId,
					client_secret: this.settings.clientSecret,
					code,
					grant_type: "authorization_code",
				}),
			});

			const data = response.json;
			this.settings.accessToken = data.access_token;
			this.settings.refreshToken = data.refresh_token;
			this.settings.tokenExpiresAt = data.expires_at;
			await this.saveSettings();

			new Notice("✅ Successfully connected to Strava!");
		} catch (e) {
			new Notice("Failed to exchange token: " + e.message);
			console.error("Token exchange error:", e);
		}
	}

	async disconnectFromStrava() {
		this.settings.accessToken = "";
		this.settings.refreshToken = "";
		this.settings.tokenExpiresAt = 0;
		await this.saveSettings();
		new Notice("Disconnected from Strava.");
	}

	private async refreshAccessToken(): Promise<boolean> {
		if (!this.settings.refreshToken) return false;
		try {
			const response = await requestUrl({
				url: "https://www.strava.com/oauth/token",
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					client_id: this.settings.clientId,
					client_secret: this.settings.clientSecret,
					refresh_token: this.settings.refreshToken,
					grant_type: "refresh_token",
				}),
			});

			const data = response.json;
			this.settings.accessToken = data.access_token;
			this.settings.refreshToken = data.refresh_token;
			this.settings.tokenExpiresAt = data.expires_at;
			await this.saveSettings();
			return true;
		} catch (e) {
			console.error("Token refresh error:", e);
			return false;
		}
	}

	private async getValidAccessToken(): Promise<string | null> {
		if (!this.settings.accessToken) return null;

		// Refresh 5 minutes before expiry
		if (Date.now() / 1000 > this.settings.tokenExpiresAt - 300) {
			const ok = await this.refreshAccessToken();
			if (!ok) {
				new Notice("Failed to refresh Strava token. Please reconnect in settings.");
				return null;
			}
		}

		return this.settings.accessToken;
	}

	isConnected(): boolean {
		return !!this.settings.accessToken;
	}

	// ============================================================
	// SYNC
	// ============================================================

	async syncActivities(force = false) {
		const token = await this.getValidAccessToken();
		if (!token) {
			new Notice("Not connected to Strava. Please connect in plugin settings.");
			return;
		}

		const notice = new Notice("Fetching Strava activities…", 0);

		try {
			const [activities, existingIds] = await Promise.all([
				this.fetchActivities(token),
				this.getExistingActivityIds(),
			]);

			// If folder is empty (no files found) → sync everything.
			// Otherwise skip activities that already have a file.
			const newActivities = force || existingIds.size === 0
				? activities
				: activities.filter((a) => !existingIds.has(a.id));

			notice.hide();

			if (newActivities.length === 0) {
				new Notice("No new Strava activities to sync.");
				return;
			}

			const progressNotice = new Notice(
				`Syncing 0 / ${newActivities.length} activities…`,
				0
			);

			let count = 0;
			for (const activity of newActivities) {
				try {
					// Fetch detail for description, private_note and full polyline.
					// Falls back to list data on persistent 429.
					let detailed: StravaActivity;
					try {
						detailed = await this.fetchWithRetry(() =>
							this.fetchActivityDetail(activity.id, token)
						);
					} catch (e) {
						console.warn(
							`Rate-limit fallback for activity ${activity.id}: using list data`
						);
						detailed = activity;
					}
					await this.createActivityFile(detailed);
					count++;
					progressNotice.setMessage(
						`Syncing ${count} / ${newActivities.length} activities…`
					);
					// 1 s delay keeps us well within Strava's 100 req/15 min limit.
					await sleep(1000);
				} catch (e) {
					console.error(`Failed to sync activity ${activity.id}:`, e);
				}
			}

			progressNotice.hide();
			new Notice(`✅ Synced ${count} new Strava activities!`);
		} catch (e) {
			notice.hide();
			new Notice("Sync failed: " + e.message);
			console.error("Strava sync error:", e);
		}
	}

	/**
	 * Scans the configured folder (and any subfolders) for existing activity files.
	 * Activity IDs are extracted from the leading digits in each filename.
	 * Returns an empty Set when the folder doesn't exist yet → triggers a full sync.
	 */
	private async getExistingActivityIds(): Promise<Set<number>> {
		const ids = new Set<number>();

		// Derive the base folder by stripping everything from the first {{ onward.
		// "Sports/Strava/{{start_date}}" → "Sports/Strava"
		// "Sports/Strava"               → "Sports/Strava"
		const baseFolder = normalizePath(
			this.settings.folder.split("{{")[0].replace(/\/+$/, "") || "/"
		);

		if (!(await this.app.vault.adapter.exists(baseFolder))) {
			return ids; // folder doesn't exist → treat as empty
		}

		// getMarkdownFiles() returns all .md files in the vault; filter by path prefix.
		const prefix = baseFolder === "/" ? "" : baseFolder + "/";
		for (const file of this.app.vault.getMarkdownFiles()) {
			if (!file.path.startsWith(prefix)) continue;
			// Filename format: "{{id}} {{name}}.md" — ID is the leading digit sequence.
			const match = file.basename.match(/^(\d+)/);
			if (match) ids.add(Number(match[1]));
		}

		return ids;
	}

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

	private async fetchActivityDetail(id: number, token: string): Promise<StravaActivity> {
		const response = await requestUrl({
			url: `https://www.strava.com/api/v3/activities/${id}`,
			headers: { Authorization: `Bearer ${token}` },
		});
		return response.json as StravaActivity;
	}

	/**
	 * Wraps an API call with retry logic for HTTP 429 (rate limit).
	 * Strava's 15-minute window resets after at most 15 min, so we
	 * wait progressively longer between attempts.
	 */
	private async fetchWithRetry<T>(
		fn: () => Promise<T>,
		maxRetries = 3
	): Promise<T> {
		const backoff = [60_000, 120_000, 300_000]; // 1 min, 2 min, 5 min
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await fn();
			} catch (e) {
				const is429 =
					e?.status === 429 ||
					String(e?.message ?? "").includes("429");
				if (is429 && attempt < maxRetries) {
					const waitMs = backoff[attempt] ?? 300_000;
					const waitSec = Math.round(waitMs / 1000);
					new Notice(
						`⏳ Strava rate limit hit — waiting ${waitSec}s before retrying…`,
						waitMs
					);
					await sleep(waitMs);
				} else {
					throw e;
				}
			}
		}
		// Should never reach here
		throw new Error("fetchWithRetry: max retries exceeded");
	}

	// ============================================================
	// FILE CREATION
	// ============================================================

	private async createActivityFile(activity: StravaActivity) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const moment = (window as any).moment;
		const startDate = moment(activity.start_date_local);

		const folderDate = startDate.format(this.settings.folderDateFormat);
		const filenameDate = startDate.format(this.settings.filenameDateFormat);
		const activityDate = startDate.format(this.settings.activityDateFormat);

		// Resolve folder
		const folderPath = this.settings.folder.replace("{{start_date}}", folderDate);

		// Resolve filename (sanitize illegal chars)
		const safeName = activity.name.replace(/[\\/:*?"<>|#^[\]]/g, "-").trim();
		const rawFilename = this.settings.filename
			.replace("{{id}}", String(activity.id))
			.replace("{{name}}", safeName)
			.replace("{{start_date}}", filenameDate);

		const filePath = normalizePath(`${folderPath}/${rawFilename}.md`);

		// Generate strava-map code block (rendered as interactive Leaflet map by this plugin)
		const polyline =
			activity.map?.polyline || activity.map?.summary_polyline || "";
		const mapBlock = polyline ? `\`\`\`strava-map\n${polyline}\n\`\`\`` : "";

		const icon = this.getSportIcon(activity.sport_type || activity.type);

		const vars: Record<string, string> = {
			id: String(activity.id),
			name: activity.name,
			icon,
			sport_type: activity.sport_type || activity.type || "",
			description: activity.description || "",
			private_note: activity.private_note || "",
			start_date: activityDate,
			elapsed_time: this.formatDuration(activity.elapsed_time),
			moving_time: this.formatDuration(activity.moving_time),
			distance: this.formatDistance(activity.distance),
			total_elevation_gain: (activity.total_elevation_gain ?? 0).toFixed(0),
			elev_low: activity.elev_low != null ? activity.elev_low.toFixed(0) : "—",
			elev_high: activity.elev_high != null ? activity.elev_high.toFixed(0) : "—",
			average_speed: this.formatSpeed(activity.average_speed),
			max_speed: this.formatSpeed(activity.max_speed),
			max_heart_rate:
				activity.max_heartrate != null ? String(activity.max_heartrate) : "—",
			calories: activity.calories != null ? activity.calories.toFixed(0) : "—",
			map: mapBlock,
		};

		// YAML frontmatter
		const fm = [
			"---",
			`id: ${activity.id}`,
			`name: "${escapeYaml(activity.name)}"`,
			`start_date: "${activityDate}"`,
			`sport_type: ${activity.sport_type || activity.type || ""}`,
			`description: "${escapeYaml(activity.description || "")}"`,
			`private_note: "${escapeYaml(activity.private_note || "")}"`,
			`elapsed_time: ${activity.elapsed_time}`,
			`moving_time: ${activity.moving_time}`,
			`distance: ${activity.distance}`,
			`total_elevation_gain: ${activity.total_elevation_gain ?? 0}`,
			`elev_low: ${activity.elev_low ?? ""}`,
			`elev_high: ${activity.elev_high ?? ""}`,
			`average_speed: ${activity.average_speed}`,
			`max_speed: ${activity.max_speed}`,
			`max_heart_rate: ${activity.max_heartrate ?? ""}`,
			`calories: ${activity.calories ?? ""}`,
			`strava_icon: "${icon}"`,
			"---",
			"",
		].join("\n");

		const content = fm + this.renderTemplate(this.settings.activityTemplate, vars);

		// Ensure folder exists
		const folderNorm = normalizePath(folderPath);
		if (!(await this.app.vault.adapter.exists(folderNorm))) {
			await this.app.vault.createFolder(folderNorm);
		}

		const existing = this.app.vault.getAbstractFileByPath(filePath);
		if (existing instanceof TFile) {
			await this.app.vault.modify(existing, content);
		} else {
			await this.app.vault.create(filePath, content);
		}
	}

	// ============================================================
	// TEMPLATE ENGINE
	// ============================================================

	private renderTemplate(template: string, vars: Record<string, string>): string {
		// {{#if key}}...{{/if}}
		let result = template.replace(
			/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
			(_, key: string, inner: string) => (vars[key] ? inner : "")
		);

		// {{key}}
		result = result.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
			vars[key] !== undefined ? vars[key] : ""
		);

		return result;
	}

	// ============================================================
	// POLYLINE DECODE
	// ============================================================

	private decodePolyline(encoded: string): [number, number][] {
		const points: [number, number][] = [];
		let index = 0;
		let lat = 0;
		let lng = 0;

		while (index < encoded.length) {
			let shift = 0, result = 0, b: number;
			do {
				b = encoded.charCodeAt(index++) - 63;
				result |= (b & 0x1f) << shift;
				shift += 5;
			} while (b >= 0x20);
			lat += result & 1 ? ~(result >> 1) : result >> 1;

			shift = 0; result = 0;
			do {
				b = encoded.charCodeAt(index++) - 63;
				result |= (b & 0x1f) << shift;
				shift += 5;
			} while (b >= 0x20);
			lng += result & 1 ? ~(result >> 1) : result >> 1;

			points.push([lat / 1e5, lng / 1e5]);
		}

		return points;
	}

	// ============================================================
	// LEAFLET MAP RENDERER
	// ============================================================

	/**
	 * Lazily loads Leaflet (JS + CSS) from unpkg CDN.
	 * Called only when a strava-map code block is first rendered.
	 */
	private async ensureLeafletLoaded(): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		if ((window as any).L) return;

		if (!document.getElementById("strava-leaflet-css")) {
			const link = document.createElement("link");
			link.id = "strava-leaflet-css";
			link.rel = "stylesheet";
			link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
			document.head.appendChild(link);
		}

		await new Promise<void>((resolve, reject) => {
			const script = document.createElement("script");
			script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
			script.onload = () => resolve();
			script.onerror = () => reject(new Error("Failed to load Leaflet from CDN"));
			document.head.appendChild(script);
		});
	}

	/**
	 * Renders an interactive OpenStreetMap + Leaflet map for a given encoded polyline.
	 * Called by the "strava-map" markdown code block processor.
	 */
	private async renderLeafletMap(polyline: string, container: HTMLElement) {
		if (!polyline) {
			container.createEl("p", { text: "No GPS route data available." });
			return;
		}

		const mapEl = container.createDiv({
			attr: {
				style: [
					"height: 400px",
					"border-radius: 10px",
					"overflow: hidden",
					"margin: 0.5em 0",
					"z-index: 0",       // prevent leaflet controls overlapping Obsidian UI
				].join(";"),
			},
		});

		try {
			await this.ensureLeafletLoaded();
		} catch (e) {
			mapEl.setText("Could not load map: " + e.message);
			return;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const L = (window as any).L;

		const map = L.map(mapEl, { zoomControl: true });

		L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution:
				'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			maxZoom: 19,
		}).addTo(map);

		const latLngs = this.decodePolyline(polyline) as [number, number][];
		if (latLngs.length === 0) {
			mapEl.setText("No GPS coordinates found.");
			return;
		}

		// Route line in Strava orange
		const poly = L.polyline(latLngs, {
			color: "#fc4c02",
			weight: 4,
			opacity: 0.9,
			lineJoin: "round",
		}).addTo(map);

		// Green start dot
		L.circleMarker(latLngs[0], {
			radius: 7,
			fillColor: "#22c55e",
			fillOpacity: 1,
			color: "white",
			weight: 2,
		}).addTo(map);

		// Orange end dot
		L.circleMarker(latLngs[latLngs.length - 1], {
			radius: 7,
			fillColor: "#fc4c02",
			fillOpacity: 1,
			color: "white",
			weight: 2,
		}).addTo(map);

		map.fitBounds(poly.getBounds(), { padding: [24, 24] });

		// Leaflet needs a size invalidation after the DOM settles
		setTimeout(() => map.invalidateSize(), 150);
	}

	// ============================================================
	// FORMAT HELPERS
	// ============================================================

	private getSportIcon(sportType: string): string {
		return SPORT_ICONS[sportType] ?? SPORT_ICONS.default;
	}

	private formatDuration(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		if (h > 0) {
			return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
		}
		return `${m}:${String(s).padStart(2, "0")}`;
	}

	private formatDistance(meters: number): string {
		if (meters >= 1000) return (meters / 1000).toFixed(2) + " km";
		return meters.toFixed(0) + " m";
	}

	private formatSpeed(mps: number): string {
		return (mps * 3.6).toFixed(1) + " km/h";
	}

	// ============================================================
	// SETTINGS
	// ============================================================

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// ============================================================
// SETTINGS TAB
// ============================================================

class StravaSyncSettingTab extends PluginSettingTab {
	plugin: StravaSyncPlugin;

	constructor(app: App, plugin: StravaSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// ── Authentication ──────────────────────────────────────
		containerEl.createEl("h2", { text: "Authenticate with Strava" });

		new Setting(containerEl)
			.setName("Client ID")
			.setDesc("Your Strava API application Client ID.")
			.addText((t) => {
				t.setPlaceholder("12345")
					.setValue(this.plugin.settings.clientId)
					.onChange(async (v) => {
						this.plugin.settings.clientId = v.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Client Secret")
			.setDesc("Your Strava API application Client Secret.")
			.addText((t) => {
				t.inputEl.type = "password";
				t.setPlaceholder("••••••••••••••••••••••••••••••••••")
					.setValue(this.plugin.settings.clientSecret)
					.onChange(async (v) => {
						this.plugin.settings.clientSecret = v.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Connection")
			.setDesc(
				this.plugin.isConnected()
					? "✅ Connected to Strava."
					: `Not connected. Make sure your Strava app has http://localhost:${OAUTH_PORT}/callback as an allowed redirect URI.`
			)
			.addButton((btn) => {
				if (this.plugin.isConnected()) {
					btn.setButtonText("Disconnect")
						.setWarning()
						.onClick(async () => {
							await this.plugin.disconnectFromStrava();
							this.display();
						});
				} else {
					btn.setButtonText("Connect with Strava")
						.setCta()
						.onClick(async () => {
							await this.plugin.connectToStrava();
							// Refresh after a short delay so the UI updates post-auth
							setTimeout(() => this.display(), 3000);
						});
				}
			});

		// ── Sync ────────────────────────────────────────────────
		containerEl.createEl("h2", { text: "Sync" });

		new Setting(containerEl)
			.setName("Sync now")
			.setDesc("Fetch and create notes for all new Strava activities.")
			.addButton((btn) =>
				btn
					.setButtonText("Sync")
					.setCta()
					.onClick(() => this.plugin.syncActivities())
			);

		// ── File Locations ──────────────────────────────────────
		containerEl.createEl("h2", { text: "File locations" });

		new Setting(containerEl)
			.setName("Folder")
			.setDesc(
				"Folder path for activity notes. Use {{start_date}} for the activity date."
			)
			.addText((t) =>
				t
					.setPlaceholder("Sports/Strava/{{start_date}}")
					.setValue(this.plugin.settings.folder)
					.onChange(async (v) => {
						this.plugin.settings.folder = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Folder date format")
			.setDesc(
				"moment.js format for {{start_date}} in the folder path. " +
				"Reference: https://momentjs.com/docs/#/displaying/format/"
			)
			.addText((t) =>
				t
					.setPlaceholder("YYYY-MM-DD")
					.setValue(this.plugin.settings.folderDateFormat)
					.onChange(async (v) => {
						this.plugin.settings.folderDateFormat = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Filename")
			.setDesc("Filename for activity notes. Use {{id}}, {{name}}, {{start_date}}.")
			.addText((t) =>
				t
					.setPlaceholder("{{id}} {{name}}")
					.setValue(this.plugin.settings.filename)
					.onChange(async (v) => {
						this.plugin.settings.filename = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Filename date format")
			.setDesc("moment.js format for {{start_date}} in the filename.")
			.addText((t) =>
				t
					.setPlaceholder("YYYY-MM-DD")
					.setValue(this.plugin.settings.filenameDateFormat)
					.onChange(async (v) => {
						this.plugin.settings.filenameDateFormat = v;
						await this.plugin.saveSettings();
					})
			);

		// ── Template ────────────────────────────────────────────
		containerEl.createEl("h2", { text: "Activity template" });

		new Setting(containerEl)
			.setName("Activity date format")
			.setDesc("moment.js format used for {{start_date}} inside the note body.")
			.addText((t) =>
				t
					.setPlaceholder("YYYY-MM-DD HH:mm:ss")
					.setValue(this.plugin.settings.activityDateFormat)
					.onChange(async (v) => {
						this.plugin.settings.activityDateFormat = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Template")
			.setDesc(
				createFragment((frag) => {
					frag.appendText("Markdown template for each activity note. Available variables: ");
					frag.createEl("code", {
						text: "{{id}} {{name}} {{icon}} {{sport_type}} {{start_date}} {{moving_time}} {{elapsed_time}} {{distance}} {{total_elevation_gain}} {{elev_low}} {{elev_high}} {{average_speed}} {{max_speed}} {{max_heart_rate}} {{calories}} {{description}} {{private_note}} {{map}}",
					});
					frag.appendText(". Use ");
					frag.createEl("code", { text: "{{#if private_note}}…{{/if}}" });
					frag.appendText(" for conditional blocks.");
				})
			)
			.addTextArea((ta) => {
				ta.inputEl.rows = 20;
				ta.inputEl.style.width = "100%";
				ta.inputEl.style.fontFamily = "monospace";
				ta.setValue(this.plugin.settings.activityTemplate).onChange(
					async (v) => {
						this.plugin.settings.activityTemplate = v;
						await this.plugin.saveSettings();
					}
				);
			});

		new Setting(containerEl)
			.setName("Reset template")
			.setDesc("Restore the default activity template.")
			.addButton((btn) =>
				btn.setButtonText("Reset to default").onClick(async () => {
					this.plugin.settings.activityTemplate = DEFAULT_TEMPLATE;
					await this.plugin.saveSettings();
					this.display();
				})
			);

		// ── Advanced ────────────────────────────────────────────
		containerEl.createEl("h2", { text: "Advanced" });

		new Setting(containerEl)
			.setName("Re-sync all activities")
			.setDesc(
				"Overwrite all existing notes — useful after changing the template. " +
				"Deletes nothing; files are simply re-created."
			)
			.addButton((btn) =>
				btn
					.setButtonText("Re-sync all")
					.setWarning()
					.onClick(() => this.plugin.syncActivities(true))
			);
	}
}

// ============================================================
// HELPERS
// ============================================================

function escapeYaml(str: string): string {
	return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}
