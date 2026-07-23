'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    // Live dashboards: refetch on tab focus, on reconnect, and every 30s so
    // admins see fresh data without reloading.
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchInterval: 30_000,
      },
    },
  }));

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
