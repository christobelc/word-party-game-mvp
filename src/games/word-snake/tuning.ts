// Tuning constants for Word-Snake
// All "feel" knobs should live in this file — no magic numbers in scene code

export const tuning = {
    canvasWidth: 360,
    canvasHeight: 640,
    gridCols: 9,
    gridRows: 14,
    cellSizePx: 40,
    gridOffsetYPx: 80,
    promptYPx: 40,
    promptFontPx: 24,
    interRoundMs: 1000,
    swipeMinPx: 30,
    decoysPerRound: 2,
    bgColor: '#111827',
    snakeColor: 0x4ade80,
    snakeHeadColor: 0x22c55e,
    tileColor: 0xfbbf24,
    // Speed ramp — only takes effect in grow-and-shrink mode for slow-down
    tickMsBase: 200,             // starting speed
    tickMsMin: 80,               // floor — fastest the snake can go
    tickMsStepCorrect: 10,       // ms reduction per correct answer  
    tickMsStepWrong: 10,         // ms increase per wrong (only in grow-and-shrink)
    growthMode: 'grow-only' as 'grow-only' | 'grow-and-shrink',
    timerFontPx: 22,
    timerColor: '#ffffff',
    timerXFracFromRight: 0.05,
    timerYPx: 30,
    timerUpdateMs: 250,
};
