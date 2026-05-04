import Phaser from 'phaser';
import type { MiniGame } from '../../core/game/MiniGame';
import { WordBirdScene } from './WordBirdScene';

export const wordBird: MiniGame = {
    meta: {
        id: 'word-bird',
        name: 'Word Bird',
        description: 'Fly the bird and eat the correct Korean fruit.',
        iconAssetKey: 'word-bird-icon',
        tier: 'free',
        sceneKey: 'word-bird',
    },
    getSceneClass(): typeof Phaser.Scene {
        return WordBirdScene;
    },
};
