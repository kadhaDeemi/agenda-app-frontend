'use client'

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; 
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

export default function Navbar() {
  const { user, profile } = useAuth(); // Obtiene el usuario
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/'); 
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-gray-800">
        <Image 
            src="/Logo-Horizontal.webp" 
            alt="Logo de ChronosPro" 
            width={200} // Ajusta el ancho según sea necesario
            height={40} // Ajusta la altura según sea necesario
            />
        </Link>

        <div>
          {user ? (
            // Si hay un usuario logueado
            <div className="flex items-center">
              {profile?.role === 'administrador' && (
                <Link href="/admin" className="text-gray-800 hover:text-blue-600 mr-4 font-semibold">
                  Panel Admin
                </Link>
              )}
              <Link href="/account" className="text-gray-800 hover:text-blue-600 mr-4">
                Mi Cuenta
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">
                Cerrar Sesión
              </button>
            </div>
          ) : (
            // Si no hay un usuario logueado
            <div>
              <Link href="/login" className="text-gray-800 hover:text-blue-600 mr-4">
                Iniciar Sesión
              </Link>
              <Link href="/signup" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}