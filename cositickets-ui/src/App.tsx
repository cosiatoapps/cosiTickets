import React, { useState } from 'react';
import {
  Ticket, Users, Layers, LogOut, CheckCircle2, AlertCircle,
  TrendingUp, ShieldCheck, Sparkles, Search, UserX, UserCheck,
  Calendar, Grid, Edit3, Bell
} from 'lucide-react';
import { useCosiController } from './controllers/useCosiController';
import { AuthView } from './views/AuthView';
import { BoardModal } from './views/BoardModal';
import { TicketManagerModal } from './views/TicketManagerModal';

export default function App() {
  const cosi = useCosiController();

  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [newOrgPhone, setNewOrgPhone] = useState('');
  const [newOrgPassword, setNewOrgPassword] = useState('Organizador@2026!');
  const [newOrgMaxTotal, setNewOrgMaxTotal] = useState(10);
  const [newOrgMaxMonthly, setNewOrgMaxMonthly] = useState(5);

  const [editDrawDate, setEditDrawDate] = useState('');
  const [editReason, setEditReason] = useState('');

  if (!cosi.currentUser) {
    return (
      <AuthView
        onLogin={cosi.login}
        onRegister={cosi.register}
        loading={cosi.loading}
        alertMsg={cosi.alertMsg}
      />
    );
  }

  const isAdmin = cosi.currentUser.role === 'ADMIN';
  const isOrganizer = cosi.currentUser.role === 'ORGANIZER';

  const filteredUsers = cosi.allUsers.filter((u) => {
    const matchesRole = cosi.roleFilter === 'ALL' || u.role === cosi.roleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(cosi.searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(cosi.searchUser.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const handleCreateOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await cosi.createOrganizer({
      name: newOrgName,
      email: newOrgEmail,
      phone: newOrgPhone,
      password: newOrgPassword,
      max_total_raffles: Number(newOrgMaxTotal),
      max_monthly_raffles: Number(newOrgMaxMonthly),
    });
    setNewOrgName('');
    setNewOrgEmail('');
    setNewOrgPhone('');
  };

  const openEditModal = (raffle: any) => {
    cosi.setEditingRaffle(raffle);
    setEditDrawDate(raffle.draw_date ? raffle.draw_date.split('T')[0] : '');
    setEditReason('');
  };

  const handleSaveEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReason.trim()) {
      cosi.showAlert('El motivo del cambio es obligatorio para la auditoría.', 'error');
      return;
    }
    await cosi.saveRaffleEdit(cosi.editingRaffle.id, editDrawDate, editReason);
  };

  const unreadCount = cosi.notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-[#05070E] text-slate-100 flex flex-col selection:bg-cosi-purple selection:text-white">
      <header className="px-6 py-3.5 border-b border-white/5 bg-[#090C16]/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cosi-purple to-cosi-cyan flex items-center justify-center text-white font-extrabold shadow-lg shadow-cosi-purple/20">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-white tracking-tight">CosiTickets</span>
              <span className="bg-cosi-purple/20 border border-cosi-purple/40 text-cosi-purple px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
                {isAdmin ? 'ADMINISTRADOR GENERAL' : isOrganizer ? 'RESPONSABLE DE RIFA' : 'CLIENTE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isAdmin
                ? 'Panel Central de Control, Supervisión y Auditoría'
                : 'Gestión Operativa de Rifas, Tableros y Pagos'}
            </p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1.5 bg-[#0D111D] p-1 rounded-xl border border-white/5">
          <button
            onClick={() => cosi.setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              cosi.activeTab === 'overview'
                ? 'bg-cosi-purple text-white shadow-md shadow-cosi-purple/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAdmin ? 'Dashboard' : 'Mis Rifas'}
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => cosi.setActiveTab('users')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  cosi.activeTab === 'users'
                    ? 'bg-cosi-purple text-white shadow-md shadow-cosi-purple/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-cosi-yellow" />
                <span>Usuarios & Roles</span>
              </button>
              <button
                onClick={() => cosi.setActiveTab('raffles_inspect')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  cosi.activeTab === 'raffles_inspect'
                    ? 'bg-cosi-purple text-white shadow-md shadow-cosi-purple/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-cosi-green" />
                <span>Rifas por Responsable</span>
              </button>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white">{cosi.currentUser.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">{cosi.currentUser.email}</div>
          </div>
          <button
            onClick={cosi.logout}
            title="Cerrar Sesión"
            className="p-2 rounded-xl bg-white/5 hover:bg-cosi-rose/20 hover:text-cosi-rose text-slate-400 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {cosi.alertMsg && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              cosi.alertMsg.type === 'success'
                ? 'bg-cosi-green/15 border-cosi-green/40 text-cosi-green'
                : 'bg-cosi-rose/15 border-cosi-rose/40 text-cosi-rose'
            }`}
          >
            <div className="flex items-center gap-2">
              {cosi.alertMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>{cosi.alertMsg.text}</span>
            </div>
            <button onClick={() => cosi.setAlertMsg(null)} className="font-bold text-base hover:opacity-75">
              ×
            </button>
          </div>
        )}

        {/* VISTA ORGANIZER: MIS RIFAS + ALERTAS */}
        {isOrganizer && (
          <div className="space-y-6">
            {cosi.notifications.length > 0 && (
              <div className="cosi-card p-5 border-l-4 border-l-cosi-yellow space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <Bell className="w-4 h-4 text-cosi-yellow" />
                    <span>Alertas Recientes de Clientes ({unreadCount} sin leer)</span>
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cosi.notifications.slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && cosi.markNotificationRead(n.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                        n.is_read
                          ? 'bg-cosi-black/40 border-white/5 text-slate-400'
                          : 'bg-cosi-yellow/10 border-cosi-yellow/40 text-slate-200'
                      }`}
                    >
                      <div className="font-bold text-white flex justify-between">
                        <span>{n.title}</span>
                        {!n.is_read && <span className="text-[10px] text-cosi-yellow font-mono">NUEVO</span>}
                      </div>
                      <p className="text-[11px] mt-1">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="cosi-card p-6">
              <div className="mb-5">
                <h2 className="text-base font-extrabold text-white">Mis Rifas Asignadas</h2>
                <p className="text-xs text-slate-400">
                  Haz clic en "Gestionar Tablero" para administrar puestos, registrar abonos, pagos y datos de clientes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {cosi.rafflesList.map((r: any) => (
                  <div
                    key={r.id}
                    className="bg-cosi-black/60 border border-white/10 rounded-xl p-5 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex justify-between items-center text-xs mb-2">
                        <span className="font-mono text-cosi-green font-bold">
                          ${Number(r.ticket_price).toLocaleString()} COP
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-cosi-yellow/20 text-cosi-yellow text-[10px] font-bold">
                          {r.numbers_per_ticket} Núm/Boleto
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{r.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-cosi-purple" />
                        <span>Cierre: {r.draw_date?.split('T')[0]}</span>
                      </p>
                    </div>

                    {r.metrics && (
                      <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span>Libres: <b>{r.metrics.available}</b></span>
                          <span className="text-cosi-yellow">Abono: <b>{r.metrics.reserved}</b></span>
                          <span className="text-cosi-rose">Pagado: <b>{r.metrics.paid}</b></span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => cosi.openBoardPreview(r.id)}
                      className="w-full py-2.5 cosi-btn-purple rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <Grid className="w-4 h-4" />
                      <span>Gestionar Tablero y Boletos</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VISTA ADMIN: OVERVIEW */}
        {isAdmin && cosi.activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="cosi-card p-5 border-l-4 border-l-cosi-purple">
                <div className="text-xs font-bold text-slate-400 uppercase">Rifas en Operación</div>
                <div className="text-3xl font-extrabold text-white mt-1">3</div>
                <div className="text-[11px] text-cosi-purple font-semibold mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Sorteos activos en CosiTickets</span>
                </div>
              </div>
              <div className="cosi-card p-5 border-l-4 border-l-cosi-green">
                <div className="text-xs font-bold text-slate-400 uppercase">Recaudo Acumulado</div>
                <div className="text-3xl font-extrabold text-cosi-green mt-1">$ 230.000 COP</div>
                <div className="text-[11px] text-slate-400 mt-2">Abonos y pagos validados</div>
              </div>
              <div className="cosi-card p-5 border-l-4 border-l-cosi-yellow">
                <div className="text-xs font-bold text-slate-400 uppercase">Responsables Habilitados</div>
                <div className="text-3xl font-extrabold text-cosi-yellow mt-1">{cosi.rafflesList.length || 1}</div>
                <div className="text-[11px] text-slate-400 mt-2">Control de cupos activo</div>
              </div>
              <div className="cosi-card p-5 border-l-4 border-l-cosi-cyan">
                <div className="text-xs font-bold text-slate-400 uppercase">Seguridad Criptográfica</div>
                <div className="text-3xl font-extrabold text-cosi-cyan mt-1">NIST</div>
                <div className="text-[11px] text-cosi-green mt-2 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Argon2id + Bitácora Inmutable</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VISTA ADMIN: USUARIOS RBAC */}
        {isAdmin && cosi.activeTab === 'users' && (
          <div className="space-y-6">
            <div className="cosi-card p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-cosi-yellow" />
                    <span>Control Central de Usuarios y Roles (RBAC)</span>
                  </h2>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={cosi.searchUser}
                      onChange={(e) => cosi.setSearchUser(e.target.value)}
                      placeholder="Buscar por nombre o correo..."
                      className="w-full pl-9 pr-3 py-1.5 cosi-input text-xs"
                    />
                  </div>
                  <select
                    value={cosi.roleFilter}
                    onChange={(e: any) => cosi.setRoleFilter(e.target.value)}
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
                      <th className="py-3 px-4">Rol</th>
                      <th className="py-3 px-4">Teléfono</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{u.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        </td>
                        <td className="py-3 px-4 font-bold">{u.role}</td>
                        <td className="py-3 px-4">{u.phone || 'N/A'}</td>
                        <td className="py-3 px-4">{u.is_active ? 'ACTIVO' : 'SUSPENDIDO'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => cosi.toggleUserStatus(u.id, u.is_active)}
                            className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10"
                          >
                            {u.is_active ? <UserX className="w-3.5 h-3.5 text-cosi-rose" /> : <UserCheck className="w-3.5 h-3.5 text-cosi-green" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="cosi-card p-6">
              <h3 className="text-sm font-bold text-white mb-4">Registrar Nuevo Responsable de Rifa</h3>
              <form onSubmit={handleCreateOrgSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input
                  type="text"
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Nombre"
                  className="px-3 py-2 cosi-input text-xs"
                />
                <input
                  type="email"
                  required
                  value={newOrgEmail}
                  onChange={(e) => setNewOrgEmail(e.target.value)}
                  placeholder="Correo"
                  className="px-3 py-2 cosi-input text-xs"
                />
                <input
                  type="tel"
                  value={newOrgPhone}
                  onChange={(e) => setNewOrgPhone(e.target.value)}
                  placeholder="Teléfono"
                  className="px-3 py-2 cosi-input text-xs"
                />
                <input
                  type="password"
                  required
                  value={newOrgPassword}
                  onChange={(e) => setNewOrgPassword(e.target.value)}
                  className="px-3 py-2 cosi-input text-xs font-mono"
                />
                <input
                  type="number"
                  min="1"
                  value={newOrgMaxTotal}
                  onChange={(e) => setNewOrgMaxTotal(Number(e.target.value))}
                  className="px-3 py-2 cosi-input text-xs"
                />
                <input
                  type="number"
                  min="1"
                  value={newOrgMaxMonthly}
                  onChange={(e) => setNewOrgMaxMonthly(Number(e.target.value))}
                  className="px-3 py-2 cosi-input text-xs"
                />
                <div className="sm:col-span-3 text-right">
                  <button type="submit" disabled={cosi.loading} className="px-6 py-2 cosi-btn-purple text-xs">
                    Habilitar Responsable
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VISTA ADMIN: RIFAS POR RESPONSABLE */}
        {isAdmin && cosi.activeTab === 'raffles_inspect' && (
          <div className="cosi-card p-6 space-y-6">
            <h2 className="text-base font-extrabold text-white">Supervisión e Inspección por Responsable</h2>
            {cosi.rafflesList.map((org: any) => (
              <div key={org.organizer_id} className="cosi-card-subtle p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div>
                    <div className="text-sm font-bold text-white">{org.organizer_name}</div>
                    <div className="text-xs text-slate-400 font-mono">{org.organizer_email}</div>
                  </div>
                  <span className="px-3 py-1 bg-cosi-purple/20 text-cosi-purple text-xs font-bold rounded-full">
                    {org.total_raffles} Rifas
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {org.raffles?.map((r: any) => (
                    <div key={r.id} className="bg-cosi-black/60 border border-white/5 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-cosi-green font-bold">${r.ticket_price.toLocaleString()} COP</span>
                        <span className="text-cosi-yellow">{r.numbers_per_ticket} Núm/Boleto</span>
                      </div>
                      <h4 className="text-xs font-bold text-white">{r.title}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => cosi.openBoardPreview(r.id)}
                          className="py-1.5 px-3 cosi-btn-purple rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                        >
                          <Grid className="w-3.5 h-3.5" />
                          <span>Tablero</span>
                        </button>
                        <button
                          onClick={() => openEditModal(r)}
                          className="py-1.5 px-3 bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
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
        )}

        {/* MODALES */}
        {cosi.selectedRaffleBoard && (
          <BoardModal
            boardData={cosi.selectedRaffleBoard}
            isOrganizer={isOrganizer}
            onClose={() => cosi.setSelectedRaffleBoard(null)}
            onSelectTicket={(ticket) => cosi.setManagingTicket(ticket)}
          />
        )}

        {cosi.managingTicket && cosi.selectedRaffleBoard && (
          <TicketManagerModal
            ticket={cosi.managingTicket}
            ticketPrice={cosi.selectedRaffleBoard.ticket_price}
            paymentMethods={cosi.paymentMethods}
            loading={cosi.loading}
            onClose={() => cosi.setManagingTicket(null)}
            onSave={(payload) => cosi.saveTicketDetails(cosi.managingTicket!.ticket_id, payload)}
          />
        )}

        {cosi.editingRaffle && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="cosi-card p-6 max-w-md w-full space-y-4">
              <h3 className="text-sm font-extrabold text-white">Modificar Fecha de Cierre (Auditoría)</h3>
              <form onSubmit={handleSaveEditSubmit} className="space-y-4">
                <input
                  type="date"
                  required
                  value={editDrawDate}
                  onChange={(e) => setEditDrawDate(e.target.value)}
                  className="w-full px-3 py-2 cosi-input text-xs"
                />
                <textarea
                  required
                  rows={3}
                  placeholder="Motivo obligatorio para bitácora..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 cosi-input text-xs"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => cosi.setEditingRaffle(null)}
                    className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button type="submit" disabled={cosi.loading} className="flex-1 py-2 cosi-btn-purple text-xs">
                    Guardar
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