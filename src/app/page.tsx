import { getEvents } from '../lib/data';
import EventFeed from '../components/EventFeed';
import ChatAssistant from '../components/ChatAssistant';
import ConfigButton from '../components/ConfigButton';
import fs from 'fs';
import path from 'path';

// Force static generation
export const dynamic = 'force-static';

const VERSION = 'v0.5.0';

export const metadata = {
  title: `Toronto Events ${VERSION} - Real-Time Event Listings`,
  description: 'Discover the latest events in Toronto. Updated daily with real data.',
};

function getLastUpdated(): string {
  try {
    const metadataPath = path.join(process.cwd(), 'data', 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      const data = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      const date = new Date(data.lastUpdated);
      return date.toLocaleString('en-US', {
        timeZone: 'America/Toronto',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    }
  } catch (e) {
    console.error('Failed to load metadata:', e);
  }
  return 'Unknown';
}

export default function Home() {
  const allEvents = getEvents();
  const lastUpdated = getLastUpdated();

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

      <EventFeed events={allEvents} />
      <ChatAssistant allEvents={allEvents} />

      <footer className="py-12 text-center text-[var(--text-3)] border-t border-white/5 space-y-4">
        <div className="flex justify-center gap-6">
          <ConfigButton />
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
