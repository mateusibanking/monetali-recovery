import { ArrowLeft, Mail, Phone, FileText, Calendar, MessageSquare } from 'lucide-react';
import { Client, collectionEvents, formatCurrency } from '@/data/mockData';
import StatusBadge from './StatusBadge';

interface Props {
  client: Client;
  onBack: () => void;
}

const eventTypeIcons: Record<string, typeof Mail> = {
  email: Mail,
  phone: Phone,
  letter: FileText,
  meeting: MessageSquare,
  legal: FileText,
};

const eventTypeLabels: Record<string, string> = {
  email: 'E-mail',
  phone: 'Telefone',
  letter: 'Carta',
  meeting: 'Reunião',
  legal: 'Jurídico',
};

const ClientDetail = ({ client, onBack }: Props) => {
  const events = collectionEvents
    .filter(e => e.clientId === client.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      {/* Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold">{client.name}</h2>
            <p className="text-sm font-mono text-muted-foreground">{client.cpfCnpj}</p>
          </div>
          <StatusBadge status={client.status} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Valor Devido', value: formatCurrency(client.totalOwed), mono: true },
            { label: 'Dias em Atraso', value: `${client.daysOverdue} dias`, mono: true },
            { label: 'Comissões Pendentes', value: client.commissionsOverdue.toString(), mono: true },
            { label: 'Vencimento Original', value: new Date(client.originalDueDate).toLocaleDateString('pt-BR') },
          ].map(item => (
            <div key={item.label} className="bg-secondary/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
              <p className={`text-lg font-semibold ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" /> {client.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" /> {client.phone}
          </div>
        </div>

        {client.notes && (
          <div className="mt-4 p-3 bg-secondary/20 rounded-lg border border-border/30">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Observações</p>
            <p className="text-sm">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Timeline */}
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
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleDateString('pt-BR')}
                      </span>
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
