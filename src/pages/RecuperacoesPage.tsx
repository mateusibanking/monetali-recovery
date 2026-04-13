import { useState, useEffect, useMemo, useCallback } from 'react';
import { formatCurrency, type Situacao, situacaoLabels } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import StatusBadge from '@/components/StatusBadge';
import MonthSelector, { DEFAULT_MONTH } from '@/components/MonthSelector';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import {
  CheckCircle, DollarSign, TrendingUp, Percent, Filter,
  ChevronDown, ChevronRight, AlertCircle, Clock, Gavel, FileX, Ban, Users,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ─── Types ──────────────────────────────────────────────────────
interface PagamentoRow {
  id: string;
  cliente_id: string;
  vitbank: number | null;
  monetali: number | null;
  valor_pago_vitbank: number | null;
  valor_pago_monetali: number | null;
  valor_compensacao: number | null;
  vcto_vitbank: string | null;
  vcto_monetali: string | null;
  pgto_vitbank: string | null;
  pgto_monetali: string | null;
  status: string;
  valor: number;
  clientes: {
    nome: string;
    regional: string | null;
    executivo_responsavel: string | null;
    status: string;
  };
}

interface ClienteAgrupado {
  id: string;
  nome: string;
  regional: string;
  executivo: string;
  situacao: Situacao;
  totalVitbank: number;
  totalMonetali: number;
  totalComp: number;
  qtdPagamentos: number;
}

interface SecaoStatus {
  key: string;
  label: string;
  situacao: Situacao;
  icon: typeof CheckCircle;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  clientes: ClienteAgrupado[];
  total: number;
}

// ─── Status mapping ─────────────────────────────────────────────
const DB_STATUS_MAP: Record<string, Situacao> = {
  nao_iniciado: 'NÃO INICIADO',
  em_andamento: 'EM ANDAMENTO',
  pendente: 'PENDENTE',
  contatado: 'CONTATADO',
  em_negociacao: 'EM NEGOCIAÇÃO',
  acordo_fechado: 'ACORDO FECHADO',
  pago: 'PAGO',
  juridico: 'JURÍDICO',
  parcelado: 'PARCELADO',
  distrato: 'DISTRATO',
  cancelado: 'CANCELADO',
  suspenso: 'SUSPENSO',
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos os Status' },
  { value: 'PAGO', label: 'Pago' },
  { value: 'EM ANDAMENTO', label: 'Em Andamento' },
  { value: 'PARCELADO', label: 'Parcelado' },
  { value: 'NÃO INICIADO', label: 'Não Iniciado' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'CONTATADO', label: 'Contatado' },
  { value: 'EM NEGOCIAÇÃO', label: 'Em Negociação' },
  { value: 'ACORDO FECHADO', label: 'Acordo Fechado' },
  { value: 'JURÍDICO', label: 'Jurídico' },
  { value: 'DISTRATO', label: 'Distrato' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

const n = (v: number | null | undefined): number => Number(v) || 0;

const SECTION_CONFIG: Record<string, { icon: typeof CheckCircle; accent: string; bg: string; border: string }> = {
  'PAGO':           { icon: CheckCircle,   accent: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'EM ANDAMENTO':   { icon: Clock,         accent: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  'PARCELADO':      { icon: DollarSign,    accent: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  'NÃO INICIADO':   { icon: AlertCircle,   accent: 'text-gray-600',    bg: 'bg-gray-50',    border: 'border-gray-200' },
  'PENDENTE':       { icon: Clock,         accent: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  'CONTATADO':      { icon: Users,         accent: 'text-cyan-700',    bg: 'bg-cyan-50',    border: 'border-cyan-200' },
  'EM NEGOCIAÇÃO':  { icon: TrendingUp,    accent: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  'ACORDO FECHADO': { icon: CheckCircle,   accent: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200' },
  'JURÍDICO':       { icon: Gavel,         accent: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  'DISTRATO':       { icon: FileX,         accent: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200' },
  'CANCELADO':      { icon: Ban,           accent: 'text-red-900',     bg: 'bg-red-50',     border: 'border-red-200' },
};

const SECTION_ORDER: Situacao[] = [
  'PAGO', 'EM ANDAMENTO', 'PARCELADO', 'NÃO INICIADO', 'PENDENTE',
  'CONTATADO', 'EM NEGOCIAÇÃO', 'ACORDO FECHADO', 'JURÍDICO', 'DISTRATO', 'CANCELADO',
];

const tooltipStyle = {
  contentStyle: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#333' },
  labelStyle: { color: '#6b7280' },
};

// ═════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════
const RecuperacoesPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(DEFAULT_MONTH);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [pagamentos, setPagamentos] = useState<PagamentoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'PAGO': true,
  });

  // ─── Fetch pagamentos with client join ────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('pagamentos_atraso')
        .select('id, cliente_id, vitbank, monetali, valor_pago_vitbank, valor_pago_monetali, valor_compensacao, vcto_vitbank, vcto_monetali, pgto_vitbank, pgto_monetali, status, valor, clientes!inner(nome, regional, executivo_responsavel, status)')
        .is('deleted_at', null);

      // Month filter: filter by pgto_vitbank/pgto_monetali OR vcto_vitbank/vcto_monetali
      if (selectedMonth !== 'todos') {
        const inicioMes = selectedMonth + '-01';
        const fimMes = selectedMonth + '-31';
        // Include pagamentos that have activity in this month:
        // - paid in this month (pgto_vitbank or pgto_monetali)
        // - due in this month (vcto_vitbank or vcto_monetali)
        query = query.or(
          `pgto_vitbank.gte.${inicioMes},pgto_monetali.gte.${inicioMes},vcto_vitbank.gte.${inicioMes},vcto_monetali.gte.${inicioMes}`
        );
        query = query.or(
          `pgto_vitbank.lte.${fimMes},pgto_monetali.lte.${fimMes},vcto_vitbank.lte.${fimMes},vcto_monetali.lte.${fimMes}`
        );
      }

      const { data, error: err } = await query;
      if (err) throw err;

      setPagamentos((data || []) as PagamentoRow[]);
    } catch (err: any) {
      console.error('RecuperacoesPage fetch error:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Aggregate pagamentos into clients by status ──────────────
  const clientesPorStatus = useMemo(() => {
    // Group pagamentos by cliente_id
    const map = new Map<string, ClienteAgrupado>();

    for (const p of pagamentos) {
      const cli = p.clientes;
      if (!cli) continue;

      const situacao = DB_STATUS_MAP[cli.status] || 'NÃO INICIADO';
      const key = p.cliente_id;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          nome: cli.nome,
          regional: cli.regional || '',
          executivo: cli.executivo_responsavel || '',
          situacao,
          totalVitbank: 0,
          totalMonetali: 0,
          totalComp: 0,
          qtdPagamentos: 0,
        });
      }

      const c = map.get(key)!;
      c.totalVitbank += n(p.vitbank);
      c.totalMonetali += n(p.monetali);
      c.totalComp += n(p.valor_compensacao) || n(p.valor);
      c.qtdPagamentos += 1;
    }

    return Array.from(map.values());
  }, [pagamentos]);

  // ─── Build sections ───────────────────────────────────────────
  const sections = useMemo(() => {
    const filtered = statusFilter === 'todos'
      ? clientesPorStatus
      : clientesPorStatus.filter(c => c.situacao === statusFilter);

    const result: SecaoStatus[] = [];

    for (const sit of SECTION_ORDER) {
      const clientes = filtered
        .filter(c => c.situacao === sit)
        .sort((a, b) => b.totalComp - a.totalComp);

      if (clientes.length === 0) continue;

      const cfg = SECTION_CONFIG[sit] || SECTION_CONFIG['NÃO INICIADO'];
      const total = clientes.reduce((s, c) => s + c.totalComp, 0);

      result.push({
        key: sit,
        label: situacaoLabels[sit] || sit,
        situacao: sit,
        icon: cfg.icon,
        accentColor: cfg.accent,
        bgColor: cfg.bg,
        borderColor: cfg.border,
        clientes,
        total,
      });
    }

    return result;
  }, [clientesPorStatus, statusFilter]);

  // ─── KPIs filtered by month ───────────────────────────────────
  const kpis = useMemo(() => {
    let totalPago = 0;
    let totalCobranca = 0;
    let totalParcelamento = 0;
    let totalGeral = 0;

    for (const p of pagamentos) {
      const sit = DB_STATUS_MAP[p.clientes?.status || ''] || 'NÃO INICIADO';
      const valorPago = (p.pgto_vitbank ? (n(p.valor_pago_vitbank) || n(p.vitbank)) : 0)
                      + (p.pgto_monetali ? (n(p.valor_pago_monetali) || n(p.monetali)) : 0);
      const valorDevido = n(p.vitbank) + n(p.monetali);

      totalGeral += valorDevido;

      if (sit === 'PAGO' || p.pgto_vitbank || p.pgto_monetali) {
        totalPago += valorPago;
      }
      if (sit === 'EM ANDAMENTO' || sit === 'PENDENTE' || sit === 'CONTATADO' || sit === 'EM NEGOCIAÇÃO') {
        totalCobranca += valorDevido;
      }
      if (sit === 'PARCELADO') {
        totalParcelamento += valorDevido;
      }
    }

    const taxa = totalGeral > 0 ? ((totalPago / totalGeral) * 100).toFixed(1) : '0';

    return { totalPago, totalCobranca, totalParcelamento, taxa };
  }, [pagamentos]);

  // ─── Executivo chart data ─────────────────────────────────────
  const execData = useMemo(() => {
    const cobranca = clientesPorStatus.filter(c =>
      c.situacao === 'EM ANDAMENTO' || c.situacao === 'PENDENTE' || c.situacao === 'CONTATADO' || c.situacao === 'EM NEGOCIAÇÃO'
    );
    const execMap = new Map<string, number>();
    cobranca.forEach(c => {
      execMap.set(c.executivo, (execMap.get(c.executivo) || 0) + c.totalComp);
    });
    return Array.from(execMap.entries())
      .map(([executivo, valor]) => ({ executivo: executivo.split(' ')[0], valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [clientesPorStatus]);

  // ─── Toggle section ───────────────────────────────────────────
  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ─── Render ───────────────────────────────────────────────────
  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar dados</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const stats = [
    { label: 'Total Pago', value: formatCurrency(kpis.totalPago), icon: CheckCircle, color: 'text-emerald-700', borderColor: 'border-l-emerald-500', bgColor: 'bg-emerald-50/50' },
    { label: 'Total em Cobranca', value: formatCurrency(kpis.totalCobranca), icon: DollarSign, color: 'text-blue-700', borderColor: 'border-l-blue-500', bgColor: 'bg-blue-50/50' },
    { label: 'Em Parcelamento', value: formatCurrency(kpis.totalParcelamento), icon: TrendingUp, color: 'text-amber-700', borderColor: 'border-l-amber-500', bgColor: 'bg-amber-50/50' },
    { label: 'Taxa de Recuperacao', value: `${kpis.taxa}%`, icon: Percent, color: 'text-primary', borderColor: 'border-l-primary', bgColor: 'bg-primary/5' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">Recuperacoes & Parcelamentos</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-secondary/50 border border-border/50 rounded-lg text-sm px-3 py-2 text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer min-w-[180px]"
            >
              {STATUS_FILTERS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <MonthSelector selected={selectedMonth} onChange={setSelectedMonth} showTodos />
        </div>
      </div>

      {/* KPI Cards with left border accent */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border border-border/60 border-l-4 ${s.borderColor} ${s.bgColor} p-5 transition-all duration-200 hover:shadow-md`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className={`text-2xl font-bold font-mono tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart + Parcelados grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Valor por Executivo (Cobranca)</h3>
          {execData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={execData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1_000_000).toFixed(1)}M`} />
                <YAxis type="category" dataKey="executivo" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {execData.map((_, i) => <Cell key={i} fill="#316AB4" fillOpacity={1 - (i * 0.06)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhum dado de cobranca para este periodo.</p>
          )}
        </div>

        {/* Summary card */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Resumo por Status</h3>
          <div className="space-y-3">
            {sections.map(sec => (
              <div key={sec.key} className={`flex items-center justify-between p-3 rounded-lg border ${sec.borderColor} ${sec.bgColor}`}>
                <div className="flex items-center gap-3">
                  <sec.icon className={`h-4 w-4 ${sec.accentColor}`} />
                  <span className={`text-sm font-medium ${sec.accentColor}`}>{sec.label}</span>
                  <span className="text-xs text-muted-foreground bg-white/80 px-2 py-0.5 rounded-full">{sec.clientes.length}</span>
                </div>
                <span className={`text-sm font-bold font-mono tabular-nums ${sec.accentColor}`}>
                  {formatCurrency(sec.total)}
                </span>
              </div>
            ))}
            {sections.length === 0 && (
              <p className="text-muted-foreground text-sm py-8 text-center">Nenhum dado para este periodo.</p>
            )}
          </div>
        </div>
      </div>

      {/* Expandable sections by status */}
      <div className="space-y-3">
        {sections.map(sec => {
          const isExpanded = expandedSections[sec.key] || false;
          const Icon = sec.icon;

          return (
            <div key={sec.key} className="glass-card overflow-hidden">
              {/* Section header — clickable */}
              <button
                onClick={() => toggleSection(sec.key)}
                className={`w-full flex items-center justify-between px-5 py-4 transition-colors duration-200 hover:bg-muted/30 ${isExpanded ? sec.bgColor : ''}`}
              >
                <div className="flex items-center gap-3">
                  {isExpanded
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  }
                  <Icon className={`h-4 w-4 ${sec.accentColor}`} />
                  <span className={`font-semibold text-sm uppercase tracking-wide ${sec.accentColor}`}>
                    {sec.label}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                    {sec.clientes.length}
                  </span>
                </div>
                <span className={`text-sm font-bold font-mono tabular-nums ${sec.accentColor}`}>
                  {formatCurrency(sec.total)}
                </span>
              </button>

              {/* Section content — client list */}
              {isExpanded && (
                <div className="border-t border-border/40">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/20 border-b border-border/40">
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Regional</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Executivo</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-blue-600 uppercase tracking-wider">VitBank</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-emerald-600 uppercase tracking-wider">Monetali</th>
                          <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sec.clientes.map((client, i) => (
                          <tr
                            key={client.id}
                            className={`border-b border-border/20 transition-colors duration-150 hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                          >
                            <td className="px-5 py-3">
                              <div>
                                <p className="font-medium text-foreground">{client.nome}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{client.qtdPagamentos} pagamento{client.qtdPagamentos !== 1 ? 's' : ''}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{client.regional}</td>
                            <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{client.executivo}</td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums text-blue-700">{formatCurrency(client.totalVitbank)}</td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-700">{formatCurrency(client.totalMonetali)}</td>
                            <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold">{formatCurrency(client.totalComp)}</td>
                            <td className="px-4 py-3 hidden sm:table-cell"><StatusBadge status={client.situacao} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sections.length === 0 && !loading && (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <AlertCircle className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Sem dados para este periodo</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Nenhum pagamento encontrado para o mes selecionado. Tente outro mes ou selecione "Todos".
          </p>
        </div>
      )}
    </div>
  );
};

export default RecuperacoesPage;
