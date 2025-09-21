'use client'

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import PrivateRoute from '@/components/PrivateRoute';
import Link from 'next/link';

export default function MyAppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (user) {
        setLoading(true);
        // Esta consulta es más avanzada: obtiene citas y la información relacionada
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

  // separamos las citas en próximas y pasadas
  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    const now = new Date();
    return appointments.reduce((acc, appt) => {
      if (new Date(appt.appointment_time) >= now) {
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
            {/* Sección de Próximas Citas */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">Próximas Citas</h2>
              {upcomingAppointments.length > 0 ? (
                <ul className="space-y-4">
                  {upcomingAppointments.map((appt) => (
                    <li key={appt.id} className="p-4 border rounded-lg">
                      <p className="font-bold text-lg">{appt.services.name}</p>
                      <p>Con: {appt.professional.full_name}</p>
                      <p>Fecha: {new Date(appt.appointment_time).toLocaleString()}</p>
                      <p className="capitalize">Estado: <span className="font-semibold">{appt.status}</span></p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No tienes ninguna cita próxima.</p>
              )}
            </div>

            {/* Sección de Citas Pasadas */}
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
    </PrivateRoute>
  );
}