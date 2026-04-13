import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RecuperacaoMensal {
  mes_recuperacao: string;
  total_vitbank: number;
  total_monetali: number;
  total_geral: number;
}

/**
 * Busca dados de recuperação mensal diretamente de pagamentos_atraso,
 * agrupando por mês da data de pagamento efetivo (pgto_vitbank / pgto_monetali).
 *
 * Antes buscava da view vw_recuperacao_mensal (que lia de `recuperacoes`, tabela vazia).
 */
export function useRecuperacaoMensal() {
  const [data, setData] = useState<RecuperacaoMensal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar pagamentos com pgto_vitbank preenchido
      const { data: pgtosVB, error: errVB } = await supabase
        .from('pagamentos_atraso')
        .select('pgto_vitbank, vitbank, valor_pago_vitbank')
        .not('pgto_vitbank', 'is', null)
        .is('deleted_at', null);

      if (errVB) throw errVB;

      // Buscar pagamentos com pgto_monetali preenchido
      const { data: pgtosMN, error: errMN } = await supabase
        .from('pagamentos_atraso')
        .select('pgto_monetali, monetali, valor_pago_monetali')
        .not('pgto_monetali', 'is', null)
        .is('deleted_at', null);

      if (errMN) throw errMN;

      // Agrupar VitBank por mês de pgto_vitbank
      const recupVBPorMes: Record<string, number> = {};
      (pgtosVB || []).forEach((p: any) => {
        const dateStr = String(p.pgto_vitbank || '');
        if (dateStr.length < 7) return;
        const mes = dateStr.substring(0, 7);
        recupVBPorMes[mes] = (recupVBPorMes[mes] || 0) + (Number(p.valor_pago_vitbank) || Number(p.vitbank) || 0);
      });

      // Agrupar Monetali por mês de pgto_monetali
      const recupMNPorMes: Record<string, number> = {};
      (pgtosMN || []).forEach((p: any) => {
        const dateStr = String(p.pgto_monetali || '');
        if (dateStr.length < 7) return;
        const mes = dateStr.substring(0, 7);
        recupMNPorMes[mes] = (recupMNPorMes[mes] || 0) + (Number(p.valor_pago_monetali) || Number(p.monetali) || 0);
      });

      // Coletar todos os meses com dados
      const allMonths = new Set([...Object.keys(recupVBPorMes), ...Object.keys(recupMNPorMes)]);

      // Montar array ordenado por mês
      const result: RecuperacaoMensal[] = Array.from(allMonths)
        .sort()
        .map(mes => {
          const vb = recupVBPorMes[mes] || 0;
          const mn = recupMNPorMes[mes] || 0;
          return {
            mes_recuperacao: mes,
            total_vitbank: vb,
            total_monetali: mn,
            total_geral: vb + mn,
          };
        });

      setData(result);
    } catch (e: any) {
      console.error('useRecuperacaoMensal error:', e);
      setError(e.message || 'Erro ao carregar recuperação mensal');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
