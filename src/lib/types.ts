export interface Event {
  id: string; // Unique ID (hash of url)
  title: string;
  date: string; // ISO 8601
  endDate?: string; // ISO 8601
  location: string;
  source: 'Eventbrite' | 'City of Toronto' | 'Destination Toronto' | 'AllEvents.in' | 'Other';
  url: string;
  image?: string;
  price: string;
  isFree: boolean;
  description: string;
  categories: string[];
  status: 'UPCOMING' | 'MOVED' | 'CANCELLED' | 'PAST';
  lastUpdated: string; // ISO 8601
}

export interface ScraperResult {
  events: Event[];
  errors: string[];
}

export interface ScraperSource {
  name: string;
  scrape(): Promise<ScraperResult>;
}
