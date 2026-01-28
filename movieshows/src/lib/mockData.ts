
export interface Movie {
    id: string;
    title: string;
    description: string;
    videoUrl: string; // YouTube Embed URL or Video ID
    posterUrl: string;
    genres: string[];
    rating: string;
    year: string;
    type: 'movie' | 'tv';
}

export const MOCK_MOVIES: Movie[] = [
    {
        id: "1",
        title: "Dune: Part Two",
        description: "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
        videoUrl: "Way9Dexny3w", // YouTube ID
        posterUrl: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
        genres: ["Sci-Fi", "Adventure"],
        rating: "8.5",
        year: "2024",
        type: 'movie'
    },
    {
        id: "2",
        title: "The Batman",
        description: "When the Riddler, a sadistic serial killer, begins murdering key political figures in Gotham, Batman is forced to investigate the city's hidden corruption and question his family's involvement.",
        videoUrl: "mqqft2x_Aa4",
        posterUrl: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50x9TfdLnTp.jpg",
        genres: ["Action", "Crime", "Drama"],
        rating: "7.8",
        year: "2022",
        type: 'movie'
    },
    {
        id: "3",
        title: "Spider-Man: Across the Spider-Verse",
        description: "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.",
        videoUrl: "cqGjhVJWtEg",
        posterUrl: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
        genres: ["Animation", "Action", "Adventure"],
        rating: "8.8",
        year: "2023",
        type: 'movie'
    },
    {
        id: "4",
        title: "Oppenheimer",
        description: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
        videoUrl: "uYPbbksJxIg",
        posterUrl: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
        genres: ["Biography", "Drama", "History"],
        rating: "8.6",
        year: "2023",
        type: 'movie'
    },
    {
        id: "5",
        title: "The Last of Us",
        description: "After a global pandemic destroys civilization, a hardened survivor takes charge of a 14-year-old girl who may be humanity's last hope.",
        videoUrl: "uLtkt8BonwM",
        posterUrl: "https://image.tmdb.org/t/p/w500/uKVV4D2nF5CCgNMwnxMXAht1yJ.jpg",
        genres: ["Drama", "Sci-Fi", "Horror"],
        rating: "8.8",
        year: "2023",
        type: 'tv'
    },
    {
        id: "6",
        title: "Succession",
        description: "The Roy family is known for controlling the biggest media and entertainment company in the world. However, their world changes when their father steps down from the company.",
        videoUrl: "KLAkxSjs8ZY",
        posterUrl: "https://image.tmdb.org/t/p/w500/7th9d94n310yHfcb8pW8R3522Wq.jpg",
        genres: ["Drama", "Comedy"],
        rating: "8.8",
        year: "2018",
        type: 'tv'
    },
    {
        id: "7",
        title: "Stranger Things",
        description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
        videoUrl: "b9EkMc79ZSU",
        posterUrl: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
        genres: ["Sci-Fi", "Horror", "Drama"],
        rating: "8.7",
        year: "2016",
        type: 'tv'
    }
];
