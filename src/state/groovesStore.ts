import { create } from 'zustand'
import type { Bar, Groove, PlaybackVolume, TimeSignature } from '../types'
import { DEFAULT_PLAYBACK_VOLUME } from '../types'
import { createId } from '../lib/ids'
import { cloneBarWithNewIds, createEmptyBar, normalizeTags } from '../lib/notation'
import type { NoteDisplayMode } from '../lib/scale'
import { loadFromStorage, saveToStorage } from '../lib/storage'

type GroovesState = {
  grooves: Groove[]
  noteDisplayMode: NoteDisplayMode
  playbackVolume: PlaybackVolume
  clipboardBars: Bar[]
  hydrated: boolean
  dirtyGrooveIds: Record<string, true>
  hydrate: () => void
  saveGroove: (grooveId: string) => void
  saveAllGrooves: () => void
  discardGrooveChanges: (grooveId: string) => void
  isGrooveDirty: (grooveId: string) => boolean
  hasUnsavedChanges: () => boolean
  setNoteDisplayMode: (mode: NoteDisplayMode) => void
  setPlaybackVolume: (volume: Partial<PlaybackVolume>) => void
  createGroove: (name?: string) => Groove
  renameGroove: (id: string, name: string) => void
  deleteGroove: (id: string) => void
  duplicateGroove: (id: string) => Groove | null
  importGroove: (groove: Groove) => void
  getGroove: (id: string) => Groove | undefined
  addBar: (grooveId: string) => void
  commitBar: (grooveId: string, barIndex: number, bar: Bar) => void
  touchGroove: (grooveId: string) => void
  toggleFavorite: (grooveId: string) => void
  setTags: (grooveId: string, tags: string[]) => void
  setBpm: (grooveId: string, bpm: number | undefined) => void
  setBarBpmOverride: (grooveId: string, barIndex: number, bpm: number | undefined) => void
  setGrooveTimeSignature: (grooveId: string, timeSignature: TimeSignature) => void
  setBarTimeSignature: (grooveId: string, barIndex: number, timeSignature: TimeSignature) => void
  copyBarsToClipboard: (grooveId: string, fromIndex: number, toIndex: number) => void
  clearClipboard: () => void
  duplicateBarsAt: (grooveId: string, fromIndex: number, toIndex: number) => number | null
  deleteBarsAt: (grooveId: string, fromIndex: number, toIndex: number) => number | null
  insertBarsAfter: (grooveId: string, barIndex: number, bars: Bar[]) => number | null
  replaceBarsWith: (
    grooveId: string,
    fromIndex: number,
    toIndex: number,
    bars: Bar[],
  ) => number | null
  allTags: () => string[]
}

function withUpdated(grooves: Groove[], id: string, updater: (g: Groove) => Groove): Groove[] {
  return grooves.map((g) => (g.id === id ? updater(g) : g))
}

function clampVolume(v: number): number {
  if (Number.isNaN(v)) return 0
  return Math.min(1, Math.max(0, v))
}

