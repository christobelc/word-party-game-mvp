import Phaser from 'phaser';
import type { MiniGame } from '../../core/game/MiniGame';
import { TemplateScene } from './TemplateScene';

export const templateGame: MiniGame = {
    meta: {
        id: 'template',
        name: 'Template Game',
        description: 'Copy this folder to create a new game (games 5–8).',
        iconAssetKey: 'template-icon',
        tier: 'free',
        sceneKey: 'template',
    },
    getSceneClass(): typeof Phaser.Scene {
        return TemplateScene;
    },
};