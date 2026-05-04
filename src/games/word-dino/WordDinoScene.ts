import Phaser from 'phaser';
import type { GameContext } from '../../core/game/GameContext';
import type { WordPair } from '../../core/deck/Deck';
import { feedbackTweens } from '../shared/feedbackTweens';
import { wordLabel, type WordLabelHandle } from '../shared/wordLabel';
import { tuning } from './tuning';

interface ObstacleData {
    rect: Phaser.GameObjects.Rectangle;
    label: WordLabelHandle;
    wordId: string;
    isCorrect: boolean;
    passedCorrect: boolean;     // for jump-over-correct guard
}

export class WordDinoScene extends Phaser.Scene {
    private context!: GameContext;
    private onEnd!: () => void;

    private promptText!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;
    private timerUpdater: Phaser.Time.TimerEvent | null = null;

    private dinoRect!: Phaser.GameObjects.Rectangle;
    private dinoVy: number = 0;
    private dinoY: number = tuning.groundYPx;

    private obstacles: ObstacleData[] = [];
    private spawnQueue: { word: WordPair; isCorrect: boolean }[] = [];
    private spawnTimer: Phaser.Time.TimerEvent | null = null;

    private currentCorrectWord: WordPair | null = null;
    private currentScrollSpeed: number = tuning.baseScrollSpeedPx;
    private currentSpawnIntervalMs: number = tuning.baseSpawnIntervalMs;
    private obstaclesSpawnedThisRound: number = 0;
    private roundActive: boolean = false;

    constructor() {
        super({ key: 'word-dino' });
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

        // 4. Render English prompt text
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

        // 5. Render timer text (Step 11.8a pattern)
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

        // 6. Draw ground line
        this.add.rectangle(
            tuning.canvasWidth / 2,
            tuning.groundYPx + 1,
            tuning.canvasWidth,
            2,
            0x1f2937
        );

        // 7. Create dino rect
        this.dinoRect = this.add.rectangle(
            tuning.dinoXPx,
            tuning.groundYPx - tuning.dinoHeightPx / 2,
            tuning.dinoWidthPx,
            tuning.dinoHeightPx,
            tuning.dinoColor
        );

        // 8. Reset speed
        this.currentScrollSpeed = tuning.baseScrollSpeedPx;
        this.currentSpawnIntervalMs = tuning.baseSpawnIntervalMs;

        // 9. Wire input
        this.input.keyboard?.on('keydown-SPACE', () => this.tryJump());
        this.input.on('pointerdown', () => this.tryJump());

        // 10. Start the round
        this.startRound();

        // 11. Register shutdown
        this.events.once('shutdown', () => {
            this.obstacles.forEach((o) => {
                o.label.destroy();
                o.rect.destroy();
            });
            this.obstacles = [];
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
        if (!this.roundActive) {
            // Still update dino physics so a mid-air dino lands during interRound.
            this.updateDinoPhysics(delta);
            return;
        }

        this.updateDinoPhysics(delta);
        this.updateObstacles(delta);
        this.checkCollisions();
    }

    private updateDinoPhysics(delta: number): void {
        const dt = delta / 1000;
        if (this.dinoY < tuning.groundYPx || this.dinoVy < 0) {
            this.dinoVy += tuning.gravityPxPerSecSquared * dt;
            this.dinoY += this.dinoVy * dt;
            if (this.dinoY >= tuning.groundYPx) {
                this.dinoY = tuning.groundYPx;
                this.dinoVy = 0;
            }
        }
        this.dinoRect.y = this.dinoY - tuning.dinoHeightPx / 2;
    }

    private isGrounded(): boolean {
        return this.dinoY >= tuning.groundYPx && this.dinoVy === 0;
    }

    private tryJump(): void {
        if (!this.roundActive) return;
        if (!this.isGrounded()) return;
        this.dinoVy = -tuning.jumpVelocityPx;
    }

    private updateObstacles(delta: number): void {
        const dt = delta / 1000;
        const dx = -this.currentScrollSpeed * dt;
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const o = this.obstacles[i];
            o.rect.x += dx;
            o.label.setPosition(o.rect.x, o.rect.y);
            if (o.rect.x < -tuning.obstacleWidthPx) {
                o.label.destroy();
                o.rect.destroy();
                this.obstacles.splice(i, 1);
            }
        }
    }

    private checkCollisions(): void {
        const dinoLeft = this.dinoRect.x - tuning.dinoWidthPx / 2;
        const dinoRight = this.dinoRect.x + tuning.dinoWidthPx / 2;
        const dinoBottom = this.dinoRect.y + tuning.dinoHeightPx / 2;
        const dinoTop = this.dinoRect.y - tuning.dinoHeightPx / 2;

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const o = this.obstacles[i];
            const oLeft = o.rect.x - tuning.obstacleWidthPx / 2;
            const oRight = o.rect.x + tuning.obstacleWidthPx / 2;
            const oTop = o.rect.y - tuning.obstacleHeightPx / 2;
            const oBottom = o.rect.y + tuning.obstacleHeightPx / 2;

            const overlapping = dinoRight > oLeft && dinoLeft < oRight &&
                                dinoBottom > oTop && dinoTop < oBottom;

            if (overlapping) {
                this.handleObstacleHit(o, i);
            } else if (o.isCorrect && !o.passedCorrect && o.rect.x < dinoLeft) {
                // Correct passed under an airborne dino → mark as passedCorrect, reinject.
                o.passedCorrect = true;
                this.reinjectCorrectIntoQueue();
            }
        }
    }

