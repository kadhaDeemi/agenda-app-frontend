import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';

export default async function HomePage() {
  const supabase = createClient();

  // Obt todos los locales
  const { data: locales, error } = await supabase
    .from('locales')
    .select('*');

  if (error) {
    return <p className="text-center p-8">Error al cargar los locales.</p>;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Descubre Nuestros Locales</h1>

      {locales.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {locales.map((local) => (
            <Link key={local.id} href={`/locales/${local.id}`} passHref>
              <div className="bg-white rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-300 cursor-pointer">
                <div className="relative h-48 w-full">
                  <Image src={local.photo_url || '/default-local.webp'}  alt={`Foto de ${local.name}`} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" style={{ objectFit: 'cover' }}
                    className="bg-gray-200"/>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800">{local.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{local.address}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-600">No hay locales registrados en este momento.</p>
      )}
    </div>
  );
}