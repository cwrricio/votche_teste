import { useState } from 'react';
import { auth } from '../firebase';

function DebugInfo() {
  const [showDebug, setShowDebug] = useState(false);
  const [authState, setAuthState] = useState({
    currentUser: auth.currentUser ? 
      {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName
      } : null,
    initialized: !!auth
  });

  const checkAuth = () => {
    setAuthState({
      currentUser: auth.currentUser ? 
        {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName
        } : null,
      initialized: !!auth
    });
  };

  if (import.meta.env.DEV) {
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
          <div style={{ color: 'white', marginTop: '10px', textAlign: 'left' }}>
            <p>Firebase Auth: {authState.initialized ? '✅ Inicializado' : '❌ Não inicializado'}</p>
            <p>Usuário: {authState.currentUser ? '✅ Logado' : '❌ Não logado'}</p>
            {authState.currentUser && (
              <div>
                <p>Nome: {authState.currentUser.displayName}</p>
                <p>Email: {authState.currentUser.email}</p>
                <p>UID: {authState.currentUser.uid}</p>
              </div>
            )}
            <button onClick={checkAuth} style={{ marginTop: '10px' }}>
              Verificar Auth
            </button>
          </div>
        )}
      </div>
    );
  }
  
  return null;
}

export default DebugInfo;