# QA: Broken Videos & Scanner

## Broken videos database

When a user taps **Broken** on a card (video unavailable), the app POSTs to `/api/report-broken` with:

- `id` – movie ID  
- `title` – movie title  
- `videoUrl` – the YouTube ID that failed  

That record is stored in **`src/data/broken_videos.json`** with:

- `movieId`, `title`, `failedVideoUrl`, `source` (youtube), `reportedAt`, `status` (`pending_replacement` / `replaced` / `ignored`)
- `suggestedUrls` – filled by the scanner (see below)

Reported titles are **excluded from the main feed** so they can be fixed before being shown again.

## Scanner: YouTube + Dailymotion

The scanner looks up **replacement trailers** for each broken entry using:

1. **Dailymotion** – no API key; uses public search.
2. **YouTube** – optional; set `YOUTUBE_API_KEY` for search (get a key in [Google Cloud Console](https://console.cloud.google.com/) → YouTube Data API v3).

### Run the scanner

From the **movieshows** folder:

```bash
# Dailymotion only (no keys)
node scripts/scan-broken-sources.mjs

# YouTube + Dailymotion (optional)
set YOUTUBE_API_KEY=your_key
node scripts/scan-broken-sources.mjs
```

The script:

- Reads `src/data/broken_videos.json`
- For each entry with `status === 'pending_replacement'`, searches:
  - YouTube (if `YOUTUBE_API_KEY` is set) for `"[title] official trailer"`
  - Dailymotion for the same query
- Writes back **`suggestedUrls`** on each entry: `{ source, id, url, title }[]`

You can then:

- Manually pick a `url`/`id` and update `movies.json` (e.g. set `videoUrl` or `videoUrlFallback`).
- Optionally add an API or script to “apply” a suggestion (e.g. PATCH movie by id with new videoUrl) and set the broken entry’s `status` to `replaced`.

## File locations

| File | Purpose |
|------|--------|
| `src/data/broken_videos.json` | QA database of failed videos and scanner results |
| `src/app/api/report-broken/route.ts` | POST (report) / GET (list broken + entries) |
| `scripts/scan-broken-sources.mjs` | Scanner: YouTube + Dailymotion → `suggestedUrls` |
