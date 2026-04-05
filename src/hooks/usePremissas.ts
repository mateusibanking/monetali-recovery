import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Premissas } from '@/data/premissas';
import type { DbPremissa } from '@/lib/supabaseMappers';

interface UsePremissasReturn {
  data: Premissas;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updatePremissa: (chave: string, valor: string) => Promise<boolean>;
}

const DEFAULT_PREMISSAS: Premissas = {
  taxaJurosDia: 0.033,
  taxaJurosMes: 1.0,
  multaAtraso: 2.0,
  diasCarencia: 5,
  diasEscalacaoJuridica: 90,
  emailRemetente: 'cobranca@monetali.com.br',
  templates: [],
};

const chaveToField: Record<string, keyof Premissas> = {
  'taxa_juros_dia': 'taxaJurosDia',
  'taxa_juros_mes': 'taxaJurosMes',
  'multa_atraso': 'multaAtraso',
  'dias_carencia': 'diasCarencia',
  'dias_escalacao_juridico': 'diasEscalacaoJuridica',
  'email_remetente': 'emailRemetente',
};

export function usePremissas(): UsePremissasReturn {
  const [data, setData] = useState<Premissas>(DEFAULT_PREMISSAS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPremissas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: rows, error: err } = await supabase
        .from('premissas')
        .select('*');

      if (err) throw err;

      const premissas = { ...DEFAULT_PREMISSAS };
      (rows as DbPremissa[]).forEach(row => {
        const field = chaveToField[row.chave];
        if (field) {
          const numFields = ['taxaJurosDia', 'taxaJurosMes', 'multaAtraso', 'diasCarencia', 'diasEscalacaoJuridica'];
          if (numFields.includes(field)) {
            (premissas as any)[field] = parseFloat(row.valor) || 0;
          } else {
            (premissas as any)[field] = row.valor;
          }
        }
      });

      setData(premissas);
    } catch (err: any) {
      console.error('usePremissas fetch error:', err);
      setError(err.message || 'Erro ao carregar premissas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPremissas();
  }, [fetchPremissas]);

  const updatePremissa = async (chave: string, valor: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('premissas')
        .update({ valor, updated_by: 'Usuário' })
        .eq('chave', chave);

      if (err) throw err;
      await fetchPremissas();
      return true;
    } catch (err: any) {
      console.error('usePremissas update error:', err);
      return false;
    }
  };

  return { data, loading, error, refetch: fetchPremissas, updatePremissa };
}
