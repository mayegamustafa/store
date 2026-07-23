import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { wishlistApi } from '@/lib/api';

interface WishlistItem {
  id: string; // product id
  name: string;
  slug: string;
  image?: string;
  price: number;
}

interface WishlistStore {
  items: WishlistItem[];
  add: (item: WishlistItem) => void;
  remove: (id: string) => void;
  toggle: (item: WishlistItem) => void;
  has: (id: string) => boolean;
  clear: () => void;
  /** Pull the account wishlist from the server and merge local (guest) items into it. */
  syncFromServer: () => Promise<void>;
}

/** True when a JWT is present — i.e. the shopper is signed in. */
function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem('access_token')) return true;
  try {
    const persisted = JSON.parse(localStorage.getItem('totalstore-auth') ?? '{}');
    return !!persisted?.state?.token;
  } catch {
    return false;
  }
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      add: (item) => {
        if (get().items.find((i) => i.id === item.id)) return;
        set((s) => ({ items: [...s.items, item] }));
        // Persist to the account so it follows the shopper across devices.
        if (isLoggedIn()) wishlistApi.add(item.id).catch(() => {});
      },

      remove: (id) => {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        if (isLoggedIn()) wishlistApi.remove(id).catch(() => {});
      },

      toggle: (item) => {
        const exists = get().items.some((i) => i.id === item.id);
        if (exists) get().remove(item.id);
        else get().add(item);
      },

      has: (id) => get().items.some((i) => i.id === id),

      clear: () => {
        const ids = get().items.map((i) => i.id);
        set({ items: [] });
        if (isLoggedIn()) ids.forEach((id) => wishlistApi.remove(id).catch(() => {}));
      },

      syncFromServer: async () => {
        if (!isLoggedIn()) return;
        try {
          const res = await wishlistApi.list();
          const rows: any[] = (res.data as any) || [];
          const server: WishlistItem[] = rows
            .filter((w) => w.product)
            .map((w) => ({
              id: w.product.id,
              name: w.product.name,
              slug: w.product.slug,
              image: w.product.images?.[0],
              price: Number(w.product.basePrice) || 0,
            }));
          const serverIds = new Set(server.map((s) => s.id));

          // Push any local (guest) items the server doesn't have yet.
          const localOnly = get().items.filter((i) => !serverIds.has(i.id));
          await Promise.all(localOnly.map((i) => wishlistApi.add(i.id).catch(() => {})));

          // Merge: server items + local-only items (which now exist on the server too).
          set({ items: [...server, ...localOnly] });
        } catch {
          // Keep whatever is cached locally on failure.
        }
      },
    }),
    { name: 'totalstore-wishlist' },
  ),
);
