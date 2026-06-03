import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistItem {
  id: string;
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
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => ({
          items: s.items.find((i) => i.id === item.id) ? s.items : [...s.items, item],
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      toggle: (item) => {
        const exists = get().items.find((i) => i.id === item.id);
        if (exists) {
          set((s) => ({ items: s.items.filter((i) => i.id !== item.id) }));
        } else {
          set((s) => ({ items: [...s.items, item] }));
        }
      },
      has: (id) => !!get().items.find((i) => i.id === id),
      clear: () => set({ items: [] }),
    }),
    { name: 'totalstore-wishlist' }
  )
);
