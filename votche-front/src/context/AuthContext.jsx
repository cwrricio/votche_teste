import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../firebase";

// Criar o contexto
const AuthContext = createContext();

// Criar o provedor do contexto
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Efeito para monitorar alterações no estado de autenticação
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      if (authUser) {
        setUser(authUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup da subscription quando o componente é desmontado
    return () => unsubscribe();
  }, []);

  // Valor a ser disponibilizado pelo contexto
  const value = {
    user,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para facilitar o uso do contexto
export function useAuth() {
  return useContext(AuthContext);
}
