import Phaser from 'phaser';
import type { GameContext } from '../../core/game/GameContext';
import type { WordPair } from '../../core/deck/Deck';
import { feedbackTweens } from '../shared/feedbackTweens';
import { wordLabel, type WordLabelHandle } from '../shared/wordLabel';
import { tuning, holePositionsFrac } from './tuning';

interface MoleData {
    sprite: Phaser.GameObjects.Sprite;
    label: WordLabelHandle;
    wordId: string;
    isCorrect: boolean;
    retreating: boolean;
    holeIndex: number;
}

export class WordWhackScene extends Phaser.Scene {
    private context!: GameContext;
    private onEnd!: () => void;
    private promptText!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;
    private timerUpdater: Phaser.Time.TimerEvent | null = null;
    private activeMoles: MoleData[] = [];
    private holes: { x: number; y: number }[] = [];
    private currentCorrectWord: WordPair | null = null;
    private waveTimers: Phaser.Time.TimerEvent[] = [];
    private roundEndTimer: Phaser.Time.TimerEvent | null = null;
    private roundActive: boolean = false;

    constructor() {
        super({ key: 'word-whack' });
    }

    init(data: { context: GameContext; onEnd: () => void }): void {
        this.context = data.context;
        this.onEnd = data.onEnd;
    }

    preload(): void {
        // Assets are pre-loaded by PhaserGame component, but we register the key
        // The actual image is a brown circle representing a mole
        const graphics = this.make.graphics({ x: 0, y: 0 });
        graphics.fillStyle(tuning.moleColor, 1);
        graphics.fillCircle(tuning.holeRadius, tuning.holeRadius, tuning.holeRadius);
        graphics.generateTexture('mole', tuning.holeRadius * 2, tuning.holeRadius * 2);
    }

    create(): void {
        // Start session
        this.context.session.start();

        // Subscribe to session end
        this.context.session.addEventListener('end', () => this.onEnd());

        // English prompt at top center
        this.promptText = this.add.text(
            tuning.canvasWidth / 2,
            tuning.promptYPx,
            '',
            { fontFamily: 'Arial', fontSize: `${tuning.promptFontPx}px`, color: '#ffffff', align: 'center' }
        ).setOrigin(0.5, 0.5);

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

        // Build hole positions
        this.holes = this.buildHolePositions();

        // Draw holes as dark ellipses
        this.holes.forEach((pos) => {
            const graphics = this.add.graphics();
            graphics.fillStyle(tuning.holeColor, 1);
            graphics.fillEllipse(pos.x, pos.y, tuning.holeRadius * 2, tuning.holeRadius);
        });

        // Start first round
        this.startRound();

        // Cleanup on shutdown
        this.events.once('shutdown', () => {
            this.activeMoles.forEach((m) => {
                m.label.destroy();
                m.sprite.destroy();
            });
            this.activeMoles = [];
            this.waveTimers.forEach((t) => t.remove(false));
            this.waveTimers = [];
            if (this.roundEndTimer) {
                this.roundEndTimer.remove(false);
                this.roundEndTimer = null;
            }
            if (this.timerUpdater) {
                this.timerUpdater.remove(false);
                this.timerUpdater = null;
            }
        });
    }

    private buildHolePositions(): { x: number; y: number }[] {
        return holePositionsFrac.map(frac => ({
            x: frac.x * tuning.canvasWidth,
            y: frac.y * tuning.canvasHeight
        }));
    }

    private startRound(): void {
        // Pick correct word for the round
        const [correct] = this.context.selection.pick(this.context.deck, 1);
        if (!correct) {
            this.onEnd();
            return;
        }
        this.currentCorrectWord = correct;
        this.promptText.setText(correct.prompt);
        this.roundActive = true;

        // Pre-compute wave schedule
        const waveOffsets: number[] = [0];
        let cursor = 0;
        while (true) {
            const gap = tuning.minWaveGapMs + Math.random() * (tuning.maxWaveGapMs - tuning.minWaveGapMs);
            cursor += gap;
            if (cursor >= tuning.roundDurationMs) break;
            waveOffsets.push(cursor);
        }

        // Pick which wave carries the correct mole
        const correctWaveIdx = Math.floor(Math.random() * waveOffsets.length);

        // Schedule each wave
        waveOffsets.forEach((offset, i) => {
            const isCorrectWave = i === correctWaveIdx;
            const timer = this.time.delayedCall(offset, () => this.fireWave(isCorrectWave));
            this.waveTimers.push(timer);
        });

        // Schedule round-end timeout
        this.roundEndTimer = this.time.delayedCall(tuning.roundDurationMs, () => {
            if (!this.roundActive) return;
            this.context.session.recordWrong(correct.id);
            this.endRound();
        });
    }

