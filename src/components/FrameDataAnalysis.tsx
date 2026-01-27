'use client';

import { useState, useEffect } from 'react';

interface Move {
  name: string;
  startup?: number;
  onHit?: number;
  onBlock?: number;
  recovery?: number;
  damage?: number | string;
  type?: string;
}

interface Champion {
  name: string;
  moves: Move[];
}

interface Analysis {
  champion: string;
  safestMoves: Move[];
  efficientCombos: string[];
  replayTips: string[];
}

const GITHUB_REPO = 'eltonaguiar/2XKOFRAMEDATA';
const GITHUB_BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/main`;

function analyzeFrameData(champions: Champion[]): Analysis[] {
  return champions.map(champ => {
    const moves = champ.moves || [];
    
    // Find safest moves (positive on block or very safe on block)
    const safestMoves = moves
      .map(move => {
        const onBlock = typeof move.onBlock === 'number' ? move.onBlock : 
                      typeof move.onBlock === 'string' ? parseInt(move.onBlock) : -999;
        const startup = typeof move.startup === 'number' ? move.startup :
                       typeof move.startup === 'string' ? parseInt(move.startup) : 999;
        const onHit = typeof move.onHit === 'number' ? move.onHit :
                     typeof move.onHit === 'string' ? parseInt(move.onHit) : -999;
        
        // Calculate safety score (higher = safer)
        let safetyScore = 0;
        if (onBlock >= 0) safetyScore += 100; // Plus on block is very safe
        if (onBlock >= -2) safetyScore += 50; // Only slightly negative
        if (startup <= 6) safetyScore += 30; // Fast startup
        if (onHit > 0) safetyScore += 20; // Bonus if also plus on hit
        
        return { move, safetyScore, onBlock, startup, onHit };
      })
      .filter(item => item.safetyScore > 0 || item.onBlock >= -2 || (item.startup <= 6 && item.onBlock >= -4))
      .sort((a, b) => b.safetyScore - a.safetyScore)
      .map(item => item.move)
      .slice(0, 5); // Top 5 safest
    
    // Find efficient combos (moves that chain well)
    const efficientCombos: string[] = [];
    const normals = moves.filter(m => 
      (m.type || '').toLowerCase().includes('normal') || 
      (m.name || '').match(/^[0-9][LMH]/)
    );
    const specials = moves.filter(m => 
      (m.type || '').toLowerCase().includes('special')
    );
    
    // Look for combo starters (positive on hit)
    const comboStarters = moves
      .map(move => {
        const onHit = typeof move.onHit === 'number' ? move.onHit :
                     typeof move.onHit === 'string' ? parseInt(move.onHit) : -999;
        return { move, onHit };
      })
      .filter(item => item.onHit > 0)
      .sort((a, b) => b.onHit - a.onHit); // Best frame advantage first
    
    if (comboStarters.length > 0) {
      comboStarters.slice(0, 2).forEach(({ move: starter }) => {
        const starterName = starter.name;
        const starterOnHit = typeof starter.onHit === 'number' ? starter.onHit :
                            typeof starter.onHit === 'string' ? parseInt(starter.onHit) : 0;
        
        // Find follow-ups that can connect (startup <= frame advantage + buffer)
        const followUps = moves
          .map(move => {
            const startup = typeof move.startup === 'number' ? move.startup :
                           typeof move.startup === 'string' ? parseInt(move.startup) : 999;
            return { move, startup };
          })
          .filter(item => 
            item.startup <= starterOnHit + 3 && // Can connect with 3f buffer
            item.move.name !== starterName
          )
          .sort((a, b) => a.startup - b.startup); // Fastest first
        
        if (followUps.length > 0) {
          efficientCombos.push(`${starterName} → ${followUps[0].move.name} (${starterOnHit}f advantage)`);
          
          // Try to find a third hit
          const secondMove = followUps[0].move;
          const secondOnHit = typeof secondMove.onHit === 'number' ? secondMove.onHit :
                             typeof secondMove.onHit === 'string' ? parseInt(secondMove.onHit) : 0;
          
          if (secondOnHit > 0) {
            const thirdHits = moves
              .map(move => {
                const startup = typeof move.startup === 'number' ? move.startup :
                               typeof move.startup === 'string' ? parseInt(move.startup) : 999;
                return { move, startup };
              })
              .filter(item => 
                item.startup <= secondOnHit + 3 &&
                item.move.name !== starterName &&
                item.move.name !== secondMove.name
              )
              .sort((a, b) => a.startup - b.startup);
            
            if (thirdHits.length > 0) {
              efficientCombos.push(`${starterName} → ${followUps[0].move.name} → ${thirdHits[0].move.name}`);
            }
          }
        }
      });
      
      // Look for light > medium > heavy patterns (common fighting game combos)
      const lights = normals.filter(m => m.name.includes('L') || m.name.includes('Light'));
      const mediums = normals.filter(m => m.name.includes('M') || m.name.includes('Medium'));
      const heavies = normals.filter(m => m.name.includes('H') || m.name.includes('Heavy'));
      
      if (lights.length > 0 && mediums.length > 0) {
        const light = lights[0];
        const lightOnHit = typeof light.onHit === 'number' ? light.onHit :
                          typeof light.onHit === 'string' ? parseInt(light.onHit) : 0;
        const medium = mediums[0];
        const mediumStartup = typeof medium.startup === 'number' ? medium.startup :
                            typeof medium.startup === 'string' ? parseInt(medium.startup) : 999;
        
        if (mediumStartup <= lightOnHit + 3) {
          efficientCombos.push(`${light.name} → ${medium.name} (Basic Link)`);
        }
      }
      
      if (mediums.length > 0 && heavies.length > 0) {
        const medium = mediums[0];
        const mediumOnHit = typeof medium.onHit === 'number' ? medium.onHit :
                           typeof medium.onHit === 'string' ? parseInt(medium.onHit) : 0;
        const heavy = heavies[0];
        const heavyStartup = typeof heavy.startup === 'number' ? heavy.startup :
                           typeof heavy.startup === 'string' ? parseInt(heavy.startup) : 999;
        
        if (heavyStartup <= mediumOnHit + 3) {
          efficientCombos.push(`${medium.name} → ${heavy.name} (Medium to Heavy)`);
        }
      }
    }
    
    // Generate replay analysis tips
    const replayTips: string[] = [];
    
    // Check for punishable moves
    const punishableMoves = moves
      .map(move => {
        const onBlock = typeof move.onBlock === 'number' ? move.onBlock :
                       typeof move.onBlock === 'string' ? parseInt(move.onBlock) : 0;
        return { move, onBlock };
      })
      .filter(item => item.onBlock <= -5) // Very unsafe
      .sort((a, b) => a.onBlock - b.onBlock); // Most negative first
    
    if (punishableMoves.length > 0) {
      const worst = punishableMoves[0];
      replayTips.push(`⚠️ Watch for blocked ${worst.move.name} - it's heavily punishable (${worst.onBlock} on block). If blocked, you MUST counter-attack immediately.`);
    }
    
    // Check for whiffed moves
    const slowMoves = moves
      .map(move => {
        const startup = typeof move.startup === 'number' ? move.startup :
                       typeof move.startup === 'string' ? parseInt(move.startup) : 0;
        const recovery = typeof move.recovery === 'number' ? move.recovery :
                        typeof move.recovery === 'string' ? parseInt(move.recovery) : 0;
        return { move, startup, recovery };
      })
      .filter(item => item.startup >= 15 || item.recovery >= 25)
      .sort((a, b) => (b.startup + b.recovery) - (a.startup + a.recovery)); // Slowest first
    
    if (slowMoves.length > 0) {
      const slowest = slowMoves[0];
      replayTips.push(`🎯 If ${slowest.move.name} whiffs (${slowest.startup}f startup, ${slowest.recovery}f recovery), that's a huge punish window. Look for these opportunities in your replays.`);
    }
    
    // Check for missed combo opportunities
    const plusOnHit = moves
      .map(move => {
        const onHit = typeof move.onHit === 'number' ? move.onHit :
                     typeof move.onHit === 'string' ? parseInt(move.onHit) : 0;
        return { move, onHit };
      })
      .filter(item => item.onHit >= 3)
      .sort((a, b) => b.onHit - a.onHit); // Best frame advantage first
    
    if (plusOnHit.length > 0) {
      const best = plusOnHit[0];
      replayTips.push(`✅ When ${best.move.name} hits (+${best.onHit} on hit), you have significant frame advantage. Check replays for missed combo extensions after this move.`);
    }
    
    // Check for unsafe pressure patterns
    const negativeMoves = moves.filter(move => {
      const onBlock = typeof move.onBlock === 'number' ? move.onBlock :
                     typeof move.onBlock === 'string' ? parseInt(move.onBlock) : 0;
      return onBlock < -3;
    });
    
    if (negativeMoves.length > 2) {
      replayTips.push(`🔄 You have ${negativeMoves.length} moves that are unsafe on block. Review your pressure strings - are you ending with these? Switch to ${safestMoves[0]?.name || 'safer options'} to maintain pressure.`);
    }
    
    // Check for spacing mistakes
    const longRecoveryMoves = moves
      .map(move => {
        const recovery = typeof move.recovery === 'number' ? move.recovery :
                        typeof move.recovery === 'string' ? parseInt(move.recovery) : 0;
        return { move, recovery };
      })
      .filter(item => item.recovery > 20)
      .sort((a, b) => b.recovery - a.recovery);
    
    if (longRecoveryMoves.length > 0) {
      const worst = longRecoveryMoves[0];
      replayTips.push(`📏 ${worst.move.name} has ${worst.recovery}f recovery - this should ONLY be used at max range. Check if you're using it point-blank (that's a spacing mistake).`);
    }
    
    // Check for anti-air opportunities
    const fastMoves = moves
      .map(move => {
        const startup = typeof move.startup === 'number' ? move.startup :
                       typeof move.startup === 'string' ? parseInt(move.startup) : 999;
        return { move, startup };
      })
      .filter(item => item.startup <= 6)
      .sort((a, b) => a.startup - b.startup);
    
    if (fastMoves.length > 0) {
      replayTips.push(`⬆️ ${fastMoves[0].move.name} is your fastest move (${fastMoves[0].startup}f). Use this for anti-airs and quick punishes. Check replays for jump-in situations you didn't react to.`);
    }
    
    // General tip about frame traps
    if (safestMoves.length > 0 && plusOnHit.length > 0) {
      replayTips.push(`💡 Frame trap setup: Use ${safestMoves[0].name} (safe) then immediately follow with ${plusOnHit[0].move.name} (+${plusOnHit[0].onHit}). If opponent presses buttons, they get counter-hit.`);
    }
    
    return {
      champion: champ.name,
      safestMoves: safestMoves.slice(0, 3),
      efficientCombos: efficientCombos.slice(0, 3),
      replayTips: replayTips.slice(0, 5)
    };
  });
}

