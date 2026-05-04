import Phaser from 'phaser';
import type { GameContext } from '../../core/game/GameContext';

export class TemplateScene extends Phaser.Scene {
    private context!: GameContext;
    private onEnd!: () => void;

    constructor() {
        super({ key: 'template' });
    }

    init(data: { context: GameContext; onEnd: () => void }): void {
        this.context = data.context;
        this.onEnd = data.onEnd;
    }

    create(): void {
        this.context.session.start();

        // Tap to record a correct answer (demo)
        this.input.once('pointerdown', () => {
            const selected = this.context.selection.pick(this.context.deck, 1);
            if (selected.length > 0) {
                this.context.session.recordCorrect(selected[0].id);
            }

            // End game after 5 seconds for demo
            this.time.delayedCall(5000, () => {
                this.context.session.end();
                this.onEnd();
            });
        });
    }
}