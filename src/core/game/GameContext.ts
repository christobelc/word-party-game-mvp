import type { Deck } from '../deck/Deck';
import type { WordSelectionStrategy } from '../selection/WordSelectionStrategy';
import type { WordPair } from '../deck/Deck';
import { GameSession } from './GameSession';

export interface GameContext {
    deck: Deck;
    session: GameSession;
    selection: WordSelectionStrategy;
    pickDecoys(correct: WordPair, n: number): WordPair[];
}