// Global premissas store
export interface EmailTemplate {
  id: string;
  nome: string;
  assunto: string;
  corpo: string;
}

export interface Premissas {
  taxaJurosDia: number;
  taxaJurosMes: number;
  multaAtraso: number;
  diasCarencia: number;
  diasEscalacaoJuridica: number;
  emailRemetente: string;
  templates: EmailTemplate[];
}

export const premissas: Premissas = {
  taxaJurosDia: 0.033,
  taxaJurosMes: 1.0,
  multaAtraso: 2.0,
  diasCarencia: 5,
  diasEscalacaoJuridica: 90,
  emailRemetente: 'cobranca@monetali.com.br',
  templates: [
    {
      id: '1',
      nome: 'Cobrança Inicial',
      assunto: 'Aviso de pendência financeira — {{nome_cliente}}',
      corpo: `Prezado(a) {{nome_cliente}},

Identificamos que o pagamento referente ao valor de {{valor_total}}, com vencimento original em {{dias_atraso}} dias atrás, encontra-se pendente.

CNPJ: {{cnpj}}
Parcelas em aberto: {{parcelas_abertas}}
Valor total atualizado: {{valor_total}}

Gostaríamos de entender sua situação e oferecer alternativas para regularização. Nosso canal de negociação está à disposição para encontrar a melhor solução.

Caso o pagamento já tenha sido efetuado, por favor desconsidere esta mensagem e nos envie o comprovante.

Atenciosamente,
Equipe Monetali
cobranca@monetali.com.br`,
    },
    {
      id: '2',
      nome: 'Lembrete 30 dias',
      assunto: 'URGENTE: Débito pendente há {{dias_atraso}} dias — {{nome_cliente}}',
      corpo: `Prezado(a) {{nome_cliente}},

Esta é uma notificação urgente referente ao débito em seu nome, pendente há {{dias_atraso}} dias.

CNPJ: {{cnpj}}
Valor total atualizado (com juros e multa): {{valor_total}}
Parcelas em aberto: {{parcelas_abertas}}

Informamos que juros e multa continuam sendo aplicados diariamente conforme contrato, aumentando o valor da dívida.

A não regularização poderá acarretar em:
• Inclusão nos órgãos de proteção ao crédito
• Suspensão de serviços
• Encaminhamento ao departamento jurídico

Solicitamos a regularização imediata ou o contato para negociação.

Atenciosamente,
Equipe Monetali
cobranca@monetali.com.br`,
    },
    {
      id: '3',
      nome: 'Pré-Jurídico',
      assunto: 'NOTIFICAÇÃO EXTRAJUDICIAL — {{nome_cliente}} — CNPJ {{cnpj}}',
      corpo: `Prezado(a) {{nome_cliente}},

Pelo presente, NOTIFICAMOS formalmente que o débito abaixo discriminado, após reiteradas tentativas de contato e negociação sem êxito, será encaminhado ao departamento jurídico para as medidas cabíveis.

CNPJ: {{cnpj}}
Valor total atualizado: {{valor_total}}
Dias em atraso: {{dias_atraso}}
Parcelas em aberto: {{parcelas_abertas}}

Caso a regularização não seja efetuada no prazo de 5 (cinco) dias úteis a contar do recebimento desta notificação, serão adotadas as seguintes providências:
1. Inscrição nos órgãos de proteção ao crédito (SPC/Serasa)
2. Ajuizamento de ação de cobrança
3. Protesto de títulos

Este é o último contato antes do encaminhamento jurídico.

Atenciosamente,
Departamento de Cobrança
Monetali
cobranca@monetali.com.br`,
    },
  ],
};

/**
 * @deprecated Use `calcularJurosEMulta` de `@/lib/calculos` com premissas do DB.
 * Mantido como atalho pra chamadas legadas que só têm valor original e dias de atraso.
 * Regra: multa é fixa (1x), juros crescem por dia.
 */
export const calcularJuros = (
  valorOriginal: number,
  diasAtraso: number
): { jurosAcumulados: number; valorAtualizado: number } => {
  const diasEfetivos = Math.max(0, diasAtraso - premissas.diasCarencia);
  if (diasEfetivos <= 0 || valorOriginal <= 0) {
    return { jurosAcumulados: 0, valorAtualizado: valorOriginal };
  }
  // Juros: por dia (juros simples)
  const juros = valorOriginal * (premissas.taxaJurosDia / 100) * diasEfetivos;
  // Multa: fixa (1x), cobrada quando dias > 0
  const multa = valorOriginal * (premissas.multaAtraso / 100);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  return {
    jurosAcumulados: round2(juros + multa),
    valorAtualizado: round2(valorOriginal + juros + multa),
  };
};

export const TEMPLATE_VARIABLES = [
  { key: '{{nome_cliente}}', desc: 'Nome do cliente' },
  { key: '{{valor_total}}', desc: 'Valor total atualizado' },
  { key: '{{dias_atraso}}', desc: 'Dias em atraso' },
  { key: '{{parcelas_abertas}}', desc: 'Quantidade de parcelas em aberto' },
  { key: '{{cnpj}}', desc: 'CNPJ do cliente' },
];
