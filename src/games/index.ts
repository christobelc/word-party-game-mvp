import type { MiniGame } from '../core/game/MiniGame';
import { registerGames } from '../core/game/GameRegistry';
import { wordWhack } from './word-whack';
import { wordSnake } from './word-snake';
import { wordDino } from './word-dino';
import { wordBird } from './word-bird';
import { wordNinja } from './word-ninja';

export const ALL_GAMES: MiniGame[] = [wordWhack, wordSnake, wordDino, wordBird, wordNinja];

registerGames(ALL_GAMES);
