import React, { createContext, useContext } from 'react';
import type { Services } from './services';

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({
    children,
    services,
}: {
    children: React.ReactNode;
    services: Services;
}): React.ReactElement {
    return (
        <ServicesContext.Provider value={services}>
            {children}
        </ServicesContext.Provider>
    );
}

export function useServices(): Services {
    const services = useContext(ServicesContext);
    if (!services) {
        throw new Error('useServices must be used within a ServicesProvider');
    }
    return services;
}