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

    // --- Sprite frame dimensions ---
    // worm-pop-up-and-wait.png is a 4×2 grid on a 2048×2048 sheet
    wormPopFrameWidth: 512,
    wormPopFrameHeight: 1024,
    // worm-whacked.png and worm-missed.png are 2×2 grids on 2048×2048 sheets
    wormReactionFrameWidth: 1024,
    wormReactionFrameHeight: 1024,

    // --- Sprite display scale ---
    wormPopScale: 0.18,       // applied to worm-pop sprite (native frame 512×1024)
    wormReactionScale: 0.10,  // applied to worm-whacked and worm-missed (native frame 1024×1024)

    // --- Worm Y positioning relative to hole centre ---
    wormSpawnOffsetY: 120,      // sprite starts this many px BELOW hole.y (hidden, ready to rise)
    wormRiseTargetOffsetY: -10, // sprite centre rests this many px ABOVE hole.y when fully risen

    // --- Korean label positioning ---
    // Positive = below sprite centre, placing text in the white board area of the sprite
    wormLabelOffsetY: 35,
    wormLabelColor: '#1a1a1a', // dark text readable on white whiteboard

    // --- Animation frame rates ---
    wormRiseFrameRate: 12,     // fps for worm-rise (frames 0–3 of pop sheet, ~333ms total)
    wormIdleFrameRate: 4,      // fps for worm-idle loop (frames 4–7 of pop sheet)
    wormWhackedFrameRate: 10,  // fps for whacked reaction (4 frames, ~400ms total)
    wormMissedFrameRate: 8,    // fps for missed retreat (4 frames, ~500ms total)

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