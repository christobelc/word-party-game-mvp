import Phaser from 'phaser';
import type { GameContext } from '../../core/game/GameContext';
import type { WordPair } from '../../core/deck/Deck';
import { feedbackTweens } from '../shared/feedbackTweens';
import { wordLabel, type WordLabelHandle } from '../shared/wordLabel';
import { tuning } from './tuning';

interface FruitData {
    circle: Phaser.GameObjects.Arc;
    label: WordLabelHandle;
    wordId: string;
    isCorrect: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    slashed: boolean;
}

export class WordNinjaScene extends Phaser.Scene {
    private context!: GameContext;
    private onEnd!: () => void;

    private promptText!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;
    private timerUpdater: Phaser.Time.TimerEvent | null = null;

    private fruits: FruitData[] = [];
    private spawnTimers: Phaser.Time.TimerEvent[] = [];
    private roundActive: boolean = false;

    private currentInitialVyPx: number = tuning.fruitInitialVyPx;
    private currentSpawnIntervalMs: number = tuning.wordFruitSpawnIntervalMs;

    private pointerActive: boolean = false;
    private prevPointerX: number = 0;
    private prevPointerY: number = 0;

    private trailPoints: { x: number; y: number }[] = [];
    private trailGraphics!: Phaser.GameObjects.Graphics;

    constructor() {
        super({ key: 'word-ninja' });
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
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5, 0.5);

        // 5. Render timer text + timer updater (Step 11.8a pattern)
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

        // 6. Reset speed
        this.currentInitialVyPx = tuning.fruitInitialVyPx;
        this.currentSpawnIntervalMs = tuning.wordFruitSpawnIntervalMs;

        // 7. Create trail graphics
        this.trailGraphics = this.add.graphics();

