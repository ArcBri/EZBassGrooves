import type { Bar, Duration, Slot, StringIndex } from '../types'
import { STRING_LABELS, isDotted } from '../types'
import { barTotalBeats, beamGroups, durationToBeats } from '../lib/notation'
import { noteLabel, type NoteDisplayMode } from '../lib/scale'
import { useLongPress } from '../hooks/useLongPress'

const REST_BASE_GLYPH: Record<Duration, string> = {
  w: '𝄻',
  'h.': '𝄼',
  h: '𝄼',
  'q.': '𝄽',
  q: '𝄽',
  '8': '𝄾',
  '16': '𝄿',
}

export type SystemBar = {
  bar: Bar
  index: number
  bpm: number
  showTimeSignature?: boolean
  showBpm?: boolean
}

type StaffSystemProps = {
  bars: SystemBar[]
  width: number
  onTapBar: (index: number) => void
  onLongPressBar?: (index: number) => void
  isLastSystem?: boolean
  noteDisplayMode?: NoteDisplayMode
  highlightBarIndex?: number | null
  highlightSlotIndex?: number | null
  selectedRange?: { from: number; to: number } | null
}

const PAD_LEFT = 22
const PAD_RIGHT = 8
const TOP_LABEL_H_BASE = 18
const TOP_LABEL_H_TEMPO = 30
const LINE_GAP = 13
const RHYTHM_GAP = 14
const RHYTHM_H = 22
const TS_RESERVE = 16

type SlotLayout = {
  slot: Slot
  slotIndex: number
  x: number
  width: number
  centerX: number
}

type BarLayout = {
  bar: Bar
  index: number
  x: number
  width: number
  slots: SlotLayout[]
}

type BarLayoutExtra = BarLayout & {
  showTimeSignature: boolean
  showBpm: boolean
  bpm: number
  tsReserve: number
}

