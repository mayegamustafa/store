import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AdminUser {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  role: string;
  avatar?: string | null;
}

interface AdminStore {
  admin: AdminUser | null;
  token: string | null;
  _hasHydrated: boolean;
  setAdmin: (admin: AdminUser, token: string) => void;
  logout: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      admin: null,
      token: null,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setAdmin: (admin, token) => {
        localStorage.setItem('adminToken', token);
        set({ admin, token });
      },
      logout: () => {
        localStorage.removeItem('adminToken');
        set({ admin: null, token: null });
      },
    }),
    {
      name: 'admin-store',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
