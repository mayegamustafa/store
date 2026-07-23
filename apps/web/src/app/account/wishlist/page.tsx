'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * The account wishlist lives at /wishlist (account-synced store).
 * This route just forwards there so old links keep working.
 */
export default function AccountWishlistRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/wishlist');
  }, [router]);
  return null;
}
