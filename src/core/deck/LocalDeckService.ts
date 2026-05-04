import type { Deck } from './Deck';
import type { DeckService } from './DeckService';

const INDEX_KEY = 'wpg.decks.index';

function readIndex(): string[] {
    try {
        const raw = localStorage.getItem(INDEX_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function writeIndex(ids: string[]): void {
    localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

function deckKey(id: string): string {
    return `wpg.decks.${id}`;
}

export class LocalDeckService implements DeckService {
    async list(): Promise<Deck[]> {
        const ids = readIndex();
        const decks: Deck[] = [];
        for (const id of ids) {
            const raw = localStorage.getItem(deckKey(id));
            if (raw) {
                try {
                    decks.push(JSON.parse(raw));
                } catch {
                    // skip corrupted entry
                }
            }
        }
        return decks;
    }

    async get(id: string): Promise<Deck | null> {
        const raw = localStorage.getItem(deckKey(id));
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    async save(deck: Deck): Promise<void> {
        const ids = readIndex();
        if (!ids.includes(deck.id)) {
            ids.push(deck.id);
            writeIndex(ids);
        }
        localStorage.setItem(deckKey(deck.id), JSON.stringify(deck));
    }

    async delete(id: string): Promise<void> {
        const ids = readIndex().filter((d) => d !== id);
        writeIndex(ids);
        localStorage.removeItem(deckKey(id));
    }

    async recordWordResult(deckId: string, wordId: string, correct: boolean): Promise<void> {
        const deck = await this.get(deckId);
        if (!deck) return;

        let changed = false;
        for (const word of deck.words) {
            if (word.id !== wordId) continue;
            word.stats.timesSeen++;
            if (correct) {
                word.stats.timesCorrect++;
                word.stats.weight = Math.max(1, word.stats.weight * 0.8);
            } else {
                word.stats.weight = 3;
            }
            word.stats.lastSeenAt = Date.now();
            changed = true;
            break;
        }

        if (changed) {
            deck.updatedAt = Date.now();
            await this.save(deck);
        }
    }
}