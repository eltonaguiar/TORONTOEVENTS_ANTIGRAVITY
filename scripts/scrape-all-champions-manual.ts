import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// This script will try to scrape all 12 champions from wiki.play2xko.com
// If scraping fails, it will preserve existing data

const ALL_CHAMPIONS = [
  'Ahri',
  'Blitzcrank',
  'Braum',
  'Caitlyn',
  'Darius',
  'Ekko',
  'Illaoi',
  'Jinx',
  'Teemo',
  'Vi',
  'Warwick',
  'Yasuo',
];

async function tryScrapeChampion(championName: string): Promise<boolean> {
  const url = `https://wiki.play2xko.com/en-us/${championName}`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const tables = $('table');
    
    if (tables.length > 0) {
      console.log(`  ✅ ${championName}: Found ${tables.length} tables`);
      return true;
    }
    
    return false;
  } catch (error: any) {
    if (error.response?.status === 403) {
      console.log(`  ⚠️ ${championName}: 403 Forbidden (wiki blocking)`);
    } else {
      console.log(`  ❌ ${championName}: ${error.message}`);
    }
    return false;
  }
}

async function main() {
  console.log('🔍 Checking which champions can be scraped from wiki.play2xko.com...\n');
  
  const results: { [key: string]: boolean } = {};
  
  for (const champion of ALL_CHAMPIONS) {
    results[champion] = await tryScrapeChampion(champion);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  }
  
  console.log('\n📊 Summary:');
  const accessible = Object.entries(results).filter(([_, accessible]) => accessible);
  const blocked = Object.entries(results).filter(([_, accessible]) => !accessible);
  
  console.log(`\n✅ Accessible (${accessible.length}):`);
  accessible.forEach(([name]) => console.log(`  - ${name}`));
  
  console.log(`\n❌ Blocked/Missing (${blocked.length}):`);
  blocked.forEach(([name]) => console.log(`  - ${name}`));
  
  console.log('\n💡 Recommendation: Use manual data entry or browser-based scraping for blocked champions.');
}

main().catch(console.error);
