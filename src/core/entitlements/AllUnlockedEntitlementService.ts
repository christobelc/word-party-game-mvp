import type { EntitlementService } from './EntitlementService';

export class AllUnlockedEntitlementService implements EntitlementService {
    async isPro(): Promise<boolean> {
        return true;
    }

    async unlockedGameIds(): Promise<string[]> {
        // Return all game ids - in MVP all 4 games are unlocked
        // This will be populated from ALL_GAMES later, but for now return empty
        // and let GameRegistry handle the full list
        return [];
    }
}