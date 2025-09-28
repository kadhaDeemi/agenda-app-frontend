'use client'

import { use ,useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import Modal from '@/components/Modal';

export default function LocalProfilePage({ params: paramsPromise}) {
  const params = use(paramsPromise);
  const { id: localId } = params;;

  const [local, setLocal] = useState(null);
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para el modal de reserva
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  
  // Estado para la fecha seleccionada DENTRO del modal
  const [bookingDate, setBookingDate] = useState(new Date());

  useEffect(() => {
    const getLocalData = async () => {
      setLoading(true);
      const [
        { data: localData, error: localError },
        { data: servicesData, error: servicesError },
        { data: professionalsData, error: professionalsError }
      ] = await Promise.all([
        supabase.from('locales').select('*').eq('id', localId).single(),
        supabase.from('services').select('*').eq('local_id', localId),
        supabase.from('profiles').select('*').eq('local_id', localId).eq('role', 'profesional')
      ]);

      if (localError) {
        console.error("Error fetching local:", localError);
      } else {
        setLocal(localData);
        setServices(servicesData || []);
        setProfessionals(professionalsData || []);
      }
      setLoading(false);
    };

    if (localId) {
      getLocalData();
    }
  }, [localId]);
  
  // Funciones para controlar el modal
  const openBookingModal = (service) => {
    setSelectedService(service);
    setIsBookingModalOpen(true);
  };

  const closeBookingModal = () => {
    setIsBookingModalOpen(false);
    setSelectedService(null);
    setBookingDate(new Date());
  };


  if (loading) {
    return <p className="text-center p-8">Cargando...</p>;
  }

  if (!local) {
    return <p className="text-center p-8">No se pudo encontrar el local.</p>;
  }

  return (
    <>
      <div className="container mx-auto px-6 py-8">
        {/* Encabezado del Local */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="relative h-64 w-full mb-4 rounded-lg overflow-hidden">
            <Image src={local.photo_url || '/default-local.webp'} alt={`Foto de ${local.name}`} fill style={{ objectFit: 'cover' }}/>
          </div>
          <h1 className="text-4xl font-bold">{local.name}</h1>
          <p className="text-lg text-gray-600 mt-2">{local.address}</p>
        </div>

        {/* Sección de Servicios */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-bold mb-4">Nuestros Servicios</h2>
          {services && services.length > 0 ? (
            <ul className="space-y-4">
              {services.map(service => (
                <li key={service.id} className="p-4 border rounded-lg flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{service.name}</h3>
                    <p className="text-sm text-gray-500">${service.price} - ({service.duration} min)</p>
                  </div>
                  <button onClick={() => openBookingModal(service)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">
                    Ver Disponibilidad
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>Este local no ha añadido servicios todavía.</p>
          )}
        </div>

        {/* Sección de Profesionales */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Nuestro Equipo</h2>
          {professionals && professionals.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {professionals.map(prof => (
                <div key={prof.id} className="text-center">
                  <div className="relative h-24 w-24 mx-auto rounded-full overflow-hidden">
                    <Image
                      src={prof.avatar_url || '/default-avatar.png'}
                      alt={`Foto de ${prof.full_name}`}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  <p className="mt-2 font-semibold">{prof.full_name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No hay profesionales asignados a este local.</p>
          )}
        </div>
      </div> 

      {/*Modal*/}
      {selectedService && (
        <Modal isOpen={isBookingModalOpen} closeModal={closeBookingModal} title={`Reservar: ${selectedService.name}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center">
              <h3 className="font-semibold mb-2">1. Selecciona una fecha</h3>
              <DayPicker mode="single" selected={bookingDate} onSelect={setBookingDate} disabled={{ before: new Date() }}/>
            </div>
            <div className="flex flex-col">
              <h3 className="font-semibold mb-2">2. Elige un profesional y horario</h3>
              <div className="p-4 border rounded-lg bg-gray-50 min-h-[200px]">
                <p className="text-sm text-gray-500">
                  Selecciona una fecha en el calendario para ver los profesionales disponibles.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}