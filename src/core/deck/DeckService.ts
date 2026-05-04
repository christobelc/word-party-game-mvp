import type { Deck } from './Deck';

export interface DeckService {
    list(): Promise<Deck[]>;
    get(id: string): Promise<Deck | null>;
    save(deck: Deck): Promise<void>;
    delete(id: string): Promise<void>;
    recordWordResult(deckId: string, wordId: string, correct: boolean): Promise<void>;
}