'use client'

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PrivateRoute from '@/components/PrivateRoute';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function AccountPage() {
  const { profile } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    // sirve para cerrar sesion del usuario
    await supabase.auth.signOut();
    // manda al usuario al inicio
    router.push('/');
  };

  return (
    <PrivateRoute>
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white shadow-md rounded-lg text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          ¡Bienvenido a tu cuenta!
        </h1>
        <p className="text-gray-600 mb-6">
          Esta es tu página personal. Desde aquí podrás gestionar tus citas.
        </p>
        <div className="space-y-4">
            {profile?.role === 'profesional' && (
              <>
              <Link href="/account/services" className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">
                Gestionar mis Servicios
              </Link>
              <Link href="/account/schedule" className="block w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg">
                  Gestionar mi Horario
                </Link>
              </>
              
            )}
            {profile?.role === 'cliente' && (
              <Link href="/account/my-appointments" className="block w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">
                Ver Mis Citas
              </Link>
            )}
            <button onClick={handleLogout} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">
              Cerrar Sesión
            </button>
          </div>
      </div>
    </div>
    </PrivateRoute>
  );
}