export type Situacao =
  | 'NÃO INICIADO'
  | 'EM ANDAMENTO'
  | 'PENDENTE'
  | 'CONTATADO'
  | 'EM NEGOCIAÇÃO'
  | 'ACORDO FECHADO'
  | 'PAGO'
  | 'JURÍDICO'
  | 'PARCELADO'
  | 'DISTRATO'
  | 'CANCELADO'
  | 'SUSPENSO';

export type Flag = 'Prioridade' | 'Juros' | 'Sem Contato' | 'Jurídico' | 'Parcelamento' | 'Promessa de Pgto' | string;

export type PaymentStatus = 'Pendente' | 'Pago' | 'Parcial' | 'Vencido' | 'Parcelado';

export interface Payment {
  id: string;
  valor: number;
  dataVencimento: string;
  descricao: string;
  status: PaymentStatus;
  // Breakdown fields from DB
  vitbank?: number;
  vctoVitbank?: string | null;
  pgtoVitbank?: string | null;
  valorPagoVitbank?: number;
  monetali?: number;
  vctoMonetali?: string | null;
  pgtoMonetali?: string | null;
  valorPagoMonetali?: number;
  imposto?: number;
  valorCompensacao?: number;
  juros?: number;
  mesReferencia?: string | null;
  dataCobranca?: string | null;
  dataPagamento?: string | null;
  // Campos de inadimplência (TAREFA A)
  isInadimplente?: boolean;
  valorPagoEfetivo?: number;
  valorInadimplente?: number;
  dataPagamentoEfetivo?: string | null;
  mesRecuperacao?: string | null;
}

export interface TimelineEvent {
  id: string;
  clientId: string;
  date: string;
  type: 'status_change' | 'email' | 'payment' | 'flag' | 'phone' | 'meeting' | 'legal' | 'note';
  description: string;
  agent: string;
}

export interface Client {
  id: string;
  nome: string;
  cnpj: string;
  regional: string;
  executivo: string;
  compensacao: number;
  juros: number;
  boletoVitbank: number;
  pixMonetali: number;
  diasAtraso: number;
  parcelas: number;
  situacao: Situacao;
  flags: Flag[];
  mes_referencia: string;
  valorInadimplente?: number;
  valorRecuperado?: number;
}

export interface CollectionEvent {
  id: string;
  clientId: string;
  date: string;
  type: 'email' | 'phone' | 'letter' | 'meeting' | 'legal';
  description: string;
  agent: string;
}

export interface Parcela {
  numero: number;
  mes: string;
  valor: number;
  status: 'Pago' | 'Pendente';
}

export interface ParcelamentoData {
  clientId: string;
  numParcelas: number;
  valorParcela: number;
  jurosParcelamento: number;
  parcelas: Parcela[];
}

// Clients are now imported from clientesData.ts
export { clients } from './clientesData';

export const collectionEvents: CollectionEvent[] = [
  { id: '1', clientId: '10', date: '2026-03-20', type: 'phone', description: 'Tentativa de contato sem sucesso. Telefone não atende.', agent: 'Felipe Soares' },
  { id: '2', clientId: '10', date: '2026-03-05', type: 'email', description: 'E-mail de cobrança enviado. Sem resposta.', agent: 'Sistema' },
  { id: '3', clientId: '4', date: '2026-03-18', type: 'phone', description: 'Contato com financeiro. Prometeu retorno em 5 dias.', agent: 'Matheus Castro' },
  { id: '4', clientId: '13', date: '2026-03-10', type: 'legal', description: 'Encaminhado para departamento jurídico.', agent: 'Wilson Assis' },
  { id: '5', clientId: '15', date: '2026-02-28', type: 'legal', description: 'Distrato formalizado. Pendência em análise jurídica.', agent: 'Miriane Martins' },
  { id: '6', clientId: '14', date: '2026-03-25', type: 'meeting', description: 'Acordo de parcelamento firmado em 3x.', agent: 'Elias Soares' },
  { id: '7', clientId: '2', date: '2026-03-15', type: 'email', description: 'Lembrete de parcelas pendentes enviado.', agent: 'Sistema' },
  { id: '8', clientId: '6', date: '2026-03-22', type: 'phone', description: 'Cliente ciente dos juros acumulados. Aguardando posição.', agent: 'Elias Soares' },
];

// Mock parcelamento data for client 14 (ANDRADE SILVA ALIMENTOS - PARCELADO)
export const parcelamentos: ParcelamentoData[] = [
  {
    clientId: '14',
    numParcelas: 3,
    valorParcela: 24321.94,
    jurosParcelamento: 2.5,
    parcelas: [
      { numero: 1, mes: '2026-04', valor: 24321.94, status: 'Pago' },
      { numero: 2, mes: '2026-05', valor: 24321.94, status: 'Pendente' },
      { numero: 3, mes: '2026-06', valor: 24321.94, status: 'Pendente' },
    ],
  },
];

