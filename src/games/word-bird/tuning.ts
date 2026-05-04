// Tuning constants for Word-Bird
// All "feel" knobs should live in this file — no magic numbers in scene code

export const tuning = {
    canvasWidth: 360,
    canvasHeight: 640,
    bgColor: '#bae6fd',                   // sky blue

    // Play area bounds (between prompt and bottom)
    ceilingYPx: 100,                      // top of play area
    floorYPx: 620,                        // bottom of play area

    // Bird
    birdXPx: 80,
    birdRadiusPx: 16,
    birdColor: 0xfacc15,                  // yellow

    // Bird physics
    gravityPxPerSecSquared: 1500,
    flapImpulsePx: 450,                   // upward velocity on flap (positive value, applied as negative)

    // Fruit column
    fruitsPerColumn: 5,
    fruitColors: [0xef4444, 0xf97316, 0xeab308, 0x22c55e, 0xa855f7],  // red, orange, yellow, green, purple
    correctHitboxMultiplier: 1.2,         // forgiving hitbox for the correct fruit
    decoysPerRound: 4,                    // 5 fruits = 1 correct + 4 decoys

    // Pipe (revealed after bird hits a fruit)
    pipeColor: 0x166534,                  // dark green
    pipeWidthPx: 50,
    gapHeightPx: 100,                     // generous gap

    // Scrolling
    baseScrollSpeedPx: 180,               // px/sec
    maxScrollSpeedPx: 380,
    speedRampFracPerCorrect: 0.05,

    // Timing
    columnSpawnXOffsetPx: 80,             // how far off-right the column spawns
    preColumnIdleMs: 2500,                // breathing time before each column
    interRoundMs: 600,

    // Prompt
    promptYPx: 60,
    promptFontPx: 28,
    answerFontPx: 18,                   // Korean text on fruits

    // Feedback
    floatTextDurationMs: 600,
    floatTextRisePx: 50,
    floatTextFontPx: 28,
    floatTextColor: '#fbbf24',

    // Timer HUD (Step 11.8a)
    timerFontPx: 22,
    timerColor: '#1f2937',
    timerXFracFromRight: 0.05,
    timerYPx: 30,
    timerUpdateMs: 250,
};
