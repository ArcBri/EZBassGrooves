export type TutorialEvent =
  | 'route:library'
  | 'route:main'
  | 'route:bar'
  | 'grooves:added'
  | 'bar:edit'
  | 'bar:slotAdded'
  | 'bar:cellSelected'
  | 'bar:noteAdded'
  | 'bar:saved'
  | 'groove:saved'
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
    id: 'bar-duration',
    anchor: 'bar-duration',
    requiredRoute: 'bar',
    title: 'Add a note slot',
    body: 'Tap a duration to add a note slot to the bar. The staff becomes clickable after a slot exists.',
    advanceOn: 'bar:slotAdded',
  },
  {
    id: 'bar-cell',
    anchor: 'bar-staff',
    requiredRoute: 'bar',
    title: 'Select a slot',
    body: 'Tap a slot on a string to choose where the note goes. A keypad will open next.',
    advanceOn: 'bar:cellSelected',
  },
  {
    id: 'bar-keypad',
    anchor: 'bar-keypad',
    requiredRoute: 'bar',
    title: 'Pick a fret',
    body: 'Choose a fret on the keypad to place the note.',
    advanceOn: 'bar:noteAdded',
  },
  {
    id: 'bar-save',
    anchor: 'bar-save',
    requiredRoute: 'bar',
    title: 'Apply your bar edits',
    body: 'Tap Apply to keep your edits to this bar, then tap Back to return to the sheet view. Changes still need to be saved to the groove.',
    advanceOn: 'bar:saved',
  },
  {
    id: 'main-save',
    anchor: 'main-save',
    requiredRoute: 'main',
    title: 'Save the groove',
    body: 'Bar edits live in memory until you save. Tap Save groove to write your changes to storage.',
    advanceOn: 'groove:saved',
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
