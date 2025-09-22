'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function PrivateRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Si no hay usuario va al login
      if (!user) {
        router.push('/login');
      } 
      // Si se requiere un rol y el rol no coincide, redirec
      else if (requiredRole && profile?.role !== requiredRole) {
        router.push('/account');
      }
    }
  }, [user, profile, loading, router, requiredRole]);

  // Si esta cargando o si el usuario no cumple la condicion, muestra un loader.
  if (loading || !user || (requiredRole && profile?.role !== requiredRole)) {
    return <div>Cargando...</div>;
  }

  return children;
}