'use client'

import { useState, useEffect, useMemo  } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import PrivateRoute from '@/components/PrivateRoute';
import toast from 'react-hot-toast';

export default function ProfessionalDashboardPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('todas');

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
            services ( name ),
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

  const filteredAppointments = useMemo(() => {
    if (statusFilter === 'todas') {
      return appointments;
    }
    return appointments.filter(appt => appt.status === statusFilter);
  }, [appointments, statusFilter]);


  return (
    <PrivateRoute requiredRole="profesional">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-6">Mi Agenda de Citas</h1>

        {loading ? (
          <p>Cargando tu agenda...</p>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md">
            {/* Sección de botones de filtro */}
            <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
              <button onClick={() => setStatusFilter('todas')} className={`px-4 py-2 rounded-lg font-semibold ${statusFilter === 'todas' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>Todas</button>
              <button onClick={() => setStatusFilter('agendada')} className={`px-4 py-2 rounded-lg font-semibold ${statusFilter === 'agendada' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>Agendadas</button>
              <button onClick={() => setStatusFilter('confirmada')} className={`px-4 py-2 rounded-lg font-semibold ${statusFilter === 'confirmada' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>Confirmadas</button>
              <button onClick={() => setStatusFilter('completada')} className={`px-4 py-2 rounded-lg font-semibold ${statusFilter === 'completada' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>Completadas</button>
              <button onClick={() => setStatusFilter('cancelada')} className={`px-4 py-2 rounded-lg font-semibold ${statusFilter === 'cancelada' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>Canceladas</button>
            </div>
            {filteredAppointments.length > 0 ? (
              <ul className="space-y-4">
                {filteredAppointments.map((appt) => {
                  const isPastAppointment = new Date(appt.appointment_time) < new Date();
                  return (
                  <li key={appt.id} className="p-4 border rounded-lg flex flex-wrap justify-between items-center">
                    <div>
                      <p className="font-bold text-lg">{appt.services.name}</p>
                      {/*Datos Cliente*/}
                      <p>Cliente: {appt.client.full_name}</p>
                      <p>Fecha: {new Date(appt.appointment_time).toLocaleString()}</p>
                      <p className="capitalize">Estado: <span className="font-semibold">{appt.status}</span></p>
                    </div>
                    <div className="flex gap-2 mt-4 sm:mt-0">
                        {/*Btn para pendientes */}
                        {appt.status === 'agendada' && (
                          <>
                            <button 
                              onClick={() => handleUpdateStatus(appt.id, 'confirmada')}
                              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                              Confirmar
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(appt.id, 'cancelada')}
                              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                              Cancelar
                            </button>
                          </>
                        )}
                        {/*btn  marcar como completada */}
                        {appt.status === 'confirmada' && isPastAppointment && (
                           <button 
                              onClick={() => handleUpdateStatus(appt.id, 'completada')}
                              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                              Marcar como Completada
                            </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p>No tienes ninguna cita agendada.</p>
            )}
          </div>
        )}
      </div>
    </PrivateRoute>
    );
}