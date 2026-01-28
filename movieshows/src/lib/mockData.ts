/**
 * Movie/TV database and types.
 * Primary data source: data/movies.json (2020 onward, prioritized 2025+).
 * Now Playing (Toronto): merged from data/nowPlayingToronto.json (Cineplex + Imagine Cinemas).
 */

export type CategoryFilter = {
  movies: boolean;
  tv: boolean;
  nowPlaying: boolean;
};

/** Streaming sources available in the app */
export type StreamingSource =
  | "Disney+"
  | "Hulu"
  | "Paramount Plus"
  | "Netflix"
  | "Amazon Prime"
  | "In Theatres"
  | "Max"
  | "Apple TV+";

export type NowPlayingTheatre = "Cineplex" | "Imagine Cinemas";

export interface Movie {
  id: string;
  title: string;
  description: string;
  /** Alternative descriptions from different sources */
  descriptions?: string[];
  videoUrl: string; // YouTube video ID (primary trailer)
  videoUrlFallback?: string; // Fallback trailer if primary fails
  posterUrl: string;
  genres: string[];
  rating: string; // IMDb rating (standard)
  rottenTomatoesRating?: string;
  year: string;
  releaseDate?: string;
  type: "movie" | "tv";
  source: StreamingSource;
  /** Toronto theatres where this is currently playing (from nowPlayingToronto.json or inline) */
  nowPlayingTheatres?: NowPlayingTheatre[];
}

interface MoviesDatabase {
  version: string;
  updated: string;
  movies: Movie[];
}

interface NowPlayingToronto {
  updated: string;
  /** Movie titles or IDs currently at Cineplex Toronto locations */
  cineplex: string[];
  /** Movie titles or IDs currently at Imagine Cinemas Toronto (Carlton, Market Square) */
  imagineCinemas: string[];
}

// Load from JSON database (2020 onward, 2025+ prioritized)
import moviesDb from "../data/movies.json";
import nowPlayingDb from "../data/nowPlayingToronto.json";

const raw = moviesDb as MoviesDatabase;
const nowPlaying = nowPlayingDb as NowPlayingToronto;

/** Normalize title for matching (lowercase, trim) */
function norm(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Apply now-playing data: if a movie title or id is in cineplex/imagineCinemas lists, set nowPlayingTheatres */
function mergeNowPlaying(movies: Movie[]): Movie[] {
  const cineplexSet = new Set(nowPlaying.cineplex.map(norm));
  const imagineSet = new Set(nowPlaying.imagineCinemas.map(norm));
  return movies.map((m) => {
    const theatres: NowPlayingTheatre[] = [];
    const nTitle = norm(m.title);
    const nId = norm(m.id);
    if (cineplexSet.has(nTitle) || cineplexSet.has(nId)) theatres.push("Cineplex");
    if (imagineSet.has(nTitle) || imagineSet.has(nId)) theatres.push("Imagine Cinemas");
    return { ...m, nowPlayingTheatres: theatres.length ? theatres : m.nowPlayingTheatres };
  });
}

/** All movies/TV from the database, sorted: 2025+ first; now-playing data merged from Toronto theatres */
export const MOCK_MOVIES: Movie[] = mergeNowPlaying([...raw.movies]).sort((a, b) => {
  const yearA = parseInt(a.year, 10);
  const yearB = parseInt(b.year, 10);
  if (yearA !== yearB) return yearB - yearA; // newer first
  const dateA = a.releaseDate || "";
  const dateB = b.releaseDate || "";
  return dateB.localeCompare(dateA);
});

/** Movies currently playing in Toronto (Cineplex and/or Imagine Cinemas) */
export function getNowPlayingMovies(): Movie[] {
  return MOCK_MOVIES.filter((m) => m.type === "movie" && (m.nowPlayingTheatres?.length ?? 0) > 0);
}

/** 
 * Find similar movies based on:
 * 1. Primary: Overlapping genres (at least 1)
 * 2. Secondary: Same media type (movie/tv)
 * 3. Priority: Newer releases
 */
export function getSimilarMovies(movie: Movie, limit: number = 5): Movie[] {
  return MOCK_MOVIES
    .filter(m => m.id !== movie.id) // Exclude current
    .map(m => {
      // Calculate similarity score
      const genreOverlap = m.genres.filter(g => movie.genres.includes(g)).length;
      const typeMatch = m.type === movie.type ? 1 : 0;
      const score = (genreOverlap * 2) + typeMatch;
      return { movie: m, score };
    })
    .filter(item => item.score > 1) // Must have at least genre overlap or be same type + something
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // If score is same, newer year first
      return parseInt(b.movie.year) - parseInt(a.movie.year);
    })
    .slice(0, limit)
    .map(item => item.movie);
}

