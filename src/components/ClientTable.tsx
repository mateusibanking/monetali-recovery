import { useState, useRef, useEffect } from 'react';
import { Search, Filter, ChevronRight, AlertCircle, Settings2 } from 'lucide-react';
import { Client, Situacao, Flag, clients as allClients, formatCurrency, situacaoLabels, collectionEvents } from '@/data/mockData';
import StatusBadge from './StatusBadge';
import FlagBadge from './FlagBadge';

interface Props {
  onSelectClient: (client: Client) => void;
}

const allFlags: Flag[] = ['Prioridade', 'Juros', 'Sem Contato', 'Jurídico', 'Parcelamento'];
const allSituacoes: Situacao[] = Object.keys(situacaoLabels) as Situacao[];

type ColumnKey = 'cliente' | 'regional' | 'executivo' | 'compensacao' | 'dias' | 'situacao' | 'flags';
const columnLabels: Record<ColumnKey, string> = {
  cliente: 'Cliente',
  regional: 'Regional',
  executivo: 'Executivo',
  compensacao: 'Compensação',
  dias: 'Dias',
  situacao: 'Situação',
  flags: 'Flags',
};

const ClientTable = ({ onSelectClient }: Props) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Situacao | 'all'>('all');
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(Object.keys(columnLabels) as ColumnKey[]));
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ clientId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [flagDropdown, setFlagDropdown] = useState<string | null>(null);
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);

  // Client IDs with no activity
  const clientIdsWithActivity = new Set(collectionEvents.map(e => e.clientId));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) setColumnsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = allClients.filter(c => {
    const matchesSearch = c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.cnpj.includes(search) || c.executivo.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.situacao === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleColumn = (col: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(col)) { if (next.size > 1) next.delete(col); } else next.add(col);
      return next;
    });
  };

  const startEdit = (clientId: string, field: string, currentValue: string) => {
    setEditingCell({ clientId, field });
    setEditValue(currentValue);
  };

  const commitEdit = (client: Client) => {
    if (!editingCell) return;
    const val = editValue.trim();
    if (editingCell.field === 'compensacao') {
      const num = parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(num)) (client as any).compensacao = num;
    } else if (editingCell.field === 'diasAtraso') {
      const num = parseInt(val);
      if (!isNaN(num)) (client as any).diasAtraso = num;
    }
    setEditingCell(null);
  };

  const toggleFlag = (client: Client, flag: Flag) => {
    const idx = client.flags.indexOf(flag);
    if (idx >= 0) client.flags.splice(idx, 1);
    else client.flags.push(flag);
    setFlagDropdown(prev => prev); // force re-render trick
  };

  const changeStatus = (client: Client, status: Situacao) => {
    (client as any).situacao = status;
    setStatusDropdown(null);
  };

  const show = (col: ColumnKey) => visibleColumns.has(col);

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, CNPJ ou executivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Situacao | 'all')}
            className="bg-secondary/50 border border-border/50 rounded-lg text-sm px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="all">Todos os Status</option>
            {allSituacoes.map(s => (
              <option key={s} value={s}>{situacaoLabels[s]}</option>
            ))}
          </select>

          {/* Column visibility toggle */}
          <div className="relative" ref={columnsRef}>
            <button
              onClick={() => setColumnsOpen(!columnsOpen)}
              className="flex items-center gap-1.5 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <Settings2 className="h-4 w-4" /> Colunas
            </button>
            {columnsOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[180px]">
                {(Object.keys(columnLabels) as ColumnKey[]).map(col => (
                  <label key={col} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded">
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(col)}
                      onChange={() => toggleColumn(col)}
                      className="rounded border-border"
                    />
                    {columnLabels[col]}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-left">
              {show('cliente') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Cliente</th>}
              {show('regional') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Regional</th>}
              {show('executivo') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Executivo</th>}
              {show('compensacao') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Compensação</th>}
              {show('dias') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Dias</th>}
              {show('situacao') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Situação</th>}
              {show('flags') && <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden xl:table-cell">Flags</th>}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((client) => {
              const hasActivity = clientIdsWithActivity.has(client.id);
              return (
                <tr
                  key={client.id}
                  className="border-b border-border/30 hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  {show('cliente') && (
                    <td className="px-4 py-3" onClick={() => onSelectClient(client)}>
                      <div className="flex items-center gap-1.5">
                        {!hasActivity && <AlertCircle className="h-4 w-4 text-destructive shrink-0" title="Sem atividade registrada" />}
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
                    <td className="px-4 py-3 font-mono font-semibold" onClick={(e) => { e.stopPropagation(); startEdit(client.id, 'compensacao', client.compensacao.toString()); }}>
                      {editingCell?.clientId === client.id && editingCell.field === 'compensacao' ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(client)}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(client); if (e.key === 'Escape') setEditingCell(null); }}
                          className="w-28 px-1 py-0.5 border border-primary rounded text-sm font-mono bg-background"
                          onClick={e => e.stopPropagation()}
                        />
                      ) : formatCurrency(client.compensacao)}
                    </td>
                  )}
                  {show('dias') && (
                    <td className="px-4 py-3 hidden sm:table-cell" onClick={(e) => { e.stopPropagation(); startEdit(client.id, 'diasAtraso', client.diasAtraso.toString()); }}>
                      {editingCell?.clientId === client.id && editingCell.field === 'diasAtraso' ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(client)}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(client); if (e.key === 'Escape') setEditingCell(null); }}
                          className="w-16 px-1 py-0.5 border border-primary rounded text-sm bg-background"
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span className={client.diasAtraso > 60 ? 'text-overdue font-semibold' : client.diasAtraso > 30 ? 'text-negotiation' : 'text-muted-foreground'}>
                          {client.diasAtraso}d
                        </span>
                      )}
                    </td>
                  )}
                  {show('situacao') && (
                    <td className="px-4 py-3 relative">
                      <div onClick={(e) => { e.stopPropagation(); setStatusDropdown(statusDropdown === client.id ? null : client.id); }}>
                        <StatusBadge status={client.situacao} />
                      </div>
                      {statusDropdown === client.id && (
                        <div className="absolute z-50 top-full left-4 mt-1 bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[180px]">
                          {allSituacoes.map(s => (
                            <button
                              key={s}
                              onClick={(e) => { e.stopPropagation(); changeStatus(client, s); }}
                              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent rounded flex items-center gap-2"
                            >
                              <StatusBadge status={s} />
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  )}
                  {show('flags') && (
                    <td className="px-4 py-3 hidden xl:table-cell relative">
                      <div className="flex flex-wrap gap-1" onClick={(e) => { e.stopPropagation(); setFlagDropdown(flagDropdown === client.id ? null : client.id); }}>
                        {client.flags.length > 0 ? client.flags.map(f => <FlagBadge key={f} flag={f} />) : <span className="text-xs text-muted-foreground">+ flag</span>}
                      </div>
                      {flagDropdown === client.id && (
                        <div className="absolute z-50 top-full left-4 mt-1 bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[160px]">
                          {allFlags.map(f => (
                            <label
                              key={f}
                              onClick={e => e.stopPropagation()}
                              className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-accent rounded"
                            >
                              <input
                                type="checkbox"
                                checked={client.flags.includes(f)}
                                onChange={() => toggleFlag(client, f)}
                                className="rounded border-border"
                              />
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
  );
};

export default ClientTable;