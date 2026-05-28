import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BarActionsSheet } from '../components/BarActionsSheet'
import { BarEditor } from '../components/BarEditor'
import { BpmPicker } from '../components/BpmPicker'
import { DisplayModeToggle, ViewModeChip } from '../components/DisplayModeToggle'
import { FretKeypad } from '../components/FretKeypad'
import { RootNotePicker } from '../components/RootNotePicker'
import { ScaleKeypad } from '../components/ScaleKeypad'
import { TimeSignaturePicker } from '../components/TimeSignaturePicker'
import { VolumeControls } from '../components/VolumeControls'
import { usePlayhead } from '../hooks/usePlayhead'
import { createId } from '../lib/ids'
import type { PlayBar } from '../lib/metronome'
import {
  canAppendDuration,
  canChangeSlotDuration,
  effectiveBpm,
  remainingBeats,
  slotsUsedBeats,
  timeSignatureTotalBeats,
  trimSlotsToFit,
} from '../lib/notation'
import { hasAnyNotes, transposeBar } from '../lib/scale'
import { useGroovesStore } from '../state/groovesStore'
import { useTutorialStore } from '../state/tutorialStore'
import type { Bar, Duration, Slot, StringIndex, TimeSignature } from '../types'
import { DEFAULT_BPM, DURATION_LABELS, DURATION_ORDER } from '../types'

type BarViewProps = {
  grooveId: string
  barIndex: number
  onBack: () => void
  onNavigateBar: (index: number) => void
}

type CellTarget = { slotIndex: number; string: StringIndex }

function formatTimeSignature(ts: TimeSignature): string {
  return `${ts.num}/${ts.den}`
}

function timeSignaturesEqual(a: TimeSignature, b: TimeSignature): boolean {
  return a.num === b.num && a.den === b.den
}

