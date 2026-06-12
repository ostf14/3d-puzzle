# 3D Puzzle Game

A 3D puzzle game prototype built with Vite, React, TypeScript, and React Three Fiber.

## Features

- **GLB Model Loading**: Loads 3D model from `/public/models/Test object.glb`
- **Fragment Detection**: Automatically finds all meshes named "Fragment 1", "Fragment 2", etc.
- **Scrambling**: On load, fragments are randomly positioned on a sphere (radius 5 units)
- **Drag & Drop**: Mouse and touch support for dragging fragments
- **Smart Snapping**: Fragments snap to original position when within 0.5 units
- **Smooth Animation**: 0.3s lerp animation when snapping
- **Mobile-Friendly**: Responsive canvas with touch controls
- **OrbitControls**: Rotate, pan, and zoom the camera

## Installation

```bash
npm install 
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Project Structure

```
3D Puzzles/
├── public/
│   └── models/
│       └── Test object.glb
├── src/
│   ├── App.tsx          # Canvas setup with lighting and controls
│   ├── Scene.tsx        # Main puzzle logic (drag, snap, scramble)
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## How It Works

1. **Model Loading**: `useGLTF` loads the GLB model from the public folder
2. **Fragment Discovery**: On mount, the scene is traversed to find all meshes starting with "Fragment "
3. **Original Position Storage**: Each fragment's world position is stored in a Map
4. **Scrambling**: Fragments are moved to random positions on a sphere while keeping original rotations
5. **Drag Interaction**: 
   - Raycasting detects clicked fragments
   - Dragging moves fragments on a plane facing the camera
   - On release, distance to original position is checked
6. **Snapping**: If distance < 0.5 units, fragment smoothly lerps to original position over 0.3s and becomes non-draggable

## Controls

- **Left Mouse / Touch**: Drag fragments
- **Right Mouse / Two Fingers**: Rotate camera
- **Mouse Wheel / Pinch**: Zoom in/out
- **Middle Mouse**: Pan camera
