import { AlertTriangle, CheckCircle2, DollarSign, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/data/mockData';

interface KpiCardsProps {
  totalInadimplente: number;
  totalRecuperado: number;
  pagamentosEmAberto: number;
  pagamentosQuitados: number;
}

const KpiCards = ({
  totalInadimplente,
  totalRecuperado,
  pagamentosEmAberto,
  pagamentosQuitados,
}: KpiCardsProps) => {
  const kpis = [
    {
      label: 'Total Inadimplente',
      value: formatCurrency(totalInadimplente),
      icon: DollarSign,
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-100',
    },
    {
      label: 'Total Recuperado',
      value: formatCurrency(totalRecuperado),
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-100',
    },
    {
      label: 'Pagamentos em Aberto',
      value: pagamentosEmAberto.toString(),
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-50 border-orange-100',
    },
    {
      label: 'Pagamentos Quitados',
      value: pagamentosQuitados.toString(),
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={`p-5 rounded-xl border transition-all duration-300 hover:shadow-md ${kpi.bg}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-tight">
              {kpi.label}
            </span>
            <kpi.icon className={`h-5 w-5 ${kpi.color} shrink-0`} />
          </div>
          <p className={`text-xl font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
        </div>
      ))}
    </div>
  );
};

export default KpiCards;
