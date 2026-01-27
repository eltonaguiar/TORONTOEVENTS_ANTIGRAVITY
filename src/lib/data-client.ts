'use client';

import { useState, useEffect } from 'react';
import { Event } from './types';

const GITHUB_REPO = 'eltonaguiar/TORONTOEVENTS_ANTIGRAVITY';
// Try to detect branch, fallback to 'main'
const GITHUB_BRANCH = typeof window !== 'undefined' 
  ? (window.location.hostname.includes('github.io') ? 'main' : 'main')
  : 'main';
const EVENTS_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/data/events.json`;
const METADATA_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/data/metadata.json`;

export interface EventsMetadata {
  lastUpdated: string;
  totalEvents: number;
  sources: string[];
}

/**
 * Fetch events from GitHub raw JSON with fallback to FTP site
 */
export async function fetchEventsFromGitHub(): Promise<Event[]> {
  // Try GitHub first
  try {
    console.log(`📦 [Data Source] Fetching events from GitHub: ${EVENTS_URL}`);
    const response = await fetch(EVENTS_URL + '?t=' + Date.now(), {
      cache: 'no-store', // Always fetch fresh data
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }
    
    const events = await response.json();
    const eventCount = Array.isArray(events) ? events.length : 0;
    console.log(`✅ [Data Source] Successfully loaded ${eventCount} events from GitHub (${EVENTS_URL})`);
    if (!Array.isArray(events)) {
      console.error(`❌ [Data Source] Events is not an array! Type: ${typeof events}, Value:`, events);
      throw new Error('Events is not an array');
    }
    if (eventCount === 0) {
      console.warn(`⚠️ [Data Source] Warning: 0 events loaded from GitHub!`);
    }
    return events;
  } catch (error) {
    console.error('❌ [Data Source] Error fetching events from GitHub:', error);
    console.log('🔄 [Data Source] Attempting fallback to FTP site...');
    
    // Fallback to FTP site - try multiple paths
    const fallbackUrls = typeof window !== 'undefined' 
      ? [
          `${window.location.origin}/events.json`,  // Root
          `${window.location.origin}/TORONTOEVENTS_ANTIGRAVITY/events.json`,  // BasePath
          '/events.json',  // Relative root
          '/TORONTOEVENTS_ANTIGRAVITY/events.json',  // Relative basePath
        ]
      : ['/events.json'];
    
    for (const ftpUrl of fallbackUrls) {
      try {
        console.log(`📦 [Data Source] Trying FTP fallback: ${ftpUrl}`);
        const fallbackResponse = await fetch(ftpUrl + '?t=' + Date.now(), {
          cache: 'no-store',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        });
        
        if (!fallbackResponse.ok) {
          console.log(`  ⚠️  ${ftpUrl} returned ${fallbackResponse.status}`);
          continue; // Try next URL
        }
        
        // Try to parse as JSON even if Content-Type is missing
        const text = await fallbackResponse.text();
        let events;
        try {
          events = JSON.parse(text);
        } catch (parseError) {
          console.log(`  ⚠️  ${ftpUrl} is not valid JSON`);
          continue; // Try next URL
        }
        
        const eventCount = Array.isArray(events) ? events.length : 0;
        if (!Array.isArray(events)) {
          console.log(`  ⚠️  ${ftpUrl} returned non-array`);
          continue; // Try next URL
        }
        
        console.log(`✅ [Data Source] Successfully loaded ${eventCount} events from FTP fallback: ${ftpUrl}`);
        return events;
      } catch (fallbackError: any) {
        console.log(`  ⚠️  ${ftpUrl} failed: ${fallbackError.message}`);
        continue; // Try next URL
      }
    }
    
    console.error('❌ [Data Source] All FTP fallback URLs failed');
    return [];
  }
}

/**
 * Fetch metadata from GitHub raw JSON
 */
export async function fetchMetadataFromGitHub(): Promise<EventsMetadata | null> {
  try {
    console.log(`📊 [Data Source] Fetching metadata from GitHub: ${METADATA_URL}`);
    const response = await fetch(METADATA_URL + '?t=' + Date.now(), {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      }
    });
    
    if (!response.ok) {
      console.warn(`⚠️ [Data Source] Metadata fetch returned ${response.status}: ${response.statusText}`);
      return null;
    }
    
    const metadata = await response.json();
    console.log(`✅ [Data Source] Metadata loaded from GitHub - Last updated: ${metadata?.lastUpdated || 'Unknown'}, Total events: ${metadata?.totalEvents || 0}`);
    return metadata;
  } catch (error) {
    console.error('❌ [Data Source] Error fetching metadata from GitHub:', error);
    return null;
  }
}

/**
 * React hook to fetch events from GitHub
 */
export function useEventsFromGitHub() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadEvents() {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔄 [useEventsFromGitHub] Starting to load events...');
        const fetchedEvents = await fetchEventsFromGitHub();
        console.log(`📦 [useEventsFromGitHub] Received ${fetchedEvents.length} events`);
        if (mounted) {
          setEvents(fetchedEvents);
          console.log(`✅ [useEventsFromGitHub] Set ${fetchedEvents.length} events to state`);
        } else {
          console.log('⚠️ [useEventsFromGitHub] Component unmounted, not setting events');
        }
      } catch (err) {
        console.error('❌ [useEventsFromGitHub] Error loading events:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load events');
        }
      } finally {
        if (mounted) {
          setLoading(false);
          console.log('✅ [useEventsFromGitHub] Loading complete');
        }
      }
    }

    loadEvents();

    // Refresh every 30 minutes
    const interval = setInterval(loadEvents, 30 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { events, loading, error, refresh: () => fetchEventsFromGitHub().then(setEvents) };
}

/**
 * React hook to fetch metadata from GitHub
 */
export function useMetadataFromGitHub() {
  const [metadata, setMetadata] = useState<EventsMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadMetadata() {
      try {
        const fetchedMetadata = await fetchMetadataFromGitHub();
        if (mounted) {
          setMetadata(fetchedMetadata);
        }
      } catch (err) {
        console.error('Error loading metadata:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadMetadata();

    // Refresh every hour
    const interval = setInterval(loadMetadata, 60 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { metadata, loading };
}
