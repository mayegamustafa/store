'use client';

interface RuntimeConfig {
  apiBaseUrl: string;
  apiBackupUrl: string | null;
}

const CACHE_KEY = 'admin_app_config_cache';
const DEFAULT_API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function readCached(): RuntimeConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RuntimeConfig;
    if (!parsed?.apiBaseUrl) return null;
    return { apiBaseUrl: parsed.apiBaseUrl, apiBackupUrl: parsed.apiBackupUrl || null };
  } catch {
    return null;
  }
}

function writeCached(config: RuntimeConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(config));
  } catch {
    // no-op
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  return readCached() || { apiBaseUrl: DEFAULT_API_BASE, apiBackupUrl: null };
}

export function getRuntimeApiBaseUrl(): string {
  return getRuntimeConfig().apiBaseUrl;
}

export function getRuntimeWsBaseUrl(): string {
  return getRuntimeApiBaseUrl().replace('/api/v1', '');
}

export async function refreshRuntimeConfig(): Promise<RuntimeConfig> {
  const current = getRuntimeConfig();
  const candidates = [current.apiBaseUrl];
  if (current.apiBackupUrl && current.apiBackupUrl !== current.apiBaseUrl) {
    candidates.push(current.apiBackupUrl);
  }

  for (const baseUrl of candidates) {
    try {
      const res = await fetch(`${baseUrl}/config/public`, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      if (!data?.apiBaseUrl) continue;
      const next = {
        apiBaseUrl: data.apiBaseUrl as string,
        apiBackupUrl: (data.apiBackupUrl || data.backup || null) as string | null,
      };
      writeCached(next);
      return next;
    } catch {
      continue;
    }
  }

  return current;
}
