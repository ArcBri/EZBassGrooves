import { useState } from 'react'
import type { Bar } from '../types'
import { slotsUsedBeats, barTotalBeats } from '../lib/notation'

type BarActionsSheetProps = {
  barNumber: number
  clipboardBars: Bar[]
  destinationBar: Bar
  canDelete: boolean
  onDuplicate: () => void
  onCopy: () => void
  onPasteInsertAfter: () => void
  onPasteReplace: () => void
  onDelete: () => void
  onClearClipboard: () => void
  onClose: () => void
}

function describeClipboard(bars: Bar[]): string {
  if (bars.length === 0) return 'Clipboard is empty'
  if (bars.length === 1) {
    const bar = bars[0]!
    const ts = `${bar.timeSignature.num}/${bar.timeSignature.den}`
    const slotCount = bar.slots.length
    const root = bar.rootNote ? `, root ${bar.rootNote}` : ''
    return `1 bar (${ts}, ${slotCount} slot${slotCount === 1 ? '' : 's'}${root})`
  }
  return `${bars.length} bars`
}

export function BarActionsSheet({
  barNumber,
  clipboardBars,
  destinationBar,
  canDelete,
  onDuplicate,
  onCopy,
  onPasteInsertAfter,
  onPasteReplace,
  onDelete,
  onClearClipboard,
  onClose,
}: BarActionsSheetProps) {
  const [pastePromptOpen, setPastePromptOpen] = useState(false)

  const hasClipboard = clipboardBars.length > 0
  const isSingleClipboard = clipboardBars.length === 1
  const destinationUsed = slotsUsedBeats(destinationBar.slots)
  const destinationCapacity = barTotalBeats(destinationBar)
  const firstClipboardBar = clipboardBars[0] ?? null
  const clipboardWouldOverflowDestination = !!(
    isSingleClipboard &&
    firstClipboardBar &&
    slotsUsedBeats(firstClipboardBar.slots) > destinationCapacity + 1e-9
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-center text-sm font-semibold text-slate-800">
          Bar {barNumber} actions
        </h3>

        {!pastePromptOpen ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                onDuplicate()
                onClose()
              }}
              className="min-h-[48px] w-full rounded-xl bg-slate-900 text-sm font-semibold text-white"
            >
              Duplicate this bar
            </button>

            <button
              type="button"
              onClick={() => {
                onCopy()
                onClose()
              }}
              className="min-h-[48px] w-full rounded-xl border border-slate-300 text-sm font-semibold text-slate-700"
            >
              Copy to clipboard
            </button>

            <button
              type="button"
              disabled={!hasClipboard}
              onClick={() => setPastePromptOpen(true)}
              className="min-h-[48px] w-full rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              Paste from clipboard...
            </button>

            <button
              type="button"
              disabled={!canDelete}
              onClick={() => {
                onDelete()
                onClose()
              }}
              className="min-h-[48px] w-full rounded-xl border border-red-300 text-sm font-semibold text-red-700 disabled:opacity-40"
            >
              {canDelete ? 'Delete this bar' : 'Delete (cannot remove last bar)'}
            </button>

            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Clipboard: {describeClipboard(clipboardBars)}
              {hasClipboard && (
                <button
                  type="button"
                  onClick={() => {
                    onClearClipboard()
                  }}
                  className="ml-2 font-semibold text-slate-700 underline"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-2 min-h-[48px] w-full rounded-xl text-sm font-medium text-slate-500"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="mb-2 text-center text-xs text-slate-500">
              Paste clipboard ({describeClipboard(clipboardBars)}) where?
            </p>

            {clipboardWouldOverflowDestination && (
              <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
                Note: clipboard has more beats than fits in bar {barNumber} ({destinationUsed.toFixed(2)}/{destinationCapacity.toFixed(2)}).
                Replace will overwrite the time signature too.
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                onPasteInsertAfter()
                onClose()
              }}
              className="min-h-[48px] w-full rounded-xl bg-slate-900 text-sm font-semibold text-white"
            >
              Insert {isSingleClipboard ? '' : `${clipboardBars.length} bars `}after bar {barNumber}
            </button>

            <button
              type="button"
              onClick={() => {
                onPasteReplace()
                onClose()
              }}
              className="min-h-[48px] w-full rounded-xl border border-red-300 text-sm font-semibold text-red-700"
            >
              Replace bar {barNumber}
              {!isSingleClipboard && ` (with ${clipboardBars.length} bars)`}
            </button>

            <button
              type="button"
              onClick={() => setPastePromptOpen(false)}
              className="min-h-[48px] w-full rounded-xl text-sm font-medium text-slate-500"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
