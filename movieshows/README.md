# MOVIESHOWS

TikTok-style **Movies**, **TV series**, and **Now Playing (Toronto)** trailer discovery app. Browse by category, filter by year/genre/source, build a queue, and search titles.

## Live URLs

| Where | URL |
|-------|-----|
| **GitHub Pages** | [eltonaguiar.github.io/MOVIESHOWS](https://eltonaguiar.github.io/MOVIESHOWS/) |
| **FTP (findtorontoevents.ca)** | [findtorontoevents.ca/MOVIESHOWS](https://findtorontoevents.ca/MOVIESHOWS/) |

### Redirects on findtorontoevents.ca

These paths redirect to the app above:

- [findtorontoevents.ca/MOVIES](https://findtorontoevents.ca/MOVIES) → MOVIESHOWS  
- [findtorontoevents.ca/SHOWS](https://findtorontoevents.ca/SHOWS) → MOVIESHOWS  
- [findtorontoevents.ca/TV](https://findtorontoevents.ca/TV) → MOVIESHOWS  
- [findtorontoevents.ca/TVFINDER](https://findtorontoevents.ca/TVFINDER) → MOVIESHOWS  

## Getting Started (local)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For local dev the app runs at root; production builds use basePath `/MOVIESHOWS` for GitHub Pages and FTP.

## Publish

### 1. GitHub (eltonaguiar/MOVIESHOWS) and GitHub Pages

1. Push this `movieshows` folder to the repo:  
   [https://github.com/eltonaguiar/MOVIESHOWS](https://github.com/eltonaguiar/MOVIESHOWS)
2. In the repo: **Settings → Pages** → set **Build and deployment** source to **GitHub Actions**.
3. On each push to `main`, the workflow `.github/workflows/deploy-pages.yml` builds the static export and deploys to GitHub Pages.  
   Live site: [https://eltonaguiar.github.io/MOVIESHOWS/](https://eltonaguiar.github.io/MOVIESHOWS/)

### 2. FTP (findtorontoevents.ca/MOVIESHOWS)

From the **parent** repo (TORONTOEVENTS_ANTIGRAVITY):

1. Ensure the `movieshows` app and `movieshows-redirects` folder are present.
2. Run the main deploy (it builds MovieShows and uploads to `/MOVIESHOWS`, plus `.htaccess` redirects for MOVIES, SHOWS, TV, TVFINDER):

   ```bash
   npm run deploy:sftp
   ```

The deploy script builds MovieShows (`movieshows/out`), uploads it to `findtorontoevents.ca/MOVIESHOWS`, and uploads the redirect `.htaccess` files so MOVIES, SHOWS, TV, and TVFINDER redirect to MOVIESHOWS.

## Build (static export)

```bash
npm run build
```

Output is in `out/` (basePath `/MOVIESHOWS`). Use this for GitHub Pages or manual FTP upload.

## Tech

- [Next.js](https://nextjs.org) (App Router), static export
- React 19, Tailwind CSS, Framer Motion, Lucide icons, react-player
