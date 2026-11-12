import React, { useState } from 'react';
import {
  Ticket, Calendar, ArrowRightLeft, Trophy,
  Sparkles, Lock, PlusCircle
} from 'lucide-react';
import { BoardItem, RaffleBoardState } from '../models/types';

interface CustomerPortalViewProps {
  currentUser: any;
  publicRaffles: any[];
  customerTickets: any[];
  boardData: RaffleBoardState | null;
  loading: boolean;
  onOpenBoard: (raffleId: string) => Promise<void>;
  onCloseBoard: () => void;
  onReserveTicket: (payload: {
    raffle_id: string;
    ticket_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  }) => Promise<boolean>;
  onSwapTicket: (currentTicketId: string, newTicketId: string) => Promise<boolean>;
  onShowAlert: (msg: string, type?: 'success' | 'error') => void;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  currentUser,
  publicRaffles,
  customerTickets,
  boardData,
  loading,
  onOpenBoard,
  onCloseBoard,
  onReserveTicket,
  onSwapTicket,
  onShowAlert,
}) => {
  const [subTab, setSubTab] = useState<'catalog' | 'my_tickets'>('my_tickets');
  const [selectedTicket, setSelectedTicket] = useState<BoardItem | null>(null);
  const [swappingTicket, setSwappingTicket] = useState<any | null>(null);

  const [buyerName, setBuyerName] = useState(currentUser?.name || '');
  const [buyerEmail, setBuyerEmail] = useState(currentUser?.email || '');
  const [buyerPhone, setBuyerPhone] = useState(currentUser?.phone || '');

  // Agrupar los boletos del cliente por Rifa (soporta múltiples boletos por rifa y múltiples rifas)
  const ticketsGroupedByRaffle = customerTickets.reduce((acc: Record<string, any>, item: any) => {
    if (!acc[item.raffle_id]) {
      acc[item.raffle_id] = {
        raffle_id: item.raffle_id,
        raffle_title: item.raffle_title,
        prize_name: item.prize_name,
        draw_date: item.draw_date,
        raffle_status: item.raffle_status,
        winning_number: item.winning_number,
        tickets: [],
      };
    }
    acc[item.raffle_id].tickets.push(item);
    return acc;
  }, {});

  const groupedRafflesList = Object.values(ticketsGroupedByRaffle);

  const handleConfirmReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardData || !selectedTicket) return;
    const rId = boardData.id || boardData.raffle_id!;
    const ok = await onReserveTicket({
      raffle_id: rId,
      ticket_id: selectedTicket.ticket_id,
      customer_name: buyerName,
      customer_email: buyerEmail,
      customer_phone: buyerPhone,
    });
    if (ok) {
      setSelectedTicket(null);
    }
  };

  const handleOpenSwapModal = async (ticket: any) => {
    const isFinished = ticket.raffle_status !== 'ACTIVE' || new Date(ticket.draw_date) <= new Date();
    if (isFinished) {
      onShowAlert('Esta rifa ya finalizó. No se permiten cambios.', 'error');
      return;
    }

    const hoursLeft = (new Date(ticket.draw_date).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft < 24) {
      onShowAlert('Solo puedes cambiar de número hasta 24 horas antes del sorteo.', 'error');
      return;
    }

    setSwappingTicket(ticket);
    await onOpenBoard(ticket.raffle_id);
  };

  const handleConfirmSwap = async (newItem: BoardItem) => {
    if (!swappingTicket || newItem.status !== 'AVAILABLE') return;
    const ok = await onSwapTicket(swappingTicket.ticket_id, newItem.ticket_id);
    if (ok) {
      setSwappingTicket(null);
      onCloseBoard();
    }
  };

  return (
    <div className="space-y-6">
      {/* Navegación interna del Portal Cliente */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => {
            setSubTab('my_tickets');
            setSwappingTicket(null);
            onCloseBoard();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            subTab === 'my_tickets'
              ? 'bg-cosi-purple text-white shadow-lg shadow-cosi-purple/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Ticket className="w-4 h-4 text-cosi-green" />
          <span>Mis Rifas y Boletos ({customerTickets.length})</span>
        </button>

        <button
          onClick={() => {
            setSubTab('catalog');
            setSwappingTicket(null);
            onCloseBoard();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            subTab === 'catalog'
              ? 'bg-cosi-purple text-white shadow-lg shadow-cosi-purple/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-cosi-yellow" />
          <span>Explorar Rifas Activas ({publicRaffles.length})</span>
        </button>
      </div>

      {/* SECCIÓN 1: MIS RIFAS Y BOLETOS (AGRUPADOS POR RIFA) */}
      {subTab === 'my_tickets' && (
        <div className="space-y-6">
          {groupedRafflesList.length === 0 ? (
            <div className="cosi-card p-8 text-center space-y-3">
              <p className="text-xs text-slate-400">Aún no has adquirido boletos en ninguna rifa.</p>
              <button
                onClick={() => setSubTab('catalog')}
                className="px-5 py-2 cosi-btn-purple text-xs font-bold"
              >
                Ver Rifas Disponibles
              </button>
            </div>
          ) : (
            groupedRafflesList.map((group: any) => {
              const isFinished =
                group.raffle_status === 'COMPLETED' ||
                group.raffle_status === 'CANCELLED' ||
                new Date(group.draw_date) <= new Date();

              return (
                <div
                  key={group.raffle_id}
                  className={`cosi-card p-6 space-y-4 border-l-4 ${
                    isFinished ? 'border-l-slate-500' : 'border-l-cosi-green'
                  }`}
                >
                  {/* Cabecera de la Rifa */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-white">{group.raffle_title}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isFinished
                              ? 'bg-slate-700 text-slate-200'
                              : 'bg-cosi-green/20 text-cosi-green border border-cosi-green/40'
                          }`}
                        >
                          {isFinished ? 'Rifa Finalizada' : 'En Curso'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <span>Premio: <b className="text-slate-200">{group.prize_name}</b></span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-cosi-purple" />
                          Sorteo: {group.draw_date.split('T')[0]}
                        </span>
                      </p>
                    </div>

                    {/* Si está activa: permitir comprar más boletos en esta misma rifa */}
                    {!isFinished ? (
                      <button
                        onClick={() => {
                          setSubTab('catalog');
                          onOpenBoard(group.raffle_id);
                        }}
                        className="px-3.5 py-1.5 cosi-btn-purple text-xs font-bold flex items-center gap-1.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Comprar otro boleto aquí</span>
                      </button>
                    ) : (
                      /* Si finalizó: mostrar bloque de Número Ganador en modo solo lectura */
                      <div className="px-4 py-2 rounded-xl bg-cosi-yellow/15 border border-cosi-yellow/50 flex items-center gap-2.5">
                        <Trophy className="w-5 h-5 text-cosi-yellow" />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-cosi-yellow block">
                            Número Ganador Oficial
                          </span>
                          <span className="text-base font-mono font-extrabold text-white">
                            {group.winning_number || 'Pendiente de publicación'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Listado de múltiples boletos del cliente en esta rifa */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.tickets.map((t: any) => {
                      const pending = t.total_amount - t.balance_paid;
                      const isPaid = t.payment_status === 'PAID';
                      const isWinner =
                        isFinished &&
                        group.winning_number &&
                        t.numbers.includes(group.winning_number);

                      return (
                        <div
                          key={t.purchase_id}
                          className={`cosi-card-subtle p-4 rounded-xl border space-y-3 ${
                            isWinner
                              ? 'border-cosi-yellow bg-cosi-yellow/10'
                              : 'border-white/10'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-mono font-bold text-cosi-purple">
                              Boleto {t.ticket_code}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isPaid
                                  ? 'bg-cosi-green/20 text-cosi-green'
                                  : 'bg-cosi-yellow/20 text-cosi-yellow'
                              }`}
                            >
                              {isPaid ? 'PAGADO' : 'ABONO / PENDIENTE'}
                            </span>
                          </div>

                          <div className="p-2.5 bg-cosi-black/70 rounded-lg flex justify-between items-center font-mono">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-sans">Números:</span>
                              <span className="text-base font-extrabold text-cosi-yellow">
                                {t.numbers.join(' - ')}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block font-sans">Saldo:</span>
                              <span className="text-xs font-bold text-white">
                                ${pending.toLocaleString()} COP
                              </span>
                            </div>
                          </div>

                          {isWinner && (
                            <div className="text-xs font-extrabold text-cosi-yellow flex items-center gap-1.5">
                              <Trophy className="w-4 h-4" />
                              <span>¡BOLETO GANADOR!</span>
                            </div>
                          )}

                          {/* Acciones condicionadas: Solo si la rifa NO ha finalizado */}
                          {isFinished ? (
                            <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-slate-500" />
                              <span>Rifa cerrada — Consulta de solo lectura</span>
                            </div>
                          ) : (
                            !isPaid && (
                              <div className="pt-2 border-t border-white/5 flex justify-end">
                                <button
                                  onClick={() => handleOpenSwapModal(t)}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cosi-yellow font-bold text-xs rounded-lg flex items-center gap-1.5 transition"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  <span>Cambiar Número</span>
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SECCIÓN 2: CATÁLOGO DE RIFAS ACTIVAS Y COMPRA DE NUEVOS BOLETOS */}
      {subTab === 'catalog' && (
        <div className="space-y-6">
          {!boardData ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {publicRaffles.map((r) => (
                <div key={r.id} className="cosi-card p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="font-mono text-cosi-green font-bold">
                        ${r.ticket_price.toLocaleString()} COP
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-cosi-yellow/20 text-cosi-yellow text-[10px] font-bold">
                        {r.numbers_per_ticket} Núm/Boleto
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-white">{r.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">Premio: {r.prize_name}</p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTicket(null);
                      onOpenBoard(r.id);
                    }}
                    className="w-full py-2.5 cosi-btn-purple text-xs font-bold"
                  >
                    Seleccionar Boletos
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="cosi-card p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-white">{boardData.title}</h3>
                  <p className="text-xs text-slate-400">
                    Selecciona cualquier puesto libre para apartarlo (puedes comprar múltiples boletos).
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedTicket(null);
                    onCloseBoard();
                  }}
                  className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold"
                >
                  ← Volver
                </button>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {boardData.board.map((item) => {
                  const isAvail = item.status === 'AVAILABLE';
                  const isSel = selectedTicket?.ticket_id === item.ticket_id;
                  return (
                    <div
                      key={item.ticket_id}
                      onClick={() => isAvail && setSelectedTicket(item)}
                      className={`h-14 rounded-xl border flex flex-col items-center justify-center font-mono font-bold transition select-none ${
                        isSel
                          ? 'ring-2 ring-cosi-yellow border-cosi-yellow bg-cosi-yellow/30 text-white'
                          : isAvail
                          ? 'bg-cosi-black/80 border-white/10 text-slate-200 hover:border-cosi-purple cursor-pointer'
                          : 'bg-slate-900/50 border-white/5 text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <span className="text-xs">{item.numbers.join(', ')}</span>
                      <span className="text-[9px] font-sans uppercase mt-0.5">
                        {isSel ? 'Elegido' : isAvail ? 'Libre' : 'Ocupado'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {selectedTicket && (
                <form onSubmit={handleConfirmReserve} className="p-4 bg-[#090C16] rounded-xl border border-cosi-yellow/40 space-y-3">
                  <div className="text-xs font-bold text-cosi-yellow">
                    Confirmar Apartado de Boleto [{selectedTicket.numbers.join(', ')}]
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Nombre Completo"
                      className="px-3 py-1.5 cosi-input text-xs"
                    />
                    <input
                      type="email"
                      required
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="Correo Electrónico"
                      className="px-3 py-1.5 cosi-input text-xs"
                    />
                    <input
                      type="tel"
                      required
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="Teléfono / WhatsApp"
                      className="px-3 py-1.5 cosi-input text-xs"
                    />
                  </div>
                  <div className="text-right">
                    <button type="submit" disabled={loading} className="px-6 py-2 cosi-btn-yellow text-xs font-bold">
                      {loading ? 'Procesando...' : 'Apartar Boleto'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE INTERCAMBIO DE NÚMERO (SOLO RIFAS ACTIVAS) */}
      {swappingTicket && boardData && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="cosi-card p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white">Cambiar Número de Boleto</h3>
                <p className="text-xs text-slate-400">
                  Reemplazando [{swappingTicket.numbers.join(', ')}] en "{swappingTicket.raffle_title}". Selecciona un puesto libre:
                </p>
              </div>
              <button
                onClick={() => {
                  setSwappingTicket(null);
                  onCloseBoard();
                }}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {boardData.board.map((item) => {
                const isAvail = item.status === 'AVAILABLE';
                return (
                  <div
                    key={item.ticket_id}
                    onClick={() => isAvail && handleConfirmSwap(item)}
                    className={`h-14 rounded-xl border flex flex-col items-center justify-center font-mono font-bold transition select-none ${
                      isAvail
                        ? 'bg-cosi-black border-white/10 text-slate-200 hover:border-cosi-yellow cursor-pointer'
                        : 'bg-slate-900/50 border-white/5 text-slate-600 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span className="text-xs">{item.numbers.join(', ')}</span>
                    <span className="text-[9px] font-sans uppercase">{isAvail ? 'Elegir' : 'Ocupado'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};