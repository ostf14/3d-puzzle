import { useState, useEffect, useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Scene from './Scene'
import PuzzleUI from './PuzzleUI'
import SuccessPopup from './SuccessPopup'
import LoadingOverlay from './LoadingOverlay'
import InfoPanel from './InfoPanel'
// import ModelSelector from './ModelSelector' // re-enable when restoring the selector flow
import * as THREE from 'three'

// Global ref for OrbitControls to enable dynamic target updates
export const orbitControlsRef: { current: any } = { current: null }

function App() {
  // ModelSelector temporarily bypassed — always load Asklepios on start.
  // To restore the selector: switch type back to `string | null` with initial null,
  // re-import ModelSelector, and re-add the `if (!selectedModel) return <ModelSelector .../>` branch.
  const [selectedModel] = useState<string>('/models/Test_object.glb')
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  // Latch so the success popup opens exactly once per session. Without it the
  // 100ms poll re-opens it on the next tick after the user dismisses it,
  // because window.isPuzzleComplete stays true.
  const successShownRef = useRef(false)

  // Poll for undo/redo availability. Completion isn't polled anymore — it
  // arrives as a 'puzzle:complete' CustomEvent so the popup fires in the
  // same frame as the final snap.
  useEffect(() => {
    const interval = setInterval(() => {
      if ((window as any).canUndo) {
        setCanUndo((window as any).canUndo())
      }
      if ((window as any).canRedo) {
        setCanRedo((window as any).canRedo())
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  // Instant success popup on the final snap.
  useEffect(() => {
    const onComplete = () => {
      if (successShownRef.current) return
      successShownRef.current = true
      setShowSuccess(true)
    }
    window.addEventListener('puzzle:complete', onComplete)
    return () => window.removeEventListener('puzzle:complete', onComplete)
  }, [])

  const handleUndo = () => {
    if ((window as any).puzzleUndo) {
      (window as any).puzzleUndo()
    }
  }

  const handleRedo = () => {
    if ((window as any).puzzleRedo) {
      (window as any).puzzleRedo()
    }
  }

  // Keyboard shortcuts: Ctrl/Cmd+Z for undo, Ctrl/Cmd+Shift+Z for redo.
  // Match on e.code (physical key, layout-independent) — e.key would give "я"
  // on Cyrillic layouts and miss the shortcut entirely.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey
      if (!isMod || e.code !== 'KeyZ') return
      e.preventDefault()
      const fn = e.shiftKey ? (window as any).puzzleRedo : (window as any).puzzleUndo
      if (typeof fn === 'function') fn()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Debug-only: pop the success modal on demand. Resets the once-per-session
  // latch so it can be re-opened repeatedly.
  const showPopupForDebug = () => {
    successShownRef.current = false
    setShowSuccess(true)
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {showSuccess && <SuccessPopup onClose={() => setShowSuccess(false)} />}

      <InfoPanel />

      {/* DEBUG — remove before shipping. */}
      <button
        onClick={showPopupForDebug}
        style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1500,
          padding: '8px 14px',
          background: 'rgba(255, 0, 80, 0.85)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '11px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        Debug: show popup
      </button>

      <PuzzleUI
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      
      <Suspense fallback={<LoadingOverlay />}>
        <Canvas
          camera={{ position: [0, 0, 10], fov: 50 }}
          dpr={[1, 2]} // Clamp pixel ratio for mobile performance
          gl={{ antialias: true }}
          style={{ width: '100%', height: '100%', background: '#000000' }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />

          {/* Scene with puzzle logic */}
          <Scene modelPath={selectedModel} />

          {/* Camera controls - right mouse button only, 2+ fingers for touch */}
          <OrbitControls
            ref={(ref) => { orbitControlsRef.current = ref }}
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            mouseButtons={{
              LEFT: THREE.MOUSE.PAN,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.ROTATE
            }}
            touches={{
              ONE: THREE.TOUCH.PAN, // Will be overridden by our custom handler
              TWO: THREE.TOUCH.DOLLY_ROTATE
            }}
            minDistance={5}
            maxDistance={20}
            target={[0, 0, 0]}
          />
        </Canvas>
      </Suspense>
    </div>
  )
}

export default App
