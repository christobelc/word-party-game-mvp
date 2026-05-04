import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDecks } from '../../hooks/useDeck';
import { useServices } from '../../hooks/useServices';

export function HomeScreen(): React.ReactElement {
    const { deckService } = useServices();
    const navigate = useNavigate();
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const decks = useDecks(refreshTrigger);
    const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set());

    const toggleDeck = (id: string) => {
        setSelectedDeckIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handlePlay = () => {
        if (selectedDeckIds.size === 0) return;
        const ids = Array.from(selectedDeckIds).join(',');
        navigate(`/lobby?decks=${ids}`);
    };

    const handleCreateDeck = (): void => {
        const id = `deck-${Date.now()}`;
        const newDeck = {
            id,
            name: 'New Deck',
            words: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        deckService.save(newDeck).then(() => {
            setRefreshTrigger((prev) => prev + 1);
        });
    };

    const handleDeleteDeck = (deckId: string): void => {
        if (window.confirm('Delete this deck? This cannot be undone.')) {
            deckService.delete(deckId).then(() => {
                setRefreshTrigger((prev) => prev + 1);
            });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-24">
            <h1 className="text-3xl font-bold text-center mb-6">Word Party Game</h1>

            <div className="max-w-md mx-auto">
                <button
                    onClick={handleCreateDeck}
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded mb-6 hover:bg-blue-600"
                >
                    Create New Deck
                </button>

                <h2 className="text-xl font-semibold mb-4">Your Decks</h2>
                {decks.length === 0 ? (
                    <p className="text-gray-500 text-center">No decks yet. Create one to get started!</p>
                ) : (
                    <ul className="space-y-2">
                        {decks.map((deck) => (
                            <li
                                key={deck.id}
                                className="bg-white p-4 rounded shadow flex items-center gap-3"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedDeckIds.has(deck.id)}
                                    onChange={() => toggleDeck(deck.id)}
                                    className="w-5 h-5"
                                />
                                <div className="flex-1">
                                    <h3 className="font-medium">{deck.name}</h3>
                                    <p className="text-sm text-gray-500">{deck.words.length} words</p>
                                </div>
                                <div className="space-x-2">
                                    <Link
                                        to={`/decks/${deck.id}/edit`}
                                        className="text-blue-500 hover:underline"
                                    >
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => handleDeleteDeck(deck.id)}
                                        className="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
                <div className="max-w-md mx-auto">
                    <button
                        onClick={handlePlay}
                        disabled={selectedDeckIds.size === 0}
                        className="w-full bg-green-500 text-white py-3 px-4 rounded font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-600"
                    >
                        Play ({selectedDeckIds.size} deck{selectedDeckIds.size === 1 ? '' : 's'})
                    </button>
                </div>
            </div>
        </div>
    );
}