export interface Event {
  id: string; // Unique ID (hash of url)
  title: string;
  date: string; // ISO 8601
  endDate?: string; // ISO 8601
  location: string;
  source: 'Eventbrite' | 'City of Toronto' | 'Destination Toronto' | 'AllEvents.in' | 'Showpass' | string;
  host?: string;
  url: string;
  image?: string;
  price: string;
  priceAmount?: number;
  isFree: boolean;
  description: string;
  latitude?: number;
  longitude?: number;
  categories: string[];
  status: 'UPCOMING' | 'MOVED' | 'CANCELLED' | 'PAST';
  isSoldOut?: boolean;
  genderSoldOut?: 'male' | 'female' | 'both' | 'none';
  tags?: string[];
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
