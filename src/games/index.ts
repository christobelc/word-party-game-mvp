import type { MiniGame } from '../core/game/MiniGame';
import { registerGames } from '../core/game/GameRegistry';
import { wordWhack } from './word-whack';
import { wordSnake } from './word-snake';
import { wordDino } from './word-dino';

export const ALL_GAMES: MiniGame[] = [wordWhack, wordSnake, wordDino];

registerGames(ALL_GAMES);
