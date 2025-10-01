'use client' 

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; 
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

export default function SignUpPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');

  const handleSignUp = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    if (!isValidPhoneNumber(phone)) {
        toast.error('Por favor, ingresa un número de teléfono válido.');
        setLoading(false);
        return;
    }
    
    // registrarse
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        // datos que se guardaran en la tabla de supabase
        data: {
          full_name: fullName,
          phone: phone,
          role: 'cliente' // Por defecto todos son cliente
        }
      }
    });

    if (error) {
      // Manejo de error si existe cel
      if (error.message.includes('duplicate key value violates unique constraint "profiles_phone_key"')) {
        toast.error('Este número de teléfono ya está registrado.');
      } else {
        toast.error('Error al registrar: ' + error.message);
      }
    } else {
      toast.success('¡Registro exitoso! Revisa tu email para confirmar tu cuenta.');
      // Limpia form
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('');
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white shadow-md rounded-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Crear una Cuenta</h1>
        <form onSubmit={handleSignUp}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="fullName">Nombre Completo</label>
            <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-700" required/>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-700" required/>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="phone">Número de Teléfono</label>
            <PhoneInput id="phone" international defaultCountry="CL" value={phone} onChange={setPhone} className="w-full px-3 py-2 border rounded-lg text-gray-700" required/>
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="password">Contraseña</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-700" required/>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300">
            {loading ? 'Registrando...' : 'Registrar'}
          </button>
        </form>
        {message && <p className="mt-4 text-center text-sm text-red-500">{message}</p>}
      </div>
    </div>
  );
}