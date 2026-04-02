import { clients, formatCurrency } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import { CheckCircle } from 'lucide-react';

const RecuperacoesPage = () => {
  const recovered = clients.filter(c => c.status === 'recovered');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Recuperações</h2>
      {recovered.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">Nenhuma recuperação registrada.</div>
      ) : (
        <div className="grid gap-4">
          {recovered.map(client => (
            <div key={client.id} className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(var(--recovered)/0.15)] flex items-center justify-center shrink-0">
                  <CheckCircle className="h-5 w-5 text-recovered" />
                </div>
                <div>
                  <p className="font-semibold">{client.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{client.cpfCnpj}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  Último contato: {new Date(client.lastContact).toLocaleDateString('pt-BR')}
                </p>
                <StatusBadge status={client.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecuperacoesPage;
