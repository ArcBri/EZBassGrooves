import type { MouseEvent } from 'react'
import type { Bar, Duration, StringIndex } from '../types'
import { DURATION_LABELS, STRING_LABELS, isDotted } from '../types'
import { beamGroups, layoutBar } from '../lib/notation'
import { noteLabel, type NoteDisplayMode } from '../lib/scale'

const REST_BASE_GLYPH: Record<Duration, string> = {
  w: '𝄻',
  'h.': '𝄼',
  h: '𝄼',
  'q.': '𝄽',
  q: '𝄽',
  '8': '𝄾',
  '16': '𝄿',
}

type BarEditorProps = {
  bar: Bar
  barNumber: number
  width: number
  height: number
  mode: 'view' | 'edit'
  selectedSlotIndex: number | null
  onSelectSlot?: (index: number) => void
  onCellClick?: (slotIndex: number, string: StringIndex) => void
  showBarNumber?: boolean
  showRoot?: boolean
  compact?: boolean
  noteDisplayMode?: NoteDisplayMode
  highlightSlotIndex?: number | null
  bpm?: number
  showTimeSignature?: boolean
  showBpm?: boolean
}

const TIME_SIG_RESERVE = 26

export function BarEditor({
  bar,
  barNumber,
  width,
  height,
  mode,
  selectedSlotIndex,
  onSelectSlot,
  onCellClick,
  showBarNumber = true,
  showRoot = true,
  compact = false,
  noteDisplayMode = 'fret',
  highlightSlotIndex = null,
  bpm,
  showTimeSignature = false,
  showBpm = false,
}: BarEditorProps) {
  const staffTop = compact ? 8 : 28
  const leftReserve = showTimeSignature && !compact ? TIME_SIG_RESERVE : 0
  const layout = layoutBar(bar, width, staffTop, leftReserve)
  const groups = beamGroups(bar.slots)

  const noteFont = compact ? 10 : 16
  const timeSigX = 20 + TIME_SIG_RESERVE / 2 - 4
  const timeSigMid = (layout.staffTop + layout.staffBottom) / 2

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="select-none"
      role="img"
      aria-label={`Bar ${barNumber}`}
    >
      {showBarNumber && (
        <text
          x={6}
          y={compact ? 10 : 16}
          className="fill-slate-400"
          fontSize={compact ? 9 : 11}
        >
          {barNumber}
        </text>
      )}

      {showBpm && bpm != null && !compact && (
        <text
          x={width - 8}
          y={14}
          textAnchor="end"
          className="fill-slate-700 font-semibold"
          fontSize={12}
        >
          ♩ = {bpm}
        </text>
      )}

      {showRoot && bar.rootNote && !compact && (
        <text
          x={width - 8}
          y={showBpm && bpm != null ? 25 : 16}
          textAnchor="end"
          className="fill-slate-500 font-medium"
          fontSize={11}
        >
          {bar.rootNote}
        </text>
      )}

      {showTimeSignature && !compact && (
        <g className="pointer-events-none">
          <text
            x={timeSigX}
            y={timeSigMid - 2}
            textAnchor="middle"
            className="fill-slate-900 font-bold"
            fontSize={18}
          >
            {bar.timeSignature.num}
          </text>
          <text
            x={timeSigX}
            y={timeSigMid + 16}
            textAnchor="middle"
            className="fill-slate-900 font-bold"
            fontSize={18}
          >
            {bar.timeSignature.den}
          </text>
        </g>
      )}

      {/* Bar lines */}
      <line
        x1={8}
        y1={layout.staffTop - 8}
        x2={8}
        y2={layout.staffBottom + 8}
        stroke="#94a3b8"
        strokeWidth={compact ? 1 : 1.5}
      />
      <line
        x1={width - 4}
        y1={layout.staffTop - 8}
        x2={width - 4}
        y2={layout.staffBottom + 8}
        stroke="#94a3b8"
        strokeWidth={1}
      />

      {layout.lineYs.map((y, i) => (
        <g key={STRING_LABELS[i as StringIndex]}>
          {!compact && (
            <text
              x={2}
              y={y + 4}
              className="fill-slate-400"
              fontSize={9}
              textAnchor="start"
            >
              {STRING_LABELS[i as StringIndex]}
            </text>
          )}
          <line
            x1={compact ? 8 : 20}
            y1={y}
            x2={width - 8}
            y2={y}
            stroke="#cbd5e1"
            strokeWidth={1}
          />
        </g>
      ))}

      {/* Slots */}
      {layout.slots.map(({ slot, slotIndex, x, width: w, centerX }) => {
        const isSelected = selectedSlotIndex === slotIndex
        const isHighlight = highlightSlotIndex === slotIndex
        const isRest = slot.notes.length === 0

        return (
          <g key={slot.id}>
            {isHighlight && mode === 'view' && (
              <rect
                x={x}
                y={layout.staffTop - 10}
                width={w}
                height={layout.staffBottom - layout.staffTop + 20}
                fill="rgba(245, 158, 11, 0.25)"
                stroke="#f59e0b"
                strokeWidth={2}
                rx={2}
                pointerEvents="none"
              />
            )}
            {mode === 'edit' && (
              <rect
                x={x}
                y={layout.staffTop - 10}
                width={w}
                height={layout.staffBottom - layout.staffTop + 20}
                fill={isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent'}
                stroke={isSelected ? '#3b82f6' : 'transparent'}
                strokeWidth={1}
                rx={2}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectSlot?.(slotIndex)
                }}
                style={{ cursor: 'pointer' }}
              />
            )}

            {/* Clickable string cells in edit mode */}
            {mode === 'edit' &&
              layout.lineYs.map((lineY, strIdx) => {
                const note = slot.notes.find((n) => n.string === strIdx)
                return (
                  <g key={strIdx}>
                    <rect
                      x={x}
                      y={lineY - 12}
                      width={w}
                      height={24}
                      fill="transparent"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCellClick?.(slotIndex, strIdx as StringIndex)
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    {note && (
                      <text
                        x={centerX}
                        y={lineY + 5}
                        textAnchor="middle"
                        className={`font-semibold pointer-events-none ${
                          isHighlight ? 'fill-amber-700' : 'fill-slate-900'
                        }`}
                        fontSize={noteFont}
                      >
                        {noteLabel(noteDisplayMode, note.string, note.fret, bar.rootNote)}
                      </text>
                    )}
                  </g>
                )
              })}

            {mode === 'view' &&
              slot.notes.map((note) => (
                <text
                  key={`${note.string}-${note.fret}`}
                  x={centerX}
                  y={layout.lineYs[note.string]! + 5}
                  textAnchor="middle"
                  className={`font-semibold ${isHighlight ? 'fill-amber-700' : 'fill-slate-900'}`}
                  fontSize={noteFont}
                >
                  {noteLabel(noteDisplayMode, note.string, note.fret, bar.rootNote)}
                </text>
              ))}

            {mode === 'view' && isRest && (
              <g className="pointer-events-none">
                <text
                  x={centerX}
                  y={layout.lineYs[1]! + 4}
                  textAnchor="middle"
                  className="fill-slate-500"
                  fontSize={compact ? 12 : 18}
                >
                  {REST_BASE_GLYPH[slot.duration]}
                </text>
                {isDotted(slot.duration) && (
                  <circle
                    cx={centerX + (compact ? 8 : 12)}
                    cy={layout.lineYs[1]! + 2}
                    r={compact ? 1.2 : 1.8}
                    className="fill-slate-500"
                  />
                )}
              </g>
            )}

            {/* Rhythm stem */}
            <RhythmStem
              x={centerX}
              y={layout.rhythmY}
              baseline={layout.rhythmBaseline}
              duration={slot.duration}
              isRest={isRest}
              compact={compact}
              selected={isSelected && mode === 'edit'}
              onClick={
                mode === 'edit'
                  ? (e) => {
                      e.stopPropagation()
                      onSelectSlot?.(slotIndex)
                    }
                  : undefined
              }
            />

            {slot.tiedToNext && slotIndex < bar.slots.length - 1 && (
              <path
                d={`M ${centerX} ${layout.lineYs[0]! - 6} Q ${centerX + w / 2} ${layout.lineYs[0]! - 14} ${centerX + w / 2} ${layout.lineYs[0]! - 6}`}
                fill="none"
                stroke="#64748b"
                strokeWidth={1}
              />
            )}
          </g>
        )
      })}

      {/* Beams */}
      {groups.map((group, gi) => {
        if (group.length < 2) return null
        const first = layout.slots[group[0]!]
        const last = layout.slots[group[group.length - 1]!]
        if (!first || !last) return null
        const y = layout.rhythmBaseline
        const dur = bar.slots[group[0]!]!.duration
        const beamCount = dur === '16' ? 2 : 1
        return (
          <g key={gi}>
            {Array.from({ length: beamCount }).map((_, bi) => (
              <line
                key={bi}
                x1={first.centerX}
                y1={y - bi * 4}
                x2={last.centerX}
                y2={y - bi * 4}
                stroke="#334155"
                strokeWidth={compact ? 2 : 3}
              />
            ))}
          </g>
        )
      })}

      {/* Duration labels under rhythm in edit */}
      {mode === 'edit' &&
        layout.slots.map(({ slot, centerX }) => (
          <text
            key={`dur-${slot.id}`}
            x={centerX}
            y={height - 4}
            textAnchor="middle"
            className="fill-slate-400 pointer-events-none"
            fontSize={9}
          >
            {slot.duration}
          </text>
        ))}
    </svg>
  )
}

