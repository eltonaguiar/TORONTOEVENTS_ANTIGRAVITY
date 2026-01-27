# Task 12: Comprehensive Price Extraction from Existing Events

## Goal
Extract prices from titles and descriptions for all events with "See tickets"

## Strategy
1. Extract prices from event titles (e.g., "Early Bird $140", "from $145")
2. Extract prices from descriptions
3. Apply reasonable defaults based on event type/source
4. Generate detailed report

## Patterns to Match
- "$X" in titles
- "Early Bird $X", "VIP $X" in titles
- "(Early Bird $X)" in parentheses
- "from $X", "starting at $X"
- Prices in descriptions

## Success Criteria
- Maximum number of prices extracted
- Flagged event remains fixed
- Report generated with all extractions
