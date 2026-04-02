export type Situacao = 'em_atraso' | 'negociacao' | 'juridico' | 'recuperado' | 'parcial';

export type Flag = 'reincidente' | 'sem_contato' | 'promessa_quebrada' | 'acordo_vigente' | 'protesto' | 'cobranca_judicial';

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
  { id: '1', nome: 'Loja Estrela Dourada Ltda', cnpj: '12.487.356/0001-91', regional: 'Sudeste', executivo: 'Ana Paula Ribeiro', compensacao: 14580.00, juros: 1823.40, boletoVitbank: 8740.00, pixMonetali: 5840.00, diasAtraso: 47, parcelas: 3, situacao: 'em_atraso', flags: ['reincidente'] },
  { id: '2', nome: 'Auto Center Moreira ME', cnpj: '34.921.887/0001-45', regional: 'Sul', executivo: 'Carlos Eduardo Lima', compensacao: 32100.00, juros: 5136.00, boletoVitbank: 19260.00, pixMonetali: 12840.00, diasAtraso: 92, parcelas: 6, situacao: 'juridico', flags: ['sem_contato', 'protesto'] },
  { id: '3', nome: 'Farmácia Saúde & Vida', cnpj: '56.312.904/0001-78', regional: 'Nordeste', executivo: 'Fernanda Gomes', compensacao: 5670.00, juros: 425.25, boletoVitbank: 3402.00, pixMonetali: 2268.00, diasAtraso: 18, parcelas: 1, situacao: 'negociacao', flags: ['acordo_vigente'] },
  { id: '4', nome: 'Distribuidora Real Alimentos', cnpj: '78.145.632/0001-23', regional: 'Centro-Oeste', executivo: 'Roberto Nascimento', compensacao: 67450.00, juros: 13490.00, boletoVitbank: 40470.00, pixMonetali: 26980.00, diasAtraso: 135, parcelas: 8, situacao: 'juridico', flags: ['reincidente', 'cobranca_judicial', 'promessa_quebrada'] },
  { id: '5', nome: 'Pet Shop Amigo Fiel', cnpj: '23.678.901/0001-56', regional: 'Sudeste', executivo: 'Ana Paula Ribeiro', compensacao: 8920.00, juros: 892.00, boletoVitbank: 5352.00, pixMonetali: 3568.00, diasAtraso: 34, parcelas: 2, situacao: 'em_atraso', flags: [] },
  { id: '6', nome: 'Construtora Horizonte SA', cnpj: '45.789.123/0001-34', regional: 'Sudeste', executivo: 'Carlos Eduardo Lima', compensacao: 0, juros: 0, boletoVitbank: 0, pixMonetali: 0, diasAtraso: 0, parcelas: 0, situacao: 'recuperado', flags: [] },
  { id: '7', nome: 'Restaurante Sabor Caseiro', cnpj: '67.234.567/0001-89', regional: 'Norte', executivo: 'Mariana Costa', compensacao: 4350.00, juros: 261.00, boletoVitbank: 2610.00, pixMonetali: 1740.00, diasAtraso: 12, parcelas: 1, situacao: 'negociacao', flags: ['acordo_vigente'] },
  { id: '8', nome: 'Grupo Escolar Progresso', cnpj: '89.456.789/0001-12', regional: 'Nordeste', executivo: 'Fernanda Gomes', compensacao: 21780.00, juros: 3267.00, boletoVitbank: 13068.00, pixMonetali: 8712.00, diasAtraso: 78, parcelas: 4, situacao: 'em_atraso', flags: ['promessa_quebrada', 'reincidente'] },
  { id: '9', nome: 'Elétrica Força Total ME', cnpj: '11.345.678/0001-67', regional: 'Sul', executivo: 'Carlos Eduardo Lima', compensacao: 15600.00, juros: 2808.00, boletoVitbank: 9360.00, pixMonetali: 6240.00, diasAtraso: 56, parcelas: 3, situacao: 'negociacao', flags: ['sem_contato'] },
  { id: '10', nome: 'Clínica Bem Estar', cnpj: '22.567.890/0001-01', regional: 'Sudeste', executivo: 'Roberto Nascimento', compensacao: 0, juros: 0, boletoVitbank: 0, pixMonetali: 0, diasAtraso: 0, parcelas: 0, situacao: 'recuperado', flags: [] },
  { id: '11', nome: 'Padaria Pão de Ouro', cnpj: '33.678.012/0001-45', regional: 'Centro-Oeste', executivo: 'Mariana Costa', compensacao: 3200.00, juros: 160.00, boletoVitbank: 1920.00, pixMonetali: 1280.00, diasAtraso: 8, parcelas: 1, situacao: 'parcial', flags: [] },
  { id: '12', nome: 'Transportadora Veloz Log', cnpj: '44.789.234/0001-78', regional: 'Sul', executivo: 'Ana Paula Ribeiro', compensacao: 48900.00, juros: 9780.00, boletoVitbank: 29340.00, pixMonetali: 19560.00, diasAtraso: 110, parcelas: 7, situacao: 'juridico', flags: ['protesto', 'cobranca_judicial'] },
  { id: '13', nome: 'Imobiliária Casa Nova', cnpj: '55.890.345/0001-23', regional: 'Nordeste', executivo: 'Fernanda Gomes', compensacao: 27650.00, juros: 4147.50, boletoVitbank: 16590.00, pixMonetali: 11060.00, diasAtraso: 63, parcelas: 4, situacao: 'em_atraso', flags: ['reincidente'] },
  { id: '14', nome: 'Moda Fashion Store', cnpj: '66.901.456/0001-56', regional: 'Sudeste', executivo: 'Roberto Nascimento', compensacao: 11230.00, juros: 1123.00, boletoVitbank: 6738.00, pixMonetali: 4492.00, diasAtraso: 29, parcelas: 2, situacao: 'negociacao', flags: ['acordo_vigente'] },
  { id: '15', nome: 'Oficina Mecânica Silva', cnpj: '77.012.567/0001-89', regional: 'Norte', executivo: 'Mariana Costa', compensacao: 6780.00, juros: 678.00, boletoVitbank: 4068.00, pixMonetali: 2712.00, diasAtraso: 25, parcelas: 2, situacao: 'parcial', flags: ['promessa_quebrada'] },
  { id: '16', nome: 'Supermercado Bom Preço', cnpj: '88.123.678/0001-12', regional: 'Centro-Oeste', executivo: 'Carlos Eduardo Lima', compensacao: 0, juros: 0, boletoVitbank: 0, pixMonetali: 0, diasAtraso: 0, parcelas: 0, situacao: 'recuperado', flags: [] },
  { id: '17', nome: 'Academia Corpo em Forma', cnpj: '99.234.789/0001-34', regional: 'Sudeste', executivo: 'Ana Paula Ribeiro', compensacao: 9450.00, juros: 945.00, boletoVitbank: 5670.00, pixMonetali: 3780.00, diasAtraso: 41, parcelas: 2, situacao: 'em_atraso', flags: ['sem_contato'] },
  { id: '18', nome: 'Papelaria Central Ltda', cnpj: '10.345.890/0001-67', regional: 'Nordeste', executivo: 'Fernanda Gomes', compensacao: 2890.00, juros: 144.50, boletoVitbank: 1734.00, pixMonetali: 1156.00, diasAtraso: 10, parcelas: 1, situacao: 'parcial', flags: [] },
  { id: '19', nome: 'Metalúrgica Aço Forte', cnpj: '21.456.901/0001-90', regional: 'Sul', executivo: 'Roberto Nascimento', compensacao: 54320.00, juros: 10864.00, boletoVitbank: 32592.00, pixMonetali: 21728.00, diasAtraso: 145, parcelas: 9, situacao: 'juridico', flags: ['reincidente', 'protesto', 'cobranca_judicial', 'sem_contato'] },
  { id: '20', nome: 'Gráfica Impressão Digital', cnpj: '32.567.012/0001-23', regional: 'Norte', executivo: 'Mariana Costa', compensacao: 7150.00, juros: 572.00, boletoVitbank: 4290.00, pixMonetali: 2860.00, diasAtraso: 22, parcelas: 1, situacao: 'em_atraso', flags: ['promessa_quebrada'] },
];

