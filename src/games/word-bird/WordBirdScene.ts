import Phaser from 'phaser';
import type { GameContext } from '../../core/game/GameContext';
import type { WordPair } from '../../core/deck/Deck';
import { feedbackTweens } from '../shared/feedbackTweens';
import { wordLabel, type WordLabelHandle } from '../shared/wordLabel';
import { tuning } from './tuning';

interface FruitData {
    circle: Phaser.GameObjects.Arc;       // Phaser circle = Arc with full angle
    label: WordLabelHandle;
    wordId: string;
    isCorrect: boolean;
    relativeY: number;                    // y-position relative to column root
}

interface FruitColumn {
    rootX: number;                        // single x-coordinate; column moves as a unit
    fruits: FruitData[];
    correctRelativeY: number;             // y of the correct fruit, used when revealing pipe
    revealed: boolean;                    // true once a fruit has been hit and pipe is showing
}

interface PipeData {
    topRect: Phaser.GameObjects.Rectangle;
    bottomRect: Phaser.GameObjects.Rectangle;
    x: number;
}

export class WordBirdScene extends Phaser.Scene {
    private context!: GameContext;
    private onEnd!: () => void;

    private promptText!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;
    private timerUpdater: Phaser.Time.TimerEvent | null = null;

    private bird!: Phaser.GameObjects.Arc;
    private birdVy: number = 0;

    private currentColumn: FruitColumn | null = null;
    private currentPipe: PipeData | null = null;
    private currentScrollSpeed: number = tuning.baseScrollSpeedPx;
    private gameOver: boolean = false;

    private spawnTimer: Phaser.Time.TimerEvent | null = null;

    constructor() {
        super({ key: 'word-bird' });
    }

    init(data: { context: GameContext; onEnd: () => void }): void {
        this.context = data.context;
        this.onEnd = data.onEnd;
    }

    create(): void {
        // 1. Start session
        this.context.session.start();

        // 2. Subscribe to session end
        this.context.session.addEventListener('end', () => this.onEnd());

        // 3. Background
        this.cameras.main.setBackgroundColor(tuning.bgColor);

        // 4. Render prompt text
        this.promptText = this.add.text(
            tuning.canvasWidth / 2,
            tuning.promptYPx,
            '',
            {
                fontFamily: 'Arial',
                fontSize: `${tuning.promptFontPx}px`,
                color: '#1f2937',
                align: 'center'
            }
        ).setOrigin(0.5, 0.5);

        // 5. Render timer text + start timer updater (Step 11.8a pattern)
        this.timerText = this.add.text(
            tuning.canvasWidth * (1 - tuning.timerXFracFromRight),
            tuning.timerYPx,
            '',
            {
                fontFamily: 'Arial',
                fontSize: `${tuning.timerFontPx}px`,
                color: tuning.timerColor,
                fontStyle: 'bold',
            }
        ).setOrigin(1, 0.5);

        this.updateTimerText();
        this.timerUpdater = this.time.addEvent({
            delay: tuning.timerUpdateMs,
            loop: true,
            callback: () => this.updateTimerText(),
        });

        // 6. Draw ceiling and floor lines
        this.add.rectangle(tuning.canvasWidth / 2, tuning.ceilingYPx, tuning.canvasWidth, 2, 0x1f2937);
        this.add.rectangle(tuning.canvasWidth / 2, tuning.floorYPx, tuning.canvasWidth, 2, 0x1f2937);

        // 7. Create bird
        this.bird = this.add.circle(
            tuning.birdXPx,
            (tuning.ceilingYPx + tuning.floorYPx) / 2,
            tuning.birdRadiusPx,
            tuning.birdColor
        );

        // 8. Reset speed
        this.currentScrollSpeed = tuning.baseScrollSpeedPx;

        // 9. Wire input
        this.input.keyboard?.on('keydown-SPACE', () => this.flap());
        this.input.on('pointerdown', () => this.flap());

        // 10. Start first round
        this.startRound();

        // 11. Register shutdown
        this.events.once('shutdown', () => {
            this.destroyCurrentColumn();
            this.destroyCurrentPipe();
            if (this.spawnTimer) {
                this.spawnTimer.remove(false);
                this.spawnTimer = null;
            }
            if (this.timerUpdater) {
                this.timerUpdater.remove(false);
                this.timerUpdater = null;
            }
        });
    }

