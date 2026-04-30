import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SyncResult {
  sucesso: boolean;
  sync_id?: string;
  lidos?: number;
  inseridos?: number;
  atualizados?: number;
  ignorados?: number;
  erros?: number;
  headers_detectados?: string[];
  indices_resolvidos?: Record<string, number>;
  mensagem?: string;
}

export interface SyncLogRow {
  id: string;
  fonte: string;
  iniciado_em: string;
  finalizado_em: string | null;
  status: string | null;
  lidos: number | null;
  inseridos: number | null;
  atualizados: number | null;
  ignorados: number | null;
  erros: number | null;
  mensagem: string | null;
  detalhes: unknown;
}

export function useSyncPlanilha() {
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState<SyncResult | null>(null);

  const sincronizar = useCallback(async (payload?: Record<string, unknown>): Promise<SyncResult> => {
    setSincronizando(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-planilha', {
        body: payload ?? {},
      });

      if (error) {
        const result: SyncResult = {
          sucesso: false,
          mensagem: error.message || 'Erro ao sincronizar planilha',
        };
        setUltimoResultado(result);
        toast.error('Falha na sincronização', { description: result.mensagem });
        return result;
      }

      const result = (data ?? { sucesso: false }) as SyncResult;
      setUltimoResultado(result);

      if (result.sucesso) {
        const partes: string[] = [];
        if (typeof result.lidos === 'number') partes.push(`${result.lidos} lidos`);
        if (typeof result.inseridos === 'number') partes.push(`${result.inseridos} inseridos`);
        if (typeof result.atualizados === 'number') partes.push(`${result.atualizados} atualizados`);
        if (typeof result.ignorados === 'number') partes.push(`${result.ignorados} ignorados`);
        if (typeof result.erros === 'number' && result.erros > 0) partes.push(`${result.erros} erros`);
        toast.success('Sincronização concluída', {
          description: partes.join(' · ') || result.mensagem,
        });
      } else {
        toast.error('Sincronização falhou', {
          description: result.mensagem || 'Verifique os logs para mais detalhes.',
        });
      }

      return result;
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro inesperado';
      const result: SyncResult = { sucesso: false, mensagem };
      setUltimoResultado(result);
      toast.error('Erro ao sincronizar', { description: mensagem });
      return result;
    } finally {
      setSincronizando(false);
    }
  }, []);

  const buscarHistorico = useCallback(async (limite: number = 10): Promise<SyncLogRow[]> => {
    const { data, error } = await (supabase as any)
      .from('sync_log')
      .select('*')
      .eq('fonte', 'planilha')
      .order('iniciado_em', { ascending: false })
      .limit(limite);

    if (error) {
      toast.error('Erro ao buscar histórico', { description: error.message });
      return [];
    }
    return (data ?? []) as SyncLogRow[];
  }, []);

  return { sincronizando, ultimoResultado, sincronizar, buscarHistorico };
}
