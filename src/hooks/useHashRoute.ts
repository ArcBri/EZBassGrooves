import { useCallback, useEffect, useState } from 'react'

export type Route =
  | { page: 'library' }
  | { page: 'main'; grooveId: string }
  | { page: 'bar'; grooveId: string; barIndex: number }

function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  const parts = path.split('/').filter(Boolean)

  if (parts.length === 0) return { page: 'library' }

  if (parts[0] === 'groove' && parts[1]) {
    const grooveId = parts[1]
    if (parts[2] === 'bar' && parts[3] !== undefined) {
      const barIndex = parseInt(parts[3], 10)
      if (!Number.isNaN(barIndex)) {
        return { page: 'bar', grooveId, barIndex }
      }
    }
    return { page: 'main', grooveId }
  }

  return { page: 'library' }
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = useCallback((to: string) => {
    window.location.hash = to
    setRoute(parseHash(to.startsWith('#') ? to : `#${to}`))
  }, [])

  return { route, navigate }
}
