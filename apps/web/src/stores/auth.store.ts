import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: string;
  avatar?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      login: (token, refreshToken, user) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', token);
          localStorage.setItem('refresh_token', refreshToken);
        }
        set({ user, token, isAuthenticated: true });
        // Merge the guest wishlist into the account and pull the saved one.
        import('@/stores/wishlist.store')
          .then((m) => m.useWishlistStore.getState().syncFromServer())
          .catch(() => {});
      },

      logout: () => {
        authApi.logout().catch(() => {});
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          // Clear the persisted Zustand cart so stale items don't survive across sessions
          localStorage.removeItem('totalstore-cart');
          localStorage.removeItem('totalstore-wishlist');
        }
        set({ user: null, token: null, isAuthenticated: false });
        // Token is already gone, so this only resets local state (no server calls).
        import('@/stores/wishlist.store')
          .then((m) => m.useWishlistStore.setState({ items: [] }))
          .catch(() => {});
      },

      setUser: (user) => set({ user }),
    }),
    { name: 'totalstore-auth', partialize: (s) => ({ user: s.user, token: s.token }) },
  ),
);
