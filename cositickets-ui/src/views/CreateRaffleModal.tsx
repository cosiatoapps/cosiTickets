import React, { useState } from 'react';
import {
  X, Sparkles, Trophy, Ticket, Calendar, Palette, Wand2, CheckCircle2, Layers
} from 'lucide-react';

interface CreateRaffleModalProps {
  initialRaffle?: any | null; // Si viene definido, abre directo en modo Estudio IA para esa rifa
  loading: boolean;
  generatedPreview: any | null;
  onClose: () => void;
  onCreateRaffle: (payload: {
    title: string;
    description?: string;
    prize_name: string;
    prize_cost: number;
    ticket_price: number;
    number_range_start: number;
    number_range_end: number;
    numbers_per_ticket: number;
    draw_date: string;
  }) => Promise<any>;
  onGenerateAI: (
    raffleId: string,
    prompt: string,
    primaryColor: string,
    secondaryColor: string
  ) => Promise<any>;
}

export const CreateRaffleModal: React.FC<CreateRaffleModalProps> = ({
  initialRaffle,
  loading,
  generatedPreview,
  onClose,
  onCreateRaffle,
  onGenerateAI,
}) => {
  const [step, setStep] = useState<'create' | 'ai_studio'>(initialRaffle ? 'ai_studio' : 'create');
  const [targetRaffleId, setTargetRaffleId] = useState<string>(initialRaffle?.id || '');
  const [targetTitle, setTargetTitle] = useState<string>(initialRaffle?.title || '');

  // Campos de creación de rifa
  const [title, setTitle] = useState('');
  const [prizeName, setPrizeName] = useState('');
  const [description, setDescription] = useState('');
  const [prizeCost, setPrizeCost] = useState<number>(800000);
  const [ticketPrice, setTicketPrice] = useState<number>(25000);
  const [rangeEnd, setRangeEnd] = useState<number>(99);
  const [numbersPerTicket, setNumbersPerTicket] = useState<number>(1);
  const [drawDate, setDrawDate] = useState('');

  // Campos de Estudio Creativo IA
  const [aiPrompt, setAiPrompt] = useState(
    initialRaffle
      ? `Arte publicitario moderno y llamativo para el sorteo "${initialRaffle.title}" (Premio: ${initialRaffle.prize_name}), iluminación neón vibrante, estilo premium`
      : ''
  );
  const [primaryColor, setPrimaryColor] = useState('#8B5CF6');
  const [secondaryColor, setSecondaryColor] = useState('#10B981');

  const totalNumbers = rangeEnd + 1;
  const totalTickets = Math.floor(totalNumbers / numbersPerTicket);
  const estimatedBudget = totalTickets * ticketPrice;
  const estimatedProfit = estimatedBudget - prizeCost;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await onCreateRaffle({
      title,
      description,
      prize_name: prizeName,
      prize_cost: Number(prizeCost),
      ticket_price: Number(ticketPrice),
      number_range_start: 0,
      number_range_end: Number(rangeEnd),
      numbers_per_ticket: Number(numbersPerTicket),
      draw_date: drawDate,
    });

    if (res?.raffle_id) {
      setTargetRaffleId(res.raffle_id);
      setTargetTitle(title);
      setAiPrompt(
        `Arte publicitario moderno y llamativo para el sorteo "${title}" (Premio: ${prizeName}), iluminación neón vibrante, estilo premium`
      );
      setStep('ai_studio');
    }
  };

  const handleGenerateAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRaffleId) return;
    await onGenerateAI(targetRaffleId, aiPrompt, primaryColor, secondaryColor);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="cosi-card max-w-2xl w-full p-6 space-y-5 relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cosi-purple/20 border border-cosi-purple/40 flex items-center justify-center text-cosi-purple">
              {step === 'create' ? <Trophy className="w-5 h-5" /> : <Sparkles className="w-5 h-5 text-cosi-yellow" />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                {step === 'create' ? 'Crear Nueva Rifa Virtual' : `Estudio Creativo IA • ${targetTitle}`}
              </h3>
              <p className="text-[11px] text-slate-400">
                {step === 'create'
                  ? 'Configura premios, numeración y rentabilidad (validación automática de cupos)'
                  : 'Genera el banner promocional y la plantilla del boleto con Gemini / Imagen 3'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navegación de pasos si se creó desde cero */}
        {!initialRaffle && (
          <div className="flex gap-2 text-xs font-bold">
            <span
              className={`px-3 py-1 rounded-full ${
                step === 'create'
                  ? 'bg-cosi-purple text-white'
                  : 'bg-cosi-green/20 text-cosi-green'
              }`}
            >
              1. Parámetros y Numeración
            </span>
            <span
              className={`px-3 py-1 rounded-full ${
                step === 'ai_studio'
                  ? 'bg-cosi-yellow text-cosi-black'
                  : 'bg-white/5 text-slate-400'
              }`}
            >
              2. Diseño Generativo IA
            </span>
          </div>
        )}

        {/* PASO 1: FORMULARIO CREACIÓN DE RIFA */}
        {step === 'create' && (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Título de la Rifa *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Gran Sorteo iPhone 16 Pro Max"
                  className="w-full px-3 py-2 cosi-input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Premio Principal *</label>
                <input
                  type="text"
                  required
                  value={prizeName}
                  onChange={(e) => setPrizeName(e.target.value)}
                  placeholder="Ej. iPhone 16 Pro Max 256GB Titanio"
                  className="w-full px-3 py-2 cosi-input text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Descripción / Condiciones</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Juega con las dos últimas cifras de la Lotería de Bogotá..."
                className="w-full px-3 py-2 cosi-input text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Valor Boleto (COP) *</label>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  required
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 cosi-input text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Costo del Premio (COP) *</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  required
                  value={prizeCost}
                  onChange={(e) => setPrizeCost(Number(e.target.value))}
                  className="w-full px-3 py-2 cosi-input text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cosi-purple" />
                  <span>Fecha Sorteo *</span>
                </label>
                <input
                  type="date"
                  required
                  value={drawDate}
                  onChange={(e) => setDrawDate(e.target.value)}
                  className="w-full px-3 py-2 cosi-input text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-cosi-yellow" />
                  <span>Rango de Numeración</span>
                </label>
                <select
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(Number(e.target.value))}
                  className="w-full px-3 py-2 cosi-input text-xs font-semibold"
                >
                  <option value={99}>00 al 99 (100 números - 2 cifras)</option>
                  <option value={999}>000 al 999 (1.000 números - 3 cifras)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <Ticket className="w-3.5 h-3.5 text-cosi-green" />
                  <span>Números por Boleto</span>
                </label>
                <select
                  value={numbersPerTicket}
                  onChange={(e) => setNumbersPerTicket(Number(e.target.value))}
                  className="w-full px-3 py-2 cosi-input text-xs font-semibold"
                >
                  <option value={1}>1 Número por Boleto</option>
                  <option value={2}>2 Números por Boleto (Doble oportunidad)</option>
                  <option value={3}>3 Números por Boleto (Triple oportunidad)</option>
                </select>
              </div>
            </div>

            {/* Simulador Financiero en Vivo */}
            <div className="p-4 rounded-xl bg-[#090C16] border border-white/10 grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Total Boletos</div>
                <div className="text-base font-mono font-extrabold text-white">{totalTickets}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Recaudo Meta</div>
                <div className="text-base font-mono font-extrabold text-cosi-cyan">
                  ${estimatedBudget.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Utilidad Proyectada</div>
                <div
                  className={`text-base font-mono font-extrabold ${
                    estimatedProfit >= 0 ? 'text-cosi-green' : 'text-cosi-rose'
                  }`}
                >
                  ${estimatedProfit.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 cosi-btn-purple text-xs font-extrabold flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Creando Tablero...' : 'Crear Rifa y Continuar a IA'}</span>
              </button>
            </div>
          </form>
        )}

        {/* PASO 2: ESTUDIO CREATIVO IA (GEMINI / IMAGEN 3) */}
        {step === 'ai_studio' && (
          <form onSubmit={handleGenerateAISubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-cosi-yellow" />
                <span>Prompt Creativo para Banner y Plantilla de Boleto</span>
              </label>
              <textarea
                required
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe el estilo visual, colores, iluminación y elementos del premio..."
                className="w-full px-3 py-2 cosi-input text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-cosi-purple" />
                  <span>Color Primario del Tablero</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-9 rounded cursor-pointer bg-transparent border border-white/10"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 cosi-input text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-cosi-green" />
                  <span>Color Secundario / Acento</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-9 rounded cursor-pointer bg-transparent border border-white/10"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 cosi-input text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Vista Previa de Activos Generados */}
            {generatedPreview?.design && (
              <div className="p-4 rounded-xl bg-[#090C16] border border-cosi-purple/40 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-cosi-green flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Activos Generados y Vinculados</span>
                  </span>
                  {generatedPreview.models_used && (
                    <span className="text-[10px] font-mono text-slate-400">
                      Motor: {generatedPreview.models_used.board}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Banner Público del Tablero</div>
                    <img
                      src={generatedPreview.design.background_image_url}
                      alt="Banner generado por IA"
                      className="w-full h-32 object-cover rounded-lg border border-white/10"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Plantilla Digital del Boleto</div>
                    <img
                      src={generatedPreview.design.ticket_template_url}
                      alt="Ticket generado por IA"
                      className="w-full h-32 object-cover rounded-lg border border-white/10"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
              >
                Finalizar y Cerrar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 cosi-btn-yellow text-xs font-extrabold flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? 'Generando con Gemini...' : 'Generar Artes con IA'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};