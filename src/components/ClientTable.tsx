import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronRight, AlertCircle, Settings2, X, Upload } from 'lucide-react';
import { Client, Situacao, Flag, formatCurrency, situacaoLabels, situacaoColors } from '@/data/mockData';
import { useClientes } from '@/hooks/useClientes';
import { useFlags } from '@/hooks/useFlags';
import { useAtividades } from '@/hooks/useAtividades';
import StatusBadge from './StatusBadge';
import FlagBadge from './FlagBadge';
import Pagination from './Pagination';
import EmptyState from './EmptyState';
import LoadingSkeleton from './LoadingSkeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';

interface Props {
  onSelectClient: (client: Client) => void;
}

const ITEMS_PER_PAGE = 50;

const allSituacoes: Situacao[] = Object.keys(situacaoLabels) as Situacao[];
const AGING_RANGES = [
  { label: '0-30d', min: 0, max: 30 },
  { label: '31-60d', min: 31, max: 60 },
  { label: '61-90d', min: 61, max: 90 },
  { label: '90+', min: 91, max: Infinity },
];

type ColumnKey = 'cliente' | 'regional' | 'executivo' | 'compensacao' | 'inadimplente' | 'recuperado' | 'boletoVB' | 'pixMon' | 'dias' | 'situacao' | 'flags';
const columnLabels: Record<ColumnKey, string> = {
  cliente: 'Cliente', regional: 'Regional', executivo: 'Executivo', compensacao: 'Compensação',
  inadimplente: 'Inadimplente', recuperado: 'Recuperado',
  boletoVB: 'VITBANK', pixMon: 'MONETALI', dias: 'Dias', situacao: 'Situação', flags: 'Flags',
};

const DEFAULT_FLAGS: Flag[] = ['Prioridade', 'Juros', 'Sem Contato', 'Jurídico', 'Parcelamento', 'Promessa de Pgto'];

