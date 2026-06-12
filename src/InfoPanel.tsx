import React, { useState } from 'react'

// Panel width is the CSS expression both the drawer and the tab key off of,
// so the tab always lands on the drawer's right edge — even when 85vw
// clamps the width on mobile.
const PANEL_W = 'min(360px, 85vw)'

const META: Array<[string, string]> = [
  ['Artist', 'Veit Königer (1729–1792)'],
  ['Date', 'c. 1776'],
  ['Material', 'Sterzing marble'],
  ['Dimensions', 'H 246 × W 100 × D 70 cm'],
  ['Location', 'Great Parterre, Schönbrunn Palace, Vienna'],
  ['Inventory', 'SKB 005231 001'],
]

const DESCRIPTION =
  'Asclepius, the god of medicine and father of Hygieia, learned the art of healing from the centaur Chiron. He is depicted as an old, bearded man leaning on a staff entwined by a serpent — interpreted as the Tree of Life. This sculpture is part of a series of 32 statues created for the Great Parterre of the Schönbrunn Garden between 1773 and 1780, under the direction of Johann Wilhelm Beyer. It bears the number 21.'

const InfoPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Click-outside catcher. Only rendered while the panel is open so it
          doesn't intercept any clicks during normal puzzle play. */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            cursor: 'pointer',
          }}
        />
      )}

      {/* Scoped scrollbar styling + mobile-safe height. Inline styles can't
          address ::-webkit-scrollbar pseudo-elements, and the dual height
          declaration lets older browsers fall back to 100vh while modern
          mobile browsers use 100dvh (which accounts for the URL bar so the
          bottom of the panel never hides behind it). */}
      <style>{`
        .info-panel-scroll {
          height: 100vh;
          height: 100dvh;
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
          -webkit-overflow-scrolling: touch;
        }
        .info-panel-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .info-panel-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .info-panel-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
        }
        .info-panel-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>

      {/* Slide-out drawer */}
      <aside
        className="info-panel-scroll"
        style={{
          // height is handled in the <style> block above (100vh fallback +
          // 100dvh override) so the panel respects the mobile URL bar.
          position: 'fixed',
          top: 0,
          left: 0,
          width: PANEL_W,
          background: 'rgba(15, 15, 15, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1001,
          overflowY: 'auto',
          padding: '32px 24px',
          boxSizing: 'border-box',
          color: 'white',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <img
          src="https://emuseum.schoenbrunn-group.com/internal/media/dispatcher/63194/full"
          alt="Äskulap, sculpture by Veit Königer"
          loading="lazy"
          style={{
            width: '100%',
            borderRadius: '12px',
            marginBottom: '24px',
            display: 'block',
          }}
        />

        <h2 style={{
          fontSize: '22px',
          fontWeight: 700,
          color: 'white',
          margin: '0 0 16px 0',
          lineHeight: 1.2,
        }}>
          Äskulap (Asclepius)
        </h2>

        <dl style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          margin: 0,
        }}>
          {META.map(([label, value]) => (
            <div key={label}>
              <dt style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '2px',
              }}>
                {label}
              </dt>
              <dd style={{
                color: 'white',
                fontSize: '14px',
                margin: 0,
                lineHeight: 1.45,
              }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <p style={{
          fontSize: '14px',
          lineHeight: 1.6,
          color: 'rgba(255,255,255,0.75)',
          margin: '16px 0 0 0',
        }}>
          {DESCRIPTION}
        </p>

        <a
          href="https://emuseum.schoenbrunn-group.com/objects/87955/askulap"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#FFD700',
            fontSize: '13px',
            textDecoration: 'none',
            marginTop: '20px',
            display: 'block',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none'
          }}
        >
          eMuseum Schönbrunn Group →
        </a>

        <p style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.35)',
          margin: '12px 0 0 0',
        }}>
          Photo © Schloß Schönbrunn / Alexander Eugen Koller
        </p>
      </aside>

      {/* Vertical tab — always visible. Slides right with the drawer so it
          always reads as attached to the drawer's right edge. */}
      <button
        onClick={() => setIsOpen(o => !o)}
        aria-label={isOpen ? 'Close info panel' : 'Open info panel'}
        aria-expanded={isOpen}
        style={{
          position: 'fixed',
          top: '50%',
          left: isOpen ? PANEL_W : '0',
          transform: 'translateY(-50%)',
          // The left transition mirrors the drawer's transform timing so the
          // two move as one.
          transition: 'left 0.35s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.15s ease, color 0.15s ease',
          background: 'rgba(20, 20, 20, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '12px 8px',
          borderRadius: '0 12px 12px 0',
          border: 'none',
          cursor: 'pointer',
          zIndex: 1002,
          color: 'rgba(255,255,255,0.7)',
          fontSize: '12px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          writingMode: 'vertical-rl',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(30,30,30,0.95)'
          e.currentTarget.style.color = 'white'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(20,20,20,0.85)'
          e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
        }}
      >
        {/* Rotate the inner span so the text reads bottom-to-top instead of
            the default top-to-bottom of vertical-rl. Keeps the button's own
            translateY(-50%) intact. */}
        <span style={{ display: 'inline-block', transform: 'rotate(180deg)' }}>
          About the item
        </span>
      </button>
    </>
  )
}

export default InfoPanel
