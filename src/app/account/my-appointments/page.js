'use client'

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import PrivateRoute from '@/components/PrivateRoute';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';

export default function MyAppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (user) {
        setLoading(true);
        //obtiene citas y la info relacionada
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_time,
            status,
            services ( name ),
            professional:profiles!appointments_professional_id_fkey ( full_name )
          `)
          .eq('client_id', user.id)
          .order('appointment_time', { ascending: false });

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


  //func para calcular si una cita se puede cancelar 
  const canCancelAppointment = (appointmentTime) => {
    const now = new Date();
    const appointmentDate = new Date(appointmentTime);
    const hoursDifference = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursDifference > 8;
  };

  //cancelar cita
  const handleCancelAppointment = async () => {
    if (!appointmentToCancel) return;

    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'cancelada' })
      .eq('id', appointmentToCancel.id)
      .select('*, services(name), professional:profiles!appointments_professional_id_fkey(full_name)')
      .single();

    if (error) {
      console.error("Error al cancelar la cita:", error);
      toast.error('Hubo un error al cancelar la cita.');
    } else {
      setAppointments(prev => prev.map(appt => appt.id === appointmentToCancel.id ? data : appt));
      toast.success('Cita cancelada con éxito.');
    }
    closeCancelModal();
  };

  //funciones modal
  const openCancelModal = (appointment) => {
    setAppointmentToCancel(appointment);
    setIsCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setIsCancelModalOpen(false);
    setAppointmentToCancel(null);
  };
  
  // separamos las citas en prox y pasada
  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    const now = new Date();
    return appointments.reduce((acc, appt) => {
      if (new Date(appt.appointment_time) >= now && appt.status !== 'cancelada') {
        acc.upcomingAppointments.push(appt);
      } else {
        acc.pastAppointments.push(appt);
      }
      return acc;
    }, { upcomingAppointments: [], pastAppointments: [] });
  }, [appointments]);

  return (
    <PrivateRoute>
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-6">Mis Citas</h1>

        {loading ? (
          <p>Cargando tus citas...</p>
        ) : (
          <div className="space-y-8">
            {/*Seccion de prox citas*/}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">Próximas Citas</h2>
              {upcomingAppointments.length > 0 ? (
                <ul className="space-y-4">
                  {upcomingAppointments.map((appt) => {
                    const isCancellationDisabled = !canCancelAppointment(appt.appointment_time) || appt.status === 'cancelada';
                    return (
                    <li key={appt.id} className="p-4 border rounded-lg">
                      <p className="font-bold text-lg">{appt.services.name}</p>
                      <p>Con: {appt.professional.full_name}</p>
                      <p>Fecha: {new Date(appt.appointment_time).toLocaleString()}</p>
                      <p className="capitalize">Estado: <span className="font-semibold">{appt.status}</span></p>
                      <button onClick={() => openCancelModal(appt)}
                          disabled={isCancellationDisabled}
                      className={`mt-4 sm:mt-0 font-bold py-2 px-4 rounded-lg transition-colors ${
                            isCancellationDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'
                          }`}
                          title={isCancellationDisabled ? "Solo puedes cancelar con más de 8 horas de antelación" : "Cancelar la cita"}>
                          Cancelar Cita
                    </button>
                    </li>
                    )
                  })}
                </ul>
              ) : (
                <p>No tienes ninguna cita próxima.</p>
              )}
            </div>

            {/*Seccion de Citas antiguas */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">Historial de Citas</h2>
              {pastAppointments.length > 0 ? (
                <ul className="space-y-4">
                  {pastAppointments.map((appt) => (
                    <li key={appt.id} className="p-4 border rounded-lg bg-gray-50">
                      <p className="font-bold text-lg">{appt.services.name}</p>
                      <p>Con: {appt.professional.full_name}</p>
                      <p>Fecha: {new Date(appt.appointment_time).toLocaleString()}</p>
                      <p className="capitalize">Estado: <span className="font-semibold">{appt.status}</span></p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No tienes citas en tu historial.</p>
              )}
            </div>
          </div>
        )}
      </div>
      {appointmentToCancel && (
        <Modal isOpen={isCancelModalOpen} closeModal={closeCancelModal} title="Confirmar Cancelación">
          <p className="text-sm text-gray-600">
            ¿Estás seguro de que quieres cancelar tu cita para 
            <span className="font-bold"> {appointmentToCancel.services.name}</span> el 
            <span className="font-bold"> {new Date(appointmentToCancel.appointment_time).toLocaleString('es-ES')}</span>?
          </p>
          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={closeCancelModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none">
              No, volver
            </button>
            <button
              onClick={handleCancelAppointment}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none">
              Sí, cancelar
            </button>
          </div>
        </Modal>
      )}
    </PrivateRoute>
  );
}
