'use client'

import { useState, useEffect, use, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';


export default function ProfessionalProfilePage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const { user: clientUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [overrides, setOverrides] = useState([]);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedService, setSelectedService] = useState(null);

  const [appointments, setAppointments] = useState([]);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    // Obtene todos los datos
    async function getProfessionalData(id) {
      setLoading(true);
      const [
        { data: profileData },
        { data: servicesData },
        { data: schedulesData },
        { data: overridesData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('services').select('*').eq('professional_id', id),
        supabase.from('work_schedules').select('*').eq('professional_id', id),
        supabase.from('schedule_overrides').select('*').eq('professional_id', id),
      ]);
      
      setProfile(profileData);
      setServices(servicesData || []);
      setSchedules(schedulesData || []);
      setOverrides(overridesData || []);
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
        .select('appointment_time, services(duration)')
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

    // Ve si hay dia libre 
    const dateString = selectedDate.toISOString().split('T')[0];
    if (overrides.some(o => o.override_date === dateString && !o.start_time)) {
      return [];
    }

    // Mira el horario para el dia selec
    const dayOfWeek = selectedDate.getDay();
    const workBlocks = schedules
      .filter(s => s.day_of_week === dayOfWeek)
      .map(s => ({
        start: s.start_time.substring(0, 5),
        end: s.end_time.substring(0, 5),
      }));

    if (workBlocks.length === 0) return [];

    // obt los bloques ya ocupados (reservas)
    const bookedBlocks = appointments.map(appt => {
      const startTime = new Date(appt.appointment_time);
      const endTime = new Date(startTime.getTime() + appt.services.duration * 60000);
      return {
        start: `${startTime.getHours() < 10 ? '0' : ''}${startTime.getHours()}:${startTime.getMinutes() < 10 ? '0' : ''}${startTime.getMinutes()}`,
        end: `${endTime.getHours() < 10 ? '0' : ''}${endTime.getHours()}:${endTime.getMinutes() < 10 ? '0' : ''}${endTime.getMinutes()}`,
      };
    });


    // Generar y filtrar los posibles horarios
    const availableSlots = [];
    const serviceDuration = selectedService.duration;
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();

    workBlocks.forEach(block => {
      let currentTime = block.start;
      while (currentTime < block.end) {
        const [hour, minute] = currentTime.split(':').map(Number);
        const slotStart = new Date(selectedDate);
        slotStart.setHours(hour, minute, 0, 0);

        const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);
        
        const slotEndTimeString = `${slotEnd.getHours() < 10 ? '0' : ''}${slotEnd.getHours()}:${slotEnd.getMinutes() < 10 ? '0' : ''}${slotEnd.getMinutes()}`;

        // Comprobaciones para que un slot sea valido
        const isAfterNow = isToday ? slotStart > now : true;
        const endsWithinWorkBlock = slotEndTimeString <= block.end;
        const doesNotOverlap = !bookedBlocks.some(booked => 
          currentTime < booked.end && slotEndTimeString > booked.start
        );

        if (isAfterNow && endsWithinWorkBlock && doesNotOverlap) {
          availableSlots.push(currentTime);
        }

        //muestra al siguiente posible slot (intervalos de 30 min)
        const nextSlot = new Date(slotStart.getTime() + 30 * 60000);
        currentTime = `${nextSlot.getHours() < 10 ? '0' : ''}${nextSlot.getHours()}:${nextSlot.getMinutes() < 10 ? '0' : ''}${nextSlot.getMinutes()}`;
      }
    });
    
    return availableSlots;

  }, [selectedService, selectedDate, schedules, overrides, appointments]);

  // funcion para agendar
  const handleBooking = async (time) => {
    if (!clientUser) {
      toast('Por favor, inicia sesión para agendar una cita.');
      return;
    }
    if (!selectedService) {
      toast('Por favor, selecciona un servicio primero.');
      return;
    }
    
    const [hours, minutes] = time.split(':');
    const appointmentDateTime = new Date(selectedDate);
    appointmentDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    
    if (window.confirm(`¿Confirmas tu cita para ${selectedService.name} el ${appointmentDateTime.toLocaleString()}?`)) {
      setIsBooking(true);
      
      const { error } = await supabase.from('appointments').insert({
        client_id: clientUser.id,
        professional_id: profile.id,
        service_id: selectedService.id,
        appointment_time: appointmentDateTime.toISOString(),
      });
      
      if (error) {
        toast.error('Hubo un error al agendar tu cita: ' + error.message);
      } else {
        toast.success('¡Cita agendada con éxito!');
        // Actualiza la lista de citas
        setAppointments(prev => [...prev, {
  appointment_time: appointmentDateTime.toISOString(),
  services: { duration: selectedService.duration }
}]);
      }
      setIsBooking(false);
    }
  };

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
    <div className="container mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
      {/*column izq: perfil y servicios */}
      <div className="md:col-span-1 space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-4xl font-bold mb-2">{profile.full_name}</h1>
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
                  <button key={time} onClick={() => handleBooking(time)} disabled={isBooking} className="p-2 border rounded-lg hover:bg-blue-500 hover:text-white">{time}</button>
                ))}
              </div>
            ) : (
              <p className="text-center md:text-left text-gray-500">Por favor, selecciona un servicio primero.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}