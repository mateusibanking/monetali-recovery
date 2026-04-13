import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertCircle } from 'lucide-react';
import { situacaoLabels, formatCurrency, type Situacao } from '@/data/mockData';
import { useDashboard } from '@/hooks/useDashboard';
import KpiCards from '@/components/KpiCards';
import RecuperacaoChart from '@/components/RecuperacaoChart';
import MonthSelector, { DEFAULT_MONTH } from '@/components/MonthSelector';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import StatusCards from '@/components/StatusCards';
import ExpandableBarChart from '@/components/ExpandableBarChart';

const COLORS_STATUS: Record<Situacao, string> = {
  'NÃO INICIADO': '#9ca3af',
  'EM ANDAMENTO': '#f59e0b',
  'PENDENTE': '#f97316',
  'CONTATADO': '#06b6d4',
  'EM NEGOCIAÇÃO': '#6366f1',
  'ACORDO FECHADO': '#14b8a6',
  'PAGO': '#22c55e',
  'JURÍDICO': '#8b5cf6',
  'PARCELADO': '#3b82f6',
  'DISTRATO': '#ef4444',
  'CANCELADO': '#991b1b',
  'SUSPENSO': '#8b5cf6',
};

const AGING_COLORS = ['#316AB4', '#D4A843', '#ef4444', '#0D2C60'];

const tooltipStyle = {
  contentStyle: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#333' },
  labelStyle: { color: '#6b7280' },
};

const DashboardPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(DEFAULT_MONTH);
  const [activeStatus, setActiveStatus] = useState<Situacao | null>(null);
  const { data: dashboard, loading, error } = useDashboard(selectedMonth);

  // Destructure here (safe — dashboard always has initial empty state)
  const { clients, porStatus, porRegional, porExecutivo, aging, totalInadimplente, totalRecuperado, pagamentosEmAberto, pagamentosQuitados } = dashboard;

  // ALL hooks MUST be called before any early return (Rules of Hooks)
  const filteredRegional = useMemo(() => {
    if (!activeStatus) return porRegional;
    return porRegional
      .map(g => {
        const filtered = g.clientes.filter(c => c.situacao === activeStatus);
        if (filtered.length === 0) return null;
        return {
          ...g,
          total: filtered.reduce((s, c) => s + c.compensacao, 0),
          vitbank: filtered.reduce((s, c) => s + c.boletoVitbank, 0),
          monetali: filtered.reduce((s, c) => s + c.pixMonetali, 0),
          qtd: filtered.length,
          clientes: filtered,
        };
      })
      .filter(Boolean) as typeof porRegional;
  }, [porRegional, activeStatus]);

  const filteredExecutivo = useMemo(() => {
    if (!activeStatus) return porExecutivo;
    return porExecutivo
      .map(g => {
        const filtered = g.clientes.filter(c => c.situacao === activeStatus);
        if (filtered.length === 0) return null;
        return {
          ...g,
          total: filtered.reduce((s, c) => s + c.compensacao, 0),
          vitbank: filtered.reduce((s, c) => s + c.boletoVitbank, 0),
          monetali: filtered.reduce((s, c) => s + c.pixMonetali, 0),
          qtd: filtered.length,
          clientes: filtered,
        };
      })
      .filter(Boolean) as typeof porExecutivo;
  }, [porExecutivo, activeStatus]);

  const statusData = useMemo(() =>
    porStatus.map(s => ({
      name: situacaoLabels[s.situacao] || s.name,
      value: s.value,
      color: COLORS_STATUS[s.situacao] || '#6b7280',
    })).filter(d => d.value > 0),
    [porStatus]
  );

  // Early returns AFTER all hooks
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar dashboard</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const hasData = clients.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-bold font-display">Dashboard</h2>
      </div>

      <MonthSelector selected={selectedMonth} onChange={setSelectedMonth} showTodos />

      <KpiCards
        totalInadimplente={totalInadimplente}
        totalRecuperado={totalRecuperado}
        pagamentosEmAberto={pagamentosEmAberto}
        pagamentosQuitados={pagamentosQuitados}
      />

      {/* Status Cards — clickable filters */}
      {hasData && (
        <StatusCards
          data={porStatus}
          activeStatus={activeStatus}
          onStatusClick={setActiveStatus}
        />
      )}

      <RecuperacaoChart />

      {!hasData && (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <AlertCircle className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Sem dados para este mês</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Nenhum pagamento encontrado para o período selecionado. Tente outro mês ou selecione "Todos".
          </p>
        </div>
      )}

      {/* Expandable Bar Charts — Regional & Executivo */}
      {hasData && (
        <>
          <ExpandableBarChart
            title="Inadimplência por Regional"
            data={filteredRegional}
            barColor="#316AB4"
            topN={10}
          />

          <ExpandableBarChart
            title="Inadimplência por Executivo"
            data={filteredExecutivo}
            barColor="#16a34a"
            topN={10}
          />
        </>
      )}

      {/* Existing charts — Status distribution + Aging */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-5" style={{ minHeight: 400 }}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 font-display">Distribuição por Status</h3>
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90} innerRadius={45} strokeWidth={2} stroke="#ffffff">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend verticalAlign="bottom" height={36} formatter={(value: string) => <span style={{ color: '#333', fontSize: 12 }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 font-display">Aging por Faixa de Atraso</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={aging} barSize={40}>
                <XAxis dataKey="faixa" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="clientes" radius={[6, 6, 0, 0]}>
                  {aging.map((_, i) => <Cell key={i} fill={AGING_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
