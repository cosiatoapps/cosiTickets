import React, { useState } from 'react';
import { 
  Ticket, Users, LogOut, TrendingUp, Edit3, Grid, 
  UserX, UserCheck, Search, Layers, Calendar, Sparkles, CheckCircle2, AlertCircle, ShieldCheck
} from 'lucide-react';
import { useCosiController } from './controllers/useCosiController';
import { AuthView } from './views/AuthView';
import { BoardModal } from './views/BoardModal';
import { TicketManagerModal } from './views/TicketManagerModal';

export default function App() {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    loading,
    alertMsg,
    setAlertMsg,
    allUsers,
    rafflesList,
    selectedRaffleBoard,
    setSelectedRaffleBoard,
    editingRaffle,
    setEditingRaffle,
    managingTicket,
    setManagingTicket,
    paymentMethods,
    roleFilter,
    setRoleFilter,
    searchUser,
    setSearchUser,
    login,
    logout,
    toggleUserStatus,
    createOrganizer,
    openBoardPreview,
    saveRaffleEdit,
    saveTicketDetails,
    showAlert
  } = useCosiController();

  // Estados locales para formularios modales
  const [editTitle, setEditTitle] = useState('');
  const [editDrawDate, setEditDrawDate] = useState('');
  const [editReason, setEditReason] = useState('');

  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [newOrgPhone, setNewOrgPhone] = useState('');
  const [newOrgPassword, setNewOrgPassword] = useState('Organizador@2026!');
  const [newOrgMaxTotal, setNewOrgMaxTotal] = useState(10);
  const [newOrgMaxMonthly, setNewOrgMaxMonthly] = useState(5);

  // Si no hay sesión activa, renderizar la Vista de Autenticación
  if (!currentUser) {
    return (
      <AuthView 
        onLogin={login} 
        loading={loading} 
        alertMsg={alertMsg} 
        onShowAlert={showAlert} 
      />
    );
  }

  const isOrganizer = currentUser.role === 'ORGANIZER';
  const isAdmin = currentUser.role === 'ADMIN';

  const filteredUsers = allUsers.filter(u => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesSearch = u.name.toLowerCase().includes(searchUser.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchUser.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const handleCreateOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrganizer({
      name: newOrgName,
      email: newOrgEmail,
      phone: newOrgPhone,
      password: newOrgPassword,
      max_total_raffles: Number(newOrgMaxTotal),
      max_monthly_raffles: Number(newOrgMaxMonthly)
    });
    setNewOrgName('');
    setNewOrgEmail('');
    setNewOrgPhone('');
  };

  const handleEditModalOpen = (r: any) => {
    setEditingRaffle(r);
    setEditTitle(r.title);
    setEditDrawDate(r.draw_date ? r.draw_date.split('T')[0] : '');
    setEditReason('');
  };

  return (
    <div className="min-h-screen bg-[#05070E] text-slate-100 flex flex-col selection:bg-cosi-purple selection:text-white">
      {/* Header Institucional */}
      <header className="px-6 py-3.5 border-b border-white/5 bg-[#090C16]/90 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cosi-purple to-cosi-cyan flex items-center justify-center text-white">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-white">CosiTickets</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                isAdmin ? 'bg-cosi-purple/20 text-cosi-purple border border-cosi-purple/40' :
                'bg-cosi-yellow/20 text-cosi-yellow border border-cosi-yellow/40'
              }`}>
                {isOrganizer ? 'RESPONSABLE DE RIFA' : 'ADMINISTRADOR GENERAL'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isOrganizer ? 'Gestión Operativa de Mis Rifas y Boletos' : 'Consola Central de Operaciones & Auditoría'}
            </p>
          </div>
        </div>

        {/* Navegación RBAC */}
        <nav className="flex items-center gap-1.5 bg-[#0D111D] p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'overview' ? 'bg-cosi-purple text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isOrganizer ? 'Mis Rifas' : 'Dashboard'}
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'users' ? 'bg-cosi-purple text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-cosi-yellow" />
              <span>Usuarios & Roles</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveTab('raffles_inspect')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'raffles_inspect' ? 'bg-cosi-purple text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cosi-green" />
              <span>Supervisión General</span>
            </button>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white">{currentUser.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">{currentUser.email}</div>
          </div>
          <button onClick={logout} className="p-2 rounded-xl bg-white/5 hover:bg-cosi-rose/20 text-slate-400">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Cuerpo Principal */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {alertMsg && (
          <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            alertMsg.type === 'success' ? 'bg-cosi-green/15 border-cosi-green/40 text-cosi-green' : 'bg-cosi-rose/15 border-cosi-rose/40 text-cosi-rose'
          }`}>
            <span>{alertMsg.text}</span>
            <button onClick={() => setAlertMsg(null)}>×</button>
          </div>
        )}

        {/* 1. VISTA OVERVIEW: ORGANIZADOR */}
        {isOrganizer && activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="cosi-card p-6">
              <h2 className="text-base font-extrabold text-white mb-1">Mis Rifas Asignadas</h2>
              <p className="text-xs text-slate-400 mb-6">Gestiona los boletos de tus rifas, registra abonos y consulta los compradores.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {rafflesList.map((r) => (
                  <div key={r.id} className="cosi-card-subtle p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-mono text-cosi-green font-bold">${r.ticket_price.toLocaleString()} COP</span>
                        <span className="px-2 py-0.5 rounded-full bg-cosi-yellow/20 text-cosi-yellow text-[10px] font-bold">
                          {r.numbers_per_ticket} Núm/Boleto
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1">{r.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2">Premio: {r.prize_name}</p>
                      <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-cosi-purple" />
                        <span>Sorteo: {r.draw_date.split('T')[0]}</span>
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/5 text-[11px]">
                      <div className="flex justify-between text-slate-300 font-medium">
                        <span>Libres: <b>{r.metrics.available}</b></span>
                        <span className="text-cosi-yellow">Abonos: <b>{r.metrics.reserved}</b></span>
                        <span className="text-cosi-rose">Pagados: <b>{r.metrics.paid}</b></span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                        <div style={{ width: `${(r.metrics.paid / r.metrics.total) * 100}%` }} className="bg-cosi-rose h-full" />
                        <div style={{ width: `${(r.metrics.reserved / r.metrics.total) * 100}%` }} className="bg-cosi-yellow h-full" />
                      </div>
                    </div>

                    <button
                      onClick={() => openBoardPreview(r.id)}
                      className="w-full py-2 cosi-btn-purple text-xs flex items-center justify-center gap-2"
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Abrir Tablero y Gestionar Boletos</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. VISTA OVERVIEW: ADMINISTRADOR GENERAL */}
        {isAdmin && activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="cosi-card p-5 border-l-4 border-l-cosi-purple">
                <div className="text-xs font-bold text-slate-400 uppercase">Rifas Activas</div>
                <div className="text-3xl font-extrabold text-white mt-1">3</div>
                <div className="text-[11px] text-cosi-purple font-semibold mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Sorteos en curso</span>
                </div>
              </div>
              <div className="cosi-card p-5 border-l-4 border-l-cosi-green">
                <div className="text-xs font-bold text-slate-400 uppercase">Recaudo Acumulado</div>
                <div className="text-3xl font-extrabold text-cosi-green mt-1">$ 230.000 COP</div>
                <div className="text-[11px] text-slate-400 mt-2">Abonos y pagos validados</div>
              </div>
              <div className="cosi-card p-5 border-l-4 border-l-cosi-yellow">
                <div className="text-xs font-bold text-slate-400 uppercase">Responsables</div>
                <div className="text-3xl font-extrabold text-cosi-yellow mt-1">1</div>
                <div className="text-[11px] text-slate-400 mt-2">Mariana Ospina (5/10 cupos)</div>
              </div>
              <div className="cosi-card p-5 border-l-4 border-l-cosi-cyan">
                <div className="text-xs font-bold text-slate-400 uppercase">Seguridad</div>
                <div className="text-3xl font-extrabold text-cosi-cyan mt-1">NIST</div>
                <div className="text-[11px] text-cosi-green mt-2 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Argon2id + Bitácora Inmutable</span>
                </div>
              </div>
            </div>

            <div className="cosi-card p-6">
              <h2 className="text-base font-extrabold text-white mb-4">Rifas Virtuales Registradas en CosiTickets</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="cosi-card-subtle p-5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-cosi-purple/20 text-cosi-purple text-[10px] font-bold">1 Núm / Boleto</span>
                    <span className="text-sm font-mono font-bold text-cosi-green">$ 50.000 COP</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Portátil Gamer ASUS ROG Strix</h3>
                  <p className="text-xs text-slate-400 mb-3">Intel Core i9, RTX 4070, 32GB RAM.</p>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cosi-yellow rounded-full" style={{ width: '3%' }} />
                  </div>
                </div>

                <div className="cosi-card-subtle p-5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-cosi-green/20 text-cosi-green text-[10px] font-bold">2 Núm / Boleto</span>
                    <span className="text-sm font-mono font-bold text-cosi-green">$ 120.000 COP</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Moto Yamaha MT-03 2026</h3>
                  <p className="text-xs text-slate-400 mb-3">50 boletos (2 números cada uno).</p>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cosi-green rounded-full" style={{ width: '2%' }} />
                  </div>
                </div>

                <div className="cosi-card-subtle p-5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-cosi-yellow/20 text-cosi-yellow text-[10px] font-bold">3 Núm / Boleto</span>
                    <span className="text-sm font-mono font-bold text-cosi-green">$ 40.000 COP</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">iPhone 16 Pro Max 512GB</h3>
                  <p className="text-xs text-slate-400 mb-3">33 boletos (3 números cada uno).</p>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cosi-cyan rounded-full" style={{ width: '3%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. VISTA USUARIOS & ROLES (SOLO ADMIN) */}
        {isAdmin && activeTab === 'users' && (
          <div className="space-y-6">
            <div className="cosi-card p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-cosi-yellow" />
                    <span>Control Central de Usuarios y Roles (RBAC)</span>
                  </h2>
                  <p className="text-xs text-slate-400">Administración de cuentas y privilegios del sistema</p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      placeholder="Buscar por nombre o correo..."
                      className="w-full pl-9 pr-3 py-1.5 cosi-input text-xs"
                    />
                  </div>
                  <select
                    value={roleFilter}
                    onChange={(e: any) => setRoleFilter(e.target.value)}
                    className="px-3 py-1.5 cosi-input text-xs font-semibold"
                  >
                    <option value="ALL">Todos los Roles</option>
                    <option value="ADMIN">Administradores</option>
                    <option value="ORGANIZER">Responsables</option>
                    <option value="CUSTOMER">Clientes</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto mt-4 rounded-xl border border-white/5">
                <table className="w-full text-left text-xs text-slate-300 cosi-table">
                  <thead>
                    <tr>
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Rol Asignado</th>
                      <th className="py-3 px-4">Teléfono</th>
                      <th className="py-3 px-4">Límites Operativos</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{u.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === 'ADMIN' ? 'bg-cosi-purple/20 text-cosi-purple border border-cosi-purple/40' :
                            u.role === 'ORGANIZER' ? 'bg-cosi-yellow/20 text-cosi-yellow border border-cosi-yellow/40' :
                            'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{u.phone || 'No registrado'}</td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {u.limits ? (
                            <span className="text-[11px] font-semibold text-cosi-yellow">
                              Máx. {u.limits.max_total_raffles} tot / {u.limits.max_monthly_raffles} mes
                            </span>
                          ) : (
                            <span className="text-slate-500">N/A</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            u.is_active ? 'bg-cosi-green/20 text-cosi-green border border-cosi-green/30' : 'bg-cosi-rose/20 text-cosi-rose border border-cosi-rose/30'
                          }`}>
                            {u.is_active ? 'ACTIVO' : 'SUSPENDIDO'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => toggleUserStatus(u.id, u.is_active)}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition ${
                              u.is_active 
                                ? 'bg-cosi-rose/10 text-cosi-rose hover:bg-cosi-rose/20 border-cosi-rose/30' 
                                : 'bg-cosi-green/10 text-cosi-green hover:bg-cosi-green/20 border-cosi-green/30'
                            }`}
                            title={u.is_active ? "Suspender Usuario" : "Activar Usuario"}
                          >
                            {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Formulario Registrar Responsable */}
            <div className="cosi-card p-6">
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <Users className="w-4 h-4 text-cosi-purple" />
                <span>Registrar Nuevo Responsable de Rifa</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">Habilita gestores y define sus topes permitidos de creación de rifas.</p>

              <form onSubmit={handleCreateOrgSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Carlos Mendoza"
                    className="w-full px-3 py-1.5 cosi-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={newOrgEmail}
                    onChange={(e) => setNewOrgEmail(e.target.value)}
                    placeholder="carlos@cositickets.com"
                    className="w-full px-3 py-1.5 cosi-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={newOrgPhone}
                    onChange={(e) => setNewOrgPhone(e.target.value)}
                    placeholder="+57 311 000 0000"
                    className="w-full px-3 py-1.5 cosi-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Contraseña Inicial</label>
                  <input
                    type="password"
                    required
                    value={newOrgPassword}
                    onChange={(e) => setNewOrgPassword(e.target.value)}
                    className="w-full px-3 py-1.5 cosi-input text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Máx. Rifas Totales</label>
                  <input
                    type="number"
                    min="1"
                    value={newOrgMaxTotal}
                    onChange={(e) => setNewOrgMaxTotal(Number(e.target.value))}
                    className="w-full px-3 py-1.5 cosi-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Máx. Rifas por Mes</label>
                  <input
                    type="number"
                    min="1"
                    value={newOrgMaxMonthly}
                    onChange={(e) => setNewOrgMaxMonthly(Number(e.target.value))}
                    className="w-full px-3 py-1.5 cosi-input text-xs"
                  />
                </div>
                <div className="sm:col-span-3 text-right">
                  <button type="submit" disabled={loading} className="px-6 py-2 cosi-btn-purple text-xs">
                    {loading ? 'Guardando...' : 'Habilitar Responsable'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. VISTA SUPERVISIÓN DE RIFAS POR RESPONSABLE (SOLO ADMIN) */}
        {isAdmin && activeTab === 'raffles_inspect' && (
          <div className="space-y-6">
            <div className="cosi-card p-6">
              <h2 className="text-base font-extrabold text-white mb-1">Supervisión e Inspección por Responsable</h2>
              <p className="text-xs text-slate-400 mb-6">Acceso a tableros en tiempo real y edición de parámetros de cierre.</p>

              <div className="space-y-6">
                {rafflesList.map((org: any) => (
                  <div key={org.organizer_id} className="cosi-card-subtle p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <Users className="w-4 h-4 text-cosi-yellow" />
                          <span>{org.organizer_name}</span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono">{org.organizer_email}</div>
                      </div>
                      <span className="px-3 py-1 bg-cosi-purple/20 border border-cosi-purple/30 text-cosi-purple text-xs font-bold rounded-full">
                        {org.total_raffles} Rifas Asignadas
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {org.raffles.map((r: any) => (
                        <div key={r.id} className="bg-cosi-black/60 border border-white/5 rounded-xl p-4 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="font-mono text-cosi-green font-bold">${r.ticket_price.toLocaleString()} COP</span>
                              <span className="px-2 py-0.5 rounded-full bg-cosi-yellow/20 text-cosi-yellow text-[10px] font-bold">
                                {r.numbers_per_ticket} Núm/Boleto
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white line-clamp-1">{r.title}</h4>
                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-cosi-purple" />
                              <span>Cierre: {r.draw_date.split('T')[0]}</span>
                            </p>
                          </div>

                          <div className="space-y-1.5 pt-2 border-t border-white/5 text-[11px]">
                            <div className="flex justify-between text-slate-300 font-medium">
                              <span>Disponibles: <b>{r.metrics.available}</b></span>
                              <span className="text-cosi-yellow">Abonados: <b>{r.metrics.reserved}</b></span>
                              <span className="text-cosi-rose">Pagados: <b>{r.metrics.paid}</b></span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                              <div style={{ width: `${(r.metrics.paid / r.metrics.total) * 100}%` }} className="bg-cosi-rose h-full" />
                              <div style={{ width: `${(r.metrics.reserved / r.metrics.total) * 100}%` }} className="bg-cosi-yellow h-full" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              onClick={() => openBoardPreview(r.id)}
                              className="py-1.5 px-3 cosi-btn-purple rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                            >
                              <Grid className="w-3.5 h-3.5" />
                              <span>Ver Tablero</span>
                            </button>
                            <button
                              onClick={() => handleEditModalOpen(r)}
                              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-white/10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODALES REUTILIZABLES */}
        {selectedRaffleBoard && (
          <BoardModal
            boardData={selectedRaffleBoard}
            isOrganizer={isOrganizer}
            onClose={() => setSelectedRaffleBoard(null)}
            onSelectTicket={(ticket) => setManagingTicket(ticket)}
          />
        )}

        {managingTicket && (
          <TicketManagerModal
            ticket={managingTicket}
            paymentMethods={paymentMethods}
            rafflePrice={selectedRaffleBoard?.ticket_price || 0}
            loading={loading}
            onClose={() => setManagingTicket(null)}
            onSave={saveTicketDetails}
          />
        )}

        {editingRaffle && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="cosi-card p-6 max-w-md w-full space-y-4">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cosi-yellow" />
                <span>Modificar Configuración de Rifa</span>
              </h3>
              <p className="text-xs text-slate-400">Ajusta los parámetros de cierre. Se registrará la justificación obligatoria en auditoría.</p>

              <form onSubmit={(e) => { e.preventDefault(); saveRaffleEdit(editingRaffle.id, editDrawDate, editReason); }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Título de la Rifa</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 cosi-input text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Fecha de Sorteo (Cierre)</label>
                  <input
                    type="date"
                    required
                    value={editDrawDate}
                    onChange={(e) => setEditDrawDate(e.target.value)}
                    className="w-full px-3 py-2 cosi-input text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Motivo / Justificación (Auditoría Obligatoria)</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Escribe el motivo del cambio..."
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full px-3 py-2 cosi-input text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingRaffle(null)}
                    className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 cosi-btn-purple text-xs"
                  >
                    {loading ? 'Guardando...' : 'Aplicar y Registrar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}