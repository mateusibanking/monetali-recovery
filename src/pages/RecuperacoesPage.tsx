import { clients } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import { CheckCircle } from 'lucide-react';

const RecuperacoesPage = () => {
  const parcelados = clients.filter(c => c.situacao === 'PARCELADO');
  const cobrancaOk = clients.filter(c => c.situacao === 'COBRANÇA OK');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Recuperações & Parcelamentos</h2>

      {parcelados.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Parcelados</h3>
          <div className="grid gap-3">
            {parcelados.map(client => (
              <div key={client.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[hsl(var(--negotiation)/0.15)] flex items-center justify-center shrink-0">
                    <CheckCircle className="h-4 w-4 text-negotiation" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{client.nome}</p>
                    <p className="text-xs text-muted-foreground">{client.regional} · {client.executivo}</p>
                  </div>
                </div>
                <StatusBadge status={client.situacao} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cobrança OK ({cobrancaOk.length})</h3>
        <div className="grid gap-3">
          {cobrancaOk.map(client => (
            <div key={client.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[hsl(var(--recovered)/0.15)] flex items-center justify-center shrink-0">
                  <CheckCircle className="h-4 w-4 text-recovered" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{client.nome}</p>
                  <p className="text-xs text-muted-foreground">{client.regional} · {client.executivo}</p>
                </div>
              </div>
              <StatusBadge status={client.situacao} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecuperacoesPage;