const ClientTable = ({ onSelectClient }: Props) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilters, setStatusFilters] = useState<Set<Situacao>>(new Set());
  const [regionalFilters, setRegionalFilters] = useState<Set<string>>(new Set());
  const [executivoFilters, setExecutivoFilters] = useState<Set<string>>(new Set());
  const [agingFilters, setAgingFilters] = useState<Set<number>>(new Set());
  const [flagFilters, setFlagFilters] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);

  const [sortField, setSortField] = useState<ColumnKey>('compensacao');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(Object.keys(columnLabels) as ColumnKey[]));
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);

  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);
  const [flagDropdown, setFlagDropdown] = useState<string | null>(null);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['status']));

  // --- Supabase hooks ---
  const { data: allClients, loading, error, update: updateCliente } = useClientes();
  const { flagsDisponiveis } = useFlags();
  const { events: allEvents } = useAtividades();

  const clientIdsWithActivity = useMemo(() => new Set(allEvents.map(e => e.clientId)), [allEvents]);
  const allFlags = useMemo(() => [...new Set([...DEFAULT_FLAGS, ...flagsDisponiveis])], [flagsDisponiveis]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) setColumnsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilters, regionalFilters, executivoFilters, agingFilters, flagFilters]);

  const regionais = useMemo(() => [...new Set(allClients.map(c => c.regional).filter(Boolean))].sort(), [allClients]);
  const executivos = useMemo(() => [...new Set(allClients.map(c => c.executivo).filter(Boolean))].sort(), [allClients]);

  const hasAnyFilter = statusFilters.size > 0 || regionalFilters.size > 0 || executivoFilters.size > 0 || agingFilters.size > 0 || flagFilters.size > 0;

  const filtered = useMemo(() => {
    const result = allClients.filter(c => {
      const matchesSearch = !debouncedSearch || c.nome.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        c.cnpj.includes(debouncedSearch) || c.executivo.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesStatus = statusFilters.size === 0 || statusFilters.has(c.situacao);
      const matchesRegional = regionalFilters.size === 0 || regionalFilters.has(c.regional);
      const matchesExecutivo = executivoFilters.size === 0 || executivoFilters.has(c.executivo);
      const matchesAging = agingFilters.size === 0 || [...agingFilters].some(i => {
        const r = AGING_RANGES[i];
        return c.diasAtraso >= r.min && c.diasAtraso <= r.max;
      });
      const matchesFlags = flagFilters.size === 0 || [...flagFilters].every(f => c.flags.includes(f));
      return matchesSearch && matchesStatus && matchesRegional && matchesExecutivo && matchesAging && matchesFlags;
    });

    // Sort
    const dir = sortDir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      let va: string | number = 0;
      let vb: string | number = 0;
      switch (sortField) {
        case 'cliente': va = a.nome.toLowerCase(); vb = b.nome.toLowerCase(); break;
        case 'regional': va = a.regional.toLowerCase(); vb = b.regional.toLowerCase(); break;
        case 'executivo': va = a.executivo.toLowerCase(); vb = b.executivo.toLowerCase(); break;
        case 'compensacao': va = a.compensacao; vb = b.compensacao; break;
        case 'inadimplente': va = a.valorInadimplente || 0; vb = b.valorInadimplente || 0; break;
        case 'recuperado': va = a.valorRecuperado || 0; vb = b.valorRecuperado || 0; break;
        case 'boletoVB': va = a.boletoVitbank; vb = b.boletoVitbank; break;
        case 'pixMon': va = a.pixMonetali; vb = b.pixMonetali; break;
        case 'dias': va = a.diasAtraso; vb = b.diasAtraso; break;
        case 'situacao': va = a.situacao; vb = b.situacao; break;
        default: va = a.compensacao; vb = b.compensacao;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    return result;
  }, [allClients, debouncedSearch, statusFilters, regionalFilters, executivoFilters, agingFilters, flagFilters, sortField, sortDir]);

  // Paginated results
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const clearFilters = () => {
    setStatusFilters(new Set());
    setRegionalFilters(new Set());
    setExecutivoFilters(new Set());
    setAgingFilters(new Set());
    setFlagFilters(new Set());
    setSearch('');
  };

  const toggleSet = <T,>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    setter(next);
  };

  const toggleSection = (s: string) => {
    const next = new Set(expandedSections);
    if (next.has(s)) next.delete(s); else next.add(s);
    setExpandedSections(next);
  };

  const handleSort = (col: ColumnKey) => {
    if (col === 'flags') return; // flags not sortable
    if (sortField === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(col);
      setSortDir(col === 'cliente' || col === 'regional' || col === 'executivo' || col === 'situacao' ? 'asc' : 'desc');
    }
  };

  const toggleColumn = (col: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(col)) { if (next.size > 1) next.delete(col); } else next.add(col);
      return next;
    });
  };

  const toggleFlag = async (client: Client, flag: Flag) => {
    const hasFlag = client.flags.includes(flag);
    const newFlags = hasFlag ? client.flags.filter(f => f !== flag) : [...client.flags, flag];
    const ok = await updateCliente(client.id, { flags: newFlags });
    if (ok) {
      toast.success(`Flag "${flag}" ${hasFlag ? 'removida de' : 'adicionada a'} ${client.nome}.`);
    }
  };

  const changeStatus = async (client: Client, status: Situacao) => {
    const oldStatus = client.situacao;
    const ok = await updateCliente(client.id, { situacao: status });
    setStatusDropdown(null);
    if (ok) {
      toast.success(`Status de ${client.nome} alterado de "${situacaoLabels[oldStatus]}" para "${situacaoLabels[status]}".`);
    }
  };

  const show = (col: ColumnKey) => visibleColumns.has(col);

  const countStatus = (s: Situacao) => allClients.filter(c => c.situacao === s).length;
  const countRegional = (r: string) => allClients.filter(c => c.regional === r).length;
  const countExecutivo = (e: string) => allClients.filter(c => c.executivo === e).length;
  const countAging = (i: number) => {
    const r = AGING_RANGES[i];
    return allClients.filter(c => c.diasAtraso >= r.min && c.diasAtraso <= r.max).length;
  };
  const countFlag = (f: string) => allClients.filter(c => c.flags.includes(f)).length;

  const chipClass = (active: boolean) =>
    `px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
      active ? 'bg-accent text-accent-foreground border-accent' : 'bg-transparent border-primary/30 text-foreground hover:border-primary/60'
    }`;

  const FilterSection = ({ title, id, children }: { title: string; id: string; children: React.ReactNode }) => (
    <div>
      <button onClick={() => toggleSection(id)} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors mb-1.5">
        {title} {expandedSections.has(id) ? '▾' : '▸'}
      </button>
      {expandedSections.has(id) && <div className="flex flex-wrap gap-1.5">{children}</div>}
    </div>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar dados</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter chips area */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Buscar por nome, CNPJ ou executivo..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
          <div className="flex items-center gap-2">
            {hasAnyFilter && (
              <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                <X className="h-3 w-3" /> Limpar filtros
              </button>
            )}
            <span className="text-xs text-muted-foreground">{filtered.length} de {allClients.length}</span>
            <div className="relative" ref={columnsRef}>
              <button onClick={() => setColumnsOpen(!columnsOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors">
                <Settings2 className="h-4 w-4" /> Colunas
              </button>
              {columnsOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[180px]">
                  {(Object.keys(columnLabels) as ColumnKey[]).map(col => (
                    <label key={col} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-secondary rounded">
                      <input type="checkbox" checked={visibleColumns.has(col)} onChange={() => toggleColumn(col)} className="rounded border-border" />
                      {columnLabels[col]}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <FilterSection title="Status" id="status">
            {allSituacoes.map(s => (
              <button key={s} onClick={() => toggleSet(statusFilters, s, setStatusFilters)} className={chipClass(statusFilters.has(s))}>
                {situacaoLabels[s]} ({countStatus(s)})
              </button>
            ))}
          </FilterSection>

          <FilterSection title="Regional" id="regional">
            {regionais.map(r => (
              <button key={r} onClick={() => toggleSet(regionalFilters, r, setRegionalFilters)} className={chipClass(regionalFilters.has(r))}>
                {r} ({countRegional(r)})
              </button>
            ))}
          </FilterSection>

          <FilterSection title="Executivo" id="executivo">
            {executivos.map(e => (
              <button key={e} onClick={() => toggleSet(executivoFilters, e, setExecutivoFilters)} className={chipClass(executivoFilters.has(e))}>
                {e.split(' ')[0]} ({countExecutivo(e)})
              </button>
            ))}
          </FilterSection>

          <FilterSection title="Faixa de Atraso" id="aging">
            {AGING_RANGES.map((r, i) => (
              <button key={i} onClick={() => toggleSet(agingFilters, i, setAgingFilters)} className={chipClass(agingFilters.has(i))}>
                {r.label} ({countAging(i)})
              </button>
            ))}
          </FilterSection>

          <FilterSection title="Flags" id="flags">
            {allFlags.map(f => {
              const count = countFlag(f);
              if (count === 0) return null;
              return (
                <button key={f} onClick={() => toggleSet(flagFilters, f, setFlagFilters)} className={chipClass(flagFilters.has(f))}>
                  {f} ({count})
                </button>
              );
            })}
          </FilterSection>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto max-h-[75vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <tr className="border-b border-border/50 text-left">
                {show('cliente') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('cliente')}>Cliente {sortField === 'cliente' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>}
                {show('regional') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('regional')}>Regional {sortField === 'regional' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>}
                {show('executivo') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('executivo')}>Executivo {sortField === 'executivo' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>}
                {show('compensacao') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('compensacao')}>Compensação {sortField === 'compensacao' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>}
                {show('inadimplente') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('inadimplente')}>Inadimplente {sortField === 'inadimplente' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>}
                {show('recuperado') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('recuperado')}>Recuperado {sortField === 'recuperado' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>}
                {show('boletoVB') && <th className="px-4 py-3 font-semibold text-blue-600 text-xs uppercase tracking-wider hidden md:table-cell text-right cursor-pointer select-none hover:text-blue-800 transition-colors" onClick={() => handleSort('boletoVB')}>VITBANK {sortField === 'boletoVB' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>}
                {show('pixMon') && <th className="px-4 py-3 font-semibold text-emerald-600 text-xs uppercase tracking-wider hidden md:table-cell text-right cursor-pointer select-none hover:text-emerald-800 transition-colors" onClick={() => handleSort('pixMon')}>MONETALI {sortField === 'pixMon' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>}
                {show('dias') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell text-right cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('dias')}>Dias {sortField === 'dias' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>}
                {show('situacao') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('situacao')}>Situação {sortField === 'situacao' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>}
                {show('flags') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden xl:table-cell">Flags</th>}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.map(client => {
                const hasActivity = clientIdsWithActivity.has(client.id);
                return (
                  <tr key={client.id} className="border-b border-border/20 hover:bg-muted/40 cursor-pointer transition-colors duration-150">
                    {show('cliente') && (
                      <td className="px-4 py-3" onClick={() => onSelectClient(client)}>
                        <div className="flex items-center gap-1.5">
                          {!hasActivity && <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
                          <div>
                            <p className="font-medium">{client.nome}</p>
                            <p className="text-xs font-mono text-muted-foreground">{client.cnpj}</p>
                          </div>
                        </div>
                      </td>
                    )}
                    {show('regional') && <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell" onClick={() => onSelectClient(client)}>{client.regional}</td>}
                    {show('executivo') && <td className="px-4 py-3 text-muted-foreground hidden md:table-cell" onClick={() => onSelectClient(client)}>{client.executivo}</td>}
                    {show('compensacao') && (
                      <td className="px-4 py-3 font-mono font-semibold text-right" onClick={() => onSelectClient(client)}>
                        {formatCurrency(client.compensacao)}
                      </td>
                    )}
                    {show('inadimplente') && (
                      <td className="px-4 py-3 text-right" onClick={() => onSelectClient(client)}>
                        {(client.valorInadimplente || 0) > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-700 border border-red-200 font-mono">
                            {formatCurrency(client.valorInadimplente || 0)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">—</span>
                        )}
                      </td>
                    )}
                    {show('recuperado') && (
                      <td className="px-4 py-3 text-right" onClick={() => onSelectClient(client)}>
                        {(client.valorRecuperado || 0) > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-green-100 text-green-700 border border-green-200 font-mono">
                            {formatCurrency(client.valorRecuperado || 0)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">—</span>
                        )}
                      </td>
                    )}
                    {show('boletoVB') && (
                      <td className="px-4 py-3 font-mono text-sm hidden md:table-cell text-right" onClick={() => onSelectClient(client)}>
                        {formatCurrency(client.boletoVitbank)}
                      </td>
                    )}
                    {show('pixMon') && (
                      <td className="px-4 py-3 font-mono text-sm hidden md:table-cell text-right" onClick={() => onSelectClient(client)}>
                        {formatCurrency(client.pixMonetali)}
                      </td>
                    )}
                    {show('dias') && (
                      <td className="px-4 py-3 hidden sm:table-cell text-right" onClick={() => onSelectClient(client)}>
                        <span className={
                          client.diasAtraso > 60 ? 'text-overdue font-semibold' : client.diasAtraso > 30 ? 'text-negotiation' : 'text-muted-foreground'
                        }>{client.diasAtraso}d</span>
                      </td>
                    )}
                    {show('situacao') && (
                      <td className="px-4 py-3 relative">
                        <div onClick={e => { e.stopPropagation(); setStatusDropdown(statusDropdown === client.id ? null : client.id); }}>
                          <StatusBadge status={client.situacao} />
                        </div>
                        {statusDropdown === client.id && (
                          <div className="absolute z-50 top-full left-4 mt-1 bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[180px]">
                            {allSituacoes.map(s => (
                              <button key={s} onClick={e => { e.stopPropagation(); changeStatus(client, s); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-secondary rounded flex items-center gap-2">
                                <StatusBadge status={s} />
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    )}
                    {show('flags') && (
                      <td className="px-4 py-3 hidden xl:table-cell relative">
                        <div className="flex flex-wrap gap-1" onClick={e => { e.stopPropagation(); setFlagDropdown(flagDropdown === client.id ? null : client.id); }}>
                          {client.flags.length > 0 ? client.flags.map(f => <FlagBadge key={f} flag={f} />) : <span className="text-xs text-muted-foreground">+ flag</span>}
                        </div>
                        {flagDropdown === client.id && (
                          <div className="absolute z-50 top-full left-4 mt-1 bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[160px]">
                            {allFlags.map(f => (
                              <label key={f} onClick={e => e.stopPropagation()} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-secondary rounded">
                                <input type="checkbox" checked={client.flags.includes(f)} onChange={() => toggleFlag(client, f)} className="rounded border-border" />
                                {f}
                              </label>
                            ))}
                          </div>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3" onClick={() => onSelectClient(client)}><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <EmptyState
              icon={Upload}
              title="Nenhum cliente encontrado"
              description={hasAnyFilter || debouncedSearch ? "Tente ajustar os filtros ou a busca." : "Importe seus dados na página de Importação para começar."}
              actionLabel={hasAnyFilter || debouncedSearch ? "Limpar filtros" : undefined}
              onAction={hasAnyFilter || debouncedSearch ? clearFilters : undefined}
            />
          )}
        </div>
        {filtered.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
};

export default ClientTable;
