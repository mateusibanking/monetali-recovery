import { clients, formatCurrency, parcelamentos } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import { CheckCircle, DollarSign, TrendingUp, Percent, CalendarDays } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const RecuperacoesPage = () => {
  const parcelados = clients.filter(c => c.situacao === 'PARCELADO');
  const cobrancaAndamento = clients.filter(c => c.situacao === 'COBRANÇA EM ANDAMENTO');

  const totalRecuperado = cobrancaAndamento.reduce((s, c) => s + c.compensacao, 0);
  const totalParcelamento = parcelados.reduce((s, c) => s + c.compensacao, 0);
  const taxaRecuperacao = ((cobrancaAndamento.length / clients.length) * 100).toFixed(1);

  const execMap = new Map<string, number>();
  cobrancaAndamento.forEach(c => {
    execMap.set(c.executivo, (execMap.get(c.executivo) || 0) + c.compensacao);
  });
  const execData = Array.from(execMap.entries())
    .map(([executivo, valor]) => ({ executivo: executivo.split(' ')[0], valor }))
    .sort((a, b) => b.valor - a.valor);

  // Parcelas esperadas por mês
  const monthMap = new Map<string, number>();
  parcelamentos.forEach(p => {
    p.parcelas.forEach(parc => {
      if (parc.status === 'Pendente') {
        monthMap.set(parc.mes, (monthMap.get(parc.mes) || 0) + parc.valor);
      }
    });
  });
  const parcelasMes = Array.from(monthMap.entries())
    .map(([mes, valor]) => {
      const [y, m] = mes.split('-');
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return { mes: `${monthNames[parseInt(m) - 1]}/${y}`, valor };
    })
    .sort((a, b) => a.mes.localeCompare(b.mes));

  const stats = [
    { label: 'Total em Cobrança', value: formatCurrency(totalRecuperado), icon: DollarSign, color: 'text-partial' },
    { label: 'Em Parcelamento', value: formatCurrency(totalParcelamento), icon: TrendingUp, color: 'text-negotiation' },
    { label: 'Taxa Cobrança em Andamento', value: `${taxaRecuperacao}%`, icon: Percent, color: 'text-primary' },
  ];

  const tooltipStyle = {
    contentStyle: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#1a1a1a' },
    labelStyle: { color: '#6b7280' },
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Recuperações & Parcelamentos</h2>

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
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Valor por Executivo (Cobrança em Andamento)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={execData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1_000_000).toFixed(1)}M`} />
              <YAxis type="category" dataKey="executivo" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                {execData.map((_, i) => (
                  <Cell key={i} fill="#3b82f6" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Parcelas esperadas por mês */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-negotiation" /> Parcelas Esperadas por Mês
          </h3>
          {parcelasMes.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={parcelasMes}>
                <XAxis dataKey="mes" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="valor" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhuma parcela pendente.</p>
          )}
        </div>
      </div>

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
                    <p className="text-xs text-muted-foreground">{client.regional} · {client.executivo}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      Comp: {formatCurrency(client.compensacao)} · Boleto VB: {formatCurrency(client.boletoVitbank)} · PIX: {formatCurrency(client.pixMonetali)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={client.situacao} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cobrança em Andamento ({cobrancaAndamento.length})</h3>
        <div className="grid gap-3">
          {cobrancaAndamento.map(client => (
            <div key={client.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-partial/15 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-4 w-4 text-partial" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{client.nome}</p>
                  <p className="text-xs text-muted-foreground">{client.regional} · {client.executivo}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    Comp: {formatCurrency(client.compensacao)} · Boleto VB: {formatCurrency(client.boletoVitbank)} · PIX: {formatCurrency(client.pixMonetali)}
                  </p>
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