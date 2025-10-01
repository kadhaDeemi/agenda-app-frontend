import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';

//funcion para mezclar aleatoriamente un array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export default async function HomePage() {
  const supabase = createClient();

  //obt los locales y los profesionales independientes en paralelo
  const [
    { data: localesData, error: localesError },
    { data: professionalsData, error: professionalsError }
  ] = await Promise.all([
    supabase.from('locales').select('*'),
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, address')
      .eq('role', 'profesional')
      .is('local_id', null) //para buscar los independientes
  ]);

  if (localesError || professionalsError) {
    console.error("Error fetching data:", localesError || professionalsError);
    return <p className="text-center p-8">Error al cargar la página.</p>;
  }

  //Unificamos los datos
  let combinedItems = [
    ...(localesData || []).map(item => ({
      id: item.id,
      title: item.name,
      imageUrl: item.photo_url || item.banner_url || '/default-local.webp',
      subtitle: item.address,
      href: `/locales/${item.id}`,
      type: 'local'
    })),
    ...(professionalsData || []).map(item => ({
      id: item.id,
      title: item.full_name,
      imageUrl: item.avatar_url || '/default-avatar.png',
      subtitle: item.address || 'Profesional Independiente',
      href: `/professionals/${item.id}`,
      type: 'professional'
    }))
  ];

  //resultado dinamico
  combinedItems = shuffleArray(combinedItems);

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Descubre Profesionales y Locales</h1>

      {combinedItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {combinedItems.map((item) => (
            <Link key={`${item.type}-${item.id}`} href={item.href} passHref>
              <div className="bg-white rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-300 cursor-pointer">
                <div className="relative h-48 w-full">
                  <Image 
                    src={item.imageUrl}
                    alt={`Foto de ${item.title}`} 
                    fill 
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
                    style={{ objectFit: 'cover' }}
                    className="bg-gray-200"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800">{item.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 truncate">{item.subtitle}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-600">No hay locales o profesionales registrados en este momento.</p>
      )}
    </div>
  );
}