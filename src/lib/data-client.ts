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

// Check if we're on production domain where CORS will fail
const isProductionDomain = typeof window !== 'undefined' && 
  (window.location.hostname === 'findtorontoevents.ca' || 
   window.location.hostname.includes('findtorontoevents'));

export interface EventsMetadata {
  lastUpdated: string;
  totalEvents: number;
  sources: string[];
}

/**
 * Fetch events from GitHub raw JSON with fallback to FTP site
 */
export async function fetchEventsFromGitHub(): Promise<Event[]> {
  // Skip GitHub on production domain - CORS will fail, go straight to FTP
  if (isProductionDomain) {
    console.log('📦 [Data Source] Production domain detected - using FTP fallback directly');
    // Fall through to FTP fallback logic below
  } else {
    // Try GitHub first - but skip if CORS is likely to fail
    // GitHub raw URLs should work, but if CORS fails, we'll fallback immediately
    try {
      console.log(`📦 [Data Source] Fetching events from GitHub: ${EVENTS_URL}`);
      // Use simple fetch without custom headers to avoid CORS preflight issues
      const response = await fetch(EVENTS_URL + '?t=' + Date.now(), {
        cache: 'no-store',
        // Don't set mode explicitly - let browser handle it
        // Don't set custom headers that trigger preflight
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
      }
      
      // Parse response - GitHub returns text/plain but it's JSON
      const text = await response.text();
      let events;
      try {
        events = JSON.parse(text);
      } catch (parseError) {
        console.error(`❌ [Data Source] Failed to parse GitHub response as JSON:`, parseError);
        throw new Error('Invalid JSON response from GitHub');
      }
      
      const eventCount = Array.isArray(events) ? events.length : 0;
      console.log(`✅ [Data Source] Successfully loaded ${eventCount} events from GitHub (${EVENTS_URL})`);
      if (!Array.isArray(events)) {
        console.error(`❌ [Data Source] Events is not an array! Type: ${typeof events}, Value:`, events);
        throw new Error('Events is not an array');
      }
      if (eventCount === 0) {
        console.warn(`⚠️ [Data Source] Warning: 0 events loaded from GitHub! Falling back to FTP...`);
        throw new Error('GitHub returned 0 events - using fallback');
      }
      return events;
    } catch (error: any) {
      // Check if it's a CORS error - if so, skip GitHub and go straight to FTP
      const isCorsError = error?.message?.includes('CORS') || 
                         error?.message?.includes('Failed to fetch') ||
                         error?.name === 'TypeError';
      
      if (isCorsError) {
        console.warn('⚠️ [Data Source] CORS error with GitHub - skipping and using FTP fallback directly');
      } else {
        console.error('❌ [Data Source] Error fetching events from GitHub:', error);
      }
      // Fall through to FTP fallback
    }
  }
  
  // FTP fallback logic (used when GitHub fails or on production domain)
  try {
    console.log('🔄 [Data Source] Attempting fallback to FTP site...');
    
    // Fallback to FTP site - try multiple paths
    // CRITICAL: Try root first since events.json is deployed to root, not basePath
    const fallbackUrls = typeof window !== 'undefined' 
      ? [
          '/events.json',  // Relative root (works from any path)
          `${window.location.origin}/events.json`,  // Absolute root
          `${window.location.origin}/TORONTOEVENTS_ANTIGRAVITY/events.json`,  // BasePath (may not exist)
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
        if (eventCount === 0) {
          console.warn(`⚠️ [Data Source] FTP fallback returned 0 events, trying next URL...`);
          continue; // Try next URL
        }
        return events;
      } catch (fallbackError: any) {
        console.log(`  ⚠️  ${ftpUrl} failed: ${fallbackError.message}`);
        continue; // Try next URL
      }
    }
    
    console.error('❌ [Data Source] All FTP fallback URLs failed - returning empty array');
    console.error('❌ [Data Source] This means events cannot be loaded. Check network and file availability.');
    return [];
  } catch (error: any) {
    console.error('❌ [Data Source] Unexpected error in FTP fallback:', error);
    return [];
  }
}

/**
 * Fetch metadata from GitHub raw JSON
 */
