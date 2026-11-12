import React, { useState } from 'react';
import { Ticket, Mail, Lock, Eye, EyeOff, RefreshCw, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthViewProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  loading: boolean;
  alertMsg: { type: 'success' | 'error'; text: string } | null;
  onShowAlert: (text: string, type?: 'success' | 'error') => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLogin, loading, alertMsg, onShowAlert }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState('admin@cositickets.com');
  const [loginPassword, setLoginPassword] = useState('Password@2026!');
  
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(loginEmail, loginPassword);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          phone: registerPhone,
          password: registerPassword,
          role: 'CUSTOMER'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error en registro');
      onShowAlert('Registro completado en CosiTickets. Inicia sesión con tus credenciales.');
      setAuthMode('login');
      setLoginEmail(registerEmail);
    } catch (err: any) {
      onShowAlert(err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#05070E] flex flex-col justify-between selection:bg-cosi-purple selection:text-white relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cosi-purple/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cosi-green/10 rounded-full blur-[150px] pointer-events-none" />

      <header className="px-6 py-4 border-b border-white/5 bg-[#090C16]/80 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cosi-purple to-cosi-cyan flex items-center justify-center text-white shadow-lg shadow-cosi-purple/30 font-extrabold text-xl">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl text-white tracking-tight">CosiTickets</span>
              <span className="text-[10px] bg-cosi-yellow text-cosi-black px-2 py-0.5 rounded-full font-extrabold">2026</span>
            </div>
            <p className="text-[11px] text-slate-400">Plataforma Oficial de Rifas Virtuales Seguras</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-cosi-green">
          <span className="w-2.5 h-2.5 rounded-full bg-cosi-green animate-pulse"></span>
          <span>Sistema Cifrado Argon2id</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-md">
          {alertMsg && (
            <div className={`mb-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
              alertMsg.type === 'success' 
                ? 'bg-cosi-green/15 border-cosi-green/40 text-cosi-green' 
                : 'bg-cosi-rose/15 border-cosi-rose/40 text-cosi-rose'
            }`}>
              {alertMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{alertMsg.text}</span>
            </div>
          )}

          <div className="cosi-card p-8 relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cosi-yellow via-cosi-purple to-cosi-green rounded-t-2xl"></div>

            <div className="flex border-b border-white/10 mb-6">
              <button
                onClick={() => setAuthMode('login')}
                className={`pb-3 text-xs font-bold transition-all px-4 border-b-2 -mb-[1px] uppercase tracking-wider ${
                  authMode === 'login'
                    ? 'border-cosi-yellow text-cosi-yellow'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`pb-3 text-xs font-bold transition-all px-4 border-b-2 -mb-[1px] uppercase tracking-wider ${
                  authMode === 'register'
                    ? 'border-cosi-yellow text-cosi-yellow'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Crear Cuenta
              </button>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="usuario@cositickets.com"
                      className="w-full pl-10 pr-3 py-2.5 cosi-input text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 cosi-input text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 cosi-btn-purple flex items-center justify-center gap-2 text-xs"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><span>Ingresar a CosiTickets</span> <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>

                <div className="p-3 bg-cosi-black/60 border border-white/5 rounded-xl text-[11px] text-slate-400 space-y-1">
                  <div className="font-bold text-cosi-yellow">Credenciales rápidas de prueba:</div>
                  <div>• <b>Admin:</b> admin@cositickets.com / Password@2026!</div>
                  <div>• <b>Responsable:</b> mariana.rifas@cositickets.com / Password@2026!</div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full px-3 py-2 cosi-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="juan.perez@cositickets.com"
                    className="w-full px-3 py-2 cosi-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Teléfono Móvil</label>
                  <input
                    type="tel"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    placeholder="+57 300 123 4567"
                    className="w-full px-3 py-2 cosi-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Contraseña Segura (OWASP)</label>
                  <input
                    type="password"
                    required
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Mínimo 12 caracteres con símbolos"
                    className="w-full px-3 py-2 cosi-input text-xs font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 cosi-btn-purple flex items-center justify-center gap-2 text-xs mt-3"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Completar Registro</span>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <footer className="bg-[#090C16] text-slate-400 py-3 px-6 text-center text-xs border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-2 z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cosi-yellow"></span>
          <span>CosiTickets • Plataforma Corporativa de Rifas Virtuales</span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">Arquitectura Docker + FastAPI + PostgreSQL</span>
      </footer>
    </div>
  );
};