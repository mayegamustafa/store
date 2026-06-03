'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useCurrencyStore } from '@/stores/currency.store';

interface SiteSettings {
  SITE_NAME: string;
  SITE_TAGLINE: string;
  SITE_LOGO_URL: string;
  SITE_LOGO_DARK_URL: string;
  SITE_FAVICON_URL: string;
  CURRENCY: string;
  PRIMARY_COLOR: string;
  ACCENT_COLOR: string;
  HEADER_BG_COLOR: string;
  FOOTER_BG_COLOR: string;
  FONT_FAMILY: string;
  BANNER_TEXT: string;
  BANNER_BG_COLOR: string;
  FOOTER_COPYRIGHT: string;
  SOCIAL_FACEBOOK: string;
  SOCIAL_INSTAGRAM: string;
  SOCIAL_TIKTOK: string;
  SOCIAL_TWITTER: string;
  SOCIAL_WHATSAPP: string;
  SOCIAL_YOUTUBE: string;
  MAINTENANCE_MODE: string;
  GOOGLE_ANALYTICS_ID: string;
  GOOGLE_CLIENT_ID: string;
  FACEBOOK_APP_ID: string;
  SITE_PHONE: string;
  SITE_EMAIL: string;
  SITE_ADDRESS: string;
  [key: string]: string;
}

const DEFAULTS: SiteSettings = {
  SITE_NAME: 'TotalStore',
  SITE_TAGLINE: "Africa's #1 Online Marketplace",
  SITE_LOGO_URL: '',
  SITE_LOGO_DARK_URL: '',
  SITE_FAVICON_URL: '',
  CURRENCY: 'UGX',
  PRIMARY_COLOR: '#0ea5e9',
  ACCENT_COLOR: '#f59e0b',
  HEADER_BG_COLOR: '#ffffff',
  FOOTER_BG_COLOR: '#111827',
  FONT_FAMILY: 'Plus Jakarta Sans',
  BANNER_TEXT: '',
  BANNER_BG_COLOR: '#0ea5e9',
  FOOTER_COPYRIGHT: `© ${new Date().getFullYear()} TotalStore. All rights reserved.`,
  SOCIAL_FACEBOOK: '',
  SOCIAL_INSTAGRAM: '',
  SOCIAL_TIKTOK: '',
  SOCIAL_TWITTER: '',
  SOCIAL_WHATSAPP: '',
  SOCIAL_YOUTUBE: '',
  MAINTENANCE_MODE: 'false',
  GOOGLE_ANALYTICS_ID: '',
  GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  FACEBOOK_APP_ID: '',
  SITE_PHONE: '+256 700 000 000',
  SITE_EMAIL: 'support@totalstore.ug',
  SITE_ADDRESS: 'Kampala, Uganda',
};

const SettingsContext = createContext<SiteSettings>(DEFAULTS);

/** Convert #rrggbb to "R G B" space-separated channels (for Tailwind opacity modifiers) */
function hexToRgbChannels(hex: string): string | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}` : null;
}

function applyThemeVars(settings: SiteSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Map of [CSS-channel-var, CSS-hex-var, hex-value]
  const colorMap: [string, string, string][] = [
    ['--primary',    '--color-primary',    settings.PRIMARY_COLOR    || '#0ea5e9'],
    ['--accent',     '--color-accent',     settings.ACCENT_COLOR     || '#f59e0b'],
    ['--header-bg',  '--color-header-bg',  settings.HEADER_BG_COLOR  || '#ffffff'],
    ['--footer-bg',  '--color-footer-bg',  settings.FOOTER_BG_COLOR  || '#111827'],
  ];

  for (const [channelVar, hexVar, hex] of colorMap) {
    if (!hex) continue;
    root.style.setProperty(hexVar, hex);
    const rgb = hexToRgbChannels(hex);
    if (rgb) root.style.setProperty(channelVar, rgb);
  }

  if (settings.BANNER_BG_COLOR) root.style.setProperty('--color-banner-bg', settings.BANNER_BG_COLOR);
  if (settings.FONT_FAMILY) root.style.setProperty('--font-family', settings.FONT_FAMILY);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    fetch(`${apiUrl}/settings/public`)
      .then((r) => r.json())
      .then((data: SiteSettings) => {
        const merged = { ...DEFAULTS, ...data };
        setSettings(merged);
        applyThemeVars(merged);
      })
      .catch(() => {
        // Keep defaults on error
        applyThemeVars(DEFAULTS);
      });
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

/** Format a price using the user-selected currency (dynamically switchable) */
export function useFormatPrice() {
  const { format } = useCurrencyStore();
  return (amount: number) => format(amount);
}