    private handleObstacleHit(o: ObstacleData, index: number): void {
        if (o.isCorrect) {
            if (this.isGrounded()) {
                // EAT — round ends
                this.context.session.recordCorrect(o.wordId);
                this.spawnFloatingText(o.rect.x, o.rect.y, '+1');
                feedbackTweens.squashStretch(this, o.rect as unknown as Phaser.GameObjects.Sprite);
                this.applySpeedRamp();
                this.endRound();
            }
            // else: airborne over correct — handled in checkCollisions (passedCorrect path)
            return;
        }

        // wrong obstacle hit while grounded → stumble, record wrong
        if (this.isGrounded()) {
            this.context.session.recordWrong(o.wordId);
            feedbackTweens.shake(this);
            this.tweens.add({
                targets: this.dinoRect,
                scaleY: tuning.stumbleSquishYScale,
                duration: tuning.stumbleDurationMs,
                yoyo: true,
                ease: 'Power2',
            });
            o.label.destroy();
            o.rect.destroy();
            this.obstacles.splice(index, 1);
        }
        // else: airborne over wrong = safe dodge, do nothing
    }

    private applySpeedRamp(): void {
        this.currentScrollSpeed = Math.min(
            tuning.maxScrollSpeedPx,
            this.currentScrollSpeed * (1 + tuning.speedRampFracPerCorrect)
        );
        this.currentSpawnIntervalMs = Math.max(
            tuning.minSpawnIntervalMs,
            this.currentSpawnIntervalMs * (1 - tuning.spawnIntervalRampFracPerCorrect)
        );
        // No timer reschedule needed — next gap is recomputed in scheduleNextSpawn().
    }

    private scheduleNextSpawn(): void {
        if (!this.roundActive) return;
        const frac = tuning.minSpawnGapFrac + Math.random() * (tuning.maxSpawnGapFrac - tuning.minSpawnGapFrac);
        const delay = this.currentSpawnIntervalMs * frac;
        this.spawnTimer = this.time.delayedCall(delay, () => {
            this.trySpawnNext();
            this.scheduleNextSpawn();
        });
    }

    private startRound(): void {
        const [correct] = this.context.selection.pick(this.context.deck, 1);
        if (!correct) {
            this.onEnd();
            return;
        }
        this.currentCorrectWord = correct;
        this.promptText.setText(correct.prompt);
        this.obstaclesSpawnedThisRound = 0;
        this.spawnQueue = [];
        this.refillQueue();
        this.roundActive = true;

        // Spawn one immediately so first obstacle isn't delayed by full interval
        this.trySpawnNext();
        this.scheduleNextSpawn();
    }

    private refillQueue(): void {
        if (!this.currentCorrectWord) return;
        const decoys = this.context.pickDecoys(this.currentCorrectWord, tuning.decoysPerInitialQueue);
        const batch: { word: WordPair; isCorrect: boolean }[] = [
            { word: this.currentCorrectWord, isCorrect: true },
            ...decoys.map((d) => ({ word: d, isCorrect: false })),
        ];
        // Shuffle
        for (let i = batch.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [batch[i], batch[j]] = [batch[j], batch[i]];
        }
        this.spawnQueue.push(...batch);
    }

    private trySpawnNext(): void {
        if (!this.roundActive) return;
        if (this.spawnQueue.length < 2) {
            this.refillQueue();
        }
        const next = this.spawnQueue.shift();
        if (!next) return;
        this.spawnObstacle(next.word, next.isCorrect);

        this.obstaclesSpawnedThisRound++;
        if (this.obstaclesSpawnedThisRound >= tuning.maxObstaclesPerRound && this.currentCorrectWord) {
            this.context.session.recordWrong(this.currentCorrectWord.id);
            this.endRound();
        }
    }

    private spawnObstacle(word: WordPair, isCorrect: boolean): void {
        const x = tuning.canvasWidth + tuning.obstacleSpawnXOffsetPx;
        const y = tuning.groundYPx - tuning.obstacleHeightPx / 2;
        const rect = this.add.rectangle(x, y, tuning.obstacleWidthPx, tuning.obstacleHeightPx, tuning.obstacleColor);
        const label = wordLabel(this, x, y, word.answer);
        this.obstacles.push({
            rect,
            label,
            wordId: word.id,
            isCorrect,
            passedCorrect: false,
        });
    }

    private reinjectCorrectIntoQueue(): void {
        if (!this.currentCorrectWord) return;
        const minSlot = tuning.respawnWindowMin;
        const maxSlot = Math.min(tuning.respawnWindowMax, this.spawnQueue.length);
        const insertIdx = Math.max(0, minSlot + Math.floor(Math.random() * Math.max(1, maxSlot - minSlot + 1)));
        this.spawnQueue.splice(insertIdx, 0, { word: this.currentCorrectWord, isCorrect: true });
    }

    private endRound(): void {
        if (!this.roundActive) return;
        this.roundActive = false;
        if (this.spawnTimer) {
            this.spawnTimer.remove(false);
            this.spawnTimer = null;
        }
        this.obstacles.forEach((o) => {
            o.label.destroy();
            o.rect.destroy();
        });
        this.obstacles = [];
        this.spawnQueue = [];
        this.currentCorrectWord = null;
        this.time.delayedCall(tuning.interRoundMs, () => this.startRound());
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
