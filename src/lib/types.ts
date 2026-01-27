export interface TicketType {
  name: string;
  price?: number;
  priceDisplay?: string; // e.g., "$25.00", "Free", "See tickets"
  available?: boolean;
  soldOut?: boolean;
}

export interface Event {
  id: string; // Unique ID (hash of url)
  title: string;
  date: string; // ISO 8601
  endDate?: string; // ISO 8601
  startTime?: string; // ISO 8601 with time (more precise than date)
  endTime?: string; // ISO 8601 with time
  location: string;
  locationDetails?: {
    venue?: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    isOnline?: boolean;
    onlinePlatform?: string; // e.g., "Zoom", "GoogleMeet"
  };
  source: 'Eventbrite' | 'City of Toronto' | 'Destination Toronto' | 'AllEvents.in' | 'Showpass' | string;
  host?: string;
  url: string;
  image?: string;
  price: string;
  priceAmount?: number;
  minPrice?: number; // Minimum ticket price if multiple tiers
  maxPrice?: number; // Maximum ticket price if multiple tiers
  ticketTypes?: TicketType[]; // All available ticket types
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
