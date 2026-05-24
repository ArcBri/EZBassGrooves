import { useMemo, useRef, useState } from 'react'
import { TagEditor } from '../components/TagEditor'
import { exportGrooveToFile, importGrooveFromFile } from '../lib/storage'
import { useGroovesStore } from '../state/groovesStore'
import type { Groove } from '../types'

type LibraryPageProps = {
  onOpenGroove: (id: string) => void
}

type SortBy = 'updated' | 'created' | 'nameAsc' | 'nameDesc'

export function LibraryPage({ onOpenGroove }: LibraryPageProps) {
  const grooves = useGroovesStore((s) => s.grooves)
  const createGroove = useGroovesStore((s) => s.createGroove)
  const renameGroove = useGroovesStore((s) => s.renameGroove)
  const deleteGroove = useGroovesStore((s) => s.deleteGroove)
  const duplicateGroove = useGroovesStore((s) => s.duplicateGroove)
  const importGroove = useGroovesStore((s) => s.importGroove)
  const toggleFavorite = useGroovesStore((s) => s.toggleFavorite)
  const setTags = useGroovesStore((s) => s.setTags)
  const allTags = useGroovesStore((s) => s.allTags)

  const fileRef = useRef<HTMLInputElement>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [tagsGrooveId, setTagsGrooveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>('updated')

  const tagSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return allTags().filter((t) => t.startsWith(q)).slice(0, 6)
  }, [search, allTags, grooves])

  const filteredGrooves = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = [...grooves]

    if (favoritesOnly) {
      list = list.filter((g) => g.favorite)
    }

    if (q) {
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.tags ?? []).some((t) => t.includes(q)),
      )
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return b.createdAt - a.createdAt
        case 'nameAsc':
          return a.name.localeCompare(b.name)
        case 'nameDesc':
          return b.name.localeCompare(a.name)
        case 'updated':
        default:
          return b.updatedAt - a.updatedAt
      }
    })

    return list
  }, [grooves, search, favoritesOnly, sortBy])

  const tagsGroove = tagsGrooveId ? grooves.find((g) => g.id === tagsGrooveId) : null

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

      <div className="border-b border-slate-200 bg-white px-4 py-3 space-y-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or tag…"
          className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-base"
        />
        {tagSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tagSuggestions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSearch(t)}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
              >
                {t}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => setFavoritesOnly((v) => !v)}
            className={`min-h-[40px] rounded-lg px-3 text-sm font-medium border ${
              favoritesOnly
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-white border-slate-300 text-slate-600'
            }`}
          >
            ★ Favorites
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="min-h-[40px] flex-1 rounded-lg border border-slate-300 px-2 text-sm bg-white"
          >
            <option value="updated">Recently updated</option>
            <option value="created">Recently created</option>
            <option value="nameAsc">Name A–Z</option>
            <option value="nameDesc">Name Z–A</option>
          </select>
        </div>
        <div className="flex gap-2">
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
      </div>

      <ul className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredGrooves.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            {grooves.length === 0 ? (
              <>
                No grooves yet. Tap <strong>New groove</strong> to start.
              </>
            ) : (
              <>No grooves match your search.</>
            )}
          </li>
        )}
        {filteredGrooves.map((g) => (
          <GrooveRow
            key={g.id}
            groove={g}
            formatDate={formatDate}
            menuOpen={menuId === g.id}
            renaming={renamingId === g.id}
            renameValue={renameValue}
            onRenameValueChange={setRenameValue}
            onOpen={() => onOpenGroove(g.id)}
            onToggleFavorite={() => toggleFavorite(g.id)}
            onMenuToggle={() => setMenuId(menuId === g.id ? null : g.id)}
            onRenameSubmit={() => {
              if (renameValue.trim()) renameGroove(g.id, renameValue.trim())
              setRenamingId(null)
            }}
            onRenameStart={() => {
              setRenamingId(g.id)
              setRenameValue(g.name)
              setMenuId(null)
            }}
            onTags={() => {
              setTagsGrooveId(g.id)
              setMenuId(null)
            }}
            onDuplicate={() => {
              duplicateGroove(g.id)
              setMenuId(null)
            }}
            onExport={() => exportGrooveToFile(g)}
            onDelete={() => {
              if (confirm(`Delete "${g.name}"?`)) deleteGroove(g.id)
              setMenuId(null)
            }}
          />
        ))}
      </ul>

      {tagsGroove && (
        <TagEditor
          grooveName={tagsGroove.name}
          tags={tagsGroove.tags ?? []}
          allTags={allTags()}
          onSave={(tags) => setTags(tagsGroove.id, tags)}
          onClose={() => setTagsGrooveId(null)}
        />
      )}
    </div>
  )
}

function GrooveRow({
  groove: g,
  formatDate,
  menuOpen,
  renaming,
  renameValue,
  onRenameValueChange,
  onOpen,
  onToggleFavorite,
  onMenuToggle,
  onRenameSubmit,
  onRenameStart,
  onTags,
  onDuplicate,
  onExport,
  onDelete,
}: {
  groove: Groove
  formatDate: (ts: number) => string
  menuOpen: boolean
  renaming: boolean
  renameValue: string
  onRenameValueChange: (v: string) => void
  onOpen: () => void
  onToggleFavorite: () => void
  onMenuToggle: () => void
  onRenameSubmit: () => void
  onRenameStart: () => void
  onTags: () => void
  onDuplicate: () => void
  onExport: () => void
  onDelete: () => void
}) {
  return (
    <li className="relative rounded-xl border border-slate-200 bg-white shadow-sm">
      {renaming ? (
        <form
          className="flex gap-2 p-3"
          onSubmit={(e) => {
            e.preventDefault()
            onRenameSubmit()
          }}
        >
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            className="min-h-[44px] flex-1 rounded-lg border border-slate-300 px-3 text-base"
          />
          <button type="submit" className="min-h-[44px] rounded-lg bg-slate-900 px-4 text-sm text-white">
            OK
          </button>
        </form>
      ) : (
        <div className="flex w-full items-start gap-1 p-3 min-h-[72px]">
          <button
            type="button"
            onClick={onToggleFavorite}
            className="min-h-[44px] min-w-[44px] shrink-0 text-xl leading-none"
            aria-label={g.favorite ? 'Unfavorite' : 'Favorite'}
          >
            {g.favorite ? '★' : '☆'}
          </button>
          <button
            type="button"
            className="flex flex-1 min-w-0 text-left active:bg-slate-50 -m-2 p-2 rounded-lg"
            onClick={onOpen}
          >
            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-900">{g.name}</div>
              <div className="text-xs text-slate-500">
                {g.bars.length} bar{g.bars.length !== 1 ? 's' : ''} · {formatDate(g.updatedAt)}
                {g.bpm != null && ` · ${g.bpm} BPM`}
              </div>
              {(g.tags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {g.tags!.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </button>
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] rounded-lg text-slate-400 text-xl leading-none shrink-0"
            onClick={onMenuToggle}
            aria-label="Menu"
          >
            ⋮
          </button>
        </div>
      )}

      {menuOpen && !renaming && (
        <div className="border-t border-slate-100 px-2 py-2 flex flex-wrap gap-1">
          <MenuBtn label="Rename" onClick={onRenameStart} />
          <MenuBtn label="Tags…" onClick={onTags} />
          <MenuBtn label="Duplicate" onClick={onDuplicate} />
          <MenuBtn label="Export" onClick={onExport} />
          <MenuBtn label="Delete" danger onClick={onDelete} />
        </div>
      )}
    </li>
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
