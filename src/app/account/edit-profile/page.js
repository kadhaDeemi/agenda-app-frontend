'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import PrivateRoute from '@/components/PrivateRoute';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function EditProfilePage() {
  const { user, profile, loading: authLoading } = useAuth();

  // Estados para los archivos
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  //estados para los datos personales
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAddress(profile.address || '');
      setPhone(profile.phone || '');
      setSpecialty(profile.specialty || '');
    }
  }, [profile]);


  //Funcion para manejar la seleccion de un archivo
   const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };


  //sube la imagen y actualizar el perfil
  const handleUpload = async () => {
    if (!avatarFile) {
      toast.error('Por favor, selecciona una imagen primero.');
      return;
    }

    setIsUploading(true);

    try {
      //sube el archivo a Supabase Storage
      const filePath = `${user.id}/avatar-${Date.now()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, avatarFile);

      if (uploadError) throw uploadError;

      //Obt la URL publica del archivo subido
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;

      //Actualiza la columna avatar_url en profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      toast.success('¡Tu foto de perfil ha sido actualizada! Refresca la página para ver los cambios.');
      
      setAvatarFile(null);
      setAvatarPreview(null);

    } catch (error) {
      console.error('Error al subir imagen:', error);
      toast.error('Hubo un error al subir tu imagen.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        address: address,
        phone: phone,
        specialty: specialty,
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Hubo un error al actualizar tus datos.');
      console.error('Error updating profile (full object):', error);
      console.error('Error details (stringified):', JSON.stringify(error, null, 2));
    } else {
      toast.success('¡Perfil actualizado con éxito!');
    }
    setIsUpdatingProfile(false);
  };
  
  if (authLoading) {
    return <p className="text-center p-8">Cargando...</p>;
  }

  return (
    <PrivateRoute>
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-6">Editar Perfil</h1>
        {/*FORMULARIO DATOS PERSONALES */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-4">Información Personal</h2>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                    <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">Dirección</label>
                    <input id="address" type="text" value={address}  onChange={(e) => setAddress(e.target.value)}  placeholder="Ej: Av. Principal 123, Ciudad"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Número de Teléfono</label>
                    <input id="phone"  type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: +56 9 1234 5678"
                     className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                </div>
                {profile?.role === 'profesional' && profile?.local_id === null && (
                    <div>
                        <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">Especialidad</label>
                        <input
                            id="specialty"
                            type="text"
                            value={specialty}
                            onChange={(e) => setSpecialty(e.target.value)}
                            placeholder="Ej: Barbero, Tatuador, Estilista"
                            className="mt-1 block w-full px-3 py-2 border rounded-md"
                        />
                    </div>
                )}
                <button type="submit" disabled={isUpdatingProfile} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400">
                    {isUpdatingProfile ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </form>
        </div>
        {/* Seccion para editar el Avatar */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Foto de Perfil (Avatar)</h2>
          <div className="relative h-32 w-32 bg-gray-200 rounded-full overflow-hidden mb-4">
            <Image src={avatarPreview || profile?.avatar_url || '/default-avatar.png'} alt="Vista previa del avatar" fill style={{ objectFit: 'cover' }}/>
          </div>
           <input type="file" id="avatar-upload" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, 'avatar')} className="hidden"/>
          <div className="flex gap-4">
            <label htmlFor="avatar-upload" className="cursor-pointer bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">
              Seleccionar Imagen
            </label>
            <button onClick={() => handleUpload('avatar')} disabled={!avatarFile || isUploading} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400">
              {isUploading ? 'Guardando...' : 'Guardar Avatar'}
            </button>
          </div>
        </div>
      </div>
    </PrivateRoute>
  );
}