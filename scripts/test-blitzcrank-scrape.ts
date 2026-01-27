import axios from 'axios';
import * as cheerio from 'cheerio';

async function testBlitzcrank() {
  const urls = [
    'https://2xko.wiki/w/Blitzcrank',
    'https://2xko.wiki/w/Blitzcrank/Frame_Data',
    'https://2xko.wiki/w/Blitzcrank/Moves',
    'https://2xko.wiki/w/Blitzcrank/Move_List'
  ];

  for (const url of urls) {
    try {
      console.log(`\n🔍 Testing: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      
      // Look for any tables
      const tables = $('table');
      console.log(`  Found ${tables.length} tables`);
      
      tables.each((i, table) => {
        const rows = $(table).find('tr');
        console.log(`  Table ${i + 1}: ${rows.length} rows`);
        
        if (rows.length > 0) {
          // Check first row for headers
          const headers: string[] = [];
          $(rows[0]).find('th, td').each((_, cell) => {
            headers.push($(cell).text().trim());
          });
          console.log(`    Headers: ${headers.join(', ')}`);
          
          // Check if it looks like frame data
          const headerText = headers.join(' ').toLowerCase();
          if (headerText.includes('startup') || headerText.includes('hit') || headerText.includes('block') || headerText.includes('frame')) {
            console.log(`    ✅ This looks like frame data!`);
            
            // Show first few data rows
            rows.slice(1, 4).each((_, row) => {
              const cells = $(row).find('td');
              const rowData: string[] = [];
              cells.each((_, cell) => {
                rowData.push($(cell).text().trim());
              });
              console.log(`    Row: ${rowData.join(' | ')}`);
            });
          }
        }
      });
      
      // Also check for frame data in text
      const bodyText = $('body').text();
      if (bodyText.includes('startup') || bodyText.includes('on hit') || bodyText.includes('on block')) {
        console.log(`  ✅ Page contains frame data keywords`);
      }
      
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
}

testBlitzcrank().catch(console.error);
