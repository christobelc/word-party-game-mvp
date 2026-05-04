export interface EntitlementService {
    isPro(): Promise<boolean>;
    unlockedGameIds(): Promise<string[]>;
}