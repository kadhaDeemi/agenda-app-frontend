'use client'

import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';

//var contexto
const AuthContext = createContext();

// provider contexto
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // obt sesion
    const getSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session ? session.user : null);
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(profileData || null);
      }
      setLoading(false);
    };

    getSessionAndProfile();

    // ve los cambios en la autentificacion
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session ? session.user : null);
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfile(profileData || null);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    profile,
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