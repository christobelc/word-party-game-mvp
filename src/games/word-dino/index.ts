import Phaser from 'phaser';
import type { MiniGame } from '../../core/game/MiniGame';
import { WordDinoScene } from './WordDinoScene';

export const wordDino: MiniGame = {
    meta: {
        id: 'word-dino',
        name: 'Word Dino',
        description: 'Eat the correct Korean word; jump over the wrong ones.',
        iconAssetKey: 'word-dino-icon',
        tier: 'free',
        sceneKey: 'word-dino',
    },
    getSceneClass(): typeof Phaser.Scene {
        return WordDinoScene;
    },
};
