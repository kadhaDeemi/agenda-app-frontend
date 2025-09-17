'use client'

import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';

//var contexto
const AuthContext = createContext();

// provider contexto
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // obt sesion
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session ? session.user : null);
      setLoading(false);
    };

    getSession();

    // ve los cambios en la autentificacion
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session ? session.user : null);
        setLoading(false);
      }
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

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

// hook para ver contxt
export function useAuth() {
  return useContext(AuthContext);
}