export type StringIndex = 0 | 1 | 2 | 3

export type Duration = 'q' | '8' | '16'

export type Note = {
  string: StringIndex
  fret: number | 'X'
}

export type Slot = {
  id: string
  duration: Duration
  tiedToNext?: boolean
  notes: Note[]
}

export type TimeSignature = {
  num: number
  den: number
}

export type Bar = {
  id: string
  rootNote?: string
  timeSignature: TimeSignature
  slots: Slot[]
}

export type Groove = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  bars: Bar[]
}

export const STRING_LABELS: Record<StringIndex, string> = {
  0: 'G',
  1: 'D',
  2: 'A',
  3: 'E',
}

export const ROOT_NOTES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

export const DURATION_BEATS: Record<Duration, number> = {
  q: 1,
  '8': 0.5,
  '16': 0.25,
}

export const DURATION_LABELS: Record<Duration, string> = {
  q: '♩',
  '8': '♪',
  '16': '♬',
}
