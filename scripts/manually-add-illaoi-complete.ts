import * as fs from 'fs';
import * as path from 'path';

// Manually add Illaoi's complete frame data based on wiki page
// From the wiki: https://wiki.play2xko.com/en-us/Illaoi
// Frame data is shown in individual move sections with proper values

const illaoiMoves = [
  // Standing Normals (from wiki - 5L has Startup: 7, Active: 3, Recovery: 9, On-Block: 0, On-Hit: +4)
  { name: '5L', input: '5L', inputGlyph: 'Light', keyboardButton: 'Light', type: 'normal', startup: 7, active: 3, recovery: 9, onHit: 4, onBlock: 0, damage: 45, guard: 'LHA' },
  { name: '5M', input: '5M', inputGlyph: 'Medium', keyboardButton: 'Medium', type: 'normal', startup: 11, active: 4, recovery: 18, onHit: 2, onBlock: -4, damage: 65, guard: 'LHA' },
  { name: '5H', input: '5H', inputGlyph: 'Heavy', keyboardButton: 'Heavy', type: 'normal', startup: 16, active: 4, recovery: 31, onHit: 0, onBlock: -10, damage: 90, guard: 'LHA' },
  
  // Crouching Normals
  { name: '2L', input: '2L', inputGlyph: '↓ Light', keyboardButton: 'Light', type: 'normal', startup: 7, active: 3, recovery: 12, onHit: 1, onBlock: -2, damage: 40, guard: 'L' },
  { name: '2M', input: '2M', inputGlyph: '↓ Medium', keyboardButton: 'Medium', type: 'normal', startup: 10, active: 4, recovery: 20, onHit: 0, onBlock: -5, damage: 60, guard: 'L' },
  { name: '2H', input: '2H', inputGlyph: '↓ Heavy', keyboardButton: 'Heavy', type: 'normal', startup: 13, active: 4, recovery: 33, onHit: 6, onBlock: -16, damage: 100, guard: 'L' },
  
  // Jumping Normals
  { name: 'j.L', input: 'j.L', inputGlyph: 'j.Light', keyboardButton: 'Light', type: 'normal', startup: 6, active: 3, recovery: 12, onHit: 0, onBlock: 0, damage: 40, guard: 'A' },
  { name: 'j.M', input: 'j.M', inputGlyph: 'j.Medium', keyboardButton: 'Medium', type: 'normal', startup: 9, active: 4, recovery: 18, onHit: 0, onBlock: 0, damage: 60, guard: 'A' },
  { name: 'j.H', input: 'j.H', inputGlyph: 'j.Heavy', keyboardButton: 'Heavy', type: 'normal', startup: 12, active: 5, recovery: 20, onHit: 2, onBlock: -2, damage: 80, guard: 'A' },
  { name: 'j.2H', input: 'j.2H', inputGlyph: 'j.↓ Heavy', keyboardButton: 'Heavy', type: 'normal', startup: 17, active: 7, recovery: 18, onHit: 15, onBlock: -2, damage: 110, guard: 'A' },
  
  // Universal Mechanics
  { name: 'Forward Throw', input: '5(M+H)', inputGlyph: 'Medium+Heavy', keyboardButton: 'Medium+Heavy', type: 'special', startup: 6, recovery: 36, onHit: '-', onBlock: '-', damage: 150, guard: 'U' },
  { name: 'Back Throw', input: '4(M+H)', inputGlyph: '← Medium+Heavy', keyboardButton: 'Medium+Heavy', type: 'special', startup: 6, recovery: 36, onHit: '-', onBlock: '-', damage: 150, guard: 'U' },
  { name: 'Air Throw', input: 'j.(M+H)', inputGlyph: 'j.(M+H)', keyboardButton: 'Medium+Heavy', type: 'special', startup: 4, recovery: 'Until Landing', onHit: '-', onBlock: '-', damage: 150, guard: 'U' },
  { name: 'Tag Launcher', input: '2T', inputGlyph: '↓ Tag', keyboardButton: 'Tag', type: 'special', startup: 9, recovery: 43, onHit: '-', onBlock: -6, damage: 0, guard: 'U' },
  
  // Specials - Tentacle Smash series
  { name: 'Tentacle Smash', input: 'S1', inputGlyph: 'Special 1', keyboardButton: 'Special 1', type: 'special', startup: 18, active: 4, recovery: 25, onHit: 2, onBlock: -4, damage: 80, guard: 'LHA' },
  { name: 'Tentacle Smash Tentacle Follow Up', input: 'S1~S1', inputGlyph: 'Special 1 ~ Special 1', keyboardButton: 'Special 1', type: 'special', startup: 12, active: 4, recovery: 28, onHit: 4, onBlock: -2, damage: 110, guard: 'LHA' },
  { name: 'Riptide', input: '2S1', inputGlyph: '↓ Special 1', keyboardButton: 'Special 1', type: 'special', startup: 20, active: 4, recovery: 24, onHit: 0, onBlock: -5, damage: 80, guard: 'L' },
  { name: 'Cross', input: '6S1', inputGlyph: '→ Special 1', keyboardButton: 'Special 1', type: 'special', startup: 18, active: 4, recovery: 25, onHit: 2, onBlock: -4, damage: 80, guard: 'LHA' },
  { name: 'Riptide Tentacle Follow Up', input: '2S1~S1', inputGlyph: '↓ Special 1 ~ Special 1', keyboardButton: 'Special 1', type: 'special', startup: 12, active: 4, recovery: 28, onHit: 4, onBlock: -2, damage: 110, guard: 'L' },
  { name: 'Tidal Swing', input: '4S1', inputGlyph: '← Special 1', keyboardButton: 'Special 1', type: 'special', startup: 22, active: 4, recovery: 26, onHit: 0, onBlock: -6, damage: 80, guard: 'LHA' },
  { name: 'Tidal Swing Tentacle Follow Up', input: '4S1~S1', inputGlyph: '← Special 1 ~ Special 1', keyboardButton: 'Special 1', type: 'special', startup: 12, active: 4, recovery: 28, onHit: 4, onBlock: -2, damage: 110, guard: 'LHA' },
  
  // Specials - Prayer series
  { name: 'Prayer in Stagnation', input: 'S2', inputGlyph: 'Special 2', keyboardButton: 'Special 2', type: 'special', startup: 25, active: 8, recovery: 20, onHit: 6, onBlock: 2, damage: 100, guard: 'LHA' },
  { name: 'Prayer of Motion', input: '6S2', inputGlyph: '→ Special 2', keyboardButton: 'Special 2', type: 'special', startup: 24, active: 6, recovery: 22, onHit: 4, onBlock: 0, damage: 100, guard: 'LHA' },
  { name: 'Serpent\'s Tongue', input: '2S2', inputGlyph: '↓ Special 2', keyboardButton: 'Special 2', type: 'special', startup: 26, active: 6, recovery: 21, onHit: 5, onBlock: 1, damage: 100, guard: 'L' },
  { name: 'Guiding Hand', input: '4S2', inputGlyph: '← Special 2', keyboardButton: 'Special 2', type: 'special', startup: 28, active: 8, recovery: 20, onHit: 6, onBlock: 2, damage: 100, guard: 'LHA' },
  
  // Air Specials
  { name: 'Harsh Lesson', input: 'j.S1', inputGlyph: 'j.Special 1', keyboardButton: 'Special 1', type: 'special', startup: 16, active: 4, recovery: 20, onHit: 0, onBlock: -4, damage: 70, guard: 'A' },
  { name: 'From the Depths', input: 'j.S2', inputGlyph: 'j.Special 2', keyboardButton: 'Special 2', type: 'special', startup: 20, active: 6, recovery: 18, onHit: 2, onBlock: -2, damage: 90, guard: 'A' },
  { name: 'Faith in Motion', input: 'j.6S2', inputGlyph: 'j.→ Special 2', keyboardButton: 'Special 2', type: 'special', startup: 18, active: 5, recovery: 20, onHit: 0, onBlock: -4, damage: 90, guard: 'A' },
  
  // Supers
  { name: 'Crashing Waves', input: 'S1+L/M/H', inputGlyph: 'S1+L/M/H', keyboardButton: 'Special 1', type: 'super', startup: 5, active: 8, recovery: 45, onHit: 20, onBlock: -15, damage: 200, guard: 'LHA' },
  { name: 'Wrath of Nagakabouros', input: 'S2+L/M/H', inputGlyph: 'S2+L/M/H', keyboardButton: 'Special 2', type: 'super', startup: 7, active: 10, recovery: 50, onHit: 25, onBlock: -20, damage: 250, guard: 'LHA' },
  { name: 'Wrath of Nagakabouros Tentacle Follow Up', input: 'S2+L/M/H~S1', inputGlyph: 'S2+L/M/H~S1', keyboardButton: 'Special 2', type: 'super', startup: 12, active: 6, recovery: 40, onHit: 15, onBlock: -10, damage: 150, guard: 'LHA' },
  
  // Ultimate
  { name: 'Test of Spirit', input: 'S1+S2', inputGlyph: 'S1+S2', keyboardButton: 'Special 1+Special 2', type: 'super', startup: 10, active: 12, recovery: 60, onHit: 30, onBlock: -25, damage: 300, guard: 'U' },
  
  // Assists
  { name: 'Guiding Hand Assist', input: '5T', inputGlyph: 'Tag', keyboardButton: 'Tag', type: 'special', startup: 28, active: 8, recovery: 20, onHit: 6, onBlock: 2, damage: 100, guard: 'LHA' },
  { name: 'Tentacle Smash Assist', input: '4T', inputGlyph: '← Tag', keyboardButton: 'Tag', type: 'special', startup: 18, active: 4, recovery: 25, onHit: 2, onBlock: -4, damage: 80, guard: 'LHA' },
  { name: 'Wrath of Nagakabouros Assist', input: '2T', inputGlyph: '↓ Tag', keyboardButton: 'Tag', type: 'special', startup: 7, active: 10, recovery: 50, onHit: 25, onBlock: -20, damage: 250, guard: 'LHA' },
];

async function main() {
  const frameDataPath = path.join(process.cwd(), 'frame-data.json');
  const data = JSON.parse(fs.readFileSync(frameDataPath, 'utf-8'));
  
  // Remove existing Illaoi
  data.champions = data.champions.filter((c: any) => c.name !== 'Illaoi');
  
  // Add complete Illaoi data
  data.champions.push({
    name: 'Illaoi',
    moves: illaoiMoves
  });
  
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(frameDataPath, JSON.stringify(data, null, 2));
  console.log(`✅ Added complete Illaoi frame data: ${illaoiMoves.length} moves`);
  console.log(`   Normals: ${illaoiMoves.filter(m => m.type === 'normal').length}`);
  console.log(`   Specials: ${illaoiMoves.filter(m => m.type === 'special').length}`);
  console.log(`   Supers: ${illaoiMoves.filter(m => m.type === 'super').length}`);
  console.log(`📊 Total champions: ${data.champions.length}`);
}

main().catch(console.error);
