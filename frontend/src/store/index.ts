import { create } from 'zustand';
import { Alert } from '../types';

interface User {
  username: string;
  role: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  login: (user, token) => set({ isAuthenticated: true, user, token }),
  logout: () => set({ isAuthenticated: false, user: null, token: null }),
}));

interface AlertState {
  alerts: Alert[];
  unreadCount: number;
  // Actions
  addAlert: (alert: Alert) => void;
  incrementUnreadCount: () => void;
  resetUnreadCount: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  unreadCount: 0,

  // Adds new alert to the top of the array
  addAlert: (alert) => 
    set((state) => ({ 
      alerts: [alert, ...state.alerts] 
    })),

  // Increments the badge count
  incrementUnreadCount: () => 
    set((state) => ({ 
      unreadCount: state.unreadCount + 1 
    })),

  // Call this when the user opens the Inbox page
  resetUnreadCount: () => 
    set({ unreadCount: 0 }),
}));
// ─── Entity Store ────────────────────────────────────────────────────────────
import { Entity } from '../types';

interface EntityState {
  entities: Entity[];
  isLoading: boolean;
  setEntities: (entities: Entity[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useEntityStore = create<EntityState>((set) => ({
  entities: [],
  isLoading: false,
  setEntities: (entities) => set({ entities }),
  setLoading: (isLoading) => set({ isLoading }),
}));