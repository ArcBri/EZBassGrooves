import type { StringIndex } from '../types'
import { STRING_LABELS } from '../types'
import { DEGREE_KEYPAD_ROWS, scaleDegreeToFret } from '../lib/scale'

type ScaleKeypadProps = {
  slotIndex: number
  string: StringIndex
  rootNote: string
  onSelect: (fret: number | 'X') => void
  onClear: () => void
  onClose: () => void
}

export function ScaleKeypad({
  slotIndex,
  string,
  rootNote,
  onSelect,
  onClear,
  onClose,
}: ScaleKeypadProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2" onClick={onClose}>
      <div
        data-tutorial="bar-keypad"
        className="w-full max-w-md rounded-2xl bg-amber-50 p-3 shadow-xl border border-amber-200"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-1 text-center text-sm text-amber-950">
          Scale degree · <span className="font-semibold">{STRING_LABELS[string]}</span>-string · slot{' '}
          <span className="font-semibold">{slotIndex + 1}</span>
        </p>
        <p className="mb-2 text-center text-xs text-amber-800">Root: {rootNote}</p>
        <div className="flex flex-col gap-1.5">
          {DEGREE_KEYPAD_ROWS.map((row, ri) => (
            <div key={ri} className="flex flex-wrap justify-center gap-1.5">
              {row.map((deg) => {
                const fret = scaleDegreeToFret(string, rootNote, deg.num, deg.acc)
                const disabled = fret === null
                return (
                  <button
                    key={deg.label}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (fret !== null) {
                        onSelect(fret)
                        onClose()
                      }
                    }}
                    className={`min-h-[40px] min-w-[40px] rounded-lg text-sm font-semibold ${
                      disabled
                        ? 'bg-amber-100/50 text-amber-300 cursor-not-allowed'
                        : 'bg-white text-amber-950 border border-amber-200 active:bg-amber-100'
                    }`}
                  >
                    {deg.label}
                  </button>
                )
              })}
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
            className="min-h-[44px] flex-1 rounded-lg bg-amber-200 font-medium text-amber-950 active:bg-amber-300"
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
