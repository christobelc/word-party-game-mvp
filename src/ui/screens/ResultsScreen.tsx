import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import type { SessionResult } from '../../core/game/GameSession';
import { useServices } from '../../hooks/useServices';
import { mergeDecks } from '../../core/deck/mergeDecks';
import type { Deck } from '../../core/deck/Deck';

export function ResultsScreen(): React.ReactElement {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { deckService } = useServices();

    const state = location.state as { results: SessionResult[] } | null;
    const decksParam = searchParams.get('decks') ?? '';
    const deckIds = decksParam.split(',').filter(Boolean);

    const [decks, setDecks] = useState<Deck[] | null>(null);
    const [recorded, setRecorded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        Promise.all(deckIds.map((id) => deckService.get(id))).then((loaded) => {
            if (cancelled) return;
            setDecks(loaded.filter((d): d is Deck => d !== null));
        });
        return () => { cancelled = true; };
    }, [decksParam, deckService]);

    useEffect(() => {
        if (recorded || decks === null || !state?.results) return;
        const { sourceMap } = mergeDecks(decks);
        const promises = state.results.map((r) => {
            const sourceDeckId = sourceMap.get(r.wordId);
            if (!sourceDeckId) return Promise.resolve();
            return deckService.recordWordResult(sourceDeckId, r.wordId, r.correct);
        });
        Promise.all(promises).then(() => setRecorded(true));
    }, [decks, state, recorded, deckService]);

    if (!state?.results || decks === null) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 text-center">
                <Link to="/" className="inline-block mb-4 text-blue-500 hover:underline">← Home</Link>
                <p>{decks === null ? 'Loading…' : 'No results found.'}</p>
            </div>
        );
    }

    const { results } = state;
    const correctCount = results.filter((r) => r.correct).length;
    const wrongCount = results.length - correctCount;

    const handlePlayAgain = (): void => {
        navigate(`/lobby?decks=${decksParam}`);
    };

    const allWords = decks.flatMap((d) => d.words);

    return (
        <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">
            <Link to="/" className="inline-block mb-4 text-blue-500 hover:underline">← Home</Link>
            <h1 className="text-3xl font-bold text-center mb-6">Results</h1>

            <div className="bg-white p-6 rounded shadow mb-6 text-center">
                <div className="text-5xl font-bold text-green-500 mb-2">{correctCount}</div>
                <p className="text-gray-600">Correct</p>
                <div className="text-5xl font-bold text-red-500 mt-4 mb-2">{wrongCount}</div>
                <p className="text-gray-600">Wrong</p>
            </div>

            {wrongCount > 0 && (
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-4">Missed Words</h2>
                    <ul className="space-y-2">
                        {results
                            .filter((r) => !r.correct)
                            .map((r) => {
                                const word = allWords.find((w) => w.id === r.wordId);
                                return word ? (
                                    <li key={r.wordId} className="bg-white p-3 rounded shadow">
                                        <span className="font-medium">{word.prompt}</span>
                                        <span className="text-gray-500"> = {word.answer}</span>
                                    </li>
                                ) : null;
                            })}
                    </ul>
                </div>
            )}

            <button
                onClick={handlePlayAgain}
                className="w-full bg-blue-500 text-white py-3 px-4 rounded hover:bg-blue-600"
            >
                Play Again                                       
            </button>
        </div>
    );
}