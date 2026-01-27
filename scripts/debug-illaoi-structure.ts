import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as cheerio from 'cheerio';

async function debugIllaoiStructure() {
  console.log('🔍 Debugging Illaoi page structure...\n');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const url = 'https://wiki.play2xko.com/en-us/Illaoi';
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('table', { timeout: 5000 }).catch(() => {});
    
    const html = await page.content();
    const $ = cheerio.load(html);
    
    // Save HTML for inspection
    fs.writeFileSync('illaoi-debug.html', html);
    console.log('✅ Saved HTML to illaoi-debug.html\n');
    
    // Find all headings
    console.log('📋 Headings found:');
    $('h2, h3, h4, h5').each((i, heading) => {
      const text = $(heading).text().trim();
      if (text && text.length < 100) {
        console.log(`  ${i + 1}. ${text}`);
      }
    });
    
    // Find all tables and their structure
    console.log('\n📊 Tables found:');
    $('table').each((tableIdx, table) => {
      const rows = $(table).find('tr');
      if (rows.length < 2) return;
      
      console.log(`\nTable ${tableIdx + 1}: ${rows.length} rows`);
      
      // Get headers
      const headers: string[] = [];
      $(rows[0]).find('th, td').each((_, cell) => {
        headers.push($(cell).text().trim());
      });
      console.log(`  Headers: ${headers.join(' | ')}`);
      
      // Check if frame data table
      const headerText = headers.join(' ').toLowerCase();
      const isFrameData = headerText.includes('startup') || headerText.includes('on-block') || 
                         headerText.includes('on-hit') || headerText.includes('recovery');
      
      if (isFrameData) {
        console.log(`  ✅ FRAME DATA TABLE`);
        
        // Get heading before table
        let headingBefore = '';
        $(table).prevAll('h2, h3, h4, h5').first().each((_, h) => {
          headingBefore = $(h).text().trim().split('[')[0].trim();
        });
        console.log(`  Heading before: "${headingBefore}"`);
        
        // Show first 5 data rows
        console.log(`  First 5 rows:`);
        rows.slice(1, 6).each((rowIdx, row) => {
          const cells = $(row).find('td');
          const rowData: string[] = [];
          cells.each((_, cell) => {
            rowData.push($(cell).text().trim().substring(0, 30));
          });
          console.log(`    Row ${rowIdx + 1}: ${rowData.join(' | ')}`);
        });
      }
    });
    
    await browser.close();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await browser.close();
  }
}

debugIllaoiStructure().catch(console.error);
