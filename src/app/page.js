import { createClient } from '@/lib/supabase/server'; // Usaremos un cliente de Supabase para servidor
import Link from 'next/link';
import Image from 'next/image';

export default async function HomePage() {
  const supabase = createClient();

  // Obtenemos todos los perfiles que son de rol 'profesional'
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'profesional');

  if (error) {
    return <p>Error al cargar los profesionales. Por favor, intente más tarde.</p>;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Encuentra a tu Profesional Ideal</h1>

      {profiles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {profiles.map((profile) => (
            <Link key={profile.id} href={`/professionals/${profile.id}`} passHref>
              <div className="bg-white rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-300 cursor-pointer">
                <div className="relative h-48 w-full">
                  <Image
                    // Si el avatar es nulo, usamos una imagen por defecto
                    src={profile.avatar_url || '/default-avatar.png'} 
                    alt={`Foto de ${profile.full_name}`}
                    layout="fill"
                    objectFit="cover"
                    className="bg-gray-200"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800">{profile.full_name}
                    
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-600">No hay profesionales disponibles en este momento.</p>
      )}
    </div>
  );
}