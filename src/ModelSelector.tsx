import React, { useState, useEffect } from 'react'

interface ModelInfo {
  name: string
  path: string
  displayName: string
}

interface ModelSelectorProps {
  onSelectModel: (modelPath: string) => void
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onSelectModel }) => {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  useEffect(() => {
    // List of available models in the public/models directory
    const availableModels: ModelInfo[] = [
      {
        name: '3__1992.230_apollo_and_daphne.glb',
        path: '/models/3__1992.230_apollo_and_daphne.glb',
        displayName: 'Apollo and Daphne'
      },
      {
        name: 'Test_object.glb',
        path: '/models/Test_object.glb',
        displayName: 'Asklepios (Test Object)'
      }
    ]
    
    setModels(availableModels)
  }, [])

  const handleSelectModel = (modelPath: string) => {
    setSelectedModel(modelPath)
    // Small delay for visual feedback
    setTimeout(() => {
      onSelectModel(modelPath)
    }, 200)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#1a1a2e',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      boxSizing: 'border-box'
    }}>
      <h1 style={{
        fontSize: '48px',
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        Select a 3D Puzzle
      </h1>
      
      <p style={{
        fontSize: '18px',
        color: '#aaaaaa',
        marginBottom: '60px',
        textAlign: 'center'
      }}>
        Choose a model to start assembling
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '30px',
        maxWidth: '1200px',
        width: '100%'
      }}>
        {models.map((model) => (
          <div
            key={model.path}
            onClick={() => handleSelectModel(model.path)}
            style={{
              backgroundColor: selectedModel === model.path ? '#4CAF50' : '#2a2a3e',
              borderRadius: '16px',
              padding: '40px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: selectedModel === model.path 
                ? '0 8px 24px rgba(76, 175, 80, 0.4)' 
                : '0 4px 12px rgba(0, 0, 0, 0.3)',
              border: selectedModel === model.path ? '3px solid #4CAF50' : '3px solid transparent',
              transform: selectedModel === model.path ? 'scale(1.05)' : 'scale(1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '200px'
            }}
            onMouseEnter={(e) => {
              if (selectedModel !== model.path) {
                e.currentTarget.style.backgroundColor = '#3a3a4e'
                e.currentTarget.style.transform = 'translateY(-5px)'
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.4)'
              }
            }}
            onMouseLeave={(e) => {
              if (selectedModel !== model.path) {
                e.currentTarget.style.backgroundColor = '#2a2a3e'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)'
              }
            }}
          >
            <div style={{
              fontSize: '48px',
              marginBottom: '20px'
            }}>
              🏛️
            </div>
            
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#ffffff',
              textAlign: 'center',
              margin: 0
            }}>
              {model.displayName}
            </h2>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ModelSelector
