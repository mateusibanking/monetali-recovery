export type Situacao = 'COBRANÇA OK' | 'NÃO PAGO' | 'PARCELADO' | 'DISTRATO';

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

export const clients: Client[] = [
  { id: '1', nome: 'AÇÕES', cnpj: '', regional: 'RJ / SP', executivo: 'Lucas Santos', compensacao: 7333699.92, juros: 0, boletoVitbank: 5500274.94, pixMonetali: 344133.87, diasAtraso: 158, parcelas: 2, situacao: 'COBRANÇA OK', flags: [] },
  { id: '2', nome: 'ESVJ ENGENHARIA', cnpj: '06.020.141/0001-52', regional: 'RJ / SP', executivo: 'Miriane Martins', compensacao: 2602175.50, juros: 59103.52, boletoVitbank: 1892528.10, pixMonetali: 119333.65, diasAtraso: 275, parcelas: 5, situacao: 'COBRANÇA OK', flags: [] },
  { id: '3', nome: 'LIMPIDOZ HIGIENE INDUSTRIAL', cnpj: '', regional: 'RJ / SP', executivo: 'Matheus Castro', compensacao: 1727160.59, juros: 0, boletoVitbank: 1209012.42, pixMonetali: 81047.02, diasAtraso: 346, parcelas: 6, situacao: 'COBRANÇA OK', flags: [] },
  { id: '4', nome: 'LIMPIDOZ PRESTADORA', cnpj: '', regional: 'RJ / SP', executivo: 'Matheus Castro', compensacao: 1225179.17, juros: 14427.43, boletoVitbank: 843197.99, pixMonetali: 56814.52, diasAtraso: 425, parcelas: 8, situacao: 'COBRANÇA OK', flags: ['Prioridade'] },
  { id: '5', nome: 'SCARELI PAES CONGELADOS', cnpj: '06.986.218/0001-43', regional: 'MG', executivo: 'Gabriela Vilela', compensacao: 962227.18, juros: 0, boletoVitbank: 625447.67, pixMonetali: 45152.51, diasAtraso: 68, parcelas: 1, situacao: 'COBRANÇA OK', flags: [] },
  { id: '6', nome: 'KI BARATO LTDA', cnpj: '32.860.231/0001-61', regional: 'AL', executivo: 'Elias Soares', compensacao: 815922.48, juros: 8866.61, boletoVitbank: 521483.00, pixMonetali: 37871.09, diasAtraso: 128, parcelas: 4, situacao: 'COBRANÇA OK', flags: ['Juros'] },
  { id: '7', nome: 'DI CANALLI COMERCIO', cnpj: '03.591.919/0001-95', regional: 'RS / SC', executivo: 'Weslley Fernando', compensacao: 784946.17, juros: 7098.77, boletoVitbank: 504056.59, pixMonetali: 36500.48, diasAtraso: 219, parcelas: 3, situacao: 'COBRANÇA OK', flags: [] },
  { id: '8', nome: 'DICASA MATERIAIS', cnpj: '07.013.648/0001-41', regional: 'TO / PA', executivo: 'João Batista', compensacao: 663756.03, juros: 0, boletoVitbank: 497817.03, pixMonetali: 31146.75, diasAtraso: 83, parcelas: 3, situacao: 'COBRANÇA OK', flags: [] },
  { id: '9', nome: 'CENTRO HEMODIALISE', cnpj: '', regional: 'TO / PA', executivo: 'Joy Colares', compensacao: 654869.73, juros: 0, boletoVitbank: 491152.30, pixMonetali: 30729.77, diasAtraso: 100, parcelas: 4, situacao: 'COBRANÇA OK', flags: [] },
  { id: '10', nome: 'HOTEL SANTA COMBA', cnpj: '33.204.413/0001-47', regional: 'RJ / SP', executivo: 'Felipe Soares', compensacao: 634669.43, juros: 0, boletoVitbank: 476002.09, pixMonetali: 29781.86, diasAtraso: 338, parcelas: 5, situacao: 'NÃO PAGO', flags: ['Sem Contato', 'Prioridade'] },
  { id: '11', nome: 'HJM GESTAO SERVICOS', cnpj: '26.478.473/0001-92', regional: 'RJ / SP', executivo: 'Felipe Soares', compensacao: 494506.28, juros: 318.95, boletoVitbank: 370560.76, pixMonetali: 23189.74, diasAtraso: 187, parcelas: 4, situacao: 'COBRANÇA OK', flags: [] },
  { id: '12', nome: 'ARTE FINAL COURO', cnpj: '', regional: 'MG', executivo: 'Carlos Barros', compensacao: 417811.21, juros: 0, boletoVitbank: 313358.42, pixMonetali: 19605.79, diasAtraso: 253, parcelas: 8, situacao: 'COBRANÇA OK', flags: [] },
  { id: '13', nome: 'GEO CORING', cnpj: '26.478.473/0001-92', regional: 'RJ / SP', executivo: 'Wilson Assis', compensacao: 627069.32, juros: 0, boletoVitbank: 470301.99, pixMonetali: 29416.37, diasAtraso: 300, parcelas: 5, situacao: 'NÃO PAGO', flags: ['Jurídico'] },
  { id: '14', nome: 'ANDRADE SILVA ALIMENTOS', cnpj: '', regional: 'AL', executivo: 'Elias Soares', compensacao: 72965.83, juros: 286.91, boletoVitbank: 54437.47, pixMonetali: 3410.45, diasAtraso: 464, parcelas: 3, situacao: 'PARCELADO', flags: ['Parcelamento'] },
  { id: '15', nome: 'CONSTRUTORA MARQUISE', cnpj: '', regional: 'RJ / SP', executivo: 'Miriane Martins', compensacao: 202771.50, juros: 0, boletoVitbank: 152078.62, pixMonetali: 9515.05, diasAtraso: 365, parcelas: 2, situacao: 'DISTRATO', flags: ['Jurídico'] },
];

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

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const situacaoLabels: Record<Situacao, string> = {
  'COBRANÇA OK': 'Cobrança OK',
  'NÃO PAGO': 'Não Pago',
  'PARCELADO': 'Parcelado',
  'DISTRATO': 'Distrato',
};

export const situacaoColors: Record<Situacao, string> = {
  'COBRANÇA OK': 'status-recovered',
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
