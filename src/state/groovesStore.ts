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
  hydrate: () => void
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

  return {
    grooves: [],
    noteDisplayMode: 'fret',
    playbackVolume: DEFAULT_PLAYBACK_VOLUME,
    clipboardBars: [],
    hydrated: false,

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
      })
    },

    setNoteDisplayMode: (mode) => {
      set({ noteDisplayMode: mode })
      saveToStorage(get().grooves, mode, get().playbackVolume, get().clipboardBars)
    },

    setPlaybackVolume: (volume) => {
      const next: PlaybackVolume = {
        click: volume.click != null ? clampVolume(volume.click) : get().playbackVolume.click,
        synth: volume.synth != null ? clampVolume(volume.synth) : get().playbackVolume.synth,
      }
      set({ playbackVolume: next })
      saveToStorage(get().grooves, get().noteDisplayMode, next, get().clipboardBars)
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
          bars: [...g.bars, createEmptyBar(g.defaultTimeSignature)],
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

    toggleFavorite: (grooveId) => {
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => ({
          ...g,
          favorite: !g.favorite,
          updatedAt: Date.now(),
        }))
        persist(grooves)
        return { grooves }
      })
    },

    setTags: (grooveId, tags) => {
      const normalized = normalizeTags(tags)
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => ({
          ...g,
          tags: normalized.length > 0 ? normalized : undefined,
          updatedAt: Date.now(),
        }))
        persist(grooves)
        return { grooves }
      })
    },

    setBpm: (grooveId, bpm) => {
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => ({
          ...g,
          bpm,
          updatedAt: Date.now(),
        }))
        persist(grooves)
        return { grooves }
      })
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
        persist(grooves)
        return { grooves }
      })
    },

    setGrooveTimeSignature: (grooveId, timeSignature) => {
      set((s) => {
        const grooves = withUpdated(s.grooves, grooveId, (g) => ({
          ...g,
          defaultTimeSignature: timeSignature,
          updatedAt: Date.now(),
        }))
        persist(grooves)
        return { grooves }
      })
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
        persist(grooves)
        return { grooves }
      })
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
      saveToStorage(
        get().grooves,
        get().noteDisplayMode,
        get().playbackVolume,
        clipboardBars,
      )
    },

    clearClipboard: () => {
      set({ clipboardBars: [] })
      saveToStorage(get().grooves, get().noteDisplayMode, get().playbackVolume, [])
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
        persist(grooves)
        return { grooves }
      })
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
        persist(grooves)
        return { grooves }
      })
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
        persist(grooves)
        return { grooves }
      })
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
        persist(grooves)
        return { grooves }
      })
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
