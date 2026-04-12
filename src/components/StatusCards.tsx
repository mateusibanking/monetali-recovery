import { formatCurrency, situacaoLabels, type Situacao } from '@/data/mockData';
import type { StatusGroup } from '@/hooks/useDashboard';

interface StatusCardsProps {
  data: StatusGroup[];
  activeStatus: Situacao | null;
  onStatusClick: (status: Situacao | null) => void;
}

const STATUS_CONFIG: Record<string, { border: string; bg: string; accent: string; icon: string }> = {
  'EM ANDAMENTO':  { border: 'border-amber-400',   bg: 'bg-amber-50',    accent: 'text-amber-700',   icon: '🔄' },
  'NÃO INICIADO':  { border: 'border-gray-400',    bg: 'bg-gray-50',     accent: 'text-gray-600',    icon: '⏳' },
  'PENDENTE':      { border: 'border-orange-400',   bg: 'bg-orange-50',   accent: 'text-orange-700',  icon: '⏸' },
  'PAGO':          { border: 'border-emerald-400',  bg: 'bg-emerald-50',  accent: 'text-emerald-700', icon: '✅' },
  'PARCELADO':     { border: 'border-blue-400',     bg: 'bg-blue-50',     accent: 'text-blue-700',    icon: '📋' },
  'DISTRATO':      { border: 'border-red-400',      bg: 'bg-red-50',      accent: 'text-red-700',     icon: '🚫' },
  'CANCELADO':     { border: 'border-red-800',      bg: 'bg-red-50',      accent: 'text-red-900',     icon: '❌' },
  'CONTATADO':     { border: 'border-cyan-400',     bg: 'bg-cyan-50',     accent: 'text-cyan-700',    icon: '📞' },
  'EM NEGOCIAÇÃO': { border: 'border-indigo-400',   bg: 'bg-indigo-50',   accent: 'text-indigo-700',  icon: '🤝' },
  'ACORDO FECHADO':{ border: 'border-teal-400',     bg: 'bg-teal-50',     accent: 'text-teal-700',    icon: '🎯' },
  'JURÍDICO':      { border: 'border-purple-400',   bg: 'bg-purple-50',   accent: 'text-purple-700',  icon: '⚖️' },
  'SUSPENSO':      { border: 'border-violet-400',   bg: 'bg-violet-50',   accent: 'text-violet-700',  icon: '🔒' },
};

const DISPLAY_ORDER: Situacao[] = [
  'EM ANDAMENTO', 'NÃO INICIADO', 'PENDENTE', 'PAGO', 'PARCELADO', 'DISTRATO',
  'CANCELADO', 'CONTATADO', 'EM NEGOCIAÇÃO', 'ACORDO FECHADO', 'JURÍDICO', 'SUSPENSO',
];

const fallbackConfig = { border: 'border-gray-300', bg: 'bg-gray-50', accent: 'text-gray-600', icon: '📌' };

const StatusCards = ({ data, activeStatus, onStatusClick }: StatusCardsProps) => {
  // Sort by display order, only show statuses with data
  const statusMap = new Map(data.map(s => [s.situacao, s]));
  const sorted = DISPLAY_ORDER.filter(s => statusMap.has(s)).map(s => statusMap.get(s)!);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {sorted.map(s => {
        const cfg = STATUS_CONFIG[s.situacao] || fallbackConfig;
        const isActive = activeStatus === s.situacao;
        return (
          <button
            key={s.situacao}
            onClick={() => onStatusClick(isActive ? null : s.situacao)}
            className={`
              relative rounded-lg border-2 p-3 text-left transition-all duration-200
              hover:shadow-md hover:-translate-y-0.5
              ${isActive
                ? `${cfg.border} ${cfg.bg} shadow-md ring-2 ring-offset-1 ring-primary/20`
                : `border-border/60 bg-card hover:${cfg.bg}`
              }
            `}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-semibold uppercase tracking-wide ${isActive ? cfg.accent : 'text-muted-foreground'}`}>
                {situacaoLabels[s.situacao] || s.situacao}
              </span>
            </div>
            <div className={`text-2xl font-bold tabular-nums ${isActive ? cfg.accent : 'text-foreground'}`}>
              {s.value}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 font-mono tabular-nums">
              {formatCurrency(s.total)}
            </div>
            {isActive && (
              <div className={`absolute top-0 left-0 w-full h-0.5 rounded-t-lg ${cfg.border.replace('border-', 'bg-')}`} />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default StatusCards;
