import type { Deck, WordPair } from '../deck/Deck';
import type { WordSelectionStrategy } from './WordSelectionStrategy';

export class WeightedStrategy implements WordSelectionStrategy {
    pick(deck: Deck, n: number): WordPair[] {
        const available = [...deck.words];
        const selected: WordPair[] = [];

        while (selected.length < n && available.length > 0) {
            const totalWeight = available.reduce((sum, w) => sum + w.stats.weight, 0);
            let r = Math.random() * totalWeight;

            let chosenIndex = available.length - 1; // fallback to last
            for (let i = 0; i < available.length; i++) {
                r -= available[i].stats.weight;
                if (r <= 0) {
                    chosenIndex = i;
                    break;
                }
            }

            const [chosen] = available.splice(chosenIndex, 1);
            selected.push(chosen);
        }

        return selected;
    }

    recordResult(word: WordPair, correct: boolean): WordPair['stats'] {
        if (correct) {
            word.stats.weight = Math.max(1, word.stats.weight * 0.8);
        } else {
            word.stats.weight = 3;
        }
        return word.stats;
    }
}