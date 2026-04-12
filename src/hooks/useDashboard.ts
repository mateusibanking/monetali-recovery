import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Client, Situacao } from '@/data/mockData';
import { mapDbClienteToClient } from '@/lib/supabaseMappers';
import type { DbCliente, DbFlagCliente, DbRecuperacao } from '@/lib/supabaseMappers';

export interface RegionalGroup {
  nome: string;
  total: number;
  vitbank: number;
  monetali: number;
  qtd: number;
  clientes: Client[];
}

export interface ExecutivoGroup {
  nome: string;
  total: number;
  vitbank: number;
  monetali: number;
  qtd: number;
  clientes: Client[];
}

export interface StatusGroup {
  name: string;
  situacao: Situacao;
  value: number;
  total: number;
}

interface DashboardData {
  clients: Client[];
  totalAtraso: number;
  totalClientes: number;
  porStatus: StatusGroup[];
  porRegional: RegionalGroup[];
  porExecutivo: ExecutivoGroup[];
  aging: { faixa: string; clientes: number }[];
  recuperacoesPorMes: { mes: string; valor: number }[];
  // Inadimplência stats
  totalInadimplente: number;
  totalRecuperado: number;
  pagamentosEmAberto: number;
  pagamentosQuitados: number;
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

export function useDashboard(mesReferencia?: string): UseDashboardReturn {
  const [data, setData] = useState<DashboardData>({
    clients: [],
    totalAtraso: 0,
    totalClientes: 0,
    porStatus: [],
    porRegional: [],
    porExecutivo: [],
    aging: [],
    recuperacoesPorMes: [],
    totalInadimplente: 0,
    totalRecuperado: 0,
    pagamentosEmAberto: 0,
    pagamentosQuitados: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFiltered = mesReferencia && mesReferencia !== 'todos';

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all active clients (always unfiltered for base data + aging)
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

      // Fetch pagamentos — filtered by mes_referencia when a specific month is selected
      type PagRow = {
        cliente_id: string;
        vitbank: number | null;
        monetali: number | null;
        valor_compensacao: number | null;
        juros: number | null;
      };
      let vitbankMap: Record<string, number> = {};
      let monetaliMap: Record<string, number> = {};
      let compensacaoMap: Record<string, number> = {};
      let jurosMap: Record<string, number> = {};
      const clientsWithPayments = new Set<string>();

      if (clienteIds.length > 0) {
        let pagQuery = supabase
          .from('pagamentos_atraso')
          .select('cliente_id, vitbank, monetali, valor_compensacao, juros')
          .in('cliente_id', clienteIds)
          .is('deleted_at', null);

        if (isFiltered) {
          pagQuery = pagQuery.eq('mes_referencia', mesReferencia);
        }

        const { data: pagSums } = await pagQuery;

        if (pagSums) {
          (pagSums as PagRow[]).forEach(p => {
            clientsWithPayments.add(p.cliente_id);
            vitbankMap[p.cliente_id] = (vitbankMap[p.cliente_id] || 0) + (Number(p.vitbank) || 0);
            monetaliMap[p.cliente_id] = (monetaliMap[p.cliente_id] || 0) + (Number(p.monetali) || 0);
            compensacaoMap[p.cliente_id] = (compensacaoMap[p.cliente_id] || 0) + (Number(p.valor_compensacao) || 0);
            jurosMap[p.cliente_id] = (jurosMap[p.cliente_id] || 0) + (Number(p.juros) || 0);
          });
        }
      }

      // Build full client list (all clients, used for aging)
      const allClients = (clientes as DbCliente[]).map(c =>
        mapDbClienteToClient(c, flagsMap[c.id] || [], undefined, vitbankMap[c.id] || 0, monetaliMap[c.id] || 0)
      );

      // When month-filtered, restrict KPI/chart clients to those with payments in the month
      // Override compensacao/juros with payment-derived values for month accuracy
      const filteredClients = isFiltered
        ? allClients
            .filter(c => clientsWithPayments.has(c.id))
            .map(c => ({
              ...c,
              compensacao: compensacaoMap[c.id] || 0,
              juros: jurosMap[c.id] || 0,
            }))
        : allClients.map(c => ({
            ...c,
            compensacao: compensacaoMap[c.id] || c.compensacao,
            juros: jurosMap[c.id] || 0,
          }));

      // Fetch recuperacoes
      const { data: recuperacoes } = await supabase
        .from('recuperacoes')
        .select('*')
        .order('data_recebimento', { ascending: true });

      // Inadimplência stats from clientes table
      const totalInadimplente = (clientes as DbCliente[]).reduce((s, c) => s + (Number(c.valor_inadimplente_total) || 0), 0);
      const totalRecuperado = (clientes as DbCliente[]).reduce((s, c) => s + (Number(c.valor_recuperado_total) || 0), 0);

      // Fetch pagamentos_atraso counts for em aberto / quitados
      let pagamentosEmAberto = 0;
      let pagamentosQuitados = 0;
      if (clienteIds.length > 0) {
        const { count: aberto } = await supabase
          .from('pagamentos_atraso')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('is_inadimplente', true);
        const { count: quitado } = await supabase
          .from('pagamentos_atraso')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('is_inadimplente', false);
        pagamentosEmAberto = aberto || 0;
        pagamentosQuitados = quitado || 0;
      }

      // Calculate aggregates from filtered clients
      const totalAtraso = filteredClients.reduce((s, c) => s + c.compensacao, 0);

      // Status distribution (from filtered clients) — count + total value
      const statusAgg: Record<string, { count: number; total: number }> = {};
      filteredClients.forEach(c => {
        if (!statusAgg[c.situacao]) statusAgg[c.situacao] = { count: 0, total: 0 };
        statusAgg[c.situacao].count += 1;
        statusAgg[c.situacao].total += c.compensacao;
      });
      const porStatus: StatusGroup[] = Object.entries(statusAgg).map(([situacao, agg]) => ({
        name: situacao,
        value: agg.count,
        total: agg.total,
        situacao: situacao as Situacao,
      }));

      // Regional distribution (from filtered clients) — with client lists
      const regionalAgg: Record<string, RegionalGroup> = {};
      filteredClients.forEach(c => {
        const r = c.regional || 'Sem Regional';
        if (!regionalAgg[r]) regionalAgg[r] = { nome: r, total: 0, vitbank: 0, monetali: 0, qtd: 0, clientes: [] };
        regionalAgg[r].total += c.compensacao;
        regionalAgg[r].vitbank += c.boletoVitbank;
        regionalAgg[r].monetali += c.pixMonetali;
        regionalAgg[r].qtd += 1;
        regionalAgg[r].clientes.push(c);
      });
      const porRegional: RegionalGroup[] = Object.values(regionalAgg)
        .sort((a, b) => b.total - a.total)
        .map(g => ({ ...g, clientes: [...g.clientes].sort((a, b) => b.compensacao - a.compensacao) }));

      // Executivo distribution (from filtered clients) — with client lists
      const execAgg: Record<string, ExecutivoGroup> = {};
      filteredClients.forEach(c => {
        const e = c.executivo || 'Sem Executivo';
        if (!execAgg[e]) execAgg[e] = { nome: e, total: 0, vitbank: 0, monetali: 0, qtd: 0, clientes: [] };
        execAgg[e].total += c.compensacao;
        execAgg[e].vitbank += c.boletoVitbank;
        execAgg[e].monetali += c.pixMonetali;
        execAgg[e].qtd += 1;
        execAgg[e].clientes.push(c);
      });
      const porExecutivo: ExecutivoGroup[] = Object.values(execAgg)
        .sort((a, b) => b.total - a.total)
        .map(g => ({ ...g, clientes: [...g.clientes].sort((a, b) => b.compensacao - a.compensacao) }));

      // Aging — ALWAYS uses all clients (not filtered by month)
      const aging = AGING_RANGES.map(r => ({
        faixa: r.label,
        clientes: allClients.filter(c =>
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
        clients: filteredClients,
        totalAtraso,
        totalClientes: filteredClients.length,
        porStatus,
        porRegional,
        porExecutivo,
        aging,
        recuperacoesPorMes,
        totalInadimplente,
        totalRecuperado,
        pagamentosEmAberto,
        pagamentosQuitados,
      });
    } catch (err: any) {
      console.error('useDashboard fetch error:', err);
      setError(err.message || 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, [mesReferencia, isFiltered]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, loading, error, refetch: fetchDashboard };
}
