import { useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { CollectionEvent } from '@/data/mockData';
import { useClientes } from '@/hooks/useClientes';
import { useAtividades } from '@/hooks/useAtividades';
import MonthSelector, { DEFAULT_MONTH } from '@/components/MonthSelector';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { toast } from 'sonner';

const activityTypes = [
  { value: 'email', label: 'Email Enviado', dbTipo: 'email' as const },
  { value: 'phone', label: 'Ligação Feita', dbTipo: 'comentario' as const },
  { value: 'meeting', label: 'WhatsApp Enviado', dbTipo: 'comentario' as const },
] as const;

const AtividadesPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(DEFAULT_MONTH);
  const { data: clients, loading: loadingClients } = useClientes();
  const { events: activities, loading: loadingActivities, create: createAtividade } = useAtividades();

  const [form, setForm] = useState({
    clientId: '',
    type: 'email' as string,
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) {
      toast.error('Selecione um cliente.');
      return;
    }
    const client = clients.find(c => c.id === form.clientId);
    const actType = activityTypes.find(t => t.value === form.type);
    const descricao = form.description || `${actType?.label} para ${client?.nome}`;

    const ok = await createAtividade({
      clienteId: form.clientId,
      tipo: actType?.dbTipo || 'comentario',
      descricao,
      criadoPor: 'Usuário',
    });

    if (ok) {
      setForm({ clientId: '', type: 'email', date: new Date().toISOString().split('T')[0], description: '' });
      toast.success('Atividade registrada com sucesso!');
    } else {
      toast.error('Erro ao registrar atividade.');
    }
  };

  if (loadingClients || loadingActivities) return <LoadingSkeleton />;

  // Filter activities by selected month
  const filteredActivities = selectedMonth === 'todos'
    ? activities
    : activities.filter(a => a.date.startsWith(selectedMonth));
  const sorted = [...filteredActivities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const inputClass = "w-full bg-secondary/50 border border-border/50 rounded-lg text-sm px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";
  const labelClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Registro de Atividades</h2>
        </div>
        <MonthSelector selected={selectedMonth} onChange={setSelectedMonth} showTodos />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass-card p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Nova Atividade</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className={labelClass}>Cliente</label>
            <select className={inputClass} value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))} required>
              <option value="">Selecione...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <select className={inputClass} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {activityTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Data</label>
            <input type="date" className={inputClass} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
          </div>
          <div>
            <label className={labelClass}>Observação</label>
            <input type="text" className={inputClass} placeholder="Opcional..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <button type="submit" className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Registrar Atividade
        </button>
      </form>

      {/* History */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Histórico de Atividades ({sorted.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left">
                <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Data</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Observação</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Responsável</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(event => {
                const client = clients.find(c => c.id === event.clientId);
                const typeLabel = activityTypes.find(t => t.value === event.type)?.label || event.type;
                return (
                  <tr key={event.id} className="border-b border-border/30 hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{new Date(event.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 font-medium">{client?.nome || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        {typeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell max-w-[300px] truncate">{event.description}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{event.agent}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">Nenhuma atividade registrada.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AtividadesPage;
