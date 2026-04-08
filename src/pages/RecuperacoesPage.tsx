import { useState } from 'react';
import { formatCurrency } from '@/data/mockData';
import { useClientes } from '@/hooks/useClientes';
import StatusBadge from '@/components/StatusBadge';
import MonthSelector, { DEFAULT_MONTH } from '@/components/MonthSelector';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { CheckCircle, DollarSign, TrendingUp, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const RecuperacoesPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(DEFAULT_MONTH);
  const { data: clients, loading, error } = useClientes();

  if (loading) return <LoadingSkeleton />;
  if (error) return <div className="glass-card p-12 text-center text-destructive">{error}</div>;

  const parcelados = clients.filter(c => c.situacao === 'PARCELADO');
  const cobrancaAndamento = clients.filter(c => c.situacao === 'COBRANÇA EM ANDAMENTO');

  const totalRecuperado = cobrancaAndamento.reduce((s, c) => s + c.compensacao, 0);
  const totalParcelamento = parcelados.reduce((s, c) => s + c.compensacao, 0);
  const taxaRecuperacao = clients.length > 0 ? ((cobrancaAndamento.length / clients.length) * 100).toFixed(1) : '0';

  const execMap = new Map<string, number>();
  cobrancaAndamento.forEach(c => {
    execMap.set(c.executivo, (execMap.get(c.executivo) || 0) + c.compensacao);
  });
  const execData = Array.from(execMap.entries())
    .map(([executivo, valor]) => ({ executivo: executivo.split(' ')[0], valor }))
    .sort((a, b) => b.valor - a.valor);

  const stats = [
    { label: 'Total em Cobrança', value: formatCurrency(totalRecuperado), icon: DollarSign, color: 'text-link' },
    { label: 'Em Parcelamento', value: formatCurrency(totalParcelamento), icon: TrendingUp, color: 'text-accent' },
    { label: 'Taxa Cobrança em Andamento', value: `${taxaRecuperacao}%`, icon: Percent, color: 'text-primary' },
  ];

  const tooltipStyle = {
    contentStyle: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#333' },
    labelStyle: { color: '#6b7280' },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-bold font-display">Recuperações & Parcelamentos</h2>
        <MonthSelector selected={selectedMonth} onChange={setSelectedMonth} showTodos />
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 font-display">Valor por Executivo (Cobrança em Andamento)</h3>
          {execData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={execData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1_000_000).toFixed(1)}M`} />
                <YAxis type="category" dataKey="executivo" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                  {execData.map((_, i) => <Cell key={i} fill="#316AB4" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhum dado de cobrança.</p>
          )}
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 font-display">Parcelados ({parcelados.length})</h3>
          {parcelados.length > 0 ? (
            <div className="space-y-3 max-h-[260px] overflow-y-auto">
              {parcelados.map(client => (
                <div key={client.id} className="flex items-center justify-between gap-3 p-3 bg-secondary/30 rounded-lg">
                  <div>
                    <p className="font-semibold text-sm">{client.nome}</p>
                    <p className="text-xs text-muted-foreground">{client.regional} · {client.executivo}</p>
                  </div>
                  <span className="font-mono text-sm font-semibold">{formatCurrency(client.compensacao)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhum parcelamento ativo.</p>
          )}
        </div>
      </div>

      {cobrancaAndamento.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 font-display">Cobrança em Andamento ({cobrancaAndamento.length})</h3>
          <div className="grid gap-3">
            {cobrancaAndamento.map(client => (
              <div key={client.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-link/15 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-4 w-4 text-link" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{client.nome}</p>
                    <p className="text-xs text-muted-foreground">{client.regional} · {client.executivo}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      Comp: {formatCurrency(client.compensacao)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={client.situacao} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecuperacoesPage;
