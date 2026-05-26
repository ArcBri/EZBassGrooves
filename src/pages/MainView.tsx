import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BarRangeActionsSheet } from '../components/BarRangeActionsSheet'
import { BpmPicker } from '../components/BpmPicker'
import { DisplayModeToggle, ViewModeChip } from '../components/DisplayModeToggle'
import { StaffSystem, type SystemBar } from '../components/StaffSystem'
import { TimeSignaturePicker } from '../components/TimeSignaturePicker'
import { VolumeControls } from '../components/VolumeControls'
import { usePlayhead } from '../hooks/usePlayhead'
import {
  effectiveBpm,
  effectiveTimeSignature,
  timeSignatureTotalBeats,
  trimSlotsToFit,
} from '../lib/notation'
import type { PlayBar } from '../lib/metronome'
import { useGroovesStore } from '../state/groovesStore'
import { useTutorialStore } from '../state/tutorialStore'
import { DEFAULT_BPM, type TimeSignature } from '../types'

type MainViewProps = {
  grooveId: string
  onBack: () => void
  onOpenBar: (barIndex: number) => void
}

const MIN_BAR_WIDTH = 180

export function MainView({ grooveId, onBack, onOpenBar }: MainViewProps) {
  const groove = useGroovesStore((s) => s.getGroove(grooveId))
  const renameGroove = useGroovesStore((s) => s.renameGroove)
  const addBar = useGroovesStore((s) => s.addBar)
  const commitBar = useGroovesStore((s) => s.commitBar)
  const setBpm = useGroovesStore((s) => s.setBpm)
  const setGrooveTimeSignature = useGroovesStore((s) => s.setGrooveTimeSignature)
  const noteDisplayMode = useGroovesStore((s) => s.noteDisplayMode)
  const setNoteDisplayMode = useGroovesStore((s) => s.setNoteDisplayMode)
  const playbackVolume = useGroovesStore((s) => s.playbackVolume)
  const setPlaybackVolume = useGroovesStore((s) => s.setPlaybackVolume)
  const clipboardBars = useGroovesStore((s) => s.clipboardBars)
  const copyBarsToClipboard = useGroovesStore((s) => s.copyBarsToClipboard)
  const clearClipboard = useGroovesStore((s) => s.clearClipboard)
  const duplicateBarsAt = useGroovesStore((s) => s.duplicateBarsAt)
  const deleteBarsAt = useGroovesStore((s) => s.deleteBarsAt)
  const insertBarsAfter = useGroovesStore((s) => s.insertBarsAfter)
  const replaceBarsWith = useGroovesStore((s) => s.replaceBarsWith)
  const saveGroove = useGroovesStore((s) => s.saveGroove)
  const discardGrooveChanges = useGroovesStore((s) => s.discardGrooveChanges)
  const isDirty = useGroovesStore((s) => Boolean(s.dirtyGrooveIds[grooveId]))
  const tutorialNotify = useTutorialStore((s) => s.notify)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [showBpmPicker, setShowBpmPicker] = useState(false)
  const [showTimeSignaturePicker, setShowTimeSignaturePicker] = useState(false)
  const [showVolumeControls, setShowVolumeControls] = useState(false)

  // Select-mode + range selection.
  const [selectMode, setSelectMode] = useState(false)
  const [selectAnchor, setSelectAnchor] = useState<number | null>(null)
  const [selectFar, setSelectFar] = useState<number | null>(null)
  // Single-bar context when triggered via long-press outside select mode.
  const [longPressIndex, setLongPressIndex] = useState<number | null>(null)
  const [showRangeActions, setShowRangeActions] = useState(false)

  const { isPlaying, current, play, stop } = usePlayhead()

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(360)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setContainerWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    return () => stop()
  }, [stop])

  const systems = useMemo<SystemBar[][]>(() => {
    if (!groove) return []
    const barsPerSystem = Math.max(1, Math.floor(containerWidth / MIN_BAR_WIDTH))

    let prevBpm: number | null = null
    let prevTs: TimeSignature | null = null
    const enriched: SystemBar[] = groove.bars.map((bar, index) => {
      const bpm = effectiveBpm(groove, index)
      const ts = effectiveTimeSignature(groove, index)
      const showBpm = prevBpm === null || prevBpm !== bpm
      const showTimeSignature =
        prevTs === null || prevTs.num !== ts.num || prevTs.den !== ts.den
      prevBpm = bpm
      prevTs = ts
      return { bar, index, bpm, showBpm, showTimeSignature }
    })

    const result: SystemBar[][] = []
    for (let i = 0; i < enriched.length; i += barsPerSystem) {
      result.push(enriched.slice(i, i + barsPerSystem))
    }
    return result
  }, [groove, containerWidth])

  const playPlan = useMemo((): PlayBar[] => {
    if (!groove) return []
    return groove.bars.map((bar, barIndex) => ({
      barIndex,
      bpm: effectiveBpm(groove, barIndex),
      bar,
    }))
  }, [groove])

  const grooveBpm = groove?.bpm ?? DEFAULT_BPM
  const grooveTimeSignature = groove?.defaultTimeSignature ?? { num: 4, den: 4 }

  const selectedRange = useMemo(() => {
    if (selectMode && selectAnchor != null && selectFar != null) {
      return {
        from: Math.min(selectAnchor, selectFar),
        to: Math.max(selectAnchor, selectFar),
      }
    }
    if (!selectMode && longPressIndex != null) {
      return { from: longPressIndex, to: longPressIndex }
    }
    return null
  }, [selectMode, selectAnchor, selectFar, longPressIndex])

  const clearSelection = useCallback(() => {
    setSelectAnchor(null)
    setSelectFar(null)
  }, [])

  const handleTapBar = useCallback(
    (idx: number) => {
      if (isPlaying) return
      if (selectMode) {
        if (selectAnchor == null) {
          setSelectAnchor(idx)
          setSelectFar(idx)
          return
        }
        // Tapping the only-selected bar deselects it.
        if (selectAnchor === idx && selectFar === idx) {
          clearSelection()
          return
        }
        setSelectFar(idx)
        return
      }
      onOpenBar(idx)
    },
    [isPlaying, selectMode, selectAnchor, selectFar, clearSelection, onOpenBar],
  )

  const handleLongPressBar = useCallback(
    (idx: number) => {
      if (isPlaying) return
      if (selectMode) {
        if (selectAnchor == null) {
          setSelectAnchor(idx)
          setSelectFar(idx)
        } else {
          setSelectFar(idx)
        }
        return
      }
      setLongPressIndex(idx)
      setShowRangeActions(true)
    },
    [isPlaying, selectMode, selectAnchor],
  )

  const closeRangeActions = useCallback(() => {
    setShowRangeActions(false)
    setLongPressIndex(null)
  }, [])

  const handleRangeDuplicate = useCallback(() => {
    if (!selectedRange) return
    stop()
    duplicateBarsAt(grooveId, selectedRange.from, selectedRange.to)
    clearSelection()
  }, [selectedRange, stop, duplicateBarsAt, grooveId, clearSelection])

  const handleRangeCopy = useCallback(() => {
    if (!selectedRange) return
    copyBarsToClipboard(grooveId, selectedRange.from, selectedRange.to)
  }, [selectedRange, copyBarsToClipboard, grooveId])

  const handleRangeDelete = useCallback(() => {
    if (!selectedRange) return
    const count = selectedRange.to - selectedRange.from + 1
    if (!groove) return
    if (count >= groove.bars.length) {
      alert('Cannot delete every bar. Keep at least one bar in the groove.')
      return
    }
    const msg =
      count === 1
        ? `Delete bar ${selectedRange.from + 1}?`
        : `Delete bars ${selectedRange.from + 1}–${selectedRange.to + 1}?`
    if (!confirm(msg)) return
    stop()
    deleteBarsAt(grooveId, selectedRange.from, selectedRange.to)
    clearSelection()
  }, [selectedRange, groove, stop, deleteBarsAt, grooveId, clearSelection])

  const handleRangePasteInsertAfter = useCallback(() => {
    if (!selectedRange || clipboardBars.length === 0) return
    stop()
    insertBarsAfter(grooveId, selectedRange.to, clipboardBars)
    clearSelection()
  }, [selectedRange, clipboardBars, stop, insertBarsAfter, grooveId, clearSelection])

  const handleRangePasteReplace = useCallback(() => {
    if (!selectedRange || clipboardBars.length === 0) return
    const count = selectedRange.to - selectedRange.from + 1
    const msg =
      count === 1
        ? `Replace bar ${selectedRange.from + 1} with ${clipboardBars.length === 1 ? 'the clipboard' : `${clipboardBars.length} bars`}?`
        : `Replace bars ${selectedRange.from + 1}–${selectedRange.to + 1} with ${clipboardBars.length === 1 ? 'the clipboard' : `${clipboardBars.length} bars`}?`
    if (!confirm(msg)) return
    stop()
    replaceBarsWith(grooveId, selectedRange.from, selectedRange.to, clipboardBars)
    clearSelection()
  }, [selectedRange, clipboardBars, stop, replaceBarsWith, grooveId, clearSelection])

  const toggleSelectMode = useCallback(() => {
    setSelectMode((m) => {
      if (m) clearSelection()
      return !m
    })
  }, [clearSelection])

  if (!groove) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-slate-500">Groove not found.</p>
        <button type="button" onClick={onBack} className="ml-2 text-blue-600">
          Back
        </button>
      </div>
    )
  }

  const handlePlay = () => {
    if (isPlaying) {
      stop()
    } else {
      play(playPlan, 0)
      tutorialNotify('playback:started')
    }
  }

  const handleSaveGroove = () => {
    saveGroove(grooveId)
    tutorialNotify('groove:saved')
  }

  const handleDiscardGroove = () => {
    if (!isDirty) return
    if (!confirm('Discard unsaved changes to this groove?')) return
    stop()
    discardGrooveChanges(grooveId)
    // If the groove was never persisted (brand-new empty groove), discarding
    // removes it entirely; bounce back to the library.
    const stillExists = useGroovesStore
      .getState()
      .grooves.some((g) => g.id === grooveId)
    if (!stillExists) onBack()
  }

  const handleSaveTimeSignature = (timeSignature: TimeSignature) => {
    setGrooveTimeSignature(grooveId, timeSignature)
    const shouldApplyToBars =
      groove.bars.length > 0 &&
      confirm('Apply this time signature to all existing bars? Bars with too many slots will be trimmed.')

    if (shouldApplyToBars) {
      const maxBeats = timeSignatureTotalBeats(timeSignature)
      groove.bars.forEach((bar, index) => {
        commitBar(grooveId, index, {
          ...bar,
          timeSignature,
          slots: trimSlotsToFit(bar.slots, maxBeats),
        })
      })
    }

    setShowTimeSignaturePicker(false)
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <header className="flex items-center gap-1 border-b border-slate-200 bg-white px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] min-w-[44px] rounded-lg text-lg text-slate-600 active:bg-slate-100"
          aria-label="Back"
        >
          ←
        </button>
        {editingName ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (nameValue.trim()) renameGroove(grooveId, nameValue.trim())
              setEditingName(false)
            }}
          >
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="min-h-[44px] flex-1 rounded-lg border border-slate-300 px-3 text-base font-semibold"
            />
            <button type="submit" className="min-h-[44px] px-3 text-sm font-medium text-blue-600">
              Done
            </button>
          </form>
        ) : (
          <>
            <button
              type="button"
              className="flex-1 truncate text-left text-lg font-semibold text-slate-900 min-h-[44px] px-2"
              onClick={() => {
                setNameValue(groove.name)
                setEditingName(true)
              }}
            >
              {groove.name}
            </button>
            <button
              type="button"
              onClick={() => setShowBpmPicker(true)}
              className="min-h-[40px] rounded-lg bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 shrink-0"
            >
              {grooveBpm} BPM ▾
            </button>
            <DisplayModeToggle
              value={noteDisplayMode}
              onChange={setNoteDisplayMode}
              size="md"
            />
          </>
        )}
      </header>

      <div className="border-b border-slate-100 bg-white px-4 py-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ViewModeChip mode={noteDisplayMode} />
          {isDirty && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              Unsaved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isPlaying && current && (
            <span className="text-xs text-amber-700 font-medium">
              Bar {current.barIndex + 1}
            </span>
          )}
          <button
            type="button"
            onClick={toggleSelectMode}
            disabled={isPlaying}
            aria-pressed={selectMode}
            className={`min-h-[32px] rounded-lg px-2.5 text-xs font-semibold disabled:opacity-40 ${
              selectMode
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {selectMode ? 'Done' : 'Select'}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto px-3 py-4 ${
          noteDisplayMode === 'degree' ? 'bg-amber-50/60' : 'bg-white'
        }`}
      >
        {groove.bars.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            No bars yet. Tap <strong>+ Add bar</strong> to start.
          </div>
        ) : (
          <div className="space-y-5">
            {systems.map((systemBars, sysIdx) => (
              <StaffSystem
                key={sysIdx}
                bars={systemBars}
                width={containerWidth - 24}
                onTapBar={handleTapBar}
                onLongPressBar={handleLongPressBar}
                tutorialBarIndex={0}
                tutorialBarToken="main-bar"
                isLastSystem={sysIdx === systems.length - 1}
                noteDisplayMode={noteDisplayMode}
                highlightBarIndex={current?.barIndex ?? null}
                highlightSlotIndex={current?.slotIndex ?? null}
                selectedRange={selectedRange}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
        {selectMode && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs">
            <span className="flex-1 font-medium text-blue-900">
              {selectAnchor == null || selectFar == null
                ? 'Tap bars to select. Tap a second bar to extend the range.'
                : selectedRange &&
                  (selectedRange.from === selectedRange.to
                    ? `Selected: bar ${selectedRange.from + 1}`
                    : `Selected: bars ${selectedRange.from + 1}–${selectedRange.to + 1}`)}
            </span>
            <button
              type="button"
              disabled={!selectedRange}
              onClick={() => setShowRangeActions(true)}
              className="min-h-[32px] rounded-lg bg-blue-600 px-2.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              Actions ▾
            </button>
          </div>
        )}
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTimeSignaturePicker(true)}
              className="min-h-[36px] rounded-lg bg-slate-100 px-2.5 text-xs font-semibold text-slate-700"
            >
              {grooveTimeSignature.num}/{grooveTimeSignature.den} ▾
            </button>
            <span>{grooveBpm} BPM</span>
            <button
              type="button"
              onClick={() => setShowVolumeControls(true)}
              aria-label="Playback volume"
              className="min-h-[36px] rounded-lg bg-slate-100 px-2.5 text-xs font-semibold text-slate-700"
            >
              {playbackVolume.click === 0 && playbackVolume.synth === 0 ? 'Vol: muted' : 'Vol ▾'}
            </button>
          </span>
          <span>
            {groove.bars.length} bar{groove.bars.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSaveGroove}
            data-tutorial="main-save"
            disabled={!isDirty}
            className={`min-h-[44px] flex-1 rounded-xl text-sm font-semibold disabled:opacity-40 ${
              isDirty
                ? 'bg-blue-600 text-white active:bg-blue-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {isDirty ? 'Save groove' : 'Saved'}
          </button>
          <button
            type="button"
            onClick={handleDiscardGroove}
            disabled={!isDirty}
            className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 disabled:opacity-40"
          >
            Discard
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePlay}
            data-tutorial="main-play"
            disabled={groove.bars.length === 0}
            className={`min-h-[48px] flex-1 rounded-xl text-sm font-semibold text-white disabled:opacity-40 ${
              isPlaying ? 'bg-red-600 active:bg-red-700' : 'bg-emerald-600 active:bg-emerald-700'
            }`}
          >
            {isPlaying ? '■ Stop' : '▶ Play'}
          </button>
          <button
            type="button"
            onClick={() => addBar(grooveId)}
            className="min-h-[48px] flex-1 rounded-xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-700 active:bg-slate-50"
          >
            + Add bar
          </button>
        </div>
      </footer>

      {showBpmPicker && (
        <BpmPicker
          value={grooveBpm}
          onClose={() => setShowBpmPicker(false)}
          onSave={(bpm) => {
            setBpm(grooveId, bpm)
            setShowBpmPicker(false)
          }}
        />
      )}

      {showTimeSignaturePicker && (
        <TimeSignaturePicker
          value={grooveTimeSignature}
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

      {showRangeActions && selectedRange && (
        <BarRangeActionsSheet
          fromBarNumber={selectedRange.from + 1}
          toBarNumber={selectedRange.to + 1}
          clipboardBars={clipboardBars}
          onDuplicate={handleRangeDuplicate}
          onCopy={handleRangeCopy}
          onDelete={handleRangeDelete}
          onPasteInsertAfter={handleRangePasteInsertAfter}
          onPasteReplaceSelection={handleRangePasteReplace}
          onClearClipboard={clearClipboard}
          onClose={closeRangeActions}
        />
      )}
    </div>
  )
}
