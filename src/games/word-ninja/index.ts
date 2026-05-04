import Phaser from 'phaser';
import type { MiniGame } from '../../core/game/MiniGame';
import { WordNinjaScene } from './WordNinjaScene';

export const wordNinja: MiniGame = {
    meta: {
        id: 'word-ninja',
        name: 'Word Ninja',
        description: 'Slash the correct Korean word; avoid the rest.',
        iconAssetKey: 'word-ninja-icon',
        tier: 'free',
        sceneKey: 'word-ninja',
    },
    getSceneClass(): typeof Phaser.Scene {
        return WordNinjaScene;
    },
};
