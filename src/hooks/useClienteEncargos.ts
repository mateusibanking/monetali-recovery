import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calcularJurosEMulta } from '@/lib/calculos';

export interface EncargosEmpresa {
  principal: number;        // valor em aberto (não pago)
  multa: number;            // multa fixa (2%, 1x)
  juros: number;            // juros diários acumulados
  totalEncargos: number;    // multa + juros
  totalComEncargos: number; // principal + multa + juros
  percentual: number;       // % do total geral que essa empresa representa
}

export interface ClienteEncargosData {
  vitbank: EncargosEmpresa;
  monetali: EncargosEmpresa;
  totalGeral: number;
  compensacaoTotal: number;
  inadimplente: number;
  recuperado: number;
  percentualRecuperado: number;
  qtdEmAberto: number;
  valorEmAberto: number;
  loading: boolean;
  error: string | null;
}

const EMPTY_EMPRESA: EncargosEmpresa = {
  principal: 0,
  multa: 0,
  juros: 0,
  totalEncargos: 0,
  totalComEncargos: 0,
  percentual: 0,
};

const round2 = (v: number) => Math.round(v * 100) / 100;

interface ViewRow {
  total_vitbank: number;
  total_monetali: number;
  inadimplente_vitbank: number;
  inadimplente_monetali: number;
  recuperado_vitbank: number;
  recuperado_monetali: number;
  encargos_vitbank: number;
  encargos_monetali: number;
  qtd_em_aberto: number;
  valor_total_atraso?: number | null;
}

interface PagamentoRow {
  vitbank: number | null;
  monetali: number | null;
  valor: number | null;
  vcto_vitbank: string | null;
  vcto_monetali: string | null;
  pgto_vitbank: string | null;
  pgto_monetali: string | null;
  status: string | null;
}

interface PremissaRow {
  chave: string;
  valor: string;
}

/**
 * Hook que retorna encargos agrupados por empresa (Vitbank/Monetali)
 * para um cliente. Consome a view `clientes_com_totais` expandida;
 * em fallback, busca pagamentos e calcula no frontend.
 */
