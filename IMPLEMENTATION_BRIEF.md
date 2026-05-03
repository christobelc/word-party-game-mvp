# Word Party Game — Implementation Brief

**Audience:** the implementer (engineer or coding agent) building this MVP.
**Architect:** has produced this brief + the approved plan. Do not deviate from the locked decisions without checking back.
**Source of truth for design intent:** `/Users/christobelchan/.claude/plans/project-word-party-game-eager-kettle.md` — read it first.

---

## Current state of the repo (already done)

- Vite 8 + React 19 + TypeScript scaffold created via `npm create vite@latest . -- --template react-ts`
- Base `npm install` has run (`node_modules/` populated with 153 base packages)
- Default Vite/React boilerplate still in `src/` — needs to be replaced
- **Nothing else.** No Phaser, no Tailwind, no PWA plugin, no project code.

`package.json` currently has only React + Vite. Everything below has to be added.

---

## What to install next

```bash
# Runtime deps
npm install phaser react-router-dom

# Dev deps
npm install -D tailwindcss@3 postcss autoprefixer vite-plugin-pwa

# Initialize Tailwind config
npx tailwindcss init -p
```

Pin Tailwind to v3 (not v4) — v4's config story is in flux and the brief assumes v3 conventions.

---

## Locked architectural decisions (do not change without asking)

| Decision | Choice |
|---|---|
| Stack | React 19 + Vite + TypeScript + Phaser 3 |
| Pixel art | Phaser config `pixelArt: true`, integer scaling |
| Styling | Tailwind v3 (UI shell only — not inside Phaser scenes) |
| Storage (MVP) | localStorage behind async `DeckService` interface |
| Word selection | `WordSelectionStrategy` interface, `WeightedStrategy` impl |
| Mobile delivery | PWA via `vite-plugin-pwa` |
| Entitlements | `EntitlementService` interface, MVP stub returns "all unlocked" |
| Scope | All 4 MVP games unlocked, built one at a time in order |

---

## Hard architectural rules (the whole point of the design)

These are not suggestions — they're what makes adding games 5–8 cheap and the Supabase migration a drop-in.

1. **No central switch statements over game IDs.** Anywhere. Game catalog is metadata-driven via `src/games/index.ts` exporting `ALL_GAMES: MiniGame[]`.
2. **No component, hook, or game touches `localStorage` directly.** All storage goes through `DeckService`. Add an ESLint rule `no-restricted-globals: localStorage` with an override only for `LocalDeckService.ts`.
3. **No game imports services directly.** Games receive what they need via `GameContext` passed in on scene start. Services are instantiated once in `src/core/services.ts` and provided via `ServicesProvider` React context.
4. **No magic numbers in scene code.** All "feel" knobs (spawn rate, decoy ratio, scoring, animation timings) live in each game's `tuning.ts`.
5. **`DeckService` is async (`Promise<T>`) from day one** even on localStorage. This is so the Supabase swap later requires zero call-site changes.
6. **No hardcoded "if free / if pro" checks.** Read entitlements through `EntitlementService` only. MVP stub returns "all unlocked."
7. **Korean text via DOM overlay**, not Phaser `BitmapText` (~11k Hangul glyphs make a font atlas impractical). One helper in `src/games/shared/wordLabel.ts` provides this consistently.

---

## Build order (strictly bottom-up)

Each step has zero dependencies on later steps. Stop at the end of each step, run typecheck (`npx tsc -b`), make sure it's clean before moving on. **Do not build games before the foundation is in place.**

### Step 0 — Project setup
- Install deps (above)
- Configure Tailwind (`tailwind.config.js` content paths, `src/index.css` with `@tailwind base/components/utilities`)
- Configure `vite-plugin-pwa` in `vite.config.ts` (registerType: 'autoUpdate', manifest with name/icons/theme)
- Add ESLint rule: `no-restricted-globals: ["error", "localStorage"]` with file-scoped override for `src/core/deck/LocalDeckService.ts`
- Delete default Vite boilerplate in `src/` (keep `main.tsx`, `vite-env.d.ts`)

### Step 1 — Core types & deck layer
**Files:**
- `src/core/deck/Deck.ts` — types
- `src/core/deck/DeckService.ts` — interface
- `src/core/deck/LocalDeckService.ts` — impl
- `src/core/deck/deckParser.ts` — parses textarea input

