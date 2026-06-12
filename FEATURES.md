# 3D Puzzle Game - New Features

## 1. Intelligent Piece Snapping (Magnetism)

### Implementation Details:
- **Adjacency Detection**: Built an adjacency map during initialization that identifies which pieces were originally neighbors based on their solved-state positions (within 1.5 units threshold)
- **Smart Snapping Logic**: When a piece is released, the system checks if it's within snapping distance (0.5 units) and rotation threshold (~15 degrees) of any original neighbor
- **Automatic Positioning**: Pieces automatically lerp (animate smoothly) into perfect alignment when snapping conditions are met
- **Group Formation**: When pieces snap together, they form groups that move as a single unit
- **Group Merging**: If a piece with a group snaps to another piece with a different group, the groups merge automatically
- **Audio Feedback**: Plays a subtle click sound when pieces snap together
- **Visual Feedback**: Smooth lerp animation provides visual confirmation of snapping

### Key Functions:
- `checkSnapping()`: Evaluates if a fragment can snap to any of its neighbors
- `handleGrouping()`: Creates or merges groups when pieces snap together
- Adjacency map built in initialization with neighbor relationships

## 2. Undo/Redo System

### Implementation Details:
- **State Tracking**: Captures complete puzzle state including:
  - Position and rotation of every fragment
  - Group membership and group data
  - Snapped status of each piece
- **History Stack**: Maintains up to 50 states in memory
- **Smart History Management**: Only saves state when user releases a piece (not during dragging)
- **State Restoration**: Fully restores puzzle to any previous state, including breaking/reforming groups
- **UI Integration**: Clean, modern UI with Undo/Redo buttons at the top of the screen

### Key Functions:
- `saveToHistory()`: Captures current state and adds to history stack
- `undo()`: Reverts to previous state
- `redo()`: Moves forward in history
- `restoreState()`: Applies a historical state to the puzzle

### UI Features:
- Green "Undo" button with back arrow (↶)
- Blue "Redo" button with forward arrow (↷)
- Buttons disabled when no undo/redo available
- Hover effects for better UX
- Positioned at top center of screen

## Technical Architecture

### Data Structures:
```typescript
interface FragmentData {
  mesh: THREE.Mesh
  originalPosition: THREE.Vector3
  originalRotation: THREE.Euler
  currentPosition: THREE.Vector3
  currentRotation: THREE.Euler
  targetPosition: THREE.Vector3
  targetRotation: THREE.Euler
  isSnapped: boolean
  isDragging: boolean
  lerpProgress: number
  groupId: string | null
  neighbors: string[] // Original adjacent pieces
}

interface FragmentGroup {
  id: string
  members: Set<string>
  position: THREE.Vector3
  rotation: THREE.Euler
}

interface HistoryState {
  fragments: Map<string, {
    position: THREE.Vector3
    rotation: THREE.Euler
    groupId: string | null
    isSnapped: boolean
  }>
  groups: Map<string, FragmentGroup>
}
```

### Files Modified/Created:
1. **Scene.tsx**: Enhanced with snapping logic, grouping, and history management
2. **PuzzleUI.tsx**: New component for Undo/Redo buttons
3. **App.tsx**: Updated to integrate UI overlay with puzzle state

## Usage

### Controls:
- **Left Mouse Button**: Drag puzzle pieces
- **Right Mouse Button**: Rotate camera
- **Mouse Wheel**: Zoom in/out
- **Undo Button**: Revert last move
- **Redo Button**: Restore undone move

### Snapping Behavior:
1. Drag a piece near its original neighbor
2. If within 0.5 units and rotation is similar (~15°), it will snap
3. Hear a click sound and see smooth animation
4. Snapped pieces move together as a group

### History:
- Every piece release saves a state
- Up to 50 moves remembered
- Undo/Redo buttons update in real-time
- Groups are preserved/restored correctly

## Performance Considerations

- Adjacency map computed once at initialization (O(n²) but only once)
- Snapping check is O(k) where k = number of neighbors per piece (typically 3-6)
- History limited to 50 states to prevent memory issues
- Collision detection still runs but skips snapped pieces
- Lerp animations are smooth and performant

## Future Enhancements

Potential improvements:
- Visual highlight when pieces are close to snapping
- Particle effects on snap
- Progress indicator showing puzzle completion
- Keyboard shortcuts for undo/redo (Ctrl+Z, Ctrl+Y)
- Save/load puzzle state
- Multiple difficulty levels with different snap thresholds
