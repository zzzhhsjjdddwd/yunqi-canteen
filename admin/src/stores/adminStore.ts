import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminStore {
  isAuthenticated: boolean;
  admin: { id: string; username: string } | null;
  token: string | null;
  login: (token: string, admin: { id: string; username: string }) => void;
  logout: () => void;
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      admin: null,
      token: null,

      login: (token, admin) => {
        localStorage.setItem('admin-token', token);
        set({ isAuthenticated: true, admin, token });
      },

      logout: () => {
        localStorage.removeItem('admin-token');
        set({ isAuthenticated: false, admin: null, token: null });
      },
    }),
    {
      name: 'admin-storage',
    }
  )
);
