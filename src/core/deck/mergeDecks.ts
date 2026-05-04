import type { Deck, WordPair } from './Deck';

export interface MergedDeckResult {
    merged: Deck;                       // virtual deck for GameContext                                                      
    sourceMap: Map<string, string>;     // wordId → source deckId
}

export function mergeDecks(decks: Deck[]): MergedDeckResult {
    const sourceMap = new Map<string, string>();
    const allWords: WordPair[] = [];

    for (const deck of decks) {
        for (const word of deck.words) {
            sourceMap.set(word.id, deck.id);
            allWords.push(word);
        }
    }

    const ids = decks.map((d) => d.id).join('+');
    const names = decks.map((d) => d.name).join(' + ');

    const merged: Deck = {
        id: `merged:${ids}`,
        name: names,
        words: allWords,
        createdAt: Math.min(...decks.map((d) => d.createdAt)),
        updatedAt: Math.max(...decks.map((d) => d.updatedAt)),
    };

    return { merged, sourceMap };
}