    private pickWaveSize(): number {
        const weights = tuning.waveSizeWeights;
        const total = weights.reduce((s, w) => s + w, 0);
        let r = Math.random() * total;
        for (let i = 0; i < weights.length; i++) {
            r -= weights[i];
            if (r <= 0) return i + 1;
        }
        return weights.length;
    }

    private fireWave(includesCorrect: boolean): void {
        if (!this.roundActive) return;

        // Find empty holes
        const occupiedHoleIndices = new Set(this.activeMoles.map((m) => m.holeIndex));
        const emptyHoleIndices: number[] = [];
        for (let i = 0; i < this.holes.length; i++) {
            if (!occupiedHoleIndices.has(i)) emptyHoleIndices.push(i);
        }
        if (emptyHoleIndices.length === 0) return;

        // Determine wave size
        const desiredSize = this.pickWaveSize();
        const waveSize = Math.min(desiredSize, emptyHoleIndices.length);

        if (!this.currentCorrectWord) return;
        const decoys = this.context.pickDecoys(this.currentCorrectWord, tuning.maxDecoysPickedPerWave);

        // Build per-mole word assignment
        const correctSlotInWave = includesCorrect ? Math.floor(Math.random() * waveSize) : -1;
        let decoyIdx = 0;
        const assignments: { word: WordPair; isCorrect: boolean }[] = [];
        for (let i = 0; i < waveSize; i++) {
            if (i === correctSlotInWave) {
                assignments.push({ word: this.currentCorrectWord, isCorrect: true });
            } else {
                const decoy = decoys[decoyIdx++];
                if (!decoy) continue;
                assignments.push({ word: decoy, isCorrect: false });
            }
        }

        // Pick distinct empty holes
        const shuffledHoles = [...emptyHoleIndices];
        for (let i = shuffledHoles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledHoles[i], shuffledHoles[j]] = [shuffledHoles[j], shuffledHoles[i]];
        }
        const chosenHoleIndices = shuffledHoles.slice(0, assignments.length);

        // Spawn each mole
        assignments.forEach((a, i) => {
            const holeIndex = chosenHoleIndices[i];
            const hole = this.holes[holeIndex];
            this.spawnMole(hole, holeIndex, a.word, a.isCorrect);
        });
    }

    private spawnMole(hole: { x: number; y: number }, holeIndex: number, word: WordPair, isCorrect: boolean): void {
        const sprite = this.add.sprite(hole.x, hole.y + tuning.holeRadius, 'mole');
        sprite.setInteractive();
        const label = wordLabel(this, hole.x, hole.y + tuning.holeRadius, word.answer);

        const moleData: MoleData = {
            sprite,
            label,
            wordId: word.id,
            isCorrect,
            retreating: false,
            holeIndex,
        };
        this.activeMoles.push(moleData);

        sprite.on('pointerdown', () => this.onMoleClick(moleData));

        // Rise tween
        const targetY = hole.y - (tuning.holeRadius - 5);
        this.tweens.add({
            targets: sprite,
            y: targetY,
            duration: tuning.moleRiseDurationMs,
            ease: 'Power2',
            onUpdate: () => label.setPosition(sprite.x, sprite.y),
            onComplete: () => {
                this.time.delayedCall(tuning.moleVisibleMs, () => {
                    if (!moleData.retreating) {
                        this.retreatMole(moleData);
                    }
                });
            },
        });
    }

    private onMoleClick(mole: MoleData): void {
        if (mole.retreating || !this.roundActive) return;

        if (mole.isCorrect) {
            this.context.session.recordCorrect(mole.wordId);
            feedbackTweens.squashStretch(this, mole.sprite);
            this.spawnFloatingText(mole.sprite.x, mole.sprite.y, '+1');
            this.endRound();
        } else {
            this.context.session.recordWrong(mole.wordId);
            feedbackTweens.shake(this);
            this.retreatMole(mole);
        }
    }

    private retreatMole(mole: MoleData): void {
        if (mole.retreating) return;
        mole.retreating = true;

        this.tweens.add({
            targets: mole.sprite,
            y: mole.sprite.y + tuning.holeRadius,
            duration: tuning.moleRetreatDurationMs,
            ease: 'Power2',
            onUpdate: () => mole.label.setPosition(mole.sprite.x, mole.sprite.y),
            onComplete: () => {
                mole.label.destroy();
                mole.sprite.destroy();
                this.activeMoles = this.activeMoles.filter((m) => m !== mole);
            },
        });
    }

    private retreatAllActive(): void {
        this.activeMoles.forEach((m) => this.retreatMole(m));
    }

    private endRound(): void {
        if (!this.roundActive) return;
        this.roundActive = false;

        this.waveTimers.forEach((t) => t.remove(false));
        this.waveTimers = [];
        if (this.roundEndTimer) {
            this.roundEndTimer.remove(false);
            this.roundEndTimer = null;
        }

        this.retreatAllActive();

        this.time.delayedCall(tuning.popIntervalMs, () => {
            this.currentCorrectWord = null;
            this.startRound();
        });
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