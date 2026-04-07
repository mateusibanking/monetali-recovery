import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Client, Situacao } from '@/data/mockData';
import { mapDbClienteToClient } from '@/lib/supabaseMappers';
import type { DbCliente, DbFlagCliente, DbRecuperacao } from '@/lib/supabaseMappers';

interface DashboardData {
  clients: Client[];
  totalAtraso: number;
  totalClientes: number;
  porStatus: { name: string; value: number; situacao: Situacao }[];
  porRegional: { regional: string; total: number }[];
  porExecutivo: { executivo: string; valor: number }[];
  aging: { faixa: string; clientes: number }[];
  recuperacoesPorMes: { mes: string; valor: number }[];
}

interface UseDashboardReturn {
  data: DashboardData;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const AGING_RANGES = [
  { label: '0–30', min: 0, max: 30 },
  { label: '31–60', min: 31, max: 60 },
  { label: '61–90', min: 61, max: 90 },
  { label: '90+', min: 91, max: Infinity },
];

export function useDashboard(): UseDashboardReturn {
  const [data, setData] = useState<DashboardData>({
    clients: [],
    totalAtraso: 0,
    totalClientes: 0,
    porStatus: [],
    porRegional: [],
    porExecutivo: [],
    aging: [],
    recuperacoesPorMes: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all active clients
      const { data: clientes, error: errC } = await supabase
        .from('clientes')
        .select('*')
        .is('deleted_at', null)
        .order('valor_total_atraso', { ascending: false });

      if (errC) throw errC;

      // Fetch all flags
      const clienteIds = (clientes as DbCliente[]).map(c => c.id);
      let flagsMap: Record<string, string[]> = {};
      if (clienteIds.length > 0) {
        const { data: allFlags } = await supabase
          .from('flags_cliente')
          .select('*')
          .in('cliente_id', clienteIds);

        if (allFlags) {
          (allFlags as DbFlagCliente[]).forEach(f => {
            if (!flagsMap[f.cliente_id]) flagsMap[f.cliente_id] = [];
            flagsMap[f.cliente_id].push(f.nome_flag);
          });
        }
      }

      // Aggregate vitbank/monetali per client from pagamentos_atraso
      let vitbankMap: Record<string, number> = {};
      let monetaliMap: Record<string, number> = {};
      if (clienteIds.length > 0) {
        const { data: pagSums } = await supabase
          .from('pagamentos_atraso')
          .select('cliente_id, vitbank, monetali')
          .in('cliente_id', clienteIds)
          .is('deleted_at', null);

        if (pagSums) {
          (pagSums as { cliente_id: string; vitbank: number | null; monetali: number | null }[]).forEach(p => {
            vitbankMap[p.cliente_id] = (vitbankMap[p.cliente_id] || 0) + (Number(p.vitbank) || 0);
            monetaliMap[p.cliente_id] = (monetaliMap[p.cliente_id] || 0) + (Number(p.monetali) || 0);
          });
        }
      }

      const clients = (clientes as DbCliente[]).map(c =>
        mapDbClienteToClient(c, flagsMap[c.id] || [], undefined, vitbankMap[c.id] || 0, monetaliMap[c.id] || 0)
      );

      // Fetch recuperacoes
      const { data: recuperacoes } = await supabase
        .from('recuperacoes')
        .select('*')
        .order('data_recebimento', { ascending: true });

      // Calculate aggregates
      const totalAtraso = clients.reduce((s, c) => s + c.compensacao, 0);

      // Status distribution
      const statusCount: Record<string, number> = {};
      clients.forEach(c => {
        statusCount[c.situacao] = (statusCount[c.situacao] || 0) + 1;
      });
      const porStatus = Object.entries(statusCount).map(([situacao, value]) => ({
        name: situacao,
        value,
        situacao: situacao as Situacao,
      }));

      // Regional distribution
      const regionalMap: Record<string, number> = {};
      clients.forEach(c => {
        const r = c.regional || 'Sem Regional';
        regionalMap[r] = (regionalMap[r] || 0) + c.compensacao;
      });
      const porRegional = Object.entries(regionalMap)
        .map(([regional, total]) => ({ regional, total }))
        .sort((a, b) => b.total - a.total);

      // Executivo distribution
      const execMap: Record<string, number> = {};
      clients.forEach(c => {
        const e = c.executivo || 'Sem Executivo';
        execMap[e] = (execMap[e] || 0) + c.compensacao;
      });
      const porExecutivo = Object.entries(execMap)
        .map(([executivo, valor]) => ({ executivo, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10);

      // Aging
      const aging = AGING_RANGES.map(r => ({
        faixa: r.label,
        clientes: clients.filter(c =>
          c.diasAtraso >= r.min && c.diasAtraso <= r.max
        ).length,
      }));

      // Recuperacoes por mes
      const recMesMap: Record<string, number> = {};
      (recuperacoes as DbRecuperacao[] || []).forEach(r => {
        const mes = r.mes_referencia || r.data_recebimento.slice(0, 7);
        recMesMap[mes] = (recMesMap[mes] || 0) + Number(r.valor);
      });
      const recuperacoesPorMes = Object.entries(recMesMap)
        .map(([mes, valor]) => ({ mes, valor }))
        .sort((a, b) => a.mes.localeCompare(b.mes));

      setData({
        clients,
        totalAtraso,
        totalClientes: clients.length,
        porStatus,
        porRegional,
        porExecutivo,
        aging,
        recuperacoesPorMes,
      });
    } catch (err: any) {
      console.error('useDashboard fetch error:', err);
      setError(err.message || 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, loading, error, refetch: fetchDashboard };
}
