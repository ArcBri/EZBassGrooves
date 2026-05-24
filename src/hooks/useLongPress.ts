import type { PointerEvent } from 'react'
import { useCallback, useRef } from 'react'

type LongPressOptions = {
  delayMs?: number
  moveTolerancePx?: number
}

type LongPressHandlers = {
  onPointerDown: (e: PointerEvent) => void
  onPointerMove: (e: PointerEvent) => void
  onPointerUp: () => void
  onPointerCancel: () => void
  onPointerLeave: () => void
}

/**
 * Returns handlers and a "didLongPressJustHappen" check that suppresses the
 * following click. Designed for pointer/touch interaction on bar tiles.
 */
export function useLongPress(
  onLongPress: () => void,
  options: LongPressOptions = {},
): {
  handlers: LongPressHandlers
  consumeClickIfLongPress: () => boolean
} {
  const { delayMs = 500, moveTolerancePx = 10 } = options
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPos = useRef<{ x: number; y: number } | null>(null)
  const firedRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handlers: LongPressHandlers = {
    onPointerDown: (e) => {
      firedRef.current = false
      startPos.current = { x: e.clientX, y: e.clientY }
      clearTimer()
      timerRef.current = setTimeout(() => {
        firedRef.current = true
        timerRef.current = null
        onLongPress()
      }, delayMs)
    },
    onPointerMove: (e) => {
      if (!startPos.current || timerRef.current == null) return
      const dx = e.clientX - startPos.current.x
      const dy = e.clientY - startPos.current.y
      if (dx * dx + dy * dy > moveTolerancePx * moveTolerancePx) {
        clearTimer()
      }
    },
    onPointerUp: () => {
      clearTimer()
    },
    onPointerCancel: () => {
      clearTimer()
      firedRef.current = false
    },
    onPointerLeave: () => {
      clearTimer()
    },
  }

  const consumeClickIfLongPress = useCallback(() => {
    if (firedRef.current) {
      firedRef.current = false
      return true
    }
    return false
  }, [])

  return { handlers, consumeClickIfLongPress }
}
