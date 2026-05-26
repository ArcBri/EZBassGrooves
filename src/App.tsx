import { useEffect } from 'react'
import { FirstLaunchTutorial } from './components/FirstLaunchTutorial'
import { TutorialOverlay } from './components/TutorialOverlay'
import { useHashRoute } from './hooks/useHashRoute'
import { BarView } from './pages/BarView'
import { LibraryPage } from './pages/LibraryPage'
import { MainView } from './pages/MainView'
import { useGroovesStore } from './state/groovesStore'
import { useTutorialStore } from './state/tutorialStore'

export default function App() {
  const { route, navigate } = useHashRoute()
  const hydrate = useGroovesStore((s) => s.hydrate)
  const hydrated = useGroovesStore((s) => s.hydrated)
  const firstLaunchPromptSeen = useTutorialStore((s) => s.firstLaunchPromptSeen)
  const markPromptSeen = useTutorialStore((s) => s.markPromptSeen)
  const startTutorial = useTutorialStore((s) => s.start)

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

  const firstLaunchPrompt = !firstLaunchPromptSeen ? (
    <FirstLaunchTutorial
      onDismiss={markPromptSeen}
      onStart={() => {
        markPromptSeen()
        startTutorial()
      }}
    />
  ) : null

  if (route.page === 'library') {
    return (
      <>
        <LibraryPage
          onOpenGroove={(id) => navigate(`/groove/${id}`)}
        />
        <TutorialOverlay />
        {firstLaunchPrompt}
      </>
    )
  }

  if (route.page === 'main') {
    return (
      <>
        <MainView
          grooveId={route.grooveId}
          onBack={() => navigate('/')}
          onOpenBar={(barIndex) => navigate(`/groove/${route.grooveId}/bar/${barIndex}`)}
        />
        <TutorialOverlay />
        {firstLaunchPrompt}
      </>
    )
  }

  return (
    <>
      <BarView
        grooveId={route.grooveId}
        barIndex={route.barIndex}
        onBack={() => navigate(`/groove/${route.grooveId}`)}
        onNavigateBar={(index) => navigate(`/groove/${route.grooveId}/bar/${index}`)}
      />
      <TutorialOverlay />
      {firstLaunchPrompt}
    </>
  )
}
