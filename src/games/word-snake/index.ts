import Phaser from 'phaser';
import type { MiniGame } from '../../core/game/MiniGame';
import { WordSnakeScene } from './WordSnakeScene';

export const wordSnake: MiniGame = {
    meta: {
        id: 'word-snake',
        name: 'Word Snake',
        description: 'Steer the snake to eat the correct Korean word.',
        iconAssetKey: 'word-snake-icon',
        tier: 'free',
        sceneKey: 'word-snake',
    },
    getSceneClass(): typeof Phaser.Scene {
        return WordSnakeScene;
    },
};
