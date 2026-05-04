import { useState, useEffect } from 'react';
import type { Deck } from '../core/deck/Deck';
import { useServices } from './useServices';

export function useDeck(id: string | null): Deck | null {
    const { deckService } = useServices();
    const [deck, setDeck] = useState<Deck | null>(null);

    useEffect(() => {
        if (!id) {
            setDeck(null);
            return;
        }
        deckService.get(id).then(setDeck).catch(() => setDeck(null));
    }, [id, deckService]);

    return deck;
}

export function useDecks(refreshTrigger = 0): Deck[] {
    const { deckService } = useServices();
    const [decks, setDecks] = useState<Deck[]>([]);

    useEffect(() => {
        deckService.list().then(setDecks).catch(() => setDecks([]));
    }, [deckService, refreshTrigger]);

    return decks;
}