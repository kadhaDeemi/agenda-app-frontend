import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import StarDisplay from '@/components/StarDisplay';

// Función para mezclar aleatoriamente un array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export default async function HomePage() {
  const supabase = createClient();

  //Llamamos a la funcion RPC
  let { data: items, error } = await supabase.rpc('get_homepage_items');

  if (error) {
    console.error("Error fetching homepage items:", error);
    return <p className="text-center p-8">Error al cargar la página.</p>;
  }
  
  // Mezclamos los resultados para una vista mas dinámica
  if(items) {
    items = shuffleArray(items);
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Descubre Profesionales y Locales</h1>

      {items && items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <Link key={`${item.item_type}-${item.id}`} href={item.href} passHref>
              <div className="bg-white rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-300 cursor-pointer flex flex-col">
                <div className="relative h-48 w-full">
                  <Image 
                    src={item.image_url || (item.item_type === 'local' ? '/default-local.webp' : '/default-avatar.png')}
                    alt={`Foto de ${item.title}`} 
                    fill 
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
                    style={{ objectFit: 'cover' }}
                    className="bg-gray-200"
                  />
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  {/* Mostramos la categoria/especialidad */}
                  <p className="text-xs font-semibold text-blue-600 uppercase mb-1">{item.category || (item.item_type === 'professional' ? 'Profesional' : 'Local')}</p>
                  <h3 className="text-lg font-bold text-gray-800">{item.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 truncate">{item.subtitle}</p>
                  
                  {/* Mostramos las estrellas y el num de reseñas */}
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 pt-2 border-t mt-auto">
                    {item.review_count > 0 ? (
                      <>
                        <StarDisplay rating={item.avg_rating} />
                        <span className="font-bold">{item.avg_rating}</span>
                        <span>({item.review_count} {item.review_count === 1 ? 'opinión' : 'opiniones'})</span>
                      </>
                    ) : (
                      <span className="text-xs">Aún no tiene opiniones</span>
                    )}
                  </div>
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