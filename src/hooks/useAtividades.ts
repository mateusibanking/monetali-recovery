import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TimelineEvent, CollectionEvent } from '@/data/mockData';
import { mapDbAtividadeToTimeline, mapDbAtividadeToCollectionEvent } from '@/lib/supabaseMappers';
import type { DbAtividade } from '@/lib/supabaseMappers';

interface UseAtividadesReturn {
  timeline: TimelineEvent[];
  events: CollectionEvent[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (params: {
    clienteId: string;
    tipo: 'comentario' | 'status' | 'email' | 'escalacao' | 'pagamento';
    descricao: string;
    criadoPor?: string;
  }) => Promise<boolean>;
}

export function useAtividades(clienteId?: string): UseAtividadesReturn {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [events, setEvents] = useState<CollectionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAtividades = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('atividades')
        .select('*')
        .order('created_at', { ascending: false });

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      const { data: rows, error: err } = await query;
      if (err) throw err;

      const dbRows = rows as DbAtividade[];
      setTimeline(dbRows.map(mapDbAtividadeToTimeline));
      setEvents(dbRows.map(mapDbAtividadeToCollectionEvent));
    } catch (err: any) {
      console.error('useAtividades fetch error:', err);
      setError(err.message || 'Erro ao carregar atividades');
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    fetchAtividades();
  }, [fetchAtividades]);

  const create = async (params: {
    clienteId: string;
    tipo: 'comentario' | 'status' | 'email' | 'escalacao' | 'pagamento';
    descricao: string;
    criadoPor?: string;
  }): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('atividades').insert({
        cliente_id: params.clienteId,
        tipo: params.tipo,
        descricao: params.descricao,
        criado_por: params.criadoPor || 'Usuário',
        automatico: false,
      });

      if (err) throw err;
      await fetchAtividades();
      return true;
    } catch (err: any) {
      console.error('useAtividades create error:', err);
      return false;
    }
  };

  return { timeline, events, loading, error, refetch: fetchAtividades, create };
}
