'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getRuntimeApiBaseUrl } from '@/lib/runtime-config';

// Detect device type from userAgent
function getDevice(): 'Mobile' | 'Tablet' | 'Desktop' {
  if (typeof navigator === 'undefined') return 'Desktop';
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'Tablet';
  if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

// Detect browser name+version
function getBrowser(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua))     return `Edge ${ua.match(/Edg\/([\d.]+)/)?.[1]?.split('.')[0] ?? ''}`;
  if (/Chrome\//.test(ua))  return `Chrome ${ua.match(/Chrome\/([\d.]+)/)?.[1]?.split('.')[0] ?? ''}`;
  if (/Firefox\//.test(ua)) return `Firefox ${ua.match(/Firefox\/([\d.]+)/)?.[1]?.split('.')[0] ?? ''}`;
  if (/Safari\//.test(ua))  return `Safari ${ua.match(/Version\/([\d.]+)/)?.[1]?.split('.')[0] ?? ''}`;
  return 'Other';
}

// Session ID (persisted in sessionStorage)
function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') return '';
  let sid = sessionStorage.getItem('_ts_sid');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('_ts_sid', sid);
  }
  return sid;
}

export function PageTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string>('');

  useEffect(() => {
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    const payload = {
      page:      pathname,
      referrer:  document.referrer || undefined,
      device:    getDevice(),
      browser:   getBrowser(),
      sessionId: getSessionId(),
    };

    // Fire-and-forget — don't block UI, don't throw on error
    fetch(`${getRuntimeApiBaseUrl()}/analytics/visit`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {/* silent */});
  }, [pathname]);

  return null;
}
