import { DollarSign, Users, TrendingUp, AlertTriangle, CreditCard, Smartphone, UserPlus } from 'lucide-react';
import { Client, formatCurrency } from '@/data/mockData';

interface KpiCardsProps {
  clients?: Client[];
}

const KpiCards = ({ clients: clientsProp }: KpiCardsProps) => {
  // If no clients passed, import all
  const clients = clientsProp ?? [];

  const totalCompensacao = clients.reduce((s, c) => s + c.compensacao, 0);
  const totalBoleto = clients.reduce((s, c) => s + c.boletoVitbank, 0);
  const totalPix = clients.reduce((s, c) => s + c.pixMonetali, 0);
  const totalJuros = clients.reduce((s, c) => s + c.juros, 0);
  const naoPagos = clients.filter(c => c.situacao === 'PENDENTE' || c.situacao === 'NÃO INICIADO').length;
  const criticalCount = clients.filter(c => c.diasAtraso > 90).length;
  const novosCadastros = clients.length;

  const kpis = [
    { label: 'Total Compensação', value: formatCurrency(totalCompensacao), icon: DollarSign, color: 'text-overdue' },
    { label: 'Total VitBank', value: formatCurrency(totalBoleto), icon: CreditCard, color: 'text-partial' },
    { label: 'Total Monetali', value: formatCurrency(totalPix), icon: Smartphone, color: 'text-recovered' },
    { label: 'Total Juros', value: formatCurrency(totalJuros), icon: TrendingUp, color: 'text-negotiation' },
    { label: 'Não Pagos', value: naoPagos.toString(), icon: AlertTriangle, color: 'text-legal' },
    { label: 'Crítico (>90d)', value: criticalCount.toString(), icon: Users, color: 'text-overdue' },
    { label: 'Clientes', value: novosCadastros.toString(), icon: UserPlus, color: 'text-primary' },
  ];

  if (clients.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-tight">{kpi.label}</span>
              <kpi.icon className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            </div>
            <p className="text-lg font-bold font-mono text-muted-foreground/40">—</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="glass-card p-4 group hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-tight">{kpi.label}</span>
            <kpi.icon className={`h-4 w-4 ${kpi.color} shrink-0`} />
          </div>
          <p className={`text-lg font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
        </div>
      ))}
    </div>
  );
};

export default KpiCards;
