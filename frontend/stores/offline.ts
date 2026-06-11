import { defineStore } from 'pinia'

export interface PendingAction {
  id: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  body?: unknown
  createdAt: string
}

interface OfflineState {
  isOnline: boolean
  pendingActions: PendingAction[]
}

export const useOfflineStore = defineStore('offline', {
  state: (): OfflineState => ({
    isOnline: true,
    pendingActions: [],
  }),

  getters: {
    hasPendingActions: (state): boolean => state.pendingActions.length > 0,
  },

  actions: {
    setOnlineStatus(isOnline: boolean): void {
      this.isOnline = isOnline
    },

    enqueueAction(action: Omit<PendingAction, 'id' | 'createdAt'>): void {
      this.pendingActions.push({
        ...action,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      })
    },

    removeAction(id: string): void {
      this.pendingActions = this.pendingActions.filter((action) => action.id !== id)
    },

    clearPendingActions(): void {
      this.pendingActions = []
    },
  },

  persist: true,
})
