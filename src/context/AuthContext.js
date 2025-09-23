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
    //func para obt datos
    const getSessionAndProfile = async () => {
      try {
        //console.log("AuthContext: Intentando obtener sesión y perfil...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          setUser(session.user);
          //console.log("AuthContext: Sesión encontrada para el usuario:", session.user.id);

          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            //console.error('AuthContext: ERROR al obtener el perfil.', profileError);
            setProfile(null);
          } else {
            setProfile(profileData || null);
            //console.log("AuthContext: Perfil obtenido con éxito:", profileData);
          }
        } else {
          //nos aseguramos de que todo este limpio si no hay sesion
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        //console.error("AuthContext: Excepcion general al obtener sesión y perfil.", error);
        setUser(null);
        setProfile(null);
      } finally {
        // Esto se ejecuta siempre con o sin error
        setLoading(false);
        //console.log("AuthContext: carga inicial finalizada.");
      }
    };


    getSessionAndProfile();

    //liste de cambios de autenticacioon
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        //console.log(`AuthContext: Evento de Auth recibido - ${event}`);
        //Cuando hay un cambio, simplemente volvemos a ejecutar nuestra func
        getSessionAndProfile();
      }
    );

    //limpia el listener al desmontar el componente
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