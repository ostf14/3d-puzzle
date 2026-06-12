import React from 'react'

interface SuccessPopupProps {
  onClose: () => void
  elapsedSeconds: number
}

const CLOSE_DEFAULT_SHADOW = 'inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05)'
const CLOSE_PRESSED_SHADOW = 'inset 0 3px 6px rgba(0,0,0,0.6)'

const formatTime = (s: number) => {
  const safe = Math.max(0, Math.floor(s))
  const h = Math.floor(safe / 3600).toString().padStart(2, '0')
  const m = Math.floor((safe % 3600) / 60).toString().padStart(2, '0')
  const sec = (safe % 60).toString().padStart(2, '0')
  return `${h}:${m}:${sec}`
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({ onClose, elapsedSeconds }) => {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      animation: 'spFadeIn 0.3s ease-in',
    }}>
      <div style={{
        position: 'relative',
        background: 'rgba(20, 20, 20, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '28px',
        padding: '56px 56px 48px',
        maxWidth: '520px',
        width: 'calc(100vw - 48px)',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        animation: 'spSlideUp 0.4s ease-out',
        color: 'white',
      }}>
        {/* Close button — same idiom as dock buttons */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            boxShadow: CLOSE_DEFAULT_SHADOW,
            color: 'rgba(255,255,255,0.75)',
            fontSize: '22px',
            fontWeight: 300,
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
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.14)'
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = CLOSE_DEFAULT_SHADOW
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.boxShadow = CLOSE_PRESSED_SHADOW
            e.currentTarget.style.transform = 'scale(0.95)'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.boxShadow = CLOSE_DEFAULT_SHADOW
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
        >
          ×
        </button>

        {/* Title — same Doto + white glow treatment as the progress counter. */}
        <h1 style={{
          fontFamily: '"Doto", sans-serif',
          fontSize: '40px',
          fontWeight: 700,
          color: 'white',
          margin: '0 0 12px 0',
          lineHeight: 1.1,
          textShadow: '0 0 8px rgba(255, 255, 255, 0.6), 0 0 20px rgba(255, 255, 255, 0.3)',
        }}>
          Puzzle Complete!
        </h1>

        {/* Congratulatory subtitle — same uppercase letter-spaced sans
            as the About-the-item tab, treated as a museum-style caption. */}
        <p style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '12px',
          fontWeight: 400,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: 'rgba(255, 255, 255, 0.5)',
          lineHeight: 1.7,
          margin: 0,
        }}>
          You&rsquo;ve successfully reassembled the sculpture
        </p>

        {/* Final time — frozen on puzzle:complete, same Doto + white-glow
            treatment as the live dock timer, scaled up so it carries the
            popup's "your score" beat. */}
        <div style={{
          fontFamily: '"Doto", sans-serif',
          fontSize: '32px',
          fontWeight: 700,
          color: 'white',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          marginTop: '28px',
          textShadow: '0 0 8px rgba(255, 255, 255, 0.6), 0 0 20px rgba(255, 255, 255, 0.3)',
        }}>
          {formatTime(elapsedSeconds)}
        </div>
      </div>

      <style>{`
        @keyframes spFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spSlideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default SuccessPopup
