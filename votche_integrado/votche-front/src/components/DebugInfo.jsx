
import { useState } from 'react';


function DebugInfo() {
  const [showDebug, setShowDebug] = useState(false);
  if (!import.meta.env.DEV) return null;
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.7)',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 1000
    }}>
      <button onClick={() => setShowDebug(!showDebug)}>
        {showDebug ? 'Ocultar Debug' : 'Mostrar Debug'}
      </button>
      {showDebug && (
        <pre style={{ color: 'white', marginTop: '10px' }}>
          {JSON.stringify({ env: import.meta.env }, null, 2)}
        </pre>
      )}
    </div>
  );
}



export default DebugInfo;