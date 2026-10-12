# Release countdown uses the current calendar day

## Root cause

`src/components/VideoCard.tsx` calculated every release countdown from the
hardcoded date `new Date("2026-01-28")`. The same expression was present in the
deployed MovieShows1/2 application bundle. Toy Story 5 therefore displayed
"In 4 Months" on October 12 despite its June 2026 release date.

Date-only release strings were also parsed as UTC instants and then displayed
in local time, making June 19 appear as June 18 in North American time zones.

## Repair

- Calculate calendar-day differences from the viewer's current local day,
  using UTC arithmetic for day counts so daylight-saving changes do not add
  or subtract a day.
- Initialize countdown state after hydration rather than baking a countdown
  into a static export. Refresh the clock each minute and clean up the timer.
- Reject malformed/impossible release dates and log those errors explicitly.
- Display date-only release strings at local noon to avoid a UTC/local
  off-by-one day.
- Use "Released" for past/current release dates. A release date alone is not
  evidence that a film is currently available on a streaming platform.

## Verification

- `TZ=America/Toronto node --experimental-strip-types --test tests/release-date.test.mjs`:
  7 tests passed, including Toy Story 5 in October, same-day/tomorrow boundaries,
  future countdown thresholds, DST boundaries, invalid dates, and component
  clock/hydration wiring.
- `npm run build`: passed compilation, TypeScript checking, and static export.
- Source changes affect only the movie application; no events homepage export
  should be deployed. Preserve MovieShows2's existing appended enhancements
  when preparing its application HTML.