export function StaffSystem({
  bars,
  width,
  onTapBar,
  onLongPressBar,
  isLastSystem,
  noteDisplayMode = 'fret',
  highlightBarIndex = null,
  highlightSlotIndex = null,
  selectedRange = null,
}: StaffSystemProps) {
  if (bars.length === 0) return null

  const showsAnyTempo = bars.some((b) => b.showBpm)
  const staffTop = showsAnyTempo ? TOP_LABEL_H_TEMPO : TOP_LABEL_H_BASE
  const lineYs = [0, 1, 2, 3].map((i) => staffTop + i * LINE_GAP)
  const staffBottom = lineYs[3]!
  const rhythmY = staffBottom + RHYTHM_GAP
  const rhythmBaseline = rhythmY + RHYTHM_H
  const height = rhythmBaseline + 8

  const innerWidth = width - PAD_LEFT - PAD_RIGHT
  const totalBeats = bars.reduce((s, b) => s + barTotalBeats(b.bar), 0) || 1

  let cursor = PAD_LEFT
  const layouts: BarLayoutExtra[] = bars.map(({ bar, index, bpm, showTimeSignature, showBpm }) => {
    const beats = barTotalBeats(bar)
    const barWidth = (beats / totalBeats) * innerWidth
    const tsReserve = showTimeSignature ? TS_RESERVE : 0
    const slotsInner = Math.max(0, barWidth - tsReserve)
    let slotX = cursor + tsReserve
    const slots: SlotLayout[] = bar.slots.map((slot, slotIndex) => {
      const slotBeats = durationToBeats(slot.duration)
      const w = beats > 0 ? (slotBeats / beats) * slotsInner : 0
      const layout: SlotLayout = {
        slot,
        slotIndex,
        x: slotX,
        width: w,
        centerX: slotX + w / 2,
      }
      slotX += w
      return layout
    })
    const out: BarLayoutExtra = {
      bar,
      index,
      x: cursor,
      width: barWidth,
      slots,
      showTimeSignature: !!showTimeSignature,
      showBpm: !!showBpm,
      bpm,
      tsReserve,
    }
    cursor += barWidth
    return out
  })

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block select-none"
    >
      {/* String labels at the start of the system */}
      {lineYs.map((y, i) => (
        <text
          key={`lbl-${i}`}
          x={4}
          y={y + 4}
          fontSize={9}
          className="fill-slate-400 font-medium"
        >
          {STRING_LABELS[i as StringIndex]}
        </text>
      ))}

      {/* Continuous string lines spanning the whole system */}
      {lineYs.map((y, i) => (
        <line
          key={`line-${i}`}
          x1={PAD_LEFT}
          y1={y}
          x2={width - PAD_RIGHT}
          y2={y}
          stroke="#cbd5e1"
          strokeWidth={1}
        />
      ))}

      {/* Opening barline */}
      <line
        x1={PAD_LEFT}
        y1={lineYs[0]!}
        x2={PAD_LEFT}
        y2={staffBottom}
        stroke="#475569"
        strokeWidth={1.5}
      />

      {layouts.map((l, li) => {
        const isLastBarInSystem = li === layouts.length - 1
        const isLastBarOfPiece = isLastSystem && isLastBarInSystem
        const labelBaselineY = showsAnyTempo ? 24 : 12
        const tsCenterX = l.x + l.tsReserve / 2 + 2
        const tsMidY = (lineYs[0]! + staffBottom) / 2
        const isSelected =
          selectedRange != null &&
          l.index >= Math.min(selectedRange.from, selectedRange.to) &&
          l.index <= Math.max(selectedRange.from, selectedRange.to)
        return (
          <g key={l.bar.id}>
            <BarTapTarget
              x={l.x}
              y={0}
              width={l.width}
              height={height}
              barIndex={l.index}
              onTap={onTapBar}
              onLongPress={onLongPressBar}
              isSelected={isSelected}
            />

            {/* Tempo mark above start (only when changed) */}
            {l.showBpm && (
              <text
                x={l.x + 4}
                y={11}
                fontSize={11}
                className="fill-slate-700 font-semibold pointer-events-none"
              >
                ♩ = {l.bpm}
              </text>
            )}

            {/* Bar number above start */}
            <text
              x={l.x + 4}
              y={labelBaselineY}
              fontSize={9}
              className="fill-slate-400 pointer-events-none"
            >
              {l.index + 1}
            </text>

            {/* Root note above end */}
            {l.bar.rootNote && (
              <text
                x={l.x + l.width - 4}
                y={labelBaselineY + 1}
                textAnchor="end"
                fontSize={11}
                className="fill-slate-700 font-semibold pointer-events-none"
              >
                {l.bar.rootNote}
              </text>
            )}

            {/* Time signature at start of bar where it changes */}
            {l.showTimeSignature && (
              <g className="pointer-events-none">
                <text
                  x={tsCenterX}
                  y={tsMidY - 1}
                  textAnchor="middle"
                  fontSize={14}
                  className="fill-slate-900 font-bold"
                >
                  {l.bar.timeSignature.num}
                </text>
                <text
                  x={tsCenterX}
                  y={tsMidY + 12}
                  textAnchor="middle"
                  fontSize={14}
                  className="fill-slate-900 font-bold"
                >
                  {l.bar.timeSignature.den}
                </text>
              </g>
            )}

            {/* Playhead highlight */}
            {l.slots.map(({ slotIndex, x, width: sw }) => {
              if (highlightBarIndex !== l.index || highlightSlotIndex !== slotIndex) return null
              return (
                <rect
                  key={`hl-${slotIndex}`}
                  x={x}
                  y={lineYs[0]! - 10}
                  width={sw}
                  height={staffBottom - lineYs[0]! + 20}
                  fill="rgba(245, 158, 11, 0.25)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  rx={2}
                  pointerEvents="none"
                />
              )
            })}

            {/* Notes */}
            {l.slots.map(({ slot, slotIndex, centerX }) => {
              const isRest = slot.notes.length === 0
              const isHighlight =
                highlightBarIndex === l.index && highlightSlotIndex === slotIndex
              return (
                <g key={`notes-${slot.id}`} className="pointer-events-none">
                  {isRest && (
                    <g>
                      <text
                        x={centerX}
                        y={lineYs[1]! + 4}
                        textAnchor="middle"
                        fontSize={13}
                        className="fill-slate-500"
                      >
                        {REST_BASE_GLYPH[slot.duration]}
                      </text>
                      {isDotted(slot.duration) && (
                        <circle
                          cx={centerX + 8}
                          cy={lineYs[1]! + 2}
                          r={1.4}
                          className="fill-slate-500"
                        />
                      )}
                    </g>
                  )}
                  {slot.notes.map((note) => {
                    const label = noteLabel(
                      noteDisplayMode,
                      note.string,
                      note.fret,
                      l.bar.rootNote,
                    )
                    const w = Math.max(16, label.length * 7 + 4)
                    return (
                      <g key={`n-${note.string}`}>
                        <rect
                          x={centerX - w / 2}
                          y={lineYs[note.string]! - 7}
                          width={w}
                          height={14}
                          fill="#ffffff"
                          rx={1}
                        />
                        <text
                          x={centerX}
                          y={lineYs[note.string]! + 4}
                          textAnchor="middle"
                          fontSize={11}
                          className={isHighlight ? 'fill-amber-700 font-semibold' : 'fill-slate-900 font-semibold'}
                        >
                          {label}
                        </text>
                      </g>
                    )
                  })}
                </g>
              )
            })}

            {/* Rhythm stems */}
            {l.slots.map(({ slot, centerX }) => (
              <RhythmGlyph
                key={`stem-${slot.id}`}
                x={centerX}
                stemTop={rhythmY}
                baseline={rhythmBaseline}
                duration={slot.duration}
                isRest={slot.notes.length === 0}
              />
            ))}

            {/* Beams */}
            {beamGroups(l.bar.slots).map((group, gi) => {
              if (group.length < 2) return null
              const first = l.slots[group[0]!]
              const last = l.slots[group[group.length - 1]!]
              if (!first || !last) return null
              const dur = l.bar.slots[group[0]!]!.duration
              const beamCount = dur === '16' ? 2 : 1
              return (
                <g key={`beam-${gi}`} className="pointer-events-none">
                  {Array.from({ length: beamCount }).map((_, bi) => (
                    <line
                      key={bi}
                      x1={first.centerX}
                      y1={rhythmBaseline - bi * 3}
                      x2={last.centerX}
                      y2={rhythmBaseline - bi * 3}
                      stroke="#334155"
                      strokeWidth={2}
                    />
                  ))}
                </g>
              )
            })}

            {/* Ties spanning between slots */}
            {l.slots.map(({ slot, slotIndex, centerX }) => {
              if (!slot.tiedToNext || slotIndex >= l.slots.length - 1) return null
              const next = l.slots[slotIndex + 1]!
              const arcY = lineYs[0]! - 5
              return (
                <path
                  key={`tie-${slot.id}`}
                  d={`M ${centerX} ${arcY} Q ${(centerX + next.centerX) / 2} ${arcY - 8} ${next.centerX} ${arcY}`}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth={1}
                  className="pointer-events-none"
                />
              )
            })}

            {/* Closing barline */}
            {isLastBarOfPiece ? (
              <g>
                <line
                  x1={l.x + l.width - 4}
                  y1={lineYs[0]!}
                  x2={l.x + l.width - 4}
                  y2={staffBottom}
                  stroke="#475569"
                  strokeWidth={1.2}
                />
                <line
                  x1={l.x + l.width}
                  y1={lineYs[0]!}
                  x2={l.x + l.width}
                  y2={staffBottom}
                  stroke="#475569"
                  strokeWidth={2.5}
                />
              </g>
            ) : (
              <line
                x1={l.x + l.width}
                y1={lineYs[0]!}
                x2={l.x + l.width}
                y2={staffBottom}
                stroke="#475569"
                strokeWidth={1.2}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}

function RhythmGlyph({
  x,
  stemTop,
  baseline,
  duration,
  isRest,
}: {
  x: number
  stemTop: number
  baseline: number
  duration: Duration
  isRest: boolean
}) {
  const dotted = isDotted(duration)

  if (isRest) {
    return (
      <g className="pointer-events-none">
        <text
          x={x}
          y={baseline - 2}
          textAnchor="middle"
          fontSize={16}
          className="fill-slate-600"
        >
          {REST_BASE_GLYPH[duration]}
        </text>
        {dotted && (
          <circle cx={x + 7} cy={baseline - 7} r={1.5} className="fill-slate-600" />
        )}
      </g>
    )
  }

  const hollow = duration === 'h' || duration === 'h.' || duration === 'w'
  const hasStem = duration !== 'w'
  const headRx = 3
  const headRy = 2.5
  const headCx = x - 3

  return (
    <g className="pointer-events-none">
      {hasStem && (
        <line x1={x} y1={stemTop} x2={x} y2={baseline} stroke="#334155" strokeWidth={1.5} />
      )}
      <ellipse
        cx={headCx}
        cy={baseline}
        rx={headRx}
        ry={headRy}
        fill={hollow ? 'none' : '#334155'}
        stroke="#334155"
        strokeWidth={hollow ? 1.3 : 0}
      />
      {dotted && (
        <circle cx={headCx + headRx + 3} cy={baseline - 1} r={1.4} fill="#334155" />
      )}
    </g>
  )
}

function BarTapTarget({
  x,
  y,
  width,
  height,
  barIndex,
  onTap,
  onLongPress,
  isSelected,
}: {
  x: number
  y: number
  width: number
  height: number
  barIndex: number
  onTap: (index: number) => void
  onLongPress?: (index: number) => void
  isSelected: boolean
}) {
  const { handlers, consumeClickIfLongPress } = useLongPress(
    () => onLongPress?.(barIndex),
    { delayMs: 500 },
  )
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={isSelected ? 'rgba(59,130,246,0.16)' : 'transparent'}
      stroke={isSelected ? 'rgba(59,130,246,0.85)' : 'none'}
      strokeWidth={isSelected ? 1.5 : 0}
      onClick={() => {
        if (consumeClickIfLongPress()) return
        onTap(barIndex)
      }}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerCancel}
      onPointerLeave={handlers.onPointerLeave}
      style={{ cursor: 'pointer', touchAction: 'manipulation' }}
    >
      <title>Bar {barIndex + 1}</title>
    </rect>
  )
}
