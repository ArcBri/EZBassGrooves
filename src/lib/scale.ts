import type { Bar, StringIndex } from '../types'
import { ROOT_NOTES } from '../types'

/**
 * Open-string MIDI pitches for standard 4-string bass tuning.
 * Index 0 = G string (highest), 3 = E string (lowest).
 *   E1 = 28, A1 = 33, D2 = 38, G2 = 43
 */
const OPEN_MIDI: Record<StringIndex, number> = {
  0: 43,
  1: 38,
  2: 33,
  3: 28,
}

const OPEN_E_PC = 4

export function fretToMidi(stringIdx: StringIndex, fret: number): number {
  return OPEN_MIDI[stringIdx] + fret
}

export function rootNameToPc(root: string): number | null {
  const idx = (ROOT_NOTES as readonly string[]).indexOf(root)
  return idx === -1 ? null : idx
}

/**
 * Reference root MIDI: the lowest position of the root note on the E-string
 * (fret 0-11). This matches the user's example where B-root resolves to E7.
 */
export function rootMidi(root: string): number | null {
  const pc = rootNameToPc(root)
  if (pc === null) return null
  const distFromE = (pc - OPEN_E_PC + 12) % 12
  return OPEN_MIDI[3] + distFromE
}

type DegreePart = { num: number; acc: '' | 'b' | '#' }

/** Major-scale degree mapping for semitone distance 0..11 above the root. */
const PC_DIST_TO_DEGREE: readonly DegreePart[] = [
  { num: 1, acc: '' },   // 0  root
  { num: 2, acc: 'b' },  // 1
  { num: 2, acc: '' },   // 2
  { num: 3, acc: 'b' },  // 3
  { num: 3, acc: '' },   // 4
  { num: 4, acc: '' },   // 5
  { num: 5, acc: 'b' },  // 6  tritone as b5 (blues-friendly)
  { num: 5, acc: '' },   // 7
  { num: 6, acc: 'b' },  // 8
  { num: 6, acc: '' },   // 9
  { num: 7, acc: 'b' },  // 10
  { num: 7, acc: '' },   // 11
]

/**
 * Format a (string, fret, root) as a scale-degree label.
 * - Notes at or above the root: 1, 2, ..., 7, 8 (octave), 9, ... 15 (two octaves up).
 * - Chromatic notes get a `b` (e.g. `b3`, `b7`).
 * - Notes below the root display the base degree with a `↓` marker.
 */
export function degreeLabel(
  stringIdx: StringIndex,
  fret: number,
  root: string,
): string {
  const rMidi = rootMidi(root)
  if (rMidi === null) return String(fret)
  let dist = fretToMidi(stringIdx, fret) - rMidi
  let octaveOffset = 0
  while (dist < 0) {
    dist += 12
    octaveOffset -= 1
  }
  while (dist >= 12) {
    dist -= 12
    octaveOffset += 1
  }
  const part = PC_DIST_TO_DEGREE[dist]!
  if (octaveOffset === 0) return `${part.acc}${part.num}`
  if (octaveOffset > 0) return `${part.acc}${part.num + octaveOffset * 7}`
  return `${part.acc}${part.num}↓`
}

export type NoteDisplayMode = 'fret' | 'degree'

export function noteLabel(
  mode: NoteDisplayMode,
  stringIdx: StringIndex,
  fret: number | 'X',
  root: string | undefined,
): string {
  if (fret === 'X') return 'X'
  if (mode === 'fret' || !root) return String(fret)
  return degreeLabel(stringIdx, fret, root)
}

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11] as const

export type DegreeAccidental = '' | 'b' | '#'

/** Semitone distance from root for a scale-degree number (1, 2, … 16) and accidental. */
export function degreeToSemitones(num: number, acc: DegreeAccidental): number {
  const octave = Math.floor((num - 1) / 7)
  const stepNum = ((num - 1) % 7) + 1
  let semitones = octave * 12 + MAJOR_STEPS[stepNum - 1]!
  if (acc === 'b') semitones -= 1
  if (acc === '#') semitones += 1
  return semitones
}

export function scaleDegreeToFret(
  stringIdx: StringIndex,
  root: string,
  num: number,
  acc: DegreeAccidental,
): number | null {
  const rMidi = rootMidi(root)
  if (rMidi === null) return null
  const fret = rMidi + degreeToSemitones(num, acc) - OPEN_MIDI[stringIdx]
  if (fret < 0 || fret > 24) return null
  return fret
}

function snapFretToRange(fret: number): number | null {
  if (fret >= 0 && fret <= 24) return fret
  if (fret < 0) {
    const up = fret + 12
    if (up >= 0 && up <= 24) return up
  }
  if (fret > 24) {
    const down = fret - 12
    if (down >= 0 && down <= 24) return down
  }
  return null
}

export function hasAnyNotes(bar: Bar): boolean {
  return bar.slots.some((s) => s.notes.length > 0)
}

/** Preserve scale-degree pattern when changing a bar's root. */
export function transposeBar(bar: Bar, newRoot: string): Bar {
  const oldRoot = bar.rootNote
  if (!oldRoot || oldRoot === newRoot) {
    return { ...bar, rootNote: newRoot }
  }
  const oldRMidi = rootMidi(oldRoot)
  const newRMidi = rootMidi(newRoot)
  if (oldRMidi === null || newRMidi === null) {
    return { ...bar, rootNote: newRoot }
  }

  const slots = bar.slots.map((slot) => ({
    ...slot,
    notes: slot.notes.map((note) => {
      if (note.fret === 'X') return note
      const offset = fretToMidi(note.string, note.fret) - oldRMidi
      const raw = newRMidi + offset - OPEN_MIDI[note.string]
      const snapped = snapFretToRange(raw)
      if (snapped === null) return note
      return { ...note, fret: snapped }
    }),
  }))

  return { ...bar, rootNote: newRoot, slots }
}

export type DegreeButton = { label: string; num: number; acc: DegreeAccidental }

export const DEGREE_KEYPAD_ROWS: DegreeButton[][] = [
  [
    { label: '1', num: 1, acc: '' },
    { label: 'b2', num: 2, acc: 'b' },
    { label: '2', num: 2, acc: '' },
    { label: 'b3', num: 3, acc: 'b' },
    { label: '3', num: 3, acc: '' },
    { label: '4', num: 4, acc: '' },
    { label: 'b5', num: 5, acc: 'b' },
    { label: '5', num: 5, acc: '' },
    { label: 'b6', num: 6, acc: 'b' },
    { label: '6', num: 6, acc: '' },
    { label: 'b7', num: 7, acc: 'b' },
    { label: '7', num: 7, acc: '' },
  ],
  [
    { label: '8', num: 8, acc: '' },
    { label: 'b9', num: 9, acc: 'b' },
    { label: '9', num: 9, acc: '' },
    { label: 'b10', num: 10, acc: 'b' },
    { label: '10', num: 10, acc: '' },
    { label: '11', num: 11, acc: '' },
    { label: 'b12', num: 12, acc: 'b' },
    { label: '12', num: 12, acc: '' },
    { label: 'b13', num: 13, acc: 'b' },
    { label: '13', num: 13, acc: '' },
    { label: 'b14', num: 14, acc: 'b' },
    { label: '14', num: 14, acc: '' },
  ],
  [
    { label: '15', num: 15, acc: '' },
    { label: 'b16', num: 16, acc: 'b' },
    { label: '16', num: 16, acc: '' },
  ],
]
