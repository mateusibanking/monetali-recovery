import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Client, Situacao } from '@/data/mockData';
import { mapDbClienteToClient, mapClientToDbInsert, mapClientToDbUpdate, situacaoToDbStatus } from '@/lib/supabaseMappers';
import type { DbCliente, DbFlagCliente } from '@/lib/supabaseMappers';

interface UseClientesFilters {
  status?: Situacao;
  regional?: string;
  executivo?: string;
  search?: string;
}

interface UseClientesReturn {
  data: Client[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getById: (id: string) => Promise<Client | null>;
  create: (client: Partial<Client>) => Promise<Client | null>;
  update: (id: string, fields: Partial<Client>) => Promise<boolean>;
  softDelete: (id: string) => Promise<boolean>;
}

export function useClientes(filters?: UseClientesFilters): UseClientesReturn {
  const [data, setData] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query — usar view com 5 campos calculados
      let query = supabase
        .from('v_clientes_com_calculos')
        .select('*')
        .is('deleted_at', null)
        .order('inadimplente_total', { ascending: false });

      if (filters?.status) {
        const dbStatus = situacaoToDbStatus[filters.status];
        if (dbStatus) query = query.eq('status', dbStatus);
      }
      if (filters?.regional) {
        query = query.eq('regional', filters.regional);
      }
      if (filters?.executivo) {
        query = query.eq('executivo_responsavel', filters.executivo);
      }
      if (filters?.search) {
        const s = filters.search;
        query = query.or(`nome.ilike.%${s}%,cnpj.ilike.%${s}%,executivo_responsavel.ilike.%${s}%`);
      }

      const { data: clientes, error: err } = await query;
      if (err) throw err;

      // Fetch flags for all clients in batch
      const clienteIds = (clientes as DbCliente[]).map(c => c.id);
      let flagsMap: Record<string, string[]> = {};

      if (clienteIds.length > 0) {
        const { data: allFlags, error: flagErr } = await supabase
          .from('flags_cliente')
          .select('*')
          .in('cliente_id', clienteIds);

        if (!flagErr && allFlags) {
          (allFlags as DbFlagCliente[]).forEach(f => {
            if (!flagsMap[f.cliente_id]) flagsMap[f.cliente_id] = [];
            flagsMap[f.cliente_id].push(f.nome_flag);
          });
        }
      }

      // Os campos VB/Mon agora vêm da view (inadimplente_vitbank/monetali) — não precisa fetch extra.

      const mapped = (clientes as DbCliente[]).map(c =>
        mapDbClienteToClient(c, flagsMap[c.id] || [])
      );

      setData(mapped);
    } catch (err: any) {
      console.error('useClientes fetch error:', err);
      setError(err.message || 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.regional, filters?.executivo, filters?.search]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const getById = async (id: string): Promise<Client | null> => {
    try {
      const { data: row, error: err } = await supabase
        .from('v_clientes_com_calculos')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (err) throw err;

      const { data: flags } = await supabase
        .from('flags_cliente')
        .select('nome_flag')
        .eq('cliente_id', id);

      const flagNames = (flags || []).map((f: any) => f.nome_flag);

      // VB/Mon vêm da view (inadimplente_vitbank/monetali) — não precisa fetch extra.
      return mapDbClienteToClient(row as DbCliente, flagNames);
    } catch (err: any) {
      console.error('useClientes getById error:', err);
      return null;
    }
  };

  const create = async (client: Partial<Client>): Promise<Client | null> => {
    try {
      const insert = mapClientToDbInsert(client);
      const { data: row, error: err } = await supabase
        .from('clientes')
        .insert(insert)
        .select()
        .single();

      if (err) throw err;

      // Add flags if provided
      if (client.flags && client.flags.length > 0) {
        const flagInserts = client.flags.map(f => ({
          cliente_id: (row as DbCliente).id,
          nome_flag: f,
        }));
        await supabase.from('flags_cliente').insert(flagInserts);
      }

      await fetchClientes(); // refresh
      return mapDbClienteToClient(row as DbCliente, client.flags || []);
    } catch (err: any) {
      console.error('useClientes create error:', err);
      return null;
    }
  };

  const update = async (id: string, fields: Partial<Client>): Promise<boolean> => {
    try {
      const dbUpdate = mapClientToDbUpdate(fields);
      if (Object.keys(dbUpdate).length > 0) {
        const { error: err } = await supabase
          .from('clientes')
          .update(dbUpdate)
          .eq('id', id);
        if (err) throw err;
      }

      // Update flags if provided
      if (fields.flags !== undefined) {
        // Delete existing flags
        await supabase.from('flags_cliente').delete().eq('cliente_id', id);
        // Insert new flags
        if (fields.flags.length > 0) {
          const flagInserts = fields.flags.map(f => ({
            cliente_id: id,
            nome_flag: f,
          }));
          await supabase.from('flags_cliente').insert(flagInserts);
        }
      }

      await fetchClientes(); // refresh
      return true;
    } catch (err: any) {
      console.error('useClientes update error:', err);
      return false;
    }
  };

  const softDelete = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('clientes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (err) throw err;
      await fetchClientes();
      return true;
    } catch (err: any) {
      console.error('useClientes softDelete error:', err);
      return false;
    }
  };

  return { data, loading, error, refetch: fetchClientes, getById, create, update, softDelete };
}