        // 8. Wire pointer input
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.pointerActive = true;
            this.prevPointerX = pointer.x;
            this.prevPointerY = pointer.y;
            this.trailPoints = [{ x: pointer.x, y: pointer.y }];
        });
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!this.pointerActive) return;
            this.handleSwipeSegment(this.prevPointerX, this.prevPointerY, pointer.x, pointer.y);
            this.prevPointerX = pointer.x;
            this.prevPointerY = pointer.y;
            this.trailPoints.push({ x: pointer.x, y: pointer.y });
            if (this.trailPoints.length > tuning.slashTrailMaxPoints) {
                this.trailPoints.shift();
            }
        });
        this.input.on('pointerup', () => {
            this.pointerActive = false;
            this.trailPoints = [];
        });

        // 9. Start round
        this.startRound();

        // 10. Register shutdown
        this.events.once('shutdown', () => {
            this.fruits.forEach((f) => {
                f.label.destroy();
                f.circle.destroy();
            });
            this.fruits = [];
            this.spawnTimers.forEach((t) => t.remove(false));
            this.spawnTimers = [];
            if (this.timerUpdater) {
                this.timerUpdater.remove(false);
                this.timerUpdater = null;
            }
            if (this.trailGraphics) {
                this.trailGraphics.destroy();
            }
        });
    }

    update(_time: number, delta: number): void {
        const dt = delta / 1000;

        // Apply physics to fruits
        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const f = this.fruits[i];
            f.vy += tuning.gravityPxPerSecSquared * dt;
            f.x += f.vx * dt;
            f.y += f.vy * dt;
            f.circle.setPosition(f.x, f.y);
            f.label.setPosition(f.x, f.y);

            // Off-screen check
            const offBottom = f.y > tuning.canvasHeight + 2 * tuning.fruitRadiusPx;
            const offSide = f.x < -tuning.fruitRadiusPx || f.x > tuning.canvasWidth + tuning.fruitRadiusPx;
            if (offBottom || offSide) {
                const wasCorrect = f.isCorrect && !f.slashed;
                f.label.destroy();
                f.circle.destroy();
                this.fruits.splice(i, 1);
                if (wasCorrect && this.roundActive) {
                    this.context.session.recordWrong(f.wordId);
                    this.endRound();
                }
            }
        }

        // Redraw trail
        this.trailGraphics.clear();
        if (this.trailPoints.length >= 2) {
            for (let i = 1; i < this.trailPoints.length; i++) {
                const alpha = i / this.trailPoints.length;
                this.trailGraphics.lineStyle(tuning.slashTrailWidthPx, tuning.slashTrailColor, alpha);
                this.trailGraphics.lineBetween(
                    this.trailPoints[i - 1].x,
                    this.trailPoints[i - 1].y,
                    this.trailPoints[i].x,
                    this.trailPoints[i].y
                );
            }
        }
    }

    private handleSwipeSegment(x1: number, y1: number, x2: number, y2: number): void {
        if (!this.roundActive) return;

        for (const f of this.fruits) {
            if (f.slashed) continue;
            if (this.lineCircleIntersect(x1, y1, x2, y2, f.x, f.y, tuning.fruitRadiusPx)) {
                f.slashed = true;
                this.handleFruitSlashed(f);
                return; // one slash per swipe segment to keep behavior predictable
            }
        }
    }

    private lineCircleIntersect(
        x1: number, y1: number,
        x2: number, y2: number,
        cx: number, cy: number,
        r: number
    ): boolean {
        // Closest point on segment (x1,y1)-(x2,y2) to circle center (cx,cy)
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) {
            // segment is a point
            const ddx = cx - x1;
            const ddy = cy - y1;
            return ddx * ddx + ddy * ddy <= r * r;
        }
        let t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const px = x1 + t * dx;
        const py = y1 + t * dy;
        const ddx = cx - px;
        const ddy = cy - py;
        return ddx * ddx + ddy * ddy <= r * r;
    }

    private handleFruitSlashed(f: FruitData): void {
        if (f.isCorrect) {
            this.context.session.recordCorrect(f.wordId);
            this.spawnFloatingText(f.x, f.y, '+1');
            feedbackTweens.squashStretch(this, f.circle as unknown as Phaser.GameObjects.Sprite);
            this.applySpeedRamp();
        } else {
            this.context.session.recordWrong(f.wordId);
            feedbackTweens.shake(this);
        }
        this.endRound();
    }

    private applySpeedRamp(): void {
        this.currentInitialVyPx = Math.min(
            tuning.maxFruitInitialVyPx,
            this.currentInitialVyPx * (1 + tuning.speedRampFracPerCorrect)
        );
        this.currentSpawnIntervalMs = Math.max(
            tuning.minSpawnIntervalMs,
            this.currentSpawnIntervalMs * (1 - tuning.speedRampFracPerCorrect)
        );
    }

    private startRound(): void {
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

        // Build shuffled fruit order
        const lineup: { word: WordPair; isCorrect: boolean }[] = [
            { word: correct, isCorrect: true },
            ...decoys.map((d) => ({ word: d, isCorrect: false })),
        ];
        for (let i = lineup.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [lineup[i], lineup[j]] = [lineup[j], lineup[i]];
        }

        this.roundActive = true;

        // Schedule each fruit launch
        for (let i = 0; i < lineup.length; i++) {
            const delay = i * this.currentSpawnIntervalMs;
            const entry = lineup[i];
            const timer = this.time.delayedCall(delay, () => {
                if (!this.roundActive) return;
                this.spawnFruit(entry.word, entry.isCorrect);
            });
            this.spawnTimers.push(timer);
        }
    }

    private spawnFruit(word: WordPair, isCorrect: boolean): void {
        const x = tuning.spawnXMarginPx + Math.random() * (tuning.canvasWidth - 2 * tuning.spawnXMarginPx);
        const y = tuning.canvasHeight + tuning.fruitSpawnYOffsetPx;
        const vy = -this.currentInitialVyPx;
        const vx = (Math.random() * 2 - 1) * tuning.fruitMaxHorizVyPx;

        const colorIdx = Math.floor(Math.random() * tuning.fruitColors.length);
        const color = tuning.fruitColors[colorIdx];

        const circle = this.add.circle(x, y, tuning.fruitRadiusPx, color);
        const label = wordLabel(this, x, y, word.answer);

        this.fruits.push({
            circle,
            label,
            wordId: word.id,
            isCorrect,
            x, y, vx, vy,
            slashed: false,
        });
    }

    private endRound(): void {
        if (!this.roundActive) return;
        this.roundActive = false;

        // Clear pending spawns
        this.spawnTimers.forEach((t) => t.remove(false));
        this.spawnTimers = [];

        // Despawn all fruits
        this.fruits.forEach((f) => {
            f.label.destroy();
            f.circle.destroy();
        });
        this.fruits = [];

        // Schedule next round
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
