import fs from 'fs';
import path from 'path';
import { Event } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

export function getEvents(): Event[] {
    if (!fs.existsSync(EVENTS_FILE)) {
        return [];
    }
    const data = fs.readFileSync(EVENTS_FILE, 'utf-8');
    try {
        return JSON.parse(data);
    } catch {
        return [];
    }
}

export function saveEvents(events: Event[]): void {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}
