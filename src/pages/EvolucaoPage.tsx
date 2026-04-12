import { useState, useMemo } from 'react';
import { TrendingUp, AlertCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/data/mockData';
import { useEvolucao, type DadosMes } from '@/hooks/useEvolucao';
import MonthSelector, { DEFAULT_MONTH } from '@/components/MonthSelector';
import LoadingSkeleton from '@/components/LoadingSkeleton';

const tooltipStyle = {
  contentStyle: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#333' },
  labelStyle: { color: '#6b7280' },
};

const EvolucaoPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(DEFAULT_MONTH);
  const { data: evolucao, loading, error } = useEvolucao(2026);

  // Get data for selected month or all months
  const selectedData = useMemo(() => {
    if (selectedMonth === 'todos') return null; // show all
    return evolucao.find(d => d.mes === selectedMonth) ?? null;
  }, [evolucao, selectedMonth]);

  // Aggregated totals for "Todos"
  const totais = useMemo(() => {
    const source = selectedMonth === 'todos' ? evolucao : (selectedData ? [selectedData] : []);
    return {
      recebido_vitbank: source.reduce((s, d) => s + d.recebido_vitbank, 0),
      recebido_monetali: source.reduce((s, d) => s + d.recebido_monetali, 0),
      recebido_total: source.reduce((s, d) => s + d.recebido_total, 0),
      qtd_recebidos: source.reduce((s, d) => s + d.qtd_recebidos, 0),
      pendente_vitbank: source.reduce((s, d) => s + d.pendente_vitbank, 0),
      pendente_monetali: source.reduce((s, d) => s + d.pendente_monetali, 0),
      pendente_total: source.reduce((s, d) => s + d.pendente_total, 0),
      qtd_pendentes: source.reduce((s, d) => s + d.qtd_pendentes, 0),
      vencido_vitbank: source.reduce((s, d) => s + d.vencido_vitbank, 0),
      vencido_monetali: source.reduce((s, d) => s + d.vencido_monetali, 0),
      vencido_total: source.reduce((s, d) => s + d.vencido_total, 0),
      qtd_vencidos: source.reduce((s, d) => s + d.qtd_vencidos, 0),
    };
  }, [evolucao, selectedMonth, selectedData]);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar evolução</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const hasData = totais.recebido_total > 0 || totais.pendente_total > 0 || totais.vencido_total > 0;

  // Chart data for BarChart
  const chartData = evolucao.map(d => ({
    mes: d.mesLabel,
    Recebido: d.recebido_total,
    Pendente: d.pendente_total,
    Vencido: d.vencido_total,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-accent" />
        </div>
        <h2 className="text-xl font-bold font-display">Evolução Mensal</h2>
      </div>

      {/* Month filter */}
      <MonthSelector selected={selectedMonth} onChange={setSelectedMonth} showTodos />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Recebido */}
        <div className="glass-card p-5 border-l-4 border-l-[hsl(var(--recovered))]">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-recovered" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recebido</span>
          </div>
          <p className="text-2xl font-bold font-mono text-recovered">{formatCurrency(totais.recebido_total)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {totais.qtd_recebidos} pagamento{totais.qtd_recebidos !== 1 ? 's' : ''}
          </p>
          <div className="mt-3 pt-3 border-t border-border/30 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-partial font-medium">VITBANK</span>
              <span className="font-mono">{formatCurrency(totais.recebido_vitbank)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-recovered font-medium">MONETALI</span>
              <span className="font-mono">{formatCurrency(totais.recebido_monetali)}</span>
            </div>
          </div>
        </div>

        {/* Pendente */}
        <div className="glass-card p-5 border-l-4 border-l-[hsl(var(--negotiation))]">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-negotiation" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pendente</span>
          </div>
          <p className="text-2xl font-bold font-mono text-negotiation">{formatCurrency(totais.pendente_total)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {totais.qtd_pendentes} pagamento{totais.qtd_pendentes !== 1 ? 's' : ''}
          </p>
          <div className="mt-3 pt-3 border-t border-border/30 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-partial font-medium">VITBANK</span>
              <span className="font-mono">{formatCurrency(totais.pendente_vitbank)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-recovered font-medium">MONETALI</span>
              <span className="font-mono">{formatCurrency(totais.pendente_monetali)}</span>
            </div>
          </div>
        </div>

        {/* Vencido */}
        <div className="glass-card p-5 border-l-4 border-l-[hsl(var(--overdue))]">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-overdue" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vencido</span>
          </div>
          <p className="text-2xl font-bold font-mono text-overdue">{formatCurrency(totais.vencido_total)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {totais.qtd_vencidos} pagamento{totais.qtd_vencidos !== 1 ? 's' : ''}
          </p>
          <div className="mt-3 pt-3 border-t border-border/30 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-partial font-medium">VITBANK</span>
              <span className="font-mono">{formatCurrency(totais.vencido_vitbank)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-recovered font-medium">MONETALI</span>
              <span className="font-mono">{formatCurrency(totais.vencido_monetali)}</span>
            </div>
          </div>
        </div>
      </div>

      {!hasData && (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-7 w-7 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sem dados para o período</h3>
          <p className="text-sm text-muted-foreground">Nenhum pagamento encontrado. Tente outro mês ou selecione "Todos".</p>
        </div>
      )}

      {/* Bar chart — Monthly evolution */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 font-display">
          Evolução Mensal — Recebido × Pendente × Vencido
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} barGap={2}>
            <XAxis dataKey="mes" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v > 0 ? `R$${(v / 1000).toFixed(0)}k` : '0'}
            />
            <Tooltip
              {...tooltipStyle}
              formatter={(v: number, name: string) => [formatCurrency(v), name]}
            />
            <Legend
              verticalAlign="top"
              height={32}
              formatter={(value: string) => <span style={{ color: '#333', fontSize: 12 }}>{value}</span>}
            />
            <Bar dataKey="Recebido" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Pendente" fill="hsl(42, 56%, 55%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Vencido" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed table */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 font-display">
          Detalhamento por Mês
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 text-left bg-secondary/20">
                <th className="px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Mês</th>
                <th className="px-3 py-2 font-semibold text-recovered uppercase tracking-wider text-right">Recebido</th>
                <th className="px-3 py-2 font-semibold text-negotiation uppercase tracking-wider text-right">Pendente</th>
                <th className="px-3 py-2 font-semibold text-overdue uppercase tracking-wider text-right">Vencido</th>
                <th className="px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-right">Total</th>
                <th className="px-3 py-2 font-semibold text-partial uppercase tracking-wider text-right hidden lg:table-cell">VITBANK</th>
                <th className="px-3 py-2 font-semibold text-recovered uppercase tracking-wider text-right hidden lg:table-cell">MONETALI</th>
              </tr>
            </thead>
            <tbody>
              {evolucao.map(d => {
                const total = d.recebido_total + d.pendente_total + d.vencido_total;
                const totalVb = d.recebido_vitbank + d.pendente_vitbank + d.vencido_vitbank;
                const totalMn = d.recebido_monetali + d.pendente_monetali + d.vencido_monetali;
                const isSelected = selectedMonth === d.mes;
                return (
                  <tr
                    key={d.mes}
                    className={`border-b border-border/30 transition-colors ${
                      isSelected ? 'bg-accent/10' : 'hover:bg-secondary/30'
                    }`}
                  >
                    <td className="px-3 py-2.5 font-semibold">{d.mesLabel}</td>
                    <td className="px-3 py-2.5 font-mono text-right text-recovered">
                      {d.recebido_total > 0 ? formatCurrency(d.recebido_total) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-right text-negotiation">
                      {d.pendente_total > 0 ? formatCurrency(d.pendente_total) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-right text-overdue">
                      {d.vencido_total > 0 ? formatCurrency(d.vencido_total) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-right">
                      {total > 0 ? formatCurrency(total) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-right text-partial hidden lg:table-cell">
                      {totalVb > 0 ? formatCurrency(totalVb) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-right text-recovered hidden lg:table-cell">
                      {totalMn > 0 ? formatCurrency(totalMn) : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="bg-secondary/30 font-semibold">
                <td className="px-3 py-2.5">Total</td>
                <td className="px-3 py-2.5 font-mono text-right text-recovered">
                  {formatCurrency(evolucao.reduce((s, d) => s + d.recebido_total, 0))}
                </td>
                <td className="px-3 py-2.5 font-mono text-right text-negotiation">
                  {formatCurrency(evolucao.reduce((s, d) => s + d.pendente_total, 0))}
                </td>
                <td className="px-3 py-2.5 font-mono text-right text-overdue">
                  {formatCurrency(evolucao.reduce((s, d) => s + d.vencido_total, 0))}
                </td>
                <td className="px-3 py-2.5 font-mono text-right">
                  {formatCurrency(evolucao.reduce((s, d) => s + d.recebido_total + d.pendente_total + d.vencido_total, 0))}
                </td>
                <td className="px-3 py-2.5 font-mono text-right text-partial hidden lg:table-cell">
                  {formatCurrency(evolucao.reduce((s, d) => s + d.recebido_vitbank + d.pendente_vitbank + d.vencido_vitbank, 0))}
                </td>
                <td className="px-3 py-2.5 font-mono text-right text-recovered hidden lg:table-cell">
                  {formatCurrency(evolucao.reduce((s, d) => s + d.recebido_monetali + d.pendente_monetali + d.vencido_monetali, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EvolucaoPage;
