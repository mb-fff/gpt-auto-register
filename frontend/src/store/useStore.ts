import { create } from 'zustand';

interface Account {
  id: string;
  email: string;
  status: string;
  profileId: string;
}

interface AppState {
  accounts: Account[];
  loading: boolean;
  fetchAccounts: () => Promise<void>;
  addAccount: (account: Account) => void;
}

export const useStore = create<AppState>((set) => ({
  accounts: [],
  loading: false,

  fetchAccounts: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      set({ accounts: data });
    } catch (error) {
      console.error('获取账号失败', error);
    } finally {
      set({ loading: false });
    }
  },

  addAccount: (account) => set((state) => ({ 
    accounts: [account, ...state.accounts] 
  })),
}));
