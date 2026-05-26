import type { StringIndex } from '../types'
import { STRING_LABELS } from '../types'

type FretKeypadProps = {
  slotIndex: number
  string: StringIndex
  onSelect: (fret: number | 'X') => void
  onClear: () => void
  onClose: () => void
  hint?: string
}

const FRET_ROWS = [
  [0, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11],
  [12, 13, 14, 15, 16, 17],
  [18, 19, 20, 21, 22, 23, 24],
]

export function FretKeypad({ slotIndex, string, onSelect, onClear, onClose, hint }: FretKeypadProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2" onClick={onClose}>
      <div
        data-tutorial="bar-keypad"
        className="w-full max-w-md rounded-2xl bg-white p-3 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-2 text-center text-sm text-slate-600">
          <span className="font-semibold">{STRING_LABELS[string]}</span>-string, slot{' '}
          <span className="font-semibold">{slotIndex + 1}</span>
        </p>
        {hint && (
          <p className="mb-2 text-center text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
            {hint}
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          {FRET_ROWS.map((row, ri) => (
            <div key={ri} className="flex flex-wrap justify-center gap-1.5">
              {row.map((fret) => (
                <button
                  key={fret}
                  type="button"
                  onClick={() => {
                    onSelect(fret)
                    onClose()
                  }}
                  className="min-h-[44px] min-w-[44px] rounded-lg bg-slate-100 text-sm font-medium text-slate-900 active:bg-slate-200"
                >
                  {fret}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => {
              onSelect('X')
              onClose()
            }}
            className="min-h-[44px] flex-1 rounded-lg bg-amber-100 font-medium text-amber-900 active:bg-amber-200"
          >
            X muted
          </button>
          <button
            type="button"
            onClick={() => {
              onClear()
              onClose()
            }}
            className="min-h-[44px] flex-1 rounded-lg bg-red-50 font-medium text-red-700 active:bg-red-100"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
