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

interface Champion {
  name: string;
  moves: Move[];
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

function isValidMoveName(name: string): boolean {
  if (!name || name.trim() === '') return false;
  
  // Reject if it's just numbers (damage values)
  if (/^\d+(\s*[+\-]\s*\d+)*$/.test(name.trim())) {
    return false;
  }
  
  // Reject if it's too short (less than 2 chars) or too long (more than 50)
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return false;
  }
  
  // Accept if it contains letters or common move notation
  if (/[a-zA-Z]/.test(trimmed) || /^[0-9]+[LMH]/.test(trimmed) || /^[jJ]\./.test(trimmed)) {
    return true;
  }
  
  return false;
}

async function scrapeChampionWithBrowser(championName: string): Promise<Champion | null> {
  console.log(`\n🎮 Scraping ${championName}...`);
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const url = `https://wiki.play2xko.com/en-us/${championName}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('table', { timeout: 5000 }).catch(() => {});
    
    const html = await page.content();
    const $ = cheerio.load(html);
    
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
      
      if (!hasFrameData) return;

      const startupCol = headers.findIndex(h => h.includes('startup'));
      const activeCol = headers.findIndex(h => h.includes('active'));
      const recoveryCol = headers.findIndex(h => h.includes('recovery'));
      const onBlockCol = headers.findIndex(h => h.includes('on-block') || h.includes('on block'));
      const onHitCol = headers.findIndex(h => h.includes('on-hit') || h.includes('on hit'));
      const damageCol = headers.findIndex(h => h.includes('damage'));
      const guardCol = headers.findIndex(h => h.includes('guard'));

      // Get move name from heading before table - this is more reliable
      let moveNameFromHeading = '';
      $(table).prevAll('h3, h4, h5').first().each((_, heading) => {
        const headingText = $(heading).text().trim();
        const cleanHeading = headingText.split('[')[0].trim();
        if (cleanHeading && cleanHeading.length < 50 && isValidMoveName(cleanHeading)) {
          moveNameFromHeading = cleanHeading;
        }
      });

      // Also check for move name in first column
      const moveNameCol = headers.findIndex(h => 
        h.includes('move') || h.includes('input') || h.includes('command') || 
        h === '' || (h.length < 10 && !h.includes('damage') && !h.includes('startup'))
      );

      rows.slice(1).each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length === 0) return;

        // Prefer heading name, then first cell, then move name column
        let moveName = moveNameFromHeading;
        if (!moveName && moveNameCol !== -1) {
          moveName = $(cells[moveNameCol]).text().trim();
        }
        if (!moveName && cells.length > 0) {
          moveName = $(cells[0]).text().trim();
        }
        
        // Validate move name
        if (!moveName || !isValidMoveName(moveName)) {
          return; // Skip invalid move names
        }

        const move: Move = {
          name: moveName,
          startup: startupCol !== -1 ? parseFrameValue($(cells[startupCol]).text()) : undefined,
          active: activeCol !== -1 ? parseFrameValue($(cells[activeCol]).text()) : undefined,
          recovery: recoveryCol !== -1 ? parseFrameValue($(cells[recoveryCol]).text()) : undefined,
          onHit: onHitCol !== -1 ? parseFrameValue($(cells[onHitCol]).text()) : undefined,
          onBlock: onBlockCol !== -1 ? parseFrameValue($(cells[onBlockCol]).text()) : undefined,
          damage: damageCol !== -1 ? parseFrameValue($(cells[damageCol]).text()) : undefined,
          guard: guardCol !== -1 ? $(cells[guardCol]).text().trim() : undefined
        };

        // Better move type detection
        const nameLower = moveName.toLowerCase();
        if (nameLower.match(/^[0-9][lmh]/) || nameLower.match(/^j\.[0-9]?[lmh]/) || 
            nameLower.includes('normal') || nameLower.includes('standing') || 
            nameLower.includes('crouching') || nameLower.includes('jumping')) {
          move.type = 'normal';
        } else if (nameLower.includes('super') || nameLower.includes('ult') || 
                   nameLower.includes('ultimate') || nameLower.match(/super[12]/i)) {
          move.type = 'super';
        } else if (nameLower.includes('throw') || nameLower.includes('tag launcher') ||
                   nameLower.includes('assist')) {
          move.type = 'special';
        } else {
          // Default to special for moves that aren't clearly normals or supers
          move.type = 'special';
        }

        moves.push(move);
      });
    });

    await browser.close();

    if (moves.length === 0) {
      console.log(`  ❌ No frame data found for ${championName}`);
      return null;
    }

    console.log(`  ✅ Found ${moves.length} moves for ${championName}`);
    const normals = moves.filter(m => m.type === 'normal').length;
    const specials = moves.filter(m => m.type === 'special').length;
    const supers = moves.filter(m => m.type === 'super').length;
    console.log(`     Normals: ${normals}, Specials: ${specials}, Supers: ${supers}`);
    
    return {
      name: championName,
      moves
    };
  } catch (error: any) {
    console.error(`  ❌ Error scraping ${championName}:`, error.message);
    await browser.close();
    return null;
  }
}

async function main() {
  console.log('🔍 QA: Re-scraping champions with improved validation...\n');
  
  const frameDataPath = path.join(process.cwd(), 'frame-data.json');
  let existingData: any = { champions: [] };
  if (fs.existsSync(frameDataPath)) {
    existingData = JSON.parse(fs.readFileSync(frameDataPath, 'utf-8'));
  }

  // Re-scrape problematic champions
  const problematicChampions = ['Illaoi', 'Yasuo', 'Blitzcrank', 'Braum', 'Darius', 'Vi', 'Warwick', 'Jinx'];
  
  for (const championName of problematicChampions) {
    const champion = await scrapeChampionWithBrowser(championName);
    if (champion) {
      // Remove old data
      existingData.champions = existingData.champions.filter((c: any) => c.name !== championName);
      // Add new data
      existingData.champions.push(champion);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  existingData.lastUpdated = new Date().toISOString();
  existingData.source = '2XKO Wiki (https://wiki.play2xko.com/en-us/)';

  fs.writeFileSync(frameDataPath, JSON.stringify(existingData, null, 2));
  
  console.log(`\n✅ QA complete!`);
  console.log(`📊 Total champions: ${existingData.champions.length}`);
  console.log(`📊 Total moves: ${existingData.champions.reduce((sum: number, c: any) => sum + (c.moves?.length || 0), 0)}`);
}

main().catch(console.error);
