import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SellerUser { id: string; name: string; phone: string; email?: string; role: string; }
interface SellerStore {
  user: SellerUser | null;
  token: string | null;
  sellerProfile: any | null;
  setUser: (user: SellerUser, token: string) => void;
  setSellerProfile: (profile: any) => void;
  logout: () => void;
}

export const useSellerStore = create<SellerStore>()(
  persist(
    (set) => ({
      user: null, token: null, sellerProfile: null,
      setUser: (user, token) => {
        localStorage.setItem('sellerToken', token);
        document.cookie = `sellerToken=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        set({ user, token });
      },
      setSellerProfile: (sellerProfile) => set({ sellerProfile }),
      logout: () => {
        localStorage.removeItem('sellerToken');
        document.cookie = 'sellerToken=; path=/; max-age=0';
        set({ user: null, token: null, sellerProfile: null });
      },
    }),
    { name: 'seller-store' }
  )
);