    update(_time: number, delta: number): void {
        if (this.gameOver) return;

        const dt = delta / 1000;

        // Bird physics
        this.birdVy += tuning.gravityPxPerSecSquared * dt;
        this.bird.y += this.birdVy * dt;

        // Floor/ceiling collisions → game over
        if (this.bird.y - tuning.birdRadiusPx <= tuning.ceilingYPx ||
            this.bird.y + tuning.birdRadiusPx >= tuning.floorYPx) {
            this.gameOver = true;
            this.context.session.end();
            return;
        }

        // Scroll the column if active and not yet revealed
        if (this.currentColumn && !this.currentColumn.revealed) {
            this.currentColumn.rootX -= this.currentScrollSpeed * dt;
            this.repositionColumn();
            this.checkFruitCollisions();
        }

        // Scroll the pipe if active
        if (this.currentPipe) {
            this.currentPipe.x -= this.currentScrollSpeed * dt;
            this.currentPipe.topRect.x = this.currentPipe.x;
            this.currentPipe.bottomRect.x = this.currentPipe.x;
            if (this.currentPipe.x < -tuning.pipeWidthPx) {
                this.destroyCurrentPipe();
            }
        }
    }

    private flap(): void {
        if (this.gameOver) return;
        this.birdVy = -tuning.flapImpulsePx;
    }

    private startRound(): void {
        if (this.gameOver) return;

        const [correct] = this.context.selection.pick(this.context.deck, 1);
        if (!correct) {
            this.onEnd();
            return;
        }
        this.promptText.setText(correct.prompt);

        const decoys = this.context.pickDecoys(correct, tuning.decoysPerRound);
        if (decoys.length < tuning.decoysPerRound) {
            this.onEnd();
            return;
        }

        // Schedule column spawn after pre-column idle
        this.spawnTimer = this.time.delayedCall(tuning.preColumnIdleMs, () => {
            this.spawnColumn(correct, decoys);
        });
    }

    private spawnColumn(correct: WordPair, decoys: WordPair[]): void {
        if (this.gameOver) return;

        const playHeight = tuning.floorYPx - tuning.ceilingYPx;
        const fruitDiameter = playHeight / tuning.fruitsPerColumn;
        const fruitRadius = fruitDiameter / 2;

        // Build words array: 1 correct + N decoys, shuffled
        const words: { word: WordPair; isCorrect: boolean }[] = [
            { word: correct, isCorrect: true },
            ...decoys.map((d) => ({ word: d, isCorrect: false })),
        ];
        for (let i = words.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [words[i], words[j]] = [words[j], words[i]];
        }

        const rootX = tuning.canvasWidth + tuning.columnSpawnXOffsetPx;
        const fruits: FruitData[] = [];
        let correctRelativeY = 0;

        for (let i = 0; i < tuning.fruitsPerColumn; i++) {
            const relativeY = tuning.ceilingYPx + fruitRadius + i * fruitDiameter;
            const color = tuning.fruitColors[i % tuning.fruitColors.length];
            const circle = this.add.circle(rootX, relativeY, fruitRadius, color);
            const label = wordLabel(this, rootX, relativeY, words[i].word.answer);
            const fruit: FruitData = {
                circle,
                label,
                wordId: words[i].word.id,
                isCorrect: words[i].isCorrect,
                relativeY,
            };
            if (words[i].isCorrect) correctRelativeY = relativeY;
            fruits.push(fruit);
        }

        this.currentColumn = {
            rootX,
            fruits,
            correctRelativeY,
            revealed: false,
        };
    }

    private repositionColumn(): void {
        if (!this.currentColumn) return;
        for (const fruit of this.currentColumn.fruits) {
            fruit.circle.x = this.currentColumn.rootX;
            fruit.label.setPosition(this.currentColumn.rootX, fruit.relativeY);
        }
    }

