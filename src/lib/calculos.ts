/**
 * Cálculos centralizados de juros e multa.
 *
 * Regra de negócio:
 *   - Multa: cobrada 1x (fixa) quando o cliente fica inadimplente (dias > 0).
 *     Não é multiplicada por dias nem por meses.
 *   - Juros: cobrados por dia de atraso (juros simples).
 *
 * Se a fórmula mudar no futuro, altere AQUI (único lugar).
 */

export interface JurosEMultaResult {
  juros: number;
  multa: number;
  total: number;
  dias: number;
}

/**
 * Calcula juros e multa para um valor devido, dada a data de vencimento e as
 * premissas vigentes (taxa ao dia e multa fixa, ambos em percentual).
 *
 * Exemplo:
 *   calcularJurosEMulta(75000, new Date('2026-02-23'), 0.033, 2.0)
 *   // { juros: 1113.75, multa: 1500, total: 2613.75, dias: 45 }
 */
export function calcularJurosEMulta(
  valor: number,
  dataVencimento: Date | string | null | undefined,
  taxaJurosDia: number,
  multaAtraso: number,
  hoje: Date = new Date()
): JurosEMultaResult {
  if (!valor || valor <= 0 || !dataVencimento) {
    return { juros: 0, multa: 0, total: 0, dias: 0 };
  }

  const vcto = dataVencimento instanceof Date ? dataVencimento : new Date(dataVencimento);
  if (isNaN(vcto.getTime())) {
    return { juros: 0, multa: 0, total: 0, dias: 0 };
  }

  const diffMs = hoje.getTime() - vcto.getTime();
  const dias = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (dias === 0) {
    return { juros: 0, multa: 0, total: 0, dias: 0 };
  }

  // Multa: cobrada 1x (fixa)
  const multa = valor * (multaAtraso / 100);

  // Juros: por dia
  const juros = valor * (taxaJurosDia / 100) * dias;

  const round2 = (v: number) => Math.round(v * 100) / 100;

  return {
    juros: round2(juros),
    multa: round2(multa),
    total: round2(juros + multa),
    dias,
  };
}

/**
 * Soma dois resultados de juros e multa (útil pra agregar VitBank + Monetali
 * ou múltiplos pagamentos em um único número por cliente).
 */
export function somarJurosEMulta(
  ...resultados: JurosEMultaResult[]
): JurosEMultaResult {
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const juros = resultados.reduce((s, r) => s + r.juros, 0);
  const multa = resultados.reduce((s, r) => s + r.multa, 0);
  const diasMax = resultados.reduce((m, r) => Math.max(m, r.dias), 0);
  return {
    juros: round2(juros),
    multa: round2(multa),
    total: round2(juros + multa),
    dias: diasMax,
  };
}
