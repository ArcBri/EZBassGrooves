import { useState } from 'react'
import { DEFAULT_BPM } from '../types'

type BpmPickerProps = {
  value: number
  grooveDefault?: number
  showOverrideToggle?: boolean
  overrideEnabled?: boolean
  onClose: () => void
  onSave: (bpm: number, overrideEnabled: boolean) => void
}

const MIN_BPM = 30
const MAX_BPM = 300

function clampBpm(n: number): number {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(n)))
}

export function BpmPicker({
  value,
  grooveDefault = DEFAULT_BPM,
  showOverrideToggle = false,
  overrideEnabled: initialOverride = false,
  onClose,
  onSave,
}: BpmPickerProps) {
  const [bpm, setBpm] = useState(clampBpm(value))
  const [override, setOverride] = useState(initialOverride)

  const adjust = (delta: number) => setBpm((v) => clampBpm(v + delta))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-center text-sm font-semibold text-slate-800">Tempo (BPM)</h3>

        <div className="flex items-center justify-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => adjust(-10)}
            className="min-h-[44px] min-w-[52px] rounded-lg bg-slate-100 text-sm font-semibold"
          >
            −10
          </button>
          <button
            type="button"
            onClick={() => adjust(-1)}
            className="min-h-[44px] min-w-[44px] rounded-lg bg-slate-100 text-lg font-semibold"
          >
            −
          </button>
          <input
            type="number"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(e) => setBpm(clampBpm(Number(e.target.value) || DEFAULT_BPM))}
            className="w-20 min-h-[48px] rounded-lg border border-slate-300 text-center text-2xl font-bold"
          />
          <button
            type="button"
            onClick={() => adjust(1)}
            className="min-h-[44px] min-w-[44px] rounded-lg bg-slate-100 text-lg font-semibold"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => adjust(10)}
            className="min-h-[44px] min-w-[52px] rounded-lg bg-slate-100 text-sm font-semibold"
          >
            +10
          </button>
        </div>

        {showOverrideToggle && (
          <label className="flex items-center gap-2 mb-3 min-h-[44px] px-1">
            <input
              type="checkbox"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
              className="h-5 w-5"
            />
            <span className="text-sm text-slate-700">
              Override for this bar only
              {!override && (
                <span className="text-slate-400"> (groove default: {grooveDefault})</span>
              )}
            </span>
          </label>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] flex-1 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(bpm, override)}
            className="min-h-[48px] flex-1 rounded-xl bg-slate-900 text-sm font-semibold text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
