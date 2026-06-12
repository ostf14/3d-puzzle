import React from 'react'

interface SuccessPopupProps {
  onClose: () => void
}

const CLOSE_DEFAULT_SHADOW = 'inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05)'
const CLOSE_PRESSED_SHADOW = 'inset 0 3px 6px rgba(0,0,0,0.6)'

const SuccessPopup: React.FC<SuccessPopupProps> = ({ onClose }) => {
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

        {/* Title */}
        <h1 style={{
          fontFamily: '"Iowan Old Style", "Apple Garamond", Baskerville, "Times New Roman", Georgia, serif',
          fontSize: '36px',
          fontWeight: 400,
          fontStyle: 'italic',
          letterSpacing: '0.02em',
          color: 'rgba(255, 255, 255, 0.95)',
          margin: '0 0 20px 0',
          lineHeight: 1.1,
        }}>
          Puzzle Complete!
        </h1>

        {/* Congratulatory message — statue details live in the InfoPanel now. */}
        <p style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '15px',
          fontWeight: 300,
          color: 'rgba(255, 255, 255, 0.7)',
          lineHeight: 1.6,
          margin: 0,
          letterSpacing: '0.01em',
        }}>
          You&rsquo;ve successfully reassembled the sculpture.
        </p>
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
