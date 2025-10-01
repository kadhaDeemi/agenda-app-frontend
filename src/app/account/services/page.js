'use client'

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import PrivateRoute from '@/components/PrivateRoute';
import toast from 'react-hot-toast';
import { Edit, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';

export default function ManageServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(''); 
  const [selectedService, setSelectedService] = useState(null);

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

  //funcoines modal

  const openModal = (mode, service) => {
    setModalMode(mode);
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalMode('');
    setSelectedService(null);
  };
  const handleModalFormChange = (event) => {
    const { name, value } = event.target;
    setSelectedService(prev => ({ ...prev, [name]: value }));
  };
  
  
  const handleDelete = async () => {
    if (!selectedService) return;
    const { error } = await supabase.from('services').delete().eq('id', selectedService.id);

    if (error) {
      toast.error('Error al eliminar el servicio: ' + error.message);
    } else {
      setServices(services.filter(service => service.id !== selectedService.id));
      toast.success('Servicio eliminado con éxito.');
    }
    closeModal();
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!selectedService) return;
    setIsSubmitting(true);

    const { error } = await supabase
      .from('services')
      .update({
        name: selectedService.name,
        description: selectedService.description,
        duration: parseInt(selectedService.duration, 10),
        price: parseFloat(selectedService.price),
      })
      .eq('id', selectedService.id)
      .select()
      .single();

    if (error) {
      toast.error('Error al actualizar el servicio: ' + error.message);
    } else {
      setServices(services.map(s => s.id === selectedService.id ? selectedService : s));
      toast.success('Servicio actualizado con éxito.');
    }
    setIsSubmitting(false);
    closeModal();
  };

  return (
    <PrivateRoute requiredRole="profesional">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-6">Gestionar mis Servicios</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-bold mb-4">Añadir Nuevo Servicio</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Nombre del Servicio" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required/>
              <input type="number" placeholder="Duración (en minutos)" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required/>
              <input type="number" step="0.01" placeholder="Precio" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required/>
              <textarea placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg md:col-span-2" rows="3"/>
            </div>
            <button type="submit" disabled={isSubmitting} className="mt-4 w-full md:w-auto bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-green-300">
              {isSubmitting ? 'Guardando...' : 'Guardar Servicio'}
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Mis Servicios Actuales</h2>
          {loading ? (<p>Cargando servicios...</p>) : 
            services.length > 0 ? (
              <ul className="space-y-4">
                {services.map((service) => (
                  <li key={service.id} className="p-4 border rounded-lg">
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
                        <button onClick={() => openModal('edit', service)} className="flex items-center bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded text-sm"><Edit className="w-4 h-4 mr-2" /> Editar</button>
                        <button onClick={() => openModal('delete', service)} className="flex items-center bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded text-sm"><Trash2 className="w-4 h-4 mr-2" /> Eliminar</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (<p>Aún no has añadido ningún servicio.</p>)
          }
        </div>
      </div>

      <Modal isOpen={isModalOpen} closeModal={closeModal} title={modalMode === 'edit' ? 'Editar Servicio' : 'Confirmar Eliminación'}>
        {modalMode === 'edit' && selectedService ? (
          <form onSubmit={handleUpdate}>
            <label className="block text-sm font-medium text-gray-700">Nombre</label>
            <input type="text" name="name" value={selectedService.name} onChange={handleModalFormChange} className="mt-1 w-full p-2 border rounded mb-2" />
            <label className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea name="description" value={selectedService.description || ''} onChange={handleModalFormChange} className="mt-1 w-full p-2 border rounded mb-2" />
            <div className="flex gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Duración (min)</label>
                <input type="number" name="duration" value={selectedService.duration} onChange={handleModalFormChange} className="mt-1 w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Precio</label>
                <input type="number" step="0.01" name="price" value={selectedService.price} onChange={handleModalFormChange} className="mt-1 w-full p-2 border rounded" />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button type="button" onClick={closeModal} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded text-sm">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded text-sm">{isSubmitting ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        ) : modalMode === 'delete' && selectedService ? (
          <div>
            <p>¿Estás seguro de que quieres eliminar el servicio <strong>{selectedService.name}</strong>? Esta acción no se puede deshacer.</p>
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200">No, volver</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700">Sí, eliminar</button>
            </div>
          </div>
        ) : null}
      </Modal>
    </PrivateRoute>
  );
}