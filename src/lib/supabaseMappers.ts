/**
 * Mappers between Supabase DB rows and frontend types.
 *
 * DB schema (clientes):
 *   nome, cnpj, email, telefone, regional, executivo_responsavel,
 *   valor_total_atraso, qtd_pagamentos_atraso, dias_atraso_max, status
 *
 * Frontend type (Client):
 *   nome, cnpj, regional, executivo, compensacao, juros, boletoVitbank,
 *   pixMonetali, diasAtraso, parcelas, situacao, flags[], mes_referencia
 */

import type { Client, Situacao, Payment, PaymentStatus, TimelineEvent, CollectionEvent } from '@/data/mockData';

// ---- DB Row Types ----

export interface DbCliente {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  regional: string | null;
  executivo_responsavel: string | null;
  valor_total_atraso: number;
  qtd_pagamentos_atraso: number;
  dias_atraso_max: number;
  juros_total: number;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbPagamento {
  id: string;
  cliente_id: string;
  descricao: string | null;
  valor: number;
  data_vencimento: string;
  dias_atraso: number;
  status: string;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  mes_referencia: string | null;
  // VitBank / Monetali breakdown
  imposto: number | null;
  valor_compensacao: number | null;
  juros: number | null;
  vitbank: number | null;
  vcto_vitbank: string | null;
  pgto_vitbank: string | null;
  monetali: number | null;
  vcto_monetali: string | null;
  pgto_monetali: string | null;
  data_cobranca: string | null;
  motivo: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbAtividade {
  id: string;
  cliente_id: string;
  tipo: string;
  descricao: string;
  automatico: boolean;
  criado_por: string | null;
  created_at: string;
}

export interface DbRecuperacao {
  id: string;
  cliente_id: string;
  pagamento_id: string | null;
  valor: number;
  data_recebimento: string;
  forma_pagamento: string | null;
  mes_referencia: string | null;
  created_at: string;
}

export interface DbFlagCliente {
  id: string;
  cliente_id: string;
  nome_flag: string;
  cor: string;
  created_at: string;
}

export interface DbFlagDisponivel {
  id: string;
  nome: string;
  cor: string;
  created_at: string;
}

export interface DbPremissa {
  id: string;
  chave: string;
  valor: string;
  descricao: string | null;
  updated_at: string;
  updated_by: string | null;
}

// ---- Status Mapping ----

const dbStatusToSituacao: Record<string, Situacao> = {
  'nao_iniciado': 'NÃO INICIADO',
  'em_andamento': 'EM ANDAMENTO',
  'pendente': 'PENDENTE',
  'contatado': 'CONTATADO',
  'em_negociacao': 'EM NEGOCIAÇÃO',
  'acordo_fechado': 'ACORDO FECHADO',
  'pago': 'PAGO',
  'juridico': 'JURÍDICO',
  'parcelado': 'PARCELADO',
  'distrato': 'DISTRATO',
};

const situacaoToDbStatus: Record<Situacao, string> = {
  'NÃO INICIADO': 'nao_iniciado',
  'EM ANDAMENTO': 'em_andamento',
  'PENDENTE': 'pendente',
  'CONTATADO': 'contatado',
  'EM NEGOCIAÇÃO': 'em_negociacao',
  'ACORDO FECHADO': 'acordo_fechado',
  'PAGO': 'pago',
  'JURÍDICO': 'juridico',
  'PARCELADO': 'parcelado',
  'DISTRATO': 'distrato',
};

const dbPaymentStatusToFrontend: Record<string, PaymentStatus> = {
  'em_aberto': 'Pendente',
  'parcial': 'Parcial',
  'pago': 'Pago',
  'cancelado': 'Vencido',
};

const frontendPaymentStatusToDb: Record<PaymentStatus, string> = {
  'Pendente': 'em_aberto',
  'Parcial': 'parcial',
  'Pago': 'pago',
  'Vencido': 'cancelado',
};

// ---- Mappers ----

export function mapDbClienteToClient(
  row: DbCliente,
  flags: string[] = [],
  mesReferencia: string = new Date().toISOString().slice(0, 7),
  boletoVitbank: number = 0,
  pixMonetali: number = 0,
): Client {
  return {
    id: row.id,
    nome: row.nome,
    cnpj: row.cnpj || '',
    regional: row.regional || '',
    executivo: row.executivo_responsavel || '',
    compensacao: Number(row.valor_total_atraso) || 0,
    juros: Number(row.juros_total) || 0,
    boletoVitbank,
    pixMonetali,
    diasAtraso: row.dias_atraso_max || 0,
    parcelas: row.qtd_pagamentos_atraso || 0,
    situacao: dbStatusToSituacao[row.status] || 'NÃO INICIADO',
    flags,
    mes_referencia: mesReferencia,
  };
}

export function mapClientToDbInsert(client: Partial<Client>) {
  return {
    nome: client.nome,
    cnpj: client.cnpj || null,
    regional: client.regional || null,
    executivo_responsavel: client.executivo || null,
    valor_total_atraso: client.compensacao || 0,
    qtd_pagamentos_atraso: client.parcelas || 0,
    dias_atraso_max: client.diasAtraso || 0,
    status: client.situacao ? situacaoToDbStatus[client.situacao] : 'nao_iniciado',
  };
}

export function mapClientToDbUpdate(fields: Partial<Client>) {
  const update: Record<string, any> = {};
  if (fields.nome !== undefined) update.nome = fields.nome;
  if (fields.cnpj !== undefined) update.cnpj = fields.cnpj || null;
  if (fields.regional !== undefined) update.regional = fields.regional || null;
  if (fields.executivo !== undefined) update.executivo_responsavel = fields.executivo || null;
  if (fields.compensacao !== undefined) update.valor_total_atraso = fields.compensacao;
  if (fields.parcelas !== undefined) update.qtd_pagamentos_atraso = fields.parcelas;
  if (fields.diasAtraso !== undefined) update.dias_atraso_max = fields.diasAtraso;
  if (fields.situacao !== undefined) update.status = situacaoToDbStatus[fields.situacao];
  return update;
}

export function mapDbPagamentoToPayment(row: DbPagamento): Payment {
  return {
    id: row.id,
    valor: Number(row.valor) || 0,
    dataVencimento: row.data_vencimento,
    descricao: row.descricao || `Pagamento`,
    status: dbPaymentStatusToFrontend[row.status] || 'Pendente',
    vitbank: Number(row.vitbank) || 0,
    vctoVitbank: row.vcto_vitbank || null,
    pgtoVitbank: row.pgto_vitbank || null,
    monetali: Number(row.monetali) || 0,
    vctoMonetali: row.vcto_monetali || null,
    pgtoMonetali: row.pgto_monetali || null,
    imposto: Number(row.imposto) || 0,
    valorCompensacao: Number(row.valor_compensacao) || 0,
    juros: Number(row.juros) || 0,
    mesReferencia: row.mes_referencia || null,
    dataCobranca: row.data_cobranca || null,
  };
}

export function mapPaymentToDbInsert(p: Partial<Payment>, clienteId: string) {
  return {
    cliente_id: clienteId,
    valor: p.valor || 0,
    data_vencimento: p.dataVencimento,
    descricao: p.descricao || null,
    status: p.status ? frontendPaymentStatusToDb[p.status] : 'em_aberto',
  };
}

export function mapDbAtividadeToTimeline(row: DbAtividade): TimelineEvent {
  const tipoMap: Record<string, TimelineEvent['type']> = {
    'comentario': 'note',
    'status': 'status_change',
    'email': 'email',
    'escalacao': 'legal',
    'pagamento': 'payment',
  };
  return {
    id: row.id,
    clientId: row.cliente_id,
    date: row.created_at,
    type: tipoMap[row.tipo] || 'note',
    description: row.descricao,
    agent: row.criado_por || 'Sistema',
  };
}

export function mapDbAtividadeToCollectionEvent(row: DbAtividade): CollectionEvent {
  const tipoMap: Record<string, CollectionEvent['type']> = {
    'comentario': 'meeting',
    'status': 'letter',
    'email': 'email',
    'escalacao': 'legal',
    'pagamento': 'phone',
  };
  return {
    id: row.id,
    clientId: row.cliente_id,
    date: row.created_at.split('T')[0],
    type: tipoMap[row.tipo] || 'phone',
    description: row.descricao,
    agent: row.criado_por || 'Sistema',
  };
}

export { situacaoToDbStatus, dbStatusToSituacao, frontendPaymentStatusToDb, dbPaymentStatusToFrontend };
