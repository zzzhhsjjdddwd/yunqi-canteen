import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../../../shared/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoggedIn: false,

      setAuth: (user, token) => set({
        user,
        token,
        isLoggedIn: true,
      }),

      logout: () => set({
        user: null,
        token: null,
        isLoggedIn: false,
      }),

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),
    }),
    {
      name: 'auth-storage',
    }
  )
);
