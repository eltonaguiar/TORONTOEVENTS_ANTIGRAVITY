#!/usr/bin/env node
/**
 * QA Scanner: for each entry in broken_videos.json, search YouTube and Dailymotion
 * for "[title] trailer" and append suggested URLs for replacement.
 *
 * Usage (from movieshows/):
 *   node scripts/scan-broken-sources.mjs
 *
 * Optional: set YOUTUBE_API_KEY for YouTube search (otherwise only Dailymotion + manual links).
 * Dailymotion search works without an API key.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BROKEN_PATH = path.join(ROOT, 'src/data/broken_videos.json');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const DAILYMOTION_SEARCH = 'https://api.dailymotion.com/videos';

async function searchDailymotion(query, limit = 5) {
  const url = new URL(DAILYMOTION_SEARCH);
  url.searchParams.set('search', query);
  url.searchParams.set('fields', 'id,title,url');
  url.searchParams.set('limit', String(limit));
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  const list = data.list || data;
  return (Array.isArray(list) ? list : []).map((v) => ({
    source: 'dailymotion',
    id: v.id,
    url: v.url || `https://www.dailymotion.com/video/${v.id}`,
    title: v.title || '',
  }));
}

async function searchYouTube(query, limit = 5) {
  if (!YOUTUBE_API_KEY) return [];
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(limit));
  url.searchParams.set('key', YOUTUBE_API_KEY);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  const items = data.items || [];
  return items.map((v) => ({
    source: 'youtube',
    id: v.id?.videoId || v.id,
    url: v.id?.videoId ? `https://www.youtube.com/watch?v=${v.id.videoId}` : '',
    title: v.snippet?.title || '',
  })).filter((v) => v.id);
}

function readDb() {
  const raw = fs.readFileSync(BROKEN_PATH, 'utf8');
  const data = JSON.parse(raw);
  return {
    updated: data.updated || new Date().toISOString(),
    description: data.description,
    entries: Array.isArray(data.entries) ? data.entries : [],
  };
}

function writeDb(db) {
  db.updated = new Date().toISOString();
  fs.writeFileSync(BROKEN_PATH, JSON.stringify(db, null, 2), 'utf8');
}

async function main() {
  if (!fs.existsSync(BROKEN_PATH)) {
    console.error('Not found:', BROKEN_PATH);
    process.exit(1);
  }

  const db = readDb();
  const pending = db.entries.filter((e) => e.status === 'pending_replacement');
  if (pending.length === 0) {
    console.log('No pending broken entries to scan.');
    return;
  }

  console.log(`Scanning ${pending.length} broken entries (YouTube${YOUTUBE_API_KEY ? '' : ' (no key)'} + Dailymotion)...`);

  for (const entry of db.entries) {
    if (entry.status !== 'pending_replacement') continue;
    const query = `${entry.title} official trailer`.trim();
    if (!query || query === 'official trailer') continue;

    const [yt, dm] = await Promise.all([
      searchYouTube(query, 5),
      searchDailymotion(query, 5),
    ]);

    const suggestedUrls = [
      ...yt.map(({ source, id, url, title }) => ({ source, id, url, title })),
      ...dm.map(({ source, id, url, title }) => ({ source, id, url, title })),
    ];

    entry.suggestedUrls = suggestedUrls;
    console.log(`  ${entry.title}: ${yt.length} YouTube, ${dm.length} Dailymotion`);
  }

  writeDb(db);
  console.log('Updated', BROKEN_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
