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

async function scrapeIllaoiFromMoveSections(): Promise<Move[]> {
  console.log('🎮 Scraping Illaoi from individual move sections...\n');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const url = 'https://wiki.play2xko.com/en-us/Illaoi';
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.move-template', { timeout: 5000 }).catch(() => {});
    
    const html = await page.content();
    const $ = cheerio.load(html);
    
    const moves: Move[] = [];
    
    // Find all move sections (each move has a .move-template div)
    $('.move-template').each((moveIdx, moveSection) => {
      // Get move name from h4 heading
      const moveNameHeading = $(moveSection).find('h4 .mw-headline').first().text().trim();
      if (!moveNameHeading) return;
      
      // Get input notation from move-data div
      const inputDiv = $(moveSection).find('.move-data > div').first();
      const inputText = inputDiv.text().trim();
      
      // Extract frame data from move-data-item divs
      // Structure: <div class="move-data-item"><span class="tooltip">Startup:<span class="tooltiptext">explanation</span></span> 7</div>
      // The value comes AFTER the tooltip span closes
      const moveData: any = {};
      $(moveSection).find('.move-data-item').each((_, item) => {
        const $item = $(item);
        
        // For items with tooltip spans, get text after the span closes
        // For simple items, get text after colon
        let label = '';
        let value = '';
        
        // Check if it has a tooltip structure
        const tooltipSpan = $item.find('span.tooltip').first();
        if (tooltipSpan.length > 0) {
          // Get label from tooltip span text (before tooltiptext)
          const tooltipText = tooltipSpan.text().trim();
          label = tooltipText.split(':')[0] + ':';
          
          // Get value from text node AFTER the tooltip span
          // Clone and remove tooltip to get remaining text
          const $clone = $item.clone();
          $clone.find('span.tooltip').remove();
          const remainingText = $clone.text().trim();
          value = remainingText.replace(label, '').trim();
        } else {
          // Simple structure: "Damage: 45"
          const text = $item.text().trim();
          const colonIndex = text.indexOf(':');
          if (colonIndex !== -1) {
            label = text.substring(0, colonIndex + 1);
            value = text.substring(colonIndex + 1).trim();
          }
        }
        
        // Parse based on label
        if (label.includes('Damage')) {
          moveData.damage = value;
        } else if (label.includes('Guard')) {
          // Extract just the guard type (All, Low, High, U, LHA, etc.)
          const guardMatch = value.match(/^(All|Low|High|L|H|A|U|LHA|LHAU)/);
          if (guardMatch) moveData.guard = guardMatch[1];
        } else if (label.includes('Startup')) {
          // Extract number or range
          const numMatch = value.match(/^(\d+|[\d\s,~\-]+(?:\[H\])?)/);
          if (numMatch) moveData.startup = numMatch[1].trim();
        } else if (label.includes('Active')) {
          const numMatch = value.match(/^(\d+|[\d\s,~\-]+(?:\[H\])?)/);
          if (numMatch) moveData.active = numMatch[1].trim();
        } else if (label.includes('Recovery')) {
          if (value.includes('Until Landing') || value.includes('Until')) {
            moveData.recovery = 'Until Landing';
          } else {
            const numMatch = value.match(/^(\d+|[\d\s,~\-]+)/);
            if (numMatch) moveData.recovery = numMatch[1].trim();
          }
        } else if (label.includes('On-Block')) {
          if (value === '-' || value === 'N/A' || value === '') {
            moveData.onBlock = '-';
          } else {
            const numMatch = value.match(/^([+-]?\d+|[\d\s,~\-+]+)/);
            if (numMatch) moveData.onBlock = numMatch[1].trim();
          }
        } else if (label.includes('On-Hit')) {
          if (value === '-' || value === 'N/A' || value === '') {
            moveData.onHit = '-';
          } else {
            const numMatch = value.match(/^([+-]?\d+|[\d\s,~\-+]+)/);
            if (numMatch) moveData.onHit = numMatch[1].trim();
          }
        }
      });
      
      // Also check for table-based frame data
      $(moveSection).find('table.wikitable').each((_, table) => {
        const rows = $(table).find('tr');
        if (rows.length < 2) return;
        
        const headers: string[] = [];
        $(rows[0]).find('th').each((_, cell) => {
          headers.push($(cell).text().trim().toLowerCase());
        });
        
        // Get data from first data row
        const cells = $(rows[1]).find('td');
        headers.forEach((header, idx) => {
          if (idx < cells.length) {
            const value = $(cells[idx]).text().trim();
            if (header.includes('startup')) moveData.startup = value;
            else if (header.includes('active')) moveData.active = value;
            else if (header.includes('recovery')) moveData.recovery = value;
            else if (header.includes('on-block') || header.includes('on block')) moveData.onBlock = value;
            else if (header.includes('on-hit') || header.includes('on hit')) moveData.onHit = value;
            else if (header.includes('damage')) moveData.damage = value;
            else if (header.includes('guard')) moveData.guard = value;
          }
        });
      });
      
      // Determine move type from section context
      const sectionContext = $(moveSection).closest('div').prevAll('h2, h3').first().text().toLowerCase();
      let moveType = 'special';
      const nameLower = moveNameHeading.toLowerCase();
      
      if (nameLower.match(/^[0-9][lmh]/) || nameLower.match(/^j\.[0-9]?[lmh]/) ||
          sectionContext.includes('normal') || sectionContext.includes('standing') ||
          sectionContext.includes('crouching') || sectionContext.includes('jumping')) {
        moveType = 'normal';
      } else if (nameLower.includes('super') || nameLower.includes('ult') ||
                 sectionContext.includes('super') || sectionContext.includes('ultimate')) {
        moveType = 'super';
      }
      
      const move: Move = {
        name: moveNameHeading,
        input: inputText || undefined,
        startup: moveData.startup ? parseFrameValue(moveData.startup) : undefined,
        active: moveData.active ? parseFrameValue(moveData.active) : undefined,
        recovery: moveData.recovery ? parseFrameValue(moveData.recovery) : undefined,
        onHit: moveData.onHit ? parseFrameValue(moveData.onHit) : undefined,
        onBlock: moveData.onBlock ? parseFrameValue(moveData.onBlock) : undefined,
        damage: moveData.damage ? parseFrameValue(moveData.damage) : undefined,
        guard: moveData.guard || undefined,
        type: moveType
      };
      
      // Only add if we have at least startup or onBlock
      if (move.startup !== undefined || move.onBlock !== undefined) {
        moves.push(move);
        console.log(`  ✅ ${moveNameHeading}: startup=${move.startup}, onHit=${move.onHit}, onBlock=${move.onBlock}`);
      }
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
  data.champions = data.champions.filter((c: any) => c.name !== 'Illaoi');
  
  // Scrape fresh Illaoi data from move sections
  const moves = await scrapeIllaoiFromMoveSections();
  
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
    console.log('\n❌ Failed to scrape Illaoi data');
  }
}

main().catch(console.error);
