export interface SessionResult {
    wordId: string;
    correct: boolean;
    timeMs: number;
}

export class GameSession {
    durationMs = 60_000;
    score = 0;
    combo = 0;
    results: SessionResult[] = [];

    private startTime: number = 0;
    private timerId: ReturnType<typeof setTimeout> | null = null;
    private ended = false;
    private listeners: Map<string, Set<EventListener>> = new Map();

    start(): void {
        this.startTime = Date.now();
        this.ended = false;
        this.score = 0;
        this.combo = 0;
        this.results = [];
        this.emit('start', null);
        this.scheduleEnd();
    }

    private scheduleEnd(): void {
        this.timerId = setTimeout(() => {
            this.end();
        }, this.durationMs);
    }

    end(): void {
        if (this.ended) return;
        this.ended = true;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        this.emit('end', null);
    }

    recordCorrect(wordId: string): void {
        if (this.ended) return;
        const timeMs = Date.now() - this.startTime;
        this.combo++;
        this.score += 100 * (1 + this.combo * 0.5);
        this.results.push({ wordId, correct: true, timeMs });
        this.emit('correct', { wordId, timeMs, score: this.score, combo: this.combo });
    }

    recordWrong(wordId: string): void {
        if (this.ended) return;
        const timeMs = Date.now() - this.startTime;
        this.combo = 0;
        this.results.push({ wordId, correct: false, timeMs });
        this.emit('wrong', { wordId, timeMs });
    }

    addTime(ms: number): void {
        if (this.ended) return;
        // Extend the timer
        if (this.timerId) {
            clearTimeout(this.timerId);
        }
        const elapsed = Date.now() - this.startTime;
        const remaining = Math.max(0, this.durationMs - elapsed + ms);
        this.timerId = setTimeout(() => {
            this.end();
        }, remaining);
    }

    getElapsedMs(): number {
        return this.startTime ? Date.now() - this.startTime : 0;
    }

    getRemainingMs(): number {
        return Math.max(0, this.durationMs - this.getElapsedMs());
    }

    // EventTarget-like API
    addEventListener(type: string, listener: EventListener): void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type)!.add(listener);
    }

    removeEventListener(type: string, listener: EventListener): void {
        const set = this.listeners.get(type);
        if (set) {
            set.delete(listener);
        }
    }

    private emit(type: string, detail: unknown): void {
        const set = this.listeners.get(type);
        if (set) {
            const event = new CustomEvent(type, { detail });
            set.forEach((listener) => listener(event));
        }
    }
}