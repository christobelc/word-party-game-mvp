export interface WordPair {
    id: string;            // stable: hash(deckId + prompt + answer)
    prompt: string;        // English, e.g. "door"
    answer: string;        // Korean, e.g. "문"
    stats: WordStats;
}

export interface WordStats {
    weight: number;        // selection weight, default 1, miss → 3, correct *= 0.8, floor 1
    timesSeen: number;
    timesCorrect: number;
    lastSeenAt: number | null;
}

export interface Deck {
    id: string;            // uuid
    name: string;
    words: WordPair[];
    createdAt: number;
    updatedAt: number;
}