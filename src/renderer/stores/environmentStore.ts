import { create } from 'zustand'
import type { Environment, EnvironmentVariable } from '../../shared/types/models'

interface EnvironmentState {
  environments: Environment[]
  activeEnvironment: Environment | null
  isLoading: boolean

  // Actions
  loadEnvironments: () => Promise<void>
  createEnvironment: (name: string) => Promise<Environment>
  updateEnvironment: (id: string, updates: Partial<Environment>) => Promise<void>
  deleteEnvironment: (id: string) => Promise<void>
  setActiveEnvironment: (id: string | null) => Promise<void>
  updateVariables: (id: string, variables: EnvironmentVariable[]) => Promise<void>
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  environments: [],
  activeEnvironment: null,
  isLoading: false,

  loadEnvironments: async () => {
    set({ isLoading: true })
    try {
      const environments = await window.api.db.getEnvironments()
      const active = environments.find((e) => e.isActive) || null
      set({ environments, activeEnvironment: active })
    } finally {
      set({ isLoading: false })
    }
  },

  createEnvironment: async (name: string) => {
    const environment = await window.api.db.createEnvironment(name)
    set((state) => ({
      environments: [...state.environments, environment]
    }))
    return environment
  },

  updateEnvironment: async (id: string, updates: Partial<Environment>) => {
    await window.api.db.updateEnvironment(id, updates)
    set((state) => ({
      environments: state.environments.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
      activeEnvironment:
        state.activeEnvironment?.id === id
          ? { ...state.activeEnvironment, ...updates }
          : state.activeEnvironment
    }))
  },

  deleteEnvironment: async (id: string) => {
    await window.api.db.deleteEnvironment(id)
    set((state) => ({
      environments: state.environments.filter((e) => e.id !== id),
      activeEnvironment:
        state.activeEnvironment?.id === id ? null : state.activeEnvironment
    }))
  },

  setActiveEnvironment: async (id: string | null) => {
    await window.api.db.setActiveEnvironment(id)
    set((state) => ({
      environments: state.environments.map((e) => ({
        ...e,
        isActive: e.id === id
      })),
      activeEnvironment: state.environments.find((e) => e.id === id) || null
    }))
  },

  updateVariables: async (id: string, variables: EnvironmentVariable[]) => {
    await window.api.db.updateEnvironment(id, { variables })
    set((state) => ({
      environments: state.environments.map((e) =>
        e.id === id ? { ...e, variables } : e
      ),
      activeEnvironment:
        state.activeEnvironment?.id === id
          ? { ...state.activeEnvironment, variables }
          : state.activeEnvironment
    }))
  }
}))
