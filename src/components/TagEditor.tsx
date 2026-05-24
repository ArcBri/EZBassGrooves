import { useMemo, useState } from 'react'

type TagEditorProps = {
  grooveName: string
  tags: string[]
  allTags: string[]
  onSave: (tags: string[]) => void
  onClose: () => void
}

export function TagEditor({ grooveName, tags, allTags, onSave, onClose }: TagEditorProps) {
  const [draft, setDraft] = useState<string[]>(tags)
  const [input, setInput] = useState('')

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase()
    if (!q) return []
    return allTags.filter((t) => t.includes(q) && !draft.includes(t)).slice(0, 8)
  }, [input, allTags, draft])

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase()
    if (!t || draft.includes(t)) return
    setDraft([...draft, t].sort())
    setInput('')
  }

  const removeTag = (tag: string) => {
    setDraft(draft.filter((t) => t !== tag))
  }

  const commitInput = () => {
    if (!input.trim()) return
    addTag(input)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-center text-sm font-semibold text-slate-800">Tags</h3>
        <p className="mb-3 text-center text-xs text-slate-500 truncate">{grooveName}</p>

        <div className="flex flex-wrap gap-2 min-h-[40px] mb-3">
          {draft.length === 0 && (
            <span className="text-sm text-slate-400">No tags yet</span>
          )}
          {draft.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-sm text-slate-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-slate-500 hover:text-red-600 leading-none"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              commitInput()
            }
          }}
          placeholder="Type a tag, press Enter"
          className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 text-base mb-2"
        />

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {suggestions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => addTag(t)}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 active:bg-slate-200"
              >
                + {t}
              </button>
            ))}
          </div>
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
            onClick={() => {
              onSave(draft)
              onClose()
            }}
            className="min-h-[48px] flex-1 rounded-xl bg-slate-900 text-sm font-semibold text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
