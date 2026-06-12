import React, { useState, useEffect } from 'react'

// Model load takes ~11s on typical connections. Animate a fake progress bar
// linearly from 0 → 99% over that window so users see steady, predictable
// motion. Cap at 99% so the bar never sits at "100% but still loading".
// Suspense will unmount this overlay the moment the GLB actually resolves.
const LOAD_DURATION_MS = 11000
const PROGRESS_CAP = 99

const LoadingOverlay: React.FC = () => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const startTime = performance.now()
    let rafId = 0

    const tick = () => {
      const elapsed = performance.now() - startTime
      const next = Math.min((elapsed / LOAD_DURATION_MS) * PROGRESS_CAP, PROGRESS_CAP)
      setProgress(next)
      if (next < PROGRESS_CAP) {
        rafId = requestAnimationFrame(tick)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#000000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px',
      zIndex: 3000,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        fontSize: '12px',
        letterSpacing: '0.4em',
        textTransform: 'uppercase',
        color: 'rgba(255, 255, 255, 0.55)',
        fontWeight: 300,
        paddingLeft: '0.4em', // visually compensate trailing letter-spacing
      }}>
        Loading
      </div>

      <div style={{
        width: '240px',
        height: '2px',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '1px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
        }} />
      </div>

      <div style={{
        fontSize: '11px',
        color: 'rgba(255, 255, 255, 0.35)',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 300,
        minWidth: '3ch',
        textAlign: 'center',
      }}>
        {Math.round(progress)}%
      </div>
    </div>
  )
}

export default LoadingOverlay
