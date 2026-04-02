import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { clients, situacaoLabels, formatCurrency, Situacao } from '@/data/mockData';
import KpiCards from '@/components/KpiCards';

const COLORS_STATUS: Record<Situacao, string> = {
  'COBRANÇA OK': '#10b981',
  'NÃO PAGO': '#ef4444',
  'PARCELADO': '#f59e0b',
  'DISTRATO': '#8b5cf6',
};

const AGING_RANGES = ['0–30', '31–60', '61–90', '90+'];
const AGING_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const DashboardPage = () => {
  const statusData = (Object.keys(situacaoLabels) as Situacao[]).map(s => ({
    name: situacaoLabels[s],
    value: clients.filter(c => c.situacao === s).length,
    color: COLORS_STATUS[s],
  })).filter(d => d.value > 0);

  const agingData = AGING_RANGES.map((label, i) => {
    const count = clients.filter(c => {
      if (i === 0) return c.diasAtraso >= 0 && c.diasAtraso <= 30;
      if (i === 1) return c.diasAtraso >= 31 && c.diasAtraso <= 60;
      if (i === 2) return c.diasAtraso >= 61 && c.diasAtraso <= 90;
      return c.diasAtraso > 90;
    }).length;
    return { faixa: label, clientes: count };
  });

  const regionais = [...new Set(clients.map(c => c.regional))];
  const regionalData = regionais.map(r => ({
    regional: r,
    total: clients.filter(c => c.regional === r).reduce((s, c) => s + c.compensacao, 0),
  })).sort((a, b) => b.total - a.total);

  const executivos = [...new Set(clients.map(c => c.executivo))];
  const execData = executivos.map(e => ({
    executivo: e.split(' ')[0],
    valor: clients.filter(c => c.executivo === e).reduce((s, c) => s + c.compensacao, 0),
  })).sort((a, b) => b.valor - a.valor);

  const tooltipStyle = {
    contentStyle: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#1a1a1a' },
    labelStyle: { color: '#6b7280' },
  };


  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Dashboard</h2>
      <KpiCards />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Distribuição por Status</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} innerRadius={60} strokeWidth={0} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#6b7280' }}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Aging por Faixa de Atraso</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={agingData} barSize={40}>
              <XAxis dataKey="faixa" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="clientes" radius={[6, 6, 0, 0]}>
                {agingData.map((_, i) => <Cell key={i} fill={AGING_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Inadimplência por Regional</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={regionalData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1_000_000).toFixed(1)}M`} />
              <YAxis type="category" dataKey="regional" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="total" fill="hsl(160, 84%, 39%)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Top Executivos (Carteira)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={execData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1_000_000).toFixed(1)}M`} />
              <YAxis type="category" dataKey="executivo" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="valor" fill="hsl(38, 92%, 50%)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
