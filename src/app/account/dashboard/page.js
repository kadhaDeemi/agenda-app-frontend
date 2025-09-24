'use client'

import { useState, useEffect, useMemo  } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import PrivateRoute from '@/components/PrivateRoute';
import toast from 'react-hot-toast';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';   

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';

export default function ProfessionalDashboardPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('todas');
  const [dateRange, setDateRange] = useState(undefined);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (user) {
        setLoading(true);
        // filtra por reservas por id del prof. - trae nombre del servicio y nombre del cliente
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_time,
            status,
            services ( name, duration ),
            client:profiles!appointments_client_id_fkey ( full_name )
          `)
          .eq('professional_id', user.id)
          .order('appointment_time', { ascending: true });

        if (error) {
          console.error('Error fetching appointments:', error);
        } else {
          setAppointments(data);
        }
        setLoading(false);
      }
    };

    fetchAppointments();
    }, [user]);

    // cambiar estado de la reserva
    const handleUpdateStatus = async (appointmentId, newStatus) => {
    const confirmationText = {
      'confirmada': '¿Estás seguro de que quieres confirmar esta cita?',
      'cancelada': '¿Estás seguro de que quieres cancelar esta cita?',
      'completada': '¿Marcar esta cita como completada? Esta acción es final.'
    }[newStatus];

    if (window.confirm(confirmationText)) {
      const { data, error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId)
        .select(`id, appointment_time, status, services(name), client:profiles!appointments_client_id_fkey(full_name)`)
        .single();

      if (error) {
        //console.error('Error updating appointment status:', error);
        toast.error('Hubo un error al actualizar la cita.');
      } else {
        setAppointments(prev => prev.map(appt => appt.id === appointmentId ? data : appt));
        toast.success(`Cita actualizada a "${newStatus}" con éxito.`);
      }
    }
  };

  //filtrado de reservas
  const filteredAppointments = useMemo(() => {
    let filtered = appointments; 

    if (statusFilter !== 'todas') {
      filtered = filtered.filter(appt => appt.status === statusFilter);
    }
    if (dateRange?.from) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
        toDate.setHours(23, 59, 59, 999);

        filtered = filtered.filter(appt => {
            const apptDate = new Date(appt.appointment_time);
            return apptDate >= fromDate && apptDate <= toDate;
        });
    }

    return filtered;
  }, [appointments, statusFilter, dateRange]);


  // Transforma las citas a eventos en el calendario
  const calendarEvents = useMemo(() => {
    return filteredAppointments.map(appt => {
      const startTime = new Date(appt.appointment_time);
      const originalDuration = appt.services.duration;
      // Redondea la duracion del servicio
      // divide por 30 y redondea el servicio. ej: servicio dura 45 min = 45/30 = 1.5 = 2 (redondea) 2 * 30 = 60 min redondeea el servicio
      const roundedDuration = Math.ceil(originalDuration / 30) * 30;

      const endTime = new Date(startTime.getTime() + roundedDuration * 60000); // + en miliseg

      return {
        id: appt.id,
        title: `${appt.services.name} - ${appt.client.full_name}`, 
        start: startTime, // fecha y hora ini
        end: endTime,     // Fecha y hora de fin (calculada con el redondeo)
        extendedProps: {
          status: appt.status
        }
      };
    });
  }, [filteredAppointments]);


  return (
    <PrivateRoute requiredRole="profesional">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-6">Mi Agenda de Citas</h1>

        {loading ? (
          <p>Cargando tu agenda...</p>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md">
            {/* Sección de filtros */}
            <div className="flex flex-col md:flex-row gap-8 mb-6 border-b pb-4">
              <div className="flex flex-col gap-2">
                <h3 className="font-bold text-lg">Filtrar por Estado</h3>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setStatusFilter('todas')} className={`px-4 py-2 rounded-lg font-semibold ${statusFilter === 'todas' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>Todas</button>
                  <button onClick={() => setStatusFilter('agendada')} className={`px-4 py-2 rounded-lg font-semibold ${statusFilter === 'agendada' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>Agendadas</button>
                  <button onClick={() => setStatusFilter('confirmada')} className={`px-4 py-2 rounded-lg font-semibold ${statusFilter === 'confirmada' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>Confirmadas</button>
                  <button onClick={() => setStatusFilter('completada')} className={`px-4 py-2 rounded-lg font-semibold ${statusFilter === 'completada' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>Completadas</button>
                  <button onClick={() => setStatusFilter('cancelada')} className={`px-4 py-2 rounded-lg font-semibold ${statusFilter === 'cancelada' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>Canceladas</button>
                </div>
              </div>
              {/* Filtro de fecha */}
              <div className="flex flex-col gap-2">
                <h2 className="font-bold text-lg">Filtrar por Fecha</h2>
                <button onClick={() => setShowCalendar(!showCalendar)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">
                  {showCalendar ? 'Ocultar Calendario' : 'Seleccionar Fechas'}
                </button>
                {showCalendar && (
                  <div className="flex items-center gap-4 mt-2">
                    <DayPicker mode="range" selected={dateRange} onSelect={setDateRange} className="bg-white p-2 border rounded-lg shadow"/>
                    {dateRange && (
                      <button onClick={() => { setDateRange(undefined);
                        setShowCalendar(false); }}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg self-start">
                        Limpiar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            {/*Calendario datos reserva */}
            <div className="mt-4">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                events={calendarEvents}
                locale={esLocale}
                height="auto"
                eventClick={(info) => {
                  alert(`Cita: ${info.event.title}\nEstado: ${info.event.extendedProps.status}`);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </PrivateRoute>
  );
}