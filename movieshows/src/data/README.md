# Movies / TV Database

Static database of movies and TV series (2020 onward) for the video player. **2025 and 2026** entries are prioritized at the top of the feed.

## Source

- **`movies.json`** – Single source of truth. Each entry has:
  - `id`, `title`, `description`
  - `videoUrl` – **YouTube video ID** (primary trailer)
  - `videoUrlFallback` – **Optional** second YouTube ID; used when the user clicks “Backup trailer” or if the primary fails
  - `posterUrl` – Full image URL (TMDB `https://image.tmdb.org/t/p/w500/...` recommended)
  - `genres`, `rating`, `year`, `releaseDate`, `type` (`movie` | `tv`), `source` (streaming/theatrical)

- **`nowPlayingToronto.json`** – **Now Playing** section. Lists movie **titles** (or IDs) currently at:
  - **Cineplex** – Toronto Cineplex locations
  - **Imagine Cinemas** – Toronto (Carlton, Market Square)
  The app matches these titles/IDs to `movies.json` and sets `nowPlayingTheatres` so users can filter by “Now Playing (Toronto)”. Update this file manually or via a scraper; Cineplex and Imagine do not offer public APIs.

## Adding or Updating Entries

1. **Trailer / clip**: Use the official YouTube **video ID** from the share link (`?v=XXXX`).
2. **Poster**: Use [TMDB](https://themoviedb.org) movie/TV pages → image URL, or `https://image.tmdb.org/t/p/w500/{poster_path}`.
3. Append to the `movies` array in `movies.json` and keep `id` unique.

## Optional: TMDB API

For bulk or automated updates you can use:

- **Movie videos (trailers):** `GET https://api.themoviedb.org/3/movie/{movie_id}/videos`
- **TV videos:** `GET https://api.themoviedb.org/3/tv/{tv_id}/videos`

The `key` in the response is the YouTube video ID. You need a free [TMDB API key](https://developer.themoviedb.org/docs).

## Sorting

The app sorts by **year descending**, then **releaseDate descending**, so 2025+ and newest releases appear first.

## Categories (Movies / TV / Now Playing)

Users can choose one or more of: **Movies**, **TV Shows**, **Now Playing (Toronto)**. “Now Playing” shows only movies that appear in `nowPlayingToronto.json` (Cineplex and/or Imagine Cinemas). Keep `nowPlayingToronto.json` in sync with [Cineplex](https://www.cineplex.com) and [Imagine Cinemas](https://imaginecinemas.com/showtimes/) Toronto listings for accurate “Now Playing” results.

## QA: Broken videos and scanner

- **`broken_videos.json`** – QA database of videos reported as unavailable (user taps “Broken”). Each entry has `movieId`, `title`, `failedVideoUrl`, `source` (youtube), `reportedAt`, `status`, and (after running the scanner) **`suggestedUrls`** from YouTube and Dailymotion.
- Reported titles are **hidden from the feed** until fixed. Run the scanner to find replacement trailers:
  - **Dailymotion**: no API key; `node scripts/scan-broken-sources.mjs`
  - **YouTube**: optional; set `YOUTUBE_API_KEY` for YouTube search. See `scripts/README_QA_SCANNER.md`.