// Mock daily evolution data
export const dailyEvolutionData = (() => {
  const data = [];
  const baseDate = new Date('2026-03-01');
  let acumulado = 0;
  for (let i = 0; i < 31; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    const contatos = Math.floor(Math.random() * 8) + 1;
    const renegociacoes = Math.floor(Math.random() * 3);
    const recuperacao = Math.floor(Math.random() * 150000) + 20000;
    acumulado += recuperacao;
    data.push({
      dia: d.toISOString().split('T')[0],
      diaLabel: `${d.getDate()}/${d.getMonth() + 1}`,
      contatos,
      renegociacoes,
      recuperacao,
      acumulado,
    });
  }
  return data;
})();

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const situacaoLabels: Record<Situacao, string> = {
  'NÃO INICIADO': 'Não Iniciado',
  'EM ANDAMENTO': 'Em Andamento',
  'PENDENTE': 'Pendente',
  'CONTATADO': 'Contatado',
  'EM NEGOCIAÇÃO': 'Em Negociação',
  'ACORDO FECHADO': 'Acordo Fechado',
  'PAGO': 'Pago',
  'JURÍDICO': 'Jurídico',
  'PARCELADO': 'Parcelado',
  'DISTRATO': 'Distrato',
  'CANCELADO': 'Cancelado',
  'SUSPENSO': 'Suspenso',
};

export const situacaoColors: Record<Situacao, string> = {
  'NÃO INICIADO': 'status-nao-iniciado',
  'EM ANDAMENTO': 'status-em-andamento',
  'PENDENTE': 'status-pendente',
  'CONTATADO': 'status-contatado',
  'EM NEGOCIAÇÃO': 'status-em-negociacao',
  'ACORDO FECHADO': 'status-acordo-fechado',
  'PAGO': 'status-pago',
  'JURÍDICO': 'status-juridico',
  'PARCELADO': 'status-parcelado',
  'DISTRATO': 'status-distrato',
  'CANCELADO': 'status-cancelado',
  'SUSPENSO': 'status-suspenso',
};

export const DEFAULT_FLAGS: Flag[] = ['Prioridade', 'Juros', 'Sem Contato', 'Jurídico', 'Parcelamento', 'Promessa de Pgto'];

// Global custom flags store (shared across clients)
export const customFlags: Flag[] = [];

export const getFlagLabel = (flag: Flag): string => flag;
export const getFlagColor = (flag: Flag): string => {
  const known: Record<string, string> = {
    Prioridade: 'bg-overdue/20 text-overdue border-overdue/30',
    Juros: 'bg-negotiation/20 text-negotiation border-negotiation/30',
    'Sem Contato': 'bg-muted text-muted-foreground border-border',
    Jurídico: 'bg-legal/20 text-legal border-legal/30',
    Parcelamento: 'bg-recovered/20 text-recovered border-recovered/30',
    'Promessa de Pgto': 'bg-partial/20 text-partial border-partial/30',
  };
  return known[flag] || 'bg-accent/20 text-accent border-accent/30';
};

export const flagLabels: Record<string, string> = {
  Prioridade: 'Prioridade',
  Juros: 'Juros',
  'Sem Contato': 'Sem Contato',
  Jurídico: 'Jurídico',
  Parcelamento: 'Parcelamento',
  'Promessa de Pgto': 'Promessa de Pgto',
};

export const flagColors: Record<string, string> = {
  Prioridade: 'bg-overdue/20 text-overdue border-overdue/30',
  Juros: 'bg-negotiation/20 text-negotiation border-negotiation/30',
  'Sem Contato': 'bg-muted text-muted-foreground border-border',
  Jurídico: 'bg-legal/20 text-legal border-legal/30',
  Parcelamento: 'bg-recovered/20 text-recovered border-recovered/30',
  'Promessa de Pgto': 'bg-partial/20 text-partial border-partial/30',
};

// Client payments store (keyed by client id)
export const clientPayments: Record<string, Payment[]> = {};

// Generate mock payments for each client
import { clients } from './clientesData';
clients.forEach(c => {
  const numPayments = Math.max(1, c.parcelas);
  const payments: Payment[] = [];
  const baseVal = c.compensacao / numPayments;
  for (let i = 0; i < numPayments; i++) {
    const d = new Date(2026, 3 - i, 15);
    payments.push({
      id: `${c.id}-p${i + 1}`,
      valor: Math.round(baseVal * 100) / 100,
      dataVencimento: d.toISOString().split('T')[0],
      descricao: `Parcela ${i + 1} de ${numPayments}`,
      status: i === 0 && c.situacao === 'PAGO' ? 'Pago' : c.diasAtraso > 30 ? 'Vencido' : 'Pendente',
    });
  }
  clientPayments[c.id] = payments;
});

// Client timeline store
export const clientTimelines: Record<string, TimelineEvent[]> = {};

// Seed timelines from collectionEvents + generate extras
collectionEvents.forEach(e => {
  if (!clientTimelines[e.clientId]) clientTimelines[e.clientId] = [];
  clientTimelines[e.clientId].push({
    id: `tl-${e.id}`,
    clientId: e.clientId,
    date: e.date + 'T10:00:00',
    type: e.type as TimelineEvent['type'],
    description: e.description,
    agent: e.agent,
  });
});

// Add some auto-generated timeline events
clients.slice(0, 30).forEach(c => {
  if (!clientTimelines[c.id]) clientTimelines[c.id] = [];
  clientTimelines[c.id].push({
    id: `tl-auto-${c.id}-1`,
    clientId: c.id,
    date: '2026-04-01T09:00:00',
    type: 'status_change',
    description: `Status alterado para ${situacaoLabels[c.situacao]}`,
    agent: c.executivo || 'Sistema',
  });
  if (c.flags.length > 0) {
    clientTimelines[c.id].push({
      id: `tl-auto-${c.id}-2`,
      clientId: c.id,
      date: '2026-03-28T14:30:00',
      type: 'flag',
      description: `Flag "${c.flags[0]}" adicionada`,
      agent: c.executivo || 'Sistema',
    });
  }
});