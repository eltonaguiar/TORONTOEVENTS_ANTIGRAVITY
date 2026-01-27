import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function scrapeBlitzcrankDetailed() {
  console.log('🔍 Detailed Blitzcrank Scrape...\n');
  
  const url = 'https://2xko.wiki/w/Blitzcrank';
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const $ = cheerio.load(response.data);
  
  // Save HTML for inspection
  fs.writeFileSync('blitzcrank-page.html', $.html());
  console.log('✅ Saved page HTML to blitzcrank-page.html\n');
  
  // Find all tables
  console.log('📊 Tables found:');
  $('table').each((i, table) => {
    console.log(`\nTable ${i + 1}:`);
    const rows = $(table).find('tr');
    console.log(`  Rows: ${rows.length}`);
    
    // First row (headers)
    const headers: string[] = [];
    $(rows[0]).find('th, td').each((_, cell) => {
      const text = $(cell).text().trim();
      headers.push(text);
      console.log(`    Header: "${text}"`);
    });
    
    // Show first few data rows
    rows.slice(1, 4).each((rowIdx, row) => {
      const cells = $(row).find('td');
      const rowData: string[] = [];
      cells.each((_, cell) => {
        rowData.push($(cell).text().trim());
      });
      console.log(`    Row ${rowIdx + 1}: ${rowData.join(' | ')}`);
    });
  });
  
  // Look for frame data in text
  console.log('\n📝 Searching for frame data patterns...');
  const bodyText = $('body').text();
  
  // Look for move notation patterns
  const movePatterns = [
    /(\d+[LMH])\s*[:\-]?\s*(\d+)\s*[:\-]?\s*([+-]?\d+)\s*[:\-]?\s*([+-]?\d+)/g,
    /(\d+[LMH]).*?(\d+).*?([+-]?\d+).*?([+-]?\d+)/g
  ];
  
  movePatterns.forEach((pattern, idx) => {
    const matches = bodyText.matchAll(pattern);
    let count = 0;
    for (const match of matches) {
      if (count < 5) {
        console.log(`  Pattern ${idx + 1} match: ${match[0]}`);
        count++;
      }
    }
  });
  
  // Look for sections with "Frame" in title
  console.log('\n📑 Sections with "Frame" or "Move":');
  $('h2, h3, h4, .mw-heading').each((_, heading) => {
    const text = $(heading).text();
    if (text.toLowerCase().includes('frame') || text.toLowerCase().includes('move')) {
      console.log(`  ${text}`);
    }
  });
}

scrapeBlitzcrankDetailed().catch(console.error);
