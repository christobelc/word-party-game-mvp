import Phaser from 'phaser';
import type { MiniGame } from '../../core/game/MiniGame';
import { WordWhackScene } from './WordWhackScene';

export const wordWhack: MiniGame = {
    meta: {
        id: 'word-whack',
        name: 'Word Whack',
        description: 'Tap the mole showing the correct translation.',
        iconAssetKey: 'word-whack-icon',
        tier: 'free',
        sceneKey: 'word-whack',
    },
    getSceneClass(): typeof Phaser.Scene {
        return WordWhackScene;
    },
};