import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

interface Move {
  name: string;
  startup?: number | string;
  onHit?: number | string;
  onBlock?: number | string;
  recovery?: number | string;
  damage?: number | string;
  guard?: string;
  type?: string;
}

interface Champion {
  name: string;
  moves: Move[];
}

const CHAMPIONS = [
  'Ekko',
  'Ahri',
  'Yasuo',
  'Vi',
  'Jinx',
  'Darius',
  'Blitzcrank',
  'Teemo',
  'Warwick',
  'Caitlyn'
];

function parseFrameValue(value: string): number | string {
  if (!value || value.trim() === '-' || value.trim() === '') return '-';
  const cleaned = value.trim().replace(/[^\d+-]/g, '');
  const num = parseInt(cleaned);
  return isNaN(num) ? value.trim() : num;
}

async function scrapeChampionFrameData(championName: string): Promise<Champion | null> {
  // Try multiple URL patterns
  const urls = [
    `https://2xko.wiki/w/${championName}/Frame_Data`,
    `https://2xko.wiki/w/${championName}`,
    `https://2xko.wiki/w/${championName}/Moves`,
    `https://2xko.wiki/w/${championName}/Move_List`
  ];
  
  let $: cheerio.CheerioAPI | null = null;
  let successfulUrl = '';
  let allMoves: Move[] = [];

  // Try each URL and collect data from all that have content
  for (const url of urls) {
    try {
      console.log(`  Trying: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      $ = cheerio.load(response.data);
      
      // Quick check if page has frame data indicators
      const bodyText = $.text().toLowerCase();
      const hasFrameData = bodyText.includes('startup') || bodyText.includes('on hit') || 
                          bodyText.includes('on block') || bodyText.includes('frame') ||
                          $('table').length > 0;
      
      if (hasFrameData) {
        successfulUrl = url;
        console.log(`  ✅ Found content at: ${url}`);
        
        // Extract moves from this page
        const pageMoves = extractMovesFromPage($, championName);
        if (pageMoves.length > 0) {
          allMoves = [...allMoves, ...pageMoves];
          console.log(`  📊 Extracted ${pageMoves.length} moves from this page`);
        }
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        continue; // Try next URL
      }
      console.log(`  ⚠️ Error: ${error.message}`);
      continue;
    }
  }

  if (allMoves.length === 0 && $) {
    // If we loaded a page but found no moves, try one more time with the last loaded page
    const pageMoves = extractMovesFromPage($, championName);
    allMoves = pageMoves;
  }

  if (allMoves.length === 0) {
    console.log(`  ❌ No frame data found for ${championName}`);
    return null;
  }

  // Remove duplicates based on move name
  const uniqueMoves = Array.from(
    new Map(allMoves.map(m => [m.name, m])).values()
  );

  console.log(`  ✅ Found ${uniqueMoves.length} unique moves for ${championName}`);
  return {
    name: championName,
    moves: uniqueMoves
  };
}

function extractMovesFromPage($: cheerio.CheerioAPI, championName: string): Move[] {
  const moves: Move[] = [];

  // First, try to extract from move list sections with frame data in text
  $('h2, h3, h4').each((_, heading) => {
    const headingText = $(heading).text().trim();
    if (headingText.includes('Normals') || headingText.includes('Specials') || headingText.includes('Supers')) {
      // Look for move lists under this heading
      let currentSection = $(heading).nextUntil('h2, h3, h4');
      currentSection.find('ul li, p').each((_, item) => {
        const text = $(item).text();
        // Look for move notation patterns like "5L", "2M", "S1", etc.
        const moveMatch = text.match(/^([0-9]+[LMH]|[0-9]+S[12]|S[12]|T|2T|4T)\s*[:\-]?\s*(.+?)(?:\s*[:\-]|$)/);
        if (moveMatch) {
          const moveName = moveMatch[1].trim();
          const description = moveMatch[2] || text;
          
          // Try to extract frame data from description
          const frameMatches = description.match(/(\d+)\s*(?:frame|f|startup|hit|block)/gi);
          if (frameMatches || description.length > 10) {
            // Create move entry - we'll try to get actual frame data from tables
            moves.push({
              name: moveName,
              type: headingText.toLowerCase().includes('normal') ? 'normal' : 
                    headingText.toLowerCase().includes('super') ? 'super' : 'special'
            });
          }
        }
      });
    }
  });

  // Look for frame data tables - be more aggressive
  $('table.wikitable, table, .wikitable table, .frame-data table').each((_, table) => {
      const rows = $(table).find('tr');
      if (rows.length < 2) return; // Need at least header + data row

      // Get headers to understand column structure
      const headers: string[] = [];
      $(rows[0]).find('th, td').each((_, cell) => {
        const text = $(cell).text().trim().toLowerCase();
        headers.push(text);
      });

      // Find which columns contain what data - more flexible matching
      const moveCol = headers.findIndex(h => 
        h.includes('move') || h.includes('input') || h.includes('command') || 
        h.includes('notation') || h === '' || h.length < 5
      );
      const startupCol = headers.findIndex(h => 
        h.includes('startup') || h.includes('start') || h.includes('active')
      );
      const onHitCol = headers.findIndex(h => 
        h.includes('hit') && (h.includes('on') || h.includes('advantage') || h.includes('frame'))
      );
      const onBlockCol = headers.findIndex(h => 
        h.includes('block') && (h.includes('on') || h.includes('advantage') || h.includes('frame'))
      );
      const recoveryCol = headers.findIndex(h => 
        h.includes('recovery') || h.includes('total') || h.includes('duration')
      );
      const damageCol = headers.findIndex(h => 
        h.includes('damage') || h.includes('dmg')
      );
      const guardCol = headers.findIndex(h => 
        h.includes('guard') || h.includes('block type') || h.includes('property')
      );

      // More lenient - if we have a move column and at least 2 data columns, try to parse
      if (moveCol === -1) {
        return;
      }
      
      // Check if we have any frame data columns
      const hasFrameData = startupCol !== -1 || onHitCol !== -1 || onBlockCol !== -1 || recoveryCol !== -1;
      if (!hasFrameData && headers.length < 3) {
        return; // Probably not a frame data table
      }

      // Process data rows
      rows.slice(1).each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length === 0) return;

        const moveName = moveCol !== -1 ? $(cells[moveCol]).text().trim() : '';
        if (!moveName || moveName === '') return;

        const move: Move = {
          name: moveName,
          startup: startupCol !== -1 ? parseFrameValue($(cells[startupCol]).text()) : undefined,
          onHit: onHitCol !== -1 ? parseFrameValue($(cells[onHitCol]).text()) : undefined,
          onBlock: onBlockCol !== -1 ? parseFrameValue($(cells[onBlockCol]).text()) : undefined,
          recovery: recoveryCol !== -1 ? parseFrameValue($(cells[recoveryCol]).text()) : undefined,
          damage: damageCol !== -1 ? parseFrameValue($(cells[damageCol]).text()) : undefined,
          guard: guardCol !== -1 ? $(cells[guardCol]).text().trim() : undefined
        };

        // Determine move type from name or context
        const nameLower = moveName.toLowerCase();
        if (nameLower.match(/^[0-9][lmh]/) || nameLower.includes('light') || nameLower.includes('medium') || nameLower.includes('heavy')) {
          move.type = 'normal';
        } else if (nameLower.includes('super') || nameLower.includes('ult') || nameLower.includes('level')) {
          move.type = 'super';
        } else {
          move.type = 'special';
        }

        moves.push(move);
      });
    });

  return moves;
}

async function main() {
  console.log('🎮 Scraping 2XKO Frame Data from Wiki...\n');

  const champions: Champion[] = [];

  for (const championName of CHAMPIONS) {
    const champion = await scrapeChampionFrameData(championName);
    if (champion) {
      champions.push(champion);
    }
    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  if (champions.length === 0) {
    console.log('\n❌ No frame data collected. Check wiki URLs and table structure.');
    process.exit(1);
  }

  const output = {
    champions,
    lastUpdated: new Date().toISOString(),
    source: '2XKO Wiki (https://2xko.wiki)'
  };

  // Save to file
  const outputPath = path.join(process.cwd(), 'frame-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Frame data saved to: ${outputPath}`);
  console.log(`📊 Total champions: ${champions.length}`);
  console.log(`📊 Total moves: ${champions.reduce((sum, c) => sum + c.moves.length, 0)}`);

  return output;
}

main().catch(console.error);
