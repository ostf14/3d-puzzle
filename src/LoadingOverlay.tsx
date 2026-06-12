import React from 'react'
import { useProgress } from '@react-three/drei'

const LoadingOverlay: React.FC = () => {
  const { progress } = useProgress()

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
          transition: 'width 0.3s ease-out',
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
