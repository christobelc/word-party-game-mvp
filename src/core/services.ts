import { LocalDeckService } from './deck/LocalDeckService';
import { WeightedStrategy } from './selection/WeightedStrategy';
import { AllUnlockedEntitlementService } from './entitlements/AllUnlockedEntitlementService';

export const services = {
    deckService: new LocalDeckService(),
    selectionStrategy: new WeightedStrategy(),
    entitlements: new AllUnlockedEntitlementService(),
};

export type Services = typeof services;