    private checkFruitCollisions(): void {
        if (!this.currentColumn || this.currentColumn.revealed) return;

        const playHeight = tuning.floorYPx - tuning.ceilingYPx;
        const fruitRadius = playHeight / tuning.fruitsPerColumn / 2;

        for (const fruit of this.currentColumn.fruits) {
            const dx = this.bird.x - fruit.circle.x;
            const dy = this.bird.y - fruit.circle.y;
            const distSq = dx * dx + dy * dy;
            const effectiveRadius = fruit.isCorrect
                ? fruitRadius * tuning.correctHitboxMultiplier
                : fruitRadius;
            const collisionRadius = effectiveRadius + tuning.birdRadiusPx;
            if (distSq <= collisionRadius * collisionRadius) {
                this.handleFruitHit(fruit);
                return;
            }
        }
    }

    private handleFruitHit(fruit: FruitData): void {
        if (!this.currentColumn) return;

        if (fruit.isCorrect) {
            this.context.session.recordCorrect(fruit.wordId);
            this.spawnFloatingText(fruit.circle.x, fruit.circle.y, '+1');
            feedbackTweens.squashStretch(this, fruit.circle as unknown as Phaser.GameObjects.Sprite);
            this.applySpeedRamp();
        } else {
            this.context.session.recordWrong(fruit.wordId);
            feedbackTweens.shake(this);
        }

        // Reveal pipe at correct fruit's y
        this.revealPipe(this.currentColumn.rootX, this.currentColumn.correctRelativeY);

        // Destroy all fruit visuals
        this.destroyCurrentColumn();

        // Schedule next round
        this.time.delayedCall(tuning.interRoundMs, () => this.startRound());
    }

    private revealPipe(x: number, gapCenterY: number): void {
        const halfGap = tuning.gapHeightPx / 2;
        const gapTop = gapCenterY - halfGap;
        const gapBottom = gapCenterY + halfGap;

        const topHeight = gapTop - tuning.ceilingYPx;
        const bottomHeight = tuning.floorYPx - gapBottom;

        const topRect = this.add.rectangle(
            x,
            tuning.ceilingYPx + topHeight / 2,
            tuning.pipeWidthPx,
            topHeight,
            tuning.pipeColor
        );
        const bottomRect = this.add.rectangle(
            x,
            gapBottom + bottomHeight / 2,
            tuning.pipeWidthPx,
            bottomHeight,
            tuning.pipeColor
        );

        this.currentPipe = { topRect, bottomRect, x };
    }

    private destroyCurrentColumn(): void {
        if (!this.currentColumn) return;
        for (const f of this.currentColumn.fruits) {
            f.label.destroy();
            f.circle.destroy();
        }
        this.currentColumn = null;
    }

    private destroyCurrentPipe(): void {
        if (!this.currentPipe) return;
        this.currentPipe.topRect.destroy();
        this.currentPipe.bottomRect.destroy();
        this.currentPipe = null;
    }

    private applySpeedRamp(): void {
        this.currentScrollSpeed = Math.min(
            tuning.maxScrollSpeedPx,
            this.currentScrollSpeed * (1 + tuning.speedRampFracPerCorrect)
        );
    }

    private spawnFloatingText(x: number, y: number, text: string): void {
        const floater = this.add.text(x, y, text, {
            fontFamily: 'Arial',
            fontSize: `${tuning.floatTextFontPx}px`,
            color: tuning.floatTextColor,
            fontStyle: 'bold',
        }).setOrigin(0.5, 0.5);

        this.tweens.add({
            targets: floater,
            y: y - tuning.floatTextRisePx,
            alpha: 0,
            duration: tuning.floatTextDurationMs,
            ease: 'Power1',
            onComplete: () => floater.destroy(),
        });
    }

    private updateTimerText(): void {
        const remainingMs = Math.max(0, this.context.session.getRemainingMs());
        const totalSeconds = Math.ceil(remainingMs / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        this.timerText.setText(`${m}:${s.toString().padStart(2, '0')}`);
    }
}
