/**
 * Raw data logger - captures raw scraped data for failed parsing analysis
 * Helps identify patterns in date/price formats that need better parsing
 */

export interface RawDataLog {
    eventId: string;
    eventTitle: string;
    source: string;
    url: string;
    rawDate?: string;
    rawPrice?: string;
    rawPriceAmount?: number;
    rawDescription?: string;
    timestamp: string;
}

const rawDataLog: RawDataLog[] = [];
const MAX_LOG_SIZE = 500; // Keep last 500 entries

/**
 * Log raw event data for events that fail parsing
 */
export function logRawEventData(
    eventId: string,
    eventTitle: string,
    source: string,
    url: string,
    rawDate?: string,
    rawPrice?: string,
    rawPriceAmount?: number,
    rawDescription?: string
): void {
    const logEntry: RawDataLog = {
        eventId,
        eventTitle,
        source,
        url,
        rawDate,
        rawPrice,
        rawPriceAmount,
        rawDescription: rawDescription?.substring(0, 500), // Limit description length
        timestamp: new Date().toISOString()
    };

    rawDataLog.push(logEntry);

    // Keep log size manageable
    if (rawDataLog.length > MAX_LOG_SIZE) {
        rawDataLog.shift();
    }
}

/**
 * Get all raw data logs
 */
export function getRawDataLogs(): RawDataLog[] {
    return [...rawDataLog];
}

/**
 * Get raw data logs for a specific source
 */
export function getRawDataLogsBySource(source: string): RawDataLog[] {
    return rawDataLog.filter(log => log.source === source);
}

/**
 * Get raw data logs for events with failed date parsing
 */
export function getRawDataLogsWithDateIssues(): RawDataLog[] {
    return rawDataLog.filter(log => !log.rawDate || log.rawDate === 'null' || log.rawDate === 'undefined');
}

/**
 * Get raw data logs for events with failed price parsing
 */
export function getRawDataLogsWithPriceIssues(): RawDataLog[] {
    return rawDataLog.filter(log => 
        !log.rawPrice || 
        log.rawPrice === 'See tickets' || 
        log.rawPrice === 'null' || 
        log.rawPrice === 'undefined' ||
        (log.rawPriceAmount === undefined && log.rawPrice !== 'Free')
    );
}

/**
 * Clear raw data log
 */
export function clearRawDataLogs(): void {
    rawDataLog.length = 0;
}

/**
 * Get statistics about raw data
 */
export function getRawDataStats(): {
    total: number;
    bySource: Record<string, number>;
    dateIssues: number;
    priceIssues: number;
    sampleDates: string[];
    samplePrices: string[];
} {
    const bySource: Record<string, number> = {};
    const dateIssues = getRawDataLogsWithDateIssues().length;
    const priceIssues = getRawDataLogsWithPriceIssues().length;
    const sampleDates: string[] = [];
    const samplePrices: string[] = [];

    rawDataLog.forEach(log => {
        bySource[log.source] = (bySource[log.source] || 0) + 1;
        
        if (log.rawDate && sampleDates.length < 20) {
            sampleDates.push(log.rawDate);
        }
        if (log.rawPrice && samplePrices.length < 20) {
            samplePrices.push(log.rawPrice);
        }
    });

    return {
        total: rawDataLog.length,
        bySource,
        dateIssues,
        priceIssues,
        sampleDates: [...new Set(sampleDates)],
        samplePrices: [...new Set(samplePrices)]
    };
}
