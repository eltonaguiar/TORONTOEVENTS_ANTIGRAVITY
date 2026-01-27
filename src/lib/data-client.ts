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
 * Fetch events from GitHub raw JSON
 */
export async function fetchEventsFromGitHub(): Promise<Event[]> {
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
    return Array.isArray(events) ? events : [];
  } catch (error) {
    console.error('❌ [Data Source] Error fetching events from GitHub:', error);
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
        const fetchedEvents = await fetchEventsFromGitHub();
        if (mounted) {
          setEvents(fetchedEvents);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load events');
          console.error('Error loading events:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
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