```ts
// src/core/deck/Deck.ts
export interface WordPair {
  id: string;            // stable: hash(deckId + prompt + answer)
  prompt: string;        // English, e.g. "door"
  answer: string;        // Korean, e.g. "문"
  stats: WordStats;
}

export interface WordStats {
  weight: number;        // selection weight, default 1, miss → 3, correct *= 0.8, floor 1
  timesSeen: number;
  timesCorrect: number;
  lastSeenAt: number | null;
}

export interface Deck {
  id: string;            // uuid
  name: string;
  words: WordPair[];
  createdAt: number;
  updatedAt: number;
}
```

```ts
// src/core/deck/DeckService.ts
export interface DeckService {
  list(): Promise<Deck[]>;
  get(id: string): Promise<Deck | null>;
  save(deck: Deck): Promise<void>;
  delete(id: string): Promise<void>;
  recordWordResult(deckId: string, wordId: string, correct: boolean): Promise<void>;
}
```

`LocalDeckService` keys: `wpg.decks.index` (array of deck ids), `wpg.decks.<id>` (deck JSON). Wrap all returns in `Promise.resolve(...)`.

`deckParser(input: string): WordPair[]` — splits on `\n`, each non-empty line split on `=` (or `:` or `\t` — accept any), trims, generates stable id via simple hash. Skip malformed lines silently for MVP.

### Step 2 — Selection strategy
**Files:**
- `src/core/selection/WordSelectionStrategy.ts`
- `src/core/selection/WeightedStrategy.ts`

```ts
export interface WordSelectionStrategy {
  pick(deck: Deck, n: number): WordPair[];
  recordResult(word: WordPair, correct: boolean): WordStats;  // returns updated stats
}
```

`WeightedStrategy.pick`: weighted random sample without replacement, using `word.stats.weight`.
`WeightedStrategy.recordResult`: `correct ? weight = max(1, weight * 0.8) : weight = 3`.

### Step 3 — Entitlements
**Files:**
- `src/core/entitlements/EntitlementService.ts`
- `src/core/entitlements/AllUnlockedEntitlementService.ts`

```ts
export interface EntitlementService {
  isPro(): Promise<boolean>;
  unlockedGameIds(): Promise<string[]>;   // returns game ids; UI filters from this
}
```

MVP impl returns `true` and the full list of game ids.

### Step 4 — Game core
**Files:**
- `src/core/game/MiniGame.ts`
- `src/core/game/GameRegistry.ts`
- `src/core/game/GameSession.ts`
- `src/core/game/GameContext.ts`

```ts
// MiniGame.ts
export interface MiniGameMeta {
  id: string;
  name: string;
  description: string;
  iconAssetKey: string;
  tier: 'free' | 'pro';
  sceneKey: string;
}

export interface MiniGame {
  meta: MiniGameMeta;
  getSceneClass(): typeof Phaser.Scene;
}
```

```ts
// GameSession.ts — emits events; UI subscribes via useGameSession hook
export interface SessionResult {
  wordId: string;
  correct: boolean;
  timeMs: number;
}

export class GameSession {
  durationMs = 90_000;
  score = 0;
  combo = 0;
  results: SessionResult[] = [];
  // EventTarget-based: 'start', 'tick', 'correct', 'wrong', 'end'
  // Methods: start(), end(), recordCorrect(wordId), recordWrong(wordId), addTime(ms)
}
```

```ts
// GameContext.ts — passed to scene on start
export interface GameContext {
  deck: Deck;
  session: GameSession;
  selection: WordSelectionStrategy;
  pickDecoys(correct: WordPair, n: number): WordPair[];
}
```

`GameRegistry` reads `ALL_GAMES` from `src/games/index.ts` — used by SlotMachineScreen and PlayScreen to enumerate / launch by id. **No imports of individual game files anywhere except `src/games/index.ts`.**

### Step 5 — Composition root + hooks
**Files:**
- `src/core/services.ts`
- `src/core/ServicesProvider.tsx`
- `src/hooks/useServices.ts`
- `src/hooks/useDeck.ts`
- `src/hooks/useGameSession.ts`

```ts
// src/core/services.ts — ONE place where impls are chosen
export const services = {
  deckService: new LocalDeckService(),
  selectionStrategy: new WeightedStrategy(),
  entitlements: new AllUnlockedEntitlementService(),
};
export type Services = typeof services;
```

