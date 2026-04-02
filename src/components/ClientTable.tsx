import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronRight, AlertCircle, Settings2, X } from 'lucide-react';
import { Client, Situacao, Flag, clients as allClients, formatCurrency, situacaoLabels, situacaoColors, collectionEvents, DEFAULT_FLAGS, customFlags } from '@/data/mockData';
import StatusBadge from './StatusBadge';
import FlagBadge from './FlagBadge';

interface Props {
  onSelectClient: (client: Client) => void;
}

const allSituacoes: Situacao[] = Object.keys(situacaoLabels) as Situacao[];
const AGING_RANGES = [
  { label: '0-30d', min: 0, max: 30 },
  { label: '31-60d', min: 31, max: 60 },
  { label: '61-90d', min: 61, max: 90 },
  { label: '90+', min: 91, max: Infinity },
];

type ColumnKey = 'cliente' | 'regional' | 'executivo' | 'compensacao' | 'boletoVB' | 'pixMon' | 'dias' | 'situacao' | 'flags';
const columnLabels: Record<ColumnKey, string> = {
  cliente: 'Cliente', regional: 'Regional', executivo: 'Executivo', compensacao: 'Compensação',
  boletoVB: 'Boleto VB', pixMon: 'PIX Mon', dias: 'Dias', situacao: 'Situação', flags: 'Flags',
};

const ClientTable = ({ onSelectClient }: Props) => {
  const [search, setSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<Situacao>>(new Set());
  const [regionalFilters, setRegionalFilters] = useState<Set<string>>(new Set());
  const [executivoFilters, setExecutivoFilters] = useState<Set<string>>(new Set());
  const [agingFilters, setAgingFilters] = useState<Set<number>>(new Set());
  const [flagFilters, setFlagFilters] = useState<Set<string>>(new Set());

  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(Object.keys(columnLabels) as ColumnKey[]));
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);

  const [editingCell, setEditingCell] = useState<{ clientId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [flagDropdown, setFlagDropdown] = useState<string | null>(null);
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);

  // Expanded filter sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['status']));

  const clientIdsWithActivity = new Set(collectionEvents.map(e => e.clientId));
  const allFlags = [...new Set([...DEFAULT_FLAGS, ...customFlags])];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) setColumnsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Derived unique values
  const regionais = useMemo(() => [...new Set(allClients.map(c => c.regional).filter(Boolean))].sort(), []);
  const executivos = useMemo(() => [...new Set(allClients.map(c => c.executivo).filter(Boolean))].sort(), []);

  const hasAnyFilter = statusFilters.size > 0 || regionalFilters.size > 0 || executivoFilters.size > 0 || agingFilters.size > 0 || flagFilters.size > 0;

  const filtered = useMemo(() => allClients.filter(c => {
    const matchesSearch = !search || c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.cnpj.includes(search) || c.executivo.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilters.size === 0 || statusFilters.has(c.situacao);
    const matchesRegional = regionalFilters.size === 0 || regionalFilters.has(c.regional);
    const matchesExecutivo = executivoFilters.size === 0 || executivoFilters.has(c.executivo);
    const matchesAging = agingFilters.size === 0 || [...agingFilters].some(i => {
      const r = AGING_RANGES[i];
      return c.diasAtraso >= r.min && c.diasAtraso <= r.max;
    });
    const matchesFlags = flagFilters.size === 0 || [...flagFilters].every(f => c.flags.includes(f));
    return matchesSearch && matchesStatus && matchesRegional && matchesExecutivo && matchesAging && matchesFlags;
  }), [search, statusFilters, regionalFilters, executivoFilters, agingFilters, flagFilters]);

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

  const toggleColumn = (col: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(col)) { if (next.size > 1) next.delete(col); } else next.add(col);
      return next;
    });
  };

  const startEdit = (clientId: string, field: string, currentValue: string) => {
    setEditingCell({ clientId, field }); setEditValue(currentValue);
  };

  const commitEdit = (client: Client) => {
    if (!editingCell) return;
    const num = parseFloat(editValue.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!isNaN(num)) (client as any)[editingCell.field] = editingCell.field === 'diasAtraso' ? parseInt(editValue) : num;
    setEditingCell(null);
  };

  const toggleFlag = (client: Client, flag: Flag) => {
    const idx = client.flags.indexOf(flag);
    if (idx >= 0) client.flags.splice(idx, 1); else client.flags.push(flag);
    setFlagDropdown(prev => prev);
  };

  const changeStatus = (client: Client, status: Situacao) => {
    (client as any).situacao = status; setStatusDropdown(null);
  };

  const show = (col: ColumnKey) => visibleColumns.has(col);

  const renderEditableNum = (client: Client, field: string, value: number, isCurrency = true, extraClass = '') => {
    if (editingCell?.clientId === client.id && editingCell.field === field) {
      return (
        <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
          onBlur={() => commitEdit(client)}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(client); if (e.key === 'Escape') setEditingCell(null); }}
          className="w-28 px-1 py-0.5 border border-primary rounded text-sm font-mono bg-background"
          onClick={e => e.stopPropagation()} />
      );
    }
    return <span className={extraClass}>{isCurrency ? formatCurrency(value) : `${value}d`}</span>;
  };

  // Count helpers
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left">
                {show('cliente') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Cliente</th>}
                {show('regional') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Regional</th>}
                {show('executivo') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Executivo</th>}
                {show('compensacao') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Compensação</th>}
                {show('boletoVB') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Boleto VB</th>}
                {show('pixMon') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">PIX Mon</th>}
                {show('dias') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Dias</th>}
                {show('situacao') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Situação</th>}
                {show('flags') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden xl:table-cell">Flags</th>}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(client => {
                const hasActivity = clientIdsWithActivity.has(client.id);
                return (
                  <tr key={client.id} className="border-b border-border/30 hover:bg-accent/50 cursor-pointer transition-colors">
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
                      <td className="px-4 py-3 font-mono font-semibold" onClick={e => { e.stopPropagation(); startEdit(client.id, 'compensacao', client.compensacao.toString()); }}>
                        {renderEditableNum(client, 'compensacao', client.compensacao)}
                      </td>
                    )}
                    {show('boletoVB') && (
                      <td className="px-4 py-3 font-mono text-sm hidden md:table-cell" onClick={e => { e.stopPropagation(); startEdit(client.id, 'boletoVitbank', client.boletoVitbank.toString()); }}>
                        {renderEditableNum(client, 'boletoVitbank', client.boletoVitbank)}
                      </td>
                    )}
                    {show('pixMon') && (
                      <td className="px-4 py-3 font-mono text-sm hidden md:table-cell" onClick={e => { e.stopPropagation(); startEdit(client.id, 'pixMonetali', client.pixMonetali.toString()); }}>
                        {renderEditableNum(client, 'pixMonetali', client.pixMonetali)}
                      </td>
                    )}
                    {show('dias') && (
                      <td className="px-4 py-3 hidden sm:table-cell" onClick={e => { e.stopPropagation(); startEdit(client.id, 'diasAtraso', client.diasAtraso.toString()); }}>
                        {renderEditableNum(client, 'diasAtraso', client.diasAtraso, false,
                          client.diasAtraso > 60 ? 'text-overdue font-semibold' : client.diasAtraso > 30 ? 'text-negotiation' : 'text-muted-foreground'
                        )}
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
            <div className="p-8 text-center text-muted-foreground">Nenhum cliente encontrado.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientTable;
