import { create } from 'zustand'
import type { Bar, Groove } from '../types'
import { createId } from '../lib/ids'
import { createEmptyBar } from '../lib/notation'
import type { NoteDisplayMode } from '../lib/scale'
import { loadFromStorage, saveToStorage } from '../lib/storage'

type GroovesState = {
  grooves: Groove[]
  noteDisplayMode: NoteDisplayMode
  hydrated: boolean
  hydrate: () => void
  setNoteDisplayMode: (mode: NoteDisplayMode) => void
  createGroove: (name?: string) => Groove
  renameGroove: (id: string, name: string) => void
  deleteGroove: (id: string) => void
  duplicateGroove: (id: string) => Groove | null
  importGroove: (groove: Groove) => void
  getGroove: (id: string) => Groove | undefined
  addBar: (grooveId: string) => void
  commitBar: (grooveId: string, barIndex: number, bar: Bar) => void
  touchGroove: (grooveId: string) => void
}

function withUpdated(grooves: Groove[], id: string, updater: (g: Groove) => Groove): Groove[] {
  return grooves.map((g) => (g.id === id ? updater(g) : g))
}

export const useGroovesStore = create<GroovesState>((set, get) => {
  const persist = (grooves: Groove[]) => {
    saveToStorage(grooves, get().noteDisplayMode)
  }

  return {
    grooves: [],
    noteDisplayMode: 'fret',
    hydrated: false,

    hydrate: () => {
      if (get().hydrated) return
      const stored = loadFromStorage()
      set({
        grooves: stored?.grooves ?? [],
        noteDisplayMode: stored?.noteDisplayMode ?? 'fret',
        hydrated: true,
      })
    },

    setNoteDisplayMode: (mode) => {
      set({ noteDisplayMode: mode })
      saveToStorage(get().grooves, mode)
    },

    createGroove: (name = 'New groove') => {
      const now = Date.now()
      const groove: Groove = {
        id: createId(),
        name,
        createdAt: now,
        updatedAt: now,
        bars: [createEmptyBar()],
      }
      set((s) => {
        const grooves = [...s.grooves, groove]
        persist(grooves)
        return { grooves }
      })
      return groove
    },

    renameGroove: (id, name) => {
      set((s) => {
        const grooves = withUpdated(s.grooves, id, (g) => ({
          ...g,
          name,
          updatedAt: Date.now(),
        }))
        persist(grooves)
        return { grooves }
      })
    },

    deleteGroove: (id) => {
      set((s) => {
        const grooves = s.grooves.filter((g) => g.id !== id)
        persist(grooves)
        return { grooves }
      })
    },

    duplicateGroove: (id) => {
      const source = get().grooves.find((g) => g.id === id)
      if (!source) return null
      const now = Date.now()
      const copy: Groove = {
        ...structuredClone(source),
        id: createId(),
        name: `${source.name} (copy)`,
        createdAt: now,
        updatedAt: now,
      }
      set((s) => {
        const grooves = [...s.grooves, copy]
        persist(grooves)
        return { grooves }
      })
      return copy
    },

    importGroove: (groove) => {
      const now = Date.now()
      const imported: Groove = {
        ...structuredClone(groove),
        id: createId(),
        updatedAt: now,
        createdAt: groove.createdAt ?? now,
      }
      set((s) => {
        const grooves = [...s.grooves, imported]
        persist(grooves)
        return { grooves }
      })
    },

    getGroove: (id) => get().grooves.find((g) => g.id === id),

    addBar: (grooveId) => {
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => ({
          ...g,
          bars: [...g.bars, createEmptyBar()],
          updatedAt: Date.now(),
        }))
        persist(grooves)
        return { grooves }
      })
    },

    commitBar: (grooveId, barIndex, bar) => {
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => {
          const bars = [...g.bars]
          bars[barIndex] = bar
          return { ...g, bars, updatedAt: Date.now() }
        })
        persist(grooves)
        return { grooves }
      })
    },

    touchGroove: (grooveId) => {
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => ({
          ...g,
          updatedAt: Date.now(),
        }))
        persist(grooves)
        return { grooves }
      })
    },
  }
})
