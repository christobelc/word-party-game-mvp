import React, { useRef, useEffect, useCallback } from 'react';
import Phaser from 'phaser';
import type { MiniGame } from '../../core/game/MiniGame';
import type { GameContext } from '../../core/game/GameContext';
import type { SessionResult } from '../../core/game/GameSession';

interface Props {
    game: MiniGame;
    context: GameContext;
    onEnd: (results: SessionResult[]) => void;
}

export function PhaserGame({ game, context, onEnd }: Props): React.ReactElement {
    const containerRef = useRef<HTMLDivElement>(null);
    const phaserRef = useRef<Phaser.Game | null>(null);

    const endHandler = useCallback(() => {
        onEnd(context.session.results);
    }, [context.session.results, onEnd]);

    useEffect(() => {
        if (!containerRef.current) return;

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: containerRef.current,
            width: 360,
            height: 640,
            pixelArt: true,
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 0 },
                },
            },
            dom: {
                createContainer: true,
            },
        };

        const phaserGame = new Phaser.Game(config);
        phaserRef.current = phaserGame;

        // Register the scene and start it with context
        const SceneClass = game.getSceneClass();
        phaserGame.scene.add(game.meta.sceneKey, SceneClass, false);
        phaserGame.scene.start(game.meta.sceneKey, { context, onEnd: endHandler });

        return () => {
            phaserGame.destroy(true);
            phaserRef.current = null;
        };
    }, [game, context, endHandler]);

    return (
        <div className="flex items-center justify-center min-h-screen w-full bg-gray-900">
            <div
                ref={containerRef}
                className="phaser-container"
                style={{ width: 360, height: 640, maxWidth: '100vw', maxHeight: '100vh' }}
            />
        </div>
    );
}