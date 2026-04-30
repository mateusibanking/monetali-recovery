import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Parcela {
  valor_vitbank?: number;
  valor_monetali?: number;
  data_vitbank?: string;
  data_monetali?: string;
}

export type EmpresaParcelamento = 'vitbank' | 'monetali' | 'ambos';

export interface ParcelamentoConfig {
  pagamento_id: string;
  empresa: EmpresaParcelamento;
  parcelas: Parcela[];
}

export interface ParcelaRow {
  id: string;
  cliente_id: string;
  pagamento_original_id: string | null;
  numero_parcela: number | null;
  total_parcelas: number | null;
  valor: number;
  vitbank: number | null;
  monetali: number | null;
  vcto_vitbank: string | null;
  vcto_monetali: string | null;
  data_vencimento: string;
  status: string;
  [key: string]: unknown;
}

export function useParcelamento() {
  const [processando, setProcessando] = useState(false);

  const criarParcelamento = useCallback(async (config: ParcelamentoConfig) => {
    setProcessando(true);
    try {
      const { data, error } = await (supabase as any).rpc('criar_parcelamento', {
        p_pagamento_id: config.pagamento_id,
        p_empresa: config.empresa,
        p_parcelas: config.parcelas,
      });

      if (error) {
        toast.error('Erro ao criar parcelamento', { description: error.message });
        return { sucesso: false, error: error.message, data: null };
      }

      toast.success('Parcelamento criado', {
        description: `${config.parcelas.length} parcela(s) geradas.`,
      });
      return { sucesso: true, error: null, data };
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro inesperado';
      toast.error('Erro ao criar parcelamento', { description: mensagem });
      return { sucesso: false, error: mensagem, data: null };
    } finally {
      setProcessando(false);
    }
  }, []);

  const desfazerParcelamento = useCallback(async (pagamentoId: string) => {
    setProcessando(true);
    try {
      const { data, error } = await (supabase as any).rpc('desfazer_parcelamento', {
        p_pagamento_id: pagamentoId,
      });

      if (error) {
        toast.error('Erro ao desfazer parcelamento', { description: error.message });
        return { sucesso: false, error: error.message, data: null };
      }

      toast.success('Parcelamento desfeito');
      return { sucesso: true, error: null, data };
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro inesperado';
      toast.error('Erro ao desfazer parcelamento', { description: mensagem });
      return { sucesso: false, error: mensagem, data: null };
    } finally {
      setProcessando(false);
    }
  }, []);

  const buscarParcelas = useCallback(async (pagamentoId: string): Promise<ParcelaRow[]> => {
    const { data, error } = await (supabase as any)
      .from('pagamentos_atraso')
      .select('*')
      .eq('pagamento_original_id', pagamentoId)
      .order('numero_parcela', { ascending: true });

    if (error) {
      toast.error('Erro ao buscar parcelas', { description: error.message });
      return [];
    }
    return (data ?? []) as ParcelaRow[];
  }, []);

  return { processando, criarParcelamento, desfazerParcelamento, buscarParcelas };
}
