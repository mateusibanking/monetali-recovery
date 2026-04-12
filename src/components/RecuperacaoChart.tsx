import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useRecuperacaoMensal } from '@/hooks/useRecuperacaoMensal';
import { formatCurrency } from '@/data/mockData';

/** Converte "2025-01" → "Jan/25" */
function formatMesLabel(mes: string): string {
  if (!mes || mes.length < 7) return mes;
  const [year, month] = mes.split('-');
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const idx = parseInt(month, 10) - 1;
  return `${meses[idx] || month}/${year.slice(2)}`;
}

const tooltipStyle = {
  contentStyle: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#333' },
  labelStyle: { color: '#6b7280' },
};

const RecuperacaoChart = () => {
  const { data, loading, error } = useRecuperacaoMensal();

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="h-6 w-48 bg-muted/50 rounded animate-pulse mb-4" />
        <div className="h-64 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 font-display">
          Recuperação Mensal
        </h3>
        <p className="text-sm text-muted-foreground text-center py-8">
          {error || 'Nenhum dado de recuperação disponível.'}
        </p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    mes: formatMesLabel(d.mes_recuperacao),
    VITBANK: d.total_vitbank,
    MONETALI: d.total_monetali,
  }));

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 font-display">
        Recuperação Mensal
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} barGap={4}>
          <XAxis
            dataKey="mes"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            {...tooltipStyle}
            formatter={(v: number, name: string) => [formatCurrency(v), name]}
          />
          <Legend
            formatter={(value: string) => (
              <span style={{ color: '#333', fontSize: 12 }}>{value}</span>
            )}
          />
          <Bar dataKey="VITBANK" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="MONETALI" fill="#22c55e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RecuperacaoChart;
