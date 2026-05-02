import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, Calendar, ArrowRight, Clock, AlertTriangle, TrendingDown,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend, CartesianGrid,
} from 'recharts';
import {
  useAgendaRecebimentos,
  type EmpresaFiltro,
  type StatusFiltro,
  type FiltrosAgenda,
  type AgendaItem,
  type ResumoBucket,
} from '@/hooks/useAgendaRecebimentos';

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function endOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
}

function fmtCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCompact(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function fmtDateBR(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR');
}

function fmtDateChart(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const STATUS_LABEL: Record<string, string> = {
  em_aberto: 'Em aberto',
  em_andamento: 'Em andamento',
  parcial: 'Parcial',
  pago: 'Pago',
  parcelado: 'Parcelado',
  cancelado: 'Cancelado',
  nao_iniciado: 'Não iniciado',
};

function statusBadgeColor(status: string, categoria: string): string {
  if (categoria === 'vencido') return 'bg-red-100 text-red-800 border-red-200';
  if (status === 'parcial') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function rowBg(categoria: string): string {
  switch (categoria) {
    case 'vencido':     return 'bg-red-50/70 hover:bg-red-100';
    case 'hoje':        return 'bg-amber-50/70 hover:bg-amber-100';
    case 'proximos_7':  return 'bg-blue-50/40 hover:bg-blue-100/60';
    default:            return 'hover:bg-secondary/30';
  }
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { qtd_pagamentos: number; data: string } }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const total = payload.reduce((s, p) => s + Number(p.value || 0), 0);
  const qtd = payload[0]?.payload?.qtd_pagamentos ?? 0;
  return (
    <div className="bg-card border border-border shadow-lg rounded-lg p-3 text-xs space-y-1">
      <p className="font-mono font-semibold">{label && fmtDateBR(label)}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.name === 'VitBank' ? '#3b82f6' : '#f97316' }}>
          {p.name}: <span className="font-mono">{fmtCurrency(Number(p.value || 0))}</span>
        </p>
      ))}
      <div className="border-t border-border pt-1 mt-1">
        <p className="font-semibold">Total: <span className="font-mono">{fmtCurrency(total)}</span></p>
        <p className="text-muted-foreground">{qtd} pagamento(s)</p>
      </div>
    </div>
  );
}

interface CardProps {
  titulo: string;
  bucket: ResumoBucket;
  cor: 'red' | 'amber' | 'blue' | 'emerald';
  showSplit?: boolean;
  destaque?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
}

function ResumoCard({ titulo, bucket, cor, showSplit, destaque, onClick, icon }: CardProps) {
  const colorMap = {
    red:     { border: 'border-l-red-500',     bg: 'bg-red-50/40',     text: 'text-red-700',     pill: 'bg-red-100 text-red-700' },
    amber:   { border: 'border-l-amber-500',   bg: 'bg-amber-50/40',   text: 'text-amber-700',   pill: 'bg-amber-100 text-amber-700' },
    blue:    { border: 'border-l-blue-500',    bg: 'bg-blue-50/40',    text: 'text-blue-700',    pill: 'bg-blue-100 text-blue-700' },
    emerald: { border: 'border-l-emerald-500', bg: 'bg-emerald-50/40', text: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700' },
  } as const;
  const c = colorMap[cor];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border border-border bg-card border-l-4 ${c.border} p-4 ${c.bg} hover:shadow-md transition-all ${destaque && bucket.qtd > 0 ? 'ring-2 ring-red-400/60 animate-pulse' : ''}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className={`text-[10px] font-semibold uppercase tracking-wider ${c.text}`}>{titulo}</p>
        {icon}
      </div>
      <p className={`text-2xl font-mono font-bold ${c.text} mb-0.5`}>{bucket.qtd}</p>
      <p className="text-sm font-mono font-semibold tabular-nums">{fmtCurrency(bucket.total)}</p>
      {showSplit && (
        <div className="mt-2 pt-2 border-t border-border/40 space-y-0.5 text-[11px]">
          <div className="flex justify-between"><span className="text-blue-700">VB</span><span className="font-mono">{fmtCurrency(bucket.total_vb)}</span></div>
          <div className="flex justify-between"><span className="text-orange-600">Mon</span><span className="font-mono">{fmtCurrency(bucket.total_mon)}</span></div>
        </div>
      )}
    </button>
  );
}

