'use client';

import { useEventsFromGitHub, useMetadataFromGitHub } from '../lib/data-client';
import EventFeed from '../components/EventFeed';
import ChatAssistant from '../components/ChatAssistant';
import AdUnit from '../components/AdUnit';
import WindowsFixerPromo from '../components/WindowsFixerPromo';

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
    <main className="min-h-screen pb-20">
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
        </p>
      </header>

      {/* Windows Fixer Promotional Section */}
      <div className="max-w-7xl mx-auto px-4">
        <WindowsFixerPromo />
      </div>

      {/* Top Banner Ad */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AdUnit slot="1234567890" format="horizontal" className="mb-8" />
      </div>

      {eventsLoading ? (
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[var(--pk-500)] border-t-transparent"></div>
          <p className="mt-4 text-[var(--text-2)]">Loading events...</p>
        </div>
      ) : (
        <>
          <EventFeed events={allEvents} />
          <ChatAssistant allEvents={allEvents} />
        </>
      )}

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
