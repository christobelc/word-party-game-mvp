import Phaser from 'phaser';

export interface MiniGameMeta {
    id: string;
    name: string;
    description: string;
    iconAssetKey: string;
    tier: 'free' | 'pro';
    sceneKey: string;
}

export interface MiniGame {
    meta: MiniGameMeta;
    getSceneClass(): typeof Phaser.Scene;
}