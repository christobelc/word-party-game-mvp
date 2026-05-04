import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getAllGames } from '../../core/game/GameRegistry';

const REEL_TICK_MS = 80;          // ms between reel item changes during spin                                                     
const REEL_DECEL_TICKS = 12;      // how many slow-down ticks before stopping                                                  
const REEL_LAND_PAUSE_MS = 600;   // pause after landing before navigating                                                       

export function LobbyScreen(): React.ReactElement {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const decksParam = searchParams.get('decks') ?? '';
    const games = getAllGames();

    const [reelIndex, setReelIndex] = useState(0);
    const [spinning, setSpinning] = useState(false);
    const [landed, setLanded] = useState<string | null>(null);

    const handlePull = () => {
        if (spinning || landed) return;
        if (games.length === 0) return;

        setSpinning(true);
        const target = Math.floor(Math.random() * games.length);

        let tick = 0;
        let currentDelay = REEL_TICK_MS;

        const step = () => {
            setReelIndex((prev) => (prev + 1) % games.length);
            tick++;
            if (tick > 20 && tick > 20 + REEL_DECEL_TICKS) {
                // ensure we land on target                      
                setReelIndex(target);
                setSpinning(false);
                setLanded(games[target].meta.id);
                setTimeout(() => {
                    navigate(`/play?decks=${decksParam}&game=${games[target].meta.id}`);
                }, REEL_LAND_PAUSE_MS);
                return;
            }
            // decelerate after initial ticks                    
            if (tick > 20) currentDelay += 20;
            setTimeout(step, currentDelay);
        };
        setTimeout(step, currentDelay);
    };

    if (games.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 text-center">
                <Link to="/" className="inline-block mb-4 text-blue-500 hover:underline">← Home</Link>
                <p>No games available.</p>
            </div>
        );
    }

    if (!decksParam) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 text-center">
                <Link to="/" className="inline-block mb-4 text-blue-500 hover:underline">← Home</Link>
                <p>No decks selected.</p>
            </div>
        );
    }

    const currentGame = games[reelIndex];

    return (
        <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto flex flex-col">
            <Link to="/" className="inline-block mb-4 text-blue-500 hover:underline">← Home</Link>
            <h1 className="text-3xl font-bold text-center mb-8">Pull the Lever</h1>

            <div className="bg-white rounded-lg shadow-lg p-8 mb-8 border-4 border-yellow-400">
                <div className="bg-gray-900 text-white text-center py-12 rounded overflow-hidden">
                    <div className="text-4xl font-bold transition-all">
                        🎮
                    </div>
                    <div className="text-2xl mt-2 transition-all">
                        {currentGame.meta.name}
                    </div>
                </div>
            </div>

            <button
                onClick={handlePull}
                disabled={spinning || landed !== null}
                className="w-full bg-red-500 text-white py-4 px-4 rounded-full text-xl font-bold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-red-600 shadow-lg"
            >
                {landed ? `🎉 ${currentGame.meta.name}!` : spinning ? 'Spinning…' : 'PULL'}
            </button>
        </div>
    );
}
