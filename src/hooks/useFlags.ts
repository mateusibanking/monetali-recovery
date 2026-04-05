import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Flag } from '@/data/mockData';
import type { DbFlagCliente, DbFlagDisponivel } from '@/lib/supabaseMappers';

interface UseFlagsReturn {
  flagsDisponiveis: Flag[];
  flagsCliente: Flag[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addFlag: (clienteId: string, flag: string) => Promise<boolean>;
  removeFlag: (clienteId: string, flag: string) => Promise<boolean>;
}

export function useFlags(clienteId?: string): UseFlagsReturn {
  const [flagsDisponiveis, setFlagsDisponiveis] = useState<Flag[]>([]);
  const [flagsCliente, setFlagsCliente] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch available flags
      const { data: disponiveis, error: err1 } = await supabase
        .from('flags_disponiveis')
        .select('*')
        .order('nome');

      if (err1) throw err1;
      setFlagsDisponiveis((disponiveis as DbFlagDisponivel[]).map(f => f.nome));

      // Fetch client flags if clienteId provided
      if (clienteId) {
        const { data: clienteFlags, error: err2 } = await supabase
          .from('flags_cliente')
          .select('*')
          .eq('cliente_id', clienteId);

        if (err2) throw err2;
        setFlagsCliente((clienteFlags as DbFlagCliente[]).map(f => f.nome_flag));
      }
    } catch (err: any) {
      console.error('useFlags fetch error:', err);
      setError(err.message || 'Erro ao carregar flags');
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const addFlag = async (cId: string, flag: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('flags_cliente').insert({
        cliente_id: cId,
        nome_flag: flag,
      });

      if (err) throw err;
      if (cId === clienteId) {
        setFlagsCliente(prev => [...prev, flag]);
      }
      return true;
    } catch (err: any) {
      console.error('useFlags addFlag error:', err);
      return false;
    }
  };

  const removeFlag = async (cId: string, flag: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('flags_cliente')
        .delete()
        .eq('cliente_id', cId)
        .eq('nome_flag', flag);

      if (err) throw err;
      if (cId === clienteId) {
        setFlagsCliente(prev => prev.filter(f => f !== flag));
      }
      return true;
    } catch (err: any) {
      console.error('useFlags removeFlag error:', err);
      return false;
    }
  };

  return { flagsDisponiveis, flagsCliente, loading, error, refetch: fetchFlags, addFlag, removeFlag };
}
