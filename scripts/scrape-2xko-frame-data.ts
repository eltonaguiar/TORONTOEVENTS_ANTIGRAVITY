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
  const url = `https://2xko.wiki/w/${championName}/Frame_Data`;
  
  try {
    console.log(`Scraping ${championName}...`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const moves: Move[] = [];

    // Look for frame data tables
    $('table.wikitable, table').each((_, table) => {
      const rows = $(table).find('tr');
      if (rows.length < 2) return; // Need at least header + data row

      // Get headers to understand column structure
      const headers: string[] = [];
      $(rows[0]).find('th, td').each((_, cell) => {
        const text = $(cell).text().trim().toLowerCase();
        headers.push(text);
      });

      // Find which columns contain what data
      const moveCol = headers.findIndex(h => h.includes('move') || h.includes('input') || h === '');
      const startupCol = headers.findIndex(h => h.includes('startup') || h.includes('start'));
      const onHitCol = headers.findIndex(h => h.includes('hit') || h.includes('on hit'));
      const onBlockCol = headers.findIndex(h => h.includes('block') || h.includes('on block'));
      const recoveryCol = headers.findIndex(h => h.includes('recovery') || h.includes('total'));
      const damageCol = headers.findIndex(h => h.includes('damage') || h.includes('dmg'));
      const guardCol = headers.findIndex(h => h.includes('guard') || h.includes('block type'));

      // Skip if we don't have at least move name and some frame data
      if (moveCol === -1 || (startupCol === -1 && onHitCol === -1 && onBlockCol === -1)) {
        return;
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

    if (moves.length === 0) {
      console.log(`  ⚠️ No frame data found for ${championName}`);
      return null;
    }

    console.log(`  ✅ Found ${moves.length} moves for ${championName}`);
    return {
      name: championName,
      moves
    };
  } catch (error: any) {
    console.error(`  ❌ Error scraping ${championName}:`, error.message);
    return null;
  }
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
