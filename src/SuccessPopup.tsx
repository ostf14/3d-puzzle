import React from 'react'

interface SuccessPopupProps {
  onClose: () => void
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({ onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      animation: 'fadeIn 0.3s ease-in'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '500px',
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        animation: 'slideUp 0.4s ease-out'
      }}>
        {/* Green Checkmark */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: '#4CAF50',
          margin: '0 auto 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'scaleIn 0.5s ease-out'
        }}>
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#333',
          margin: '0 0 10px 0'
        }}>
          Asklepios
        </h1>

        {/* Description */}
        <p style={{
          fontSize: '16px',
          color: '#666',
          lineHeight: '1.6',
          margin: '0 0 30px 0'
        }}>
          Statue of Asclepius in the park of Schönbrunn Palace. He is depicted as an old, bearded man, supported by a stick wrapped by a snake, which is considered to be the tree of life. The snake symbolises both wisdom and renewal. In Greek and Roman mythology, Asclepius is the god of healing.
        </p>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            padding: '12px 40px',
            fontSize: '18px',
            fontWeight: 'bold',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#45a049'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#4CAF50'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          Continue
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scaleIn {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}

export default SuccessPopup
