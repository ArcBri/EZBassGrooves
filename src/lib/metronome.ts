import type { Bar, StringIndex } from '../types'
import { getAudioContext, unlockAudio } from './audioContext'
import { barDurationSeconds, durationToBeats } from './notation'
import { fretToMidi } from './scale'

export type Tick = {
  barIndex: number
  slotIndex: number
  isBeat: boolean
}

export type PlayBar = {
  barIndex: number
  bpm: number
  bar: Bar
}

type ScheduledEvent =
  | { kind: 'slot'; time: number; barIndex: number; slotIndex: number }
  | { kind: 'click'; time: number; accent: boolean }
  | { kind: 'note'; time: number; midi: number; duration: number }
  | { kind: 'end'; time: number }

const KIND_RANK: Record<ScheduledEvent['kind'], number> = {
  click: 0,
  note: 1,
  slot: 2,
  end: 3,
}

function noteKey(slotIndex: number, string: StringIndex, fret: number): string {
  return `${slotIndex}:${string}:${fret}`
}

function buildSchedule(bars: PlayBar[], startBarIndex = 0): ScheduledEvent[] {
  const events: ScheduledEvent[] = []
  let time = 0

  for (let i = startBarIndex; i < bars.length; i++) {
    const { barIndex, bpm, bar } = bars[i]!
    const secPerBeat = 60 / bpm
    const barStart = time
    const clickStepSeconds = (4 / bar.timeSignature.den) * secPerBeat
    let beatInBar = 0

    for (let beat = 0; beat < bar.timeSignature.num; beat++) {
      events.push({
        kind: 'click',
        time: barStart + beat * clickStepSeconds,
        accent: beat === 0,
      })
    }

    const consumedByTie = new Set<string>()

    for (let slotIndex = 0; slotIndex < bar.slots.length; slotIndex++) {
      const slot = bar.slots[slotIndex]!
      const slotBeats = durationToBeats(slot.duration)
      const slotStart = barStart + beatInBar * secPerBeat

      events.push({ kind: 'slot', time: slotStart, barIndex, slotIndex })

      for (const note of slot.notes) {
        if (note.fret === 'X') continue
        if (consumedByTie.has(noteKey(slotIndex, note.string, note.fret))) continue

        let sustainBeats = slotBeats
        let cursor = slotIndex
        while (
          bar.slots[cursor]!.tiedToNext &&
          cursor + 1 < bar.slots.length &&
          bar.slots[cursor + 1]!.notes.some(
            (n) => n.string === note.string && n.fret === note.fret,
          )
        ) {
          cursor += 1
          sustainBeats += durationToBeats(bar.slots[cursor]!.duration)
          consumedByTie.add(noteKey(cursor, note.string, note.fret))
        }

        events.push({
          kind: 'note',
          time: slotStart,
          midi: fretToMidi(note.string, note.fret),
          duration: sustainBeats * secPerBeat,
        })
      }

      beatInBar += slotBeats
    }

    time = barStart + barDurationSeconds(bar, bpm)
  }

  events.push({ kind: 'end', time })

  events.sort((a, b) => a.time - b.time || KIND_RANK[a.kind] - KIND_RANK[b.kind])
  return events
}

function playClick(ctx: AudioContext, dest: AudioNode, when: number, accent: boolean) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(dest)
  osc.frequency.value = accent ? 1200 : 800
  osc.type = accent ? 'square' : 'sine'
  const peak = accent ? 0.35 : 0.2
  gain.gain.setValueAtTime(0, when)
  gain.gain.linearRampToValueAtTime(peak, when + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.05)
  osc.start(when)
  osc.stop(when + 0.06)
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function playNote(ctx: AudioContext, dest: AudioNode, when: number, midi: number, duration: number) {
  const freq = midiToFreq(midi)
  const fundamental = ctx.createOscillator()
  const sub = ctx.createOscillator()
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()

  fundamental.type = 'triangle'
  fundamental.frequency.value = freq
  sub.type = 'sine'
  sub.frequency.value = freq * 0.5

  filter.type = 'lowpass'
  filter.frequency.value = Math.min(4000, freq * 6)
  filter.Q.value = 0.5

  fundamental.connect(filter)
  sub.connect(filter)
  filter.connect(gain)
  gain.connect(dest)

  const peak = 0.28
  const sustain = peak * 0.45
  const totalDur = Math.max(0.12, duration)
  const releaseStart = Math.max(0.06, totalDur - 0.06)

  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.008)
  gain.gain.exponentialRampToValueAtTime(sustain, when + 0.12)
  gain.gain.setValueAtTime(sustain, when + releaseStart)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + totalDur)

  const stopAt = when + totalDur + 0.05
  fundamental.start(when)
  sub.start(when)
  fundamental.stop(stopAt)
  sub.stop(stopAt)
}

export type MetronomeVolume = {
  click: number
  synth: number
}

