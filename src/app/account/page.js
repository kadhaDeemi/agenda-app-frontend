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
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <PrivateRoute>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 bg-white shadow-md rounded-lg text-center w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            ¡Bienvenido a tu cuenta!
          </h1>
          <p className="text-gray-600 mb-6">
            Esta es tu página personal. Desde aquí podrás gestionar tus citas.
          </p>
          <div className="space-y-4">
            
            {/* Logica para Clientes*/}
            {profile?.role === 'cliente' && (
              <Link href="/account/my-appointments" className="block w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg">
                Ver Mis Citas
              </Link>
            )}
            {/*Logica para Profesionales y Administradores */}
            {profile?.role === 'profesional' && (
              <>
                {/*solo para profesionales INDEPENDIENTES */}
                {profile.local_id === null && (
                  <>
                    <Link href="/account/services" className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg">
                      Gestionar mis Servicios
                    </Link>
                    <Link href="/account/schedule" className="block w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg">
                      Gestionar mi Horario
                    </Link>
                    <Link href="/account/edit-profile" className="block w-full text-center bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300">
                      Editar mi Perfil
                      </Link>
                  </>
                )}
                {/*enlace para all los profesionales */}
                <Link href="/account/dashboard" className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg">
                  Ver mi Agenda de Citas
                </Link>
              </>
            )}
            {/* Administradores*/}
            {profile?.role === 'administrador' && (
              <>
              <Link href="/admin" className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg">
                Panel de Administración
              </Link>
              <Link href="/account/edit-profile" className="block w-full text-center bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300">
                  Editar mi Perfil
                </Link>
              </>   
            )}
            <button onClick={handleLogout} className="block w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </PrivateRoute>
  );
}