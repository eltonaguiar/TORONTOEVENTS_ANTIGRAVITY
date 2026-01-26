
function normalizeDate(dateInput) {
    if (!dateInput) return null;
    let inputStr = typeof dateInput === 'string' ? dateInput.trim() : dateInput.toISOString();
    inputStr = inputStr.replace(/\s+/g, ' ').trim();

    // Check for timezone hints
    const hasZone = inputStr.match(/[Z\+\-](?:\d{2}:?\d{2})?$/) || inputStr.match(/(GMT|EST|EDT|UTC)/i);

    let date = new Date(inputStr);
    if (isNaN(date.getTime())) return null;

    // If no zone provided and it has a time, assume Toronto
    // This is critical when running on UTC machines (GitHub Actions)
    if (!hasZone && inputStr.includes(':')) {
        const torontoOffset = getTorontoOffset(date);
        console.log(`No zone detected. Input: "${inputStr}". Assuming Toronto (${torontoOffset})`);
        // We'll re-parse with the offset appended
        // Remove any existing trailing "at" or similar artifacts before appending
        const cleaned = inputStr.replace(/ at\s*$/i, '');
        date = new Date(`${cleaned} ${torontoOffset}`);
    }

    if (isNaN(date.getTime())) return null;

    // format output
    const options = {
        timeZone: 'America/Toronto',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    };

    const formatter = new Intl.DateTimeFormat('sv-SE', options);
    const parts = formatter.formatToParts(date);
    const map = {};
    parts.forEach(p => map[p.type] = p.value);

    const torontoIso = `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`;

    // Calculate accurate offset for the final string
    const finalOffset = getTorontoOffset(date);

    return `${torontoIso}${finalOffset}`;
}

function getTorontoOffset(date) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Toronto',
        timeZoneName: 'shortOffset'
    }).formatToParts(date);
    const tz = parts.find(p => p.type === 'timeZoneName')?.value; // "GMT-5"

    if (!tz) return '-05:00';

    let offset = tz.replace('GMT', ''); // "-5"
    if (!offset.includes(':')) {
        if (offset === '' || offset === 'Z') return '+00:00';
        const sign = offset.startsWith('+') || offset.startsWith('-') ? '' : '+';
        const val = offset.replace(/^[+-]/, '');
        const padded = val.padStart(2, '0');
        offset = `${offset.startsWith('-') ? '-' : '+'}${padded}:00`;
    }
    return offset;
}

// TEST CASES
console.log('--- TEST 1: AllEvents format (no zone) ---');
console.log(normalizeDate('Jan 26, 2026, 7:00 PM'));

console.log('\n--- TEST 2: Eventbrite format (with Z) ---');
console.log(normalizeDate('2026-01-26T23:59:00Z'));

console.log('\n--- TEST 3: Summer date (DST check) ---');
console.log(normalizeDate('Aug 12, 2026, 12:00 PM'));