export class Metronome {
  private onTick: (t: Tick) => void
  private onStop: () => void
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private clickGain: GainNode | null = null
  private synthGain: GainNode | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null
  private timeoutIds: ReturnType<typeof setTimeout>[] = []
  private events: ScheduledEvent[] = []
  private startTime = 0
  private nextIndex = 0
  private stopped = false
  private volume: MetronomeVolume = { click: 1, synth: 1 }

  constructor(opts: { onTick: (t: Tick) => void; onStop: () => void }) {
    this.onTick = opts.onTick
    this.onStop = opts.onStop
  }

  async start(plan: {
    bars: PlayBar[]
    startBarIndex?: number
    volume?: Partial<MetronomeVolume>
  }): Promise<void> {
    this.stop()
    this.stopped = false

    // Unlock + grab the shared AudioContext. Doing this synchronously (no
    // await before it) keeps us inside the user-gesture frame on iOS so the
    // context can actually start producing sound.
    unlockAudio()
    const ctx = getAudioContext()
    if (!ctx) {
      this.onStop()
      return
    }
    this.ctx = ctx
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        // ignore; iOS will unlock once a user gesture lands
      }
    }

    this.volume = {
      click: plan.volume?.click ?? this.volume.click,
      synth: plan.volume?.synth ?? this.volume.synth,
    }

    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.8
    this.masterGain.connect(this.ctx.destination)

    this.clickGain = this.ctx.createGain()
    this.clickGain.gain.value = this.volume.click
    this.clickGain.connect(this.masterGain)

    this.synthGain = this.ctx.createGain()
    this.synthGain.gain.value = this.volume.synth
    this.synthGain.connect(this.masterGain)

    this.events = buildSchedule(plan.bars, plan.startBarIndex ?? 0)
    if (this.events.length === 0) {
      this.onStop()
      return
    }

    this.startTime = this.ctx.currentTime + 0.05
    this.nextIndex = 0
    const scheduleAhead = 0.1
    const lookahead = 25

    const scheduler = () => {
      if (this.stopped || !this.ctx || !this.clickGain || !this.synthGain) return
      const now = this.ctx.currentTime
      while (
        this.nextIndex < this.events.length &&
        this.events[this.nextIndex]!.time + this.startTime < now + scheduleAhead
      ) {
        const ev = this.events[this.nextIndex]!
        const when = this.startTime + ev.time
        const delayMs = Math.max(0, (when - now) * 1000)

        if (ev.kind === 'click') {
          playClick(this.ctx, this.clickGain, when, ev.accent)
        } else if (ev.kind === 'note') {
          playNote(this.ctx, this.synthGain, when, ev.midi, ev.duration)
        } else if (ev.kind === 'slot') {
          const tid = window.setTimeout(() => {
            if (!this.stopped) {
              this.onTick({
                barIndex: ev.barIndex,
                slotIndex: ev.slotIndex,
                isBeat: false,
              })
            }
          }, delayMs)
          this.timeoutIds.push(tid)
        }
        this.nextIndex++
      }

      if (this.nextIndex >= this.events.length) {
        const last = this.events[this.events.length - 1]!
        const endTime = this.startTime + last.time + 0.15
        const endDelay = Math.max(0, (endTime - now) * 1000)
        const tid = window.setTimeout(() => {
          if (!this.stopped) this.finish()
        }, endDelay)
        this.timeoutIds.push(tid)
        if (this.intervalId) {
          clearInterval(this.intervalId)
          this.intervalId = null
        }
      }
    }

    this.intervalId = setInterval(scheduler, lookahead)
    scheduler()
  }

  private finish() {
    if (this.stopped) return
    this.stopped = true
    this.clearTimers()
    this.cleanupAudio()
    this.onTick({ barIndex: -1, slotIndex: -1, isBeat: false })
    this.onStop()
  }

  private clearTimers() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    for (const id of this.timeoutIds) clearTimeout(id)
    this.timeoutIds = []
  }

  private cleanupAudio() {
    // The AudioContext is shared across plays so we don't close it here -
    // closing destroys the iOS unlock and forces re-priming on the next play.
    // Disconnect the gain chain instead to silence any in-flight audio
    // immediately.
    try {
      this.masterGain?.disconnect()
      this.clickGain?.disconnect()
      this.synthGain?.disconnect()
    } catch {
      // ignore - already disconnected or context closed
    }
    this.ctx = null
    this.masterGain = null
    this.clickGain = null
    this.synthGain = null
  }

  stop() {
    this.stopped = true
    this.clearTimers()
    this.cleanupAudio()
    this.events = []
    this.nextIndex = 0
  }

  setVolume(volume: Partial<MetronomeVolume>) {
    if (volume.click != null) {
      this.volume.click = volume.click
      if (this.clickGain && this.ctx) {
        this.clickGain.gain.setTargetAtTime(volume.click, this.ctx.currentTime, 0.01)
      }
    }
    if (volume.synth != null) {
      this.volume.synth = volume.synth
      if (this.synthGain && this.ctx) {
        this.synthGain.gain.setTargetAtTime(volume.synth, this.ctx.currentTime, 0.01)
      }
    }
  }
}
