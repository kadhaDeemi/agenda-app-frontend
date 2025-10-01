'use client'

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import PrivateRoute from '@/components/PrivateRoute';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import { Star } from 'lucide-react';

export default function MyAppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // estados cancelar
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);

  // Estados reseña
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [appointmentToReview, setAppointmentToReview] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const fetchAppointments = async () => {
      if (user) {
        setLoading(true);
        //llamamos a nuestra nueva funcion RPC 
        const { data, error } = await supabase
          .rpc('get_client_appointments', {
            p_client_id: user.id
          });

        if (error) {
          console.error('Error fetching appointments:', error);
          toast.error('No se pudieron cargar tus citas.');
        } else {
          const validAppointments = data ? data.filter(appt => appt.services && appt.services.id) : [];
          setAppointments(validAppointments);
        }
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user]);

  //cancelar citas
  const canCancelAppointment = (appointmentTime) => new Date(appointmentTime).getTime() - new Date().getTime() > 8 * 60 * 60 * 1000;
  const openCancelModal = (appointment) => { setAppointmentToCancel(appointment); setIsCancelModalOpen(true); };
  const closeCancelModal = () => { setIsCancelModalOpen(false); setAppointmentToCancel(null); };

  const handleCancelAppointment = async () => {
    if (!appointmentToCancel) return;
   const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelada' })
      .eq('id', appointmentToCancel.id);

    if (error) {
      toast.error('Hubo un error al cancelar la cita.');
      console.error(error);
    } else {
      setAppointments(prev =>
        prev.map(appt =>
          appt.id === appointmentToCancel.id
            ? { ...appt, status: 'cancelada' }
            : appt
        )
      );
      toast.success('Cita cancelada con éxito.');
    }
    closeCancelModal();
  };

  // reseñas
  const openReviewModal = (appointment) => { setAppointmentToReview(appointment); setIsReviewModalOpen(true); };
  const closeReviewModal = () => { setIsReviewModalOpen(false); setAppointmentToReview(null); setRating(0); setComment(''); };
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { toast.error('Por favor, selecciona una calificación.'); return; }
    const { data, error } = await supabase.from('reviews').insert({ appointment_id: appointmentToReview.id, client_id: user.id, professional_id: appointmentToReview.professional.id, rating, comment })
    .select()
    .single();
    if (error) { toast.error('Error al enviar la reseña: ' + error.message); } 
    else {
      setAppointments(prev => prev.map(appt => appt.id === appointmentToReview.id ? { ...appt, reviews: [data] } : appt));
      toast.success('¡Gracias por tu reseña!');
      closeReviewModal();
    }
  };

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
        <h1 className="text-3xl font-bold mb-8">Mis Citas</h1>
        
        {loading ? (
          <p>Cargando tus citas...</p>
        ) : appointments.length === 0 ? (
          <div className="text-center bg-white p-8 rounded-lg shadow-md">
            <p className="text-gray-600">Aún no tienes ninguna cita agendada.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/*SECCION PROX CITAS */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Próximas Citas</h2>
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-6">
                  {upcomingAppointments.map((appt) => (
                    <div key={appt.id} className="bg-white p-6 rounded-lg shadow-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold">{appt.services.name}</h3>
                          <p className="text-gray-600">con <strong>{appt.professional.full_name}</strong></p>
                          <p className="font-semibold mt-2">{new Date(appt.appointment_time).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}</p>
                        </div>
                        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">{appt.status}</span>
                      </div>
                      <div className="border-t mt-4 pt-4">
                        <h4 className="font-semibold text-gray-700">Información de Contacto</h4>
                        {appt.professional.local ? (
                          <>
                            <p className="text-sm text-gray-600"><strong>Lugar:</strong> {appt.professional.local.name}</p>
                            <p className="text-sm text-gray-600"><strong>Dirección:</strong> {appt.professional.local.address || 'No especificada'}</p>
                            <p className="text-sm text-gray-600"><strong>Teléfono del Local:</strong> {appt.professional.local.phone || 'No especificado'}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-600"><strong>Dirección:</strong> {appt.professional.address || 'No especificada'}</p>
                            <p className="text-sm text-gray-600"><strong>Email:</strong> {appt.professional.email}</p>
                            <p className="text-sm text-gray-600"><strong>Teléfono del Profesional:</strong> {appt.professional.phone || 'No especificado'}</p>
                          </>
                        )}
                      </div>
                      <div className="mt-4 text-right">
                        <button onClick={() => openCancelModal(appt)} disabled={!canCancelAppointment(appt.appointment_time)} 
                        className="text-red-500 hover:text-red-700 font-semibold text-sm disabled:text-gray-400 disabled:cursor-not-allowed"
                        title={!canCancelAppointment(appt.appointment_time) ? "Solo puedes cancelar con más de 8 horas de antelación" : "Cancelar Cita"}>
                          Cancelar Cita
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-500">No tienes próximas citas.</p>}
            </div>

            {/*SECCIoN DE HISTORIAL DE CITAS*/}
            <div>
              <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Historial de Citas</h2>
              {pastAppointments.length > 0 ? (
                <div className="space-y-6">
                  {pastAppointments.map((appt) => (
                    <div key={appt.id} className="bg-white p-6 rounded-lg shadow-md opacity-80">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-gray-700">{appt.services.name}</h3>
                          <p className="text-gray-600">con <strong>{appt.professional.full_name}</strong></p>
                          <p className="font-semibold text-gray-500 mt-2">{new Date(appt.appointment_time).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}</p>
                        </div>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${appt.status === 'completada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                        </span>
                      </div>
                      {appt.status === 'completada' && (
                        <div className="mt-4 text-right">
                          {appt.reviews && appt.reviews.length > 0 ? (
                             <p className="text-sm font-semibold text-green-600">¡Gracias por tu reseña!</p>
                          ) : (
                            <button onClick={() => openReviewModal(appt)} className="text-blue-500 hover:text-blue-700 font-semibold text-sm">
                              Dejar Reseña
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-500">Aún no tienes citas pasadas.</p>}
            </div>
          </div>
        )}
      </div>

      {/*MODALES */}
      {isCancelModalOpen && (
        <Modal isOpen={isCancelModalOpen} closeModal={closeCancelModal} title="Confirmar Cancelación">
          <p>¿Estás seguro de que quieres cancelar tu cita para <strong>{appointmentToCancel.services.name}</strong>?</p>
          <div className="mt-6 flex justify-end gap-4">
            <button onClick={closeCancelModal} className="px-4 py-2 rounded-md bg-gray-200">No, volver</button>
            <button onClick={handleCancelAppointment} className="px-4 py-2 rounded-md bg-red-500 text-white">Sí, cancelar</button>
          </div>
        </Modal>
      )}

      {isReviewModalOpen && (
        <Modal isOpen={isReviewModalOpen} closeModal={closeReviewModal} title={`Califica: ${appointmentToReview.services.name}`}>
          <form onSubmit={handleReviewSubmit}>
            <div className="flex justify-center my-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none">
                  <Star className={`h-8 w-8 cursor-pointer ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" />
                </button>
              ))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escribe un comentario (opcional)..." className="w-full h-24 p-2 border rounded-md" />
            <div className="mt-4 flex justify-end">
              <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white">Enviar Reseña</button>
            </div>
          </form>
        </Modal>
      )}
    </PrivateRoute>
  );
}