import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDeck } from '../../hooks/useDeck';
import { useServices } from '../../hooks/useServices';
import { deckParser } from '../../core/deck/deckParser';
import type { WordPair } from '../../core/deck/Deck';

export function DeckEditorScreen(): React.ReactElement {
    const { id } = useParams<{ id: string }>();
    const deck = useDeck(id ?? null);
    const { deckService } = useServices();
    const navigate = useNavigate();
    const [textAreaValue, setTextAreaValue] = useState('');

    if (!deck) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">
                <p>Deck not found.</p>
                <button
                    onClick={() => navigate('/')}
                    className="text-blue-500 hover:underline"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    const handleSave = (): void => {
        const words = deckParser(textAreaValue);
        const updatedDeck = {
            ...deck,
            words,
            updatedAt: Date.now(),
        };
        deckService.save(updatedDeck).then(() => {
            alert(`Saved ${words.length} word pairs!`);
        });
    };

    const wordList = deck.words
        .map((w: WordPair) => `${w.prompt} = ${w.answer}`)
        .join('\n');

    return (
        <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">
            <Link
                to="/"
                className="inline-block mb-4 text-blue-500 hover:underline"
            >
                ← Home
            </Link>
            <h1 className="text-2xl font-bold mb-4">{deck.name}</h1>
            <p className="text-sm text-gray-600 mb-2">
                Paste word pairs below, one per line: <code>english = korean</code>
            </p>
            <textarea
                className="w-full h-64 p-2 border border-gray-300 rounded mb-4 font-mono text-sm"
                placeholder="door = 문\nwindow = 창문\n..."
                defaultValue={wordList}
                onChange={(e) => setTextAreaValue(e.target.value)}
            />
            <button
                onClick={handleSave}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
                Save Deck
            </button>
        </div>
    );
}