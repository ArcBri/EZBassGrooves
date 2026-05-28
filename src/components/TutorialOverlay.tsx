import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useHashRoute } from '../hooks/useHashRoute'
import { TUTORIAL_STEPS } from '../lib/tutorialSteps'
import { useTutorialStore } from '../state/tutorialStore'

type Rect = { top: number; left: number; width: number; height: number }
type ViewportSize = { width: number; height: number }

const GAP = 12
const EDGE_INSET = 12
const MAX_TOOLTIP_WIDTH = 320

function getViewportSize(): ViewportSize {
  const vv = window.visualViewport
  return {
    width: vv?.width ?? document.documentElement.clientWidth,
    height: vv?.height ?? document.documentElement.clientHeight,
  }
}

function spotlightPadding(vw: number): number {
  return vw < 420 ? 6 : 8
}

function measureAnchor(anchorToken: string, padding: number): Rect | null {
  const node = document.querySelector<HTMLElement>(`[data-tutorial="${anchorToken}"]`)
  if (!node) return null
  const box = node.getBoundingClientRect()
  if (box.width <= 0 || box.height <= 0) return null
  return {
    top: Math.max(0, box.top - padding),
    left: Math.max(0, box.left - padding),
    width: box.width + padding * 2,
    height: box.height + padding * 2,
  }
}

export function TutorialOverlay() {
  const { route } = useHashRoute()
  const active = useTutorialStore((s) => s.active)
  const stepIndex = useTutorialStore((s) => s.stepIndex)
  const prev = useTutorialStore((s) => s.prev)
  const finish = useTutorialStore((s) => s.finish)
  const notify = useTutorialStore((s) => s.notify)

  const step = TUTORIAL_STEPS[stepIndex] ?? null
  const [viewport, setViewport] = useState<ViewportSize>(getViewportSize)
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (!active) return
    if (route.page === 'library') notify('route:library')
    if (route.page === 'main') notify('route:main')
    if (route.page === 'bar') notify('route:bar')
  }, [active, route.page, notify])

  useEffect(() => {
    const syncViewport = () => setViewport(getViewportSize())
    syncViewport()
    window.addEventListener('resize', syncViewport)
    window.addEventListener('scroll', syncViewport, true)
    const vv = window.visualViewport
    vv?.addEventListener('resize', syncViewport)
    vv?.addEventListener('scroll', syncViewport)
    return () => {
      window.removeEventListener('resize', syncViewport)
      window.removeEventListener('scroll', syncViewport, true)
      vv?.removeEventListener('resize', syncViewport)
      vv?.removeEventListener('scroll', syncViewport)
    }
  }, [])

  const routeMatchesStep = useMemo(() => {
    if (!active || !step) return false
    return route.page === step.requiredRoute
  }, [active, route.page, step])

  const padding = spotlightPadding(viewport.width)
  const { width: vw, height: vh } = viewport
  const tooltipWidth = Math.min(MAX_TOOLTIP_WIDTH, vw - 32)

  useLayoutEffect(() => {
    if (!active || !step || !routeMatchesStep) {
      setRect(null)
      return
    }

    let mounted = true
    let retryTimer100: number | null = null
    let retryTimer250: number | null = null
    let raf: number | null = null
    let ro: ResizeObserver | null = null
    const node = document.querySelector<HTMLElement>(`[data-tutorial="${step.anchor}"]`)

    const update = () => {
      if (!mounted) return
      const size = getViewportSize()
      setRect(measureAnchor(step.anchor, spotlightPadding(size.width)))
    }

    update()
    raf = window.requestAnimationFrame(update)
    retryTimer100 = window.setTimeout(update, 100)
    retryTimer250 = window.setTimeout(update, 250)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    if (node) {
      ro = new ResizeObserver(update)
      ro.observe(node)
    }

    return () => {
      mounted = false
      if (retryTimer100 != null) window.clearTimeout(retryTimer100)
      if (retryTimer250 != null) window.clearTimeout(retryTimer250)
      if (raf != null) window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      ro?.disconnect()
    }
  }, [active, step, routeMatchesStep, padding])

  const tooltipStyle = useMemo(() => {
    if (!rect || !routeMatchesStep) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      } as const
    }

    const spaceAbove = rect.top
    const spaceBelow = vh - (rect.top + rect.height)
    const placeBelow = spaceBelow >= spaceAbove
    const left = Math.min(
      Math.max(EDGE_INSET, rect.left),
      Math.max(EDGE_INSET, vw - tooltipWidth - EDGE_INSET),
    )

    if (placeBelow) {
      return {
        top: rect.top + rect.height + GAP,
        left,
        maxHeight: Math.max(120, spaceBelow - GAP * 2),
        overflowY: 'auto' as const,
      }
    }

    return {
      bottom: vh - rect.top + GAP,
      left,
      maxHeight: Math.max(120, spaceAbove - GAP * 2),
      overflowY: 'auto' as const,
    }
  }, [rect, routeMatchesStep, vh, vw, tooltipWidth])

  if (!active || !step) return null

  const routeHint =
    step.requiredRoute === 'library'
      ? 'Return to the Library page to continue.'
      : step.requiredRoute === 'main'
        ? 'Open a groove Main view to continue.'
        : 'Open a Bar editor to continue.'

  return (
    <div className="fixed inset-0 z-[110] pointer-events-none">
      {rect && routeMatchesStep ? (
        <>
          <div className="absolute bg-black/55" style={{ top: 0, left: 0, width: '100%', height: rect.top }} />
          <div
            className="absolute bg-black/55"
            style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }}
          />
          <div
            className="absolute bg-black/55"
            style={{
              top: rect.top,
              left: rect.left + rect.width,
              width: Math.max(0, vw - (rect.left + rect.width)),
              height: rect.height,
            }}
          />
          <div
            className="absolute bg-black/55"
            style={{
              top: rect.top + rect.height,
              left: 0,
              width: '100%',
              height: Math.max(0, vh - (rect.top + rect.height)),
            }}
          />
          <div
            className="absolute rounded-xl border-2 border-blue-400"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/55" />
      )}

      <div
        className="pointer-events-auto absolute w-[min(320px,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-white p-3 shadow-xl"
        style={tooltipStyle}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Step {stepIndex + 1} of {TUTORIAL_STEPS.length}
        </p>
        <h3 className="mt-1 text-base font-semibold text-slate-900">{step.title}</h3>
        <p className="mt-2 text-sm text-slate-600">{step.body}</p>
        {!routeMatchesStep && (
          <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-800">{routeHint}</p>
        )}
        {routeMatchesStep && (
          <p className="mt-2 rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-medium text-blue-800">
            Do the highlighted action to continue.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={finish}
            className="min-h-[36px] rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700"
          >
            Skip tour
          </button>
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={prev}
              className="min-h-[36px] rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700"
            >
              Back
            </button>
          )}
          <span className="ml-auto self-center text-xs font-medium text-slate-500">
            Waiting for action…
          </span>
        </div>
      </div>
    </div>
  )
}
