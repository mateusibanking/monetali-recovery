import { useState } from 'react';
import { Search, Filter, ChevronRight } from 'lucide-react';
import { Client, DelinquencyStatus, clients as allClients, formatCurrency, statusLabels } from '@/data/mockData';
import StatusBadge from './StatusBadge';

interface Props {
  onSelectClient: (client: Client) => void;
}

const ClientTable = ({ onSelectClient }: Props) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DelinquencyStatus | 'all'>('all');

  const filtered = allClients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.cpfCnpj.includes(search);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="glass-card overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF/CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DelinquencyStatus | 'all')}
            className="bg-secondary/50 border border-border/50 rounded-lg text-sm px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="all">Todos os Status</option>
            {(Object.keys(statusLabels) as DelinquencyStatus[]).map(s => (
              <option key={s} value={s}>{statusLabels[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-left">
              <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Cliente</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">CPF/CNPJ</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Valor Devido</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Dias Atraso</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Último Contato</th>
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
                <td className="px-4 py-3 font-medium">{client.name}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground hidden md:table-cell">{client.cpfCnpj}</td>
                <td className="px-4 py-3 font-mono font-semibold">{formatCurrency(client.totalOwed)}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className={client.daysOverdue > 60 ? 'text-overdue font-semibold' : client.daysOverdue > 30 ? 'text-negotiation' : 'text-muted-foreground'}>
                    {client.daysOverdue}d
                  </span>
                </td>
                <td className="px-4 py-3"><StatusBadge status={client.status} /></td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{new Date(client.lastContact).toLocaleDateString('pt-BR')}</td>
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
