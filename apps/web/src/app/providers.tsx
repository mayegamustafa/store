'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import '@/i18n';
import { SettingsProvider, useSettings } from '@/contexts/settings';
import { AppConfigProvider } from '@/lib/app-config';
import { GoogleOAuthProvider } from '@react-oauth/google';

/** Inner wrapper that reads Google Client ID from the settings context */
function DynamicGoogleProvider({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const clientId = settings.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 1000, retry: 1 } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <SettingsProvider>
          <AppConfigProvider>
            <DynamicGoogleProvider>
              {children}
            </DynamicGoogleProvider>
          </AppConfigProvider>
        </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
