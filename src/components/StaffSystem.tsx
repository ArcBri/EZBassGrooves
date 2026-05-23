import type { Bar, Slot, StringIndex } from '../types'
import { STRING_LABELS } from '../types'
import { barTotalBeats, beamGroups, durationToBeats } from '../lib/notation'
import { noteLabel, type NoteDisplayMode } from '../lib/scale'

type SystemBar = { bar: Bar; index: number }

type StaffSystemProps = {
  bars: SystemBar[]
  width: number
  onTapBar: (index: number) => void
  isLastSystem?: boolean
  noteDisplayMode?: NoteDisplayMode
}

const PAD_LEFT = 22
const PAD_RIGHT = 8
const TOP_LABEL_H = 18
const LINE_GAP = 13
const RHYTHM_GAP = 14
const RHYTHM_H = 22

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

export function StaffSystem({
  bars,
  width,
  onTapBar,
  isLastSystem,
  noteDisplayMode = 'fret',
}: StaffSystemProps) {
  if (bars.length === 0) return null

  const staffTop = TOP_LABEL_H
  const lineYs = [0, 1, 2, 3].map((i) => staffTop + i * LINE_GAP)
  const staffBottom = lineYs[3]!
  const rhythmY = staffBottom + RHYTHM_GAP
  const rhythmBaseline = rhythmY + RHYTHM_H
  const height = rhythmBaseline + 8

  const innerWidth = width - PAD_LEFT - PAD_RIGHT
  const totalBeats = bars.reduce((s, b) => s + barTotalBeats(b.bar), 0) || 1

  let cursor = PAD_LEFT
  const layouts: BarLayout[] = bars.map(({ bar, index }) => {
    const beats = barTotalBeats(bar)
    const barWidth = (beats / totalBeats) * innerWidth
    let slotX = cursor
    const slots: SlotLayout[] = bar.slots.map((slot, slotIndex) => {
      const slotBeats = durationToBeats(slot.duration)
      const w = (slotBeats / beats) * barWidth
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
    const out: BarLayout = { bar, index, x: cursor, width: barWidth, slots }
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
        return (
          <g key={l.bar.id}>
            {/* Touch target for the whole bar */}
            <rect
              x={l.x}
              y={0}
              width={l.width}
              height={height}
              fill="transparent"
              onClick={() => onTapBar(l.index)}
              style={{ cursor: 'pointer' }}
            >
              <title>Bar {l.index + 1}</title>
            </rect>

            {/* Bar number above start */}
            <text
              x={l.x + 4}
              y={12}
              fontSize={9}
              className="fill-slate-400 pointer-events-none"
            >
              {l.index + 1}
            </text>

            {/* Root note above end */}
            {l.bar.rootNote && (
              <text
                x={l.x + l.width - 4}
                y={13}
                textAnchor="end"
                fontSize={11}
                className="fill-slate-700 font-semibold pointer-events-none"
              >
                {l.bar.rootNote}
              </text>
            )}

            {/* Notes */}
            {l.slots.map(({ slot, centerX }) => {
              const isRest = slot.notes.length === 0
              return (
                <g key={`notes-${slot.id}`} className="pointer-events-none">
                  {isRest && (
                    <text
                      x={centerX}
                      y={lineYs[1]! + 4}
                      textAnchor="middle"
                      fontSize={13}
                      className="fill-slate-500"
                    >
                      𝄽
                    </text>
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
                          className="fill-slate-900 font-semibold"
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
  duration: 'q' | '8' | '16'
  isRest: boolean
}) {
  if (isRest) {
    return (
      <text
        x={x}
        y={baseline - 2}
        textAnchor="middle"
        fontSize={16}
        className="fill-slate-600 pointer-events-none"
      >
        {duration === 'q' ? '𝄻' : duration === '8' ? '𝄾' : '𝄿'}
      </text>
    )
  }
  return (
    <g className="pointer-events-none">
      <line x1={x} y1={stemTop} x2={x} y2={baseline} stroke="#334155" strokeWidth={1.5} />
      <ellipse cx={x - 3} cy={baseline} rx={3} ry={2.5} fill="#334155" />
    </g>
  )
}
