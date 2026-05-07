import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse } from '../types';

interface AuthState {
  user: AuthResponse | null;
  setUser: (user: AuthResponse | null) => void;
  updateProfilePhoto: (photoUrl: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      updateProfilePhoto: (photoUrl) => 
        set((state) => ({
          user: state.user ? { ...state.user, profilePhoto: photoUrl } : null,
        })),
      logout: () => {
        set({ user: null });
        localStorage.removeItem('auth-storage');
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
