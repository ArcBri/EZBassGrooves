import { create } from 'zustand'
import { TUTORIAL_STEPS, type TutorialEvent } from '../lib/tutorialSteps'

const FIRST_PROMPT_KEY = 'ezbassgrooves.tutorial.firstPromptSeen'

function loadPromptSeen(): boolean {
  const raw = localStorage.getItem(FIRST_PROMPT_KEY)
  return raw === '1'
}

function savePromptSeen(value: boolean): void {
  localStorage.setItem(FIRST_PROMPT_KEY, value ? '1' : '0')
}

type TutorialState = {
  active: boolean
  stepIndex: number
  firstLaunchPromptSeen: boolean
  start: () => void
  next: () => void
  prev: () => void
  skip: () => void
  finish: () => void
  notify: (event: TutorialEvent) => void
  markPromptSeen: () => void
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  active: false,
  stepIndex: 0,
  firstLaunchPromptSeen: loadPromptSeen(),

  start: () => set({ active: true, stepIndex: 0 }),

  next: () => {
    const { stepIndex } = get()
    if (stepIndex >= TUTORIAL_STEPS.length - 1) {
      set({ active: false, stepIndex: 0 })
      return
    }
    set({ stepIndex: stepIndex + 1 })
  },

  prev: () => {
    const { stepIndex } = get()
    set({ stepIndex: Math.max(0, stepIndex - 1) })
  },

  skip: () => set({ active: false, stepIndex: 0 }),

  finish: () => set({ active: false, stepIndex: 0 }),

  notify: (event) => {
    const { active, stepIndex } = get()
    if (!active) return
    const step = TUTORIAL_STEPS[stepIndex]
    if (!step) return
    if (step.advanceOn !== event) return
    if (stepIndex >= TUTORIAL_STEPS.length - 1) {
      set({ active: false, stepIndex: 0 })
      return
    }
    set({ stepIndex: stepIndex + 1 })
  },

  markPromptSeen: () => {
    savePromptSeen(true)
    set({ firstLaunchPromptSeen: true })
  },
}))