function DiasBadge({ dias }: { dias: number }) {
  if (dias < 0) return <span className="inline-block px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">{Math.abs(dias)}d atraso</span>;
  if (dias === 0) return <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">vence hoje</span>;
  if (dias <= 7) return <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">em {dias}d</span>;
  return <span className="text-[10px] text-muted-foreground">em {dias}d</span>;
}

const AgendaPage = () => {
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState<FiltrosAgenda>({
    dataInicio: todayISO(),
    dataFim: todayISO(30),
    empresa: 'ambos',
    status: 'todos',
  });

  const { items, agregadoDia, resumo, loading, error, refetch } = useAgendaRecebimentos(filtros);

  const setQuickPeriodo = (de: string, ate: string) => setFiltros(f => ({ ...f, dataInicio: de, dataFim: ate }));

  const chartData = useMemo(() => agregadoDia, [agregadoDia]);

  const abrirCliente = (item: AgendaItem) => {
    // Navega pra inadimplentes com query+hash. InadimplentesPage le ?cliente=X e ClientDetail le #pagamento-Y
    navigate(`/inadimplentes?cliente=${encodeURIComponent(item.cliente_id)}#pagamento-${item.pagamento_id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Agenda de Recebimentos
        </h2>
      </div>

      {/* CARDS DE RESUMO */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="rounded-lg border border-border bg-card p-4 h-32 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ResumoCard
            titulo="Vencidos"
            bucket={resumo.vencidos}
            cor="red"
            showSplit
            destaque
            icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
            onClick={() => setFiltros(f => ({ ...f, status: 'vencido', dataInicio: '2020-01-01', dataFim: todayISO(-1) }))}
          />
          <ResumoCard
            titulo="Hoje"
            bucket={resumo.hoje}
            cor="amber"
            showSplit
            icon={<Clock className="h-4 w-4 text-amber-600" />}
            onClick={() => setFiltros(f => ({ ...f, status: 'todos', dataInicio: todayISO(), dataFim: todayISO() }))}
          />
          <ResumoCard
            titulo="Próximos 7 dias"
            bucket={resumo.proximos_7}
            cor="blue"
            icon={<TrendingDown className="h-4 w-4 text-blue-600" />}
            onClick={() => setFiltros(f => ({ ...f, status: 'todos', dataInicio: todayISO(1), dataFim: todayISO(7) }))}
          />
          <ResumoCard
            titulo="Próximos 30 dias"
            bucket={resumo.proximos_30}
            cor="emerald"
            icon={<TrendingDown className="h-4 w-4 text-emerald-600" />}
            onClick={() => setFiltros(f => ({ ...f, status: 'todos', dataInicio: todayISO(1), dataFim: todayISO(30) }))}
          />
        </div>
      )}

      {/* FILTROS */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">De</label>
            <input
              type="date"
              value={filtros.dataInicio}
              onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value }))}
              className="px-3 py-1.5 text-sm bg-secondary/40 border border-border rounded-lg"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Até</label>
            <input
              type="date"
              value={filtros.dataFim}
              onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value }))}
              className="px-3 py-1.5 text-sm bg-secondary/40 border border-border rounded-lg"
            />
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setQuickPeriodo(todayISO(), todayISO())}      className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted">Hoje</button>
            <button onClick={() => setQuickPeriodo(todayISO(), todayISO(7))}     className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted">7 dias</button>
            <button onClick={() => setQuickPeriodo(todayISO(), todayISO(30))}    className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted">30 dias</button>
            <button onClick={() => setQuickPeriodo(todayISO(), endOfMonthISO())} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted">Este mês</button>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Empresa</label>
            <select
              value={filtros.empresa}
              onChange={e => setFiltros(f => ({ ...f, empresa: e.target.value as EmpresaFiltro }))}
              className="px-3 py-1.5 text-sm bg-secondary/40 border border-border rounded-lg"
            >
              <option value="ambos">Ambos</option>
              <option value="vitbank">VitBank</option>
              <option value="monetali">Monetali</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Status</label>
            <select
              value={filtros.status}
              onChange={e => setFiltros(f => ({ ...f, status: e.target.value as StatusFiltro }))}
              className="px-3 py-1.5 text-sm bg-secondary/40 border border-border rounded-lg"
            >
              <option value="todos">Todos</option>
              <option value="em_aberto">Em aberto</option>
              <option value="parcial">Parcial</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>
          <button
            onClick={refetch}
            className="ml-auto px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* GRÁFICO */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Previsão diária</h3>
        {loading ? (
          <div className="h-[280px] bg-muted/30 animate-pulse rounded" />
        ) : chartData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
            Sem dados no período selecionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="data"
                tickFormatter={fmtDateChart}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtCompact}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine x={todayISO()} stroke="hsl(var(--primary))" strokeDasharray="4 4" label={{ value: 'Hoje', position: 'top', fill: 'hsl(var(--primary))', fontSize: 11 }} />
              {(filtros.empresa === 'ambos' || filtros.empresa === 'vitbank') && (
                <Bar dataKey="total_vitbank" stackId="empresa" fill="#3b82f6" name="VitBank" radius={filtros.empresa === 'vitbank' ? [4,4,0,0] : [0,0,0,0]} />
              )}
              {(filtros.empresa === 'ambos' || filtros.empresa === 'monetali') && (
                <Bar dataKey="total_monetali" stackId="empresa" fill="#f97316" name="Monetali" radius={[4,4,0,0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* LISTA DE PAGAMENTOS */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Pagamentos do período {!loading && <span className="text-xs text-foreground/70">({items.length})</span>}
        </h3>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 mb-3 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted/30 animate-pulse rounded" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Nenhum pagamento a vencer no período selecionado.<br />Tente ampliar o filtro de datas.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/50">
            <table className="w-full text-xs">
              <thead className="bg-secondary/30">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">Data Vcto</th>
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">Cliente</th>
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">Imposto</th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider text-muted-foreground">Compensação</th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider text-blue-700">VitBank</th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider text-orange-600">Monetali</th>
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-center font-semibold uppercase tracking-wider text-muted-foreground w-24">Ação</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr
                    key={`${it.pagamento_id}-${it.empresa}`}
                    className={`border-t border-border/40 cursor-pointer transition-colors ${rowBg(it.categoria)}`}
                    onClick={() => abrirCliente(it)}
                  >
                    <td className="px-3 py-2">
                      <div className="font-mono">{fmtDateBR(it.data_vencimento)}</div>
                      <div className="mt-0.5"><DiasBadge dias={it.dias_ate_vencimento} /></div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{it.cliente_nome}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {[it.cliente_regional, it.cliente_executivo].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-mono text-muted-foreground">{it.descricao || '—'}</div>
                      {it.mes_referencia && <div className="text-[10px] text-muted-foreground">{it.mes_referencia}</div>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{fmtCurrency(Number(it.compensacao) || 0)}</td>
                    <td className="px-3 py-2 text-right font-mono text-blue-700">
                      {it.empresa === 'vitbank' ? fmtCurrency(Number(it.valor) || 0) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-orange-600">
                      {it.empresa === 'monetali' ? fmtCurrency(Number(it.valor) || 0) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBadgeColor(it.pagamento_status, it.categoria)}`}>
                        {it.categoria === 'vencido' ? 'Vencido' : (STATUS_LABEL[it.pagamento_status] || it.pagamento_status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); abrirCliente(it); }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border border-border text-foreground hover:bg-muted"
                      >
                        Abrir <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgendaPage;
