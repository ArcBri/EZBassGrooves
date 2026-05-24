export type StringIndex = 0 | 1 | 2 | 3

export type Duration = 'w' | 'h.' | 'h' | 'q.' | 'q' | '8' | '16'

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
  bpmOverride?: number
}

export type Groove = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  bars: Bar[]
  tags?: string[]
  favorite?: boolean
  bpm?: number
  defaultTimeSignature?: TimeSignature
}

export const DEFAULT_BPM = 100

export type PlaybackVolume = {
  click: number
  synth: number
}

export const DEFAULT_PLAYBACK_VOLUME: PlaybackVolume = {
  click: 1,
  synth: 1,
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
  w: 4,
  'h.': 3,
  h: 2,
  'q.': 1.5,
  q: 1,
  '8': 0.5,
  '16': 0.25,
}

export const DURATION_LABELS: Record<Duration, string> = {
  w: '𝅝',
  'h.': '𝅗𝅥.',
  h: '𝅗𝅥',
  'q.': '♩.',
  q: '♩',
  '8': '♪',
  '16': '♬',
}

export const DURATION_ORDER: Duration[] = ['w', 'h.', 'h', 'q.', 'q', '8', '16']

export function isDotted(duration: Duration): boolean {
  return duration === 'h.' || duration === 'q.'
}
