# Game Template

This folder is a starter template for adding new games (5–8 post-MVP).

## How to add a new game

1. Copy this folder and rename it (e.g., `src/games/new-game/`)
2. Update `index.ts`:
   - Change `id`, `name`, `description`, `iconAssetKey` in `meta`
   - Ensure `sceneKey` matches the scene key used in your scene class
   - Update the import to point to your new scene file
3. Implement your scene in `NewGameScene.ts` (extend `Phaser.Scene`)
4. Add tuning constants to `tuning.ts`
5. Register the game in `src/games/index.ts` by adding it to `ALL_GAMES` array

## Key rules

- No central switch statements over game IDs
- No direct `localStorage` access — use `DeckService` via `GameContext`
- No magic numbers in scene code — use `tuning.ts`
- Korean text via `wordLabel()` helper from `../shared/wordLabel`