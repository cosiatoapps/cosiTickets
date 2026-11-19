import React, { useEffect, useState } from 'react';
import {
  Ticket, Calendar, Sparkles, CheckCircle2, AlertCircle,
  MessageCircle, Share2, ArrowLeft, ShieldCheck, RefreshCw
} from 'lucide-react';
import { BoardItem, RaffleBoardState } from '../models/types';

interface PublicRaffleViewProps {
  raffleId: string;
  raffleMeta: any | null;
  boardData: RaffleBoardState | null;
  receipt: any | null;
  loading: boolean;
  errorMsg: string | null;
  onLoadRaffle: (raffleId: string) => void;
  onReserveTicket: (payload: {
    raffle_id: string;
    ticket_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  }) => Promise<boolean>;
  onDismissReceipt: () => void;
  onGoToLogin: () => void;
  onCopyShareLink: (raffleId: string, title?: string) => void;
}

export const PublicRaffleView: React.FC<PublicRaffleViewProps> = ({
  raffleId,
  raffleMeta,
  boardData,
  receipt,
  loading,
  errorMsg,
  onLoadRaffle,
  onReserveTicket,
  onDismissReceipt,
  onGoToLogin,
  onCopyShareLink,
}) => {
  const [selectedTicket, setSelectedTicket] = useState<BoardItem | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');

  useEffect(() => {
    onLoadRaffle(raffleId);
  }, [raffleId]);

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !raffleMeta) return;

    const ok = await onReserveTicket({
      raffle_id: raffleMeta.id,
      ticket_id: selectedTicket.ticket_id,
      customer_name: buyerName,
      customer_email: buyerEmail,
      customer_phone: buyerPhone,
    });

    if (ok) {
      setSelectedTicket(null);
    }
  };

  const buildWhatsAppUrl = (data: any) => {
    const cleanPhone = (data.organizer_phone || '').replace(/\D/g, '');
    const nums = (data.numbers || []).join(', ');
    const text = encodeURIComponent(
      `¡Hola ${data.organizer_name}! Aparté el boleto *#${data.ticket_code}* con número(s) *[${nums}]* en la rifa *"${data.raffle_title}"* por valor de *$${Number(data.ticket_price).toLocaleString()} COP*.\n\nMi nombre es *${data.buyerName}*. Te comparto por aquí mi comprobante de pago/abono.`
    );
    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
  };

  return (
    <div className="min-h-screen bg-[#05070E] text-slate-100 flex flex-col selection:bg-cosi-purple selection:text-white">
      {/* Header Público */}
      <header className="px-6 py-4 border-b border-white/5 bg-[#090C16]/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cosi-purple to-cosi-cyan flex items-center justify-center text-white font-extrabold shadow-lg shadow-cosi-purple/20">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-white tracking-tight">CosiTickets</span>
              <span className="text-[10px] bg-cosi-green/20 border border-cosi-green/40 text-cosi-green px-2 py-0.5 rounded-full font-bold">
                RESERVA DIRECTA
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Elige tu número sin necesidad de crear cuenta</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {raffleMeta && (
            <button
              onClick={() => onCopyShareLink(raffleMeta.id, raffleMeta.title)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition"
            >
              <Share2 className="w-3.5 h-3.5 text-cosi-yellow" />
              <span className="hidden sm:inline">Compartir Rifa</span>
            </button>
          )}
          <button
            onClick={onGoToLogin}
            className="px-3.5 py-1.5 rounded-xl cosi-btn-purple text-xs font-bold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ingresar al Portal</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6">
        {errorMsg && (
          <div className="p-3.5 rounded-xl border bg-cosi-rose/15 border-cosi-rose/40 text-cosi-rose text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading && !boardData ? (
          <div className="cosi-card p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cosi-purple" />
            <span className="text-xs font-semibold">Cargando tablero oficial en tiempo real...</span>
          </div>
        ) : raffleMeta && boardData ? (
          <>
            {/* Banner de la Rifa */}
            <div className="cosi-card p-6 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cosi-yellow via-cosi-purple to-cosi-green" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-cosi-yellow/20 text-cosi-yellow text-[10px] font-extrabold uppercase">
                      {raffleMeta.numbers_per_ticket} Número(s) por Boleto
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-cosi-purple" />
                      Sorteo: <b className="text-white">{raffleMeta.draw_date.split('T')[0]}</b>
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white">{raffleMeta.title}</h1>
                  <p className="text-xs text-slate-300">
                    Premio: <span className="text-cosi-yellow font-bold">{raffleMeta.prize_name}</span> • Organiza:{' '}
                    <span className="text-slate-200 font-semibold">{raffleMeta.organizer_name}</span>
                  </p>
                  {raffleMeta.description && (
                    <p className="text-xs text-slate-400 max-w-2xl pt-1">{raffleMeta.description}</p>
                  )}
                </div>

                <div className="bg-cosi-black/70 border border-white/10 rounded-2xl p-4 text-right shrink-0">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Valor del Boleto</div>
                  <div className="text-2xl font-mono font-extrabold text-cosi-green">
                    ${raffleMeta.ticket_price.toLocaleString()} <span className="text-xs font-sans text-slate-400">COP</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Disponibles: <b className="text-white">{raffleMeta.metrics.available}</b> / {raffleMeta.metrics.total}
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta de Confirmación Exitosa + Botón Directo a WhatsApp */}
            {receipt && (
              <div className="cosi-card p-6 border-2 border-cosi-green/50 bg-cosi-green/5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-6 h-6 text-cosi-green shrink-0" />
                    <div>
                      <h3 className="text-sm font-extrabold text-white">
                        ¡Boleto Apartado Exitosamente! Código #{receipt.ticket_code}
                      </h3>
                      <p className="text-xs text-slate-300">
                        Número(s) reservados: <b className="text-cosi-yellow font-mono">[{receipt.numbers.join(', ')}]</b>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onDismissReceipt}
                    className="text-xs text-slate-400 hover:text-white font-bold"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-slate-300">
                  El responsable <b>{receipt.organizer_name}</b> ya recibió la notificación en su panel. Para agilizar la validación de tu pago o abono, envíale tu comprobante directamente por WhatsApp:
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={buildWhatsAppUrl(receipt)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-[#25D366]/20 transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar Comprobante por WhatsApp</span>
                  </a>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-cosi-green" />
                    <span>También puedes iniciar sesión con tu correo para ver tus boletos.</span>
                  </span>
                </div>
              </div>
            )}

            {/* Tablero Interactivo */}
            <div className="cosi-card p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <div className="w-3.5 h-3.5 rounded bg-[#090C16] border border-white/20" /> Disponibles ({boardData.stats.available})
                  </span>
                  <span className="flex items-center gap-1.5 text-cosi-yellow">
                    <div className="w-3.5 h-3.5 rounded bg-cosi-yellow/20 border border-cosi-yellow/50" /> Apartados ({boardData.stats.reserved})
                  </span>
                  <span className="flex items-center gap-1.5 text-cosi-rose">
                    <div className="w-3.5 h-3.5 rounded bg-cosi-rose/20 border border-cosi-rose/50" /> Pagados ({boardData.stats.sold})
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Haz clic en cualquier número libre para apartarlo</span>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {boardData.board.map((item) => {
                  const isAvailable = item.status === 'AVAILABLE';
                  const isSelected = selectedTicket?.ticket_id === item.ticket_id;
                  const isPaid = item.status === 'PAID';
                  const isReserved = item.status === 'RESERVED';

                  return (
                    <button
                      type="button"
                      key={item.ticket_id}
                      disabled={!isAvailable || raffleMeta.status !== 'ACTIVE'}
                      onClick={() => isAvailable && setSelectedTicket(item)}
                      className={`h-16 rounded-xl border flex flex-col items-center justify-center font-mono font-bold transition select-none ${
                        isSelected
                          ? 'ring-2 ring-cosi-yellow border-cosi-yellow bg-cosi-yellow/30 text-white scale-105'
                          : isPaid
                          ? 'bg-cosi-rose/20 border-cosi-rose/40 text-cosi-rose cursor-not-allowed opacity-60'
                          : isReserved
                          ? 'bg-cosi-yellow/20 border-cosi-yellow/40 text-cosi-yellow cursor-not-allowed opacity-60'
                          : 'bg-cosi-black/80 border-white/10 text-slate-200 hover:border-cosi-purple cursor-pointer'
                      }`}
                    >
                      <span className="text-xs">{item.numbers.join(', ')}</span>
                      <span className="text-[9px] font-sans uppercase mt-0.5 opacity-80">
                        {isSelected ? 'Elegido' : isPaid ? 'Pagado' : isReserved ? 'Apartado' : 'Libre'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Formulario de Apartado Rápido */}
              {selectedTicket && (
                <div className="mt-4 p-5 bg-[#090C16] rounded-xl border border-cosi-yellow/40 space-y-4">
                  <div>
                    <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-cosi-yellow" />
                      <span>Apartar Boleto #{selectedTicket.ticket_code} — Número(s): [{selectedTicket.numbers.join(', ')}]</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Completa tus datos de contacto para bloquear el número a tu nombre.
                    </p>
                  </div>

                  <form onSubmit={handleReserve} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Nombre Completo</label>
                      <input
                        type="text"
                        required
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Ej. Laura Gómez"
                        className="w-full px-3 py-2 cosi-input text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Correo Electrónico</label>
                      <input
                        type="email"
                        required
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        placeholder="laura@correo.com"
                        className="w-full px-3 py-2 cosi-input text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">WhatsApp / Celular</label>
                      <input
                        type="tel"
                        required
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        placeholder="+57 300 123 4567"
                        className="w-full px-3 py-2 cosi-input text-xs"
                      />
                    </div>
                    <div className="sm:col-span-3 flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(null)}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 cosi-btn-yellow text-xs font-extrabold"
                      >
                        {loading ? 'Reservando...' : 'Confirmar Apartado Ahora'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};