export function useClienteEncargos(clienteId: string): ClienteEncargosData {
  const [viewData, setViewData] = useState<ViewRow | null>(null);
  const [fallback, setFallback] = useState<{
    pagamentos: PagamentoRow[];
    taxaJurosDia: number;
    multaAtraso: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!clienteId) return;
    try {
      setLoading(true);
      setError(null);

      // 1) Tenta a view expandida primeiro
      const { data: row, error: viewErr } = await supabase
        .from('clientes_com_totais')
        .select('total_vitbank, total_monetali, inadimplente_vitbank, inadimplente_monetali, recuperado_vitbank, recuperado_monetali, encargos_vitbank, encargos_monetali, qtd_em_aberto, valor_total_atraso')
        .eq('id', clienteId)
        .maybeSingle();

      const hasExpandedView =
        !viewErr &&
        row &&
        'encargos_vitbank' in row &&
        'inadimplente_vitbank' in row;

      if (hasExpandedView) {
        setViewData(row as unknown as ViewRow);
        setFallback(null);
        return;
      }

      // 2) Fallback: busca pagamentos + premissas e calcula no frontend
      const [pgResp, prResp] = await Promise.all([
        supabase
          .from('pagamentos_atraso')
          .select('vitbank, monetali, valor, vcto_vitbank, vcto_monetali, pgto_vitbank, pgto_monetali, status')
          .eq('cliente_id', clienteId)
          .is('deleted_at', null),
        supabase
          .from('premissas')
          .select('chave, valor'),
      ]);

      if (pgResp.error) throw pgResp.error;
      if (prResp.error) throw prResp.error;

      const premissasMap = new Map<string, string>();
      (prResp.data as PremissaRow[] | null)?.forEach(p => {
        premissasMap.set(p.chave, p.valor);
      });
      const taxaJurosDia = parseFloat(premissasMap.get('taxa_juros_dia') ?? '0') || 0;
      const multaAtraso = parseFloat(premissasMap.get('multa_atraso') ?? '2') || 2;

      setFallback({
        pagamentos: (pgResp.data as PagamentoRow[]) || [],
        taxaJurosDia,
        multaAtraso,
      });
      setViewData(null);
    } catch (e) {
      const err = e as Error;
      setError(err.message || 'Erro ao carregar encargos');
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return useMemo<ClienteEncargosData>(() => {
    // --- CASO 1: view expandida disponível
    if (viewData) {
      const principalVb = Number(viewData.inadimplente_vitbank) || 0;
      const principalMn = Number(viewData.inadimplente_monetali) || 0;
      const encargosVb = Number(viewData.encargos_vitbank) || 0;
      const encargosMn = Number(viewData.encargos_monetali) || 0;
      const totalVb = Number(viewData.total_vitbank) || 0;
      const totalMn = Number(viewData.total_monetali) || 0;
      const recuperadoVb = Number(viewData.recuperado_vitbank) || 0;
      const recuperadoMn = Number(viewData.recuperado_monetali) || 0;

      const totalComEncargosVb = principalVb + encargosVb;
      const totalComEncargosMn = principalMn + encargosMn;
      const totalGeral = totalComEncargosVb + totalComEncargosMn;

      const percVb = totalGeral > 0 ? round2((totalComEncargosVb / totalGeral) * 100) : 0;
      const percMn = totalGeral > 0 ? round2((totalComEncargosMn / totalGeral) * 100) : 0;

      const compensacaoTotal = totalVb + totalMn;
      const inadimplente = principalVb + principalMn;
      const recuperado = recuperadoVb + recuperadoMn;
      const baseRecuperacao = inadimplente + recuperado;
      const percentualRecuperado = baseRecuperacao > 0 ? round2((recuperado / baseRecuperacao) * 100) : 0;

      return {
        vitbank: {
          principal: round2(principalVb),
          multa: 0, // view retorna encargos agregados; sem breakdown multa/juros
          juros: 0,
          totalEncargos: round2(encargosVb),
          totalComEncargos: round2(totalComEncargosVb),
          percentual: percVb,
        },
        monetali: {
          principal: round2(principalMn),
          multa: 0,
          juros: 0,
          totalEncargos: round2(encargosMn),
          totalComEncargos: round2(totalComEncargosMn),
          percentual: percMn,
        },
        totalGeral: round2(totalGeral),
        compensacaoTotal: round2(compensacaoTotal),
        inadimplente: round2(inadimplente),
        recuperado: round2(recuperado),
        percentualRecuperado,
        qtdEmAberto: Number(viewData.qtd_em_aberto) || 0,
        valorEmAberto: round2(inadimplente),
        loading,
        error,
      };
    }

    // --- CASO 2: fallback calculado no frontend
    if (fallback) {
      const hoje = new Date();
      const { pagamentos, taxaJurosDia, multaAtraso } = fallback;

      let principalVb = 0, principalMn = 0;
      let multaVb = 0, multaMn = 0;
      let jurosVb = 0, jurosMn = 0;
      let totalVb = 0, totalMn = 0;
      let recuperadoVb = 0, recuperadoMn = 0;
      let qtdEmAberto = 0;
      let valorEmAberto = 0;

      pagamentos.forEach(p => {
        const vb = Number(p.vitbank) || 0;
        const mn = Number(p.monetali) || 0;
        totalVb += vb;
        totalMn += mn;

        if (p.pgto_vitbank) {
          recuperadoVb += vb;
        } else {
          principalVb += vb;
          const r = calcularJurosEMulta(vb, p.vcto_vitbank, taxaJurosDia, multaAtraso, hoje);
          multaVb += r.multa;
          jurosVb += r.juros;
        }

        if (p.pgto_monetali) {
          recuperadoMn += mn;
        } else {
          principalMn += mn;
          const r = calcularJurosEMulta(mn, p.vcto_monetali, taxaJurosDia, multaAtraso, hoje);
          multaMn += r.multa;
          jurosMn += r.juros;
        }

        if (p.status === 'em_aberto') {
          qtdEmAberto += 1;
          valorEmAberto += Number(p.valor) || 0;
        }
      });

      const encargosVb = multaVb + jurosVb;
      const encargosMn = multaMn + jurosMn;
      const totalComEncargosVb = principalVb + encargosVb;
      const totalComEncargosMn = principalMn + encargosMn;
      const totalGeral = totalComEncargosVb + totalComEncargosMn;

      const percVb = totalGeral > 0 ? round2((totalComEncargosVb / totalGeral) * 100) : 0;
      const percMn = totalGeral > 0 ? round2((totalComEncargosMn / totalGeral) * 100) : 0;

      const compensacaoTotal = totalVb + totalMn;
      const inadimplente = principalVb + principalMn;
      const recuperado = recuperadoVb + recuperadoMn;
      const baseRecuperacao = inadimplente + recuperado;
      const percentualRecuperado = baseRecuperacao > 0 ? round2((recuperado / baseRecuperacao) * 100) : 0;

      return {
        vitbank: {
          principal: round2(principalVb),
          multa: round2(multaVb),
          juros: round2(jurosVb),
          totalEncargos: round2(encargosVb),
          totalComEncargos: round2(totalComEncargosVb),
          percentual: percVb,
        },
        monetali: {
          principal: round2(principalMn),
          multa: round2(multaMn),
          juros: round2(jurosMn),
          totalEncargos: round2(encargosMn),
          totalComEncargos: round2(totalComEncargosMn),
          percentual: percMn,
        },
        totalGeral: round2(totalGeral),
        compensacaoTotal: round2(compensacaoTotal),
        inadimplente: round2(inadimplente),
        recuperado: round2(recuperado),
        percentualRecuperado,
        qtdEmAberto,
        valorEmAberto: round2(valorEmAberto),
        loading,
        error,
      };
    }

    // --- estado inicial / vazio
    return {
      vitbank: EMPTY_EMPRESA,
      monetali: EMPTY_EMPRESA,
      totalGeral: 0,
      compensacaoTotal: 0,
      inadimplente: 0,
      recuperado: 0,
      percentualRecuperado: 0,
      qtdEmAberto: 0,
      valorEmAberto: 0,
      loading,
      error,
    };
  }, [viewData, fallback, loading, error]);
}
