/**
 * Error logging and reporting utilities
 * Logs parsing errors for debugging and monitoring
 */

export interface ParsingError {
    type: 'date' | 'price' | 'description' | 'other';
    eventId?: string;
    eventTitle?: string;
    field: string;
    rawValue: string | undefined | null;
    error: string;
    timestamp: string;
}

const errorLog: ParsingError[] = [];
const MAX_LOG_SIZE = 1000; // Keep last 1000 errors

/**
 * Log a parsing error
 */
export function logParsingError(
    type: ParsingError['type'],
    field: string,
    rawValue: string | undefined | null,
    error: string,
    eventId?: string,
    eventTitle?: string
): void {
    const errorEntry: ParsingError = {
        type,
        eventId,
        eventTitle,
        field,
        rawValue: String(rawValue || 'null'),
        error,
        timestamp: new Date().toISOString()
    };

    errorLog.push(errorEntry);

    // Keep log size manageable
    if (errorLog.length > MAX_LOG_SIZE) {
        errorLog.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.warn(`[Parsing Error] ${type}:${field}`, {
            eventId,
            eventTitle,
            rawValue,
            error
        });
    }
}

/**
 * Get all logged errors
 */
export function getParsingErrors(): ParsingError[] {
    return [...errorLog];
}

/**
 * Get errors by type
 */
export function getParsingErrorsByType(type: ParsingError['type']): ParsingError[] {
    return errorLog.filter(e => e.type === type);
}

/**
 * Get errors for a specific event
 */
export function getParsingErrorsForEvent(eventId: string): ParsingError[] {
    return errorLog.filter(e => e.eventId === eventId);
}

/**
 * Clear error log
 */
export function clearParsingErrors(): void {
    errorLog.length = 0;
}

/**
 * Get error statistics
 */
export function getParsingErrorStats(): {
    total: number;
    byType: Record<string, number>;
    recent: ParsingError[];
} {
    const byType: Record<string, number> = {};
    
    errorLog.forEach(error => {
        byType[error.type] = (byType[error.type] || 0) + 1;
    });

    return {
        total: errorLog.length,
        byType,
        recent: errorLog.slice(-10) // Last 10 errors
    };
}