export function BarView({ grooveId, barIndex, onBack, onNavigateBar }: BarViewProps) {
  const groove = useGroovesStore((s) => s.getGroove(grooveId))
  const commitBar = useGroovesStore((s) => s.commitBar)
  const addBar = useGroovesStore((s) => s.addBar)
  const noteDisplayMode = useGroovesStore((s) => s.noteDisplayMode)
  const setNoteDisplayMode = useGroovesStore((s) => s.setNoteDisplayMode)
  const setBpm = useGroovesStore((s) => s.setBpm)
  const setBarBpmOverride = useGroovesStore((s) => s.setBarBpmOverride)
  const setGrooveTimeSignature = useGroovesStore((s) => s.setGrooveTimeSignature)
  const playbackVolume = useGroovesStore((s) => s.playbackVolume)
  const setPlaybackVolume = useGroovesStore((s) => s.setPlaybackVolume)
  const clipboardBars = useGroovesStore((s) => s.clipboardBars)
  const copyBarsToClipboard = useGroovesStore((s) => s.copyBarsToClipboard)
  const clearClipboard = useGroovesStore((s) => s.clearClipboard)
  const duplicateBarsAt = useGroovesStore((s) => s.duplicateBarsAt)
  const insertBarsAfter = useGroovesStore((s) => s.insertBarsAfter)
  const replaceBarsWith = useGroovesStore((s) => s.replaceBarsWith)
  const deleteBarsAt = useGroovesStore((s) => s.deleteBarsAt)
  const tutorialNotify = useTutorialStore((s) => s.notify)

  const savedBar = groove?.bars[barIndex]

  const { isPlaying, current, play, stop } = usePlayhead()

  const [isEditing, setIsEditing] = useState(false)
  const [showBpmPicker, setShowBpmPicker] = useState(false)
  const [showTimeSignaturePicker, setShowTimeSignaturePicker] = useState(false)
  const [showVolumeControls, setShowVolumeControls] = useState(false)
  const [showBarActions, setShowBarActions] = useState(false)
  const [restMode, setRestMode] = useState(false)
  const [draft, setDraft] = useState<Bar | null>(null)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null)
  const [cellTarget, setCellTarget] = useState<CellTarget | null>(null)
  const [showRootPicker, setShowRootPicker] = useState(false)
  const [staffWidth, setStaffWidth] = useState(360)
  const containerRef = useRef<HTMLDivElement>(null)

  const displayBar = isEditing && draft ? draft : savedBar

  const grooveBpm = groove?.bpm ?? DEFAULT_BPM
  const effectiveBarBpm = groove
    ? isEditing && draft
      ? draft.bpmOverride ?? groove.bpm ?? DEFAULT_BPM
      : effectiveBpm(groove, barIndex)
    : DEFAULT_BPM
  const hasOverride =
    isEditing && draft
      ? draft.bpmOverride != null
      : savedBar?.bpmOverride != null
  const grooveTimeSignature = groove?.defaultTimeSignature ?? { num: 4, den: 4 }
  const displayTimeSignature = displayBar?.timeSignature ?? grooveTimeSignature
  const hasTimeSignatureOverride = !timeSignaturesEqual(displayTimeSignature, grooveTimeSignature)

  useEffect(() => {
    return () => stop()
  }, [stop])

  useEffect(() => {
    stop()
  }, [barIndex, stop])

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
    tutorialNotify('bar:edit')
  }, [savedBar, tutorialNotify])

  const cancelEdit = useCallback(() => {
    setDraft(null)
    setIsEditing(false)
    setSelectedSlotIndex(null)
    setCellTarget(null)
  }, [])

  const saveEdit = useCallback(() => {
    if (!draft) return
    commitBar(grooveId, barIndex, draft)
    tutorialNotify('bar:saved')
    setIsEditing(false)
    setDraft(null)
    setSelectedSlotIndex(null)
    setCellTarget(null)
  }, [draft, commitBar, grooveId, barIndex, tutorialNotify])

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
      tutorialNotify('bar:slotAdded')
    },
    [draft, updateDraft, tutorialNotify],
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
      tutorialNotify('bar:noteAdded')
    },
    [updateDraft, tutorialNotify],
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

  const clearAllSlots = useCallback(() => {
    if (!draft) return
    if (draft.slots.length === 0) return
    if (!confirm('Remove all notes from this bar?')) return
    updateDraft((bar) => ({ ...bar, slots: [] }))
    setSelectedSlotIndex(null)
    setCellTarget(null)
  }, [draft, updateDraft])

  const handleDuplicateBar = useCallback(() => {
    stop()
    const newIndex = duplicateBarsAt(grooveId, barIndex, barIndex)
    if (newIndex != null) onNavigateBar(newIndex)
  }, [duplicateBarsAt, grooveId, barIndex, onNavigateBar, stop])

  const handleCopyBar = useCallback(() => {
    copyBarsToClipboard(grooveId, barIndex, barIndex)
  }, [copyBarsToClipboard, grooveId, barIndex])

  const handlePasteInsertAfter = useCallback(() => {
    if (clipboardBars.length === 0) return
    stop()
    const newIndex = insertBarsAfter(grooveId, barIndex, clipboardBars)
    if (newIndex != null) onNavigateBar(newIndex)
  }, [clipboardBars, insertBarsAfter, grooveId, barIndex, onNavigateBar, stop])

  const handlePasteReplace = useCallback(() => {
    if (clipboardBars.length === 0) return
    const msg =
      clipboardBars.length === 1
        ? `Replace bar ${barIndex + 1} with the clipboard contents?`
        : `Replace bar ${barIndex + 1} with ${clipboardBars.length} bars from the clipboard?`
    if (!confirm(msg)) return
    stop()
    replaceBarsWith(grooveId, barIndex, barIndex, clipboardBars)
  }, [clipboardBars, replaceBarsWith, grooveId, barIndex, stop])

  const canDeleteCurrentBar = (groove?.bars.length ?? 0) > 1
  const handleDeleteBar = useCallback(() => {
    if (!groove) return
    if (groove.bars.length <= 1) {
      alert('Cannot delete the last bar. A groove must have at least one bar.')
      return
    }
    if (!confirm(`Delete bar ${barIndex + 1}?`)) return
    stop()
    if (isEditing) {
      setIsEditing(false)
      setDraft(null)
      setSelectedSlotIndex(null)
      setCellTarget(null)
    }
    const newIndex = deleteBarsAt(grooveId, barIndex, barIndex)
    if (newIndex != null) onNavigateBar(newIndex)
  }, [groove, barIndex, stop, isEditing, deleteBarsAt, grooveId, onNavigateBar])

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

  const applyTimeSignatureToBar = useCallback((bar: Bar, timeSignature: TimeSignature): Bar | null => {
    const maxBeats = timeSignatureTotalBeats(timeSignature)
    if (slotsUsedBeats(bar.slots) <= maxBeats + 1e-9) {
      return { ...bar, timeSignature }
    }
    if (!confirm('This time signature is shorter than the current bar. Trim slots from the end?')) {
      return null
    }
    return {
      ...bar,
      timeSignature,
      slots: trimSlotsToFit(bar.slots, maxBeats),
    }
  }, [])

  const handleSaveTimeSignature = useCallback(
    (timeSignature: TimeSignature, override: boolean) => {
      if (!groove) return

      if (override) {
        if (isEditing && draft) {
          const nextBar = applyTimeSignatureToBar(draft, timeSignature)
          if (!nextBar) return
          setDraft(nextBar)
          setSelectedSlotIndex(null)
        } else if (savedBar) {
          const nextBar = applyTimeSignatureToBar(savedBar, timeSignature)
          if (!nextBar) return
          commitBar(grooveId, barIndex, nextBar)
        }
      } else {
        setGrooveTimeSignature(grooveId, timeSignature)
        const shouldApplyToBars =
          groove.bars.length > 0 &&
          confirm('Apply this time signature to all existing bars? Bars with too many slots will be trimmed.')

        if (shouldApplyToBars) {
          const maxBeats = timeSignatureTotalBeats(timeSignature)
          groove.bars.forEach((bar, index) => {
            if (isEditing && draft && index === barIndex) {
              setDraft({
                ...draft,
                timeSignature,
                slots: trimSlotsToFit(draft.slots, maxBeats),
              })
              setSelectedSlotIndex(null)
            }
            commitBar(grooveId, index, {
              ...bar,
              timeSignature,
              slots: trimSlotsToFit(bar.slots, maxBeats),
            })
          })
        }
      }

      setShowTimeSignaturePicker(false)
    },
    [
      applyTimeSignatureToBar,
      barIndex,
      commitBar,
      draft,
      groove,
      grooveId,
      isEditing,
      savedBar,
      setGrooveTimeSignature,
    ],
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

  const barPlayPlan = useMemo((): PlayBar[] => {
    if (!groove || !displayBar) return []
    return [
      {
        barIndex,
        bpm: effectiveBarBpm,
        bar: displayBar,
      },
    ]
  }, [groove, displayBar, barIndex, effectiveBarBpm])

  const bpmLabel = hasOverride ? `${effectiveBarBpm} (override)` : `${effectiveBarBpm}`

  const goPrev = () => {
    stop()
    if (isEditing) {
      if (!confirm('Discard unsaved changes?')) return
      cancelEdit()
    }
    onNavigateBar(barIndex - 1)
  }

  const goNext = () => {
    stop()
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
        <button
          type="button"
          onClick={() => setShowBpmPicker(true)}
          className="min-h-[40px] rounded-lg bg-slate-100 px-2 text-xs font-semibold text-slate-700 shrink-0 max-w-[100px] truncate"
        >
          {bpmLabel} ▾
        </button>
        <button
          type="button"
          onClick={() => setShowTimeSignaturePicker(true)}
          className="min-h-[40px] rounded-lg bg-slate-100 px-2 text-xs font-semibold text-slate-700 shrink-0"
        >
          {formatTimeSignature(displayTimeSignature)} ▾
        </button>
        {isEditing ? (
          <button
            type="button"
            onClick={() => setShowRootPicker(true)}
            className="min-h-[44px] rounded-lg bg-slate-100 px-2 text-sm font-medium text-slate-700 shrink-0"
          >
            {draft?.rootNote ?? 'Root'} ▾
          </button>
        ) : (
          <>
            {displayBar.rootNote && (
              <span className="text-sm font-medium text-slate-600 shrink-0 hidden sm:inline">
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
              data-tutorial="bar-edit"
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
          data-tutorial="bar-staff"
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
                    tutorialNotify('bar:cellSelected')
                  }
                : undefined
            }
            showBarNumber
            showRoot={!isEditing}
            bpm={effectiveBarBpm}
            showBpm
            showTimeSignature
            highlightSlotIndex={
              !isEditing && current?.barIndex === barIndex ? current.slotIndex : null
            }
          />
        </div>
      </div>

      {!isEditing && (
        <footer className="border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowBarActions(true)}
              className="min-h-[36px] rounded-lg bg-slate-100 px-2.5 text-xs font-semibold text-slate-700"
            >
              Bar ▾
            </button>
            <button
              type="button"
              onClick={() => setShowVolumeControls(true)}
              aria-label="Playback volume"
              className="min-h-[36px] rounded-lg bg-slate-100 px-2.5 text-xs font-semibold text-slate-700"
            >
              {playbackVolume.click === 0 && playbackVolume.synth === 0 ? 'Vol: muted' : 'Vol ▾'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isPlaying) stop()
              else play(barPlayPlan, 0)
            }}
            disabled={!displayBar || displayBar.slots.length === 0}
            className={`w-full min-h-[48px] rounded-xl text-sm font-semibold text-white disabled:opacity-40 ${
              isPlaying ? 'bg-red-600' : 'bg-emerald-600'
            }`}
          >
            {isPlaying ? '■ Stop' : '▶ Play bar'}
          </button>
        </footer>
      )}

      {isEditing && draft && (
        <>
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
            <p className="mb-2 text-xs text-slate-500 text-center">
              Tap a duration to append a {restMode ? 'rest' : 'note'} · Remaining: {remaining} beat
              {remaining !== 1 ? 's' : ''}
              {selectedSlotIndex !== null && ` · Selected: ${selectedSlotIndex + 1}`}
            </p>

            <div className="mb-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setRestMode(false)}
                className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold ${
                  !restMode ? 'bg-slate-900 text-white' : 'bg-white border border-slate-300 text-slate-700'
                }`}
              >
                Note
              </button>
              <button
                type="button"
                onClick={() => setRestMode(true)}
                className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold ${
                  restMode ? 'bg-slate-900 text-white' : 'bg-white border border-slate-300 text-slate-700'
                }`}
              >
                Rest
              </button>
            </div>

            <div data-tutorial="bar-duration" className="flex flex-wrap justify-center gap-1.5">
              {DURATION_ORDER.map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={!canAppendDuration(draft, draft.slots, d)}
                  onClick={() => appendSlot(d, restMode)}
                  className="min-h-[44px] min-w-[48px] rounded-xl bg-white border border-slate-200 text-sm font-medium disabled:opacity-40 active:bg-slate-100"
                >
                  <span className="block text-base leading-none">{DURATION_LABELS[d]}</span>
                  <span className="block text-[10px] text-slate-500">{d}</span>
                </button>
              ))}
              <button
                type="button"
                disabled={draft.slots.length === 0}
                onClick={clearAllSlots}
                className="min-h-[44px] rounded-xl bg-red-50 border border-red-200 px-3 text-xs font-semibold text-red-700 disabled:opacity-40 active:bg-red-100"
              >
                Clear all
              </button>
            </div>

            {selectedSlotIndex !== null && draft.slots[selectedSlotIndex] && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                <span className="w-full text-center text-xs text-slate-500">Change slot duration:</span>
                {DURATION_ORDER.map((d) => {
                  const allowed = canChangeSlotDuration(draft, draft.slots, selectedSlotIndex, d)
                  const isCurrent = draft.slots[selectedSlotIndex]?.duration === d
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={!allowed}
                      onClick={() => changeSlotDuration(selectedSlotIndex, d)}
                      className={`min-h-[40px] rounded-lg border px-2.5 text-xs font-medium disabled:opacity-30 ${
                        isCurrent ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700'
                      }`}
                    >
                      {d}
                    </button>
                  )
                })}
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
                  Delete
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
              data-tutorial="bar-save"
              className="min-h-[48px] flex-1 rounded-xl bg-slate-900 text-sm font-semibold text-white"
            >
              Apply
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

      {showBpmPicker && groove && (
        <BpmPicker
          value={effectiveBarBpm}
          grooveDefault={grooveBpm}
          showOverrideToggle
          overrideEnabled={hasOverride}
          onClose={() => setShowBpmPicker(false)}
          onSave={(bpm, override) => {
            if (isEditing && draft) {
              updateDraft((b) => ({
                ...b,
                bpmOverride: override ? bpm : undefined,
              }))
            } else {
              if (override) {
                setBarBpmOverride(grooveId, barIndex, bpm)
              } else {
                setBpm(grooveId, bpm)
                setBarBpmOverride(grooveId, barIndex, undefined)
              }
            }
            setShowBpmPicker(false)
          }}
        />
      )}

      {showTimeSignaturePicker && (
        <TimeSignaturePicker
          value={displayTimeSignature}
          grooveDefault={grooveTimeSignature}
          showOverrideToggle
          overrideEnabled={hasTimeSignatureOverride}
          onClose={() => setShowTimeSignaturePicker(false)}
          onSave={handleSaveTimeSignature}
        />
      )}

      {showVolumeControls && (
        <VolumeControls
          volume={playbackVolume}
          onChange={setPlaybackVolume}
          onClose={() => setShowVolumeControls(false)}
        />
      )}

      {showBarActions && savedBar && (
        <BarActionsSheet
          barNumber={barIndex + 1}
          clipboardBars={clipboardBars}
          destinationBar={savedBar}
          canDelete={canDeleteCurrentBar}
          onDuplicate={handleDuplicateBar}
          onCopy={handleCopyBar}
          onPasteInsertAfter={handlePasteInsertAfter}
          onPasteReplace={handlePasteReplace}
          onDelete={handleDeleteBar}
          onClearClipboard={clearClipboard}
          onClose={() => setShowBarActions(false)}
        />
      )}
    </div>
  )
}
