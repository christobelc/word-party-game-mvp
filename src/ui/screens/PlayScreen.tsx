import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { getGameById } from '../../core/game/GameRegistry';
import type { GameContext } from '../../core/game/GameContext';
import { GameSession } from '../../core/game/GameSession';
import { useServices } from '../../hooks/useServices';
import { PhaserGame } from '../components/PhaserGame';
import { pickDecoys } from '../../games/shared/decoyPicker';
import { mergeDecks } from '../../core/deck/mergeDecks';
import type { SessionResult } from '../../core/game/GameSession';
import type { Deck } from '../../core/deck/Deck';

export function PlayScreen(): React.ReactElement {
    const [searchParams] = useSearchParams();
    const decksParam = searchParams.get('decks') ?? '';
    const gameId = searchParams.get('game') ?? '';
    const deckIds = decksParam.split(',').filter(Boolean);

    const { deckService, selectionStrategy } = useServices();
    const navigate = useNavigate();
    const [session] = useState(() => new GameSession());
    const [decks, setDecks] = useState<Deck[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        Promise.all(deckIds.map((id) => deckService.get(id))).then((loaded) => {
            if (cancelled) return;
            const filtered = loaded.filter((d): d is Deck => d !== null);
            setDecks(filtered);
        });
        return () => { cancelled = true; };
    }, [decksParam, deckService]);

    const handleEnd = useCallback((sessionResults: SessionResult[]) => {
        navigate(`/results?decks=${decksParam}`, { state: { results: sessionResults } });
    }, [decksParam, navigate]);

    if (decks === null) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 text-center">
                <p>Loading…</p>
            </div>
        );
    }

    if (decks.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 text-center">
                <Link to="/" className="inline-block mb-4 text-blue-500 hover:underline">← Home</Link>
                <p>Decks not found.</p>
            </div>
        );
    }

    const game = getGameById(gameId);
    if (!game) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 text-center">
                <Link to="/" className="inline-block mb-4 text-blue-500 hover:underline">← Home</Link>
                <p>Game not found.</p>
            </div>
        );
    }

    const { merged } = mergeDecks(decks);

    if (merged.words.length < 1 + 2) {
        // Not enough words to even build a round (1 correct + 2 decoys minimum).                                                 
        return (
            <div className="min-h-screen bg-gray-50 p-4 text-center">
                <Link to="/" className="inline-block mb-4 text-blue-500 hover:underline">← Home</Link>
                <p>Selected decks need at least 3 words total.</p>
            </div>
        );
    }

    const context: GameContext = {
        deck: merged,
        session,
        selection: selectionStrategy,
        pickDecoys: (correct, n) => pickDecoys(merged, correct, n),
    };

    return (
        <div className="relative">
            <Link
                to="/"
                className="absolute top-4 left-4 text-white bg-black/50 px-3 py-1 rounded hover:bg-black/70 z-10"
            >
                ← Home                                           
            </Link>
            <PhaserGame game={game} context={context} onEnd={handleEnd} />
        </div>
    );
}