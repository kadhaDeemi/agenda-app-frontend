import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

// funcion obtiene los datos del profesional y sus servicios
async function getProfessionalData(id) {
  //Obtener los datos del perfil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single(); //para obtener un solo registro

  if (profileError) {
    console.error('Error fetching profile:', profileError);
    return { profile: null, services: [] };
  }

  // Obtener los servicios de ese perfil
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('*')
    .eq('professional_id', id);

  if (servicesError) {
    console.error('Error fetching services:', servicesError);
    return { profile, services: [] };
  }

  return { profile, services };
}


export default async function ProfessionalProfilePage({ params }) {
  const { profile, services } = await getProfessionalData(params.id);

  if (!profile) {
    return (
      <div className="container mx-auto px-6 py-8 text-center">
        <h1 className="text-2xl font-bold">Profesional no encontrado</h1>
        <Link href="/" className="text-blue-500 mt-4 inline-block">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Seccion del Perfil */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h1 className="text-4xl font-bold mb-2">{profile.full_name}</h1>
        <p className="text-lg text-gray-600">Rol: {profile.role}</p>
      </div>

      {/* Seccion de Servicios */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Servicios Ofrecidos</h2>
        {services && services.length > 0 ? (
          <ul className="space-y-4">
            {services.map((service) => (
              <li key={service.id} className="p-4 border rounded-lg flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">{service.name}</h3>
                  <p className="text-gray-500">{service.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xl">${service.price}</p>
                  <p className="text-sm text-gray-500">{service.duration} min</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>Este profesional aún no ha añadido ningún servicio.</p>
        )}
      </div>
    </div>
  );
}