import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DbRecuperacao } from '@/lib/supabaseMappers';

export interface Recuperacao {
  id: string;
  clienteId: string;
  pagamentoId: string | null;
  valor: number;
  dataRecebimento: string;
  formaPagamento: string | null;
  mesReferencia: string | null;
  createdAt: string;
}

interface UseRecuperacoesReturn {
  data: Recuperacao[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (params: {
    clienteId: string;
    valor: number;
    dataRecebimento: string;
    formaPagamento?: string;
    mesReferencia?: string;
    pagamentoId?: string;
  }) => Promise<boolean>;
  totals: {
    hoje: number;
    semana: number;
    mes: number;
  };
}

function mapDbRecuperacao(row: DbRecuperacao): Recuperacao {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    pagamentoId: row.pagamento_id,
    valor: Number(row.valor) || 0,
    dataRecebimento: row.data_recebimento,
    formaPagamento: row.forma_pagamento,
    mesReferencia: row.mes_referencia,
    createdAt: row.created_at,
  };
}

export function useRecuperacoes(mesReferencia?: string): UseRecuperacoesReturn {
  const [data, setData] = useState<Recuperacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecuperacoes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('recuperacoes')
        .select('*')
        .order('data_recebimento', { ascending: false });

      if (mesReferencia) {
        query = query.eq('mes_referencia', mesReferencia);
      }

      const { data: rows, error: err } = await query;
      if (err) throw err;

      setData((rows as DbRecuperacao[]).map(mapDbRecuperacao));
    } catch (err: any) {
      console.error('useRecuperacoes fetch error:', err);
      setError(err.message || 'Erro ao carregar recuperações');
    } finally {
      setLoading(false);
    }
  }, [mesReferencia]);

  useEffect(() => {
    fetchRecuperacoes();
  }, [fetchRecuperacoes]);

  const create = async (params: {
    clienteId: string;
    valor: number;
    dataRecebimento: string;
    formaPagamento?: string;
    mesReferencia?: string;
    pagamentoId?: string;
  }): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('recuperacoes').insert({
        cliente_id: params.clienteId,
        valor: params.valor,
        data_recebimento: params.dataRecebimento,
        forma_pagamento: params.formaPagamento || null,
        mes_referencia: params.mesReferencia || null,
        pagamento_id: params.pagamentoId || null,
      });

      if (err) throw err;
      await fetchRecuperacoes();
      return true;
    } catch (err: any) {
      console.error('useRecuperacoes create error:', err);
      return false;
    }
  };

  // Calculate totals
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const totals = {
    hoje: data.filter(r => r.dataRecebimento === today).reduce((s, r) => s + r.valor, 0),
    semana: data.filter(r => r.dataRecebimento >= weekAgo).reduce((s, r) => s + r.valor, 0),
    mes: data.filter(r => r.dataRecebimento >= monthStart).reduce((s, r) => s + r.valor, 0),
  };

  return { data, loading, error, refetch: fetchRecuperacoes, create, totals };
}
