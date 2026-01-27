import * as fs from 'fs';
import * as path from 'path';

// Fix Illaoi - the scraper was picking up damage values instead of move names
// Based on the wiki structure, Illaoi should have normals, specials, supers, etc.

const illaoiMoves = [
  // Standing Normals
  { name: '5L', input: '5L', inputGlyph: 'Light', keyboardButton: 'Light', type: 'normal' },
  { name: '5M', input: '5M', inputGlyph: 'Medium', keyboardButton: 'Medium', type: 'normal' },
  { name: '5H', input: '5H', inputGlyph: 'Heavy', keyboardButton: 'Heavy', type: 'normal' },
  
  // Crouching Normals
  { name: '2L', input: '2L', inputGlyph: '↓ Light', keyboardButton: 'Light', type: 'normal' },
  { name: '2M', input: '2M', inputGlyph: '↓ Medium', keyboardButton: 'Medium', type: 'normal' },
  { name: '2H', input: '2H', inputGlyph: '↓ Heavy', keyboardButton: 'Heavy', type: 'normal' },
  
  // Jumping Normals
  { name: 'j.L', input: 'j.L', inputGlyph: 'j.Light', keyboardButton: 'Light', type: 'normal' },
  { name: 'j.M', input: 'j.M', inputGlyph: 'j.Medium', keyboardButton: 'Medium', type: 'normal' },
  { name: 'j.H', input: 'j.H', inputGlyph: 'j.Heavy', keyboardButton: 'Heavy', type: 'normal' },
  { name: 'j.2H', input: 'j.2H', inputGlyph: 'j.↓ Heavy', keyboardButton: 'Heavy', type: 'normal' },
  
  // Universal Mechanics
  { name: 'Forward Throw', input: '5(M+H)', inputGlyph: 'Medium+Heavy', keyboardButton: 'Medium+Heavy', type: 'special' },
  { name: 'Back Throw', input: '4(M+H)', inputGlyph: '← Medium+Heavy', keyboardButton: 'Medium+Heavy', type: 'special' },
  { name: 'Air Throw', input: 'j.(M+H)', inputGlyph: 'j.(M+H)', keyboardButton: 'Medium+Heavy', type: 'special' },
  { name: 'Tag Launcher', input: '2T', inputGlyph: '↓ Tag', keyboardButton: 'Tag', type: 'special' },
  
  // Specials (from wiki - need to scrape properly)
  { name: 'Tentacle Smash', input: 'S1', inputGlyph: 'Special 1', keyboardButton: 'Special 1', type: 'special' },
  { name: 'Tentacle Smash Tentacle Follow Up', input: 'S1~S1', inputGlyph: 'Special 1 ~ Special 1', keyboardButton: 'Special 1', type: 'special' },
  { name: 'Riptide', input: '2S1', inputGlyph: '↓ Special 1', keyboardButton: 'Special 1', type: 'special' },
  { name: 'Cross', input: '6S1', inputGlyph: '→ Special 1', keyboardButton: 'Special 1', type: 'special' },
  { name: 'Riptide Tentacle Follow Up', input: '2S1~S1', inputGlyph: '↓ Special 1 ~ Special 1', keyboardButton: 'Special 1', type: 'special' },
  { name: 'Tidal Swing', input: '4S1', inputGlyph: '← Special 1', keyboardButton: 'Special 1', type: 'special' },
  { name: 'Tidal Swing Tentacle Follow Up', input: '4S1~S1', inputGlyph: '← Special 1 ~ Special 1', keyboardButton: 'Special 1', type: 'special' },
  { name: 'Prayer in Stagnation', input: 'S2', inputGlyph: 'Special 2', keyboardButton: 'Special 2', type: 'special' },
  { name: 'Prayer of Motion', input: '6S2', inputGlyph: '→ Special 2', keyboardButton: 'Special 2', type: 'special' },
  { name: 'Serpent\'s Tongue', input: '2S2', inputGlyph: '↓ Special 2', keyboardButton: 'Special 2', type: 'special' },
  { name: 'Guiding Hand', input: '4S2', inputGlyph: '← Special 2', keyboardButton: 'Special 2', type: 'special' },
  { name: 'Harsh Lesson', input: 'j.S1', inputGlyph: 'j.Special 1', keyboardButton: 'Special 1', type: 'special' },
  { name: 'From the Depths', input: 'j.S2', inputGlyph: 'j.Special 2', keyboardButton: 'Special 2', type: 'special' },
  { name: 'Faith in Motion', input: 'j.6S2', inputGlyph: 'j.→ Special 2', keyboardButton: 'Special 2', type: 'special' },
  
  // Supers
  { name: 'Crashing Waves', input: 'S1+L/M/H', inputGlyph: 'S1+L/M/H', keyboardButton: 'Special 1', type: 'super' },
  { name: 'Wrath of Nagakabouros', input: 'S2+L/M/H', inputGlyph: 'S2+L/M/H', keyboardButton: 'Special 2', type: 'super' },
  { name: 'Wrath of Nagakabouros Tentacle Follow Up', input: 'S2+L/M/H~S1', inputGlyph: 'S2+L/M/H~S1', keyboardButton: 'Special 2', type: 'super' },
  
  // Ultimate
  { name: 'Test of Spirit', input: 'S1+S2', inputGlyph: 'S1+S2', keyboardButton: 'Special 1+Special 2', type: 'super' },
  
  // Assists
  { name: 'Guiding Hand Assist', input: '5T', inputGlyph: 'Tag', keyboardButton: 'Tag', type: 'special' },
  { name: 'Tentacle Smash Assist', input: '4T', inputGlyph: '← Tag', keyboardButton: 'Tag', type: 'special' },
  { name: 'Wrath of Nagakabouros Assist', input: '2T', inputGlyph: '↓ Tag', keyboardButton: 'Tag', type: 'special' },
];

async function main() {
  const frameDataPath = path.join(process.cwd(), 'frame-data.json');
  const data = JSON.parse(fs.readFileSync(frameDataPath, 'utf-8'));
  
  // Remove existing Illaoi
  data.champions = data.champions.filter((c: any) => c.name !== 'Illaoi');
  
  // Add new Illaoi with proper move names
  data.champions.push({
    name: 'Illaoi',
    moves: illaoiMoves
  });
  
  data.lastUpdated = new Date().toISOString();
  
  fs.writeFileSync(frameDataPath, JSON.stringify(data, null, 2));
  console.log(`✅ Fixed Illaoi: ${illaoiMoves.length} moves`);
  console.log(`📊 Total: ${data.champions.length} champions`);
}

main().catch(console.error);
