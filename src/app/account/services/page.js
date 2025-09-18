'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import PrivateRoute from '@/components/PrivateRoute';

export default function ManageServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Funcion para obtener los servicios del profesional por id
  useEffect(() => {
    const fetchServices = async () => {
      if (user) {
        setLoading(true);
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('professional_id', user.id);

        if (error) {
          console.error('Error fetching services:', error);
        } else {
          setServices(data);
        }
        setLoading(false);
      }
    };

    fetchServices();
  }, [user]); // Se ejecuta cada vez que el'user' cambia

  return (
    <PrivateRoute>
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-6">Gestionar mis Servicios</h1>

        {/* form servicios*/}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-bold">Añadir Nuevo Servicio</h2>
          <p className="mt-2 text-gray-600">Próximamente...</p>
        </div>

        {/* Lista de servicios*/}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Mis Servicios Actuales</h2>
          {loading ? (
            <p>Cargando servicios...</p>
          ) : services.length > 0 ? (
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
            <p>Aún no has añadido ningún servicio.</p>
          )}
        </div>
      </div>
    </PrivateRoute>
  );
}