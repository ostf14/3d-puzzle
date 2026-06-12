import { useState, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Scene from './Scene'
import PuzzleUI from './PuzzleUI'
import SuccessPopup from './SuccessPopup'
import LoadingOverlay from './LoadingOverlay'
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

  // Poll for undo/redo availability and puzzle completion
  useEffect(() => {
    const interval = setInterval(() => {
      if ((window as any).canUndo) {
        setCanUndo((window as any).canUndo())
      }
      if ((window as any).canRedo) {
        setCanRedo((window as any).canRedo())
      }
      if ((window as any).isPuzzleComplete && !showSuccess) {
        setShowSuccess(true)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [showSuccess])

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

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {showSuccess && <SuccessPopup onClose={() => setShowSuccess(false)} />}

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