export default function FrameDataAnalysis() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAndAnalyze() {
      try {
        setLoading(true);
        
        // Try to fetch frame data
        const possibleFiles = [
          'frame-data.json',
          'data.json',
          'framedata.json',
          'champions.json',
          'index.json'
        ];
        
        let data = null;
        
        // Try API first
        try {
          const repoResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents`);
          if (repoResponse.ok) {
            const files = await repoResponse.json();
            const jsonFiles = files.filter((f: any) => f.name.endsWith('.json'));
            
            if (jsonFiles.length > 0) {
              const fileUrl = jsonFiles[0].download_url;
              const fileResponse = await fetch(fileUrl);
              if (fileResponse.ok) {
                data = await fileResponse.json();
              }
            }
          }
        } catch (e) {
          console.log('API fetch failed, trying direct...');
        }
        
        // Try direct files
        if (!data) {
          for (const filename of possibleFiles) {
            try {
              const response = await fetch(`${GITHUB_BASE}/${filename}`);
              if (response.ok) {
                data = await response.json();
                break;
              }
            } catch (e) {
              // Continue
            }
          }
        }
        
        if (data) {
          // Normalize data
          let champions: Champion[] = [];
          if (Array.isArray(data)) {
            champions = data;
          } else if (data.champions) {
            champions = data.champions;
          } else if (typeof data === 'object') {
            champions = Object.keys(data).map(key => ({
              name: key,
              ...data[key]
            }));
          }
          
          if (champions.length > 0) {
            const analyses = analyzeFrameData(champions);
            setAnalyses(analyses);
          } else {
            setError('Frame data file found but contains no champions. Please check the data format.');
          }
        } else {
          // Check if repository exists but is empty
          try {
            const repoResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents`);
            if (repoResponse.ok) {
              const files = await repoResponse.json();
              const hasJsonFiles = files.some((f: any) => f.name.endsWith('.json'));
              if (!hasJsonFiles) {
                setError('Repository exists but contains no JSON files. Please add frame data JSON file (e.g., frame-data.json, data.json, or champions.json) to the repository.');
              } else {
                setError('No frame data found. Please ensure the JSON file contains valid champion data.');
              }
            } else {
              setError('Could not access repository. Please ensure the repository exists and is accessible.');
            }
          } catch (err) {
            setError('No frame data found. Please ensure data is available in the repository.');
          }
        }
      } catch (err) {
        console.error('Analysis error:', err);
        setError('Failed to analyze frame data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchAndAnalyze();
  }, []);

  if (loading) {
    return (
      <section className="bg-[var(--surface-1)] rounded-lg p-8 border border-white/10">
        <h2 className="text-3xl font-bold mb-6 text-[var(--text-1)]">🤖 AI Frame Data Analysis</h2>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[var(--pk-500)] border-t-transparent mb-4"></div>
          <p className="text-[var(--text-2)]">Analyzing frame data...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-[var(--surface-1)] rounded-lg p-8 border border-white/10">
        <h2 className="text-3xl font-bold mb-6 text-[var(--text-1)]">🤖 AI Frame Data Analysis</h2>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-200">
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (analyses.length === 0) {
    return (
      <section className="bg-[var(--surface-1)] rounded-lg p-8 border border-white/10">
        <h2 className="text-3xl font-bold mb-6 text-[var(--text-1)]">🤖 AI Frame Data Analysis</h2>
        <p className="text-[var(--text-2)]">No frame data available for analysis.</p>
      </section>
    );
  }

  return (
    <section className="bg-[var(--surface-1)] rounded-lg p-8 border border-white/10">
      <h2 className="text-3xl font-bold mb-2 text-[var(--text-1)]">🤖 AI Frame Data Analysis</h2>
      <p className="text-[var(--text-2)] mb-6 text-sm">
        Automated analysis of frame data to identify safest moves, efficient combos, and replay review tips for each champion.
      </p>
      
      <div className="space-y-8">
        {analyses.map((analysis) => (
          <div key={analysis.champion} className="bg-[var(--surface-2)] rounded-lg p-6 border border-white/5">
            <h3 className="text-2xl font-bold mb-4 text-[var(--text-1)]">{analysis.champion}</h3>
            
            {/* Safest Moves */}
            <div className="mb-6">
              <h4 className="text-lg font-bold mb-3 text-[var(--pk-300)] flex items-center gap-2">
                <span>🛡️</span> Safest Moves
              </h4>
              <div className="space-y-2">
                {analysis.safestMoves.length > 0 ? (
                  analysis.safestMoves.map((move, idx) => (
                    <div key={idx} className="bg-[var(--surface-3)] p-3 rounded border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--text-1)]">{move.name}</span>
                        <div className="flex gap-4 text-sm text-[var(--text-2)]">
                          {move.startup && <span>Startup: {move.startup}</span>}
                          {move.onBlock !== undefined && (
                            <span className={typeof move.onBlock === 'number' && move.onBlock >= 0 ? 'text-green-400' : 'text-yellow-400'}>
                              On Block: {move.onBlock}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-[var(--text-3)] mt-1">
                        {typeof move.onBlock === 'number' && move.onBlock >= 0 
                          ? 'Plus on block - safe to use in pressure'
                          : typeof move.onBlock === 'number' && move.onBlock >= -2
                          ? 'Only slightly negative - very safe'
                          : 'Low startup makes this safe to use'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-[var(--text-3)] text-sm">No safe moves identified from available data.</p>
                )}
              </div>
            </div>
            
            {/* Efficient Combos */}
            <div className="mb-6">
              <h4 className="text-lg font-bold mb-3 text-[var(--pk-300)] flex items-center gap-2">
                <span>⚡</span> Most Efficient Combos
              </h4>
              <div className="space-y-2">
                {analysis.efficientCombos.length > 0 ? (
                  analysis.efficientCombos.map((combo, idx) => (
                    <div key={idx} className="bg-[var(--surface-3)] p-3 rounded border border-white/5">
                      <code className="text-[var(--text-1)] font-mono text-sm">{combo}</code>
                      <p className="text-xs text-[var(--text-3)] mt-1">
                        High frame advantage chain - practice this sequence for consistent damage.
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-[var(--text-3)] text-sm">No combo data available. Check frame data for moves with positive on hit.</p>
                )}
              </div>
            </div>
            
            {/* Replay Analysis Tips */}
            <div>
              <h4 className="text-lg font-bold mb-3 text-[var(--pk-300)] flex items-center gap-2">
                <span>📹</span> Replay Review Tips
              </h4>
              <div className="space-y-2">
                {analysis.replayTips.map((tip, idx) => (
                  <div key={idx} className="bg-[var(--surface-3)] p-3 rounded border border-white/5">
                    <p className="text-sm text-[var(--text-2)]">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-[var(--surface-2)] rounded-lg border border-white/5">
        <p className="text-xs text-[var(--text-3)]">
          <strong className="text-[var(--text-1)]">Note:</strong> This analysis is generated automatically from frame data. 
          Frame data values may vary based on game patches. Always verify in training mode.
        </p>
      </div>
    </section>
  );
}
