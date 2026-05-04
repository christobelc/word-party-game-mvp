// Tuning constants for Word-Dino
// All "feel" knobs should live in this file — no magic numbers in scene code

export const tuning = {
    canvasWidth: 360,
    canvasHeight: 640,
    bgColor: '#fef3c7',                 // warm sand color

    // Ground / dino
    groundYPx: 500,
    dinoXPx: 80,
    dinoWidthPx: 40,
    dinoHeightPx: 50,
    dinoColor: 0x374151,                // dark gray

    // Obstacles
    obstacleWidthPx: 50,
    obstacleHeightPx: 60,
    obstacleColor: 0x92400e,            // brown
    obstacleSpawnXOffsetPx: 60,         // how far off-right obstacles spawn

    // Scrolling speed (px/sec)
    baseScrollSpeedPx: 220,
    maxScrollSpeedPx: 480,
    speedRampFracPerCorrect: 0.05,      // +5% per correct, multiplicative

    // Spawn interval (ms between obstacles)
    baseSpawnIntervalMs: 1400,
    minSpawnIntervalMs: 600,
    spawnIntervalRampFracPerCorrect: 0.05, // -5% per correct
    minSpawnGapFrac: 0.7,                  // randomized gap = currentInterval × [min, max]
    maxSpawnGapFrac: 1.4,

    // Jump physics (in pixels and pixels/sec/sec)
    jumpVelocityPx: 600,                // initial upward velocity (negative y)
    gravityPxPerSecSquared: 1800,

    // Round
    maxObstaclesPerRound: 15,           // soft cap — round ends as missed if reached
    decoysPerInitialQueue: 3,           // initial queue = 1 correct + this many decoys
    respawnWindowMin: 1,                // when correct is jumped over, reinject within 1..N slots
    respawnWindowMax: 3,
    interRoundMs: 800,

    // Prompt + labels
    promptYPx: 60,
    promptFontPx: 28,
    answerFontPx: 18,                   // Korean text on obstacles

    // Feedback
    floatTextDurationMs: 600,
    floatTextRisePx: 50,
    floatTextFontPx: 28,
    floatTextColor: '#fbbf24',
    stumbleSquishYScale: 0.7,
    stumbleDurationMs: 200,

    // Timer HUD (from Step 11.8a)
    timerFontPx: 22,
    timerColor: '#1f2937',              // dark — readable on warm bg
    timerXFracFromRight: 0.05,
    timerYPx: 30,
    timerUpdateMs: 250,
};
