import React, { useState } from 'react';
import { Edit3 } from 'lucide-react';
import { BoardItem, PaymentMethod } from '../models/types';

interface TicketManagerModalProps {
  ticket: BoardItem;
  paymentMethods: PaymentMethod[];
  ticketPrice: number;
  loading: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
}

export const TicketManagerModal: React.FC<TicketManagerModalProps> = ({
  ticket,
  paymentMethods,
  ticketPrice,
  loading,
  onClose,
  onSave,
}) => {
  const [custName, setCustName] = useState(ticket.customer_name || '');
  const [custEmail, setCustEmail] = useState(ticket.customer_email || '');
  const [custPhone, setCustPhone] = useState(ticket.customer_phone || '');
  const [status, setStatus] = useState<'AVAILABLE' | 'RESERVED' | 'PAID'>(
    ticket.status === 'AVAILABLE' ? 'RESERVED' : ticket.status
  );
  const [amountPaidInput, setAmountPaidInput] = useState<string>(
    ticket.amount_paid && ticket.amount_paid > 0
      ? String(ticket.amount_paid)
      : ticket.status === 'PAID'
      ? String(ticketPrice)
      : ''
  );
  const [payMethod, setPayMethod] = useState<string>('');
  const [notes, setNotes] = useState(ticket.notes || '');

  const safePaymentMethods =
    Array.isArray(paymentMethods) && paymentMethods.length > 0
      ? paymentMethods
      : [
          { id: '1', code: 'CASH', name: 'Efectivo' },
          { id: '2', code: 'BANK_TRANSFER', name: 'Transferencia Bancaria' },
          { id: '3', code: 'NEQUI', name: 'Nequi' },
          { id: '4', code: 'DAVIPLATA', name: 'Daviplata' },
        ];

  const numericAmount = amountPaidInput.trim() === '' ? 0.0 : Number(amountPaidInput);
  const isPaymentMethodOptional =
    status === 'AVAILABLE' || (status === 'RESERVED' && numericAmount === 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      customer_name: custName.trim() || null,
      customer_email: custEmail.trim() || null,
      customer_phone: custPhone.trim() || null,
      payment_status: status,
      amount_paid: numericAmount,
      payment_method_code: payMethod || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="cosi-card p-6 max-w-lg w-full space-y-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-cosi-yellow" />
            <span>Gestionar Boleto #{ticket.numbers.join(', ')}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-bold text-cosi-yellow uppercase tracking-wider block">
              1. Información del Comprador
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej. Andrés Ramírez"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full px-3 py-1.5 cosi-input text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Teléfono Móvil</label>
                <input
                  type="tel"
                  placeholder="+57 300 000 0000"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full px-3 py-1.5 cosi-input text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Correo Electrónico</label>
              <input
                type="email"
                placeholder="cliente@ejemplo.com"
                value={custEmail}
                onChange={(e) => setCustEmail(e.target.value)}
                className="w-full px-3 py-1.5 cosi-input text-xs"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/5">
            <span className="text-xs font-bold text-cosi-green uppercase tracking-wider block">
              2. Estado del Boleto y Finanzas
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Estado de Pago</label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="w-full px-3 py-1.5 cosi-input text-xs font-bold"
                >
                  <option value="AVAILABLE">Libre / Disponible</option>
                  <option value="RESERVED">Abonado / Apartado</option>
                  <option value="PAID">Pagado Totalmente</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Monto Abonado ($) <span className="text-slate-500 font-normal">(Opcional: 0)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={amountPaidInput}
                  onChange={(e) => setAmountPaidInput(e.target.value)}
                  className="w-full px-3 py-1.5 cosi-input text-xs font-mono font-bold text-cosi-green"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Forma de Pago{' '}
                {isPaymentMethodOptional ? (
                  <span className="text-slate-500 font-normal">(Opcional si apartado en $0)</span>
                ) : (
                  <span className="text-cosi-rose font-normal">*</span>
                )}
              </label>
              <select
                required={!isPaymentMethodOptional}
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full px-3 py-1.5 cosi-input text-xs"
              >
                <option value="">-- Seleccionar forma de pago --</option>
                {safePaymentMethods.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Observaciones / Notas <span className="text-slate-500 font-normal">(Opcional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Apartado por WhatsApp, paga el viernes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 cosi-input text-xs"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 cosi-btn-purple text-xs">
              {loading ? 'Guardando...' : 'Actualizar Boleto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};