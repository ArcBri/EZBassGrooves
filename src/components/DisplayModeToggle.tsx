import type { NoteDisplayMode } from '../lib/scale'

type Props = {
  value: NoteDisplayMode
  onChange: (mode: NoteDisplayMode) => void
  size?: 'sm' | 'md'
}

export function DisplayModeToggle({ value, onChange, size = 'md' }: Props) {
  const heightClass = size === 'sm' ? 'min-h-[36px]' : 'min-h-[40px]'
  const padClass = size === 'sm' ? 'px-2.5 text-xs' : 'px-3 text-sm'

  return (
    <div className={`inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white ${heightClass}`}>
      <button
        type="button"
        onClick={() => onChange('fret')}
        className={`${padClass} font-medium ${
          value === 'fret' ? 'bg-slate-900 text-white' : 'text-slate-600 active:bg-slate-100'
        }`}
        aria-pressed={value === 'fret'}
      >
        Tab
      </button>
      <button
        type="button"
        onClick={() => onChange('degree')}
        className={`${padClass} font-medium border-l border-slate-300 ${
          value === 'degree' ? 'bg-amber-600 text-white' : 'text-slate-600 active:bg-slate-100'
        }`}
        aria-pressed={value === 'degree'}
      >
        Scale
      </button>
    </div>
  )
}

export function ViewModeChip({ mode }: { mode: NoteDisplayMode }) {
  if (mode === 'fret') {
    return (
      <span className="inline-block rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">
        Tab view
      </span>
    )
  }
  return (
    <span className="inline-block rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-950">
      Major Scale Tab view
    </span>
  )
}
