import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import { formatCurrency, type Situacao } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import type { Client } from '@/data/mockData';

interface GroupData {
  nome: string;
  total: number;
  vitbank: number;
  monetali: number;
  qtd: number;
  clientes: Client[];
}

interface ExpandableBarChartProps {
  title: string;
  data: GroupData[];
  barColor: string;
  barColorHover?: string;
  topN?: number;
}

const formatCompact = (value: number): string => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return formatCurrency(value);
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-foreground mb-1">{d.nome}</p>
      <p className="text-muted-foreground">Total: <span className="text-foreground font-medium">{formatCurrency(d.total)}</span></p>
      <p className="text-muted-foreground">{d.qtd} cliente{d.qtd !== 1 ? 's' : ''}</p>
    </div>
  );
};

const ClientRow = ({ client, index }: { client: Client; index: number }) => (
  <tr className={`${index % 2 === 0 ? 'bg-transparent' : 'bg-muted/30'} hover:bg-muted/50 transition-colors`}>
    <td className="py-2 px-3 text-sm font-medium text-foreground max-w-[200px] truncate" title={client.nome}>
      {client.nome}
    </td>
    <td className="py-2 px-3">
      <StatusBadge status={client.situacao} />
    </td>
    <td className="py-2 px-3 text-sm text-right font-mono tabular-nums text-foreground">
      {formatCurrency(client.boletoVitbank)}
    </td>
    <td className="py-2 px-3 text-sm text-right font-mono tabular-nums text-foreground">
      {formatCurrency(client.pixMonetali)}
    </td>
    <td className="py-2 px-3 text-sm text-right font-semibold font-mono tabular-nums text-foreground">
      {formatCurrency(client.compensacao)}
    </td>
  </tr>
);

const GroupDetail = ({ group, isOpen, onToggle }: { group: GroupData; isOpen: boolean; onToggle: () => void }) => {
  const [showAll, setShowAll] = useState(false);
  const visibleClients = showAll ? group.clientes : group.clientes.slice(0, 5);
  const hasMore = group.clientes.length > 5;

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-foreground">{group.nome}</span>
          <span className="text-xs text-muted-foreground">—</span>
          <span className="text-sm font-medium text-foreground">{formatCompact(group.total)}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {group.qtd}
          </span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {isOpen && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">VitBank</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monetali</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {visibleClients.map((c, i) => (
                <ClientRow key={c.id} client={c} index={i} />
              ))}
            </tbody>
          </table>
          {hasMore && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowAll(!showAll); }}
              className="w-full py-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors border-t border-border/40"
            >
              {showAll ? 'Recolher' : `Ver todos (${group.clientes.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const ExpandableBarChart = ({ title, data, barColor, topN = 10 }: ExpandableBarChartProps) => {
  const [expanded, setExpanded] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showAllBars, setShowAllBars] = useState(false);

  const chartData = useMemo(() => {
    const sliced = showAllBars ? data : data.slice(0, topN);
    return sliced.map(d => ({
      ...d,
      label: `${d.nome}  (${d.qtd})`,
    }));
  }, [data, topN, showAllBars]);

  const chartHeight = Math.max(200, chartData.length * 44);

  if (data.length === 0) return null;

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider font-display">
          {title}{expanded ? ' — Detalhado' : ''}
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-primary/5"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? 'Recolher' : 'Expandir'}
        </button>
      </div>

      {/* Compact view — Bar chart */}
      {!expanded && (
        <div className="px-5 pb-5">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={chartData} layout="vertical" barSize={22} margin={{ left: 0, right: 16 }}>
              <XAxis
                type="number"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => formatCompact(v).replace('R$ ', 'R$')}
              />
              <YAxis
                type="category"
                dataKey="nome"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={barColor} fillOpacity={1 - (i * 0.04)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {data.length > topN && !showAllBars && (
            <button
              onClick={() => setShowAllBars(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              +{data.length - topN} mais...
            </button>
          )}
        </div>
      )}

      {/* Expanded view — Detailed tables per group */}
      {expanded && (
        <div className="px-5 pb-5 space-y-2">
          {data.map(group => (
            <GroupDetail
              key={group.nome}
              group={group}
              isOpen={expandedItem === group.nome}
              onToggle={() => setExpandedItem(expandedItem === group.nome ? null : group.nome)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpandableBarChart;
