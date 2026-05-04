import type { MiniGame } from './MiniGame';

let allGames: MiniGame[] = [];

export function registerGames(games: MiniGame[]): void {
    allGames = games;
}

export function getAllGames(): MiniGame[] {
    return allGames;
}

export function getGameById(id: string): MiniGame | undefined {
    return allGames.find((g) => g.meta.id === id);
}