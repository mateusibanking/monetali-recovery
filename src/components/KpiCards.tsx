import { DollarSign, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { clients, formatCurrency } from '@/data/mockData';

const KpiCards = () => {
  const totalCompensacao = clients.reduce((s, c) => s + c.compensacao, 0);
  const totalJuros = clients.reduce((s, c) => s + c.juros, 0);
  const naoPagos = clients.filter(c => c.situacao === 'NÃO PAGO').length;
  const criticalCount = clients.filter(c => c.diasAtraso > 90).length;

  const kpis = [
    { label: 'Total Compensação', value: formatCurrency(totalCompensacao), icon: DollarSign, color: 'text-overdue' },
    { label: 'Total Juros', value: formatCurrency(totalJuros), icon: TrendingUp, color: 'text-negotiation' },
    { label: 'Não Pagos', value: naoPagos.toString(), icon: AlertTriangle, color: 'text-legal' },
    { label: 'Crítico (>90d)', value: criticalCount.toString(), icon: Users, color: 'text-recovered' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="glass-card p-5 group hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
            <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
          </div>
          <p className={`text-2xl font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
        </div>
      ))}
    </div>
  );
};

export default KpiCards;
