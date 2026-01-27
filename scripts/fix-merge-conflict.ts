/**
 * Fix merge conflict in events.json
 * Removes conflict markers and keeps valid JSON
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function fixMergeConflict(): void {
    console.log('🔧 Fixing merge conflict in events.json...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    let content = readFileSync(eventsPath, 'utf-8');

    // Remove merge conflict markers
    // Pattern: <<<<<<< HEAD ... ======= ... >>>>>>>
    const conflictPattern = /<<<<<<< HEAD[\s\S]*?=======[\s\S]*?>>>>>>> [^\n]+\n/g;
    
    if (conflictPattern.test(content)) {
        console.log('Found merge conflict markers, removing...');
        
        // Strategy: Keep everything before <<<<<<< and after >>>>>>>
        // Remove the conflict section entirely and try to reconstruct valid JSON
        content = content.replace(/<<<<<<< HEAD[\s\S]*?=======[\s\S]*?>>>>>>> [^\n]+\n/g, '');
        
        // Try to fix any broken JSON structure
        // If we removed content between objects, we need to ensure proper comma placement
        content = content.replace(/},\s*{/g, '},\n  {');
        content = content.replace(/}\s*{/g, '},\n  {');
        
        writeFileSync(eventsPath, content);
        console.log('✅ Removed conflict markers\n');
    } else {
        console.log('No conflict markers found\n');
    }

    // Validate JSON
    try {
        const events = JSON.parse(content);
        console.log(`✅ JSON is now valid`);
        console.log(`   Total events: ${events.length}`);
        writeFileSync(eventsPath, JSON.stringify(events, null, 2));
        console.log('✅ Reformatted JSON\n');
    } catch (error: any) {
        console.error(`❌ JSON still invalid: ${error.message}`);
        console.error('   Attempting to fix by removing conflict section...\n');
        
        // More aggressive fix: find the conflict and remove it
        const lines = content.split('\n');
        const fixedLines: string[] = [];
        let inConflict = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.includes('<<<<<<< HEAD')) {
                inConflict = true;
                // Skip until we find =======
                continue;
            }
            
            if (line.includes('=======') && inConflict) {
                // Skip until we find >>>>>>>
                continue;
            }
            
            if (line.includes('>>>>>>>') && inConflict) {
                inConflict = false;
                continue;
            }
            
            if (!inConflict) {
                fixedLines.push(line);
            }
        }
        
        const fixedContent = fixedLines.join('\n');
        
        try {
            const events = JSON.parse(fixedContent);
            console.log(`✅ Fixed JSON is valid`);
            console.log(`   Total events: ${events.length}`);
            writeFileSync(eventsPath, JSON.stringify(events, null, 2));
            console.log('✅ Saved fixed JSON\n');
        } catch (e: any) {
            console.error(`❌ Still invalid after fix: ${e.message}`);
            process.exit(1);
        }
    }
}

fixMergeConflict();
