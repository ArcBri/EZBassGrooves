import { useEffect, useMemo, useRef, useState } from 'react'
import { DisplayModeToggle, ViewModeChip } from '../components/DisplayModeToggle'
import { StaffSystem } from '../components/StaffSystem'
import { useGroovesStore } from '../state/groovesStore'

type MainViewProps = {
  grooveId: string
  onBack: () => void
  onOpenBar: (barIndex: number) => void
}

const MIN_BAR_WIDTH = 180

export function MainView({ grooveId, onBack, onOpenBar }: MainViewProps) {
  const groove = useGroovesStore((s) => s.getGroove(grooveId))
  const renameGroove = useGroovesStore((s) => s.renameGroove)
  const addBar = useGroovesStore((s) => s.addBar)
  const noteDisplayMode = useGroovesStore((s) => s.noteDisplayMode)
  const setNoteDisplayMode = useGroovesStore((s) => s.setNoteDisplayMode)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(360)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setContainerWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const systems = useMemo(() => {
    if (!groove) return []
    const barsPerSystem = Math.max(1, Math.floor(containerWidth / MIN_BAR_WIDTH))
    const result: { bar: (typeof groove.bars)[number]; index: number }[][] = []
    for (let i = 0; i < groove.bars.length; i += barsPerSystem) {
      result.push(
        groove.bars
          .slice(i, i + barsPerSystem)
          .map((bar, j) => ({ bar, index: i + j })),
      )
    }
    return result
  }, [groove, containerWidth])

  if (!groove) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-slate-500">Groove not found.</p>
        <button type="button" onClick={onBack} className="ml-2 text-blue-600">
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] min-w-[44px] rounded-lg text-lg text-slate-600 active:bg-slate-100"
          aria-label="Back"
        >
          ←
        </button>
        {editingName ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (nameValue.trim()) renameGroove(grooveId, nameValue.trim())
              setEditingName(false)
            }}
          >
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="min-h-[44px] flex-1 rounded-lg border border-slate-300 px-3 text-base font-semibold"
            />
            <button type="submit" className="min-h-[44px] px-3 text-sm font-medium text-blue-600">
              Done
            </button>
          </form>
        ) : (
          <>
            <button
              type="button"
              className="flex-1 truncate text-left text-lg font-semibold text-slate-900 min-h-[44px] px-2"
              onClick={() => {
                setNameValue(groove.name)
                setEditingName(true)
              }}
            >
              {groove.name}
            </button>
            <DisplayModeToggle
              value={noteDisplayMode}
              onChange={setNoteDisplayMode}
              size="md"
            />
          </>
        )}
      </header>

      <div className="border-b border-slate-100 bg-white px-4 py-1.5">
        <ViewModeChip mode={noteDisplayMode} />
      </div>

      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto px-3 py-4 ${
          noteDisplayMode === 'degree' ? 'bg-amber-50/60' : 'bg-white'
        }`}
      >
        {groove.bars.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            No bars yet. Tap <strong>+ Add bar</strong> to start.
          </div>
        ) : (
          <div className="space-y-5">
            {systems.map((systemBars, sysIdx) => (
              <StaffSystem
                key={sysIdx}
                bars={systemBars}
                width={containerWidth - 24}
                onTapBar={onOpenBar}
                isLastSystem={sysIdx === systems.length - 1}
                noteDisplayMode={noteDisplayMode}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
          <span>4/4</span>
          <span>
            {groove.bars.length} bar{groove.bars.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={() => addBar(grooveId)}
          className="w-full min-h-[48px] rounded-xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-700 active:bg-slate-50"
        >
          + Add bar
        </button>
      </footer>
    </div>
  )
}
