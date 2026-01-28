'use client';

import { useState } from 'react';

export default function MentalHealthResourcesPage() {
  const [selectedCountry, setSelectedCountry] = useState<string>('');

  return (
    <main className="min-h-screen">
      {/* Crisis Help Banner */}
      <section className="bg-gradient-to-r from-red-600 to-red-800 text-white py-6 px-6 text-center border-b-4 border-red-900">
        <h2 className="text-2xl font-bold mb-4">🚨 In Crisis? Get Help Now</h2>
        <div className="flex flex-wrap justify-center gap-4 text-lg">
          <a 
            href="tel:18334564566" 
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors border border-white/30"
          >
            ☎️ Call 1-833-456-4566
          </a>
          <a 
            href="sms:741741&body=HOME" 
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors border border-white/30"
          >
            💬 Text HOME to 741741
          </a>
          <a 
            href="tel:911" 
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors border border-white/30"
          >
            🆘 Emergency: 911
          </a>
        </div>
      </section>

      {/* Hero Section */}
      <header className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--pk-900)] to-[var(--surface-0)] opacity-50 -z-10" />
        <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight glow-text">
          🌟 Mental Health Resources
        </h1>
        <p className="text-lg text-[var(--text-2)] max-w-2xl mx-auto">
          Find support, play therapeutic games, and access resources from around the world
        </p>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Navigation Links */}
        <section className="bg-[var(--surface-1)] rounded-lg p-6 border border-white/10">
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/" className="px-4 py-2 bg-[var(--surface-2)] hover:bg-[var(--pk-500)] rounded-lg transition-colors">
              Home
            </a>
            <span className="px-4 py-2 text-[var(--text-3)]">•</span>
            <span className="px-4 py-2 bg-[var(--pk-500)] text-white rounded-lg font-bold">
              🌍 Global Resources
            </span>
            <span className="px-4 py-2 text-[var(--text-3)]">•</span>
            <a href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Research_Science.html" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[var(--surface-2)] hover:bg-[var(--pk-500)] rounded-lg transition-colors">
              📊 Research & Science
            </a>
            <span className="px-4 py-2 text-[var(--text-3)]">•</span>
            <a href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Sources_References.html" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[var(--surface-2)] hover:bg-[var(--pk-500)] rounded-lg transition-colors">
              📚 Sources & References
            </a>
          </div>
        </section>

        {/* Wellness Games & Interactive Tools */}
        <section className="bg-[var(--surface-1)] rounded-lg p-8 border border-white/10">
          <h2 className="text-3xl font-bold mb-6 text-[var(--text-1)]">
            🎮 Wellness Games & Interactive Tools
          </h2>
          <p className="text-[var(--text-2)] mb-6">
            Take a mental break with these professionally designed games and interactive tools designed to help reduce stress and anxiety.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Breathing Exercise */}
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5 hover:border-[var(--pk-500)] transition-all">
              <div className="text-4xl mb-4">🫁</div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-1)]">Breathing Exercise</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                A guided 4-7-8 breathing exercise to calm your nervous system instantly.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Anxiety Relief</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Relaxation</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">2 mins</span>
              </div>
              <a 
                href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Breathing_Exercise.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
              >
                Start Exercise →
              </a>
            </div>

            {/* Mindfulness Meditation */}
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5 hover:border-[var(--pk-500)] transition-all">
              <div className="text-4xl mb-4">🧘</div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-1)]">Mindfulness Meditation</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                A 5-minute guided mindfulness session to center yourself and find peace.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Stress Relief</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Focus</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">5 mins</span>
              </div>
              <a 
                href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Mindfulness_Meditation.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
              >
                Start Meditation →
              </a>
            </div>

            {/* Color Therapy Game */}
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5 hover:border-[var(--pk-500)] transition-all">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-1)]">Color Therapy Game</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Interactive color matching game that calms the mind through simple gameplay.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Relaxation</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Focus</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Engaging</span>
              </div>
              <a 
                href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Color_Therapy_Game.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
              >
                Play Now →
              </a>
            </div>

            {/* Progressive Muscle Relaxation */}
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5 hover:border-[var(--pk-500)] transition-all">
              <div className="text-4xl mb-4">💪</div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-1)]">Progressive Muscle Relaxation</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Guided PMR technique to release physical tension and anxiety.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Tension Relief</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Relaxation</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">10 mins</span>
              </div>
              <a 
                href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Progressive_Muscle_Relaxation.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
              >
                Begin Relaxation →
              </a>
            </div>

            {/* Gratitude Journal */}
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5 hover:border-[var(--pk-500)] transition-all">
              <div className="text-4xl mb-4">📔</div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-1)]">Gratitude Journal</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Interactive journal to reflect on positive moments and boost mood.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Mood Boost</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Reflection</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Personal</span>
              </div>
              <a 
                href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Gratitude_Journal.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
              >
                Open Journal →
              </a>
            </div>

            {/* 5-4-3-2-1 Grounding */}
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5 hover:border-[var(--pk-500)] transition-all">
              <div className="text-4xl mb-4">🌱</div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-1)]">5-4-3-2-1 Grounding</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Interactive 5-4-3-2-1 grounding technique for panic and anxiety attacks.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Panic Relief</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Grounding</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Quick</span>
              </div>
              <a 
                href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/5-4-3-2-1_Grounding.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
              >
                Begin Technique →
              </a>
            </div>

            {/* Quick Coherence (QCT) */}
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5 hover:border-[var(--pk-500)] transition-all">
              <div className="text-4xl mb-4">❤️</div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-1)]">Quick Coherence (QCT)</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Heart-focused breathing technique backed by neuroscience research to improve Heart Rate Variability.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">HRV Improvement</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Stress Relief</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">3 mins</span>
              </div>
              <a 
                href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Quick_Coherence.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
              >
                Start QCT →
              </a>
            </div>

            {/* Cyclical Sighing */}
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5 hover:border-[var(--pk-500)] transition-all">
              <div className="text-4xl mb-4">💨</div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-1)]">Cyclical Sighing</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Double inhale + extended exhale pattern clinically proven for rapid stress reduction.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Rapid Relief</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Physiological Reset</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">2 mins</span>
              </div>
              <a 
                href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Cyclical_Sighing.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
              >
                Begin Sighing →
              </a>
            </div>

            {/* Vagus Nerve Reset */}
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5 hover:border-[var(--pk-500)] transition-all">
              <div className="text-4xl mb-4">🧬</div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-1)]">Vagus Nerve Reset</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Polyvagal theory-based exercises to activate your parasympathetic nervous system.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Nervous System</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Safety State</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">5 mins</span>
              </div>
              <a 
                href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Vagus_Nerve_Reset.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
              >
                Begin Reset →
              </a>
            </div>

            {/* Identity Builder */}
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5 hover:border-[var(--pk-500)] transition-all">
              <div className="text-4xl mb-4">👤</div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-1)]">Identity Builder</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Atomic Habits-based tool to rewire your identity and create resilient neural pathways.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Long-term</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Neural Change</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Personal</span>
              </div>
              <a 
                href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Identity_Builder.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
              >
                Build Identity →
              </a>
            </div>

            {/* 5-3-1 Social Fitness */}
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5 hover:border-[var(--pk-500)] transition-all">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-1)]">5-3-1 Social Fitness</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Track your social health using the research-backed 5-3-1 framework for meaningful connections.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Community</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Longevity</span>
                <span className="px-2 py-1 bg-[var(--surface-3)] rounded text-xs">Weekly</span>
              </div>
              <a 
                href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/5-3-1_Social_Fitness.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
              >
                Track Connections →
              </a>
            </div>
          </div>
        </section>

        {/* Mental Health Resources by Country */}
        <section className="bg-[var(--surface-1)] rounded-lg p-8 border border-white/10">
          <h2 className="text-3xl font-bold mb-6 text-[var(--text-1)]">
            🌐 Mental Health Resources by Country
          </h2>
          <p className="text-[var(--text-2)] mb-6">
            Find local mental health services, crisis lines, and organizations in your country.
          </p>
          
          <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5">
            <label className="block text-sm font-bold mb-3 text-[var(--text-1)]">
              Select Your Country
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full md:w-1/2 px-4 py-3 bg-[var(--surface-3)] border border-white/10 rounded-lg text-[var(--text-1)] focus:outline-none focus:border-[var(--pk-500)]"
            >
              <option value="">Select a country from the list</option>
              <option value="canada">Canada</option>
              <option value="usa">United States</option>
              <option value="uk">United Kingdom</option>
              <option value="australia">Australia</option>
              <option value="newzealand">New Zealand</option>
              <option value="ireland">Ireland</option>
              <option value="southafrica">South Africa</option>
              <option value="india">India</option>
              <option value="brazil">Brazil</option>
              <option value="mexico">Mexico</option>
              <option value="germany">Germany</option>
              <option value="france">France</option>
              <option value="spain">Spain</option>
              <option value="italy">Italy</option>
              <option value="japan">Japan</option>
              <option value="southkorea">South Korea</option>
              <option value="singapore">Singapore</option>
            </select>
            <p className="text-sm text-[var(--text-3)] mt-3">
              Select a country from the list to see available mental health resources and crisis lines.
            </p>
            {selectedCountry && (
              <div className="mt-4 p-4 bg-[var(--surface-3)] rounded-lg">
                <p className="text-[var(--text-2)]">
                  For detailed resources for {selectedCountry.charAt(0).toUpperCase() + selectedCountry.slice(1)}, please visit the{' '}
                  <a 
                    href={`https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Local_Resources.html#${selectedCountry}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--pk-500)] hover:underline"
                  >
                    Local Resources page
                  </a>
                  .
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Online Resources Available Worldwide */}
        <section className="bg-[var(--surface-1)] rounded-lg p-8 border border-white/10">
          <h2 className="text-3xl font-bold mb-6 text-[var(--text-1)]">
            💻 Online Resources Available Worldwide
          </h2>
          <p className="text-[var(--text-2)] mb-6">
            Access these platforms and resources from anywhere in the world.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5">
              <h3 className="text-xl font-bold mb-3 text-[var(--text-1)]">Crisis Text Line</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Free 24/7 crisis support via text message. Available in multiple countries.
              </p>
              <a 
                href="https://www.crisistextline.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
              >
                Visit Website →
              </a>
            </div>

            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5">
              <h3 className="text-xl font-bold mb-3 text-[var(--text-1)]">7 Cups</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Free online therapy and emotional support from trained listeners.
              </p>
              <a 
                href="https://www.7cups.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
              >
                Visit Website →
              </a>
            </div>

            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5">
              <h3 className="text-xl font-bold mb-3 text-[var(--text-1)]">BetterHelp</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Online counseling and therapy with licensed professionals worldwide.
              </p>
              <a 
                href="https://www.betterhelp.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
              >
                Visit Website →
              </a>
            </div>

            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5">
              <h3 className="text-xl font-bold mb-3 text-[var(--text-1)]">Talkspace</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Online therapy platform connecting you with licensed therapists via text, video, or voice.
              </p>
              <a 
                href="https://www.talkspace.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
              >
                Visit Website →
              </a>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a 
              href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Online_Resources.html" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
            >
              View All Online Resources →
            </a>
          </div>
        </section>

        {/* Resources by Demographics */}
        <section className="bg-[var(--surface-1)] rounded-lg p-8 border border-white/10">
          <h2 className="text-3xl font-bold mb-6 text-[var(--text-1)]">
            👥 Resources by Demographics
          </h2>
          <p className="text-[var(--text-2)] mb-6">
            Find specialized mental health support tailored to your specific needs and demographic.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5">
              <h3 className="text-xl font-bold mb-3 text-[var(--text-1)]">LGBTQ+ Resources</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Specialized support for LGBTQ+ individuals and communities.
              </p>
              <a 
                href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Demographics.html#lgbtq" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors text-sm"
              >
                View Resources →
              </a>
            </div>

            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5">
              <h3 className="text-xl font-bold mb-3 text-[var(--text-1)]">Youth & Teens</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Mental health resources specifically for young people and teenagers.
              </p>
              <a 
                href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Demographics.html#youth" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors text-sm"
              >
                View Resources →
              </a>
            </div>

            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5">
              <h3 className="text-xl font-bold mb-3 text-[var(--text-1)]">Seniors</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Mental health support tailored for older adults and seniors.
              </p>
              <a 
                href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Demographics.html#seniors" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors text-sm"
              >
                View Resources →
              </a>
            </div>

            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5">
              <h3 className="text-xl font-bold mb-3 text-[var(--text-1)]">Veterans</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Specialized mental health resources for military veterans.
              </p>
              <a 
                href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Demographics.html#veterans" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors text-sm"
              >
                View Resources →
              </a>
            </div>

            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5">
              <h3 className="text-xl font-bold mb-3 text-[var(--text-1)]">Indigenous Communities</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Culturally appropriate mental health resources for Indigenous peoples.
              </p>
              <a 
                href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Demographics.html#indigenous" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors text-sm"
              >
                View Resources →
              </a>
            </div>

            <div className="bg-[var(--surface-2)] p-6 rounded-lg border border-white/5">
              <h3 className="text-xl font-bold mb-3 text-[var(--text-1)]">BIPOC Communities</h3>
              <p className="text-sm text-[var(--text-2)] mb-4">
                Mental health resources for Black, Indigenous, and People of Color.
              </p>
              <a 
                href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Demographics.html#bipoc" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors text-sm"
              >
                View Resources →
              </a>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a 
              href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/Demographics.html" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-bold rounded-lg transition-colors"
            >
              View All Demographic Resources →
            </a>
          </div>
        </section>
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
          Mental health resources curated for global access. If you're in crisis, please reach out to local emergency services.
        </p>
        <p className="text-xs opacity-50 mt-2">
          Based on content from{' '}
          <a 
            href="https://eltonaguiar.github.io/MENTALHEALTHRESOURCES/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[var(--pk-500)] hover:underline"
          >
            MENTALHEALTHRESOURCES
          </a>
        </p>
      </footer>
    </main>
  );
}
