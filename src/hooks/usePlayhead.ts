import { useCallback, useEffect, useRef, useState } from 'react'
import { unlockAudio } from '../lib/audioContext'
import { Metronome, type PlayBar } from '../lib/metronome'
import { useGroovesStore } from '../state/groovesStore'

export type PlayheadPosition = {
  barIndex: number
  slotIndex: number
} | null

export function usePlayhead() {
  const metronomeRef = useRef<Metronome | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [current, setCurrent] = useState<PlayheadPosition>(null)
  const playbackVolume = useGroovesStore((s) => s.playbackVolume)

  useEffect(() => {
    return () => {
      metronomeRef.current?.stop()
    }
  }, [])

  useEffect(() => {
    metronomeRef.current?.setVolume(playbackVolume)
  }, [playbackVolume])

  const stop = useCallback(() => {
    metronomeRef.current?.stop()
    metronomeRef.current = null
    setIsPlaying(false)
    setCurrent(null)
  }, [])

  const play = useCallback(
    (bars: PlayBar[], startBarIndex = 0) => {
      // Must run synchronously inside the user's tap gesture so iOS will
      // actually unlock and start outputting audio.
      unlockAudio()
      stop()
      const metro = new Metronome({
        onTick: (t) => {
          if (t.barIndex < 0) {
            setCurrent(null)
            return
          }
          setCurrent({ barIndex: t.barIndex, slotIndex: t.slotIndex })
        },
        onStop: () => {
          setIsPlaying(false)
          setCurrent(null)
          metronomeRef.current = null
        },
      })
      metronomeRef.current = metro
      setIsPlaying(true)
      setCurrent(null)
      void metro.start({
        bars,
        startBarIndex,
        volume: useGroovesStore.getState().playbackVolume,
      })
    },
    [stop],
  )

  return { isPlaying, current, play, stop }
}
