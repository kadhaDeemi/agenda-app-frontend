'use client'

import { useState, useEffect, use, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import StarDisplay from '@/components/StarDisplay';
import { sendBookingConfirmationEmail } from '@/app/actions';

export default function ProfessionalProfilePage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const { user: clientUser, profile: clientProfile } = useAuth();

  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [overrides, setOverrides] = useState([]);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedService, setSelectedService] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isBooking, setIsBooking] = useState(false);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [reviews, setReviews] = useState([]);

  //estados modal de invitado
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  useEffect(() => {
    // Obtene todos los datos
    async function getProfessionalData(id) {
      setLoading(true);
      const [
        { data: profileData },
        { data: servicesData },
        { data: schedulesData },
        { data: overridesData },
        { data: reviewsData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('services').select('*').eq('professional_id', id),
        supabase.from('work_schedules').select('*').eq('professional_id', id),
        supabase.from('schedule_overrides').select('*').eq('professional_id', id),
        supabase.from('reviews').select('*, client:client_id(full_name, avatar_url)').eq('professional_id', id)
      ]);
      
      setProfile(profileData);
      setServices(servicesData || []);
      setSchedules(schedulesData || []);
      setOverrides(overridesData || []);
      setReviews(reviewsData || []);
      setLoading(false);
    }

    if (params.id) {
      getProfessionalData(params.id);
    }
  }, [params.id]);

  // Obtiene las citas existentes para el dia selec
  useEffect(() => {
    if (!selectedDate || !params.id) return;

    async function getAppointmentsForDate(id, date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('appointment_time, status ,services(duration)')
        .eq('professional_id', id)
        .gte('appointment_time', startDate.toISOString())
        .lte('appointment_time', endDate.toISOString());
      
      setAppointments(appointmentsData || []);
    }
    
    getAppointmentsForDate(params.id, selectedDate);
  }, [selectedDate, params.id]);

  //HORAS DISPONIBLES
  const availableTimes = useMemo(() => {
    if (!selectedService || !selectedDate) return [];
    const dateString = selectedDate.toISOString().split('T')[0];
    if (overrides.some(o => o.override_date === dateString)) return [];
    const dayOfWeek = selectedDate.getDay();
    const workBlocks = schedules.filter(s => s.day_of_week === dayOfWeek);
    if (workBlocks.length === 0) return [];

    const bookedSlots = appointments
      .filter(appt => appt.status !== 'cancelada' && appt.services)
      .map(appt => {
        const startTime = new Date(appt.appointment_time);
        const endTime = new Date(startTime.getTime() + appt.services.duration * 60000);
        return { start: startTime, end: endTime };
      });

    const availableSlots = [];
    const serviceDuration = selectedService.duration;
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();

    workBlocks.forEach(block => {
      const [startH, startM] = block.start_time.split(':');
      const [endH, endM] = block.end_time.split(':');
      let slotStart = new Date(selectedDate);
      slotStart.setHours(startH, startM, 0, 0);
      const blockEnd = new Date(selectedDate);
      blockEnd.setHours(endH, endM, 0, 0);

      while (slotStart < blockEnd) {
        const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);
        if (slotEnd > blockEnd) break;
        const isAfterNow = isToday ? slotStart > now : true;
        const doesNotOverlap = !bookedSlots.some(booked => 
            slotStart.getTime() < booked.end.getTime() && slotEnd.getTime() > booked.start.getTime()
        );
        if (isAfterNow && doesNotOverlap) {
            availableSlots.push(slotStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
        }
        slotStart.setMinutes(slotStart.getMinutes() + 30);
      }
    });
    return availableSlots;
  }, [selectedService, selectedDate, schedules, overrides, appointments]);

  // funcion para agendar
  const handleBooking = async () => {
    if (!bookingDetails) return;
    if (clientUser) {
      confirmBookingForUser();
    } else {
      setIsBookingModalOpen(false);
      setIsGuestModalOpen(true);
    }
  };

  //funcion user registrados (clientes)
  const confirmBookingForUser = async () => {
    setIsBooking(true);
    const { data, error } = await supabase.rpc('create_appointment_slot', {
      p_professional_id: profile.id,
      p_service_id: selectedService.id,
      p_appointment_time: bookingDetails.appointmentDateTime.toISOString(),
      p_client_id: clientUser.id
    });
    
    if (error) {
      toast.error('Hubo un error al agendar la cita.');
    } else if (data.error === 'SLOT_TAKEN') {
      toast.error('Lo sentimos, esta hora acaba de ser reservada.');
    } else {
      toast.success('¡Cita agendada con éxito!');
      sendBookingConfirmationEmail({
        clientEmail: clientUser.email,
        clientName: clientProfile.full_name,
        professionalName: profile.full_name,
        serviceName: selectedService.name,
        appointmentTime: bookingDetails.appointmentDateTime.toISOString(),
        locationAddress: profile.address,
        locationPhone: profile.phone
      });
      closeBookingModal();
    }
    setIsBooking(false);
  };

  //funcion user no registrad
  const handleGuestBooking = async (e) => {
    e.preventDefault();
    if (!guestName || !guestEmail || !guestPhone) return toast.error("Todos los campos son obligatorios.");
    setIsBooking(true);

    const { data, error } = await supabase.rpc('create_appointment_slot', {
      p_professional_id: profile.id,
      p_service_id: selectedService.id,
      p_appointment_time: bookingDetails.appointmentDateTime.toISOString(),
      p_guest_name: guestName,
      p_guest_email: guestEmail,
      p_guest_phone: guestPhone
    });

    if (error) {
      toast.error('Hubo un error al agendar la cita.');
    } else if (data.error === 'SLOT_TAKEN') {
      toast.error('Lo sentimos, esta hora acaba de ser reservada.');
    } else {
      toast.success('¡Cita agendada con éxito! Revisa tu email.');
      sendBookingConfirmationEmail({
        clientEmail: guestEmail,
        clientName: guestName,
        professionalName: profile.full_name,
        serviceName: selectedService.name,
        appointmentTime: bookingDetails.appointmentDateTime.toISOString(),
        locationAddress: profile.address,
        locationPhone: profile.phone
      });
      setIsGuestModalOpen(false);
      closeBookingModal();
    }
    setIsBooking(false);
  };

  // funcionees modal
  const openBookingModal = (time) => {
    if (!selectedService) {
      toast.error('Por favor, selecciona un servicio primero.');
      return;
    }
    const [hours, minutes] = time.split(':');
    const appointmentDateTime = new Date(selectedDate);
    appointmentDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    setBookingDetails({ time, appointmentDateTime });
    setIsBookingModalOpen(true);
  };
  
  const closeBookingModal = () => {
    setIsBookingModalOpen(false);
    setBookingDetails(null);
  };

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (total / reviews.length).toFixed(1); // Redondeamos a 1 decimal
  }, [reviews]);

  if (loading) {
    return <div className="container mx-auto px-6 py-8 text-center">Cargando perfil...</div>;
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-6 py-8 text-center">
        <h1 className="text-2xl font-bold">Profesional no encontrado</h1>
        <Link href="/" className="text-blue-500 mt-4 inline-block">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <>
    <div className="container mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
      {/*column izq: perfil y servicios */}
      <div className="md:col-span-1 space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-4xl font-bold mb-2">{profile.full_name}</h1>
          {reviews.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <StarDisplay rating={averageRating} />
                <span className="font-bold text-lg">{averageRating}</span>
                <span className="text-gray-600">({reviews.length} opiniones)</span>
              </div>
            )}
          <p className="text-lg text-gray-600">Rol: {profile.role}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Selecciona un Servicio</h2>
          <ul className="space-y-2">
            {services.map((service) => (
              <li key={service.id} onClick={() => setSelectedService(service)} className={`p-4 border rounded-lg cursor-pointer ${selectedService?.id === service.id ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}>
                <h3 className="font-semibold">{service.name}</h3>
                <p className="text-sm">${service.price} - ({service.duration} min)</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/*column Dere: Calendario y Horas */}
      <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Selecciona Fecha y Hora</h2>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="mx-auto">
            <DayPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={{ before: new Date() }} className="cal-style" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-center md:text-left mb-4">
              Horas disponibles para {selectedDate ? selectedDate.toLocaleDateString() : '...'}
            </h3>
            {!selectedService ? (
              <p className="text-center md:text-left text-gray-500">Por favor, selecciona un servicio primero.</p>
              ) : availableTimes.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {availableTimes.map(time => (
                  <button key={time} onClick={() => openBookingModal(time)} disabled={isBooking} className="p-2 border rounded-lg hover:bg-blue-500 hover:text-white disabled:bg-gray-200">{time}</button>
                ))}
              </div>
            ) : (
              <p className="text-center md:text-left text-gray-500">Por favor, selecciona un servicio primero.</p>
            )}
          </div>
        </div>
      </div>
      {reviews.length > 0 && (
        <div className="container mx-auto px-6 py-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6">Opiniones de Clientes</h2>
            <ul className="space-y-6">
              {reviews.map(review => (
                <li key={review.id} className="border-b pb-6 last:border-b-0">
                  <div className="flex items-center mb-2">
                    <div className="font-bold mr-4">{review.client.full_name}</div>
                    <StarDisplay rating={review.rating} />
                  </div>
                  <p className="text-gray-600">{review.comment}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(review.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {bookingDetails && (
        <Modal isOpen={isBookingModalOpen} closeModal={closeBookingModal} title="Confirmar Cita">
          <p className="text-sm text-gray-600">
            ¿Deseas confirmar tu cita para 
            <span className="font-bold"> {selectedService.name}</span> con 
            <span className="font-bold"> {profile.full_name}</span> el 
            <span className="font-bold"> {bookingDetails.appointmentDateTime.toLocaleString('es-ES')}</span>?
          </p>
          <div className="mt-6 flex justify-end gap-4">
            <button onClick={closeBookingModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none">
              Cancelar
            </button>
            <button onClick={handleBooking} className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none">
              {isBooking ? 'Reservando...' : (clientUser ? 'Confirmar' : 'Continuar')}
            </button>
          </div>
        </Modal>
      )}
      {/*Modaal no registrados */}
    <Modal isOpen={isGuestModalOpen} closeModal={() => setIsGuestModalOpen(false)} title="Completa tus datos para reservar">
      <form onSubmit={handleGuestBooking}>
        <div className="space-y-4">
          <div>
            <label htmlFor="guestName" className="block text-sm font-medium text-gray-700">Nombre Completo</label>
            <input type="text" id="guestName" value={guestName} onChange={(e) => setGuestName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border rounded-md"/>
          </div>
          <div>
            <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" id="guestEmail" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 border rounded-md"/>
          </div>
          <div>
            <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700">Teléfono</label>
            <input type="tel" id="guestPhone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} required className="mt-1 block w-full px-3 py-2 border rounded-md"/>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button type="submit" disabled={isBooking} className="px-4 py-2 rounded-md bg-green-600 text-white disabled:bg-gray-400">
            {isBooking ? 'Reservando...' : 'Confirmar Cita como Invitado'}
          </button>
        </div>
      </form>
    </Modal>
    </div>
    </>
  );
}
