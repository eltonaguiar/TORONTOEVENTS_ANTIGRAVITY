/**
 * Verify comprehensive data extraction for a sample of events
 * 
 * This script checks 30 events from the current data to verify:
 * - Prices (min/max)
 * - Ticket types
 * - Full descriptions
 * - Start/end times
 * - Location details
 * 
 * Usage:
 *   npx tsx scripts/verify-comprehensive-extraction.ts
 */

import fs from 'fs';
import path from 'path';
import { Event } from '../src/lib/types';

const eventsFile = path.join(process.cwd(), 'data', 'events.json');
const SAMPLE_SIZE = 30;

interface VerificationResult {
    eventId: string;
    title: string;
    url: string;
    hasPrice: boolean;
    hasMinMaxPrice: boolean;
    hasTicketTypes: boolean;
    hasFullDescription: boolean;
    hasStartTime: boolean;
    hasEndTime: boolean;
    hasLocationDetails: boolean;
    score: number;
    issues: string[];
}

function verifyEvent(event: Event): VerificationResult {
    const result: VerificationResult = {
        eventId: event.id,
        title: event.title,
        url: event.url,
        hasPrice: false,
        hasMinMaxPrice: false,
        hasTicketTypes: false,
        hasFullDescription: false,
        hasStartTime: false,
        hasEndTime: false,
        hasLocationDetails: false,
        score: 0,
        issues: []
    };

    // Check price
    if (event.priceAmount !== undefined) {
        result.hasPrice = true;
        result.score += 1;
    } else {
        result.issues.push('Missing priceAmount');
    }

    // Check min/max price
    if (event.minPrice !== undefined || event.maxPrice !== undefined) {
        result.hasMinMaxPrice = true;
        result.score += 1;
    } else if (event.priceAmount !== undefined) {
        result.issues.push('Has price but no min/max price range');
    }

    // Check ticket types
    if (event.ticketTypes && event.ticketTypes.length > 0) {
        result.hasTicketTypes = true;
        result.score += 1;
    } else {
        result.issues.push('Missing ticket types');
    }

    // Check full description (should be > 100 chars for comprehensive)
    if (event.description && event.description.length > 100) {
        result.hasFullDescription = true;
        result.score += 1;
    } else if (event.description && event.description.length > 0) {
        result.issues.push(`Description too short (${event.description.length} chars)`);
    } else {
        result.issues.push('Missing description');
    }

    // Check start time
    if (event.startTime) {
        result.hasStartTime = true;
        result.score += 1;
    } else {
        result.issues.push('Missing startTime');
    }

    // Check end time
    if (event.endTime) {
        result.hasEndTime = true;
        result.score += 1;
    } else {
        result.issues.push('Missing endTime');
    }

    // Check location details
    if (event.locationDetails) {
        const hasDetails = event.locationDetails.venue || 
                          event.locationDetails.address || 
                          event.locationDetails.isOnline !== undefined;
        if (hasDetails) {
            result.hasLocationDetails = true;
            result.score += 1;
        } else {
            result.issues.push('LocationDetails object exists but is empty');
        }
    } else {
        result.issues.push('Missing locationDetails');
    }

    return result;
}

