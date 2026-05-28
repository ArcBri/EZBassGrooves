type AudioContextCtor = typeof AudioContext

declare global {
  interface Window {
    webkitAudioContext?: AudioContextCtor
  }
}

let sharedCtx: AudioContext | null = null
let unlocked = false
let listenersAttached = false

function resolveCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null
  return window.AudioContext ?? window.webkitAudioContext ?? null
}

export function getAudioContext(): AudioContext | null {
  if (sharedCtx) return sharedCtx
  const Ctor = resolveCtor()
  if (!Ctor) return null
  try {
    sharedCtx = new Ctor()
  } catch {
    return null
  }
  return sharedCtx
}

// iOS requires both a resume() call and a sound to be played from a real
// AudioBufferSourceNode during a user-gesture frame to actually unlock audio.
// resume() alone is not enough, and the gesture context is lost across awaits.
export function unlockAudio(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    // Fire-and-forget. The call must be initiated during a user gesture; it
    // does not have to resolve during the gesture.
    void ctx.resume()
  }
  if (unlocked) return
  try {
    const buffer = ctx.createBuffer(1, 1, 22050)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
    unlocked = true
  } catch {
    // ignore
  }
}

// Belt-and-suspenders: unlock the context on the very first interaction with
// the page so playback is ready even if a button skips calling unlockAudio.
function attachGlobalUnlock(): void {
  if (listenersAttached) return
  if (typeof document === 'undefined') return
  listenersAttached = true
  const events = ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'click', 'keydown'] as const
  const handler = () => {
    unlockAudio()
    for (const ev of events) document.removeEventListener(ev, handler, true)
  }
  for (const ev of events) document.addEventListener(ev, handler, true)
}

attachGlobalUnlock()