export const useGroovesStore = create<GroovesState>((set, get) => {
  const persist = (grooves: Groove[]) => {
    saveToStorage(
      grooves,
      get().noteDisplayMode,
      get().playbackVolume,
      get().clipboardBars,
    )
  }

  const markDirty = (grooveId: string) => {
    const current = get().dirtyGrooveIds
    if (current[grooveId]) return
    set({ dirtyGrooveIds: { ...current, [grooveId]: true } })
  }

  const clearDirty = (grooveId: string) => {
    const current = get().dirtyGrooveIds
    if (!current[grooveId]) return
    const next = { ...current }
    delete next[grooveId]
    set({ dirtyGrooveIds: next })
  }

  // Persists settings/clipboard without overwriting on-disk grooves. Dirty
  // grooves in memory stay unsaved until the user explicitly saves.
  const persistSettingsOnly = () => {
    const stored = loadFromStorage()
    const persistedGrooves = stored?.grooves ?? []
    saveToStorage(
      persistedGrooves,
      get().noteDisplayMode,
      get().playbackVolume,
      get().clipboardBars,
    )
  }

  // Applies a mutation to the on-disk grooves list without touching unsaved
  // in-memory edits. Used by list-level/intentional metadata actions (create,
  // delete, rename, favorite, tags, import, duplicate).
  const updateOnDisk = (mutator: (grooves: Groove[]) => Groove[]) => {
    const stored = loadFromStorage()
    const persistedGrooves = stored?.grooves ?? []
    const updated = mutator(persistedGrooves)
    saveToStorage(
      updated,
      get().noteDisplayMode,
      get().playbackVolume,
      get().clipboardBars,
    )
  }

  return {
    grooves: [],
    noteDisplayMode: 'fret',
    playbackVolume: DEFAULT_PLAYBACK_VOLUME,
    clipboardBars: [],
    hydrated: false,
    dirtyGrooveIds: {},

    hydrate: () => {
      if (get().hydrated) return
      const stored = loadFromStorage()
      const storedVolume = stored?.playbackVolume
      const clipboardBars =
        stored?.clipboardBars ??
        (stored?.clipboardBar ? [stored.clipboardBar] : [])
      set({
        grooves: stored?.grooves ?? [],
        noteDisplayMode: stored?.noteDisplayMode ?? 'fret',
        playbackVolume: storedVolume
          ? {
              click: clampVolume(storedVolume.click),
              synth: clampVolume(storedVolume.synth),
            }
          : DEFAULT_PLAYBACK_VOLUME,
        clipboardBars,
        hydrated: true,
        dirtyGrooveIds: {},
      })
    },

    saveGroove: (grooveId) => {
      const inMemory = get().grooves.find((g) => g.id === grooveId)
      if (!inMemory) return
      updateOnDisk((g) => {
        const idx = g.findIndex((x) => x.id === grooveId)
        if (idx < 0) return [...g, inMemory]
        const next = [...g]
        next[idx] = inMemory
        return next
      })
      clearDirty(grooveId)
    },

    saveAllGrooves: () => {
      persist(get().grooves)
      set({ dirtyGrooveIds: {} })
    },

    discardGrooveChanges: (grooveId) => {
      const stored = loadFromStorage()
      const persisted = stored?.grooves ?? []
      const persistedGroove = persisted.find((g) => g.id === grooveId)
      set((s) => {
        let grooves: Groove[]
        if (persistedGroove) {
          grooves = s.grooves.map((g) => (g.id === grooveId ? persistedGroove : g))
        } else {
          grooves = s.grooves.filter((g) => g.id !== grooveId)
        }
        return { grooves }
      })
      clearDirty(grooveId)
    },

    isGrooveDirty: (grooveId) => Boolean(get().dirtyGrooveIds[grooveId]),

    hasUnsavedChanges: () => Object.keys(get().dirtyGrooveIds).length > 0,

    setNoteDisplayMode: (mode) => {
      set({ noteDisplayMode: mode })
      persistSettingsOnly()
    },

    setPlaybackVolume: (volume) => {
      const next: PlaybackVolume = {
        click: volume.click != null ? clampVolume(volume.click) : get().playbackVolume.click,
        synth: volume.synth != null ? clampVolume(volume.synth) : get().playbackVolume.synth,
      }
      set({ playbackVolume: next })
      persistSettingsOnly()
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
      set((s) => ({ grooves: [...s.grooves, groove] }))
      // Brand-new grooves are empty by definition. We do not persist them
      // automatically — they live in memory as "Unsaved" until the user
      // explicitly saves the groove. If the app reloads first, the empty
      // groove is discarded.
      markDirty(groove.id)
      return groove
    },

    renameGroove: (id, name) => {
      const now = Date.now()
      set((s) => ({
        grooves: withUpdated(s.grooves, id, (g) => ({
          ...g,
          name,
          updatedAt: now,
        })),
      }))
      updateOnDisk((g) =>
        g.map((x) => (x.id === id ? { ...x, name, updatedAt: now } : x)),
      )
    },

    deleteGroove: (id) => {
      set((s) => ({ grooves: s.grooves.filter((g) => g.id !== id) }))
      updateOnDisk((g) => g.filter((x) => x.id !== id))
      clearDirty(id)
    },

    duplicateGroove: (id) => {
      const source = get().grooves.find((g) => g.id === id)
      if (!source) return null
      const now = Date.now()
      // If the source is dirty, the copy should mirror what's on disk to keep
      // the duplicate consistent with the saved state. Fall back to the
      // in-memory copy if the source isn't persisted yet.
      const stored = loadFromStorage()
      const persistedSource =
        stored?.grooves.find((g) => g.id === id) ?? source
      const copy: Groove = {
        ...structuredClone(persistedSource),
        id: createId(),
        name: `${persistedSource.name} (copy)`,
        createdAt: now,
        updatedAt: now,
      }
      set((s) => ({ grooves: [...s.grooves, copy] }))
      updateOnDisk((g) => [...g, copy])
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
      set((s) => ({ grooves: [...s.grooves, imported] }))
      updateOnDisk((g) => [...g, imported])
    },

    getGroove: (id) => get().grooves.find((g) => g.id === id),

    addBar: (grooveId) => {
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => ({
          ...g,
          bars: [...g.bars, createEmptyBar(g.defaultTimeSignature)],
          updatedAt: Date.now(),
        }))
        return { grooves }
      })
      markDirty(grooveId)
    },

    commitBar: (grooveId, barIndex, bar) => {
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => {
          const bars = [...g.bars]
          bars[barIndex] = bar
          return { ...g, bars, updatedAt: Date.now() }
        })
        return { grooves }
      })
      markDirty(grooveId)
    },

    touchGroove: (grooveId) => {
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => ({
          ...g,
          updatedAt: Date.now(),
        }))
        return { grooves }
      })
      markDirty(grooveId)
    },

    toggleFavorite: (grooveId) => {
      const now = Date.now()
      let newFavorite = false
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => {
          newFavorite = !g.favorite
          return { ...g, favorite: newFavorite, updatedAt: now }
        })
        return { grooves }
      })
      updateOnDisk((g) =>
        g.map((x) =>
          x.id === grooveId ? { ...x, favorite: newFavorite, updatedAt: now } : x,
        ),
      )
    },

    setTags: (grooveId, tags) => {
      const normalized = normalizeTags(tags)
      const tagsOrUndefined = normalized.length > 0 ? normalized : undefined
      const now = Date.now()
      set((s) => ({
        grooves: withUpdated(s.grooves, grooveId, (g) => ({
          ...g,
          tags: tagsOrUndefined,
          updatedAt: now,
        })),
      }))
      updateOnDisk((g) =>
        g.map((x) =>
          x.id === grooveId
            ? { ...x, tags: tagsOrUndefined, updatedAt: now }
            : x,
        ),
      )
    },

    setBpm: (grooveId, bpm) => {
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => ({
          ...g,
          bpm,
          updatedAt: Date.now(),
        }))
        return { grooves }
      })
      markDirty(grooveId)
    },

    setBarBpmOverride: (grooveId, barIndex, bpm) => {
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => {
          const bars = [...g.bars]
          const bar = bars[barIndex]
          if (!bar) return g
          bars[barIndex] = {
            ...bar,
            bpmOverride: bpm,
          }
          return { ...g, bars, updatedAt: Date.now() }
        })
        return { grooves }
      })
      markDirty(grooveId)
    },

    setGrooveTimeSignature: (grooveId, timeSignature) => {
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => ({
          ...g,
          defaultTimeSignature: timeSignature,
          updatedAt: Date.now(),
        }))
        return { grooves }
      })
      markDirty(grooveId)
    },

    setBarTimeSignature: (grooveId, barIndex, timeSignature) => {
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => {
          const bars = [...g.bars]
          const bar = bars[barIndex]
          if (!bar) return g
          bars[barIndex] = {
            ...bar,
            timeSignature,
          }
          return { ...g, bars, updatedAt: Date.now() }
        })
        return { grooves }
      })
      markDirty(grooveId)
    },

    copyBarsToClipboard: (grooveId, fromIndex, toIndex) => {
      const groove = get().grooves.find((g) => g.id === grooveId)
      if (!groove) return
      const lo = Math.max(0, Math.min(fromIndex, toIndex))
      const hi = Math.min(groove.bars.length - 1, Math.max(fromIndex, toIndex))
      if (lo > hi) return
      const clipboardBars = groove.bars
        .slice(lo, hi + 1)
        .map((b) => cloneBarWithNewIds(b))
      if (clipboardBars.length === 0) return
      set({ clipboardBars })
      persistSettingsOnly()
    },

    clearClipboard: () => {
      set({ clipboardBars: [] })
      persistSettingsOnly()
    },

    duplicateBarsAt: (grooveId, fromIndex, toIndex) => {
      const groove = get().grooves.find((g) => g.id === grooveId)
      if (!groove) return null
      const lo = Math.max(0, Math.min(fromIndex, toIndex))
      const hi = Math.min(groove.bars.length - 1, Math.max(fromIndex, toIndex))
      if (lo > hi) return null
      const insertions = groove.bars
        .slice(lo, hi + 1)
        .map((b) => cloneBarWithNewIds(b))
      const newIndex = hi + 1
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => {
          const bars = [...g.bars]
          bars.splice(newIndex, 0, ...insertions)
          return { ...g, bars, updatedAt: Date.now() }
        })
        return { grooves }
      })
      markDirty(grooveId)
      return newIndex
    },

    deleteBarsAt: (grooveId, fromIndex, toIndex) => {
      const groove = get().grooves.find((g) => g.id === grooveId)
      if (!groove) return null
      const lo = Math.max(0, Math.min(fromIndex, toIndex))
      const hi = Math.min(groove.bars.length - 1, Math.max(fromIndex, toIndex))
      if (lo > hi) return null
      const removalCount = hi - lo + 1
      // Keep at least 1 bar in the groove.
      const safeRemove = Math.min(removalCount, groove.bars.length - 1)
      if (safeRemove <= 0) return null
      const finalLo = lo + (removalCount - safeRemove)
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => {
          const bars = [...g.bars]
          bars.splice(finalLo, safeRemove)
          return { ...g, bars, updatedAt: Date.now() }
        })
        return { grooves }
      })
      markDirty(grooveId)
      return Math.max(0, finalLo - 1)
    },

    insertBarsAfter: (grooveId, barIndex, bars) => {
      const groove = get().grooves.find((g) => g.id === grooveId)
      if (!groove || bars.length === 0) return null
      const insertions = bars.map((b) => cloneBarWithNewIds(b))
      const newIndex = Math.min(barIndex + 1, groove.bars.length)
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => {
          const next = [...g.bars]
          next.splice(newIndex, 0, ...insertions)
          return { ...g, bars: next, updatedAt: Date.now() }
        })
        return { grooves }
      })
      markDirty(grooveId)
      return newIndex
    },

    replaceBarsWith: (grooveId, fromIndex, toIndex, bars) => {
      const groove = get().grooves.find((g) => g.id === grooveId)
      if (!groove || bars.length === 0) return null
      const lo = Math.max(0, Math.min(fromIndex, toIndex))
      const hi = Math.min(groove.bars.length - 1, Math.max(fromIndex, toIndex))
      if (lo > hi) return null
      const removalCount = hi - lo + 1
      const insertions = bars.map((b) => cloneBarWithNewIds(b))
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => {
          const next = [...g.bars]
          next.splice(lo, removalCount, ...insertions)
          return { ...g, bars: next, updatedAt: Date.now() }
        })
        return { grooves }
      })
      markDirty(grooveId)
      return lo
    },

    allTags: () => {
      const tagSet = new Set<string>()
      for (const g of get().grooves) {
        for (const t of g.tags ?? []) {
          tagSet.add(t)
        }
      }
      return [...tagSet].sort()
    },
  }
})
