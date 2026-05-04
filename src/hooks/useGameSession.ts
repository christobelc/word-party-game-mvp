import { useEffect, useRef, useCallback, useState } from 'react';
import { GameSession } from '../core/game/GameSession';

export function useGameSession(session: GameSession | null): {
    score: number;
    combo: number;
    remainingMs: number;
    isRunning: boolean;
} {
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [remainingMs, setRemainingMs] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearTick = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!session) {
            setIsRunning(false);
            return;
        }

        const onStart = (): void => {
            setScore(0);
            setCombo(0);
            setRemainingMs(session.durationMs);
            setIsRunning(true);

            clearTick();
            intervalRef.current = setInterval(() => {
                const rem = session.getRemainingMs();
                setRemainingMs(rem);
                if (rem <= 0) {
                    clearTick();
                    setIsRunning(false);
                }
            }, 200);
        };

        const onCorrect = (e: Event): void => {
            const detail = (e as CustomEvent).detail;
            setScore(detail.score);
            setCombo(detail.combo);
        };

        const onWrong = (): void => {
            setCombo(0);
        };

        const onEnd = (): void => {
            setIsRunning(false);
            setRemainingMs(0);
            clearTick();
        };

        session.addEventListener('start', onStart);
        session.addEventListener('correct', onCorrect);
        session.addEventListener('wrong', onWrong);
        session.addEventListener('end', onEnd);

        return () => {
            session.removeEventListener('start', onStart);
            session.removeEventListener('correct', onCorrect);
            session.removeEventListener('wrong', onWrong);
            session.removeEventListener('end', onEnd);
            clearTick();
        };
    }, [session, clearTick]);

    return { score, combo, remainingMs, isRunning };
}