`ServicesProvider` puts this on context. `useServices()` returns it. `useDeck(id)` is a thin wrapper that does `useEffect(() => services.deckService.get(id), [id])`.

### Step 6 — React↔Phaser bridge
**File:** `src/ui/components/PhaserGame.tsx`

```tsx
interface Props {
  game: MiniGame;
  context: GameContext;
  onEnd: (results: SessionResult[]) => void;
}
```

Mounts a `Phaser.Game` with config:
```ts
{
  type: Phaser.AUTO,
  parent: ref.current,           // div ref
  width: 360, height: 640,       // scaled responsively
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
}
```

Registers `game.getSceneClass()` and starts it with `context` as scene data. On `session.end`, calls `onEnd(session.results)`. Cleans up `Phaser.Game` instance on unmount.

### Step 7 — Shared game helpers
**Files:** `src/games/shared/decoyPicker.ts`, `feedbackTweens.ts`, `wordLabel.ts`

- `decoyPicker(deck, correct, n)` → array of `n` other words (random, no repeats)
- `feedbackTweens.squashStretch(scene, sprite)`, `.shake(scene)`, `.starBurst(scene, x, y)`
- `wordLabel(scene, x, y, text)` — creates a positioned DOM element overlay tracked via `scene.add.dom`. Returns a handle with `.setText()`, `.setPosition()`, `.destroy()`.

### Step 8 — Game template
**Folder:** `src/games/_template/`
- `index.ts` exports a `MiniGame` with a `TemplateScene`
- `TemplateScene.ts` — minimal: receives `GameContext`, calls `session.start()` on create, emits one `recordCorrect` on tap, calls `session.end()` after 5s
- `tuning.ts` — empty placeholder constants
- `README.md` — "How to add a new game: 1. Copy this folder and rename. 2. Update meta in `index.ts`. 3. Add to `src/games/index.ts` `ALL_GAMES`."

### Step 9 — UI screens & routing
**Files:** `src/App.tsx` (router), `src/ui/screens/{Home,DeckEditor,SlotMachine,Play,Results}Screen.tsx`

Routes:
- `/` → HomeScreen (deck list, "Create deck", "Play" on a deck)
- `/decks/:id/edit` → DeckEditorScreen (textarea + save)
- `/decks/:id/play` → SlotMachineScreen (animated reel of icons → picks one → navigates to /play)
- `/decks/:id/play/:gameId` → PlayScreen (mounts PhaserGame)
- `/decks/:id/results` → ResultsScreen (reads last session results from in-memory store, shows missed words, calls `recordWordResult` for each, then "Play again")

Slot machine pulls candidate game ids from `entitlements.unlockedGameIds()` — never hardcoded. MVP: returns all 4.

### Step 10 — Implement Word-Whack
Spec in plan §"The 4 mini-games > 1. Word-Whack". `tuning.ts`:
```ts
export const tuning = {
  popIntervalMs: 1200,
  molesPerPop: 3,
  decoysPerMole: 2,
  basePoints: 100,
  comboMultiplierStep: 0.5,
};
```

### Step 11 — Word-Snake
Spec §"2. Word-Snake".

### Step 12 — Word-Bird
Spec §"3. Word-Bird". Use Phaser Arcade Physics gravity.

### Step 13 — Ninja-Slash
Spec §"4. Ninja-Slash". Swipe detection via Phaser pointer events tracking pointer move and computing intersection with fruit bounds.

### Step 14 — PWA polish
Manifest, icons (any free pixel-art set as placeholder), service worker. Test "Add to Home Screen."

### Step 15 — Verification
Run all 9 checks from the plan §Verification.

---

## Pixel-art assets

Use [Kenney.nl](https://kenney.nl) free pixel packs as placeholders. Aseprite later for custom art. Place atlases in `public/sprites/` and load via `scene.load.atlas(...)`.

---

## Things explicitly out of scope (do not build)

- Games 5–8
- Real Supabase backend
- Real Stripe / RevenueCat paywall (no paywall UI in MVP)
- Sound effects / music
- Account / login flows
- App Store / Play Store packaging

---

## When in doubt

1. Re-read the plan: `/Users/christobelchan/.claude/plans/project-word-party-game-eager-kettle.md`
2. Check the hard rules above
3. Ask the architect (the user)
