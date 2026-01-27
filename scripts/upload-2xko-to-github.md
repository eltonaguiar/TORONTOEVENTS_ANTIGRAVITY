# Upload 2XKO Frame Data to GitHub

## Quick Upload (Manual)

1. Go to: https://github.com/eltonaguiar/2XKOFRAMEDATA
2. Click "Add file" → "Upload files"
3. Upload `frame-data.json` from this repository
4. Upload `2XKOFRAMEDATA_README.md` as `README.md`
5. Commit with message: "Add frame data from 2XKO Wiki"

## Automated Upload (Requires GitHub Token)

1. Create a GitHub Personal Access Token:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scope: `repo` (full control of private repositories)
   - Copy the token

2. Set the token as environment variable:
   ```bash
   # Windows PowerShell
   $env:GITHUB_TOKEN="your_token_here"
   
   # Windows CMD
   set GITHUB_TOKEN=your_token_here
   
   # Linux/Mac
   export GITHUB_TOKEN=your_token_here
   ```

3. Run the update script:
   ```bash
   npm run update:2xko:github
   ```

## Files to Upload

- `frame-data.json` - Main frame data file
- `README.md` - Repository documentation (from `2XKOFRAMEDATA_README.md`)

## Verify Upload

After uploading, verify at:
- https://raw.githubusercontent.com/eltonaguiar/2XKOFRAMEDATA/main/frame-data.json
- The web viewer should automatically detect and load the data
