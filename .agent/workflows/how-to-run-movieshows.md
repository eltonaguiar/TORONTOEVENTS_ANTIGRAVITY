---
description: How to run the MOVIESHOWS app locally and deploy to GitHub Pages
---

# How to Run MOVIESHOWS

1. Navigate to the project directory:
   ```powershell
   cd movieshows
   ```

2. Install dependencies (if not already done):
   ```powershell
   npm install
   ```
   Note: Make sure to verify `react-player` is installed.

3. Run the development server:
   ```powershell
   npm run dev
   ```
   Content will be available at http://localhost:3000

4. Build for deployment (Static Export):
   ```powershell
   npm run build
   ```
   This will generate an `out` folder.

5. Deploy to GitHub Pages:
   Create a `.github/workflows/nextjs.yml` file in the root of the repo (or use the one in `TORONTOEVENTS_ANTIGRAVITY` if configured for subtree).
   Since `MOVIESHOWS` is a subfolder, you might need a specific workflow that builds from that subfolder.
