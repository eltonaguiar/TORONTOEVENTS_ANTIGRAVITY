'use client';

import AdUnit from '../../components/AdUnit';
import FrameDataAnalysis from '../../components/FrameDataAnalysis';

export default function TwoXKOPage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <header className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--pk-900)] to-[var(--surface-0)] opacity-50 -z-10" />
        <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight glow-text">
          2XKO
        </h1>
        <p className="text-lg text-[var(--text-2)] max-w-2xl mx-auto">
          The Ultimate 2v2 Fighting Game from Riot Games
        </p>
        <p className="text-sm text-[var(--text-3)] mt-2">
          Free-to-play • Cross-platform • Available Now
        </p>
      </header>

      {/* Top Banner Ad */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AdUnit slot="1234567890" format="horizontal" className="mb-8" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Platform Information & Download Links */}
        <section className="bg-[var(--surface-1)] rounded-lg p-8 border border-white/10">
          <h2 className="text-3xl font-bold mb-6 text-[var(--text-1)]">Available Platforms</h2>
          <p className="text-[var(--text-2)] mb-6">
            2XKO launched on <strong>January 20, 2026</strong> and is available on multiple platforms with full cross-platform play and cross-progression support.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5">
              <h3 className="text-xl font-bold mb-3 text-[var(--text-1)]">PC</h3>
              <p className="text-[var(--text-2)] mb-4 text-sm">Play on Windows</p>
              <a 
                href="https://2xko.riotgames.com/en-us/download" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
              >
                Download for PC
              </a>
            </div>
            
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5">
              <h3 className="text-xl font-bold mb-3 text-[var(--text-1)]">PlayStation 5</h3>
              <p className="text-[var(--text-2)] mb-4 text-sm">Available on PS5</p>
              <a 
                href="https://store.playstation.com/en-us/product/UP0000-PPSA00000_00-2XKO00000000000" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-[#003087] hover:bg-[#0043a0] text-white font-bold rounded-lg transition-colors"
              >
                Get on PlayStation Store
              </a>
            </div>
            
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5">
              <h3 className="text-xl font-bold mb-3 text-[var(--text-1)]">Xbox Series X|S</h3>
              <p className="text-[var(--text-2)] mb-4 text-sm">Available on Xbox</p>
              <a 
                href="https://www.xbox.com/en-us/games/store/2xko/9NBLGGH5X9K6" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-[#107C10] hover:bg-[#0e6b0e] text-white font-bold rounded-lg transition-colors"
              >
                Get on Microsoft Store
              </a>
            </div>
          </div>

          <div className="bg-[var(--surface-2)] p-4 rounded-lg border border-white/5">
            <p className="text-[var(--text-2)] text-sm">
              <strong className="text-[var(--text-1)]">Cross-Platform Features:</strong> Play with friends across all platforms. Your progress, unlocks, and cosmetics sync automatically across all devices.
            </p>
          </div>
        </section>

        {/* Official Links */}
        <section className="bg-[var(--surface-1)] rounded-lg p-8 border border-white/10">
          <h2 className="text-3xl font-bold mb-6 text-[var(--text-1)]">Official Resources</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <a 
              href="https://2xko.wiki" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-[var(--surface-2)] rounded-lg border border-white/5 hover:border-[var(--pk-500)] transition-all group"
            >
              <div className="text-3xl">📚</div>
              <div>
                <h3 className="font-bold text-[var(--text-1)] group-hover:text-[var(--pk-500)] transition-colors">2XKO Wiki</h3>
                <p className="text-sm text-[var(--text-2)]">Official community wiki with frame data, guides, and more</p>
              </div>
            </a>
            
            <a 
              href="https://2xko.riotgames.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-[var(--surface-2)] rounded-lg border border-white/5 hover:border-[var(--pk-500)] transition-all group"
            >
              <div className="text-3xl">🎮</div>
              <div>
                <h3 className="font-bold text-[var(--text-1)] group-hover:text-[var(--pk-500)] transition-colors">Official Website</h3>
                <p className="text-sm text-[var(--text-2)]">Latest news, updates, and official game information</p>
              </div>
            </a>
          </div>
        </section>

        {/* AI Frame Data Analysis */}
        <FrameDataAnalysis />

        {/* Frame Data Embed */}
        <section className="bg-[var(--surface-1)] rounded-lg p-8 border border-white/10">
          <h2 className="text-3xl font-bold mb-4 text-[var(--text-1)]">Frame Data Reference</h2>
          <p className="text-[var(--text-2)] mb-6">
            Comprehensive frame data for all champions, automatically updated daily from our GitHub repository.
          </p>
          
          <div className="bg-[var(--surface-2)] rounded-lg overflow-hidden border border-white/5">
            <iframe
              src="/2xkoframedata.html"
              className="w-full h-[800px] border-0"
              title="2XKO Frame Data"
              loading="lazy"
            />
          </div>
          
          <div className="mt-4 flex gap-4 items-center">
            <a 
              href="https://github.com/eltonaguiar/2XKOFRAMEDATA" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-[var(--text-2)] hover:text-[var(--pk-500)] transition-colors"
            >
              View on GitHub →
            </a>
            <span className="text-[var(--text-3)]">•</span>
            <a 
              href="/2xkoframedata.html" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-[var(--text-2)] hover:text-[var(--pk-500)] transition-colors"
            >
              Open in New Tab →
            </a>
          </div>
        </section>

        {/* Game Videos */}
        <section className="bg-[var(--surface-1)] rounded-lg p-8 border border-white/10">
          <h2 className="text-3xl font-bold mb-6 text-[var(--text-1)]">Game Highlights</h2>
          <p className="text-[var(--text-2)] mb-6">
            Watch official trailers, popular gameplay videos, and tutorial guides to master 2XKO.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Official Vi Gameplay Reveal */}
            <div className="bg-[var(--surface-2)] rounded-lg overflow-hidden border border-white/5">
              <div className="aspect-video">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/B6Jntcnc6g8?enablejsapi=0&modestbranding=1&rel=0&origin=https://findtorontoevents.ca"
                  title="2XKO Official Vi Gameplay Reveal Trailer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[var(--text-1)] mb-2">Official Vi Gameplay Reveal</h3>
                <p className="text-sm text-[var(--text-2)]">Official Riot Games trailer - Vi hits hard! 550K+ views</p>
              </div>
            </div>
            
            {/* Official Ekko Gameplay */}
            <div className="bg-[var(--surface-2)] rounded-lg overflow-hidden border border-white/5">
              <div className="aspect-video">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/0x2Lhj8Ibwo?enablejsapi=0&modestbranding=1&rel=0&origin=https://findtorontoevents.ca"
                  title="2XKO Official Ekko Gameplay Trailer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[var(--text-1)] mb-2">Official Ekko Gameplay</h3>
                <p className="text-sm text-[var(--text-2)]">Official gameplay reveal showcasing Ekko's time-bending abilities</p>
              </div>
            </div>
            
            {/* How Combos Work - Popular Guide */}
            <div className="bg-[var(--surface-2)] rounded-lg overflow-hidden border border-white/5">
              <div className="aspect-video">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/55yjz7uxbMo?enablejsapi=0&modestbranding=1&rel=0&origin=https://findtorontoevents.ca"
                  title="HOW COMBOS WORK - 2XKO Combo Theory Guide"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[var(--text-1)] mb-2">How Combos Work - Theory Guide</h3>
                <p className="text-sm text-[var(--text-2)]">Popular tutorial (6K+ views) - Master combo fundamentals</p>
              </div>
            </div>
            
            {/* Learn Every VI Combo - Popular Guide */}
            <div className="bg-[var(--surface-2)] rounded-lg overflow-hidden border border-white/5">
              <div className="aspect-video">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/qq0-ZeDWkKc?enablejsapi=0&modestbranding=1&rel=0&origin=https://findtorontoevents.ca"
                  title="Learn EVERY VI Combo in 2XKO (Full Tech Guide)"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[var(--text-1)] mb-2">Learn Every VI Combo</h3>
                <p className="text-sm text-[var(--text-2)]">Popular guide (8K+ views) - Complete Vi combo breakdown</p>
              </div>
            </div>
            
            {/* How to Play Guide */}
            <div className="bg-[var(--surface-2)] rounded-lg overflow-hidden border border-white/5">
              <div className="aspect-video">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/y5uo_W2I8tc?enablejsapi=0&modestbranding=1&rel=0&origin=https://findtorontoevents.ca"
                  title="How to Play Guide / Tutorial Walkthrough | 2XKO Gameplay"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[var(--text-1)] mb-2">How to Play - Tutorial</h3>
                <p className="text-sm text-[var(--text-2)]">Complete walkthrough guide for beginners</p>
              </div>
            </div>
            
            {/* Official Vi Gameplay (Alternative) */}
            <div className="bg-[var(--surface-2)] rounded-lg overflow-hidden border border-white/5">
              <div className="aspect-video">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/quGZjIkigu4?enablejsapi=0&modestbranding=1&rel=0&origin=https://findtorontoevents.ca"
                  title="Vi Gameplay Reveal Trailer | 2XKO"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[var(--text-1)] mb-2">Vi Gameplay Reveal</h3>
                <p className="text-sm text-[var(--text-2)]">Official Riot Games trailer showcasing Vi's moveset</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <a 
              href="https://www.youtube.com/results?search_query=2XKO+official" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors text-center"
            >
              Watch More on YouTube →
            </a>
            <a 
              href="https://www.tiktok.com/discover/2xko" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-black hover:bg-gray-800 text-white font-bold rounded-lg transition-colors text-center"
            >
              Watch on TikTok →
            </a>
          </div>
        </section>

        {/* Skins & Aesthetic Items */}
        <section className="bg-[var(--surface-1)] rounded-lg p-8 border border-white/10">
          <h2 className="text-3xl font-bold mb-6 text-[var(--text-1)]">Skins & Aesthetic Items</h2>
          <p className="text-[var(--text-2)] mb-6">
            2XKO offers a wide variety of cosmetic items to personalize your experience. Customize your champions, avatars, and more with unique skins, chromas, emotes, and other aesthetic items.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5">
              <h3 className="text-xl font-bold mb-3 text-[var(--text-1)]">Character Skins</h3>
              <p className="text-[var(--text-2)] mb-4 text-sm">
                Transform your champions with alternate skins. Most characters have multiple skin options, including:
              </p>
              <ul className="list-disc list-inside text-[var(--text-2)] text-sm space-y-1 mb-4">
                <li>Dynasty Ahri</li>
                <li>Bladesong Yasuo</li>
                <li>Arcane skins (Ekko, Vi, Jinx)</li>
                <li>And many more!</li>
              </ul>
              <p className="text-[var(--text-2)] text-sm">
                All skins feature customizable color variants (chromas) to match your style.
              </p>
            </div>
            
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5">
              <h3 className="text-xl font-bold mb-3 text-[var(--text-1)]">Other Cosmetics</h3>
              <p className="text-[var(--text-2)] mb-4 text-sm">
                Beyond character skins, 2XKO offers:
              </p>
              <ul className="list-disc list-inside text-[var(--text-2)] text-sm space-y-1">
                <li><strong>Avatar Items:</strong> Customize your player avatar</li>
                <li><strong>Emotes:</strong> Express yourself with unique animations</li>
                <li><strong>Stickers:</strong> Personalize your profile</li>
                <li><strong>Finishers:</strong> Epic victory animations</li>
                <li><strong>Player Cards:</strong> Showcase your achievements</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5">
            <h3 className="text-xl font-bold mb-3 text-[var(--text-1)]">How to Get Cosmetics</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-bold text-[var(--text-1)] mb-2">Store Purchases</h4>
                <p className="text-[var(--text-2)] text-sm">
                  Buy cosmetics directly with KO Points (premium currency) from the in-game store.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[var(--text-1)] mb-2">Battle Pass</h4>
                <p className="text-[var(--text-2)] text-sm">
                  Earn cosmetics through both free and premium Battle Pass tracks. Premium track includes full skins and exclusive items.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[var(--text-1)] mb-2">Free Rewards</h4>
                <p className="text-[var(--text-2)] text-sm">
                  Unlock chromas, avatar items, and emotes using Credits earned through gameplay, character mastery, and missions.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 bg-[var(--surface-2)] p-4 rounded-lg border border-white/5">
            <p className="text-[var(--text-2)] text-sm">
              <strong className="text-[var(--text-1)]">Currency System:</strong> 2XKO uses three currencies: 
              <strong className="text-[var(--pk-500)]"> KO Points</strong> (premium, real money), 
              <strong className="text-[var(--pk-500)]"> Champion Tokens</strong> (unlock characters), and 
              <strong className="text-[var(--pk-500)]"> Credits</strong> (free, earned through gameplay, 12,000 limit).
            </p>
          </div>
        </section>

        {/* Additional Info */}
        <section className="bg-[var(--surface-1)] rounded-lg p-8 border border-white/10">
          <h2 className="text-3xl font-bold mb-6 text-[var(--text-1)]">About 2XKO</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-[var(--text-2)] mb-4">
              2XKO is a free-to-play 2v2 fighting game developed by Riot Games, featuring characters from the League of Legends universe. 
              The game combines fast-paced action with strategic team play, where two players team up to take on another duo.
            </p>
            <p className="text-[var(--text-2)] mb-4">
              Season 1 launched alongside the console release on January 20, 2026, bringing new content including a new champion 
              and Battle Pass. The game initially launched in early access on PC in October 2025.
            </p>
            <p className="text-[var(--text-2)]">
              With full cross-platform play and cross-progression, you can play with friends on any platform and your progress 
              syncs automatically across all devices.
            </p>
          </div>
        </section>

        {/* In-Feed Ad */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <AdUnit slot="0987654321" format="auto" className="my-8" />
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 text-center text-[var(--text-3)] border-t border-white/5 mt-12">
        <div className="flex justify-center gap-6 mb-4">
          <a 
            href="/" 
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
          >
            ← Back to Toronto Events
          </a>
        </div>
        <p className="text-xs opacity-50">
          2XKO is a trademark of Riot Games, Inc. This page is not affiliated with Riot Games.
        </p>
      </footer>
    </main>
  );
}
