type FirstLaunchTutorialProps = {
  onStart: () => void
  onDismiss: () => void
}

export function FirstLaunchTutorial({ onStart, onDismiss }: FirstLaunchTutorialProps) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">Welcome to EZBassGrooves</h2>
        <p className="mt-2 text-sm text-slate-600">
          Would you like a quick tutorial for the basics?
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[44px] flex-1 rounded-xl border border-slate-300 text-sm font-medium text-slate-700"
          >
            Maybe later
          </button>
          <button
            type="button"
            onClick={onStart}
            className="min-h-[44px] flex-1 rounded-xl bg-slate-900 text-sm font-semibold text-white"
          >
            Start tour
          </button>
        </div>
      </div>
    </div>
  )
}
