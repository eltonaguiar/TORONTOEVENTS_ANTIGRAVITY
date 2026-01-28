Project Progress Snapshot (movieshows)

Overview
- Next.js app (App Router) with client-side vertical snap feed of movie trailers.
- Core UI is a full-screen scroll experience with auto-play on active card.
- Primary data source is a local mock list (4 movies) with YouTube IDs.

Current Implemented Features
- Full-screen snap scrolling feed (`src/app/page.tsx`).
- Video playback via `react-player` with autoplay when the card is active.
- Basic interaction buttons: like, save, share, mute/unmute.
- “Vibe” reaction buttons with simple hover interaction.
- Overlay UI: rating badge, year badge, title, description, and genre chips.
- Basic styling with gradients and Tailwind utilities.

Gaps / Constraints Observed
- No backend or API integration (mock data only).
- No persistence for likes/saves; state resets on refresh.
- Share button is UI-only (no action handler).
- No accessibility affordances (keyboard, ARIA, focus states).
- No routing beyond single page.

Suggested Features (Next Steps)
1) Data & Content
- Replace mock data with a TMDB/IMDb pipeline or a local JSON feed + nightly cron update.
- Add trailer fallback (if no YouTube ID) to poster-only mode.
- Add “similar titles” or “up next” section within each card.

2) Playback & Feed UX
- Add preloading of the next/previous video for smoother transitions.
- Tap-to-pause overlay with visual feedback and play state indicator.
- Persist mute preference in localStorage and across cards.
- Add auto-skip to next card when a trailer ends (optional).

3) Interactions & Social
- Implement real share flow (Web Share API + fallback copy link).
- Add animated counters for likes/saves (local or persisted).
- Add “Add to Watchlist” with a simple localStorage-based list.

4) Quality & Testing
- Add basic unit tests for `VideoCard` toggles and autoplay behavior.
- Add end-to-end test for scroll snap + active index detection.
- Add lint rule/config for consistent hook dependency handling.

5) Accessibility & Performance
- Add keyboard navigation (ArrowUp/ArrowDown) to move cards.
- Add focus outlines, ARIA labels, and reduced-motion support.
- Lazy-load ReactPlayer and/or use IntersectionObserver for play/pause.

6) Visual/Branding Enhancements
- Add branded splash screen or intro card at top of feed.
- Add dynamic background accents based on genre (colors or badges).
- Add “More Info” modal with cast/crew data and trailer credits.

Notes
- If desired, I can draft a roadmap card or user stories next.
- I can also convert the README to a project-specific doc and move this plan there.
