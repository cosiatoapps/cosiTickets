import React from 'react';
import {
  TrendingUp, DollarSign, Clock, Award,
  BarChart3, PieChart, AlertTriangle, CheckCircle2
} from 'lucide-react';

interface AnalyticsDashboardViewProps {
  analytics: any;
  isAdmin: boolean;
  onInspectBoard?: (raffleId: string) => void;
}

export const AnalyticsDashboardView: React.FC<AnalyticsDashboardViewProps> = ({
  analytics,
  isAdmin,
  onInspectBoard,
}) => {
  if (!analytics) {
    return (
      <div className="cosi-card p-6 text-xs text-slate-400 animate-pulse">
        Calculando métricas financieras y productividad de rifas...
      </div>
    );
  }

  const { kpis, raffles = [], upcoming_raffles = [] } = analytics;
  const maxFinancialValue = Math.max(
    1,
    ...raffles.map((r: any) =>
      Math.max(r.financials.budgeted_value, r.financials.collected_value, r.productivity.prize_cost)
    )
  );

  return (
    <div className="space-y-6">
      {/* 1. TARJETAS KPI FINANCIERAS Y OPERATIVAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cosi-card p-5 border-l-4 border-l-cosi-purple">
          <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center justify-between">
            <span>Valor Presupuestado Total</span>
            <BarChart3 className="w-4 h-4 text-cosi-purple" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-1 font-mono">
            ${Number(kpis.total_budgeted).toLocaleString()} <span className="text-xs font-sans text-slate-400">COP</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            Meta al 100% en {kpis.total_raffles} {kpis.total_raffles === 1 ? 'rifa' : 'rifas'}
          </div>
        </div>

        <div className="cosi-card p-5 border-l-4 border-l-cosi-green">
          <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center justify-between">
            <span>Valor Real Recaudado</span>
            <DollarSign className="w-4 h-4 text-cosi-green" />
          </div>
          <div className="text-2xl font-extrabold text-cosi-green mt-1 font-mono">
            ${Number(kpis.total_collected).toLocaleString()} <span className="text-xs font-sans text-slate-400">COP</span>
          </div>
          <div className="text-[11px] text-cosi-green font-semibold mt-1.5">
            Ejecución presupuestal: {kpis.global_execution_pct}%
          </div>
        </div>

        <div className="cosi-card p-5 border-l-4 border-l-cosi-yellow">
          <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center justify-between">
            <span>Cartera Pendiente por Cobrar</span>
            <PieChart className="w-4 h-4 text-cosi-yellow" />
          </div>
          <div className="text-2xl font-extrabold text-cosi-yellow mt-1 font-mono">
            ${Number(kpis.total_pending_collection).toLocaleString()} <span className="text-xs font-sans text-slate-400">COP</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            Saldo en boletos reservados/abonados
          </div>
        </div>

        <div className="cosi-card p-5 border-l-4 border-l-cosi-cyan">
          <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center justify-between">
            <span>Balance Neto vs. Premios</span>
            <TrendingUp className="w-4 h-4 text-cosi-cyan" />
          </div>
          <div
            className={`text-2xl font-extrabold mt-1 font-mono ${
              kpis.global_net_profit >= 0 ? 'text-cosi-cyan' : 'text-cosi-rose'
            }`}
          >
            {kpis.global_net_profit >= 0 ? '+' : '-'}${Math.abs(Number(kpis.global_net_profit)).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            Costo premios: ${Number(kpis.total_prize_cost).toLocaleString()} COP
          </div>
        </div>
      </div>

      {/* 2. FILA DE GRÁFICOS PRINCIPALES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO A: VALOR PRESUPUESTADO VS VALOR RECAUDADO POR RIFA */}
        <div className="cosi-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cosi-purple" />
                <span>Valor Presupuestado vs. Valor Recaudado</span>
              </h3>
              <p className="text-[11px] text-slate-400">Cumplimiento financiero por sorteo</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-cosi-purple inline-block" /> Presupuestado
              </span>
              <span className="flex items-center gap-1 text-cosi-green">
                <span className="w-2.5 h-2.5 rounded-sm bg-cosi-green inline-block" /> Recaudado
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {raffles.map((r: any) => {
              const budgetPct = Math.round((r.financials.budgeted_value / maxFinancialValue) * 100);
              const collectedPct = Math.round((r.financials.collected_value / maxFinancialValue) * 100);

              return (
                <div key={r.raffle_id} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white truncate max-w-[60%]">
                      {r.title}
                      {isAdmin && <span className="text-[10px] text-slate-400 font-normal"> ({r.organizer_name})</span>}
                    </span>
                    <span className="font-mono text-[11px] text-cosi-green font-bold">
                      {r.financials.collection_rate_pct}% recaudado
                    </span>
                  </div>

                  {/* Barra Presupuestado */}
                  <div className="space-y-1">
                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cosi-purple/80 rounded-full transition-all duration-500"
                        style={{ width: `${budgetPct}%` }}
                      />
                    </div>
                    {/* Barra Recaudado */}
                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cosi-green rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(collectedPct, r.financials.collected_value > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Meta: ${r.financials.budgeted_value.toLocaleString()} COP</span>
                    <span className="text-cosi-green">Caja: ${r.financials.collected_value.toLocaleString()} COP</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GRÁFICO B: PRODUCTIVIDAD DE LA RIFA (COSTO DEL PREMIO VS VALOR RECAUDADO) */}
        <div className="cosi-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-cosi-yellow" />
                <span>Productividad: Costo del Premio vs. Recaudado</span>
              </h3>
              <p className="text-[11px] text-slate-400">Punto de equilibrio (Break-even) y rentabilidad</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-cosi-rose">
                <span className="w-2.5 h-2.5 rounded-sm bg-cosi-rose inline-block" /> Costo Premio
              </span>
              <span className="flex items-center gap-1 text-cosi-cyan">
                <span className="w-2.5 h-2.5 rounded-sm bg-cosi-cyan inline-block" /> Recaudado
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {raffles.map((r: any) => {
              const costPct = Math.round((r.productivity.prize_cost / maxFinancialValue) * 100);
              const revPct = Math.round((r.productivity.collected_value / maxFinancialValue) * 100);

              return (
                <div key={r.raffle_id} className="p-3 rounded-xl bg-cosi-black/50 border border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white truncate max-w-[55%]">{r.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        r.productivity.is_profitable
                          ? 'bg-cosi-green/20 text-cosi-green'
                          : 'bg-cosi-yellow/20 text-cosi-yellow'
                      }`}
                    >
                      {r.productivity.is_profitable
                        ? `Rentable (ROI ${r.productivity.roi_pct}%)`
                        : `Equilibrio: ${r.productivity.breakeven_pct}%`}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cosi-rose rounded-full"
                        style={{ width: `${costPct}%` }}
                      />
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cosi-cyan rounded-full"
                        style={{ width: `${Math.max(revPct, r.productivity.collected_value > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-cosi-rose">
                      Premio: ${r.productivity.prize_cost.toLocaleString()}
                    </span>
                    <span className="text-cosi-cyan">
                      Recaudado: ${r.productivity.collected_value.toLocaleString()}
                    </span>
                    <span className={r.productivity.net_profit >= 0 ? 'text-cosi-green font-bold' : 'text-slate-400'}>
                      Utilidad: ${r.productivity.net_profit.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. FILA INFERIOR: AVANCE DE VENTAS (BOLETOS) Y RIFAS PRÓXIMAS A VENCER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AVANCE DE VENTAS POR BOLETOS (2 COLUMNAS) */}
        <div className="cosi-card p-6 lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-white">Avance de Ventas y Ocupación de Tableros</h3>
              <p className="text-[11px] text-slate-400">Distribución porcentual de puestos Pagados, Abonados y Libres</p>
            </div>
            <div className="flex gap-3 text-[10px] font-bold">
              <span className="text-cosi-green">● Pagados</span>
              <span className="text-cosi-yellow">● Abonados</span>
              <span className="text-slate-400">● Libres</span>
            </div>
          </div>

          <div className="space-y-4">
            {raffles.map((r: any) => (
              <div key={r.raffle_id} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-white">{r.title}</span>
                  <span className="font-mono text-slate-300">
                    {r.sales.paid + r.sales.reserved} / {r.sales.total_tickets} boletos ({r.sales.occupied_pct}%)
                  </span>
                </div>
                <div className="h-3.5 w-full bg-slate-900 rounded-full overflow-hidden flex border border-white/5">
                  <div
                    style={{ width: `${r.sales.paid_pct}%` }}
                    className="bg-cosi-green h-full transition-all"
                    title={`Pagados: ${r.sales.paid}`}
                  />
                  <div
                    style={{ width: `${r.sales.reserved_pct}%` }}
                    className="bg-cosi-yellow h-full transition-all"
                    title={`Abonados: ${r.sales.reserved}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Pagados: <b className="text-cosi-green">{r.sales.paid}</b> ({r.sales.paid_pct}%)</span>
                  <span>Abonados: <b className="text-cosi-yellow">{r.sales.reserved}</b> ({r.sales.reserved_pct}%)</span>
                  <span>Disponibles: <b className="text-white">{r.sales.available}</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIFAS PRÓXIMAS A VENCER (1 COLUMNA) */}
        <div className="cosi-card p-6 space-y-4">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cosi-rose" />
              <span>Rifas Próximas a Vencer</span>
            </h3>
            <p className="text-[11px] text-slate-400">Prioridad por fecha de cierre</p>
          </div>

          <div className="space-y-3">
            {upcoming_raffles.length === 0 ? (
              <p className="text-xs text-slate-400">No hay sorteos activos próximos.</p>
            ) : (
              upcoming_raffles.map((r: any) => {
                const isCritical = r.days_remaining <= 3;
                const isWarning = r.days_remaining > 3 && r.days_remaining <= 7;

                return (
                  <div
                    key={r.raffle_id}
                    onClick={() => onInspectBoard && onInspectBoard(r.raffle_id)}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 transition ${
                      onInspectBoard ? 'cursor-pointer hover:border-cosi-purple' : ''
                    } ${
                      isCritical
                        ? 'bg-cosi-rose/10 border-cosi-rose/40'
                        : isWarning
                        ? 'bg-cosi-yellow/10 border-cosi-yellow/40'
                        : 'bg-cosi-black/50 border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white truncate max-w-[65%]">{r.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                          isCritical
                            ? 'bg-cosi-rose text-white'
                            : isWarning
                            ? 'bg-cosi-yellow text-cosi-black'
                            : 'bg-cosi-green/20 text-cosi-green'
                        }`}
                      >
                        {isCritical ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        <span>{r.days_remaining} días</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Cierre: {r.draw_date.split('T')[0]}</span>
                      <span>Ocupación: <b className="text-white">{r.sales.occupied_pct}%</b></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};