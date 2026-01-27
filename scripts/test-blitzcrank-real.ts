import axios from 'axios';
import * as cheerio from 'cheerio';

async function testBlitzcrankReal() {
  console.log('🔍 Testing Blitzcrank Frame Data from correct URL...\n');
  
  const url = 'https://wiki.play2xko.com/en-us/Blitzcrank/Frame_Data';
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    
    // Look for the frame data table
    console.log('📊 Searching for frame data table...\n');
    
    $('table').each((i, table) => {
      const rows = $(table).find('tr');
      console.log(`Table ${i + 1}: ${rows.length} rows`);
      
      if (rows.length > 1) {
        // Get headers
        const headers: string[] = [];
        $(rows[0]).find('th, td').each((_, cell) => {
          headers.push($(cell).text().trim());
        });
        console.log(`Headers: ${headers.join(' | ')}\n`);
        
        // Check if it's the frame data table
        const headerText = headers.join(' ').toLowerCase();
        if (headerText.includes('startup') || headerText.includes('on block') || headerText.includes('recovery')) {
          console.log('✅ FRAME DATA TABLE FOUND!\n');
          
          // Process all rows
          rows.slice(1).each((rowIdx, row) => {
            const cells = $(row).find('td');
            if (cells.length > 0) {
              const rowData: string[] = [];
              cells.each((_, cell) => {
                rowData.push($(cell).text().trim());
              });
              console.log(`Row ${rowIdx + 1}: ${rowData.join(' | ')}`);
            }
          });
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testBlitzcrankReal().catch(console.error);