function RhythmStem({
  x,
  y,
  baseline,
  duration,
  isRest,
  compact,
  selected,
  onClick,
}: {
  x: number
  y: number
  baseline: number
  duration: Duration
  isRest: boolean
  compact?: boolean
  selected?: boolean
  onClick?: (e: MouseEvent) => void
}) {
  const stroke = selected ? '#3b82f6' : '#334155'
  const dotted = isDotted(duration)

  if (isRest) {
    return (
      <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
        <text
          x={x}
          y={baseline - 2}
          textAnchor="middle"
          fontSize={compact ? 14 : 20}
          className="fill-slate-600"
        >
          {REST_BASE_GLYPH[duration]}
        </text>
        {dotted && (
          <circle
            cx={x + (compact ? 6 : 8)}
            cy={baseline - 6}
            r={compact ? 1.4 : 2}
            className="fill-slate-600"
          />
        )}
      </g>
    )
  }

  const hollow = duration === 'h' || duration === 'h.' || duration === 'w'
  const hasStem = duration !== 'w'
  const headRx = compact ? 3 : 4
  const headRy = compact ? 2.5 : 3
  const headCx = x - 4

  return (
    <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      {hasStem && (
        <line x1={x} y1={y} x2={x} y2={baseline} stroke={stroke} strokeWidth={1.5} />
      )}

      <ellipse
        cx={headCx}
        cy={baseline}
        rx={headRx}
        ry={headRy}
        fill={hollow ? 'none' : '#334155'}
        stroke="#334155"
        strokeWidth={hollow ? 1.5 : 0}
      />

      {dotted && (
        <circle
          cx={headCx + headRx + 3}
          cy={baseline - 1}
          r={compact ? 1.2 : 1.6}
          fill="#334155"
        />
      )}

      {duration === '8' && (
        <path
          d={`M ${x} ${baseline} l 6 ${compact ? 5 : 8}`}
          stroke={stroke}
          strokeWidth={1.5}
          fill="none"
        />
      )}
      {duration === '16' && (
        <>
          <path
            d={`M ${x} ${baseline} l 6 ${compact ? 4 : 6}`}
            stroke={stroke}
            strokeWidth={1.5}
            fill="none"
          />
          <path
            d={`M ${x} ${baseline - 5} l 6 ${compact ? 4 : 6}`}
            stroke={stroke}
            strokeWidth={1.5}
            fill="none"
          />
        </>
      )}
      {!compact && (
        <text x={x} y={baseline + 12} textAnchor="middle" fontSize={8} className="fill-slate-400">
          {DURATION_LABELS[duration]}
        </text>
      )}
    </g>
  )
}