export async function fetchMetadataFromGitHub(): Promise<EventsMetadata | null> {
  // Skip GitHub on production domain - CORS will fail, go straight to FTP
  if (!isProductionDomain) {
    try {
      console.log(`📊 [Data Source] Fetching metadata from GitHub: ${METADATA_URL}`);
      // Use simple fetch without custom headers to avoid CORS preflight issues
      const response = await fetch(METADATA_URL + '?t=' + Date.now(), {
        cache: 'no-store',
        // Don't set custom headers that trigger preflight
      });
      
      if (!response.ok) {
        console.warn(`⚠️ [Data Source] Metadata fetch returned ${response.status}: ${response.statusText}`);
        // Fall through to FTP fallback
      } else {
        const metadata = await response.json();
        console.log(`✅ [Data Source] Metadata loaded from GitHub - Last updated: ${metadata?.lastUpdated || 'Unknown'}, Total events: ${metadata?.totalEvents || 0}`);
        return metadata;
      }
    } catch (error: any) {
      // Silently handle metadata fetch errors - it's not critical
      const isCorsError = error?.message?.includes('CORS') || 
                         error?.message?.includes('Failed to fetch') ||
                         error?.name === 'TypeError';
      if (!isCorsError) {
        console.error('❌ [Data Source] Error fetching metadata from GitHub:', error);
      }
      // Fall through to FTP fallback
    }
  } else {
    console.log('📊 [Data Source] Production domain detected - using FTP fallback for metadata');
  }
  
  // Try FTP fallback for metadata - try multiple paths like events
  const fallbackUrls = typeof window !== 'undefined' 
    ? [
        '/metadata.json',  // Relative root (works from any path)
        `${window.location.origin}/metadata.json`,  // Absolute root
        `${window.location.origin}/TORONTOEVENTS_ANTIGRAVITY/metadata.json`,  // BasePath (may not exist)
        '/TORONTOEVENTS_ANTIGRAVITY/metadata.json',  // Relative basePath
      ]
    : ['/metadata.json'];
  
  for (const ftpUrl of fallbackUrls) {
    try {
      const fallbackResponse = await fetch(ftpUrl + '?t=' + Date.now(), { 
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
        }
      });
      if (fallbackResponse.ok) {
        const metadata = await fallbackResponse.json();
        console.log(`✅ [Data Source] Metadata loaded from FTP fallback: ${ftpUrl}`);
        return metadata;
      }
    } catch (fallbackErr) {
      // Ignore fallback errors, try next URL
      continue;
    }
  }
  
  // Metadata is not critical, return null if all fallbacks fail
  return null;
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
          if (fetchedEvents.length === 0) {
            console.error('❌ [useEventsFromGitHub] CRITICAL: Received 0 events! This should not happen.');
            console.error('❌ [useEventsFromGitHub] Check browser console for fetch errors.');
            setError('No events loaded - check console for details');
          } else {
            setEvents(fetchedEvents);
            console.log(`✅ [useEventsFromGitHub] Set ${fetchedEvents.length} events to state`);
          }
        } else {
          console.log('⚠️ [useEventsFromGitHub] Component unmounted, not setting events');
        }
      } catch (err) {
        console.error('❌ [useEventsFromGitHub] Error loading events:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load events');
          // Try to load from a direct fallback (try root first)
          console.log('🔄 [useEventsFromGitHub] Attempting emergency fallback...');
          const emergencyUrls = typeof window !== 'undefined' 
            ? ['/events.json', `${window.location.origin}/events.json`]
            : ['/events.json'];
          
          for (const fallbackUrl of emergencyUrls) {
            try {
              console.log(`🔄 [useEventsFromGitHub] Trying emergency fallback: ${fallbackUrl}`);
              const fallbackResponse = await fetch(fallbackUrl + '?t=' + Date.now(), {
                cache: 'no-store',
                headers: { 'Accept': 'application/json' }
              });
              if (fallbackResponse.ok) {
                const text = await fallbackResponse.text();
                const fallbackEvents = JSON.parse(text);
                if (Array.isArray(fallbackEvents) && fallbackEvents.length > 0) {
                  console.log(`✅ [useEventsFromGitHub] Emergency fallback loaded ${fallbackEvents.length} events from ${fallbackUrl}`);
                  setEvents(fallbackEvents);
                  setError(null);
                  break; // Success, stop trying
                }
              }
            } catch (fallbackErr: any) {
              console.log(`⚠️ [useEventsFromGitHub] Emergency fallback ${fallbackUrl} failed: ${fallbackErr.message}`);
              continue; // Try next URL
            }
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
          console.log(`✅ [useEventsFromGitHub] Loading complete`);
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