export const collectionEvents: CollectionEvent[] = [
  { id: '1', clientId: '1', date: '2026-03-18', type: 'phone', description: 'Contato telefônico. Cliente disse que está com dificuldades financeiras.', agent: 'Ana Paula Ribeiro' },
  { id: '2', clientId: '1', date: '2026-03-10', type: 'email', description: 'Enviado lembrete de comissão atrasada.', agent: 'Sistema' },
  { id: '3', clientId: '2', date: '2026-02-28', type: 'letter', description: 'Notificação extrajudicial enviada via AR.', agent: 'Carlos Eduardo Lima' },
  { id: '4', clientId: '2', date: '2026-03-15', type: 'legal', description: 'Protesto realizado em cartório.', agent: 'Dr. Roberto Mendes' },
  { id: '5', clientId: '4', date: '2026-03-01', type: 'legal', description: 'Ação de cobrança judicial distribuída.', agent: 'Dr. Roberto Mendes' },
  { id: '6', clientId: '4', date: '2026-02-15', type: 'phone', description: 'Tentativa de contato sem sucesso.', agent: 'Roberto Nascimento' },
  { id: '7', clientId: '8', date: '2026-03-20', type: 'email', description: 'Acordo proposto por e-mail. Sem resposta.', agent: 'Fernanda Gomes' },
  { id: '8', clientId: '12', date: '2026-03-05', type: 'legal', description: 'Protesto de títulos realizado.', agent: 'Dr. Roberto Mendes' },
  { id: '9', clientId: '19', date: '2026-02-20', type: 'letter', description: 'Carta de cobrança devolvida pelo correio.', agent: 'Roberto Nascimento' },
  { id: '10', clientId: '13', date: '2026-03-25', type: 'phone', description: 'Cliente atendeu, pediu prazo de 15 dias.', agent: 'Fernanda Gomes' },
];

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const situacaoLabels: Record<Situacao, string> = {
  em_atraso: 'Em Atraso',
  negociacao: 'Em Negociação',
  juridico: 'Jurídico',
  recuperado: 'Recuperado',
  parcial: 'Pagamento Parcial',
};

export const situacaoColors: Record<Situacao, string> = {
  em_atraso: 'status-overdue',
  negociacao: 'status-negotiation',
  juridico: 'status-legal',
  recuperado: 'status-recovered',
  parcial: 'status-partial',
};

export const flagLabels: Record<Flag, string> = {
  reincidente: 'Reincidente',
  sem_contato: 'Sem Contato',
  promessa_quebrada: 'Promessa Quebrada',
  acordo_vigente: 'Acordo Vigente',
  protesto: 'Protesto',
  cobranca_judicial: 'Cobrança Judicial',
};

export const flagColors: Record<Flag, string> = {
  reincidente: 'bg-overdue/20 text-overdue border-overdue/30',
  sem_contato: 'bg-muted text-muted-foreground border-border',
  promessa_quebrada: 'bg-negotiation/20 text-negotiation border-negotiation/30',
  acordo_vigente: 'bg-recovered/20 text-recovered border-recovered/30',
  protesto: 'bg-legal/20 text-legal border-legal/30',
  cobranca_judicial: 'bg-overdue/20 text-overdue border-overdue/30',
};
