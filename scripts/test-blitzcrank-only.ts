import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function testBlitzcrankScrape() {
  console.log('🔍 Testing Blitzcrank Scrape...\n');
  
  const url = 'https://2xko.wiki/w/Blitzcrank';
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    
    // Look for ALL possible frame data patterns
    console.log('📊 Searching for frame data...\n');
    
    // Method 1: Tables
    console.log('Method 1: Tables');
    $('table').each((i, table) => {
      const rows = $(table).find('tr');
      console.log(`  Table ${i + 1}: ${rows.length} rows`);
      
      if (rows.length > 1) {
        const headers: string[] = [];
        $(rows[0]).find('th, td').each((_, cell) => {
          headers.push($(cell).text().trim());
        });
        console.log(`    Headers: ${headers.join(' | ')}`);
        
        // Check if it looks like frame data
        const headerText = headers.join(' ').toLowerCase();
        if (headerText.includes('startup') || headerText.includes('hit') || headerText.includes('block') || 
            headerText.includes('frame') || headerText.includes('recovery')) {
          console.log(`    ✅ FRAME DATA TABLE FOUND!`);
          
          // Show all rows
          rows.slice(1, 6).each((rowIdx, row) => {
            const cells = $(row).find('td');
            const rowData: string[] = [];
            cells.each((_, cell) => {
              rowData.push($(cell).text().trim());
            });
            console.log(`    Row ${rowIdx + 1}: ${rowData.join(' | ')}`);
          });
        }
      }
    });
    
    // Method 2: Look for frame data in lists
    console.log('\nMethod 2: Move Lists');
    $('ul li, ol li').each((i, item) => {
      const text = $(item).text();
      // Look for patterns like "5L: 6 startup, +0 on hit, -2 on block"
      if (text.match(/\d+[LMH]\s*[:]\s*\d+\s*(startup|f|frame)/i) || 
          text.match(/startup|on hit|on block/i)) {
        if (i < 10) { // Show first 10 matches
          console.log(`  Found: ${text.substring(0, 100)}`);
        }
      }
    });
    
    // Method 3: Look in definition lists
    console.log('\nMethod 3: Definition Lists');
    $('dl dt, dl dd').each((i, item) => {
      const text = $(item).text();
      if (text.match(/\d+[LMH]|S[12]|startup|frame/i)) {
        if (i < 10) {
          console.log(`  Found: ${text.substring(0, 100)}`);
        }
      }
    });
    
    // Method 4: Look for specific move sections
    console.log('\nMethod 4: Move Sections');
    $('h2, h3, h4').each((_, heading) => {
      const headingText = $(heading).text();
      if (headingText.includes('Normal') || headingText.includes('Special') || 
          headingText.includes('Super') || headingText.includes('Move')) {
        console.log(`  Section: ${headingText}`);
        const nextContent = $(heading).next().text().substring(0, 150);
        console.log(`    Content: ${nextContent}...`);
      }
    });
    
    // Save full HTML for inspection
    fs.writeFileSync('blitzcrank-full.html', $.html());
    console.log('\n✅ Full HTML saved to blitzcrank-full.html');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testBlitzcrankScrape().catch(console.error);
