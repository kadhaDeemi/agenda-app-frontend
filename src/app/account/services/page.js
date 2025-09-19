'use client'

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import PrivateRoute from '@/components/PrivateRoute';

export default function ManageServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para el form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Funcion para obtener los servicios
  const fetchServices = useCallback(  async () => {
    if (user) {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('professional_id', user.id)
        .order('created_at', { ascending: false }); // más antiguo abajo

      if (error) {
        console.error('Error fetching services:', error);
      } else {
        setServices(data);
      }
      setLoading(false);
    }
  }, [user]);


  useEffect(() => {
    fetchServices();
  }, [ fetchServices]);

  //maneja el form
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name || !duration || !price) {
      setFormMessage('Nombre, Duración y Precio son campos obligatorios.');
      return;
    }

    setIsSubmitting(true);
    setFormMessage('');

    // add a al BBDD
    const { data, error } = await supabase
      .from('services')
      .insert({
        professional_id: user.id,
        name,
        description,
        duration: parseInt(duration, 10),
        price: parseFloat(price),
      })
      .select() //devuelve el registro insertado
      .single();

    if (error) {
      setFormMessage('Error al crear el servicio: ' + error.message);
    } else {
      setFormMessage('¡Servicio creado con éxito!');
      setServices([data, ...services]);
      // Limpia el form
      setName('');
      setDescription('');
      setDuration('');
      setPrice('');
    }
    setIsSubmitting(false);
  };

  return (
    <PrivateRoute>
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-6">Gestionar mis Servicios</h1>

        {/* Formulario add servicios */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-bold mb-4">Añadir Nuevo Servicio</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nombre del Servicio (ej: Corte de Pelo)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
              <input
                type="number"
                placeholder="Duración (en minutos)"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Precio"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
              <textarea
                placeholder="Descripción (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg md:col-span-2"
                rows="3"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full md:w-auto bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-green-300"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Servicio'}
            </button>
            {formMessage && <p className="mt-4 text-sm">{formMessage}</p>}
          </form>
        </div>

        {/* Lista de servicios*/}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Mis Servicios Actuales</h2>
          {loading ? ( <p>Cargando servicios...</p> ) : 
           services.length > 0 ? (
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
          ) : ( <p>Aún no has añadido ningún servicio.</p> )}
        </div>
      </div>
    </PrivateRoute>
  );
}