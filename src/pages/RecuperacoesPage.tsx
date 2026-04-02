import { clients, formatCurrency } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import { CheckCircle, DollarSign, TrendingUp, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const RecuperacoesPage = () => {
  const parcelados = clients.filter(c => c.situacao === 'PARCELADO');
  const cobrancaOk = clients.filter(c => c.situacao === 'COBRANÇA OK');

  const totalRecuperado = cobrancaOk.reduce((s, c) => s + c.compensacao, 0);
  const totalParcelamento = parcelados.reduce((s, c) => s + c.compensacao, 0);
  const taxaRecuperacao = ((cobrancaOk.length / clients.length) * 100).toFixed(1);

  // Valor recuperado por executivo (only COBRANÇA OK)
  const execMap = new Map<string, number>();
  cobrancaOk.forEach(c => {
    execMap.set(c.executivo, (execMap.get(c.executivo) || 0) + c.compensacao);
  });
  const execData = Array.from(execMap.entries())
    .map(([executivo, valor]) => ({ executivo: executivo.split(' ')[0], valor }))
    .sort((a, b) => b.valor - a.valor);

  const stats = [
    { label: 'Total Recuperado', value: formatCurrency(totalRecuperado), icon: DollarSign, color: 'text-recovered' },
    { label: 'Em Parcelamento', value: formatCurrency(totalParcelamento), icon: TrendingUp, color: 'text-negotiation' },
    { label: 'Taxa de Recuperação', value: `${taxaRecuperacao}%`, icon: Percent, color: 'text-primary' },
  ];

  const tooltipStyle = {
    contentStyle: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#1a1a1a' },
    labelStyle: { color: '#6b7280' },
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Recuperações & Parcelamentos</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-5 group hover:border-primary/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Valor Recuperado por Executivo</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={execData} layout="vertical">
            <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1_000_000).toFixed(1)}M`} />
            <YAxis type="category" dataKey="executivo" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
              {execData.map((_, i) => (
                <Cell key={i} fill="hsl(160, 84%, 39%)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Client Lists */}
      {parcelados.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Parcelados ({parcelados.length})</h3>
          <div className="grid gap-3">
            {parcelados.map(client => (
              <div key={client.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-negotiation/15 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-4 w-4 text-negotiation" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{client.nome}</p>
                    <p className="text-xs text-muted-foreground">{client.regional} · {client.executivo} · {formatCurrency(client.compensacao)}</p>
                  </div>
                </div>
                <StatusBadge status={client.situacao} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cobrança OK ({cobrancaOk.length})</h3>
        <div className="grid gap-3">
          {cobrancaOk.map(client => (
            <div key={client.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-recovered/15 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-4 w-4 text-recovered" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{client.nome}</p>
                  <p className="text-xs text-muted-foreground">{client.regional} · {client.executivo} · {formatCurrency(client.compensacao)}</p>
                </div>
              </div>
              <StatusBadge status={client.situacao} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecuperacoesPage;
