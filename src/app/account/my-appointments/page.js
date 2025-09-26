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
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_time,
            status,
            services ( name ),
            professional:profiles!appointments_professional_id_fkey ( full_name, id ),
            reviews ( id )
          `)
          .eq('client_id', user.id)
          .order('appointment_time', { ascending: false });

        if (error) console.error('Error fetching appointments:', error);
        else setAppointments(data || []);
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
    const { data, error } = await supabase.from('appointments').update({ status: 'cancelada' }).eq('id', appointmentToCancel.id)
    .select('*, services(name), professional:profiles!...(full_name, id), reviews(id)').single();
    if (error) { toast.error('Hubo un error al cancelar la cita.'); console.error(error); } 
    else {
      setAppointments(prev => prev.map(appt => appt.id === appointmentToCancel.id ? data : appt));
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
        <h1 className="text-3xl font-bold mb-6">Mis Citas</h1>
        {loading ? (<p>Cargando tus citas...</p>) : (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">Próximas Citas</h2>
              {upcomingAppointments.length > 0 ? (
                <ul className="space-y-4">
                  {upcomingAppointments.map((appt) => {
                    const isCancellationDisabled = !canCancelAppointment(appt.appointment_time) || appt.status !== 'agendada';
                    return (
                      <li key={appt.id} className="p-4 border rounded-lg">
                         <div className="flex flex-wrap justify-between items-center">
                            <div>
                                <p className="font-bold text-lg">{appt.services.name}</p>
                                <p>Con: {appt.professional.full_name}</p>
                                <p>Fecha: {new Date(appt.appointment_time).toLocaleString()}</p>
                                <p className="capitalize">Estado: <span className="font-semibold">{appt.status}</span></p>
                            </div>
                            <button onClick={() => openCancelModal(appt)} disabled={isCancellationDisabled} 
                            className={`mt-4 sm:mt-0 font-bold py-2 px-4 rounded-lg transition-colors ${isCancellationDisabled ? 'bg-gray-400 cursor-not-allowed' : 
                            'bg-red-500 hover:bg-red-600 text-white'}`} title={isCancellationDisabled ? "Esta cita no se puede cancelar" : "Cancelar la cita"}>
                                Cancelar Cita
                            </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (<p>No tienes ninguna cita próxima.</p>)}
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">Historial de Citas</h2>
              {pastAppointments.length > 0 ? (
                <ul className="space-y-4">
                  {pastAppointments.map((appt) => (
                    <li key={appt.id} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-lg">{appt.services.name}</p>
                          <p>Con: {appt.professional.full_name}</p>
                          <p>Fecha: {new Date(appt.appointment_time).toLocaleString()}</p>
                          <p className="capitalize">Estado: <span className="font-semibold">{appt.status}</span></p>
                        </div>
                        {appt.status === 'completada' && (!appt.reviews || appt.reviews.length === 0) &&
                         (<button onClick={() => openReviewModal(appt)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-lg text-sm">Dejar Reseña</button>)}
                        {appt.status === 'completada' && (appt.reviews && appt.reviews.length > 0) &&
                          (<p className="text-sm text-green-600 font-semibold">¡Gracias por tu reseña!</p>)}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (<p>No tienes citas en tu historial.</p>)}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE CANCELACIÓN */}
      {isCancelModalOpen && (
        <Modal isOpen={isCancelModalOpen} closeModal={closeCancelModal} title="Confirmar Cancelación">
          <p className="text-sm text-gray-600">¿Estás seguro de que quieres cancelar tu cita para <span className="font-bold">{appointmentToCancel.services.name}</span>?</p>
          <div className="mt-6 flex justify-end gap-4">
            <button onClick={closeCancelModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none">
              No, volver
              </button>
            <button onClick={handleCancelAppointment} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none">
              Sí, cancelar
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL DE RESEÑA */}
      {isReviewModalOpen && (
        <Modal isOpen={isReviewModalOpen} closeModal={closeReviewModal} title={`Califica tu servicio de ${appointmentToReview.services.name}`}>
          <form onSubmit={handleReviewSubmit}>
            <div className="flex justify-center my-4">
              {[1, 2, 3, 4, 5].map((star) => (<button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none">
                <Star className={`h-8 w-8 ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`} fill={rating >= star ? 'currentColor' : 'none'} /></button>))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escribe un comentario (opcional)..." className="w-full h-24 p-2 border rounded-md" />
            <div className="mt-4 flex justify-end">
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">Enviar Reseña</button>
            </div>
          </form>
        </Modal>
      )}
    </PrivateRoute>
  );
}