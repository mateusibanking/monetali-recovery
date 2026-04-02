import { DollarSign, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { clients, formatCurrency } from '@/data/mockData';

const KpiCards = () => {
  const totalOverdue = clients.filter(c => c.status !== 'recovered').reduce((s, c) => s + c.totalOwed, 0);
  const totalClients = clients.filter(c => c.status !== 'recovered').length;
  const recoveredCount = clients.filter(c => c.status === 'recovered').length;
  const recoveryRate = Math.round((recoveredCount / clients.length) * 100);
  const criticalCount = clients.filter(c => c.daysOverdue > 60).length;

  const kpis = [
    { label: 'Total Inadimplente', value: formatCurrency(totalOverdue), icon: DollarSign, color: 'text-overdue' },
    { label: 'Clientes em Atraso', value: totalClients.toString(), icon: Users, color: 'text-negotiation' },
    { label: 'Taxa de Recuperação', value: `${recoveryRate}%`, icon: TrendingUp, color: 'text-recovered' },
    { label: 'Situação Crítica (>60d)', value: criticalCount.toString(), icon: AlertTriangle, color: 'text-legal' },
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
