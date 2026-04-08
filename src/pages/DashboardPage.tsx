import { useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertCircle } from 'lucide-react';
import { situacaoLabels, formatCurrency, Situacao } from '@/data/mockData';
import { useDashboard } from '@/hooks/useDashboard';
import KpiCards from '@/components/KpiCards';
import MonthSelector, { DEFAULT_MONTH } from '@/components/MonthSelector';
import LoadingSkeleton from '@/components/LoadingSkeleton';

const COLORS_STATUS: Record<Situacao, string> = {
  'COBRANÇA OK': '#22c55e',
  'COBRANÇA EM ANDAMENTO': '#3b82f6',
  'NÃO PAGO': '#ef4444',
  'PARCELADO': '#D4A843',
  'DISTRATO': '#8b5cf6',
};

const AGING_COLORS = ['#316AB4', '#D4A843', '#ef4444', '#0D2C60'];

const DashboardPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(DEFAULT_MONTH);
  const { data: dashboard, loading, error } = useDashboard(selectedMonth);

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

  const { clients, porStatus, porRegional, porExecutivo, aging } = dashboard;

  const statusData = porStatus.map(s => ({
    name: situacaoLabels[s.situacao] || s.name,
    value: s.value,
    color: COLORS_STATUS[s.situacao] || '#6b7280',
  })).filter(d => d.value > 0);

  const regionalData = porRegional;

  const execData = porExecutivo.map(e => ({
    executivo: e.executivo.split(' ')[0],
    valor: e.valor,
  }));

  const tooltipStyle = {
    contentStyle: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#333' },
    labelStyle: { color: '#6b7280' },
  };

  const hasData = clients.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-bold font-display">Dashboard</h2>
      </div>

      <MonthSelector selected={selectedMonth} onChange={setSelectedMonth} showTodos />

      <KpiCards clients={clients} />

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

      {hasData && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 font-display">Inadimplência por Regional</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={regionalData} layout="vertical" barSize={24}>
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1_000_000).toFixed(1)}M`} />
              <YAxis type="category" dataKey="regional" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="total" fill="#316AB4" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 font-display">Top Executivos (Carteira)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={execData} layout="vertical" barSize={20}>
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1_000_000).toFixed(1)}M`} />
              <YAxis type="category" dataKey="executivo" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="valor" fill="#D4A843" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>}
    </div>
  );
};

export default DashboardPage;
