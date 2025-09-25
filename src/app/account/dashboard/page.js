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
import Modal from '@/components/Modal';



export default function ProfessionalDashboardPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('todas');
  const [dateRange, setDateRange] = useState(undefined);
  const [showCalendar, setShowCalendar] = useState(false);

  //modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

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
    closeModal(); // Cierra el modal antes de procesar
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId)
      .select(`*, services(name, duration), client:profiles!appointments_client_id_fkey(full_name)`)
      .single();

    if (error) {
      toast.error('Hubo un error al actualizar la cita.');
    } else {
      setAppointments(prev => prev.map(appt => appt.id === appointmentId ? data : appt));
      toast.success(`Cita actualizada a "${newStatus}" con éxito.`);
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
    return filteredAppointments.map(appt => ({
      id: appt.id,
      title: `${appt.services.name} - ${appt.client.full_name}`,
      start: new Date(appt.appointment_time),
      end: new Date(new Date(appt.appointment_time).getTime() + (Math.ceil(appt.services.duration / 30) * 30) * 60000),
      extendedProps: { status: appt.status },
      backgroundColor: { 'agendada': '#3B82F6', 'confirmada': '#10B981', 'completada': '#6B7280', 'cancelada': '#EF4444' }[appt.status],
      borderColor: { 'agendada': '#2563EB', 'confirmada': '#059669', 'completada': '#4B5563', 'cancelada': '#DC2626' }[appt.status],
    }));
  }, [filteredAppointments]);

  //funciones modal
  function closeModal() {
    setIsModalOpen(false);
    setSelectedEvent(null);
  }

  function openModal(event) {
    setSelectedEvent(event);
    setIsModalOpen(true);
  }

  const handleEventClick = (info) => {
    const { id, title, extendedProps, start } = info.event;
    const isPastAppointment = new Date(start) < new Date();
    
    openModal({
      id,
      title,
      status: extendedProps.status,
      start,
      isPastAppointment
    });
  };

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
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView="timeGridWeek"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                events={calendarEvents} locale={esLocale} height="auto" eventClick={handleEventClick}/>
            </div>
          </div>
        )}
      </div>
      {selectedEvent && (
        <Modal isOpen={isModalOpen} closeModal={closeModal} title="Detalles de la Cita">
          <p className="text-lg font-semibold text-gray-800">{selectedEvent.title}</p>
          <p className="text-sm text-gray-600">
            {selectedEvent.start.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
          <p className="text-sm text-gray-600 capitalize">
            Estado: <span className="font-bold">{selectedEvent.status}</span>
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {selectedEvent.status === 'agendada' && (
              <>
                <button
                  onClick={() => handleUpdateStatus(selectedEvent.id, 'confirmada')}
                  className="w-full inline-flex justify-center rounded-md border border-transparent bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 focus:outline-none">
                  Confirmar Cita
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedEvent.id, 'cancelada')}
                  className="w-full inline-flex justify-center rounded-md border border-transparent bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 focus:outline-none">
                  Cancelar Cita
                </button>
              </>
            )}
            
            {selectedEvent.status === 'confirmada' && selectedEvent.isPastAppointment && (
              <button
                onClick={() => handleUpdateStatus(selectedEvent.id, 'completada')}
                className="w-full inline-flex justify-center rounded-md border border-transparent bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none">
                Marcar como Completada
              </button>
            )}
            <button
              onClick={closeModal}
              className="mt-2 w-full inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
              Cerrar
            </button>
          </div>
        </Modal>
      )}
    </PrivateRoute>
  );
}