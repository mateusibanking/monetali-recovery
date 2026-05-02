import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AgendaItem {
  pagamento_id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_regional: string | null;
  cliente_executivo: string | null;
  descricao: string | null;
  mes_referencia: string | null;
  pagamento_status: string;
  empresa: 'vitbank' | 'monetali';
  valor: number;
  data_vencimento: string;
  compensacao: number;
  categoria: 'vencido' | 'hoje' | 'proximos_7' | 'proximos_30' | 'futuro';
  dias_ate_vencimento: number;
}

export interface AgendaAgregadoDia {
  data: string;
  total_vitbank: number;
  total_monetali: number;
  total_geral: number;
  qtd_pagamentos: number;
}

export interface ResumoBucket {
  qtd: number;
  total: number;
  total_vb: number;
  total_mon: number;
}

export interface ResumoAgenda {
  vencidos: ResumoBucket;
  hoje: ResumoBucket;
  proximos_7: ResumoBucket;
  proximos_30: ResumoBucket;
}

export type EmpresaFiltro = 'ambos' | 'vitbank' | 'monetali';
export type StatusFiltro = 'em_aberto' | 'parcial' | 'vencido' | 'todos';

export interface FiltrosAgenda {
  dataInicio: string;
  dataFim: string;
  empresa: EmpresaFiltro;
  status: StatusFiltro;
}

const EMPTY_RESUMO: ResumoAgenda = {
  vencidos:    { qtd: 0, total: 0, total_vb: 0, total_mon: 0 },
  hoje:        { qtd: 0, total: 0, total_vb: 0, total_mon: 0 },
  proximos_7:  { qtd: 0, total: 0, total_vb: 0, total_mon: 0 },
  proximos_30: { qtd: 0, total: 0, total_vb: 0, total_mon: 0 },
};

const round2 = (v: number) => Math.round(v * 100) / 100;

interface ResumoRow {
  categoria: string;
  empresa: string;
  valor: number | null;
}

export function useAgendaRecebimentos(filtros: FiltrosAgenda) {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [agregadoDia, setAgregadoDia] = useState<AgendaAgregadoDia[]>([]);
  const [resumo, setResumo] = useState<ResumoAgenda>(EMPTY_RESUMO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1) Lista filtrada (período + empresa + status)
      let q = supabase
        .from('v_agenda_recebimentos')
        .select('*')
        .gte('data_vencimento', filtros.dataInicio)
        .lte('data_vencimento', filtros.dataFim);

      if (filtros.empresa !== 'ambos') {
        q = q.eq('empresa', filtros.empresa);
      }

      if (filtros.status === 'em_aberto') {
        q = q.in('pagamento_status', ['em_aberto', 'em_andamento', 'nao_iniciado']);
      } else if (filtros.status === 'parcial') {
        q = q.eq('pagamento_status', 'parcial');
      } else if (filtros.status === 'vencido') {
        q = q.eq('categoria', 'vencido');
      }

      // 2) Agregado por dia (RPC)
      const aggReq = (supabase as any).rpc('agenda_agregada_por_dia', {
        data_inicio: filtros.dataInicio,
        data_fim: filtros.dataFim,
        empresa_filter: filtros.empresa,
      });

      // 3) Resumo: lista completa SEM filtros, só projetando o necessário
      const resumoReq = supabase
        .from('v_agenda_recebimentos')
        .select('categoria, empresa, valor');

      const [itemsRes, aggRes, resumoRes] = await Promise.all([
        q.order('data_vencimento'),
        aggReq,
        resumoReq,
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (aggRes.error) throw aggRes.error;
      if (resumoRes.error) throw resumoRes.error;

      setItems((itemsRes.data ?? []) as AgendaItem[]);
      setAgregadoDia(((aggRes.data ?? []) as AgendaAgregadoDia[]).map(d => ({
        ...d,
        total_vitbank: Number(d.total_vitbank) || 0,
        total_monetali: Number(d.total_monetali) || 0,
        total_geral: Number(d.total_geral) || 0,
        qtd_pagamentos: Number(d.qtd_pagamentos) || 0,
      })));

      // Calcular resumo
      const r: ResumoAgenda = {
        vencidos:    { qtd: 0, total: 0, total_vb: 0, total_mon: 0 },
        hoje:        { qtd: 0, total: 0, total_vb: 0, total_mon: 0 },
        proximos_7:  { qtd: 0, total: 0, total_vb: 0, total_mon: 0 },
        proximos_30: { qtd: 0, total: 0, total_vb: 0, total_mon: 0 },
      };
      ((resumoRes.data ?? []) as ResumoRow[]).forEach(row => {
        const v = Number(row.valor) || 0;
        const isVb = row.empresa === 'vitbank';
        const isMon = row.empresa === 'monetali';

        const bump = (b: ResumoBucket) => {
          b.qtd++;
          b.total += v;
          if (isVb) b.total_vb += v;
          if (isMon) b.total_mon += v;
        };

        if (row.categoria === 'vencido') bump(r.vencidos);
        if (row.categoria === 'hoje')    bump(r.hoje);
        if (row.categoria === 'hoje' || row.categoria === 'proximos_7') bump(r.proximos_7);
        if (row.categoria === 'hoje' || row.categoria === 'proximos_7' || row.categoria === 'proximos_30') bump(r.proximos_30);
      });

      // Round
      (Object.keys(r) as Array<keyof ResumoAgenda>).forEach(k => {
        r[k].total = round2(r[k].total);
        r[k].total_vb = round2(r[k].total_vb);
        r[k].total_mon = round2(r[k].total_mon);
      });

      setResumo(r);
    } catch (e) {
      const err = e as Error;
      setError(err.message || 'Erro ao carregar agenda');
    } finally {
      setLoading(false);
    }
  }, [filtros.dataInicio, filtros.dataFim, filtros.empresa, filtros.status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { items, agregadoDia, resumo, loading, error, refetch: fetchData };
}
