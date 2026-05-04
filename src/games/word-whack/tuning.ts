// Tuning constants for Word-Whack
// All "feel" knobs should live in this file — no magic numbers in scene code

export const tuning = {
    canvasWidth: 360,
    canvasHeight: 640,
    holeRadius: 50,
    promptYPx: 60,
    promptFontPx: 32,
    answerFontPx: 22,
    moleColor: 0x8b4513,
    holeColor: 0x333333,

    // Mole lifetime (per mole, not per round)
    moleVisibleMs: 3500,
    moleRiseDurationMs: 200,
    moleRetreatDurationMs: 200,

    // Round timing
    roundDurationMs: 6000,
    popIntervalMs: 1200,           // gap between rounds

    // Wave spawner
    minWaveGapMs: 200,
    maxWaveGapMs: 1500,
    waveSizeWeights: [40, 35, 20, 5],
    maxDecoysPickedPerWave: 4,

    // Correct feedback
    floatTextDurationMs: 600,    // how long "+1" text stays before fading
    floatTextRisePx: 50,         // how far "+1" text floats upward
    floatTextFontPx: 28,
    floatTextColor: '#fbbf24',   // amber/gold — high contrast on dark hole

    // Misc
    basePoints: 100,            // informational; GameSession owns scoring

    // Timer HUD
    timerFontPx: 22,
    timerColor: '#ffffff',
    timerXFracFromRight: 0.05,   // x-distance from right edge as fraction of canvas width
    timerYPx: 30,                // y-position from top
    timerUpdateMs: 250,          // how often to refresh the text
};

export const holePositionsFrac = [
    { x: 0.2, y: 0.3 },
    { x: 0.5, y: 0.25 },
    { x: 0.8, y: 0.35 },
    { x: 0.15, y: 0.6 },
    { x: 0.45, y: 0.55 },
    { x: 0.75, y: 0.65 },
    { x: 0.3, y: 0.85 },
    { x: 0.65, y: 0.8 },
];