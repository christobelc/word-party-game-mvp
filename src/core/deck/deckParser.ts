import type { WordPair, WordStats } from './Deck';

function simpleHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

function defaultStats(): WordStats {
    return {
        weight: 1,
        timesSeen: 0,
        timesCorrect: 0,
        lastSeenAt: null,
    };
}

export function deckParser(input: string): WordPair[] {
    const lines = input.split('\n');
    const pairs: WordPair[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Try splitting on =, :, or tab
        const separatorMatch = trimmed.match(/[=:\t]/);
        if (!separatorMatch) continue;

        const separatorIndex = separatorMatch.index!;
        const prompt = trimmed.substring(0, separatorIndex).trim();
        const answer = trimmed.substring(separatorIndex + 1).trim();

        if (!prompt || !answer) continue;

        const id = simpleHash(`${prompt}${answer}`);

        pairs.push({
            id,
            prompt,
            answer,
            stats: defaultStats(),
        });
    }

    return pairs;
}