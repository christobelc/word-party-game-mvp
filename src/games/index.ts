import type { MiniGame } from '../core/game/MiniGame';
import { registerGames } from '../core/game/GameRegistry';
import { wordWhack } from './word-whack';
import { wordSnake } from './word-snake';
import { wordDino } from './word-dino';
import { wordBird } from './word-bird';

export const ALL_GAMES: MiniGame[] = [wordWhack, wordSnake, wordDino, wordBird];

registerGames(ALL_GAMES);
