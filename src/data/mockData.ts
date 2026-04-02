export type Situacao = 'COBRANÇA OK' | 'COBRANÇA EM ANDAMENTO' | 'NÃO PAGO' | 'PARCELADO' | 'DISTRATO';

export type Flag = 'Prioridade' | 'Juros' | 'Sem Contato' | 'Jurídico' | 'Parcelamento';

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
  'COBRANÇA OK': 'Cobrança OK',
  'COBRANÇA EM ANDAMENTO': 'Cobrança em Andamento',
  'NÃO PAGO': 'Não Pago',
  'PARCELADO': 'Parcelado',
  'DISTRATO': 'Distrato',
};

export const situacaoColors: Record<Situacao, string> = {
  'COBRANÇA EM ANDAMENTO': 'status-partial',
  'NÃO PAGO': 'status-overdue',
  'PARCELADO': 'status-negotiation',
  'DISTRATO': 'status-legal',
};

export const flagLabels: Record<Flag, string> = {
  Prioridade: 'Prioridade',
  Juros: 'Juros',
  'Sem Contato': 'Sem Contato',
  Jurídico: 'Jurídico',
  Parcelamento: 'Parcelamento',
};

export const flagColors: Record<Flag, string> = {
  Prioridade: 'bg-overdue/20 text-overdue border-overdue/30',
  Juros: 'bg-negotiation/20 text-negotiation border-negotiation/30',
  'Sem Contato': 'bg-muted text-muted-foreground border-border',
  Jurídico: 'bg-legal/20 text-legal border-legal/30',
  Parcelamento: 'bg-recovered/20 text-recovered border-recovered/30',
};