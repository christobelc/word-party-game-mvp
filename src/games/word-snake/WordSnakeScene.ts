import Phaser from 'phaser';
import type { GameContext } from '../../core/game/GameContext';
import { pickDecoys } from '../shared/decoyPicker';
import { feedbackTweens } from '../shared/feedbackTweens';
import { wordLabel, type WordLabelHandle } from '../shared/wordLabel';
import { tuning } from './tuning';

export class WordSnakeScene extends Phaser.Scene {
    private context!: GameContext;
    private onEnd!: () => void;
    private promptText!: Phaser.GameObjects.Text;
    private snake: Array<{ rect: Phaser.GameObjects.Rectangle; gridX: number; gridY: number }> = [];
    private tiles: Array<{
        rect: Phaser.GameObjects.Rectangle;
        label: WordLabelHandle;
        wordId: string;
        isCorrect: boolean;
        gridX: number;
        gridY: number;
    }> = [];
    private direction: { dx: number; dy: number } = { dx: 1, dy: 0 }; // Right
    private queuedDirection: { dx: number; dy: number } | null = null;
    private moveTimer: Phaser.Time.TimerEvent | null = null;
    private swipeStart: { x: number; y: number } | null = null;
    private currentTickMs: number = tuning.tickMsBase;
    private timerText!: Phaser.GameObjects.Text;
    private timerUpdater: Phaser.Time.TimerEvent | null = null;

    constructor() {
        super({ key: 'word-snake' });
    }

    init(data: { context: GameContext; onEnd: () => void }): void {
        this.context = data.context;
        this.onEnd = data.onEnd;
    }

    create(): void {
        // 1. Start session
        this.context.session.start();

        // 2. Register session-end listener
        this.context.session.addEventListener('end', () => this.onEnd());

        // 3. Set background fill
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

        // 5. Build grid math
        this.buildGrid();

        // 6. Spawn snake
        this.spawnSnakeAtCenter();

        // 7. Wire keyboard input
        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-LEFT', () => this.setDirection(-1, 0));
            this.input.keyboard.on('keydown-RIGHT', () => this.setDirection(1, 0));
            this.input.keyboard.on('keydown-UP', () => this.setDirection(0, -1));
            this.input.keyboard.on('keydown-DOWN', () => this.setDirection(0, 1));

            this.input.keyboard.on('keydown-A', () => this.setDirection(-1, 0));
            this.input.keyboard.on('keydown-D', () => this.setDirection(1, 0));
            this.input.keyboard.on('keydown-W', () => this.setDirection(0, -1));
            this.input.keyboard.on('keydown-S', () => this.setDirection(0, 1));
        }

        // 8. Wire swipe input
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.swipeStart = { x: pointer.x, y: pointer.y };
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (!this.swipeStart) return;

