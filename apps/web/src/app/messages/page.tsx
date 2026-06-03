import { Suspense } from 'react';
import MessagesClient from './MessagesClient';

export const dynamic = 'force-dynamic';

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading messages...</div>}>
      <MessagesClient />
    </Suspense>
  );
}
