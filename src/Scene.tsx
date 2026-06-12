import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { orbitControlsRef } from './App'

// How many fragments are actually rendered on screen, picked as the largest
// pieces by bbox volume. Anything below the cutoff stays hidden — this
// drops the two ~0.001-volume "specks" that were impossible to track.
const VISIBLE_FRAGMENT_COUNT = 11

// How many snapped pieces declare the puzzle solved. Equal to VISIBLE means
// every piece must be placed — set lower if you want to allow a piece to be
// ignored.
const REQUIRED_SNAP_COUNT = 11

// Radius of the scramble sphere — pieces are scattered on this surface.
const SCRAMBLE_RADIUS = 5

// N evenly-spaced points on a unit-radius sphere via the Fibonacci spiral.
// Adjacent points are ~sqrt(4π/N) radians apart, so for 13 points at R=5
// nearest neighbors are roughly 2.8 units of chord apart — way more than
// any piece's bbox, so overlap/occlusion after scramble is impossible.
function fibonacciSpherePoints(n: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2
    const ringR = Math.sqrt(Math.max(0, 1 - y * y))
    const t = goldenAngle * i
    points.push(new THREE.Vector3(
      Math.cos(t) * ringR * radius,
      y * radius,
      Math.sin(t) * ringR * radius,
    ))
  }
  return points
}

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
  groupId: string | null // ID of the group this fragment belongs to
  neighbors: string[] // Names of originally adjacent fragments
  volume: number
  isActive: boolean // True for the N largest pieces that actually count toward the puzzle
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

interface SceneProps {
  modelPath: string
}

