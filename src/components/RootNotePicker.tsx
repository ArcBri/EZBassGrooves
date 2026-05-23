import { ROOT_NOTES } from '../types'

type RootNotePickerProps = {
  value?: string
  onChange: (note: string) => void
  onClose: () => void
}

export function RootNotePicker({ value, onChange, onClose }: RootNotePickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-center text-sm font-semibold text-slate-700">Root note</h3>
        <div className="grid grid-cols-4 gap-2">
          {ROOT_NOTES.map((note) => (
            <button
              key={note}
              type="button"
              onClick={() => {
                onChange(note)
                onClose()
              }}
              className={`min-h-[44px] rounded-lg text-sm font-medium ${
                value === note
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-800 active:bg-slate-200'
              }`}
            >
              {note}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full min-h-[44px] rounded-lg text-sm text-slate-500"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
