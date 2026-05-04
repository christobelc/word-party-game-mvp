import type { Deck, WordPair } from '../../core/deck/Deck';

export function pickDecoys(deck: Deck, correct: WordPair, n: number): WordPair[] {
    const candidates = deck.words.filter((w) => w.id !== correct.id);
    const selected: WordPair[] = [];
    const pool = [...candidates];

    while (selected.length < n && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        const [picked] = pool.splice(idx, 1);
        selected.push(picked);
    }

    return selected;
}