function Scene({ modelPath }: SceneProps) {
  const gltf = useGLTF(modelPath)
  const { camera, gl, size } = useThree()
  
  const [fragments, setFragments] = useState<Map<string, FragmentData>>(new Map())
  const [groups, setGroups] = useState<Map<string, FragmentGroup>>(new Map())
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isPuzzleComplete, setIsPuzzleComplete] = useState(false)
  const [highlightActive, setHighlightActive] = useState(false)
  const dragPlane = useRef(new THREE.Plane())
  const dragOffset = useRef(new THREE.Vector3())
  const draggedFragment = useRef<string | null>(null)
  const raycaster = useRef(new THREE.Raycaster())
  const pointer = useRef(new THREE.Vector2())
  const snapSound = useRef<HTMLAudioElement | null>(null)
  const targetOrbitCenter = useRef(new THREE.Vector3(0, 0, 0))
  const highlightTimerRef = useRef<number | null>(null)
  // Halo sprites attached to currently-highlighted fragments (one per piece).
  const haloSpritesRef = useRef<Map<string, THREE.Sprite>>(new Map())
  // Fade-out phase tracker. null = not fading. number = remaining opacity
  // in [0..1]; decremented each frame, sprites removed at 0.
  const haloFadeRef = useRef<number | null>(null)

  // Soft radial-gradient texture used by the halo sprites. We fill the
  // canvas pixel-by-pixel with a continuous formula (quadratic-ish falloff)
  // and add ±2 alpha-units of dither noise — Canvas's built-in radial
  // gradient produced visible concentric bands at 8-bit color depth.
  const haloTexture = useMemo(() => {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    const img = ctx.createImageData(size, size)
    const data = img.data
    const c = size / 2
    const maxR = size / 2

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - c
        const dy = y - c
        const d = Math.sqrt(dx * dx + dy * dy) / maxR // 0..1+
        const idx = (y * size + x) * 4
        if (d >= 1) {
          data[idx + 3] = 0
          continue
        }
        // Smooth alpha falloff — pow(1-d, 2.5) gives a soft halo with a
        // bright core and a long fading tail, no abrupt rings.
        const falloff = Math.pow(1 - d, 2.5)
        // Continuous color: hot near-white center → warm orange edge.
        const r = 255
        const g = 255 - 100 * d       // 255 → 155
        const b = 230 - 230 * d       // 230 → 0
        // Dither breaks up the remaining 8-bit quantization steps.
        const noise = (Math.random() - 0.5) * 3
        const a = Math.max(0, Math.min(255, falloff * 255 + noise))
        data[idx]     = r
        data[idx + 1] = g
        data[idx + 2] = b
        data[idx + 3] = a
      }
    }

    ctx.putImageData(img, 0, 0)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])

  // Dispose the texture and any leftover sprites when the scene unmounts.
  useEffect(() => {
    const sprites = haloSpritesRef.current
    return () => {
      sprites.forEach(s => {
        s.parent?.remove(s)
        s.material.dispose()
      })
      sprites.clear()
      haloTexture.dispose()
    }
  }, [haloTexture])
  

  // Initialize snap sound
  useEffect(() => {
    snapSound.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKXh8LhjHAU2jdXwyXksBSF0xPDdkEAJFF+16+qnVRQKRp/g8r5sIQUrgc7y2Yk2CBtpvfDknE4MDlCl4fC4YxwFNo3V8Ml5LAUhdMTw3ZBACQ==') // Simple click sound
  }, [])

  // Highlight unsnapped fragments. 3 s of full visibility, then 1.5 s of
  // smooth fade-out animated in useFrame. Re-clicking during either phase
  // restarts from full opacity.
  const HALO_FULL_OPACITY = 0.95
  const HIGHLIGHT_VISIBLE_MS = 3000

  const highlightUnsnapped = useCallback(() => {
    if (highlightTimerRef.current !== null) {
      clearTimeout(highlightTimerRef.current)
    }
    // Cancel any in-progress fade and restore opacity on existing sprites.
    haloFadeRef.current = null
    haloSpritesRef.current.forEach(s => {
      (s.material as THREE.SpriteMaterial).opacity = HALO_FULL_OPACITY
    })

    // Debug: log current state
    console.log('=== HIGHLIGHT ACTIVATED ===')
    console.log('Total fragments:', fragments.size)
    console.log('Total groups:', groups.size)
    fragments.forEach((frag, name) => {
      console.log(`${name}: groupId=${frag.groupId}, isSnapped=${frag.isSnapped}`)
    })
    groups.forEach((group, id) => {
      console.log(`Group ${id}: members=${Array.from(group.members).join(', ')}`)
    })

    // Search only rescues SINGLES — pieces that have no group at all. Any
    // existing group (large main assembly, small accidental orphan pair,
    // etc.) is left alone so we never rip apart something the player
    // deliberately snapped together. Orphan groups still glow via the halo
    // effect below so the player can find them and dismantle them by hand
    // if they want.
    const singles: string[] = []
    fragments.forEach((frag, name) => {
      if (!frag.isActive) return
      if (frag.groupId) return
      singles.push(name)
    })

    if (singles.length > 0) {
      const fibPoints = fibonacciSpherePoints(singles.length, SCRAMBLE_RADIUS)
      const rotMat = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      ))
      fibPoints.forEach(p => p.applyMatrix4(rotMat))
      for (let i = fibPoints.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[fibPoints[i], fibPoints[j]] = [fibPoints[j], fibPoints[i]]
      }

      const newFragments = new Map(fragments)
      singles.forEach((name, i) => {
        const f = newFragments.get(name)!
        f.targetPosition.copy(fibPoints[i])
        // lerpProgress=0 hands control to the existing useFrame lerp which
        // animates currentPosition → targetPosition over ~0.3 s.
        f.lerpProgress = 0
      })
      setFragments(newFragments)
    }

    setHighlightActive(true)

    // After the visible window, kick off the fade (handled by useFrame).
    highlightTimerRef.current = window.setTimeout(() => {
      haloFadeRef.current = 1
      highlightTimerRef.current = null
    }, HIGHLIGHT_VISIBLE_MS)
  }, [fragments, groups])

  // Attach/remove a glowing halo sprite on every active piece that's
  // *outside* the main assembly. Same predicate as highlightUnsnapped so
  // a stray piece always halos AND gets pulled in. Sprites live as
  // children of each fragment Object3D and follow drag motion.
  useEffect(() => {
    const sprites = haloSpritesRef.current

    // Identify the main assembly = largest group. Pieces in any other
    // group (or none) are considered stray and qualify for the halo.
    let mainGroupId: string | null = null
    let mainSize = 0
    groups.forEach((g, id) => {
      if (g.members.size > mainSize) {
        mainSize = g.members.size
        mainGroupId = id
      }
    })

    fragments.forEach((fragment, name) => {
      const inMain = !!fragment.groupId && fragment.groupId === mainGroupId
      const shouldHighlight = fragment.isActive && !inMain && highlightActive
      const existing = sprites.get(name)

      if (shouldHighlight && !existing) {
        const material = new THREE.SpriteMaterial({
          map: haloTexture,
          color: 0xFFD700,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: false, // halo shines through the piece itself
          opacity: 0.95,
        })
        const sprite = new THREE.Sprite(material)
        // Scale halo to ~2x the piece's bounding box so the glow visibly
        // extends past the silhouette. Clamp so very tiny pieces still
        // produce a visible aura and very large pieces don't dominate.
        const fragmentObj = gltf.scene.children.find((c: any) => c.name === name)
        if (fragmentObj) {
          const bbox = new THREE.Box3().setFromObject(fragmentObj)
          const size = bbox.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = Math.min(Math.max(maxDim * 2.2, 0.6), 2.5)
          sprite.scale.setScalar(scale)
          sprite.renderOrder = 999 // draw after the model
          fragmentObj.add(sprite)
          sprites.set(name, sprite)
        }
      } else if (!shouldHighlight && existing) {
        existing.parent?.remove(existing)
        existing.material.dispose()
        sprites.delete(name)
      }
    })
  }, [highlightActive, fragments, groups, gltf.scene, haloTexture])

  // Configure materials from Blender
  useEffect(() => {
    console.log('=== GLB LOADED ===')
    console.log('All children:', gltf.scene.children)
    console.log('Children names:', gltf.scene.children.map((c: any) => c.name))
    
    const fragments = gltf.scene.children.filter((child: any) => 
      child.name && child.name.includes('Fragment')
    )
    console.log('Found fragments:', fragments.length)
    console.log('Fragment names:', fragments.map((f: any) => f.name))
    
    // Configure materials assigned by Blender
    fragments.forEach((fragment: any) => {
      fragment.traverse((child: any) => {
        if (child.isMesh && child.material) {
          console.log('Material found:', child.material.name)
          
          // If Blender assigned Gold_Inner material, enhance it
          if (child.material.name === 'Gold_Inner') {
            child.material.metalness = 1.0
            child.material.roughness = 0.3
            child.material.needsUpdate = true
            console.log('Gold_Inner material enhanced')
          }
        }
      })
    })
    
    console.log('Materials configured from Blender')
  }, [gltf])

  // Initialize fragments on mount
  useEffect(() => {
    const fragmentsMap = new Map<string, FragmentData>()
    
    // Get all fragment objects (not just meshes)
    const fragmentObjects = gltf.scene.children.filter((child: any) => 
      child.name && child.name.includes('Fragment')
    )
    
    console.log('Fragment objects found:', fragmentObjects.length)
    
    fragmentObjects.forEach((fragmentObj: any) => {
      // Get world position of the fragment object
      const worldPos = new THREE.Vector3()
      fragmentObj.getWorldPosition(worldPos)
      
      // Generate random position on sphere (radius 5)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 5
      
      const scrambledPos = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      )
      
      console.log(`Fragment ${fragmentObj.name}: moving to [${scrambledPos.x.toFixed(2)}, ${scrambledPos.y.toFixed(2)}, ${scrambledPos.z.toFixed(2)}]`)
      
      // Set initial scrambled position
      fragmentObj.position.copy(scrambledPos)
      
      // Find the first mesh child for raycasting
      let meshChild: THREE.Mesh | null = null
      fragmentObj.traverse((child: any) => {
        if (!meshChild && child instanceof THREE.Mesh) {
          meshChild = child
        }
      })
      
      if (meshChild) {
        const worldQuat = new THREE.Quaternion()
        fragmentObj.getWorldQuaternion(worldQuat)
        const worldRot = new THREE.Euler()
        worldRot.setFromQuaternion(worldQuat)
        
        // Calculate fragment size using bounding box
        const bbox = new THREE.Box3().setFromObject(fragmentObj)
        const size = bbox.getSize(new THREE.Vector3())
        const volume = size.x * size.y * size.z
        
        console.log(`Fragment ${fragmentObj.name} size:`, size, 'volume:', volume.toFixed(4))
        
        // Visibility is decided after this loop in the active-pass below.

        fragmentsMap.set(fragmentObj.name, {
          mesh: meshChild,
          originalPosition: worldPos.clone(),
          originalRotation: worldRot.clone(),
          currentPosition: scrambledPos.clone(),
          currentRotation: new THREE.Euler(0, 0, 0),
          targetPosition: scrambledPos.clone(),
          targetRotation: new THREE.Euler(0, 0, 0),
          isSnapped: false,
          isDragging: false,
          lerpProgress: 1,
          groupId: null,
          neighbors: [], // Will be computed next
          volume: volume, // Store volume for completion check
          isActive: false, // Decided after we know all volumes (see active-pass below)
        })
      }
    })
    
    // Pick the N largest fragments as "active". Everything below the cutoff
    // is hidden and excluded from progress + completion.
    const sortedByVolume = Array.from(fragmentsMap.entries())
      .sort(([, a], [, b]) => b.volume - a.volume)
    sortedByVolume.forEach(([name, frag], index) => {
      const active = index < VISIBLE_FRAGMENT_COUNT
      frag.isActive = active
      if (!active) {
        const fragmentObj = gltf.scene.children.find((c: any) => c.name === name)
        if (fragmentObj) fragmentObj.visible = false
      }
    })
    console.log(`Active fragments: ${Math.min(VISIBLE_FRAGMENT_COUNT, fragmentsMap.size)} of ${fragmentsMap.size}, need ${REQUIRED_SNAP_COUNT} to win`)

    // Re-scramble active pieces onto an evenly-spaced Fibonacci sphere so
    // no two pieces can overlap or hide behind each other. Random rotation
    // + Fisher–Yates shuffle keep the layout fresh per session.
    const activeNames = sortedByVolume
      .slice(0, VISIBLE_FRAGMENT_COUNT)
      .map(([n]) => n)
    const positions = fibonacciSpherePoints(activeNames.length, SCRAMBLE_RADIUS)
    const rotMat = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    ))
    positions.forEach(p => p.applyMatrix4(rotMat))
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[positions[i], positions[j]] = [positions[j], positions[i]]
    }
    activeNames.forEach((name, i) => {
      const newPos = positions[i]
      const frag = fragmentsMap.get(name)!
      frag.currentPosition.copy(newPos)
      frag.targetPosition.copy(newPos)
      const fragmentObj = gltf.scene.children.find((c: any) => c.name === name)
      if (fragmentObj) fragmentObj.position.copy(newPos)
    })

    // Build adjacency map based on original positions
    const fragmentNames = Array.from(fragmentsMap.keys())
    const NEIGHBOR_THRESHOLD = 1.5 // Distance threshold for considering pieces as neighbors
    
    fragmentNames.forEach(nameA => {
      const fragA = fragmentsMap.get(nameA)!
      const neighbors: string[] = []
      
      fragmentNames.forEach(nameB => {
        if (nameA === nameB) return
        const fragB = fragmentsMap.get(nameB)!
        const distance = fragA.originalPosition.distanceTo(fragB.originalPosition)
        
        if (distance < NEIGHBOR_THRESHOLD) {
          neighbors.push(nameB)
        }
      })
      
      fragA.neighbors = neighbors
      console.log(`Fragment ${nameA} has ${neighbors.length} neighbors:`, neighbors)
    })
    
    console.log('Scramble complete! Total fragments:', fragmentsMap.size)
    setFragments(fragmentsMap)

    // Signal the UI layer that a fresh game is ready — App uses this to
    // (re)start the timer, including after a Restart-key remount.
    window.dispatchEvent(new CustomEvent('puzzle:ready'))
  }, [gltf])

  // Save current state to history
  const saveToHistory = useCallback((frags: Map<string, FragmentData>, grps: Map<string, FragmentGroup>) => {
    const state: HistoryState = {
      fragments: new Map(
        Array.from(frags.entries()).map(([name, frag]) => [
          name,
          {
            position: frag.currentPosition.clone(),
            rotation: frag.currentRotation.clone(),
            groupId: frag.groupId,
            isSnapped: frag.isSnapped
          }
        ])
      ),
      groups: new Map(
        Array.from(grps.entries()).map(([id, grp]) => [
          id,
          {
            id: grp.id,
            members: new Set(grp.members),
            position: grp.position.clone(),
            rotation: grp.rotation.clone()
          }
        ])
      )
    }
    
    // Trim history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(state)
    
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift()
    } else {
      setHistoryIndex(historyIndex + 1)
    }
    
    setHistory(newHistory)
  }, [history, historyIndex])

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    
    const prevState = history[historyIndex - 1]
    restoreState(prevState)
    setHistoryIndex(historyIndex - 1)
  }, [history, historyIndex])

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    
    const nextState = history[historyIndex + 1]
    restoreState(nextState)
    setHistoryIndex(historyIndex + 1)
  }, [history, historyIndex])

  // Restore state from history
  const restoreState = useCallback((state: HistoryState) => {
    const newFragments = new Map(fragments)
    
    state.fragments.forEach((savedFrag, name) => {
      const frag = newFragments.get(name)
      if (frag) {
        frag.currentPosition.copy(savedFrag.position)
        frag.targetPosition.copy(savedFrag.position)
        frag.currentRotation.copy(savedFrag.rotation)
        frag.targetRotation.copy(savedFrag.rotation)
        frag.groupId = savedFrag.groupId
        frag.isSnapped = savedFrag.isSnapped
        frag.lerpProgress = 1
        
        // Update 3D object position
        const fragmentObj = gltf.scene.children.find((child: any) => child.name === name)
        if (fragmentObj) {
          fragmentObj.position.copy(savedFrag.position)
          fragmentObj.rotation.copy(savedFrag.rotation)
        }
      }
    })
    
    setFragments(newFragments)
    setGroups(new Map(state.groups))
  }, [fragments, gltf.scene.children])

  // Save initial state to history after fragments are set
  useEffect(() => {
    if (fragments.size > 0 && history.length === 0) {
      saveToHistory(fragments, groups)
    }
  }, [fragments, groups, history.length, saveToHistory])

  // Check if fragment can snap to any neighbor
  const checkSnapping = (fragmentName: string, frags: Map<string, FragmentData>) => {
    const frag = frags.get(fragmentName)
    if (!frag || frag.neighbors.length === 0) return null
    
    const SNAP_DISTANCE = 0.8
    const SNAP_ROTATION = 0.26 // ~15 degrees in radians
    
    // Check each neighbor
    for (const neighborName of frag.neighbors) {
      const neighbor = frags.get(neighborName)
      if (!neighbor) continue
      
      // Calculate expected position relative to neighbor's original position
      const offset = frag.originalPosition.clone().sub(neighbor.originalPosition)
      const expectedPos = neighbor.currentPosition.clone().add(offset)
      
      // Check distance
      const distance = frag.currentPosition.distanceTo(expectedPos)
      
      // Check rotation difference
      const rotDiff = Math.abs(frag.currentRotation.x - neighbor.currentRotation.x) +
                      Math.abs(frag.currentRotation.y - neighbor.currentRotation.y) +
                      Math.abs(frag.currentRotation.z - neighbor.currentRotation.z)
      
      if (distance < SNAP_DISTANCE && rotDiff < SNAP_ROTATION) {
        return {
          neighborName,
          targetPosition: expectedPos,
          targetRotation: neighbor.currentRotation.clone()
        }
      }
    }
    
    return null
  }

  // Create or merge groups when pieces snap
  const handleGrouping = (fragmentName: string, neighborName: string, frags: Map<string, FragmentData>, grps: Map<string, FragmentGroup>) => {
    const frag = frags.get(fragmentName)
    const neighbor = frags.get(neighborName)
    if (!frag || !neighbor) return { fragments: frags, groups: grps }
    
    const newFragments = new Map(frags)
    const newGroups = new Map(grps)
    
    // Get references from newFragments to ensure mutations are captured
    const newFrag = newFragments.get(fragmentName)!
    const newNeighbor = newFragments.get(neighborName)!
    
    // Both have groups - merge them
    if (newFrag.groupId && newNeighbor.groupId && newFrag.groupId !== newNeighbor.groupId) {
      const fragGroup = newGroups.get(newFrag.groupId)
      const neighborGroup = newGroups.get(newNeighbor.groupId)
      
      if (fragGroup && neighborGroup) {
        // Merge neighbor group into frag group
        neighborGroup.members.forEach((member: string) => {
          fragGroup.members.add(member)
          const memberFrag = newFragments.get(member)
          if (memberFrag) memberFrag.groupId = fragGroup.id
        })
        newGroups.delete(newNeighbor.groupId)
      }
    }
    // Only neighbor has group - add frag to it
    else if (newNeighbor.groupId) {
      const neighborGroup = newGroups.get(newNeighbor.groupId)
      if (neighborGroup) {
        neighborGroup.members.add(fragmentName)
        newFrag.groupId = newNeighbor.groupId
      }
    }
    // Only frag has group - add neighbor to it
    else if (newFrag.groupId) {
      const fragGroup = newGroups.get(newFrag.groupId)
      if (fragGroup) {
        fragGroup.members.add(neighborName)
        newNeighbor.groupId = newFrag.groupId
      }
    }
    // Neither has group - create new one
    else {
      const groupId = `group_${Date.now()}_${Math.random()}`
      const newGroup: FragmentGroup = {
        id: groupId,
        members: new Set([fragmentName, neighborName]),
        position: newFrag.currentPosition.clone(),
        rotation: newFrag.currentRotation.clone()
      }
      newGroups.set(groupId, newGroup)
      newFrag.groupId = groupId
      newNeighbor.groupId = groupId
    }
    
    console.log(`Group created/updated. Fragment ${fragmentName} groupId:`, newFrag.groupId, 'Members:', newGroups.get(newFrag.groupId!)?.members)
    
    return { fragments: newFragments, groups: newGroups }
  }

  // Handle pointer down
  const handlePointerDown = (event: PointerEvent | TouchEvent) => {
    // Only handle left mouse button (button 0) or single touch
    const isLeftClick = 'button' in event ? event.button === 0 : true
    
    // For touch events, only handle single finger touch (not multi-touch)
    if ('touches' in event && event.touches.length > 1) {
      return // Let OrbitControls handle multi-touch
    }
    
    if (!isLeftClick) return
    
    event.preventDefault()
    
    // Get pointer position
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
    
    pointer.current.x = (clientX / size.width) * 2 - 1
    pointer.current.y = -(clientY / size.height) * 2 + 1
    
    // Raycast to find clicked fragment
    raycaster.current.setFromCamera(pointer.current, camera)
    
    // Don't filter by isSnapped - allow dragging grouped pieces
    const meshes = Array.from(fragments.values()).map(f => f.mesh)
    
    const intersects = raycaster.current.intersectObjects(meshes, false)
    
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh
      let fragmentName: string | null = null
      for (const [name, fragData] of fragments.entries()) {
        if (fragData.mesh === clickedMesh) {
          fragmentName = name
          break
        }
      }
      if (!fragmentName) return
      draggedFragment.current = fragmentName
      
      const fragment = fragments.get(fragmentName)!
      
      // Get actual current position from 3D object (not from state which may be stale)
      const fragmentObj = gltf.scene.children.find((child: any) => child.name === fragmentName)
      const actualPosition = fragmentObj ? fragmentObj.position.clone() : fragment.currentPosition.clone()
      
      // Setup drag plane facing camera at fragment's actual current position
      const normal = new THREE.Vector3(0, 0, 1)
      normal.applyQuaternion(camera.quaternion)
      dragPlane.current.setFromNormalAndCoplanarPoint(normal, actualPosition)
      
      // Calculate offset from actual position
      const intersection = new THREE.Vector3()
      raycaster.current.ray.intersectPlane(dragPlane.current, intersection)
      dragOffset.current.copy(actualPosition).sub(intersection)
      
      console.log(`Starting drag of ${fragmentName}, groupId: ${fragment.groupId}, actualPos:`, actualPosition)
      
      // Update fragment state
      setFragments(prev => {
        const next = new Map(prev)
        const frag = next.get(fragmentName!)
        if (frag) {
          frag.isDragging = true
          next.set(fragmentName!, frag)
        }
        return next
      })
    }
  }

  // Handle pointer move
  const handlePointerMove = (event: PointerEvent | TouchEvent) => {
    if (!draggedFragment.current) return
    
    // For touch events, only handle single finger touch
    if ('touches' in event && event.touches.length > 1) {
      return // Let OrbitControls handle multi-touch
    }
    
    event.preventDefault()
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
    
    pointer.current.x = (clientX / size.width) * 2 - 1
    pointer.current.y = -(clientY / size.height) * 2 + 1
    
    raycaster.current.setFromCamera(pointer.current, camera)
    
    const intersection = new THREE.Vector3()
    raycaster.current.ray.intersectPlane(dragPlane.current, intersection)
    
    if (intersection) {
      const draggedFrag = fragments.get(draggedFragment.current)
      if (draggedFrag) {
        const newPos = intersection.clone().sub(dragOffset.current)
        const delta = newPos.clone().sub(draggedFrag.currentPosition)
        
        // Create new Map to trigger React update
        const updatedFragments = new Map(fragments)
        
        // If this fragment is in a group, move all group members
        if (draggedFrag.groupId) {
          const group = groups.get(draggedFrag.groupId)
          if (group) {
            group.members.forEach((memberName: string) => {
              const memberFrag = updatedFragments.get(memberName)
              if (memberFrag) {
                const memberNewPos = memberFrag.currentPosition.clone().add(delta)
                
                // Move the parent fragment object
                const fragmentObj = gltf.scene.children.find((child: any) => child.name === memberName)
                if (fragmentObj) {
                  fragmentObj.position.copy(memberNewPos)
                }
                
                memberFrag.currentPosition.copy(memberNewPos)
              }
            })
          }
        } else {
          // No group - move just this fragment
          const fragmentObj = gltf.scene.children.find((child: any) => child.name === draggedFragment.current)
          if (fragmentObj) {
            fragmentObj.position.copy(newPos)
          }
          
          const updatedDraggedFrag = updatedFragments.get(draggedFragment.current)
          if (updatedDraggedFrag) {
            updatedDraggedFrag.currentPosition.copy(newPos)
          }
        }
        
        // Update state to persist changes
        setFragments(updatedFragments)
      }
    }
  }

  // Calculate center of a group
  const calculateGroupCenter = useCallback((groupId: string, frags: Map<string, FragmentData>, grps: Map<string, FragmentGroup>) => {
    const group = grps.get(groupId)
    if (!group || group.members.size === 0) return new THREE.Vector3(0, 0, 0)
    
    const center = new THREE.Vector3()
    let count = 0
    
    group.members.forEach(memberName => {
      const member = frags.get(memberName)
      if (member) {
        center.add(member.currentPosition)
        count++
      }
    })
    
    if (count > 0) {
      center.divideScalar(count)
    }
    
    return center
  }, [])

  // Puzzle is solved once REQUIRED_SNAP_COUNT pieces are in place — any
  // remaining piece beyond that is optional.
  const checkPuzzleCompletion = useCallback((frags: Map<string, FragmentData>) => {
    let activeSnapped = 0
    frags.forEach(frag => {
      if (frag.isActive && frag.isSnapped) activeSnapped++
    })

    console.log(`Puzzle completion: ${activeSnapped}/${REQUIRED_SNAP_COUNT} snapped`)

    return activeSnapped >= REQUIRED_SNAP_COUNT
  }, [])

  // Handle pointer up
  const handlePointerUp = () => {
    if (!draggedFragment.current) return
    
    const fragmentName = draggedFragment.current
    let newFragments = new Map(fragments)
    let newGroups = new Map(groups)
    const frag = newFragments.get(fragmentName)
    
    if (frag) {
      frag.isDragging = false
      
      // Check for intelligent snapping to neighbors
      const snapResult = checkSnapping(fragmentName, newFragments)
      
      if (snapResult) {
        // Snap to neighbor
        frag.targetPosition.copy(snapResult.targetPosition)
        frag.targetRotation.copy(snapResult.targetRotation)
        frag.lerpProgress = 0
        frag.isSnapped = true

        // Mark the neighbour as snapped too. On the very first snap of the
        // puzzle the neighbour was still unsnapped, so without this line the
        // anchor piece stayed at isSnapped=false forever — leaving the
        // counter stuck at 10/11 even after assembling all 11 pieces.
        const neighborFrag = newFragments.get(snapResult.neighborName)
        if (neighborFrag) neighborFrag.isSnapped = true

        // Handle grouping
        const groupResult = handleGrouping(fragmentName, snapResult.neighborName, newFragments, newGroups)
        newFragments = groupResult.fragments
        newGroups = groupResult.groups
        
        // Update orbit center to the newly formed/merged group
        const snappedFrag = newFragments.get(fragmentName)
        if (snappedFrag && snappedFrag.groupId) {
          const groupCenter = calculateGroupCenter(snappedFrag.groupId, newFragments, newGroups)
          targetOrbitCenter.current.copy(groupCenter)
          console.log(`Updating orbit center to group center:`, groupCenter)
        }
        
        // Play snap sound (temporarily muted)
        // if (snapSound.current) {
        //   snapSound.current.currentTime = 0
        //   snapSound.current.play().catch(() => {}) // Ignore audio errors
        // }

        console.log(`Fragment ${fragmentName} snapped to ${snapResult.neighborName}`)
      } else {
        // No snap - just set target to current position
        frag.targetPosition.copy(frag.currentPosition)
        frag.targetRotation.copy(frag.currentRotation)
      }
      
      setFragments(newFragments)
      setGroups(newGroups)
      
      // Check if puzzle is complete. Dispatch a CustomEvent so the UI layer
      // sees the completion in the same frame instead of waiting for the
      // 100 ms window.isPuzzleComplete poll.
      if (checkPuzzleCompletion(newFragments)) {
        console.log('🎉 Puzzle completed!')
        setIsPuzzleComplete(true)
        window.dispatchEvent(new CustomEvent('puzzle:complete'))
      }
      
      // Save to history after releasing piece
      saveToHistory(newFragments, newGroups)
    }
    
    draggedFragment.current = null
  }

  // Setup event listeners
  useEffect(() => {
    const canvas = gl.domElement
    
    // Use capture phase to check button before other handlers
    const pointerDownCapture = (e: any) => {
      // Allow right mouse button to pass through to OrbitControls
      if ('button' in e && e.button === 2) {
        return
      }
      handlePointerDown(e)
    }
    
    canvas.addEventListener('pointerdown', pointerDownCapture, true)
    canvas.addEventListener('pointermove', handlePointerMove as any)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('touchstart', handlePointerDown as any, { passive: false })
    canvas.addEventListener('touchmove', handlePointerMove as any, { passive: false })
    canvas.addEventListener('touchend', handlePointerUp)
    
    return () => {
      canvas.removeEventListener('pointerdown', pointerDownCapture, true)
      canvas.removeEventListener('pointermove', handlePointerMove as any)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('touchstart', handlePointerDown as any)
      canvas.removeEventListener('touchmove', handlePointerMove as any)
      canvas.removeEventListener('touchend', handlePointerUp)
    }
  }, [gl, fragments, camera, size])

  // Halo fade-out: when haloFadeRef is set, decrement it each frame and
  // mirror to every sprite's material.opacity. Hitting 0 flips highlightActive
  // off, which triggers the cleanup branch of the halo effect.
  const HALO_FADE_SEC = 1.5
  useFrame((_state: any, delta: any) => {
    if (haloFadeRef.current === null) return
    haloFadeRef.current = Math.max(0, haloFadeRef.current - delta / HALO_FADE_SEC)
    const op = haloFadeRef.current * HALO_FULL_OPACITY
    haloSpritesRef.current.forEach(s => {
      (s.material as THREE.SpriteMaterial).opacity = op
    })
    if (haloFadeRef.current <= 0) {
      haloFadeRef.current = null
      setHighlightActive(false)
    }
  })

  // Animation loop for lerping and collision detection
  useFrame((_state: any, delta: any) => {
    // Lerp fragments to target positions
    fragments.forEach((frag, fragmentName) => {
      if (!frag.isDragging && frag.lerpProgress < 1) {
        // Lerp to target position over 0.3 seconds
        frag.lerpProgress = Math.min(frag.lerpProgress + delta / 0.3, 1)
        
        frag.currentPosition.lerp(frag.targetPosition, frag.lerpProgress)
        
        // Move the parent fragment object
        const fragmentObjects = gltf.scene.children.filter((child: any) => 
          child.name === fragmentName
        )
        if (fragmentObjects.length > 0) {
          fragmentObjects[0].position.copy(frag.currentPosition)
        }
      }
    })

    // Collision detection - prevent fragments from overlapping
    const fragmentArray = Array.from(fragments.values())
    for (let i = 0; i < fragmentArray.length; i++) {
      const fragA = fragmentArray[i]
      if (fragA.isSnapped) continue // Skip snapped fragments
      
      for (let j = i + 1; j < fragmentArray.length; j++) {
        const fragB = fragmentArray[j]
        if (fragB.isSnapped) continue // Skip snapped fragments
        
        const dist = fragA.currentPosition.distanceTo(fragB.currentPosition)
        if (dist < 0.3) { // Minimum distance threshold
          const pushDir = fragA.currentPosition.clone().sub(fragB.currentPosition).normalize()
          const pushAmount = (0.3 - dist) * 0.5 // Push half the overlap distance
          
          // Only push if not being dragged
          if (!fragA.isDragging) {
            fragA.currentPosition.add(pushDir.multiplyScalar(pushAmount))
            fragA.targetPosition.copy(fragA.currentPosition)
            
            // Move the parent fragment object
            const fragmentObjA = gltf.scene.children.find((child: any) => 
              Array.from(fragments.entries()).find(([, frag]) => frag === fragA)?.[0] === child.name
            )
            if (fragmentObjA) fragmentObjA.position.copy(fragA.currentPosition)
          }
          
          if (!fragB.isDragging) {
            fragB.currentPosition.sub(pushDir.multiplyScalar(pushAmount))
            fragB.targetPosition.copy(fragB.currentPosition)
            
            // Move the parent fragment object
            const fragmentObjB = gltf.scene.children.find((child: any) => 
              Array.from(fragments.entries()).find(([, frag]) => frag === fragB)?.[0] === child.name
            )
            if (fragmentObjB) fragmentObjB.position.copy(fragB.currentPosition)
          }
        }
      }
    }
  })

  // Smooth orbit center animation
  useFrame(() => {
    if (orbitControlsRef.current) {
      // Smoothly lerp the orbit target to the desired center
      orbitControlsRef.current.target.lerp(targetOrbitCenter.current, 0.1)
      orbitControlsRef.current.update()
    }
  })

  // Counter shows X/REQUIRED_SNAP_COUNT — the UI goalpost, not the visible
  // count. snapped is capped so it never exceeds the goal even if the
  // player keeps placing the optional extras.
  const getProgress = useCallback(() => {
    let significantSnapped = 0

    fragments.forEach(frag => {
      if (frag.isActive && frag.isSnapped) {
        significantSnapped++
      }
    })
    
    return {
      snapped: Math.min(significantSnapped, REQUIRED_SNAP_COUNT),
      total: REQUIRED_SNAP_COUNT,
    }
  }, [fragments])

  // Expose undo/redo functions, completion state, progress, and highlight via window for UI access
  useEffect(() => {
    (window as any).puzzleUndo = undo;
    (window as any).puzzleRedo = redo;
    (window as any).canUndo = () => historyIndex > 0;
    (window as any).canRedo = () => historyIndex < history.length - 1;
    (window as any).isPuzzleComplete = isPuzzleComplete;
    (window as any).getPuzzleProgress = getProgress;
    (window as any).highlightUnsnapped = highlightUnsnapped;
    
    return () => {
      delete (window as any).puzzleUndo;
      delete (window as any).puzzleRedo;
      delete (window as any).canUndo;
      delete (window as any).canRedo;
      delete (window as any).isPuzzleComplete;
      delete (window as any).getPuzzleProgress;
      delete (window as any).highlightUnsnapped;
    }
  }, [undo, redo, historyIndex, history.length, isPuzzleComplete, getProgress, highlightUnsnapped])

  return (
    <>
      <primitive object={gltf.scene} />
      {/* Lighting for shader material */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      
      {/* Gold dust particle effects - temporarily disabled */}
      {/* {particleEffects.map(effect => (
        <GoldDustParticles
          key={effect.id}
          position={effect.position}
          neighborPosition={effect.neighborPosition}
          active={effect.active}
          onComplete={() => {
            setParticleEffects(prev => prev.filter(e => e.id !== effect.id))
          }}
        />
      ))} */}
    </>
  )
}

// Preload the model
useGLTF.preload('/models/Test_object.glb')

export default Scene
export type { FragmentData, FragmentGroup, HistoryState }
