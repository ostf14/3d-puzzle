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
  // Elapsed wall-clock seconds since the most recent 'puzzle:ready' event,
  // displayed in the dock as a HH:MM:SS counter.
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  // Bumped on Restart to force-remount the Scene component, which clears
  // its internal state and fires a fresh 'puzzle:ready'.
  const [restartCount, setRestartCount] = useState(0)
  // Latch so the success popup opens exactly once per session. Without it the
  // 100ms poll re-opens it on the next tick after the user dismisses it,
  // because window.isPuzzleComplete stays true.
  const successShownRef = useRef(false)
  const timerIntervalRef = useRef<number | null>(null)
  // Armed-but-not-yet-firing 'pointerdown' listener. Set on puzzle:ready,
  // consumed by the first pointer event the player produces.
  const pendingStartRef = useRef<(() => void) | null>(null)

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

  // Timer lifecycle:
  //  • puzzle:ready  → reset to 0, arm a one-shot 'pointerdown' listener
  //  • first pointerdown  → start the 1s interval, listener auto-removes
  //  • puzzle:complete  → freeze the counter, drop any armed listener
  //  • Restart fires a fresh puzzle:ready, so the whole cycle repeats
  useEffect(() => {
    const dropPending = () => {
      if (pendingStartRef.current) {
        window.removeEventListener('pointerdown', pendingStartRef.current as EventListener)
        pendingStartRef.current = null
      }
    }

    const onReady = () => {
      setElapsedSeconds(0)
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      dropPending()
      const startTimer = () => {
        pendingStartRef.current = null
        if (timerIntervalRef.current) return
        timerIntervalRef.current = window.setInterval(() => {
          setElapsedSeconds(s => s + 1)
        }, 1000)
      }
      pendingStartRef.current = startTimer
      window.addEventListener('pointerdown', startTimer, { once: true })
    }

    const onComplete = () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      dropPending()
    }

    window.addEventListener('puzzle:ready', onReady)
    window.addEventListener('puzzle:complete', onComplete)
    return () => {
      window.removeEventListener('puzzle:ready', onReady)
      window.removeEventListener('puzzle:complete', onComplete)
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      dropPending()
    }
  }, [])

  // Restart: force-remount Scene via key change. Scene's init useEffect
  // re-runs, scrambles fragments fresh, and dispatches 'puzzle:ready',
  // which auto-resets the timer + success latch.
  const handleRestart = () => {
    successShownRef.current = false
    setShowSuccess(false)
    setRestartCount(c => c + 1)
  }

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
      {showSuccess && <SuccessPopup onClose={() => setShowSuccess(false)} elapsedSeconds={elapsedSeconds} />}

      <InfoPanel />

      {/* Restart — top-left, same dark-glass material as the Highlight chip. */}
      <button
        onClick={handleRestart}
        aria-label="Restart puzzle"
        style={{
          position: 'fixed',
          top: '24px',
          left: '24px',
          zIndex: 1000,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'rgba(20, 20, 20, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.5)',
          color: 'rgba(255,255,255,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          outline: 'none',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(35, 35, 35, 0.9)'
          e.currentTarget.style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(20, 20, 20, 0.85)'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        {/* Lucide "rotate-ccw" icon, inlined */}
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>

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
        elapsedSeconds={elapsedSeconds}
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

          {/* Scene with puzzle logic. The key forces a full remount on
              Restart so all internal state, sprites, and event bindings
              reset cleanly. */}
          <Scene key={restartCount} modelPath={selectedModel} />

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
