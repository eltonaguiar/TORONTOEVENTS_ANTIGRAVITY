'use client';

import { useEventsFromGitHub, useMetadataFromGitHub } from '../lib/data-client';
import EventFeed from '../components/EventFeed';
import ChatAssistant from '../components/ChatAssistant';
import AdUnit from '../components/AdUnit';
import WindowsFixerPromo from '../components/WindowsFixerPromo';
import MoviesShowsPromo from '../components/MoviesShowsPromo';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { EventFeedSkeleton } from '../components/LoadingSkeleton';

const VERSION = 'v0.5.0';

function formatLastUpdated(dateString: string | null): string {
  if (!dateString) return 'Unknown';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      timeZone: 'America/Toronto',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  } catch (e) {
    return 'Unknown';
  }
}

export default function Home() {
  const { events: allEvents, loading: eventsLoading } = useEventsFromGitHub();
  const { metadata, loading: metadataLoading } = useMetadataFromGitHub();
  const lastUpdated = formatLastUpdated(metadata?.lastUpdated || null);

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <header className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--pk-900)] to-[var(--surface-0)] opacity-50 -z-10" />
        <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight glow-text">
          Toronto Events <span className="text-2xl md:text-3xl text-[var(--pk-300)]">{VERSION}</span>
        </h1>
        <p className="text-lg text-[var(--text-2)] max-w-2xl mx-auto">
          The curated feed of what's happening in the city. Updated daily.
        </p>
        <p className="text-sm text-[var(--text-3)] mt-2">
          Last updated: {lastUpdated}
          {metadata && (
            <span className="ml-4">
              • {metadata.totalEvents} events
            </span>
          )}
        </p>
      </header>

      {/* Windows Fixer Promotional Section */}
      <div className="max-w-7xl mx-auto px-4">
        <WindowsFixerPromo />
      </div>

      {/* Find Movies / TV Shows Section */}
      <div className="max-w-7xl mx-auto px-4">
        <MoviesShowsPromo />
      </div>

      {/* Top Banner Ad */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AdUnit slot="1234567890" format="horizontal" className="mb-8" />
      </div>

      <ErrorBoundary>
        {eventsLoading ? (
          <div className="max-w-7xl mx-auto px-4 py-20">
            <EventFeedSkeleton count={12} />
          </div>
        ) : allEvents.length === 0 ? (
          <div className="max-w-7xl mx-auto px-4 py-20 text-center">
            <div className="glass-panel p-8 rounded-2xl border border-red-500/30">
              <h2 className="text-2xl font-bold text-red-400 mb-4">⚠️ No Events Loaded</h2>
              <p className="text-[var(--text-2)] mb-4">
                Unable to load events. This could be due to:
              </p>
              <ul className="text-left text-sm text-[var(--text-3)] space-y-2 mb-4">
                <li>• Network connectivity issues</li>
                <li>• CORS blocking the GitHub fetch</li>
                <li>• Events.json file not accessible</li>
              </ul>
              <p className="text-xs text-[var(--text-3)] mt-4">
                Check browser console (F12) for detailed error messages.
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-[var(--pk-500)] text-white rounded-lg hover:bg-[var(--pk-600)] transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        ) : (
          <>
            <EventFeed events={allEvents} />
            <ChatAssistant allEvents={allEvents} />
          </>
        )}
      </ErrorBoundary>

      {/* In-Feed Ad */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AdUnit slot="0987654321" format="auto" className="my-8" />
      </div>

      <footer className="py-12 text-center text-[var(--text-3)] border-t border-white/5 space-y-4">
        <div className="flex justify-center gap-6">
          <a href="#" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-white/10">
            🔝 Back to Top
          </a>
        </div>
        <div className="opacity-50 text-xs">
          <p>Built with ❤️ for Toronto</p>
          <p className="mt-1">{VERSION}-tactical-geotime-fixed</p>
        </div>
      </footer>
    </main>
  );
}
