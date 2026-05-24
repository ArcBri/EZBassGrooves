import { useState } from 'react'
import type { TimeSignature } from '../types'

type TimeSignaturePickerProps = {
  value: TimeSignature
  grooveDefault?: TimeSignature
  showOverrideToggle?: boolean
  overrideEnabled?: boolean
  onClose: () => void
  onSave: (timeSignature: TimeSignature, overrideEnabled: boolean) => void
}

const DENOMINATORS = [1, 2, 4, 8, 16] as const
const MIN_NUMERATOR = 1
const MAX_NUMERATOR = 16

function clampNumerator(n: number): number {
  return Math.min(MAX_NUMERATOR, Math.max(MIN_NUMERATOR, Math.round(n)))
}

function isDenominator(n: number): n is TimeSignature['den'] {
  return (DENOMINATORS as readonly number[]).includes(n)
}

function formatTimeSignature(ts: TimeSignature): string {
  return `${ts.num}/${ts.den}`
}

export function TimeSignaturePicker({
  value,
  grooveDefault = { num: 4, den: 4 },
  showOverrideToggle = false,
  overrideEnabled: initialOverride = false,
  onClose,
  onSave,
}: TimeSignaturePickerProps) {
  const [num, setNum] = useState(clampNumerator(value.num))
  const [den, setDen] = useState<TimeSignature['den']>(isDenominator(value.den) ? value.den : 4)
  const [override, setOverride] = useState(initialOverride)

  const adjust = (delta: number) => setNum((v) => clampNumerator(v + delta))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-center text-sm font-semibold text-slate-800">Time Signature</h3>

        <div className="mb-4 rounded-2xl bg-slate-50 p-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</div>
          <div className="mt-1 text-4xl font-black text-slate-900">{num}/{den}</div>
        </div>

        <div className="mb-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Numerator
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => adjust(-1)}
              className="min-h-[44px] min-w-[44px] rounded-lg bg-slate-100 text-lg font-semibold"
            >
              -
            </button>
            <input
              type="number"
              min={MIN_NUMERATOR}
              max={MAX_NUMERATOR}
              value={num}
              onChange={(e) => setNum(clampNumerator(Number(e.target.value) || 4))}
              className="w-20 min-h-[48px] rounded-lg border border-slate-300 text-center text-2xl font-bold"
            />
            <button
              type="button"
              onClick={() => adjust(1)}
              className="min-h-[44px] min-w-[44px] rounded-lg bg-slate-100 text-lg font-semibold"
            >
              +
            </button>
          </div>
        </div>

        <div className="mb-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Denominator
          </div>
          <div className="grid grid-cols-5 gap-2">
            {DENOMINATORS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDen(d)}
                className={`min-h-[44px] rounded-lg text-sm font-bold ${
                  den === d ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
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
                <span className="text-slate-400">
                  {' '}
                  (groove default: {formatTimeSignature(grooveDefault)})
                </span>
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
            onClick={() => onSave({ num, den }, override)}
            className="min-h-[48px] flex-1 rounded-xl bg-slate-900 text-sm font-semibold text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
