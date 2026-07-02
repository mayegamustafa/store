'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { getRuntimeConfig, refreshRuntimeConfig } from './runtime-config';

interface AppConfigData {
  apiBaseUrl: string;
  apiBackupUrl: string | null;
  uploadBaseUrl: string;
  maintenanceMode: boolean;
  siteName: string;
  apps: {
    buyer: { version: string; minVersion: string; downloadUrl: string; forceUpdate: boolean };
    seller: { version: string; minVersion: string; downloadUrl: string; forceUpdate: boolean };
    rider: { version: string; minVersion: string; downloadUrl: string; forceUpdate: boolean };
  };
}

const DEFAULTS: AppConfigData = {
  apiBaseUrl: getRuntimeConfig().apiBaseUrl,
  apiBackupUrl: null,
  uploadBaseUrl: '',
  maintenanceMode: false,
  siteName: 'TotalStore',
  apps: {
    buyer: { version: '2.0.0', minVersion: '1.0.0', downloadUrl: '/uploads/apps/buyer-latest.apk', forceUpdate: false },
    seller: { version: '2.0.0', minVersion: '1.0.0', downloadUrl: '/uploads/apps/seller-latest.apk', forceUpdate: false },
    rider: { version: '2.0.0', minVersion: '1.0.0', downloadUrl: '/uploads/apps/rider-latest.apk', forceUpdate: false },
  },
};

const CACHE_KEY = 'app_config_cache';
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

const AppConfigContext = createContext<AppConfigData>(DEFAULTS);

export function useAppConfig() {
  return useContext(AppConfigContext);
}

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfigData>(() => {
    const runtime = getRuntimeConfig();
    return {
      ...DEFAULTS,
      apiBaseUrl: runtime.apiBaseUrl,
      apiBackupUrl: runtime.apiBackupUrl,
    };
  });

  const fetchConfig = useCallback(async () => {
    const runtime = await refreshRuntimeConfig();
    try {
      const res = await fetch(`${runtime.apiBaseUrl}/config/public`, { cache: 'no-store' });
      if (res.ok) {
        const data: AppConfigData = await res.json();
        setConfig({ ...DEFAULTS, ...data });
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchConfig();
    const interval = setInterval(fetchConfig, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchConfig]);

  return (
    <AppConfigContext.Provider value={config}>
      {children}
    </AppConfigContext.Provider>
  );
}
