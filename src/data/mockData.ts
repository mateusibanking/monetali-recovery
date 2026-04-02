export type DelinquencyStatus = 'overdue' | 'negotiation' | 'legal' | 'recovered';

export interface Client {
  id: string;
  name: string;
  cpfCnpj: string;
  email: string;
  phone: string;
  totalOwed: number;
  daysOverdue: number;
  status: DelinquencyStatus;
  lastContact: string;
  commissionsOverdue: number;
  originalDueDate: string;
  notes: string;
}

export interface CollectionEvent {
  id: string;
  clientId: string;
  date: string;
  type: 'email' | 'phone' | 'letter' | 'meeting' | 'legal';
  description: string;
  agent: string;
}

export const clients: Client[] = [
  {
    id: '1', name: 'Construtora Horizonte Ltda', cpfCnpj: '12.345.678/0001-90',
    email: 'financeiro@horizonte.com', phone: '(11) 99876-5432',
    totalOwed: 45_780.50, daysOverdue: 67, status: 'overdue',
    lastContact: '2026-03-18', commissionsOverdue: 3,
    originalDueDate: '2026-01-25', notes: 'Prometeu pagamento parcial até fim do mês.',
  },
  {
    id: '2', name: 'Auto Peças Nacional', cpfCnpj: '98.765.432/0001-10',
    email: 'contato@autopeças.com', phone: '(21) 98765-1234',
    totalOwed: 12_340.00, daysOverdue: 32, status: 'negotiation',
    lastContact: '2026-03-25', commissionsOverdue: 1,
    originalDueDate: '2026-03-01', notes: 'Negociação de parcelamento em 3x.',
  },
  {
    id: '3', name: 'Maria Silva Santos', cpfCnpj: '123.456.789-00',
    email: 'maria.silva@email.com', phone: '(31) 97654-3210',
    totalOwed: 8_920.75, daysOverdue: 120, status: 'legal',
    lastContact: '2026-02-10', commissionsOverdue: 5,
    originalDueDate: '2025-12-03', notes: 'Encaminhado para cobrança judicial.',
  },
  {
    id: '4', name: 'Tech Solutions SA', cpfCnpj: '11.222.333/0001-44',
    email: 'financeiro@techsol.com', phone: '(11) 91234-5678',
    totalOwed: 0, daysOverdue: 0, status: 'recovered',
    lastContact: '2026-03-28', commissionsOverdue: 0,
    originalDueDate: '2026-02-15', notes: 'Valor recuperado integralmente em 28/03.',
  },
  {
    id: '5', name: 'Distribuidora Norte', cpfCnpj: '55.666.777/0001-88',
    email: 'pagar@distnorte.com', phone: '(92) 98888-7777',
    totalOwed: 23_150.00, daysOverdue: 15, status: 'overdue',
    lastContact: '2026-03-30', commissionsOverdue: 1,
    originalDueDate: '2026-03-17', notes: 'Primeiro contato realizado.',
  },
  {
    id: '6', name: 'Farmácia Popular Central', cpfCnpj: '33.444.555/0001-66',
    email: 'adm@farmpopular.com', phone: '(85) 99111-2233',
    totalOwed: 5_600.00, daysOverdue: 45, status: 'negotiation',
    lastContact: '2026-03-20', commissionsOverdue: 2,
    originalDueDate: '2026-02-15', notes: 'Acordou pagar em 2 parcelas.',
  },
  {
    id: '7', name: 'João Pedro Almeida', cpfCnpj: '987.654.321-00',
    email: 'joao.almeida@email.com', phone: '(41) 99876-0011',
    totalOwed: 67_200.00, daysOverdue: 95, status: 'legal',
    lastContact: '2026-01-28', commissionsOverdue: 4,
    originalDueDate: '2025-12-28', notes: 'Sem resposta. Processo em andamento.',
  },
  {
    id: '8', name: 'Logística Express', cpfCnpj: '22.333.444/0001-55',
    email: 'financeiro@logexp.com', phone: '(51) 98765-4321',
    totalOwed: 0, daysOverdue: 0, status: 'recovered',
    lastContact: '2026-03-15', commissionsOverdue: 0,
    originalDueDate: '2026-01-10', notes: 'Pagamento realizado após negociação.',
  },
];

export const collectionEvents: CollectionEvent[] = [
  { id: '1', clientId: '1', date: '2026-03-18', type: 'phone', description: 'Contato telefônico. Cliente disse que está com dificuldades financeiras.', agent: 'Ana Costa' },
  { id: '2', clientId: '1', date: '2026-03-10', type: 'email', description: 'Enviado lembrete de comissão atrasada.', agent: 'Sistema' },
  { id: '3', clientId: '1', date: '2026-02-28', type: 'email', description: 'Notificação de atraso - 1º aviso.', agent: 'Sistema' },
  { id: '4', clientId: '2', date: '2026-03-25', type: 'meeting', description: 'Reunião de negociação. Acordo de parcelamento.', agent: 'Carlos Lima' },
  { id: '5', clientId: '2', date: '2026-03-15', type: 'phone', description: 'Ligação para agendar reunião.', agent: 'Carlos Lima' },
  { id: '6', clientId: '3', date: '2026-02-10', type: 'legal', description: 'Processo judicial iniciado.', agent: 'Dr. Roberto Mendes' },
  { id: '7', clientId: '3', date: '2026-01-20', type: 'letter', description: 'Notificação extrajudicial enviada.', agent: 'Ana Costa' },
  { id: '8', clientId: '7', date: '2026-01-28', type: 'letter', description: 'Carta de cobrança com AR enviada.', agent: 'Ana Costa' },
];

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const statusLabels: Record<DelinquencyStatus, string> = {
  overdue: 'Atrasado',
  negotiation: 'Em Negociação',
  legal: 'Jurídico',
  recovered: 'Recuperado',
};

export const statusColors: Record<DelinquencyStatus, string> = {
  overdue: 'status-overdue',
  negotiation: 'status-negotiation',
  legal: 'status-legal',
  recovered: 'status-recovered',
};
