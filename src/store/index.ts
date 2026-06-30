import { create } from 'zustand';

interface BalanceState {
  remaining: number;
  totalSpent: number;
  generalSavings: number;
  totalMoney: number;
  syncStatus: 'idle' | 'syncing' | 'error';
  setBalances: (balances: Partial<BalanceState>) => void;
  setSyncStatus: (status: 'idle' | 'syncing' | 'error') => void;
}

export const useBalanceStore = create<BalanceState>((set) => ({
  remaining: 0,
  totalSpent: 0,
  generalSavings: 0,
  totalMoney: 0,
  syncStatus: 'idle',
  setBalances: (balances) => set((state) => ({ ...state, ...balances })),
  setSyncStatus: (status) => set({ syncStatus: status }),
}));
