import { useEffect } from 'react'
import { useHashRoute } from './hooks/useHashRoute'
import { BarView } from './pages/BarView'
import { LibraryPage } from './pages/LibraryPage'
import { MainView } from './pages/MainView'
import { useGroovesStore } from './state/groovesStore'

export default function App() {
  const { route, navigate } = useHashRoute()
  const hydrate = useGroovesStore((s) => s.hydrate)
  const hydrated = useGroovesStore((s) => s.hydrated)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading…</p>
      </div>
    )
  }

  if (route.page === 'library') {
    return (
      <LibraryPage
        onOpenGroove={(id) => navigate(`/groove/${id}`)}
      />
    )
  }

  if (route.page === 'main') {
    return (
      <MainView
        grooveId={route.grooveId}
        onBack={() => navigate('/')}
        onOpenBar={(barIndex) => navigate(`/groove/${route.grooveId}/bar/${barIndex}`)}
      />
    )
  }

  return (
    <BarView
      grooveId={route.grooveId}
      barIndex={route.barIndex}
      onBack={() => navigate(`/groove/${route.grooveId}`)}
      onNavigateBar={(index) => navigate(`/groove/${route.grooveId}/bar/${index}`)}
    />
  )
}
