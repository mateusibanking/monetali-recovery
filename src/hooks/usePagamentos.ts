import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Payment } from '@/data/mockData';
import { mapDbPagamentoToPayment, mapPaymentToDbInsert, mapPaymentToDbUpdate } from '@/lib/supabaseMappers';
import type { DbPagamento } from '@/lib/supabaseMappers';

interface UsePagamentosReturn {
  data: Payment[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (payment: Partial<Payment>, clienteId: string) => Promise<Payment | null>;
  update: (id: string, fields: Partial<Payment>) => Promise<boolean>;
  softDelete: (id: string) => Promise<boolean>;
  getTotalByCliente: () => number;
}

export function usePagamentos(clienteId?: string): UsePagamentosReturn {
  const [data, setData] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPagamentos = useCallback(async () => {
    if (!clienteId) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: rows, error: err } = await supabase
        .from('pagamentos_atraso')
        .select('*')
        .eq('cliente_id', clienteId)
        .is('deleted_at', null)
        .order('data_vencimento', { ascending: false });

      if (err) throw err;

      const mapped = (rows as DbPagamento[]).map(mapDbPagamentoToPayment);
      setData(mapped);
    } catch (err: any) {
      console.error('usePagamentos fetch error:', err);
      setError(err.message || 'Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    fetchPagamentos();
  }, [fetchPagamentos]);

  const create = async (payment: Partial<Payment>, cId: string): Promise<Payment | null> => {
    try {
      const insert = mapPaymentToDbInsert(payment, cId);
      const { data: row, error: err } = await supabase
        .from('pagamentos_atraso')
        .insert(insert)
        .select()
        .single();

      if (err) throw err;
      await fetchPagamentos();
      return mapDbPagamentoToPayment(row as DbPagamento);
    } catch (err: any) {
      console.error('usePagamentos create error:', err);
      return null;
    }
  };

  const update = async (id: string, fields: Partial<Payment>): Promise<boolean> => {
    try {
      const dbUpdate = mapPaymentToDbUpdate(fields);

      // Auto-set data_pagamento to now if status is Pago and caller didn't set one
      if (fields.status === 'Pago' && fields.dataPagamento === undefined) {
        dbUpdate.data_pagamento = new Date().toISOString();
      }

      const { error: err } = await supabase
        .from('pagamentos_atraso')
        .update(dbUpdate)
        .eq('id', id);

      if (err) throw err;
      await fetchPagamentos();
      return true;
    } catch (err: any) {
      console.error('usePagamentos update error:', err);
      return false;
    }
  };

  const softDelete = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('pagamentos_atraso')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (err) throw err;
      await fetchPagamentos();
      return true;
    } catch (err: any) {
      console.error('usePagamentos softDelete error:', err);
      return false;
    }
  };

  const getTotalByCliente = () => {
    return data.reduce((sum, p) => sum + p.valor, 0);
  };

  return { data, loading, error, refetch: fetchPagamentos, create, update, softDelete, getTotalByCliente };
}
