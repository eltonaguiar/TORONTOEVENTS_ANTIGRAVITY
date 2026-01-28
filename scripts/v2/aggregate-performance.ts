#!/usr/bin/env tsx
/**
 * STOCKSUNIFY2: Performance Aggregation Script
 *
 * This script consolidates all individual, daily performance audits
 * into a single report for the frontend dashboard to consume.
 */

import * as fs from 'fs';
import * as path from 'path';

const performanceDir = path.join(process.cwd(), 'data', 'v2', 'performance');
const outputDir = path.join(process.cwd(), 'public', 'data', 'v2');
const outputPath = path.join(outputDir, 'performance-report.json');

function main() {
    console.log('📈 Aggregating V2 performance reports...');

    if (!fs.existsSync(performanceDir)) {
        console.warn('⚠️ Performance data directory not found. Nothing to aggregate.');
        return;
    }

    const auditFiles = fs.readdirSync(performanceDir).filter(
        file => file.endsWith('-audit.json')
    );

    if (auditFiles.length === 0) {
        console.log('No audit files found to aggregate.');
        return;
    }

    const allAudits = auditFiles.map(file => {
        const filePath = path.join(performanceDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    });

    // Sort audits by date, newest first
    allAudits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const finalReport = {
        audits: allAudits,
        lastUpdated: new Date().toISOString()
    };

    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(finalReport, null, 2));

    console.log(`✅ Successfully aggregated ${allAudits.length} reports into performance-report.json.`);
}

main();