            const dx = pointer.x - this.swipeStart.x;
            const dy = pointer.y - this.swipeStart.y;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            if (Math.max(absDx, absDy) > tuning.swipeMinPx) {
                if (absDx > absDy) {
                    this.setDirection(dx > 0 ? 1 : -1, 0);
                } else {
                    this.setDirection(0, dy > 0 ? 1 : -1);
                }
            }
            this.swipeStart = null;
        });

        // 9. Reset speed per session and start move timer
        this.currentTickMs = tuning.tickMsBase;
        this.moveTimer = this.time.addEvent({
            delay: this.currentTickMs,
            loop: true,
            callback: () => this.tick()
        });

        // 10. Start round
        this.startRound();

        // 11. Register shutdown cleanup
        this.events.once('shutdown', () => {
            this.tiles.forEach(t => {
                t.label.destroy();
                t.rect.destroy();
            });
            this.tiles = [];
            this.snake.forEach(s => s.rect.destroy());
            this.snake = [];
            if (this.moveTimer) {
                this.moveTimer.remove(false);
                this.moveTimer = null;
            }
            if (this.timerUpdater) {
                this.timerUpdater.remove(false);
                this.timerUpdater = null;
            }
        });
    }

    private buildGrid(): void {
        // No visible grid lines required for MVP.
    }

    private startRound(): void {
        // Pick correct word
        const [correct] = this.context.selection.pick(this.context.deck, 1);
        if (!correct) {
            this.onEnd();
            return;
        }

        // Update prompt
        this.promptText.setText(correct.prompt);

        // Pick decoys
        const decoys = pickDecoys(this.context.deck, correct, tuning.decoysPerRound);
        if (decoys.length < tuning.decoysPerRound) {
            this.onEnd();
            return;
        }

        // Place tiles
        this.placeTilesOnEmptyCells(correct, decoys);
    }

    private clearTiles(): void {
        this.tiles.forEach(t => {
            t.label.destroy();
            t.rect.destroy();
        });
        this.tiles = [];
    }

    private spawnSnakeAtCenter(): void {
        const startX = Math.floor(tuning.gridCols / 2);
        const startY = Math.floor(tuning.gridRows / 2);
        
        const pos = this.gridToPixel(startX, startY);
        const rect = this.add.rectangle(pos.x, pos.y, tuning.cellSizePx - 2, tuning.cellSizePx - 2, tuning.snakeHeadColor);
        
        this.snake = [{ rect, gridX: startX, gridY: startY }];
    }

    private growSnake(gridX: number, gridY: number): void {
        const pos = this.gridToPixel(gridX, gridY);
        const rect = this.add.rectangle(pos.x, pos.y, tuning.cellSizePx - 2, tuning.cellSizePx - 2, tuning.snakeColor);
        this.snake.push({ rect, gridX, gridY });
    }

    private shrinkSnake(): void {
        if (this.snake.length > 1) {
            const segment = this.snake.pop();
            segment?.rect.destroy();
        }
    }

    private updateTickRate(): void {
        if (this.moveTimer) {
            this.moveTimer.remove(false);
        }
        this.moveTimer = this.time.addEvent({
            delay: this.currentTickMs,
            loop: true,
            callback: () => this.tick()
        });
    }

    private updateTimerText(): void {
        const remainingMs = Math.max(0, this.context.session.getRemainingMs());
        const totalSeconds = Math.ceil(remainingMs / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        this.timerText.setText(`${m}:${s.toString().padStart(2, '0')}`);
    }

    private tick(): void {
        if (this.queuedDirection) {
            const is180 = (this.queuedDirection.dx === -this.direction.dx && this.queuedDirection.dy === -this.direction.dy);
            if (!is180) {
                this.direction = this.queuedDirection;
            }
            this.queuedDirection = null;
        }

        const head = this.snake[0];
        let nextX = head.gridX + this.direction.dx;
        let nextY = head.gridY + this.direction.dy;

        nextX = (nextX + tuning.gridCols) % tuning.gridCols;
        nextY = (nextY + tuning.gridRows) % tuning.gridRows;

        for (let i = 1; i < this.snake.length; i++) {
            if (this.snake[i].gridX === nextX && this.snake[i].gridY === nextY) {
                this.context.session.end();
                return;
            }
        }

        const tailPos = {
            gridX: this.snake[this.snake.length - 1].gridX,
            gridY: this.snake[this.snake.length - 1].gridY
        };

        for (let i = this.snake.length - 1; i > 0; i--) {
            this.snake[i].gridX = this.snake[i - 1].gridX;
            this.snake[i].gridY = this.snake[i - 1].gridY;
        }
        head.gridX = nextX;
        head.gridY = nextY;

        this.snake.forEach((s, i) => {
            const pos = this.gridToPixel(s.gridX, s.gridY);
            s.rect.setPosition(pos.x, pos.y);
            s.rect.setFillStyle(i === 0 ? tuning.snakeHeadColor : tuning.snakeColor);
        });

        const hitTileIndex = this.tiles.findIndex(t => t.gridX === nextX && t.gridY === nextY);
        if (hitTileIndex !== -1) {
            const tile = this.tiles[hitTileIndex];
            if (tile.isCorrect) {
                this.context.session.recordCorrect(tile.wordId);
                feedbackTweens.squashStretch(this, tile.rect as unknown as Phaser.GameObjects.Sprite);
                
                this.growSnake(tailPos.gridX, tailPos.gridY);

                this.currentTickMs = Math.max(tuning.tickMsMin, this.currentTickMs - tuning.tickMsStepCorrect);
                this.updateTickRate();

                this.clearTiles();
                this.time.delayedCall(tuning.interRoundMs, () => this.startRound());
            } else {
                this.context.session.recordWrong(tile.wordId);
                feedbackTweens.shake(this);

                // Slow down only in grow-and-shrink mode                    
                if (tuning.growthMode === 'grow-and-shrink') {
                    this.currentTickMs = Math.min(tuning.tickMsBase, this.currentTickMs + tuning.tickMsStepWrong);
                    this.updateTickRate();

                    // Shrink if length > 1 (floor 1)                        
                    if (this.snake.length > 1) {
                        this.shrinkSnake();
                    }
                }

                // Any wrong = clear all tiles + new round
                this.clearTiles();
                this.time.delayedCall(tuning.interRoundMs, () => this.startRound());
            }
        }
    }

    private setDirection(dx: number, dy: number): void {
        if (dx === -this.direction.dx && dy === -this.direction.dy) return;
        this.queuedDirection = { dx, dy };
    }

    private placeTilesOnEmptyCells(correct: any, decoys: any[]): void {
        const allWords = [
            { word: correct, isCorrect: true },
            ...decoys.map(d => ({ word: d, isCorrect: false }))
        ];
        
        for (let i = allWords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
        }

        const occupied = new Set(this.snake.map(s => `${s.gridX},${s.gridY}`));
        const availableCells: Array<{ x: number; y: number }> = [];
        
        for (let gx = 0; gx < tuning.gridCols; gx++) {
            for (let gy = 0; gy < tuning.gridRows; gy++) {
                if (!occupied.has(`${gx},${gy}`)) {
                    availableCells.push({ x: gx, y: gy });
                }
            }
        }

        allWords.forEach(entry => {
            if (availableCells.length === 0) return;
            const idx = Math.floor(Math.random() * availableCells.length);
            const cell = availableCells.splice(idx, 1)[0];
            const pos = this.gridToPixel(cell.x, cell.y);

            const rect = this.add.rectangle(pos.x, pos.y, tuning.cellSizePx - 4, tuning.cellSizePx - 4, tuning.tileColor);
            const label = wordLabel(this, pos.x, pos.y, entry.word.answer);
            
            this.tiles.push({
                rect,
                label,
                wordId: entry.word.id,
                isCorrect: entry.isCorrect,
                gridX: cell.x,
                gridY: cell.y
            });
        });
    }

    private gridToPixel(gx: number, gy: number): { x: number; y: number } {
        const offsetX = (tuning.canvasWidth - (tuning.gridCols * tuning.cellSizePx)) / 2;
        return {
            x: offsetX + gx * tuning.cellSizePx + tuning.cellSizePx / 2,
            y: tuning.gridOffsetYPx + gy * tuning.cellSizePx + tuning.cellSizePx / 2
        };
    }
}
