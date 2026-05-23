import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BarEditor } from '../components/BarEditor'
import { DisplayModeToggle, ViewModeChip } from '../components/DisplayModeToggle'
import { FretKeypad } from '../components/FretKeypad'
import { RootNotePicker } from '../components/RootNotePicker'
import { ScaleKeypad } from '../components/ScaleKeypad'
import { hasAnyNotes, transposeBar } from '../lib/scale'
import { createId } from '../lib/ids'
import {
  canAppendDuration,
  canChangeSlotDuration,
  remainingBeats,
} from '../lib/notation'
import { useGroovesStore } from '../state/groovesStore'
import type { Bar, Duration, Slot, StringIndex } from '../types'
import { DURATION_LABELS } from '../types'

type BarViewProps = {
  grooveId: string
  barIndex: number
  onBack: () => void
  onNavigateBar: (index: number) => void
}

type CellTarget = { slotIndex: number; string: StringIndex }

export function BarView({ grooveId, barIndex, onBack, onNavigateBar }: BarViewProps) {
  const groove = useGroovesStore((s) => s.getGroove(grooveId))
  const commitBar = useGroovesStore((s) => s.commitBar)
  const addBar = useGroovesStore((s) => s.addBar)
  const noteDisplayMode = useGroovesStore((s) => s.noteDisplayMode)
  const setNoteDisplayMode = useGroovesStore((s) => s.setNoteDisplayMode)

  const savedBar = groove?.bars[barIndex]

  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<Bar | null>(null)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null)
  const [cellTarget, setCellTarget] = useState<CellTarget | null>(null)
  const [showRootPicker, setShowRootPicker] = useState(false)
  const [staffWidth, setStaffWidth] = useState(360)
  const containerRef = useRef<HTMLDivElement>(null)

  const displayBar = isEditing && draft ? draft : savedBar

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setStaffWidth(w - 32)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const startEdit = useCallback(() => {
    if (!savedBar) return
    setDraft(structuredClone(savedBar))
    setIsEditing(true)
    setSelectedSlotIndex(null)
  }, [savedBar])

  const cancelEdit = useCallback(() => {
    setDraft(null)
    setIsEditing(false)
    setSelectedSlotIndex(null)
    setCellTarget(null)
  }, [])

  const saveEdit = useCallback(() => {
    if (!draft) return
    commitBar(grooveId, barIndex, draft)
    setIsEditing(false)
    setDraft(null)
    setSelectedSlotIndex(null)
    setCellTarget(null)
  }, [draft, commitBar, grooveId, barIndex])

  const handleBack = useCallback(() => {
    if (isEditing) {
      if (confirm('Discard unsaved changes?')) cancelEdit()
      else return
    }
    onBack()
  }, [isEditing, cancelEdit, onBack])

  const updateDraft = useCallback((updater: (bar: Bar) => Bar) => {
    setDraft((d) => (d ? updater(d) : d))
  }, [])

  const handleRootChange = useCallback(
    (newRoot: string) => {
      if (!draft) return
      const oldRoot = draft.rootNote
      if (oldRoot && oldRoot !== newRoot && hasAnyNotes(draft)) {
        if (confirm(`Transpose existing notes from ${oldRoot} to ${newRoot}?`)) {
          setDraft(transposeBar(draft, newRoot))
          return
        }
      }
      updateDraft((b) => ({ ...b, rootNote: newRoot }))
    },
    [draft, updateDraft],
  )

  const appendSlot = useCallback(
    (duration: Duration, asRest = false) => {
      if (!draft) return
      if (!canAppendDuration(draft, draft.slots, duration)) return
      const slot: Slot = {
        id: createId(),
        duration,
        notes: asRest ? [] : [],
      }
      updateDraft((bar) => ({
        ...bar,
        slots: [...bar.slots, slot],
      }))
      setSelectedSlotIndex(draft.slots.length)
    },
    [draft, updateDraft],
  )

  const setNoteAtCell = useCallback(
    (slotIndex: number, string: StringIndex, fret: number | 'X') => {
      updateDraft((bar) => {
        const slots = bar.slots.map((s, i) => {
          if (i !== slotIndex) return s
          const others = s.notes.filter((n) => n.string !== string)
          return { ...s, notes: [...others, { string, fret }] }
        })
        return { ...bar, slots }
      })
    },
    [updateDraft],
  )

  const clearNoteAtCell = useCallback(
    (slotIndex: number, string: StringIndex) => {
      updateDraft((bar) => {
        const slots = bar.slots.map((s, i) => {
          if (i !== slotIndex) return s
          return { ...s, notes: s.notes.filter((n) => n.string !== string) }
        })
        return { ...bar, slots }
      })
    },
    [updateDraft],
  )

  const changeSlotDuration = useCallback(
    (slotIndex: number, duration: Duration) => {
      if (!draft) return
      if (!canChangeSlotDuration(draft, draft.slots, slotIndex, duration)) return
      updateDraft((bar) => ({
        ...bar,
        slots: bar.slots.map((s, i) => (i === slotIndex ? { ...s, duration } : s)),
      }))
    },
    [draft, updateDraft],
  )

  const deleteSlot = useCallback(
    (slotIndex: number) => {
      updateDraft((bar) => ({
        ...bar,
        slots: bar.slots.filter((_, i) => i !== slotIndex),
      }))
      setSelectedSlotIndex(null)
    },
    [updateDraft],
  )

  const toggleTie = useCallback(
    (slotIndex: number) => {
      updateDraft((bar) => ({
        ...bar,
        slots: bar.slots.map((s, i) =>
          i === slotIndex ? { ...s, tiedToNext: !s.tiedToNext } : s,
        ),
      }))
    },
    [updateDraft],
  )

  const remaining = useMemo(() => {
    const bar = isEditing && draft ? draft : savedBar
    if (!bar) return 0
    return remainingBeats(bar, bar.slots)
  }, [isEditing, draft, savedBar])

  if (!groove || !savedBar || !displayBar) {
    return (
      <div className="flex h-full items-center justify-center">
        <button type="button" onClick={onBack} className="text-blue-600">
          Back
        </button>
      </div>
    )
  }

  const totalBars = groove.bars.length
  const canPrev = barIndex > 0
  const canNext = barIndex < totalBars - 1

  const goPrev = () => {
    if (isEditing) {
      if (!confirm('Discard unsaved changes?')) return
      cancelEdit()
    }
    onNavigateBar(barIndex - 1)
  }

  const goNext = () => {
    if (isEditing) {
      if (!confirm('Discard unsaved changes?')) return
      cancelEdit()
    }
    if (canNext) onNavigateBar(barIndex + 1)
    else if (confirm('Add a new bar?')) {
      addBar(grooveId)
      onNavigateBar(totalBars)
    }
  }

  const staffBgClass =
    noteDisplayMode === 'degree' ? 'bg-amber-50/60' : 'bg-white'

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="border-b border-slate-200 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-1 px-2 py-2">
        <button
          type="button"
          onClick={handleBack}
          className="min-h-[44px] min-w-[44px] rounded-lg text-lg text-slate-600"
          aria-label="Back"
        >
          ←
        </button>
        <span className="flex-1 text-center text-sm font-semibold text-slate-800">
          Bar {barIndex + 1} / {totalBars}
        </span>
        {isEditing ? (
          <button
            type="button"
            onClick={() => setShowRootPicker(true)}
            className="min-h-[44px] rounded-lg bg-slate-100 px-3 text-sm font-medium text-slate-700"
          >
            Root: {draft?.rootNote ?? '—'} ▾
          </button>
        ) : (
          <>
            {displayBar.rootNote && (
              <span className="text-sm font-medium text-slate-600 mr-1">
                {displayBar.rootNote}
              </span>
            )}
            <DisplayModeToggle
              value={noteDisplayMode}
              onChange={setNoteDisplayMode}
              size="md"
            />
            <button
              type="button"
              onClick={startEdit}
              className="min-h-[44px] rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white ml-1"
            >
              Edit
            </button>
          </>
        )}
        {isEditing && (
          <button
            type="button"
            onClick={cancelEdit}
            className="min-h-[44px] min-w-[44px] rounded-lg text-slate-500 text-lg"
            aria-label="Exit edit"
          >
            ✕
          </button>
        )}
      </div>
      <div className="px-4 pb-2">
        <ViewModeChip mode={noteDisplayMode} />
      </div>
      </header>

      <div className="relative flex flex-1 flex-col min-h-0">
        {!isEditing && (
          <>
            {canPrev && (
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-0 top-1/2 z-10 -translate-y-1/2 min-h-[80px] w-10 text-2xl text-slate-400 active:bg-slate-100/80"
                aria-label="Previous bar"
              >
                ◀
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              className="absolute right-0 top-1/2 z-10 -translate-y-1/2 min-h-[80px] w-10 text-2xl text-slate-400 active:bg-slate-100/80"
              aria-label="Next bar"
            >
              ▶
            </button>
          </>
        )}

        <div
          ref={containerRef}
          className={`flex-1 overflow-x-auto overflow-y-auto flex items-center justify-center p-4 ${staffBgClass} ${!isEditing ? 'px-10' : ''}`}
        >
          <BarEditor
            bar={displayBar}
            barNumber={barIndex + 1}
            width={Math.max(staffWidth, 280)}
            height={isEditing ? 200 : 180}
            mode={isEditing ? 'edit' : 'view'}
            noteDisplayMode={noteDisplayMode}
            selectedSlotIndex={selectedSlotIndex}
            onSelectSlot={isEditing ? setSelectedSlotIndex : undefined}
            onCellClick={
              isEditing
                ? (slotIndex, string) => {
                    setSelectedSlotIndex(slotIndex)
                    setCellTarget({ slotIndex, string })
                  }
                : undefined
            }
            showBarNumber
            showRoot={!isEditing}
          />
        </div>
      </div>

      {isEditing && draft && (
        <>
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
            <p className="mb-2 text-xs text-slate-500 text-center">
              Tap a duration to append a slot · Remaining: {remaining} beat
              {remaining !== 1 ? 's' : ''}
              {selectedSlotIndex !== null && ` · Selected: ${selectedSlotIndex + 1}`}
            </p>
            <div className="flex justify-center gap-2">
              {(['q', '8', '16'] as Duration[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={!canAppendDuration(draft, draft.slots, d)}
                  onClick={() => appendSlot(d)}
                  className="min-h-[48px] min-w-[64px] rounded-xl bg-white border border-slate-200 text-lg font-medium disabled:opacity-40 active:bg-slate-100"
                >
                  {DURATION_LABELS[d]} {d === 'q' ? 'q' : d}
                </button>
              ))}
              <button
                type="button"
                disabled={!canAppendDuration(draft, draft.slots, 'q')}
                onClick={() => appendSlot('q', true)}
                className="min-h-[48px] min-w-[64px] rounded-xl bg-white border border-slate-200 text-lg disabled:opacity-40 active:bg-slate-100"
              >
                𝄽 rest
              </button>
            </div>

            {selectedSlotIndex !== null && draft.slots[selectedSlotIndex] && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span className="w-full text-center text-xs text-slate-500">Change slot:</span>
                {(['q', '8', '16'] as Duration[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => changeSlotDuration(selectedSlotIndex, d)}
                    className="min-h-[40px] rounded-lg bg-white border px-3 text-sm"
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => toggleTie(selectedSlotIndex)}
                  className={`min-h-[40px] rounded-lg border px-3 text-sm ${
                    draft.slots[selectedSlotIndex]?.tiedToNext
                      ? 'bg-blue-100 border-blue-300'
                      : 'bg-white'
                  }`}
                >
                  Tie
                </button>
                <button
                  type="button"
                  onClick={() => deleteSlot(selectedSlotIndex)}
                  className="min-h-[40px] rounded-lg bg-red-50 border border-red-200 px-3 text-sm text-red-700"
                >
                  Delete slot
                </button>
              </div>
            )}
          </div>

          <footer className="flex gap-3 border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={cancelEdit}
              className="min-h-[48px] flex-1 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdit}
              className="min-h-[48px] flex-1 rounded-xl bg-slate-900 text-sm font-semibold text-white"
            >
              Save
            </button>
          </footer>
        </>
      )}

      {cellTarget && draft && noteDisplayMode === 'degree' && draft.rootNote && (
        <ScaleKeypad
          slotIndex={cellTarget.slotIndex}
          string={cellTarget.string}
          rootNote={draft.rootNote}
          onSelect={(fret) => setNoteAtCell(cellTarget.slotIndex, cellTarget.string, fret)}
          onClear={() => clearNoteAtCell(cellTarget.slotIndex, cellTarget.string)}
          onClose={() => setCellTarget(null)}
        />
      )}

      {cellTarget && draft && (noteDisplayMode === 'fret' || !draft.rootNote) && (
        <FretKeypad
          slotIndex={cellTarget.slotIndex}
          string={cellTarget.string}
          onSelect={(fret) => setNoteAtCell(cellTarget.slotIndex, cellTarget.string, fret)}
          onClear={() => clearNoteAtCell(cellTarget.slotIndex, cellTarget.string)}
          onClose={() => setCellTarget(null)}
          hint={
            noteDisplayMode === 'degree' && !draft.rootNote
              ? 'Set a root note to enter in scale degrees'
              : undefined
          }
        />
      )}

      {showRootPicker && draft && (
        <RootNotePicker
          value={draft.rootNote}
          onChange={handleRootChange}
          onClose={() => setShowRootPicker(false)}
        />
      )}
    </div>
  )
}
