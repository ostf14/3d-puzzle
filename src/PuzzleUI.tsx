import React, { useState, useEffect } from 'react'

interface PuzzleUIProps {
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onBackToMenu?: () => void
}

const DEFAULT_SHADOW = 'inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05)'
const PRESSED_SHADOW = 'inset 0 3px 6px rgba(0,0,0,0.6)'
const DEFAULT_BG = 'rgba(255,255,255,0.08)'
const HOVER_BG = 'rgba(255,255,255,0.14)'

const dockButtonStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  background: DEFAULT_BG,
  boxShadow: DEFAULT_SHADOW,
  color: 'rgba(255,255,255,0.8)',
  fontSize: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  outline: 'none',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  padding: 0,
  lineHeight: 1,
  userSelect: 'none',
}

const disabledOverlayStyle: React.CSSProperties = {
  opacity: 0.3,
  cursor: 'not-allowed',
}

// Inline-style buttons can't use :hover/:active, so we mutate style directly.
// All handlers no-op when the button is disabled.
const onEnter = (enabled: boolean) => (e: React.MouseEvent<HTMLButtonElement>) => {
  if (!enabled) return
  e.currentTarget.style.background = HOVER_BG
  e.currentTarget.style.transform = 'scale(1.05)'
}
const onLeave = (enabled: boolean) => (e: React.MouseEvent<HTMLButtonElement>) => {
  if (!enabled) return
  e.currentTarget.style.background = DEFAULT_BG
  e.currentTarget.style.transform = 'scale(1)'
  e.currentTarget.style.boxShadow = DEFAULT_SHADOW
}
const onDown = (enabled: boolean) => (e: React.MouseEvent<HTMLButtonElement>) => {
  if (!enabled) return
  e.currentTarget.style.boxShadow = PRESSED_SHADOW
  e.currentTarget.style.transform = 'scale(0.95)'
}
const onUp = (enabled: boolean) => (e: React.MouseEvent<HTMLButtonElement>) => {
  if (!enabled) return
  e.currentTarget.style.boxShadow = DEFAULT_SHADOW
  e.currentTarget.style.transform = 'scale(1.05)'
}

const PuzzleUI: React.FC<PuzzleUIProps> = ({ onUndo, onRedo, canUndo, canRedo, onBackToMenu }) => {
  const [progress, setProgress] = useState({ snapped: 0, total: 0 })

  // Poll for puzzle progress (unchanged)
  useEffect(() => {
    const interval = setInterval(() => {
      if ((window as any).getPuzzleProgress) {
        const newProgress = (window as any).getPuzzleProgress()
        setProgress(newProgress)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const fillPct = progress.total > 0 ? (progress.snapped / progress.total) * 100 : 0

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(20, 20, 20, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRadius: '28px',
      padding: '12px 24px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      zIndex: 1000,
    }}>
      {/* Back to Menu — currently never rendered (App.tsx doesn't pass onBackToMenu) */}
      {onBackToMenu && (
        <button
          onClick={onBackToMenu}
          style={dockButtonStyle}
          onMouseEnter={onEnter(true)}
          onMouseLeave={onLeave(true)}
          onMouseDown={onDown(true)}
          onMouseUp={onUp(true)}
          aria-label="Back to menu"
        >
          ←
        </button>
      )}

      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        style={{ ...dockButtonStyle, ...(canUndo ? {} : disabledOverlayStyle) }}
        onMouseEnter={onEnter(canUndo)}
        onMouseLeave={onLeave(canUndo)}
        onMouseDown={onDown(canUndo)}
        onMouseUp={onUp(canUndo)}
        aria-label="Undo"
      >
        ↶
      </button>

      {/* Highlight — calls window.highlightUnsnapped exactly as before */}
      <button
        onClick={() => {
          if ((window as any).highlightUnsnapped) {
            (window as any).highlightUnsnapped()
          }
        }}
        style={dockButtonStyle}
        onMouseEnter={onEnter(true)}
        onMouseLeave={onLeave(true)}
        onMouseDown={onDown(true)}
        onMouseUp={onUp(true)}
        aria-label="Highlight unsnapped pieces"
      >
        ✨
      </button>

      {/* Progress: count + animated fill bar */}
      <div style={{
        minWidth: '100px',
        textAlign: 'center',
        position: 'relative',
      }}>
        <div style={{
          fontSize: '28px',
          fontWeight: 700,
          color: 'white',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}>
          {progress.snapped}/{progress.total}
        </div>
        <div style={{
          height: '3px',
          borderRadius: '2px',
          background: 'rgba(255,255,255,0.1)',
          marginTop: '6px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${fillPct}%`,
            height: '100%',
            borderRadius: '2px',
            background: 'linear-gradient(90deg, #FFD700, #FFA500)',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Redo */}
      <button
        onClick={onRedo}
        disabled={!canRedo}
        style={{ ...dockButtonStyle, ...(canRedo ? {} : disabledOverlayStyle) }}
        onMouseEnter={onEnter(canRedo)}
        onMouseLeave={onLeave(canRedo)}
        onMouseDown={onDown(canRedo)}
        onMouseUp={onUp(canRedo)}
        aria-label="Redo"
      >
        ↷
      </button>
    </div>
  )
}

export default PuzzleUI
