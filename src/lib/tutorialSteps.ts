export type TutorialEvent =
  | 'route:library'
  | 'route:main'
  | 'route:bar'
  | 'grooves:added'
  | 'bar:edit'
  | 'bar:noteAdded'
  | 'bar:saved'
  | 'playback:started'

export type TutorialStep = {
  id: string
  anchor: string
  requiredRoute: 'library' | 'main' | 'bar'
  title: string
  body: string
  advanceOn: TutorialEvent
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'new-groove',
    anchor: 'new-groove',
    requiredRoute: 'library',
    title: 'Create a groove',
    body: 'Tap New groove to start a fresh groove.',
    advanceOn: 'grooves:added',
  },
  {
    id: 'main-bar',
    anchor: 'main-bar',
    requiredRoute: 'main',
    title: 'Open a bar',
    body: 'Tap a bar in the sheet view to open detailed editing.',
    advanceOn: 'route:bar',
  },
  {
    id: 'bar-edit',
    anchor: 'bar-edit',
    requiredRoute: 'bar',
    title: 'Enter edit mode',
    body: 'Tap Edit to start changing notes and rhythm.',
    advanceOn: 'bar:edit',
  },
  {
    id: 'bar-cell',
    anchor: 'bar-staff',
    requiredRoute: 'bar',
    title: 'Add a note',
    body: 'Tap a slot on the staff, then choose a fret from the keypad.',
    advanceOn: 'bar:noteAdded',
  },
  {
    id: 'bar-save',
    anchor: 'bar-save',
    requiredRoute: 'bar',
    title: 'Save your changes',
    body: 'Tap Save to commit your bar edits.',
    advanceOn: 'bar:saved',
  },
  {
    id: 'main-play',
    anchor: 'main-play',
    requiredRoute: 'main',
    title: 'Play your groove',
    body: 'Tap Play to hear the groove with metronome and note playback.',
    advanceOn: 'playback:started',
  },
]
