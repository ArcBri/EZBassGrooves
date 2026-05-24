import type { Bar, Duration, Groove, Slot, StringIndex, TimeSignature } from '../types'
import { DEFAULT_BPM } from '../types'
import { DURATION_BEATS, STRING_LABELS } from '../types'

export type SlotLayout = {
  slot: Slot
  slotIndex: number
  x: number
  width: number
  centerX: number
}

export type BarLayout = {
  slots: SlotLayout[]
  staffTop: number
  staffBottom: number
  lineYs: number[]
  rhythmY: number
  rhythmBaseline: number
}

const PADDING_X = 12
const STAFF_HEIGHT = 80
const RHYTHM_HEIGHT = 36

export function durationToBeats(duration: Duration): number {
  return DURATION_BEATS[duration]
}

export function barTotalBeats(bar: Bar): number {
  return bar.timeSignature.num * (4 / bar.timeSignature.den)
}

export function timeSignatureTotalBeats(ts: TimeSignature): number {
  return ts.num * (4 / ts.den)
}

export function slotsUsedBeats(slots: Slot[]): number {
  return slots.reduce((sum, s) => sum + durationToBeats(s.duration), 0)
}

export function trimSlotsToFit(slots: Slot[], targetBeats: number): Slot[] {
  let used = 0
  const out: Slot[] = []
  for (const slot of slots) {
    const beats = durationToBeats(slot.duration)
    if (used + beats > targetBeats + 1e-9) break
    out.push(slot)
    used += beats
  }
  return out
}

export function remainingBeats(bar: Bar, slots: Slot[] = bar.slots): number {
  return barTotalBeats(bar) - slotsUsedBeats(slots)
}

export function canAppendDuration(bar: Bar, slots: Slot[], duration: Duration): boolean {
  return remainingBeats(bar, slots) >= durationToBeats(duration)
}

export function canChangeSlotDuration(
  bar: Bar,
  slots: Slot[],
  slotIndex: number,
  newDuration: Duration,
): boolean {
  const testSlots = slots.map((s, i) =>
    i === slotIndex ? { ...s, duration: newDuration } : s,
  )
  return slotsUsedBeats(testSlots) <= barTotalBeats(bar)
}

export function layoutBar(
  bar: Bar,
  totalWidth: number,
  staffTop = 28,
  leftReserve = 0,
): BarLayout {
  const innerWidth = totalWidth - PADDING_X * 2 - leftReserve
  const totalBeats = barTotalBeats(bar)
  let x = PADDING_X + leftReserve

  const slots: SlotLayout[] = bar.slots.map((slot, slotIndex) => {
    const beats = durationToBeats(slot.duration)
    const width = (beats / totalBeats) * innerWidth
    const layout: SlotLayout = {
      slot,
      slotIndex,
      x,
      width,
      centerX: x + width / 2,
    }
    x += width
    return layout
  })

  const lineSpacing = STAFF_HEIGHT / 3
  const lineYs = [0, 1, 2, 3].map((i) => staffTop + i * lineSpacing)
  const staffBottom = lineYs[3]!
  const rhythmY = staffBottom + 14
  const rhythmBaseline = rhythmY + RHYTHM_HEIGHT - 8

  return {
    slots,
    staffTop,
    staffBottom,
    lineYs,
    rhythmY,
    rhythmBaseline,
  }
}

export function stringIndexFromY(
  y: number,
  lineYs: number[],
  threshold = 14,
): StringIndex | null {
  let best: { idx: StringIndex; dist: number } | null = null
  for (let i = 0; i < 4; i++) {
    const dist = Math.abs(y - lineYs[i]!)
    if (dist <= threshold && (!best || dist < best.dist)) {
      best = { idx: i as StringIndex, dist }
    }
  }
  return best?.idx ?? null
}

export function stringLabel(s: StringIndex): string {
  return STRING_LABELS[s]
}

/** Group consecutive beamable slots for rhythm rendering */
export function beamGroups(slots: Slot[]): number[][] {
  const groups: number[][] = []
  let current: number[] = []

  const flush = () => {
    if (current.length > 0) {
      groups.push(current)
      current = []
    }
  }

  slots.forEach((slot, i) => {
    if (slot.duration === '8' || slot.duration === '16') {
      current.push(i)
    } else {
      flush()
    }
  })
  flush()
  return groups
}

export function effectiveBpm(groove: Groove, barIndex: number): number {
  const bar = groove.bars[barIndex]
  if (!bar) return groove.bpm ?? DEFAULT_BPM
  return bar.bpmOverride ?? groove.bpm ?? DEFAULT_BPM
}

export function effectiveTimeSignature(groove: Groove, barIndex: number): TimeSignature {
  return groove.bars[barIndex]?.timeSignature ?? groove.defaultTimeSignature ?? { num: 4, den: 4 }
}

export function barDurationSeconds(bar: Bar, bpm: number): number {
  return barTotalBeats(bar) * (60 / bpm)
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const t = raw.trim().toLowerCase()
    if (t && !seen.has(t)) {
      seen.add(t)
      out.push(t)
    }
  }
  return out.sort()
}

export function createEmptyBar(timeSignature: TimeSignature = { num: 4, den: 4 }): Bar {
  return {
    id: crypto.randomUUID(),
    timeSignature,
    slots: [],
  }
}

export function cloneBarWithNewIds(bar: Bar): Bar {
  const cloned = structuredClone(bar)
  cloned.id = crypto.randomUUID()
  cloned.slots = cloned.slots.map((slot) => ({
    ...slot,
    id: crypto.randomUUID(),
  }))
  return cloned
}
