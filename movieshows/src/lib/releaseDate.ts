export function getReleaseDayDifference(releaseDate: string, today = new Date()): number {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(releaseDate);
    if (!match || !Number.isFinite(today.getTime())) {
        throw new RangeError("Invalid movie release date or current date");
    }
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const release = new Date(Date.UTC(year, month, day));
    if (release.getUTCFullYear() !== year ||
        release.getUTCMonth() !== month ||
        release.getUTCDate() !== day) {
        throw new RangeError("Invalid movie release date");
    }
    const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((release.getTime() - currentDay) / 86400000);
}
