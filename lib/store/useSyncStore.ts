import { create } from 'zustand';
import { get, set } from 'idb-keyval';

export interface SyncRequest {
  id: string;
  config: {
    url?: string;
    method?: string;
    data?: unknown;
    headers?: Record<string, string>;
    params?: unknown;
  };
  timestamp: number;
}

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  queue: SyncRequest[];
  setOnline: (status: boolean) => void;
  setSyncing: (status: boolean) => void;
  addRequest: (request: SyncRequest) => Promise<void>;
  removeRequest: (id: string) => Promise<void>;
  loadQueue: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((setStore, getStore) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  queue: [],

  setOnline: (status) => setStore({ isOnline: status }),
  setSyncing: (status) => setStore({ isSyncing: status }),

  addRequest: async (request) => {
    const queue = [...getStore().queue, request];
    setStore({ queue });
    try { await set('sync-queue', queue); } catch (e) { console.error('Failed to save sync queue', e); }
  },

  removeRequest: async (id) => {
    const queue = getStore().queue.filter((req) => req.id !== id);
    setStore({ queue });
    try { await set('sync-queue', queue); } catch (e) { console.error('Failed to save sync queue', e); }
  },

  loadQueue: async () => {
    try {
      const queue = (await get<SyncRequest[]>('sync-queue')) || [];
      setStore({ queue });
    } catch (e) { console.error('Failed to load sync queue', e); }
  },
}));

if (typeof window !== 'undefined') {
  useSyncStore.getState().loadQueue();
}
