import type { Deck, WordPair } from '../deck/Deck';

export interface WordSelectionStrategy {
    pick(deck: Deck, n: number): WordPair[];
    recordResult(word: WordPair, correct: boolean): WordPair['stats'];
}