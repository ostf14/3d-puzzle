import React, { useState, useEffect } from 'react'

interface PuzzleUIProps {
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onBackToMenu?: () => void
}

const PuzzleUI: React.FC<PuzzleUIProps> = ({ onUndo, onRedo, canUndo, canRedo, onBackToMenu }) => {
  const [progress, setProgress] = useState({ snapped: 0, total: 0 })

  // Poll for puzzle progress
  useEffect(() => {
    const interval = setInterval(() => {
      if ((window as any).getPuzzleProgress) {
        const newProgress = (window as any).getPuzzleProgress()
        setProgress(newProgress)
      }
    }, 100)
    
    return () => clearInterval(interval)
  }, [])
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '10px',
      zIndex: 1000,
      alignItems: 'center'
    }}>
      {/* Back to Menu Button */}
      {onBackToMenu && (
        <button
          onClick={onBackToMenu}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: '#FF5722',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E64A19'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FF5722'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <span style={{ fontSize: '20px' }}>←</span>
          Back
        </button>
      )}

      {/* Progress Counter */}
      <div style={{
        padding: '12px 24px',
        fontSize: '18px',
        fontWeight: 'bold',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        minWidth: '100px',
        textAlign: 'center'
      }}>
        {progress.snapped}/{progress.total}
      </div>

      {/* Highlight Button */}
      <button
        onClick={() => {
          if ((window as any).highlightUnsnapped) {
            (window as any).highlightUnsnapped()
          }
        }}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: 'bold',
          backgroundColor: '#FFD700',
          color: '#333',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#FFC700'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#FFD700'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        <span style={{ fontSize: '20px' }}>✨</span>
        Highlight
      </button>

      <button
        onClick={onUndo}
        disabled={!canUndo}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: 'bold',
          backgroundColor: canUndo ? '#4CAF50' : '#cccccc',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: canUndo ? 'pointer' : 'not-allowed',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        onMouseEnter={(e) => {
          if (canUndo) {
            e.currentTarget.style.backgroundColor = '#45a049'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }
        }}
        onMouseLeave={(e) => {
          if (canUndo) {
            e.currentTarget.style.backgroundColor = '#4CAF50'
            e.currentTarget.style.transform = 'translateY(0)'
          }
        }}
      >
        <span style={{ fontSize: '20px' }}>↶</span>
        Undo
      </button>
      
      <button
        onClick={onRedo}
        disabled={!canRedo}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: 'bold',
          backgroundColor: canRedo ? '#2196F3' : '#cccccc',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: canRedo ? 'pointer' : 'not-allowed',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        onMouseEnter={(e) => {
          if (canRedo) {
            e.currentTarget.style.backgroundColor = '#0b7dda'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }
        }}
        onMouseLeave={(e) => {
          if (canRedo) {
            e.currentTarget.style.backgroundColor = '#2196F3'
            e.currentTarget.style.transform = 'translateY(0)'
          }
        }}
      >
        <span style={{ fontSize: '20px' }}>↷</span>
        Redo
      </button>
    </div>
  )
}

export default PuzzleUI
