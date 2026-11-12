import React from 'react';
import { RaffleBoardState, BoardItem } from '../models/types';

interface BoardModalProps {
  boardData: RaffleBoardState;
  isOrganizer: boolean;
  onClose: () => void;
  onSelectTicket: (ticket: BoardItem) => void;
}

export const BoardModal: React.FC<BoardModalProps> = ({ boardData, isOrganizer, onClose, onSelectTicket }) => {
  if (!boardData) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="cosi-card p-6 max-w-5xl w-full max-h-[92vh] overflow-y-auto space-y-5">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-white">{boardData.title}</h3>
            <p className="text-xs text-slate-400">
              Premio: {boardData.prize_name} | Valor Boleto: ${boardData.ticket_price} COP
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-xl">✕</button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
          <div className="flex gap-4 font-bold">
            <span className="flex items-center gap-1.5 text-slate-300">
              <div className="w-3.5 h-3.5 rounded bg-[#090C16] border border-white/20" /> Disponibles ({boardData.stats.available})
            </span>
            <span className="flex items-center gap-1.5 text-cosi-yellow">
              <div className="w-3.5 h-3.5 rounded bg-cosi-yellow/20 border border-cosi-yellow/50" /> Apartados / Abonos ({boardData.stats.reserved})
            </span>
            <span className="flex items-center gap-1.5 text-cosi-rose">
              <div className="w-3.5 h-3.5 rounded bg-cosi-rose/20 border border-cosi-rose/50" /> Pagados ({boardData.stats.sold})
            </span>
          </div>
          {isOrganizer && (
            <span className="text-cosi-yellow font-semibold text-[11px]">
              👉 Haz clic sobre cualquier casilla para editar comprador, registrar abono o marcar pagado.
            </span>
          )}
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {boardData.board.map((item) => {
            const isPaid = item.status === 'PAID';
            const isReserved = item.status === 'RESERVED';
            return (
              <div
                key={item.ticket_id}
                onClick={() => isOrganizer && onSelectTicket(item)}
                className={`h-16 rounded-xl border flex flex-col items-center justify-center font-mono font-bold transition select-none ${
                  isOrganizer ? 'cursor-pointer' : 'cursor-default'
                } ${
                  isPaid ? 'bg-cosi-rose/20 border-cosi-rose/50 text-cosi-rose hover:bg-cosi-rose/30' :
                  isReserved ? 'bg-cosi-yellow/20 border-cosi-yellow/50 text-cosi-yellow hover:bg-cosi-yellow/30' :
                  'bg-cosi-black/80 border-white/10 text-slate-300 hover:border-cosi-purple'
                }`}
                title={isOrganizer ? "Clic para gestionar este boleto" : ""}
              >
                <span className="text-xs">{item.numbers.join(', ')}</span>
                <span className="text-[9px] font-sans opacity-85 uppercase mt-0.5">
                  {isPaid ? 'Pagado' : isReserved ? 'Abono' : 'Libre'}
                </span>
                {item.customer_name && (
                  <span className="text-[8px] font-sans text-slate-300 truncate max-w-[90%]">
                    {item.customer_name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};