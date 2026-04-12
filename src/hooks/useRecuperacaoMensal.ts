import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RecuperacaoMensal {
  mes_recuperacao: string;
  total_vitbank: number;
  total_monetali: number;
  total_geral: number;
}

export function useRecuperacaoMensal() {
  const [data, setData] = useState<RecuperacaoMensal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: rows, error: err } = await supabase
        .from('vw_recuperacao_mensal')
        .select('*')
        .order('mes_recuperacao', { ascending: true });

      if (err) throw err;

      setData(
        (rows || []).map((r: any) => ({
          mes_recuperacao: r.mes_recuperacao || '',
          total_vitbank: Number(r.total_vitbank) || 0,
          total_monetali: Number(r.total_monetali) || 0,
          total_geral: Number(r.total_geral) || 0,
        }))
      );
    } catch (e: any) {
      console.error('useRecuperacaoMensal error:', e);
      setError(e.message || 'Erro ao carregar recuperação mensal');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
