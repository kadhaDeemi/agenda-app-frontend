'use client'

import { use, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function LocalProfilePage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const { id: localId } = params;
  const { user: clientUser } = useAuth();

  const [local, setLocal] = useState(null);
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);

  //eestados para el modal de reserva
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [bookingDate, setBookingDate] = useState(new Date());

  //estados del flujo de reserva
  const [availableProfessionals, setAvailableProfessionals] = useState([]);
  const [isFetchingAvailability, setIsFetchingAvailability] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [isBooking, setIsBooking] = useState(false);

  // Estados calculo de disponibilidad
  const [schedules, setSchedules] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const getLocalData = async () => {
      setLoading(true);
      const [ { data: localData }, { data: servicesData }, { data: professionalsData } ] = await Promise.all([
        supabase.from('locales').select('*').eq('id', localId).single(),
        supabase.from('services').select('*').eq('local_id', localId),
        supabase.from('profiles').select('*').eq('local_id', localId).eq('role', 'profesional')
      ]);
      setLocal(localData);
      setServices(servicesData || []);
      setProfessionals(professionalsData || []);
      setLoading(false);
    };
    if (localId) getLocalData();
  }, [localId]);
  
  //obt los datos de horario del profesional SELECCIONADO
  useEffect(() => {
    if (!selectedProfessional) return;
    
    const getScheduleData = async () => {
      const professionalId = selectedProfessional.id;
      const [ { data: schedulesData }, { data: overridesData } ] = await Promise.all([
        supabase.from('work_schedules').select('*').eq('professional_id', professionalId),
        supabase.from('schedule_overrides').select('*').eq('professional_id', professionalId)
      ]);
      setSchedules(schedulesData || []);
      setOverrides(overridesData || []);
    };
    getScheduleData();
  }, [selectedProfessional]);
  
  //obt las citas del profesional SELECCIONADO en la fecha SELECCIONADA
  useEffect(() => {
    if (!selectedProfessional || !bookingDate) return;

    const getAppointments = async () => {
        const startDate = new Date(bookingDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(bookingDate);
        endDate.setHours(23, 59, 59, 999);

        const { data: appointmentsData } = await supabase
            .from('appointments')
            .select('appointment_time, status, services(duration)')
            .eq('professional_id', selectedProfessional.id)
            .gte('appointment_time', startDate.toISOString())
            .lte('appointment_time', endDate.toISOString());
        
        setAppointments(appointmentsData || []);
    };
    getAppointments();
  }, [selectedProfessional, bookingDate]);


  //calculo de disponibilidad en el cliente
  const availableTimeSlots = useMemo(() => {
    if (!selectedService || !selectedProfessional || !bookingDate) return [];

    const dateString = bookingDate.toISOString().split('T')[0];
    if (overrides.some(o => o.override_date === dateString)) {
      return [];
    }

    const dayOfWeek = bookingDate.getDay();
    const workBlocks = schedules
      .filter(s => s.day_of_week === dayOfWeek)
      .map(s => ({
        start: s.start_time.substring(0, 5),
        end: s.end_time.substring(0, 5),
      }));

    if (workBlocks.length === 0) return [];

    const bookedBlocks = appointments
      .filter(appt => appt.status !== 'cancelada')
      .map(appt => {
        const startTime = new Date(appt.appointment_time);
        const endTime = new Date(startTime.getTime() + appt.services.duration * 60000);
        return {
          start: `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`,
          end: `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`,
        };
      });

    const availableSlots = [];
    const serviceDuration = selectedService.duration;
    const now = new Date();
    const isToday = bookingDate.toDateString() === now.toDateString();

    workBlocks.forEach(block => {
      let currentTime = new Date(`${dateString}T${block.start}:00`);
      const blockEnd = new Date(`${dateString}T${block.end}:00`);

      while (currentTime < blockEnd) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);

        if (slotEnd > blockEnd) break;
        
        const isAfterNow = isToday ? slotStart > now : true;
        
        const doesNotOverlap = !bookedBlocks.some(booked => 
            slotStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) < booked.end &&
            slotEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) > booked.start
        );

        if (isAfterNow && doesNotOverlap) {
            availableSlots.push(slotStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
        }

        currentTime.setMinutes(currentTime.getMinutes() + 30);
      }
    });
    
    return availableSlots;
  }, [selectedService, selectedProfessional, bookingDate, schedules, overrides, appointments]);

  useEffect(() => {
    if (!isBookingModalOpen || !bookingDate || !selectedService) return;
    const fetchAvailableProfessionals = async () => {
      setIsFetchingAvailability(true);
      setAvailableProfessionals([]);
      setSelectedProfessional(null);
      const dateString = bookingDate.toISOString().split('T')[0];
      const { data, error } = await supabase.rpc('get_available_professionals', { p_local_id: localId, p_service_id: selectedService.id, p_target_date: dateString });
      if (error) console.error("Error fetching professionals:", error);
      else setAvailableProfessionals(data || []);
      setIsFetchingAvailability(false);
    };
    fetchAvailableProfessionals();
  }, [isBookingModalOpen, bookingDate, selectedService, localId]);

  const openBookingModal = (service) => { setSelectedService(service); setIsBookingModalOpen(true); };
  const closeBookingModal = () => {
    setIsBookingModalOpen(false);
    setSelectedService(null);
    setBookingDate(new Date());
    setSelectedProfessional(null);
    setSelectedTime(null);
  };

  const handleBooking = async () => {
    if (!clientUser) { toast.error('Por favor, inicia sesión para poder agendar.'); return; }
    if (!selectedService || !selectedProfessional || !bookingDate || !selectedTime) return;
    setIsBooking(true);
    
    const [hours, minutes] = selectedTime.split(':');
    const appointmentDateTime = new Date(bookingDate);
    appointmentDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    const { data, error } = await supabase.rpc('book_appointment_if_available', {
      p_client_id: clientUser.id,
      p_professional_id: selectedProfessional.id,
      p_service_id: selectedService.id,
      p_appointment_time: appointmentDateTime.toISOString()
    });

    if (error) {
      toast.error('Hubo un error al agendar la cita: ' + error.message);
    } else if (data.error === 'SLOT_TAKEN') {
      toast.error('Lo sentimos, esta hora acaba de ser reservada.');
      const { data: appointmentsData } = await supabase.from('appointments')
      .select('appointment_time, status, services(duration)').eq('professional_id', selectedProfessional.id).gte('appointment_time', new Date(bookingDate)
      .setHours(0,0,0,0)).lte('appointment_time', new Date(bookingDate).setHours(23,59,59,999));
      setAppointments(appointmentsData || []);
    } else {
      toast.success('¡Cita agendada con éxito!');
      closeBookingModal();
    }
    setIsBooking(false);
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
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="relative h-64 w-full mb-4 rounded-lg overflow-hidden">
            <Image src={local.photo_url || '/default-local.webp'} alt={`Foto de ${local.name}`} fill style={{ objectFit: 'cover' }}/>
          </div>
          <h1 className="text-4xl font-bold">{local.name}</h1>
          <p className="text-lg text-gray-600 mt-2">{local.address}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-bold mb-4">Nuestros Servicios</h2>
          {services.map(service => (
            <div key={service.id} className="p-4 border rounded-lg flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold">{service.name}</h3>
                <p className="text-sm text-gray-500">${service.price} - ({service.duration} min)</p>
              </div>
              <button onClick={() => openBookingModal(service)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Ver Disponibilidad</button>
            </div>
          ))}
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Nuestro Equipo</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {professionals.map(prof => (
              <div key={prof.id} className="text-center">
                <div className="relative h-24 w-24 mx-auto rounded-full overflow-hidden">
                  <Image src={prof.avatar_url || '/default-avatar.png'} alt={`Foto de ${prof.full_name}`} fill style={{ objectFit: 'cover' }} />
                </div>
                <p className="mt-2 font-semibold">{prof.full_name}</p>
              </div>
            ))}
          </div>
        </div>
      </div> 

      <Modal isOpen={isBookingModalOpen} closeModal={closeBookingModal} title={`Reservar: ${selectedService?.name}`} size='2xl'>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col items-center">
            <h3 className="font-semibold mb-2">1. Selecciona una fecha</h3>
            <DayPicker mode="single" selected={bookingDate} onSelect={(date) => { if (date) { setBookingDate(date); setSelectedProfessional(null); } }} disabled={{ before: new Date() }}/>
          </div>
          <div className="flex flex-col">
            <h3 className="font-semibold mb-2">2. Elige un profesional</h3>
            <div className="p-4 border rounded-lg bg-gray-50 space-y-2 mb-4 min-h-[150px]">
              {isFetchingAvailability ? <p>Buscando...</p> : availableProfessionals.length > 0 ? (
                availableProfessionals.map(prof => (
                  <button key={prof.id} onClick={() => setSelectedProfessional(prof)} className={`w-full text-left p-2 rounded-md ${selectedProfessional?.id === prof.id ? 'bg-blue-500 text-white' :
                   'bg-white hover:bg-blue-100'}`}>
                    {prof.full_name}
                  </button>
                ))
              ) : <p className="text-sm text-gray-500">No hay profesionales disponibles.</p>}
            </div>
            {selectedProfessional && (
              <div>
                <h3 className="font-semibold mb-2">3. Elige un horario</h3>
                <div className="p-4 border rounded-lg bg-gray-50 max-h-48 overflow-y-auto">
                  {availableTimeSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {availableTimeSlots.map(time => (
                        <button key={time} onClick={() => setSelectedTime(time)} className={`p-2 border rounded-lg ${selectedTime === time ? 'bg-blue-500 text-white' : 'hover:bg-blue-100'}`}>
                          {time}
                        </button>
                      ))}
                    </div>
                  ) : <p className="text-sm">No hay horarios disponibles para {selectedProfessional.full_name}.</p>}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={handleBooking} disabled={!selectedTime || isBooking} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400">
            {isBooking ? 'Reservando...' : 'Confirmar Cita'}
          </button>
        </div>
      </Modal>
    </>
  );
}