import React, { useState, useEffect } from 'react'

interface PuzzleUIProps {
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onBackToMenu?: () => void
  elapsedSeconds?: number
}

const formatTime = (s: number) => {
  const safe = Math.max(0, Math.floor(s))
  const h = Math.floor(safe / 3600).toString().padStart(2, '0')
  const m = Math.floor((safe % 3600) / 60).toString().padStart(2, '0')
  const sec = (safe % 60).toString().padStart(2, '0')
  return `${h}:${m}:${sec}`
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

// Standalone floating button (Highlight): same materiality as the dock so it
// reads as a sibling chip rather than a stray light button on the canvas.
const floatingButtonStyle: React.CSSProperties = {
  ...dockButtonStyle,
  background: 'rgba(20, 20, 20, 0.85)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.5)',
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

// Floating Highlight button uses its own hover/press cycle so we don't
// overwrite its dark-glass background with the light dock-button bg.
const FLOAT_DEFAULT_BG = 'rgba(20, 20, 20, 0.85)'
const FLOAT_HOVER_BG = 'rgba(35, 35, 35, 0.9)'
const FLOAT_DEFAULT_SHADOW = 'inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.5)'
const FLOAT_PRESSED_SHADOW = 'inset 0 3px 6px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.5)'

const onFloatEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = FLOAT_HOVER_BG
  e.currentTarget.style.transform = 'scale(1.05)'
}
const onFloatLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = FLOAT_DEFAULT_BG
  e.currentTarget.style.transform = 'scale(1)'
  e.currentTarget.style.boxShadow = FLOAT_DEFAULT_SHADOW
}
const onFloatDown = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.boxShadow = FLOAT_PRESSED_SHADOW
  e.currentTarget.style.transform = 'scale(0.95)'
}
const onFloatUp = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.boxShadow = FLOAT_DEFAULT_SHADOW
  e.currentTarget.style.transform = 'scale(1.05)'
}

const PuzzleUI: React.FC<PuzzleUIProps> = ({ onUndo, onRedo, canUndo, canRedo, onBackToMenu, elapsedSeconds = 0 }) => {
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
    <>
      {/* Bottom-center dock: Undo, Progress, Redo */}
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
          {/* Lucide "undo-2" icon, inlined */}
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
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
          </svg>
        </button>

        {/* Progress: count + animated fill bar */}
        <div style={{
          minWidth: '100px',
          textAlign: 'center',
          position: 'relative',
        }}>
          {/* Progress digits — gold to echo the bar's gradient. */}
          <div style={{
            fontFamily: '"Doto", sans-serif',
            fontSize: '15px',
            fontWeight: 700,
            color: '#FFD700',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}>
            {progress.snapped}/{progress.total}
          </div>
          <div style={{
            height: '2px',
            borderRadius: '1px',
            background: 'rgba(255,255,255,0.08)',
            marginTop: '6px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${fillPct}%`,
              height: '100%',
              borderRadius: '1px',
              background: 'linear-gradient(90deg, #FFD700, #FFA500)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          {/* Elapsed-time counter — same Doto + white glow as the popup
              title, format HH:MM:SS. Counts from puzzle:ready, freezes on
              puzzle:complete, resets on Restart. */}
          <div style={{
            fontFamily: '"Doto", sans-serif',
            fontSize: '15px',
            fontWeight: 700,
            color: 'white',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
            marginTop: '6px',
            textShadow: '0 0 8px rgba(255, 255, 255, 0.6), 0 0 20px rgba(255, 255, 255, 0.3)',
          }}>
            {formatTime(elapsedSeconds)}
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
          {/* Lucide "redo-2" icon, inlined */}
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
            <path d="m15 14 5-5-5-5" />
            <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" />
          </svg>
        </button>
      </div>

      {/* Highlight — standalone floating button, bottom-right corner */}
      <button
        onClick={() => {
          if ((window as any).highlightUnsnapped) {
            (window as any).highlightUnsnapped()
          }
        }}
        style={{
          ...floatingButtonStyle,
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 1000,
        }}
        onMouseEnter={onFloatEnter}
        onMouseLeave={onFloatLeave}
        onMouseDown={onFloatDown}
        onMouseUp={onFloatUp}
        aria-label="Highlight unsnapped pieces"
      >
        {/* Lucide "search" icon, inlined to avoid pulling lucide-react */}
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
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>
    </>
  )
}

export default PuzzleUI
