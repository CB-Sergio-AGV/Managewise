import { useState } from 'react';
import { Link } from 'react-router-dom';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="flex h-screen w-full font-sans">
      
      {/* Mitad Izquierda */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 flex-col justify-center items-center text-white p-12">
        <div className="max-w-md text-center">
          <h1 className="text-6xl font-extrabold text-orange-500 mb-6 tracking-tight">ManageWise</h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            Únete a la plataforma que optimiza tus flujos de trabajo y potencia a tu equipo.
          </p>
        </div>
      </div>

      {/* Mitad Derecha */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-10 border border-gray-100">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-2">Crea tu cuenta</h2>
          <p className="text-center text-gray-500 mb-8">Comienza a gestionar tus proyectos hoy mismo</p>

          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Nombre Completo</label>
              <InputText value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Tu nombre" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Correo Electrónico</label>
              <InputText value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="ejemplo@correo.com" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Contraseña</label>
              <Password value={password} onChange={(e) => setPassword(e.target.value)} toggleMask feedback={true} inputClassName="w-full p-3 border border-gray-300 rounded-lg" placeholder="••••••••" />
            </div>

            <div className="pt-2">
                <Button label="Crear Cuenta" className="w-full py-3 bg-orange-500 hover:bg-orange-600 border-none font-bold text-white rounded-lg transition-colors flex justify-center" />
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-gray-600">
            ¿Ya tienes una cuenta? <Link to="/login" className="text-orange-500 hover:text-orange-600 font-bold hover:underline">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}