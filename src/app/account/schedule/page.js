'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import PrivateRoute from '@/components/PrivateRoute';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';

const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const generateTimeSlots = () => {
  const slots = [];
  for (let i = 8; i < 22; i++) {
    slots.push(`${i < 10 ? '0' : ''}${i}:00`);
    slots.push(`${i < 10 ? '0' : ''}${i}:30`);
  }
  return slots;
};
const baseTimeSlots = generateTimeSlots()

export default function ManageSchedulePage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  //states para el formulario de nuevo horario 
  const [day, setDay] = useState(1); // 1: lunes
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  const [schedulesForSelectedDay, setSchedulesForSelectedDay] = useState([]);


  //estados para el calendario de dias libres
  const [overrideDate, setOverrideDate] = useState(new Date());

  const fetchSchedulesAndOverrides = useCallback(async () => {
    if (user) {
      setLoading(true);
      const { data: schedulesData, error: schedulesError } = await supabase.from('work_schedules').select('*').eq('professional_id', user.id).order('day_of_week');
      const { data: overridesData, error: overridesError } = await supabase.from('schedule_overrides').select('*').eq('professional_id', user.id).order('override_date');
      
      if (schedulesError || overridesError) {
        console.error(schedulesError || overridesError);
      } else {
        setSchedules(schedulesData || []);
        setOverrides(overridesData || []);
      }
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSchedulesAndOverrides();
  }, [fetchSchedulesAndOverrides]);

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!user || !startTime || !endTime) return;

    if (startTime >= endTime) {
      toast.error('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }

    const { data: overlappingSchedules, error: overlapError } = await supabase
      .from('work_schedules')
      .select('id')
      .eq('professional_id', user.id)
      .eq('day_of_week', day)
      .lt('start_time', endTime)   // El horario existente empieza ANTES de que el nuevo termine
      .gt('end_time', startTime);  // Y el horario existente termina DESPUES de que el nuevo empiece

    if (overlapError) {
      toast.error('Error al verificar horarios existentes: ' + overlapError.message);
      return;
    }

    if (overlappingSchedules && overlappingSchedules.length > 0) {
      toast.error('Error: El horario que intentas añadir se solapa con uno ya existente.');
      return;
    }

    const { data, error } = await supabase.from('work_schedules').insert({
      professional_id: user.id,
      day_of_week: day,
      start_time: startTime,
      end_time: endTime,
    }).select();

    if (error) {
      toast.error('Error al añadir el horario: ' + error.message);
    } else {
      setSchedules([...schedules, ...data].sort((a, b) => a.day_of_week - b.day_of_week));
      toast.success('Horario añadido con éxito.');
    }
  };

  const handleAddOverride = async () => {
    if (!overrideDate) {
      toast('Por favor, selecciona una fecha.');
      return;
    }

    const { data, error } = await supabase.from('schedule_overrides').insert({
      professional_id: user.id,
      override_date: overrideDate.toISOString().split('T')[0],
      start_time: null,
      end_time: null,
    }).select();

    if (error) {
      toast.error('Error al añadir el día libre: ' + error.message);
    } else {
      setOverrides([...overrides, ...data].sort((a,b) => new Date(a.override_date) - new Date(b.override_date)));
      toast.success('Día libre añadido con éxito.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    const { type, id } = itemToDelete;
    const table = type === 'schedule' ? 'work_schedules' : 'schedule_overrides';
    const successMessage = type === 'schedule' ? 'Horario eliminado.' : 'Día libre eliminado.';
    const errorMessage = type === 'schedule' ? 'Error al eliminar el horario.' : 'Error al eliminar el día libre.';
    
    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
      toast.error(errorMessage + ': ' + error.message);
    } else {
      if (type === 'schedule') {
        setSchedules(prev => prev.filter(s => s.id !== id));
      } else {
        setOverrides(prev => prev.filter(o => o.id !== id));
      }
      toast.success(successMessage);
    }
    closeDeleteModal();
  };
  
  //funciones modal
  const openDeleteModal = (id, type, description) => {
    setItemToDelete({ id, type, description });
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };


  useEffect(() => {
    const filtered = schedules.filter(s => s.day_of_week === day);
    setSchedulesForSelectedDay(filtered);
  }, [day, schedules]);


  //filtrado por horas
  const availableStartTimeSlots = useMemo(() => {
    return baseTimeSlots.filter(slot => {
      // Slot de inicio debe ser fuera del horario existente
      return !schedulesForSelectedDay.some(schedule => 
        slot >= schedule.start_time && slot < schedule.end_time
      );
    });
  }, [schedulesForSelectedDay]);

  const availableEndTimeSlots = useMemo(() => {
    //busca el prox horario dps de la hora de inicio selec
    const nextSchedule = schedulesForSelectedDay
      .filter(schedule => schedule.start_time > startTime)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
    
    // El limite superior es el inicio del proximo horario, o el final del dia
    const upperLimit = nextSchedule ? nextSchedule.start_time : '24:00';

    return baseTimeSlots.filter(slot => slot > startTime && slot <= upperLimit);
  }, [startTime, schedulesForSelectedDay]);


  useEffect(() => {
    if (startTime >= endTime || !availableEndTimeSlots.find(slot => slot === endTime)) {
      setEndTime(availableEndTimeSlots[0] || '');
    }
  }, [startTime, endTime, availableEndTimeSlots]);

  return (
    <PrivateRoute requiredRole="profesional">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-6">Gestionar mi Horario</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna Izq: Horario */}
          <div>
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h2 className="text-2xl font-bold mb-4">Añadir Horario Semanal</h2>
              <form onSubmit={handleAddSchedule} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label htmlFor="day_of_week" className="block text-sm font-medium text-gray-700">Día</label>
                  <select id="day_of_week" value={day} onChange={(e) => setDay(parseInt(e.target.value))} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm">
                    {daysOfWeek.map((dayName, index) => ( <option key={index} value={index}>{dayName}</option> ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">Hora de Inicio</label>
                  <select id="start_time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm" >
                    {availableStartTimeSlots.map(time => <option key={time} value={time}>{time}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">Hora de Fin</label>
                  <select id="end_time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm" >
                    {availableEndTimeSlots.map(time => <option key={time} value={time}>{time}</option>)}
                  </select>
                </div>
                <button type="submit" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Añadir Horario</button>
              </form>
              {schedulesForSelectedDay.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400">
                  <p className="font-semibold text-blue-800">Horarios ya definidos para este día:</p>
                  <ul className="list-disc list-inside text-blue-700">
                    {schedulesForSelectedDay.map(s => (
                      <li key={s.id}>{`de ${s.start_time.substring(0, 5)} a ${s.end_time.substring(0, 5)}`}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">Mi Horario Actual</h2>
              {loading ? <p>Cargando...</p> : (
                <div className="space-y-2">
                  {schedules.length > 0 ? schedules.map(s => (
                    <div key={s.id} className="p-3 bg-gray-50 rounded-md flex justify-between items-center">
                      <div>
                        <span className="font-bold">{daysOfWeek[s.day_of_week]}: </span>
                        <span>de {s.start_time.substring(0, 5)} a {s.end_time.substring(0, 5)}</span>
                      </div>
                      <button onClick={() => openDeleteModal(s.id, 'schedule', `${daysOfWeek[s.day_of_week]} de ${s.start_time.substring(0, 5)} a ${s.end_time.substring(0, 5)}`)} className="text-red-500 hover:text-red-700 font-semibold">Eliminar</button>
                    </div>
                  )) : <p>No has definido ningún horario semanal.</p>}
                </div>
              )}
            </div>
          </div>

          {/* Column Derec: Dias Libres y Excep */}
          <div>
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h2 className="text-2xl font-bold mb-4">Añadir Día Libre</h2>
              <p className="text-sm text-gray-600 mb-4">Selecciona una fecha en el calendario y márcala como no laborable.</p>
              <div className="flex flex-col items-center">
                <DayPicker mode="single" selected={overrideDate} onSelect={setOverrideDate} disabled={{ before: new Date() }} />
                <button onClick={handleAddOverride} className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg">Marcar como Día Libre</button>
              </div>
            </div>
             <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">Mis Días Libres</h2>
              {loading ? <p>Cargando...</p> : (
                <div className="space-y-2">
                  {overrides.length > 0 ? overrides.map(o => (
                    <div key={o.id} className="p-3 bg-gray-50 rounded-md flex justify-between items-center">
                      <span>{new Date(o.override_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })} - No Laborable</span>
                      <button onClick={() => openDeleteModal(o.id, 'override', new Date(o.override_date).toLocaleDateString('es-ES', {dateStyle: 'full', timeZone: 'UTC'}))} className="text-red-500 hover:text-red-700 font-semibold">Eliminar</button>
                    </div>
                  )) : <p>No tienes días libres definidos.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {itemToDelete && (
        <Modal isOpen={isDeleteModalOpen} closeModal={closeDeleteModal} title="Confirmar Eliminación">
          <p className="text-sm text-gray-600">
            ¿Estás seguro de que quieres eliminar 
            <span className="font-bold"> {itemToDelete.description}</span>? Esta acción no se puede deshacer.
          </p>
          <div className="mt-6 flex justify-end gap-4">
            <button onClick={closeDeleteModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200">
              No, volver
            </button>
            <button onClick={handleConfirmDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700">
              Sí, eliminar
            </button>
          </div>
        </Modal>
      )}
    </PrivateRoute>
  );
}
