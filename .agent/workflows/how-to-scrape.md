---
description: How to run the event scraper to get the latest events
---

# Scrape Events

To populate the application with the latest events from Eventbrite, AllEvents.in, and other sources, run the following command in your terminal:

```bash
npm run scrape
```

## Configuration

The scraper is configured to fetch a high volume of events to ensure coverage (~200+ events per day).
- **Eventbrite**: Scrapes pages 1-8 for 18+ categories.
- **AllEvents**: Scrapes pages 1-6 for 12+ categories.

## Performance

The scraping process can take **10-15 minutes** due to:
1.  **Deep Pagination**: Fetching hundreds of pages.
2.  **Enrichment**: Each potential event for the current week is visited individually to extract real start times and full descriptions.
3.  **Rate Limiting**: A 500ms delay is added between requests to prevent IP bans.

**Note**: Do not interrupt the process, or the data will not be saved.

## Verification

After scraping, you can verify the event counts distribution by running:

```bash
npx tsx scripts/check-today-stats.ts
```
