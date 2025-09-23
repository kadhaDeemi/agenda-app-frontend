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
    // 1. Definimos la función para obtener datos de forma segura
    const getSessionAndProfile = async () => {
      try {
        console.log("AuthContext: Intentando obtener sesión y perfil...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          setUser(session.user);
          console.log("AuthContext: Sesión encontrada para el usuario:", session.user.id);

          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('AuthContext: ERROR al obtener el perfil.', profileError);
            setProfile(null);
          } else {
            setProfile(profileData || null);
            console.log("AuthContext: Perfil obtenido con éxito:", profileData);
          }
        } else {
          // Si no hay sesión, nos aseguramos de que todo esté limpio
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error("AuthContext: Excepción general al obtener sesión y perfil.", error);
        setUser(null);
        setProfile(null);
      } finally {
        // Esto se ejecuta siempre, haya error o no.
        setLoading(false);
        console.log("AuthContext: Carga inicial finalizada.");
      }
    };

    // 2. Ejecutamos la función al inicio
    getSessionAndProfile();

    // 3. Creamos el listener de cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`AuthContext: Evento de Auth recibido - ${event}`);
        // Cuando hay un cambio, simplemente volvemos a ejecutar nuestra función segura
        getSessionAndProfile();
      }
    );

    // 4. Limpiamos el listener al desmontar el componente
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
      {children}
    </AuthContext.Provider>
  );
}

// hook para ver contxt
export function useAuth() {
  return useContext(AuthContext);
}