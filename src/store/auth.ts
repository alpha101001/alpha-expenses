import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  householdId: string | null;
  setUser: (user: User | null, session: Session | null) => void;
  setHouseholdId: (id: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  householdId: null,
  setUser: (user, session) => set({ user, session }),
  setHouseholdId: (householdId) => set({ householdId }),
}));
