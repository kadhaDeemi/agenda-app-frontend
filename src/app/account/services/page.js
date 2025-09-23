'use client'

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import PrivateRoute from '@/components/PrivateRoute';
import toast from 'react-hot-toast';
import { Edit, Trash2 } from 'lucide-react';

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

  const [editingServiceId, setEditingServiceId] = useState(null); 
  const [editFormData, setEditFormData] = useState({ name: '', description: '', duration: '', price: '' });


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

  // Funcion eliminar servicio
  const handleDelete = async (serviceId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este servicio? Esta acción no se puede deshacer.')) {
      // elimina el serivcio en la bbdd
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) {
        toast.error('Error al eliminar el servicio: ' + error.message);
      } else {
        //actualiza los servicios en la pantalla
        setServices(services.filter(service => service.id !== serviceId));
        toast.success('Servicio eliminado con éxito.');
      }
    }
  };

  //funcion editar
  const handleEditClick = (service) => {
    setEditingServiceId(service.id);
    setEditFormData({
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price,
    });
  };

  //funcion q se ejecuta al modificar un campo del formulario
  const handleEditFormChange = (event) => {
    const { name, value } = event.target;
    setEditFormData(prevData => ({ ...prevData, [name]: value }));
  };

  //editar lo servicios
  const handleUpdate = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase
      .from('services')
      .update({
        name: editFormData.name,
        description: editFormData.description,
        duration: parseInt(editFormData.duration, 10),
        price: parseFloat(editFormData.price),
      })
      .eq('id', editingServiceId);

    if (error) {
      toast.error('Error al actualizar el servicio: ' + error.message);
    } else {
      setServices(services.map(s => s.id === editingServiceId ? { ...s, ...editFormData } : s));
      setEditingServiceId(null);
      toast.success('Servicio actualizado con éxito.');
    }
    setIsSubmitting(false);
  };
  
  //cancela el editar
  const handleCancelEdit = () => {
    setEditingServiceId(null);
  };

  return (
    <PrivateRoute requiredRole="profesional">
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
                required/>
              <input
                type="number"
                placeholder="Duración (en minutos)"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required/>
              <input
                type="number"
                step="0.01"
                placeholder="Precio"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required/>
              <textarea
                placeholder="Descripción (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg md:col-span-2"
                rows="3"/>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full md:w-auto bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-green-300">
              {isSubmitting ? 'Guardando...' : 'Guardar Servicio'}
            </button>
            {formMessage && <p className="mt-4 text-sm">{formMessage}</p>}
          </form>
        </div>

        {/*lista servicios*/}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Mis Servicios Actuales</h2>
          {loading ? ( <p>Cargando servicios...</p> ) : 
           services.length > 0 ? (
            <ul className="space-y-4">
              {services.map((service) => (
                <li key={service.id} className="p-4 border rounded-lg">
                  {editingServiceId === service.id ? (
                    // Editar servicios
                    <form onSubmit={handleUpdate}>
                      <input type="text" name="name" value={editFormData.name} onChange={handleEditFormChange} className="w-full p-2 border rounded mb-2" />
                      <textarea name="description" value={editFormData.description} onChange={handleEditFormChange} className="w-full p-2 border rounded mb-2" />
                      <div className="flex gap-4 mb-4">
                        <input type="number" name="duration" value={editFormData.duration} onChange={handleEditFormChange} className="w-full p-2 border rounded" placeholder="Duración (min)" />
                        <input type="number" step="0.01" name="price" value={editFormData.price} onChange={handleEditFormChange} className="w-full p-2 border rounded" placeholder="Precio" />
                      </div>
                      <div className="flex space-x-2">
                        <button type="submit" disabled={isSubmitting} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded text-sm">
                          {isSubmitting ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button type="button" onClick={handleCancelEdit} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded text-sm">
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    // Divs servicios
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                      <div className="mb-4 md:mb-0">
                        <h3 className="font-semibold text-lg">{service.name}</h3>
                        <p className="text-gray-500">{service.description}</p>
                        <div className="flex items-center text-sm text-gray-500 mt-2">
                          <span className="mr-4">${service.price}</span>
                          <span>{service.duration} min</span>
                        </div>
                      </div>
                      <div className="flex space-x-2 mt-2 md:mt-0">
                        <button onClick={() => handleEditClick(service)} className="flex items-center bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded text-sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </button>
                        <button onClick={() => handleDelete(service.id)} className="flex items-center bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded text-sm">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : ( <p>Aún no has añadido ningún servicio.</p> )}
        </div>
      </div>
    </PrivateRoute>
  );
}