function main() {
    if (!fs.existsSync(eventsFile)) {
        console.error('❌ events.json not found');
        process.exit(1);
    }

    const events: Event[] = JSON.parse(fs.readFileSync(eventsFile, 'utf-8'));
    
    console.log('🔍 Verifying comprehensive data extraction...\n');
    console.log(`Total events in data: ${events.length}`);
    console.log(`Sample size: ${SAMPLE_SIZE}\n`);

    // Filter to upcoming events only
    const upcomingEvents = events.filter(e => 
        e.status === 'UPCOMING' && 
        new Date(e.date) >= new Date()
    );

    if (upcomingEvents.length === 0) {
        console.log('⚠️  No upcoming events found');
        process.exit(0);
    }

    // Take a sample
    const sample = upcomingEvents.slice(0, Math.min(SAMPLE_SIZE, upcomingEvents.length));
    
    console.log(`Verifying ${sample.length} events...\n`);
    console.log('='.repeat(80));

    const results: VerificationResult[] = [];
    
    for (let i = 0; i < sample.length; i++) {
        const event = sample[i];
        const result = verifyEvent(event);
        results.push(result);

        console.log(`\n[${i + 1}/${sample.length}] ${event.title.substring(0, 50)}...`);
        console.log(`   Score: ${result.score}/7`);
        console.log(`   Price: ${result.hasPrice ? '✅' : '❌'} | Ticket Types: ${result.hasTicketTypes ? '✅' : '❌'} | Description: ${result.hasFullDescription ? '✅' : '❌'}`);
        console.log(`   Times: ${result.hasStartTime ? '✅' : '❌'} Start / ${result.hasEndTime ? '✅' : '❌'} End | Location: ${result.hasLocationDetails ? '✅' : '❌'}`);
        
        if (result.issues.length > 0) {
            console.log(`   Issues: ${result.issues.join(', ')}`);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 VERIFICATION SUMMARY\n');

    const stats = {
        hasPrice: results.filter(r => r.hasPrice).length,
        hasMinMaxPrice: results.filter(r => r.hasMinMaxPrice).length,
        hasTicketTypes: results.filter(r => r.hasTicketTypes).length,
        hasFullDescription: results.filter(r => r.hasFullDescription).length,
        hasStartTime: results.filter(r => r.hasStartTime).length,
        hasEndTime: results.filter(r => r.hasEndTime).length,
        hasLocationDetails: results.filter(r => r.hasLocationDetails).length,
    };

    const total = results.length;
    
    console.log('Data Completeness:');
    console.log(`   ✅ Prices: ${stats.hasPrice}/${total} (${Math.round(stats.hasPrice/total*100)}%)`);
    console.log(`   ✅ Min/Max Prices: ${stats.hasMinMaxPrice}/${total} (${Math.round(stats.hasMinMaxPrice/total*100)}%)`);
    console.log(`   ✅ Ticket Types: ${stats.hasTicketTypes}/${total} (${Math.round(stats.hasTicketTypes/total*100)}%)`);
    console.log(`   ✅ Full Descriptions: ${stats.hasFullDescription}/${total} (${Math.round(stats.hasFullDescription/total*100)}%)`);
    console.log(`   ✅ Start Times: ${stats.hasStartTime}/${total} (${Math.round(stats.hasStartTime/total*100)}%)`);
    console.log(`   ✅ End Times: ${stats.hasEndTime}/${total} (${Math.round(stats.hasEndTime/total*100)}%)`);
    console.log(`   ✅ Location Details: ${stats.hasLocationDetails}/${total} (${Math.round(stats.hasLocationDetails/total*100)}%)`);

    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    console.log(`\n   Average Score: ${avgScore.toFixed(2)}/7`);

    // Events needing attention
    const needsAttention = results.filter(r => r.score < 4);
    if (needsAttention.length > 0) {
        console.log(`\n⚠️  ${needsAttention.length} events need attention (score < 4):`);
        needsAttention.forEach(r => {
            console.log(`   - "${r.title.substring(0, 40)}..." (${r.score}/7)`);
        });
    }

    // Perfect events
    const perfect = results.filter(r => r.score === 7);
    if (perfect.length > 0) {
        console.log(`\n✅ ${perfect.length} events have complete data (7/7):`);
        perfect.slice(0, 5).forEach(r => {
            console.log(`   - "${r.title.substring(0, 40)}..."`);
        });
        if (perfect.length > 5) {
            console.log(`   ... and ${perfect.length - 5} more`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n💡 Note: New events scraped after the comprehensive extraction update');
    console.log('   will have all this data. Existing events may need re-scraping.\n');
}

main();
