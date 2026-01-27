import * as fs from 'fs';
import * as path from 'path';

// Caitlyn frame data extracted from wiki.play2xko.com/en-us/Caitlyn
const caitlynMoves = [
  // Standing Normals
  { name: '5L', input: '5L', inputGlyph: 'L', keyboardButton: 'Light', startup: 6, active: 4, recovery: 10, onBlock: -1, damage: 40, guard: 'LHA', type: 'normal' },
  { name: '5M', input: '5M', inputGlyph: 'M', keyboardButton: 'Medium', startup: 10, active: 5, recovery: 21, onBlock: -9, damage: 55, guard: 'LHA', type: 'normal' },
  { name: '5H', input: '5H', inputGlyph: 'H', keyboardButton: 'Heavy', startup: 15, active: 3, recovery: 26, onBlock: -8, damage: 70, guard: 'LHA', type: 'normal' },
  { name: '5[H]', input: '5[H]', inputGlyph: 'H', keyboardButton: 'Heavy', startup: '26-32', active: 4, recovery: 20, onBlock: '-3, +18', damage: 90, guard: 'LHA', type: 'normal' },
  
  // Crouching Normals
  { name: '2L', input: '2L', inputGlyph: '↓ L', keyboardButton: 'Light', startup: 7, active: 3, recovery: 12, onBlock: -2, damage: 40, guard: 'L', type: 'normal' },
  { name: '2M', input: '2M', inputGlyph: '↓ M', keyboardButton: 'Medium', startup: 11, active: 3, recovery: 23, onBlock: -9, damage: 55, guard: 'L', type: 'normal' },
  { name: '2H', input: '2H', inputGlyph: '↓ H', keyboardButton: 'Heavy', startup: 13, active: 4, recovery: 26, onBlock: -11, damage: 70, guard: 'LHA', type: 'normal' },
  
  // Jumping Normals
  { name: 'j.L', input: 'j.L', inputGlyph: 'j.L', keyboardButton: 'Light', startup: 7, active: 4, recovery: 16, onBlock: '+7~+11', damage: 40, guard: 'H', type: 'normal' },
  { name: 'j.M', input: 'j.M', inputGlyph: 'j.M', keyboardButton: 'Medium', startup: 9, active: 5, recovery: 16, onBlock: '+11~+15', damage: 55, guard: 'H', type: 'normal' },
  { name: 'j.H', input: 'j.H', inputGlyph: 'j.H', keyboardButton: 'Heavy', startup: 13, active: 5, recovery: 29, onBlock: '+13~+19', damage: 70, guard: 'H', type: 'normal' },
  { name: 'j.[H]', input: 'j.[H]', inputGlyph: 'j.H', keyboardButton: 'Heavy', startup: '15-31', active: 5, recovery: 19, onBlock: '+13~+19', damage: 80, guard: 'H', type: 'normal' },
  { name: 'j.2H', input: 'j.2H', inputGlyph: 'j.↓ H', keyboardButton: 'Heavy', startup: 12, active: '3(2)3', recovery: 29, onBlock: '+4~+13', damage: 75, guard: 'H', type: 'normal' },
  
  // Unique Moves
  { name: 'Bridge Kick', input: '4H', inputGlyph: '← H', keyboardButton: 'Heavy', startup: 14, active: '3(1)6', recovery: 23, onBlock: -9, damage: 90, guard: 'LHA', type: 'normal' },
  
  // Universal Mechanics
  { name: 'Forward Throw', input: '5(M+H)', inputGlyph: 'M+H', keyboardButton: 'Medium+Heavy', startup: 6, active: 5, recovery: 36, damage: 190, guard: 'U', type: 'special' },
  { name: 'Back Throw', input: '4(M+H)', inputGlyph: '← M+H', keyboardButton: 'Medium+Heavy', startup: 6, active: 5, recovery: 36, damage: 210, guard: 'U', type: 'special' },
  { name: 'Air Throw', input: 'j.(M+H)', inputGlyph: 'j.M+H', keyboardButton: 'Medium+Heavy', startup: 4, active: 2, recovery: 'Until Landing', damage: 210, guard: 'U', type: 'special' },
  { name: 'Tag Launcher', input: '2T', inputGlyph: '↓ T', keyboardButton: 'Tag', startup: 14, active: 7, recovery: 33, onBlock: -6, damage: 80, guard: 'LHA', type: 'special' },
  
  // Specials - Rifle Shot
  { name: 'Rifle Shot', input: '5S1', inputGlyph: 'S1', keyboardButton: 'Special 1', startup: 16, active: 'Projectile', recovery: 45, onBlock: -29, damage: 80, guard: 'LHA', type: 'special' },
  { name: 'Rifle Shot (Charged)', input: '5[S1]', inputGlyph: 'S1', keyboardButton: 'Special 1', startup: '27-52', active: 'Projectile', recovery: 45, onBlock: -17, damage: 100, guard: 'LHA', type: 'special' },
  { name: 'Reload Shot', input: '5S1~5S1', inputGlyph: 'S1~S1', keyboardButton: 'Special 1', startup: 22, active: 'Projectile', recovery: 45, onBlock: -29, damage: 80, guard: 'LHA', type: 'special' },
  { name: 'Reload Shot (Charged)', input: '5S1~5[S1]', inputGlyph: 'S1~S1', keyboardButton: 'Special 1', startup: 26, active: 'Projectile', recovery: 45, onBlock: -5, damage: 110, guard: 'LHA', type: 'special' },
  { name: 'Closing Shot', input: '5S1~6S1', inputGlyph: 'S1~→ S1', keyboardButton: 'Special 1', startup: 22, active: 'Projectile', recovery: 43, onBlock: -27, damage: 80, guard: 'LHA', type: 'special' },
  { name: 'Closing Shot (Charged)', input: '5S1~6[S1]', inputGlyph: 'S1~→ S1', keyboardButton: 'Special 1', startup: '28-43', active: 'Projectile', recovery: 43, onBlock: -5, damage: 5, guard: 'LHA', type: 'special' },
  { name: 'Bola (from Rifle Shot)', input: '5S1~S2', inputGlyph: 'S1~S2', keyboardButton: 'Special 2', startup: 19, active: 'Projectile', recovery: 38, onBlock: -9, damage: '50(90)', guard: 'LHA', type: 'special' },
  
  // Advancing Roll
  { name: 'Advancing Roll', input: '6S1', inputGlyph: '→ S1', keyboardButton: 'Special 1', startup: 21, recovery: 17, type: 'special' },
  { name: 'Into the Fray', input: '6S1~L/M/H', inputGlyph: '→ S1~L/M/H', keyboardButton: 'Special 1', startup: 0, active: 7, recovery: 23, onBlock: -15, damage: 70, guard: 'H', type: 'special' },
  { name: 'Steady Shot (from Advancing)', input: '6S1~S1', inputGlyph: '→ S1~S1', keyboardButton: 'Special 1', startup: 16, active: 'Projectile', recovery: 43, onBlock: -29, damage: 80, guard: 'LHA', type: 'special' },
  { name: 'Steady Shot (Charged)', input: '6S1~[S1]', inputGlyph: '→ S1~S1', keyboardButton: 'Special 1', startup: '31', active: 'Projectile', recovery: '44(?)', onBlock: -17, damage: 5, guard: 'LHA', type: 'special' },
  
  // Evasive Roll
  { name: 'Evasive Roll', input: '4S1', inputGlyph: '← S1', keyboardButton: 'Special 1', startup: 15, recovery: 19, type: 'special' },
  { name: 'Steady Shot (from Evasive)', input: '4S1~S1', inputGlyph: '← S1~S1', keyboardButton: 'Special 1', startup: 20, active: 5, recovery: 41, onBlock: -26, damage: 5, guard: 'LHA', type: 'special' },
  { name: 'Steady Shot (Charged)', input: '4S1~[S1]', inputGlyph: '← S1~S1', keyboardButton: 'Special 1', startup: '36-61', active: 'Projectile', recovery: 41, onBlock: -14, damage: 100, guard: 'LHA', type: 'special' },
  
  // Skyward Shot
  { name: 'Skyward Shot', input: '2S1', inputGlyph: '↓ S1', keyboardButton: 'Special 1', startup: 17, active: 'Projectile', recovery: 45, onBlock: -4, damage: 80, guard: 'LHA', type: 'special' },
  { name: 'Skyward Shot (Charged)', input: '2[S1]', inputGlyph: '↓ S1', keyboardButton: 'Special 1', startup: 52, recovery: 41, onBlock: -5, damage: 100, guard: 'LHA', type: 'special' },
  { name: 'Skyward Shot (Follow-up)', input: '2S1~S1', inputGlyph: '↓ S1~S1', keyboardButton: 'Special 1', startup: 21, recovery: 34, onBlock: -5, damage: 80, guard: 'LHA', type: 'special' },
  { name: 'Bola (from Skyward)', input: '2S1~S2', inputGlyph: '↓ S1~S2', keyboardButton: 'Special 2', startup: 19, active: 'Projectile', recovery: 38, onBlock: -9, damage: '50(90)', guard: 'LHA', type: 'special' },
  
  // Air Specials
  { name: 'Rifle Shot (Air)', input: 'j.S1', inputGlyph: 'j.S1', keyboardButton: 'Special 1', startup: 16, recovery: 31, onBlock: -5, damage: 80, guard: 'LHA', type: 'special' },
  { name: 'Reload Shot (Air)', input: 'j.S1~S1', inputGlyph: 'j.S1~S1', keyboardButton: 'Special 1', startup: 21, recovery: 31, onBlock: -5, damage: 80, guard: 'LHA', type: 'special' },
  
  // Special 2 moves
  { name: 'Bola', input: '5S2', inputGlyph: 'S2', keyboardButton: 'Special 2', startup: 18, recovery: 38, onBlock: -5, damage: 90, guard: 'LHA', type: 'special' },
  { name: 'Tactical Dive', input: '6S2', inputGlyph: '→ S2', keyboardButton: 'Special 2', startup: 25, active: 4, recovery: 34, onBlock: -24, damage: 80, guard: 'HA', type: 'special' },
  { name: 'Bola (from Tactical Dive)', input: '6S2~5S2', inputGlyph: '→ S2~S2', keyboardButton: 'Special 2', startup: 19, active: 'Projectile', recovery: 38, onBlock: -9, damage: '50(90)', guard: 'LHA', type: 'special' },
  { name: 'Bola Boost', input: '6S2~4S2', inputGlyph: '→ S2~← S2', keyboardButton: 'Special 2', startup: 17, active: 4, recovery: 6, onBlock: -5, damage: 40, guard: 'LHA', type: 'special' },
  { name: 'Enticing Trap', input: '2S2', inputGlyph: '↓ S2', keyboardButton: 'Special 2', startup: 17, active: 'Projectile', recovery: 39, onBlock: -5, damage: 90, guard: 'LHA', type: 'special' },
  { name: 'Trick Shot', input: '2S2~2S1', inputGlyph: '↓ S2~↓ S1', keyboardButton: 'Special 1', startup: 16, recovery: 22, onBlock: -5, damage: 80, guard: 'LHA', type: 'special' },
  { name: 'Bola (Air)', input: 'j.5S2', inputGlyph: 'j.S2', keyboardButton: 'Special 2', startup: 18, recovery: 29, onBlock: -5, damage: 90, guard: 'LHA', type: 'special' },
  { name: 'Bola Boost (Air)', input: 'j.4S2', inputGlyph: 'j.← S2', keyboardButton: 'Special 2', startup: 17, active: 4, recovery: 6, onBlock: -5, damage: 40, guard: 'LHA', type: 'special' },
  { name: 'Enticing Trap (Air)', input: 'j.2S2', inputGlyph: 'j.↓ S2', keyboardButton: 'Special 2', startup: 17, recovery: 33, onBlock: -5, damage: 90, guard: 'LHA', type: 'special' },
  { name: 'Trick Shot (Air)', input: 'j.S2~2S1', inputGlyph: 'j.S2~↓ S1', keyboardButton: 'Special 1', startup: 16, recovery: 32, onBlock: -5, damage: 80, guard: 'LHA', type: 'special' },
  
  // Supers
  { name: 'Piltover Peacemaker', input: 'S1+L/M/H', inputGlyph: 'S1', keyboardButton: 'Special 1', startup: 14, recovery: 76, onBlock: -5, damage: 220, guard: 'LHA', type: 'super' },
  { name: 'Enforcer Hexshield', input: 'S2+L/M/H', inputGlyph: 'S2', keyboardButton: 'Special 2', startup: 12, recovery: 26, onBlock: -5, damage: 243, guard: 'LHA', type: 'super' },
  
  // Ultimate
  { name: 'Ace in the Hole', input: 'S1+S2', inputGlyph: 'S1+S2', keyboardButton: 'Special 1+Special 2', startup: 10, active: 1, recovery: 46, onBlock: -5, damage: 500, guard: 'LHA', type: 'super' },
  
  // Assists
  { name: 'Aerial Sniper', input: '5T', inputGlyph: 'T', keyboardButton: 'Tag', startup: 45, recovery: 7, onBlock: -5, damage: 100, guard: 'LHA', type: 'special' },
  { name: 'Skyward Shot (Assist)', input: '4T', inputGlyph: '← T', keyboardButton: 'Tag', startup: 41, recovery: 31, onBlock: -5, damage: 100, guard: 'LHA', type: 'special' },
  { name: 'Target Practice', input: '2T', inputGlyph: '↓ T', keyboardButton: 'Tag', startup: 96, recovery: 76, onBlock: -5, damage: '210 (75 per shot)', guard: 'LHA', type: 'special' }
];

async function main() {
  const frameDataPath = path.join(process.cwd(), 'frame-data.json');
  let data: any = { champions: [] };
  
  if (fs.existsSync(frameDataPath)) {
    data = JSON.parse(fs.readFileSync(frameDataPath, 'utf-8'));
  }

  // Remove existing Caitlyn
  data.champions = data.champions.filter((c: any) => c.name !== 'Caitlyn');
  
  // Add Caitlyn
  data.champions.push({
    name: 'Caitlyn',
    moves: caitlynMoves
  });
  
  data.lastUpdated = new Date().toISOString();
  data.source = '2XKO Wiki (https://wiki.play2xko.com/en-us/)';

  fs.writeFileSync(frameDataPath, JSON.stringify(data, null, 2));
  console.log(`✅ Added Caitlyn: ${caitlynMoves.length} moves`);
  console.log(`📊 Total: ${data.champions.length} champions, ${data.champions.reduce((sum: number, c: any) => sum + (c.moves?.length || 0), 0)} moves`);
}

main().catch(console.error);
