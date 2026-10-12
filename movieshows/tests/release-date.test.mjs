import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getReleaseDayDifference } from "../src/lib/releaseDate.ts";

test("Toy Story 5 is released by October 12, not four months away", () => {
    assert.equal(getReleaseDayDifference("2026-06-19", new Date(2026, 9, 12, 12)), -115);
});

test("same-day releases stay released throughout the day", () => {
    assert.equal(getReleaseDayDifference("2026-06-19", new Date(2026, 5, 19, 0, 1)), 0);
    assert.equal(getReleaseDayDifference("2026-06-19", new Date(2026, 5, 19, 23, 59)), 0);
});

test("tomorrow means the next calendar day even near midnight", () => {
    assert.equal(getReleaseDayDifference("2026-06-20", new Date(2026, 5, 19, 23, 59)), 1);
});

test("future releases preserve day and month countdown thresholds", () => {
    assert.equal(getReleaseDayDifference("2026-11-26", new Date(2026, 9, 12)), 45);
    assert.equal(getReleaseDayDifference("2026-12-11", new Date(2026, 9, 12)), 60);
});

test("calendar-day arithmetic ignores daylight-saving hour changes", () => {
    assert.equal(getReleaseDayDifference("2026-03-09", new Date(2026, 2, 7, 12)), 2);
    assert.equal(getReleaseDayDifference("2026-11-02", new Date(2026, 9, 31, 12)), 2);
});

test("invalid dates fail explicitly rather than displaying a bogus countdown", () => {
    for (const value of ["bad-date", "2026-02-30", "2026-13-01", "2026-6-19"]) {
        assert.throws(() => getReleaseDayDifference(value, new Date(2026, 9, 12)), RangeError);
    }
});

test("card calculates after hydration, refreshes the clock, and never claims streaming availability", () => {
    const source = readFileSync(new URL("../src/components/VideoCard.tsx", import.meta.url), "utf8");
    assert.ok(!source.includes('new Date("2026-01-28")'));
    assert.match(source, /getReleaseDayDifference\(releaseDate\)/);
    assert.match(source, /setInterval/);
    assert.match(source, /clearInterval/);
    assert.ok(!source.includes("Streaming Now"));
    assert.match(source, /Released/);
    assert.match(source, /releaseDays !== null/);
});
