'use client';

export interface RuntimeConfig {
  apiBaseUrl: string;
  apiBackupUrl: string | null;
  uploadBaseUrl?: string;
  maintenanceMode?: boolean;
}

const DEFAULT_API_BASE_URL = '/api/v1';
const CACHE_KEY = 'app_config_cache';
const REFRESH_MS = 5 * 60 * 1000;

let refreshTimer: ReturnType<typeof setInterval> | null = null;

function readCachedConfig(): RuntimeConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RuntimeConfig;
    if (!parsed?.apiBaseUrl || typeof parsed.apiBaseUrl !== 'string') return null;
    return {
      apiBaseUrl: parsed.apiBaseUrl,
      apiBackupUrl: parsed.apiBackupUrl || null,
      uploadBaseUrl: parsed.uploadBaseUrl,
      maintenanceMode: parsed.maintenanceMode,
    };
  } catch {
    return null;
  }
}

function writeCachedConfig(config: RuntimeConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('app-config-updated', { detail: config }));
  } catch {
    // no-op
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  const cached = readCachedConfig();
  if (cached) return cached;

  const envApi = process.env.NEXT_PUBLIC_API_URL;
  return {
    apiBaseUrl: envApi || DEFAULT_API_BASE_URL,
    apiBackupUrl: null,
  };
}

export function getRuntimeApiBaseUrl(): string {
  return getRuntimeConfig().apiBaseUrl;
}

export async function refreshRuntimeConfig(): Promise<RuntimeConfig> {
  const current = getRuntimeConfig();
  const candidates = [current.apiBaseUrl];
  if (current.apiBackupUrl && current.apiBackupUrl !== current.apiBaseUrl) {
    candidates.push(current.apiBackupUrl);
  }
  if (!candidates.includes(DEFAULT_API_BASE_URL)) {
    candidates.push(DEFAULT_API_BASE_URL);
  }

  for (const baseUrl of candidates) {
    try {
      const res = await fetch(`${baseUrl}/config/public`, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      if (!data?.apiBaseUrl) continue;
      const normalized: RuntimeConfig = {
        apiBaseUrl: data.apiBaseUrl,
        apiBackupUrl: data.apiBackupUrl || data.backup || null,
        uploadBaseUrl: data.uploadBaseUrl,
        maintenanceMode: data.maintenanceMode,
      };
      writeCachedConfig(normalized);
      return normalized;
    } catch {
      continue;
    }
  }

  return current;
}

export function startRuntimeConfigAutoRefresh() {
  if (typeof window === 'undefined' || refreshTimer) return;
  refreshRuntimeConfig();
  refreshTimer = setInterval(() => {
    refreshRuntimeConfig();
  }, REFRESH_MS);
}
