import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

interface Move {
  name: string;
  input?: string;
  inputGlyph?: string;
  keyboardButton?: string;
  keyboardInput?: string;
  startup?: number | string;
  active?: number | string;
  recovery?: number | string;
  onHit?: number | string;
  onBlock?: number | string;
  damage?: number | string;
  guard?: string;
  type?: string;
}

function parseFrameValue(value: string): number | string {
  if (!value || value.trim() === '-' || value.trim() === '' || value.trim() === '—') return '-';
  const rangeMatch = value.match(/(\d+)\s*[-~]\s*(\d+)/);
  if (rangeMatch) {
    return value.trim();
  }
  const cleaned = value.trim().replace(/[^\d+-]/g, '');
  const num = parseInt(cleaned);
  return isNaN(num) ? value.trim() : num;
}

async function scrapeIllaoiFrameData(): Promise<Move[]> {
  console.log('🎮 Scraping Illaoi frame data from wiki...\n');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Try the Frame_Data subpage first
    const url = 'https://wiki.play2xko.com/en-us/Illaoi/Frame_Data';
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('table', { timeout: 5000 }).catch(() => {});
    
    const html = await page.content();
    const $ = cheerio.load(html);
    
    // Save HTML for debugging
    fs.writeFileSync('illaoi-frame-data-debug.html', html);
    console.log('✅ Saved HTML to illaoi-frame-data-debug.html\n');
    
    const moves: Move[] = [];
    
    // Find all frame data tables
    $('table').each((tableIdx, table) => {
      const rows = $(table).find('tr');
      if (rows.length < 2) return;

      const headers: string[] = [];
      $(rows[0]).find('th, td').each((_, cell) => {
        headers.push($(cell).text().trim().toLowerCase());
      });

      const headerText = headers.join(' ');
      const hasFrameData = headerText.includes('startup') || 
                          headerText.includes('on-block') || 
                          headerText.includes('on-hit') ||
                          headerText.includes('recovery') ||
                          headerText.includes('active');
      
      if (!hasFrameData) {
        console.log(`  ⏭️  Skipping table ${tableIdx + 1} (not frame data)`);
        return;
      }

      console.log(`  📊 Found frame data table ${tableIdx + 1} with ${rows.length - 1} rows`);
      console.log(`     Headers: ${headers.join(', ')}`);

      const startupCol = headers.findIndex(h => h.includes('startup'));
      const activeCol = headers.findIndex(h => h.includes('active'));
      const recoveryCol = headers.findIndex(h => h.includes('recovery'));
      const onBlockCol = headers.findIndex(h => h.includes('on-block') || h.includes('on block'));
      const onHitCol = headers.findIndex(h => h.includes('on-hit') || h.includes('on hit'));
      const damageCol = headers.findIndex(h => h.includes('damage'));
      const guardCol = headers.findIndex(h => h.includes('guard'));
      const inputCol = headers.findIndex(h => h.includes('input') || h.includes('notation') || h.includes('command') || h.includes('move'));

      // Get section context
      const sectionContext = $(table).prevAll('h2, h3').first().text().toLowerCase();
      console.log(`     Section: ${sectionContext.substring(0, 50)}`);

      // Get move name from heading
      let moveNameFromHeading = '';
      $(table).prevAll('h2, h3, h4, h5').slice(0, 10).each((_, heading) => {
        const headingText = $(heading).text().trim();
        const cleanHeading = headingText.split('[')[0].trim();
        const lowerHeading = cleanHeading.toLowerCase();
        if (cleanHeading && cleanHeading.length < 50 && cleanHeading.length > 0 &&
            !lowerHeading.includes('moves[edit') &&
            !lowerHeading.includes('mechanics[edit') &&
            !lowerHeading.includes('specials[edit') &&
            !lowerHeading.includes('supers[edit') &&
            !lowerHeading.includes('ultimate[edit') &&
            !lowerHeading.includes('assists[edit') &&
            !lowerHeading.includes('standing normals') &&
            !lowerHeading.includes('crouching normals') &&
            !lowerHeading.includes('jumping normals') &&
            !lowerHeading.includes('universal mechanics') &&
            !lowerHeading.includes('contents') &&
            !lowerHeading.includes('navigation')) {
          if (/[a-zA-Z]/.test(cleanHeading) || /^[0-9]+[LMH]/.test(cleanHeading) || /^j\./.test(cleanHeading) || /^[0-9]+S[12]/.test(cleanHeading)) {
            moveNameFromHeading = cleanHeading;
            return false;
          }
        }
      });

      rows.slice(1).each((rowIdx, row) => {
        const cells = $(row).find('td');
        if (cells.length === 0) return;

        // Try to get move name
        let moveName = '';
        let input = '';
        
        if (inputCol !== -1 && inputCol < cells.length) {
          const inputText = $(cells[inputCol]).text().trim();
          if (inputText && inputText !== '-' && !/^\d+(\s*[+\-]\s*\d+)*$/.test(inputText)) {
            input = inputText;
            moveName = inputText;
          }
        }
        
        if (!moveName) {
          moveName = moveNameFromHeading;
        }
        
        if (!moveName) {
          const firstCellText = $(cells[0]).text().trim();
          if (firstCellText && firstCellText !== '-' && !/^\d+(\s*[+\-]\s*\d+)*$/.test(firstCellText)) {
            moveName = firstCellText;
            if (!input) input = firstCellText;
          }
        }
        
        if (!moveName || moveName === '' || moveName === '-') return;
        if (/^\d+(\s*[+\-]\s*\d+)*$/.test(moveName.trim())) return;

        const move: Move = {
          name: moveName,
          input: input || undefined,
          startup: startupCol !== -1 && startupCol < cells.length ? parseFrameValue($(cells[startupCol]).text()) : undefined,
          active: activeCol !== -1 && activeCol < cells.length ? parseFrameValue($(cells[activeCol]).text()) : undefined,
          recovery: recoveryCol !== -1 && recoveryCol < cells.length ? parseFrameValue($(cells[recoveryCol]).text()) : undefined,
          onHit: onHitCol !== -1 && onHitCol < cells.length ? parseFrameValue($(cells[onHitCol]).text()) : undefined,
          onBlock: onBlockCol !== -1 && onBlockCol < cells.length ? parseFrameValue($(cells[onBlockCol]).text()) : undefined,
          damage: damageCol !== -1 && damageCol < cells.length ? parseFrameValue($(cells[damageCol]).text()) : undefined,
          guard: guardCol !== -1 && guardCol < cells.length ? $(cells[guardCol]).text().trim() : undefined
        };

        // Only add if we have frame data
        if (move.startup === undefined && move.onBlock === undefined && move.onHit === undefined) {
          return;
        }

        // Determine type
        const nameLower = moveName.toLowerCase();
        if (nameLower.match(/^[0-9][lmh]/) || nameLower.match(/^j\.[0-9]?[lmh]/) || 
            sectionContext.includes('normal') || sectionContext.includes('standing') ||
            sectionContext.includes('crouching') || sectionContext.includes('jumping')) {
          move.type = 'normal';
        } else if (nameLower.includes('super') || nameLower.includes('ult') || 
                   sectionContext.includes('super') || sectionContext.includes('ultimate')) {
          move.type = 'super';
        } else {
          move.type = 'special';
        }

        moves.push(move);
        console.log(`     ✅ Row ${rowIdx + 1}: ${moveName} (startup=${move.startup}, onBlock=${move.onBlock})`);
      });
    });

    await browser.close();

    console.log(`\n✅ Found ${moves.length} moves with frame data for Illaoi`);
    return moves;
  } catch (error: any) {
    console.error('  ❌ Error scraping Illaoi:', error.message);
    await browser.close();
    return [];
  }
}

async function main() {
  const frameDataPath = path.join(process.cwd(), 'frame-data.json');
  const data = JSON.parse(fs.readFileSync(frameDataPath, 'utf-8'));
  
  // Remove existing Illaoi
  const beforeCount = data.champions.length;
  data.champions = data.champions.filter((c: any) => c.name !== 'Illaoi');
  
  // Scrape fresh Illaoi data
  const moves = await scrapeIllaoiFrameData();
  
  if (moves.length > 0) {
    data.champions.push({
      name: 'Illaoi',
      moves: moves
    });
    
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(frameDataPath, JSON.stringify(data, null, 2));
    console.log(`\n✅ Updated Illaoi with ${moves.length} moves`);
    console.log(`📊 Total champions: ${data.champions.length}`);
  } else {
    console.log('\n❌ Failed to scrape Illaoi data - keeping existing data');
  }
}

main().catch(console.error);
