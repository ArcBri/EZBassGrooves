import type { PlaybackVolume } from '../types'

type VolumeControlsProps = {
  volume: PlaybackVolume
  onChange: (volume: Partial<PlaybackVolume>) => void
  onClose: () => void
}

type Channel = 'click' | 'synth'

const CHANNELS: { key: Channel; label: string; icon: string; muteIcon: string }[] = [
  { key: 'click', label: 'Metronome click', icon: 'CLK', muteIcon: 'CLK' },
  { key: 'synth', label: 'Note synth', icon: 'SYN', muteIcon: 'SYN' },
]

function pct(v: number): number {
  return Math.round(v * 100)
}

export function VolumeControls({ volume, onChange, onClose }: VolumeControlsProps) {
  const toggleMute = (key: Channel) => {
    if (volume[key] === 0) {
      onChange({ [key]: 1 } as Partial<PlaybackVolume>)
    } else {
      onChange({ [key]: 0 } as Partial<PlaybackVolume>)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-center text-sm font-semibold text-slate-800">Playback Volume</h3>

        <div className="space-y-4">
          {CHANNELS.map((ch) => {
            const value = volume[ch.key]
            const muted = value === 0
            return (
              <div key={ch.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{ch.label}</span>
                  <span className="text-xs font-semibold text-slate-500 tabular-nums">
                    {muted ? 'Muted' : `${pct(value)}%`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleMute(ch.key)}
                    aria-label={muted ? `Unmute ${ch.label}` : `Mute ${ch.label}`}
                    className={`min-h-[44px] min-w-[56px] rounded-lg text-xs font-bold ${
                      muted ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white'
                    }`}
                  >
                    {muted ? ch.muteIcon : ch.icon}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={pct(value)}
                    onChange={(e) =>
                      onChange({ [ch.key]: Number(e.target.value) / 100 } as Partial<PlaybackVolume>)
                    }
                    className="flex-1 accent-slate-900 min-h-[44px]"
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] w-full rounded-xl bg-slate-900 text-sm font-semibold text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
