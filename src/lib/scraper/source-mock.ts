import { ScraperSource, ScraperResult, Event } from '../types';

export class MockScraper implements ScraperSource {
    name = 'Mock Source';

    async scrape(): Promise<ScraperResult> {
        const events: Event[] = [
            {
                id: 'mock-1',
                title: 'Toronto Jazz Festival 2025',
                date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                endDate: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days
                location: 'Nathan Phillips Square',
                source: 'Destination Toronto',
                url: 'https://torontojazz.com',
                price: 'Free',
                isFree: true,
                description: 'The annual jazz festival returns downtown.',
                categories: ['Music', 'Festival', 'Multi-Day'],
                status: 'UPCOMING',
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'mock-2',
                title: 'Tech Meetup Toronto',
                date: new Date(Date.now() + 172800000).toISOString(), // 2 days
                location: 'MaRS Discovery District',
                source: 'Eventbrite',
                url: 'https://eventbrite.ca/example',
                price: '$15',
                isFree: false,
                description: 'Networking for tech professionals.',
                categories: ['Networking', 'Tech'],
                status: 'UPCOMING',
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'mock-3',
                title: 'Art Gallery Opening',
                date: new Date(Date.now() + 43200000).toISOString(), // Later today?
                location: 'AGO',
                source: 'City of Toronto',
                url: 'https://ago.ca',
                price: '$25',
                isFree: false,
                description: 'New exhibition on modern art.',
                categories: ['Arts', 'Culture'],
                status: 'UPCOMING',
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'mock-4',
                title: 'Cancelled Yoga in the Park',
                date: new Date(Date.now() + 86400000 * 5).toISOString(),
                location: 'Trinity Bellwoods',
                source: 'AllEvents.in',
                url: 'https://example.com/cancelled',
                price: 'Free',
                isFree: true,
                description: 'Morning yoga session.',
                categories: ['Health', 'Sports'],
                status: 'CANCELLED',
                lastUpdated: new Date().toISOString()
            }
        ];

        return {
            events,
            errors: []
        };
    }
}
