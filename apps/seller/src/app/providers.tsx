'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    // Refetch on tab focus / reconnect so sellers see fresh orders without reloading.
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
    },
  }));
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
