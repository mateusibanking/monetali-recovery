// Global premissas store
export interface Premissas {
  taxaJurosDia: number;
  taxaJurosMes: number;
  multaAtraso: number;
  diasCarencia: number;
  diasEscalacaoJuridica: number;
  emailRemetente: string;
  templates: { id: string; nome: string; corpo: string }[];
}

export const premissas: Premissas = {
  taxaJurosDia: 0.033,
  taxaJurosMes: 1.0,
  multaAtraso: 2.0,
  diasCarencia: 5,
  diasEscalacaoJuridica: 90,
  emailRemetente: 'cobranca@monetali.com.br',
  templates: [
    { id: '1', nome: 'Lembrete Inicial', corpo: 'Prezado(a) {nome},\n\nIdentificamos que o pagamento referente ao valor de {valor} encontra-se pendente desde {data_vencimento}.\n\nSolicitamos a regularização o mais breve possível.\n\nAtenciosamente,\nEquipe Monetali' },
    { id: '2', nome: 'Segunda Cobrança', corpo: 'Prezado(a) {nome},\n\nEsta é a segunda notificação referente ao débito de {valor}, vencido em {data_vencimento}.\n\nJuros e multa estão sendo aplicados conforme contrato.\n\nFavor entrar em contato para negociação.\n\nAtenciosamente,\nEquipe Monetali' },
    { id: '3', nome: 'Aviso Jurídico', corpo: 'Prezado(a) {nome},\n\nInformamos que o débito de {valor} será encaminhado ao departamento jurídico caso não seja regularizado em {dias_carencia} dias.\n\nAtenciosamente,\nEquipe Monetali' },
  ],
};

export const calcularJuros = (valorOriginal: number, diasAtraso: number): { jurosAcumulados: number; valorAtualizado: number } => {
  const diasEfetivos = Math.max(0, diasAtraso - premissas.diasCarencia);
  const jurosAcumulados = valorOriginal * (premissas.taxaJurosDia / 100) * diasEfetivos;
  const multa = diasEfetivos > 0 ? valorOriginal * (premissas.multaAtraso / 100) : 0;
  return {
    jurosAcumulados: Math.round((jurosAcumulados + multa) * 100) / 100,
    valorAtualizado: Math.round((valorOriginal + jurosAcumulados + multa) * 100) / 100,
  };
};
