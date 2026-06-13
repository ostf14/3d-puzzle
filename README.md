# 3D Museum Puzzle

Reassemble a fragmented 18th-century sculpture in your browser.

**Live demo:** https://3d-puzzle-sigma.vercel.app/

<video src="demo.mp4" controls width="700"></video>

A web-based 3D puzzle built around a photogrammetry scan of Äskulap (Asclepius), a marble sculpture by Veit Königer (c. 1776) from the Great Parterre of Schönbrunn Palace, Vienna. The statue is sliced in Blender into 11 fragments, scattered across a Fibonacci sphere, and reassembled by the player through drag-and-drop with magnetic snapping. An info panel provides museum metadata and provenance sourced from the Schönbrunn eMuseum collection.

## How it works

- Fragments scatter on a Fibonacci sphere with randomized rotation on each session
- Drag pieces to snap them — proximity + rotation threshold triggers magnetic attachment
- Snapped pieces form groups that move together; groups merge on contact
- Search button highlights unplaced fragments with a procedural halo and re-scatters singles
- Undo/redo with full state snapshots (Ctrl+Z / Ctrl+Shift+Z)

## Controls

| Input | Action |
|---|---|
| Left click / touch | Drag fragment |
| Right click / two fingers | Orbit camera |
| Scroll / pinch | Zoom |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |

## Tech stack

Vite 5 · TypeScript · React 18 · Three.js r160 · React Three Fiber · Drei

## Technical highlights

- Fibonacci sphere scramble with golden-angle distribution guarantees uniform fragment spacing
- Relative snap algorithm: target = neighbor.current + original offset, not absolute world position
- Group lifecycle: pair → grow → merge, with adjacency map built from original poses
- Procedural halo: 512×512 CanvasTexture with pow falloff + alpha dither to avoid 8-bit banding
- 50-step undo/redo with deep-cloned Vector3/Euler/Set snapshots

## Source sculpture

Äskulap (Asclepius) · Veit Königer (1729–1792) · c. 1776 · Sterzing marble · Schönbrunn Palace, Vienna
3D scan by [Noe 3D](https://noe-3d.at) · [eMuseum record](https://emuseum.schoenbrunn-group.com/objects/87955/askulap)
