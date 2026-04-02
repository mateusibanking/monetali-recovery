import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { clients, situacaoLabels, formatCurrency, Situacao } from '@/data/mockData';

const COLORS_STATUS: Record<Situacao, string> = {
  em_atraso: 'hsl(0, 72%, 51%)',
  negociacao: 'hsl(38, 92%, 50%)',
  juridico: 'hsl(280, 65%, 55%)',
  recuperado: 'hsl(160, 84%, 39%)',
  parcial: 'hsl(200, 80%, 50%)',
};

const AGING_RANGES = ['0–30', '31–60', '61–90', '90+'];
const AGING_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#7c3aed'];

const DashboardPage = () => {
  // Pie: por status
  const statusData = (Object.keys(situacaoLabels) as Situacao[]).map(s => ({
    name: situacaoLabels[s],
    value: clients.filter(c => c.situacao === s).length,
    color: COLORS_STATUS[s],
  })).filter(d => d.value > 0);

  // Aging por faixa
  const agingData = AGING_RANGES.map((label, i) => {
    const count = clients.filter(c => {
      if (i === 0) return c.diasAtraso >= 0 && c.diasAtraso <= 30;
      if (i === 1) return c.diasAtraso >= 31 && c.diasAtraso <= 60;
      if (i === 2) return c.diasAtraso >= 61 && c.diasAtraso <= 90;
      return c.diasAtraso > 90;
    }).length;
    return { faixa: label, clientes: count };
  });

  // Barras por regional
  const regionais = [...new Set(clients.map(c => c.regional))];
  const regionalData = regionais.map(r => ({
    regional: r,
    total: clients.filter(c => c.regional === r && c.situacao !== 'recuperado').reduce((s, c) => s + c.compensacao, 0),
  })).sort((a, b) => b.total - a.total);

  // Top executivos
  const executivos = [...new Set(clients.map(c => c.executivo))];
  const execData = executivos.map(e => ({
    executivo: e.split(' ').slice(0, 2).join(' '),
    clientes: clients.filter(c => c.executivo === e && c.situacao !== 'recuperado').length,
    valor: clients.filter(c => c.executivo === e && c.situacao !== 'recuperado').reduce((s, c) => s + c.compensacao, 0),
  })).sort((a, b) => b.valor - a.valor);

  const tooltipStyle = {
    contentStyle: { background: 'hsl(222, 44%, 8%)', border: '1px solid hsl(222, 30%, 16%)', borderRadius: 8, fontSize: 12 },
    labelStyle: { color: 'hsl(210, 40%, 80%)' },
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Dashboard</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie - Status */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Distribuição por Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={0} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Aging */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Aging por Faixa de Atraso</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={agingData}>
              <XAxis dataKey="faixa" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="clientes" radius={[6, 6, 0, 0]}>
                {agingData.map((_, i) => <Cell key={i} fill={AGING_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Regional */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Inadimplência por Regional</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={regionalData} layout="vertical">
              <XAxis type="number" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="regional" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="total" fill="hsl(160, 84%, 39%)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Executivos */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Top Executivos (Carteira Inadimplente)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={execData} layout="vertical">
              <XAxis type="number" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="executivo" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
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
