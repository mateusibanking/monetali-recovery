import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EncargosEmpresa {
  principal: number;
  totalEncargos: number;
  totalComEncargos: number;
  percentual: number;
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
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface ViewRow {
  total_vitbank: number | null;
  total_monetali: number | null;
  inadimplente_vitbank: number | null;
  inadimplente_monetali: number | null;
  recuperado_vitbank: number | null;
  recuperado_monetali: number | null;
  encargos_vitbank: number | null;
  encargos_monetali: number | null;
  qtd_em_aberto: number | null;
}

const EMPTY_EMPRESA: EncargosEmpresa = {
  principal: 0,
  totalEncargos: 0,
  totalComEncargos: 0,
  percentual: 0,
};

const round2 = (v: number) => Math.round(v * 100) / 100;

export function useClienteEncargos(clienteId: string): ClienteEncargosData {
  const [row, setRow] = useState<ViewRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!clienteId) return;
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('clientes_com_totais')
        .select(
          'total_vitbank, total_monetali, inadimplente_vitbank, inadimplente_monetali, recuperado_vitbank, recuperado_monetali, encargos_vitbank, encargos_monetali, qtd_em_aberto'
        )
        .eq('id', clienteId)
        .maybeSingle();
      if (err) throw err;
      setRow(data as ViewRow | null);
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

  const derived = useMemo(() => {
    if (!row) {
      return {
        vitbank: EMPTY_EMPRESA,
        monetali: EMPTY_EMPRESA,
        totalGeral: 0,
        compensacaoTotal: 0,
        inadimplente: 0,
        recuperado: 0,
        percentualRecuperado: 0,
        qtdEmAberto: 0,
      };
    }

    const principalVb = Number(row.inadimplente_vitbank) || 0;
    const principalMn = Number(row.inadimplente_monetali) || 0;
    const encargosVb = Number(row.encargos_vitbank) || 0;
    const encargosMn = Number(row.encargos_monetali) || 0;
    const totalVb = Number(row.total_vitbank) || 0;
    const totalMn = Number(row.total_monetali) || 0;
    const recuperadoVb = Number(row.recuperado_vitbank) || 0;
    const recuperadoMn = Number(row.recuperado_monetali) || 0;

    const totalComEncargosVb = principalVb + encargosVb;
    const totalComEncargosMn = principalMn + encargosMn;
    const totalGeral = totalComEncargosVb + totalComEncargosMn;

    const percVb = totalGeral > 0 ? round2((totalComEncargosVb / totalGeral) * 100) : 0;
    const percMn = totalGeral > 0 ? round2((totalComEncargosMn / totalGeral) * 100) : 0;

    const compensacaoTotal = totalVb + totalMn;
    const inadimplente = principalVb + principalMn;
    const recuperado = recuperadoVb + recuperadoMn;
    const percentualRecuperado =
      inadimplente > 0 ? round2((recuperado / inadimplente) * 100) : 0;

    return {
      vitbank: {
        principal: round2(principalVb),
        totalEncargos: round2(encargosVb),
        totalComEncargos: round2(totalComEncargosVb),
        percentual: percVb,
      },
      monetali: {
        principal: round2(principalMn),
        totalEncargos: round2(encargosMn),
        totalComEncargos: round2(totalComEncargosMn),
        percentual: percMn,
      },
      totalGeral: round2(totalGeral),
      compensacaoTotal: round2(compensacaoTotal),
      inadimplente: round2(inadimplente),
      recuperado: round2(recuperado),
      percentualRecuperado,
      qtdEmAberto: Number(row.qtd_em_aberto) || 0,
    };
  }, [row]);

  return {
    ...derived,
    loading,
    error,
    refetch: fetchData,
  };
}
