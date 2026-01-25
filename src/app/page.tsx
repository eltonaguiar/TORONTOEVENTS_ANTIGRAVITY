import { getEvents } from '../lib/data';
import EventCard from '../components/EventCard';
import { Event } from '../lib/types';
import { isMultiDay } from '../lib/scraper/utils';

// Force static generation
export const dynamic = 'force-static';

export default function Home() {
  const allEvents = getEvents();

  // Filter Logic
  // 1. Separate Multi-Day
  const singleDayEvents = allEvents.filter(e => !isMultiDay(e) && new Date(e.date) >= new Date());
  const multiDayEvents = allEvents.filter(e => isMultiDay(e) && (e.endDate ? new Date(e.endDate) >= new Date() : true));

  return (
    <main className="min-h-screen pb-20">
      {/* Hero */}
      <header className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--pk-900)] to-[var(--surface-0)] opacity-50 -z-10" />
        <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight glow-text">
          Toronto Events
        </h1>
        <p className="text-lg text-[var(--text-2)] max-w-2xl mx-auto">
          The curated feed of what's happening in the city. Updated daily.
        </p>
      </header>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-4">

        {/* Upcoming Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-[var(--pk-500)]">★</span>
              Upcoming Events
            </h2>
            <div className="text-sm text-[var(--text-3)]">
              {singleDayEvents.length} events found
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {singleDayEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {singleDayEvents.length === 0 && (
            <div className="text-center py-20 glass-panel rounded-xl">
              <p className="text-[var(--text-2)]">No upcoming events found. Check back later!</p>
            </div>
          )}
        </section>

        {/* Multi-Day Section */}
        {multiDayEvents.length > 0 && (
          <section>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px flex-1 bg-white/10" />
              <h2 className="text-xl font-bold text-[var(--text-2)] uppercase tracking-widest">
                Multi-Day / Festivals
              </h2>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {multiDayEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
