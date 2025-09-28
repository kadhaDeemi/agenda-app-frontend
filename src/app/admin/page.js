'use client'

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import PrivateRoute from '@/components/PrivateRoute';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import { Edit, Trash2, UserPlus, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const baseTimeSlots = Array.from({ length: 28 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`);


export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [local, setLocal] = useState(null);
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para la gestión de horarios del profesional SELECCIONADO
  const [professionalSchedules, setProfessionalSchedules] = useState([]);
  const [professionalOverrides, setProfessionalOverrides] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ day: 1, startTime: '09:00', endTime: '17:00' });
  const [overrideDate, setOverrideDate] = useState(new Date());

  // Estados para el formulario de añadir profesional
  const [professionalEmail, setProfessionalEmail] = useState('');
  const [isAddingProfessional, setIsAddingProfessional] = useState(false);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('');

  // Estados para el formulario de creación
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(''); 
  const [selectedService, setSelectedService] = useState(null);

  const [isProfModalOpen, setIsProfModalOpen] = useState(false);
  const [professionalToDelete, setProfessionalToDelete] = useState(null);

  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [overrideToDelete, setOverrideToDelete] = useState(null);
  

  useEffect(() => {
    const fetchAdminData = async () => {
      if (user) {
        setLoading(true);
        const { data: localData, error: localError } = await supabase
          .from('locales')
          .select('*')
          .eq('owner_id', user.id)
          .single();
        
        if (localData) {
          setLocal(localData);
          const [ { data: servicesData }, { data: professionalsData } ] = await Promise.all([
            supabase.from('services').select('*').eq('local_id', localData.id).order('name'),
            supabase.from('profiles').select('*').eq('local_id', localData.id).eq('role', 'profesional')
          ]);
          setServices(servicesData || []);
          setProfessionals(professionalsData || []);
        }
        setLoading(false);
      }
    };
    fetchAdminData();
  }, [user]);

  //horarios del profesional seleccionado
  useEffect(() => {
    const fetchScheduleData = async () => {
      if (!selectedProfessionalId) {
        setProfessionalSchedules([]);
        setProfessionalOverrides([]);
        return;
      }
      setScheduleLoading(true);
      const [ { data: schedulesData }, { data: overridesData } ] = await Promise.all([
        supabase.from('work_schedules').select('*').eq('professional_id', selectedProfessionalId),
        supabase.from('schedule_overrides').select('*').eq('professional_id', selectedProfessionalId)
      ]);
      setProfessionalSchedules(schedulesData || []);
      setProfessionalOverrides(overridesData || []);
      setScheduleLoading(false);
    };
    fetchScheduleData();
  }, [selectedProfessionalId]);

  //GESTIONAR HORARIOS
  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (scheduleForm.startTime >= scheduleForm.endTime) {
      toast.error('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }

    //busca en la bbdd si hay horarios q choqen
    const { data: overlappingSchedules, error: overlapError } = await supabase
      .from('work_schedules')
      .select('id')
      .eq('professional_id', selectedProfessionalId)
      .eq('day_of_week', scheduleForm.day)
      .lt('start_time', scheduleForm.endTime)  // Un horario existente empieza ANTES de que el nuevo termine
      .gt('end_time', scheduleForm.startTime); // Y un horario existente termina DESPUÉS de que el nuevo empiece

    if (overlapError) {
      toast.error('Error al verificar horarios: ' + overlapError.message);
      return;
    }

    if (overlappingSchedules && overlappingSchedules.length > 0) {
      toast.error('El horario que intentas añadir se solapa con uno ya existente.');
      return;
    }
    const { data, error } = await supabase.from('work_schedules').insert({
      professional_id: selectedProfessionalId,
      day_of_week: scheduleForm.day,
      start_time: scheduleForm.startTime,
      end_time: scheduleForm.endTime,
    }).select().single();

    if (error) { 
      toast.error('Error al añadir el horario: ' + error.message); 
    } else {
      setProfessionalSchedules(prev => [...prev, data].sort((a,b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)));
      toast.success('Horario añadido.');
    }
  };


  const handleDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    const { error } = await supabase.from('work_schedules').delete().eq('id', scheduleToDelete.id);
    if (error) { toast.error('Error al eliminar horario.'); }
    else {
      setProfessionalSchedules(prev => prev.filter(s => s.id !== scheduleToDelete.id));
      toast.success('Horario eliminado.');
    }
    closeDeleteScheduleModal();
  };

  const handleAddOverride = async () => {
    const { data, error } = await supabase.from('schedule_overrides').insert({
      professional_id: selectedProfessionalId,
      override_date: overrideDate.toISOString().split('T')[0],
    }).select().single();
    if (error) { toast.error('Error al añadir día libre.'); }
    else {
      setProfessionalOverrides(prev => [...prev, data].sort((a,b) => new Date(a.override_date) - new Date(b.override_date)));
      toast.success('Día libre añadido.');
    }
  };

  const handleDeleteOverride = async () => {
    if (!overrideToDelete) return;
    const { error } = await supabase.from('schedule_overrides').delete().eq('id', overrideToDelete.id);
    if (error) { toast.error('Error al eliminar día libre.'); }
    else {
      setProfessionalOverrides(prev => prev.filter(o => o.id !== overrideToDelete.id));
      toast.success('Día libre eliminado.');
    }
    closeDeleteOverrideModal();
  };

  //agregar profesional
  const handleAddProfessional = async (e) => {
  e.preventDefault();
  setIsAddingProfessional(true);

  console.log('Buscando el correo:', professionalEmail);
  const { data: foundProfiles, error: findError } = await supabase
    .rpc('get_profile_by_email', {
      p_email: professionalEmail
    });

  if (findError || !foundProfiles || foundProfiles.length === 0) {
    toast.error('No se encontró un usuario con ese correo.');
    setIsAddingProfessional(false);
    return;
  }

  const profileToUpdate = foundProfiles[0];

  if (profileToUpdate.role !== 'profesional') {
    toast.error('El usuario encontrado no tiene el rol de "profesional".');
    setIsAddingProfessional(false);
    return;
  }

  if (profileToUpdate.local_id) {
    toast.error('Este profesional ya está asignado a un local.');
    setIsAddingProfessional(false);
    return;
  }

  //Si esta libre se asigna
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update({ local_id: local.id })
    .eq('id', profileToUpdate.id)
    .select()
    .single();

  if (updateError) {
    toast.error('Error al asignar el profesional: ' + updateError.message);
  } else {
    setProfessionals([...professionals, updatedProfile]);
    toast.success(`${updatedProfile.full_name} ha sido añadido al equipo.`);
    setProfessionalEmail('');
  }
  setIsAddingProfessional(false);
};

  const handleRemoveProfessional = async () => {
    if (!professionalToDelete) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ local_id: null })
      .eq('id', professionalToDelete.id);

    if (error) {
      toast.error('Error al remover al profesional: ' + error.message);
    } else {
      setProfessionals(professionals.filter(p => p.id !== professionalToDelete.id));
      toast.success('Profesional removido del equipo.');
    }
    closeProfModal();
  };

  //modal de profesionales
  const openProfModal = (professional) => {
    setProfessionalToDelete(professional);
    setIsProfModalOpen(true);
  };
  const closeProfModal = () => {
    setIsProfModalOpen(false);
    setProfessionalToDelete(null);
  };


  //CRUD Servicios
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { data, error } = await supabase.from('services').insert({
      local_id: local.id, name, description,
      duration: parseInt(duration), price: parseFloat(price)
    }).select().single();

    if (error) {
      toast.error('Error al crear el servicio: ' + error.message);
    } else {
      setServices([...services, data]);
      toast.success('Servicio añadido con éxito.');
      setName(''); setDescription(''); setDuration(''); setPrice('');
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedService) return;
    const { error } = await supabase.from('services').delete().eq('id', selectedService.id);
    if (error) { toast.error('Error al eliminar: ' + error.message); }
    else {
      setServices(services.filter(s => s.id !== selectedService.id));
      toast.success('Servicio eliminado.');
    }
    closeModal();
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { data, error } = await supabase.from('services').update({
      name: selectedService.name,
      description: selectedService.description,
      duration: parseInt(selectedService.duration),
      price: parseFloat(selectedService.price)
    }).eq('id', selectedService.id).select().single();

    if (error) { toast.error('Error al actualizar: ' + error.message); }
    else {
      setServices(services.map(s => s.id === selectedService.id ? data : s));
      toast.success('Servicio actualizado.');
    }
    setIsSubmitting(false);
    closeModal();
  };


  //funcion para calcular horas del horario dispo dinamico
  const availableStartTimeSlots = useMemo(() => {
    const schedulesForDay = professionalSchedules.filter(s => s.day_of_week === scheduleForm.day);
    return baseTimeSlots.filter(slot => !schedulesForDay.some(schedule => slot >= schedule.start_time && slot < schedule.end_time));
  }, [scheduleForm.day, professionalSchedules]);

  const availableEndTimeSlots = useMemo(() => {
    const schedulesForDay = professionalSchedules.filter(s => s.day_of_week === scheduleForm.day);
    const nextSchedule = schedulesForDay.filter(schedule => schedule.start_time > scheduleForm.startTime).sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
    const upperLimit = nextSchedule ? nextSchedule.start_time : '22:00';
    return availableStartTimeSlots.filter(slot => slot > scheduleForm.startTime && slot <= upperLimit);
  }, [scheduleForm.day, scheduleForm.startTime, professionalSchedules, availableStartTimeSlots]);

  useEffect(() => {
    if (scheduleForm.startTime >= scheduleForm.endTime || !availableEndTimeSlots.includes(scheduleForm.endTime)) {
      setScheduleForm(prev => ({ ...prev, endTime: availableEndTimeSlots[0] || '' }));
    }
  }, [scheduleForm.startTime, scheduleForm.endTime, availableEndTimeSlots]);


  //Modal
  const openModal = (mode, service) => { setModalMode(mode); setSelectedService({ ...service }); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setModalMode(''); setSelectedService(null); };
  const handleModalFormChange = (e) => { setSelectedService(prev => ({ ...prev, [e.target.name]: e.target.value })); };

  const openDeleteScheduleModal = (schedule) => setScheduleToDelete(schedule);
  const closeDeleteScheduleModal = () => setScheduleToDelete(null);
  const openDeleteOverrideModal = (override) => setOverrideToDelete(override);
  const closeDeleteOverrideModal = () => setOverrideToDelete(null);

return (
    <PrivateRoute requiredRole="administrador">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>
        {loading ? (<p>Cargando panel...</p>) : !local ? (<p>No se encontró un local asignado a tu cuenta.</p>) : (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">Añadir Servicio a {local.name}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Nombre del Servicio" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required/>
                  <input type="number" placeholder="Duración (minutos)" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required/>
                  <input type="number" step="0.01" placeholder="Precio" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required/>
                  <textarea placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg md:col-span-2" rows="3"/>
                </div>
                <button type="submit" disabled={isSubmitting} className="mt-4 w-full md:w-auto bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-green-300">
                  {isSubmitting ? 'Guardando...' : 'Guardar Servicio'}
                </button>
              </form>
            </div>
            {/* NUEVA SECCIÓN: Gestionar Equipo */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">Gestionar Equipo de {local.name}</h2>
              
              {/* Formulario para añadir profesionales */}
              <form onSubmit={handleAddProfessional} className="flex gap-2 mb-6 pb-6 border-b">
                <input type="email" value={professionalEmail} onChange={(e) => setProfessionalEmail(e.target.value)} placeholder="Email del profesional a añadir" 
                className="flex-grow px-3 py-2 border rounded-lg" required />
                <button type="submit" disabled={isAddingProfessional} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 flex items-center">
                  <UserPlus size={18} className="mr-2" /> {isAddingProfessional ? 'Añadiendo...' : 'Añadir'}
                </button>
              </form>

              {/* Lista de profesionales en el local */}
              <h3 className="font-semibold text-lg mb-2">Miembros Actuales</h3>
              <div className="space-y-2">
                {professionals.length > 0 ? professionals.map(prof => (
                  <div key={prof.id} className="p-3 bg-gray-50 rounded-md flex justify-between items-center">
                    <span>{prof.full_name}</span>
                    <button onClick={() => openProfModal(prof)} className="p-1 text-red-500 hover:bg-red-100 rounded-full">
                      <X size={16} />
                    </button>
                  </div>
                )) : <p className="text-sm text-gray-500">Aún no has añadido profesionales a tu equipo.</p>}
              </div>
            </div>
            
            {/*Horarios gestion*/ }
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">Gestionar Horarios del Equipo</h2>
              <div className="max-w-md">
                <label htmlFor="professional-select" className="block text-sm font-medium text-gray-700">Selecciona un profesional</label>
                <select id="professional-select" value={selectedProfessionalId} onChange={(e) => setSelectedProfessionalId(e.target.value)} 
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="">-- Elige un profesional --</option>
                  {professionals.map(prof => (
                    <option key={prof.id} value={prof.id}>{prof.full_name}</option>
                  ))}
                </select>
              </div>

              {/*Gestor de horario*/}
              {selectedProfessionalId && (
                scheduleLoading ? <p>Cargando horarios...</p> : (
                <div className="border-t pt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Horario Semanal</h3>
                    <form onSubmit={handleAddSchedule} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end bg-gray-50 p-4 rounded-md mb-4">
                      <div>
                        <label className="text-xs">Día</label>
                        <select value={scheduleForm.day} onChange={(e) => setScheduleForm({...scheduleForm, startTime: e.target.value})} className="mt-1 block w-full p-2 border rounded-md text-sm">
                          {daysOfWeek.map((dayName, index) => (index > 0 && index < 7 && <option key={index} value={index}>{dayName}</option> ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs">Inicio</label>
                        <select value={scheduleForm.startTime} onChange={(e) => setScheduleForm({...scheduleForm, startTime: e.target.value})} className="mt-1 block w-full p-2 border rounded-md text-sm">
                          {availableStartTimeSlots.map(time => <option key={time} value={time}>{time}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs">Fin</label>
                        <select value={scheduleForm.endTime} onChange={(e) => setScheduleForm({...scheduleForm, endTime: e.target.value})} className="mt-1 block w-full p-2 border rounded-md text-sm">
                          {availableEndTimeSlots.map(time => <option key={time} value={time}>{time}</option>)}
                        </select>
                      </div>
                      <button type="submit" className="bg-green-500 text-white font-bold py-2 px-3 rounded-lg text-sm">Añadir</button>
                    </form>
                    <div className="space-y-2">
                      {professionalSchedules.map(s => (
                        <div key={s.id} className="p-2 bg-gray-100 rounded flex justify-between items-center text-sm">
                          <span><strong>{daysOfWeek[s.day_of_week]}:</strong> {s.start_time.substring(0,5)} - {s.end_time.substring(0,5)}</span>
                          <button onClick={() => openDeleteScheduleModal(s)} className="p-1 hover:bg-red-100 rounded-full"><X size={16} className="text-red-500"/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Días Libres</h3>
                    <div className="flex flex-col items-center bg-gray-50 p-4 rounded-md mb-4">
                      <DayPicker mode="single" selected={overrideDate} onSelect={setOverrideDate} disabled={{ before: new Date() }} />
                      <button type="button" onClick={handleAddOverride} className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg">Añadir Día Libre</button>
                    </div>
                    <div className="space-y-2">
                      {professionalOverrides.map(o => (
                         <div key={o.id} className="p-2 bg-gray-100 rounded flex justify-between items-center text-sm">
                           <span>{new Date(o.override_date).toLocaleDateString('es-ES', {dateStyle: 'long', timeZone: 'UTC'})}</span>
                          <button onClick={() => openDeleteOverrideModal(o)} className="p-1 hover:bg-red-100 rounded-full"><X size={16} className="text-red-500"/></button>
                         </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} closeModal={closeModal} title={modalMode === 'edit' ? 'Editar Servicio' : 'Confirmar Eliminación'}>
          {modalMode === 'edit' && selectedService ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <input type="text" name="name" value={selectedService.name} onChange={handleModalFormChange} className="w-full p-2 border rounded" />
              <textarea name="description" value={selectedService.description || ''} onChange={handleModalFormChange} className="w-full p-2 border rounded" />
              <div className="flex gap-4"><input type="number" name="duration" value={selectedService.duration} onChange={handleModalFormChange} className="w-full p-2 border rounded" placeholder="Duración (min)" />
              <input type="number" step="0.01" name="price" value={selectedService.price} onChange={handleModalFormChange} className="w-full p-2 border rounded" placeholder="Precio" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-md bg-gray-200">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md bg-green-500 text-white">{isSubmitting ? 'Guardando...' : 'Guardar'}</button>
                </div>
            </form>
          ) : modalMode === 'delete' && selectedService ? (
            <div>
              <p>¿Seguro que quieres eliminar el servicio <strong>{selectedService.name}</strong>?</p>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={closeModal} className="px-4 py-2 rounded-md bg-gray-200">No, volver</button>
                <button onClick={handleDelete} className="px-4 py-2 rounded-md bg-red-500 text-white">Sí, eliminar</button>
                </div>
            </div>
          ) : null}
        </Modal>
      )}
      {isProfModalOpen && (
        <Modal isOpen={isProfModalOpen} closeModal={closeProfModal} title="Confirmar Eliminación">
          <div>
            <p>¿Seguro que quieres remover a <strong>{professionalToDelete.full_name}</strong> de tu local? El profesional no será eliminado de la plataforma, solo desvinculado de tu equipo.</p>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={closeProfModal} className="px-4 py-2 rounded-md bg-gray-200">No, volver</button>
              <button onClick={handleRemoveProfessional} className="px-4 py-2 rounded-md bg-red-500 text-white">Sí, remover</button>
            </div>
          </div>
        </Modal>
      )}
      {/* MODAL PARA ELIMINAR HORARIO */}
      {scheduleToDelete && (
        <Modal isOpen={!!scheduleToDelete} closeModal={closeDeleteScheduleModal} title="Confirmar Eliminación">
          <div>
            <p>¿Seguro que quieres eliminar el horario de <strong>{daysOfWeek[scheduleToDelete.day_of_week]} de {scheduleToDelete.start_time.substring(0,5)} a {scheduleToDelete.end_time.substring(0,5)}</strong>?</p>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={closeDeleteScheduleModal} className="px-4 py-2 rounded-md bg-gray-200">No, volver</button>
              <button onClick={handleDeleteSchedule} className="px-4 py-2 rounded-md bg-red-500 text-white">Sí, eliminar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL PARA ELIMINAR DÍA LIBRE */}
      {overrideToDelete && (
        <Modal isOpen={!!overrideToDelete} closeModal={closeDeleteOverrideModal} title="Confirmar Eliminación">
          <div>
            <p>¿Seguro que quieres eliminar el día libre del <strong>{new Date(overrideToDelete.override_date).toLocaleDateString('es-ES', {dateStyle: 'long', timeZone: 'UTC'})}</strong>?</p>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={closeDeleteOverrideModal} className="px-4 py-2 rounded-md bg-gray-200">No, volver</button>
              <button onClick={handleDeleteOverride} className="px-4 py-2 rounded-md bg-red-500 text-white">Sí, eliminar</button>
            </div>
          </div>
        </Modal>
      )}
    </PrivateRoute>
  );
}