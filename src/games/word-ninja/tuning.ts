// Tuning constants for Word-Ninja
// All "feel" knobs should live in this file — no magic numbers in scene code

export const tuning = {
    canvasWidth: 360,
    canvasHeight: 640,
    bgColor: '#1f2937',                    // dark gray-blue

    // Fruit
    fruitRadiusPx: 36,
    fruitColors: [0xef4444, 0xf97316, 0xeab308, 0x22c55e, 0xa855f7],  // red, orange, yellow, green, purple

    // Spawn placement
    spawnXMarginPx: 80,                    // keep spawns away from canvas edges
    fruitSpawnYOffsetPx: 40,               // how far below the bottom edge fruits start

    // Trajectory physics
    fruitInitialVyPx: 800,                 // upward initial velocity (px/sec; applied as negative)
    fruitMaxHorizVyPx: 100,                // max horizontal velocity (px/sec, randomized ± this value)
    gravityPxPerSecSquared: 1500,

    // Round
    fruitsPerRound: 3,                     // 1 correct + (this - 1) decoys
    decoysPerRound: 2,                     // total fruits = 1 + decoysPerRound = 3
    wordFruitSpawnIntervalMs: 1500,        // gap between fruit launches in a round
    interRoundMs: 700,

    // Speed ramp
    speedRampFracPerCorrect: 0.05,
    maxFruitInitialVyPx: 1100,             // upper bound for ramped initial vy
    minSpawnIntervalMs: 800,               // floor for ramped spawn interval

    // Slash detection
    slashTrailMaxPoints: 12,               // number of recent pointer positions to keep for trail
    slashTrailColor: 0xffffff,
    slashTrailWidthPx: 4,

    // Prompt
    promptYPx: 60,
    promptFontPx: 28,
    answerFontPx: 18,                      // Korean text on fruits

    // Feedback
    floatTextDurationMs: 600,
    floatTextRisePx: 50,
    floatTextFontPx: 28,
    floatTextColor: '#fbbf24',

    // Timer HUD (Step 11.8a)
    timerFontPx: 22,
    timerColor: '#ffffff',
    timerXFracFromRight: 0.05,
    timerYPx: 30,
    timerUpdateMs: 250,
};
