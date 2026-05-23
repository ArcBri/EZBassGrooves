import { useRef, useState } from 'react'
import { exportGrooveToFile, importGrooveFromFile } from '../lib/storage'
import { useGroovesStore } from '../state/groovesStore'

type LibraryPageProps = {
  onOpenGroove: (id: string) => void
}

export function LibraryPage({ onOpenGroove }: LibraryPageProps) {
  const grooves = useGroovesStore((s) => s.grooves)
  const createGroove = useGroovesStore((s) => s.createGroove)
  const renameGroove = useGroovesStore((s) => s.renameGroove)
  const deleteGroove = useGroovesStore((s) => s.deleteGroove)
  const duplicateGroove = useGroovesStore((s) => s.duplicateGroove)
  const importGroove = useGroovesStore((s) => s.importGroove)

  const fileRef = useRef<HTMLInputElement>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const handleNew = () => {
    const g = createGroove()
    onOpenGroove(g.id)
  }

  const handleImport = async (file: File) => {
    const groove = await importGrooveFromFile(file)
    if (groove) {
      importGroove(groove)
    } else {
      alert('Could not import file. Expected an EZBassGrooves JSON export.')
    }
  }

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <h1 className="text-xl font-bold text-slate-900">EZBassGrooves</h1>
        <p className="text-sm text-slate-500">Bass grooves & riffs, made easy</p>
      </header>

      <div className="flex gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={handleNew}
          className="min-h-[44px] flex-1 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white active:bg-slate-700"
        >
          + New groove
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 active:bg-slate-50"
        >
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleImport(file)
            e.target.value = ''
          }}
        />
      </div>

      <ul className="flex-1 overflow-y-auto p-4 space-y-2">
        {grooves.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No grooves yet. Tap <strong>New groove</strong> to start.
          </li>
        )}
        {grooves.map((g) => (
          <li
            key={g.id}
            className="relative rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            {renamingId === g.id ? (
              <form
                className="flex gap-2 p-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (renameValue.trim()) renameGroove(g.id, renameValue.trim())
                  setRenamingId(null)
                }}
              >
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="min-h-[44px] flex-1 rounded-lg border border-slate-300 px-3 text-base"
                />
                <button
                  type="submit"
                  className="min-h-[44px] rounded-lg bg-slate-900 px-4 text-sm text-white"
                >
                  OK
                </button>
              </form>
            ) : (
              <div className="flex w-full items-center gap-3 p-4 min-h-[72px]">
                <button
                  type="button"
                  className="flex flex-1 min-w-0 items-center gap-3 text-left active:bg-slate-50 -m-4 p-4"
                  onClick={() => onOpenGroove(g.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-semibold text-slate-900">{g.name}</div>
                    <div className="text-xs text-slate-500">
                      {g.bars.length} bar{g.bars.length !== 1 ? 's' : ''} · {formatDate(g.updatedAt)}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="min-h-[44px] min-w-[44px] rounded-lg text-slate-400 text-xl leading-none shrink-0"
                  onClick={() => setMenuId(menuId === g.id ? null : g.id)}
                  aria-label="Menu"
                >
                  ⋮
                </button>
              </div>
            )}

            {menuId === g.id && renamingId !== g.id && (
              <div className="border-t border-slate-100 px-2 py-2 flex flex-wrap gap-1">
                <MenuBtn
                  label="Rename"
                  onClick={() => {
                    setRenamingId(g.id)
                    setRenameValue(g.name)
                    setMenuId(null)
                  }}
                />
                <MenuBtn
                  label="Duplicate"
                  onClick={() => {
                    duplicateGroove(g.id)
                    setMenuId(null)
                  }}
                />
                <MenuBtn label="Export" onClick={() => exportGrooveToFile(g)} />
                <MenuBtn
                  label="Delete"
                  danger
                  onClick={() => {
                    if (confirm(`Delete "${g.name}"?`)) deleteGroove(g.id)
                    setMenuId(null)
                  }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function MenuBtn({
  label,
  onClick,
  danger,
}: {
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[40px] rounded-lg px-3 text-sm font-medium ${
        danger ? 'text-red-600 active:bg-red-50' : 'text-slate-700 active:bg-slate-100'
      }`}
    >
      {label}
    </button>
  )
}
