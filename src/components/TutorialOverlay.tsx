import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useHashRoute } from '../hooks/useHashRoute'
import { TUTORIAL_STEPS } from '../lib/tutorialSteps'
import { useTutorialStore } from '../state/tutorialStore'

type Rect = { top: number; left: number; width: number; height: number }

const PADDING = 8

function measureAnchor(anchorToken: string): Rect | null {
  const node = document.querySelector<HTMLElement>(`[data-tutorial="${anchorToken}"]`)
  if (!node) return null
  const rect = node.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  return {
    top: Math.max(0, rect.top - PADDING),
    left: Math.max(0, rect.left - PADDING),
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
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
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (!active) return
    if (route.page === 'library') notify('route:library')
    if (route.page === 'main') notify('route:main')
    if (route.page === 'bar') notify('route:bar')
  }, [active, route.page, notify])

  const routeMatchesStep = useMemo(() => {
    if (!active || !step) return false
    return route.page === step.requiredRoute
  }, [active, route.page, step])

  useLayoutEffect(() => {
    if (!active || !step || !routeMatchesStep) {
      setRect(null)
      return
    }

    let mounted = true
    let retryTimer: number | null = null
    let raf: number | null = null
    let ro: ResizeObserver | null = null
    const node = document.querySelector<HTMLElement>(`[data-tutorial="${step.anchor}"]`)

    const update = () => {
      if (!mounted) return
      setRect(measureAnchor(step.anchor))
    }

    update()
    raf = window.requestAnimationFrame(update)
    retryTimer = window.setTimeout(update, 100)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    if (node) {
      ro = new ResizeObserver(update)
      ro.observe(node)
    }

    return () => {
      mounted = false
      if (retryTimer != null) window.clearTimeout(retryTimer)
      if (raf != null) window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      ro?.disconnect()
    }
  }, [active, step, routeMatchesStep])

  if (!active || !step) return null

  const vw = window.innerWidth
  const vh = window.innerHeight

  const tooltipStyle = (() => {
    if (!rect || !routeMatchesStep) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }
    const spaceBelow = vh - (rect.top + rect.height)
    const top = spaceBelow > 180 ? rect.top + rect.height + 12 : Math.max(16, rect.top - 150)
    const left = Math.min(Math.max(16, rect.left), vw - 320 - 16)
    return { top, left, transform: 'none' as const }
  })()

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
        className="pointer-events-auto absolute w-[min(320px,calc(100vw-2rem))] rounded-2xl bg-white p-4 shadow-xl"
        style={tooltipStyle}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
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
