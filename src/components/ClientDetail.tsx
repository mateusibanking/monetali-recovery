import { ArrowLeft, Mail, Phone, FileText, Calendar, MessageSquare, MapPin, User } from 'lucide-react';
import { Client, collectionEvents, formatCurrency } from '@/data/mockData';
import StatusBadge from './StatusBadge';
import FlagBadge from './FlagBadge';

interface Props {
  client: Client;
  onBack: () => void;
}

const eventTypeIcons: Record<string, typeof Mail> = {
  email: Mail, phone: Phone, letter: FileText, meeting: MessageSquare, legal: FileText,
};
const eventTypeLabels: Record<string, string> = {
  email: 'E-mail', phone: 'Telefone', letter: 'Carta', meeting: 'Reunião', legal: 'Jurídico',
};

const ClientDetail = ({ client, onBack }: Props) => {
  const events = collectionEvents
    .filter(e => e.clientId === client.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold">{client.nome}</h2>
            <p className="text-sm font-mono text-muted-foreground">{client.cnpj}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={client.situacao} />
            {client.flags.map(f => <FlagBadge key={f} flag={f} />)}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Compensação', value: formatCurrency(client.compensacao) },
            { label: 'Juros', value: formatCurrency(client.juros) },
            { label: 'Boleto VitBank', value: formatCurrency(client.boletoVitbank) },
            { label: 'PIX Monetali', value: formatCurrency(client.pixMonetali) },
            { label: 'Dias em Atraso', value: `${client.diasAtraso} dias` },
            { label: 'Parcelas', value: client.parcelas.toString() },
            { label: 'Regional', value: client.regional },
            { label: 'Executivo', value: client.executivo },
          ].map(item => (
            <div key={item.label} className="bg-secondary/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
              <p className="text-lg font-semibold font-mono">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Histórico de Cobrança
        </h3>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum registro de cobrança.</p>
        ) : (
          <div className="space-y-4">
            {events.map((event, idx) => {
              const Icon = eventTypeIcons[event.type] || FileText;
              return (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    {idx < events.length - 1 && <div className="w-px flex-1 bg-border/50 mt-2" />}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{eventTypeLabels[event.type]}</span>
                      <span className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">Responsável: {event.agent}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDetail;
