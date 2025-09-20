'use client'

import { useState, useEffect, use, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useAuth } from '@/context/AuthContext';


export default function ProfessionalProfilePage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const { user: clientUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedService, setSelectedService] = useState(null);

  const [appointments, setAppointments] = useState([]);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    async function getProfessionalData(id) {
      setLoading(true);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('professional_id', id);

      if (selectedDate) {
        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);

        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select('appointment_time')
          .eq('professional_id', id)
          .gte('appointment_time', startDate.toISOString())
          .lte('appointment_time', endDate.toISOString());
        
        setAppointments(appointmentsData || []);
      }
      
      setProfile(profileData);
      setServices(servicesData || []);
      setLoading(false);
    }

    if (params.id) {
      getProfessionalData(params.id);
    }
  }, [params.id, selectedDate]);

  //HORAS DISPONIBLES
  const availableTimes = useMemo(() => {
    if (!selectedService || !selectedDate) return [];
    
    //horario laboral
    const workHours = [];
    for (let i = 9; i <= 21; i++) {
      workHours.push(`${i < 10 ? '0' : ''}${i}:00`);
      workHours.push(`${i < 10 ? '0' : ''}${i}:30`);
    }

    const bookedTimes = appointments.map(appt => {
      const date = new Date(appt.appointment_time);
      return `${date.getHours() < 10 ? '0' : ''}${date.getHours()}:${date.getMinutes() < 10 ? '0' : ''}${date.getMinutes()}`;
    });

    const now = new Date();
    //comprueba si la fecha seleccionada es hoy
    const isToday = selectedDate.toDateString() === now.toDateString();

    //Filtra las horas para mostrar solo las futuras y no reservadas
    return workHours.filter(time => {
      const [hours, minutes] = time.split(':');
      const slotTime = new Date(selectedDate);
      slotTime.setHours(parseInt(hours), parseInt(minutes));

      // si la reserva es hoy la hora debe ser posterior a la hora actual
      const isFutureSlot = isToday ? slotTime > now : true;
      
      //La hora no debe esta reservada
      const isNotBooked = !bookedTimes.includes(time);


      return isFutureSlot && isNotBooked;
    });
  }, [appointments, selectedService, , selectedDate]);

  // funcion para agendar
  const handleBooking = async (time) => {
    if (!clientUser) {
      alert('Por favor, inicia sesión para agendar una cita.');
      return;
    }
    if (!selectedService) {
      alert('Por favor, selecciona un servicio primero.');
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
        alert('Hubo un error al agendar tu cita: ' + error.message);
      } else {
        alert('¡Cita agendada con éxito!');
        // Actualiza la lista de citas
        setAppointments([...appointments, { appointment_time: appointmentDateTime.toISOString() }]);
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