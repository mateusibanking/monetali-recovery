import { useState } from 'react';
import { Search, Filter, ChevronRight } from 'lucide-react';
import { Client, Situacao, clients as allClients, formatCurrency, situacaoLabels } from '@/data/mockData';
import StatusBadge from './StatusBadge';
import FlagBadge from './FlagBadge';

interface Props {
  onSelectClient: (client: Client) => void;
}

const ClientTable = ({ onSelectClient }: Props) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Situacao | 'all'>('all');

  const filtered = allClients.filter(c => {
    const matchesSearch = c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.cnpj.includes(search) || c.executivo.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.situacao === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
            {(Object.keys(situacaoLabels) as Situacao[]).map(s => (
              <option key={s} value={s}>{situacaoLabels[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-left">
              <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Cliente</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Regional</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Executivo</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Compensação</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Dias</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Situação</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden xl:table-cell">Flags</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((client) => (
              <tr
                key={client.id}
                onClick={() => onSelectClient(client)}
                className="border-b border-border/30 hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{client.nome}</p>
                  <p className="text-xs font-mono text-muted-foreground">{client.cnpj}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{client.regional}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{client.executivo}</td>
                <td className="px-4 py-3 font-mono font-semibold">{formatCurrency(client.compensacao)}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className={client.diasAtraso > 60 ? 'text-overdue font-semibold' : client.diasAtraso > 30 ? 'text-negotiation' : 'text-muted-foreground'}>
                    {client.diasAtraso}d
                  </span>
                </td>
                <td className="px-4 py-3"><StatusBadge status={client.situacao} /></td>
                <td className="px-4 py-3 hidden xl:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {client.flags.map(f => <FlagBadge key={f} flag={f} />)}
                  </div>
                </td>
                <td className="px-4 py-3"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
              </tr>
            ))}
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
