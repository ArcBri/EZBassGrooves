import type { Bar, Groove, PlaybackVolume } from '../types'
import type { NoteDisplayMode } from './scale'

const STORAGE_KEY = 'ezbassgrooves.v1'
const LEGACY_STORAGE_KEY = 'groovemaker.v1'

export type PersistedState = {
  version: 1
  grooves: Groove[]
  noteDisplayMode?: NoteDisplayMode
  playbackVolume?: PlaybackVolume
  clipboardBars?: Bar[]
  /** @deprecated kept for backward-compat with older stored state */
  clipboardBar?: Bar | null
}

function readKey(key: string): PersistedState | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedState
    if (parsed.version !== 1 || !Array.isArray(parsed.grooves)) return null
    return parsed
  } catch {
    return null
  }
}

export function loadFromStorage(): PersistedState | null {
  const current = readKey(STORAGE_KEY)
  if (current) return current
  const legacy = readKey(LEGACY_STORAGE_KEY)
  if (legacy) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      // ignore migration failure; legacy still readable next load
    }
    return legacy
  }
  return null
}

export function saveToStorage(
  grooves: Groove[],
  noteDisplayMode: NoteDisplayMode = 'fret',
  playbackVolume?: PlaybackVolume,
  clipboardBars?: Bar[] | null,
): boolean {
  const state: PersistedState = {
    version: 1,
    grooves,
    noteDisplayMode,
    ...(playbackVolume ? { playbackVolume } : {}),
    ...(clipboardBars && clipboardBars.length > 0 ? { clipboardBars } : {}),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch (err) {
    console.warn('Failed to persist app state', err)
    return false
  }
}

export function exportGrooveToFile(groove: Groove): void {
  const blob = new Blob([JSON.stringify({ version: 1, groove }, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${groove.name.replace(/[^\w\-]+/g, '_') || 'groove'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importGrooveFromFile(file: File): Promise<Groove | null> {
  try {
    const text = await file.text()
    const data = JSON.parse(text) as { version?: number; groove?: Groove }
    if (data.groove?.id && data.groove.name && Array.isArray(data.groove.bars)) {
      return data.groove
    }
    const asGroove = data as unknown as Groove
    if (asGroove.id && asGroove.name && Array.isArray(asGroove.bars)) {
      return asGroove
    }
    return null
  } catch {
    return null
  }
}
